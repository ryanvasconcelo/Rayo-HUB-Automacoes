/**
 * Subvenções Server — Express + Playwright
 * Porta: 3002
 *
 * Endpoints:
 *   GET  /api/health           → { status, version }
 *   GET  /api/status           → { processing, queueLength }
 *   POST /api/download-xmls    → { ie, senha, cnpj, dtIni, dtFin } → { arquivos, total }
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { baixarXmlsSefaz } = require('./sefaz-downloader');

const app = express();
const PORT = process.env.PORT || 3002;

// ── Fila de requisições ───────────────────────────────────────────────────────
let isProcessing = false;
const requestQueue = [];

async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;
    isProcessing = true;
    const { resolve, reject, params } = requestQueue.shift();
    try {
        const result = await baixarXmlsSefaz(params);
        resolve(result);
    } catch (err) {
        reject(err);
    } finally {
        isProcessing = false;
        processQueue();
    }
}

function enqueue(params) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ resolve, reject, params });
        processQueue();
    });
}

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0', servico: 'SEFAZ-AM Downloader' });
});

// ── Status da fila ────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
    res.json({
        processing: isProcessing,
        queueLength: requestQueue.length,
        totalPending: requestQueue.length + (isProcessing ? 1 : 0),
    });
});

// ── Download de XMLs do SEFAZ-AM ─────────────────────────────────────────────
app.post('/api/download-xmls', async (req, res) => {
    const { ie, senha, cnpj, dtIni, dtFin, cfops, outputDir } = req.body;

    const pfxPath = process.env.SEFAZ_PFX_PATH;
    const pfxSenha = process.env.SEFAZ_PFX_SENHA || senha;

    if (!ie || !dtIni || !dtFin) {
        return res.status(400).json({
            error: 'Campos obrigatórios ausentes: ie, dtIni, dtFin',
        });
    }

    const periodoSlug = `${dtIni.replace(/-/g, '')}-${dtFin.replace(/-/g, '')}`;
    const cfopSlug = (cfops && cfops.length > 0) ? `cfops-${cfops.length}` : 'todos';
    const pastaOutput = outputDir
        ? path.resolve(outputDir)
        : path.join(__dirname, 'data', 'xmls-entrada', ie || 'empresa', cfopSlug, periodoSlug);

    const posicaoFila = requestQueue.length + (isProcessing ? 1 : 0);
    console.log(`[/api/download-xmls] Requisição: IE=${ie} | ${dtIni}→${dtFin} | Posição: ${posicaoFila + 1}`);

    try {
        const result = await enqueue({
            ie,
            pfxPath,
            pfxSenha,
            dtIni,
            dtFin,
            cfops: Array.isArray(cfops) ? cfops : [],
            outputDir: pastaOutput,
        });

        const arquivosNaPasta = fs.existsSync(pastaOutput)
            ? fs.readdirSync(pastaOutput).filter((f) => f.endsWith('.xml') || f.endsWith('.zip'))
            : [];

        res.json({
            success: true,
            total: result.total,
            arquivosCount: arquivosNaPasta.length,
            outputDir: pastaOutput,
            arquivos: arquivosNaPasta.slice(0, 20),
        });
    } catch (err) {
        console.error('[/api/download-xmls] ❌ Erro:', err.message);

        const mapa = {
            'IE/CNPJ': { status: 401, sugestao: 'Verifique a IE/CNPJ no .env' },
            'senha': { status: 401, sugestao: 'Senha incorreta ou portal expirou sessão' },
            'Timeout': { status: 504, sugestao: 'Portal SEFAZ lento. Tente de novo ou use período menor.' },
            'Botão': { status: 500, sugestao: 'Layout do portal SEFAZ mudou. Use headless:false para reinspeção.' },
        };

        const match = Object.entries(mapa).find(([k]) => err.message.includes(k));
        const { status, sugestao } = match?.[1] || { status: 500, sugestao: 'Erro interno.' };

        res.status(status).json({ error: err.message, sugestao });
    }
});

// ── Empacotar XMLs em memória ────────────────────────────────────────────────
app.post('/api/pack-xmls', (req, res) => {
    const { dir } = req.body;
    if (!dir || !fs.existsSync(dir)) {
        return res.status(400).json({ error: 'Diretório não encontrado no servidor.' });
    }
    try {
        const zip = new AdmZip();
        zip.addLocalFolder(dir);
        const buffer = zip.toBuffer();
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=xmls-sefaz.zip');
        res.send(buffer);
    } catch (err) {
        console.error('[/api/pack-xmls] Erro:', err.message);
        res.status(500).json({ error: 'Erro ao criar pacote zip: ' + err.message });
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 Subvenções Server rodando em http://localhost:${PORT}`);
    console.log(`   Health:   GET  http://localhost:${PORT}/api/health`);
    console.log(`   Status:   GET  http://localhost:${PORT}/api/status`);
    console.log(`   Download: POST http://localhost:${PORT}/api/download-xmls\n`);
});
