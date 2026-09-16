/**
 * RAYO HUB — Servidor Express (Microserviço Local)
 * Porta: 3001 | Frontend Rayo: porta 5173
 *
 * Endpoints:
 *   GET  /api/health              → { status: 'ok', version }
 *   GET  /api/queue-status        → { queueLength, processing }
 *   POST /api/scrape-eauditoria   → { ncms, uf, atividade, regime, regimeEspecial } → { rules }
 *   GET/PUT /api/folha-dealer/centers — cadastro centros + de-para lotação
 *   POST/DELETE /api/folha-dealer/centers/lotacao — upsert/remove de-para
 *
 * Módulos estáticos (build de produção):
 *   /subvencoes-app/*  → build do Auditor de Subvenções ZFM (subvencoes/app/dist)
 *                        Módulo independente: sem acoplamento de lógica com outros módulos.
 *                        Para servir: cd subvencoes/app && npm run build
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { scrapeEAuditoria } = require('./scraper/eauditoria-scraper');
const { extractFortesPayroll } = require('./fortes-extractor');
const {
    loadCentersConfig,
    saveCentersConfig,
    upsertLotacaoMapping,
    deleteLotacaoMapping,
} = require('./folha-dealer-centers-store');

const app = express();
const PORT = process.env.PORT || 80;

// ── Fila de Requisições (Serialização Anti-Ban) ───────────────────────────────
// Garante que apenas UMA sessão do e-Auditoria roda por vez, evitando
// logins simultâneos que podem acionar proteções anti-bot da plataforma.
let isProcessing = false;
const requestQueue = []; // Array de { resolve, reject, params }

async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;

    isProcessing = true;
    const { resolve, reject, params } = requestQueue.shift();

    try {
        const rules = await scrapeEAuditoria(params);
        resolve(rules);
    } catch (err) {
        reject(err);
    } finally {
        isProcessing = false;
        processQueue(); // Processa o próximo da fila
    }
}

function enqueue(params) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ resolve, reject, params });
        processQueue();
    });
}

// Permite requests do frontend Rayo (Vite roda em localhost:5173 ou IP da rede)
app.use(cors({
    origin: '*', // Em rede local, permite acesso de qualquer IP para simplificar
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json({ limit: '10mb' })); // NCMs podem ser muitos

// ── Rayo Hub — frontend estático ─────────────────────────────────────────────
// Serve o build do Rayo Hub diretamente, eliminando o `serve -s dist` separado.
// Configure RAYO_DIST no .env se a pasta dist estiver em outro lugar.
const RAYO_DIST = process.env.RAYO_DIST
    || path.resolve(__dirname, '..', 'rayo', 'dist');

if (fs.existsSync(RAYO_DIST)) {
    app.use(express.static(RAYO_DIST));
    console.log(`   🌐 Rayo Hub: servindo build de ${RAYO_DIST}`);
} else {
    console.log(`   ⚠️  Rayo Hub build não encontrado: ${RAYO_DIST}`);
    console.log(`      Execute: cd apps/rayo && npm run build`);
}

// ── Módulo Subvenções ZFM — frontend estático ─────────────────────────────────
// Serve o build do Auditor em /subvencoes-app/ — mesma origem do Rayo Hub,
// portanto sem CORS nem iframe blocking.
// Caminho padrão: apps/subvencoes/dist (gerado por npm run build:subvencoes).
// Se SUBVENCOES_DIST estiver no .env mas não existir, faz fallback automático.
const SUBVENCOES_DIST_DEFAULT = path.resolve(__dirname, '..', 'subvencoes', 'dist');
const SUBVENCOES_DIST_ENV = process.env.SUBVENCOES_DIST;
const SUBVENCOES_DIST = (SUBVENCOES_DIST_ENV && fs.existsSync(SUBVENCOES_DIST_ENV))
    ? SUBVENCOES_DIST_ENV
    : SUBVENCOES_DIST_DEFAULT;

if (fs.existsSync(SUBVENCOES_DIST)) {
    app.use('/subvencoes-app', express.static(SUBVENCOES_DIST));
    app.get('/subvencoes-app/*', (req, res) => {
        res.sendFile('index.html', { root: path.resolve(SUBVENCOES_DIST) });
    });
    console.log(`   📦 Subvenções ZFM: http://localhost:${process.env.PORT || 80}/subvencoes-app/`);
    if (SUBVENCOES_DIST_ENV && !fs.existsSync(SUBVENCOES_DIST_ENV)) {
        console.log(`   ℹ️  SUBVENCOES_DIST do .env não encontrado, usando padrão: ${SUBVENCOES_DIST}`);
    }
} else {
    console.log(`   ⚠️  Subvenções ZFM build não encontrado: ${SUBVENCOES_DIST}`);
    console.log(`      Execute: npm run build:subvencoes`);
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        servico: 'Rayo Scraper — e-Auditoria',
        timestamp: new Date().toISOString()
    });
});

// ── Status da Fila ────────────────────────────────────────────────────────────
// O frontend usa este endpoint para mostrar ao usuário sua posição na fila.
app.get('/api/queue-status', (req, res) => {
    res.json({
        processing: isProcessing,
        queueLength: requestQueue.length,
        // Posição total de jobs pendentes (fila + o que está rodando agora)
        totalPending: requestQueue.length + (isProcessing ? 1 : 0),
    });
});

// ── Scraping do e-Auditoria (com Fila) ────────────────────────────────────────
app.post('/api/scrape-eauditoria', async (req, res) => {
    const { ncms, uf, atividade, regime, regimeEspecial } = req.body;

    // Validação de entrada
    if (!Array.isArray(ncms) || ncms.length === 0) {
        return res.status(400).json({ error: 'Campo "ncms" é obrigatório e deve ser um array não vazio.' });
    }
    if (!uf || !atividade || !regime) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes: uf, atividade, regime.' });
    }
    if (ncms.length > 500) {
        return res.status(400).json({ error: 'Máximo de 500 NCMs por requisição para evitar timeout.' });
    }

    // Posição na fila ANTES de entrar (para informar ao usuário)
    const posicaoNaFila = requestQueue.length + (isProcessing ? 1 : 0);

    console.log(`[/api/scrape-eauditoria] Nova requisição: ${ncms.length} NCMs | ${uf}/${atividade}/${regime} | Posição na fila: ${posicaoNaFila + 1}`);

    try {
        const rules = await enqueue({ ncms, uf, atividade, regime, regimeEspecial });
        console.log(`[/api/scrape-eauditoria] ✅ ${rules.length} regras retornadas`);
        res.json({ rules, total: rules.length });
    } catch (err) {
        console.error('[/api/scrape-eauditoria] ❌ Erro:', err.message);

        if (err.message.includes('Credenciais')) {
            res.status(401).json({
                error: 'Credenciais do e-Auditoria não configuradas.',
                detalhe: err.message,
                sugestao: 'Crie o arquivo .env na pasta rayo-server com EAUDITORIA_EMAIL e EAUDITORIA_PASSWORD.'
            });
        } else if (err.message.includes('Timeout') || err.message.includes('download')) {
            res.status(504).json({
                error: 'Timeout ao aguardar resposta do e-Auditoria.',
                detalhe: err.message,
                sugestao: 'Tente reduzir a quantidade de NCMs ou use o upload manual da base.'
            });
        } else if (err.message.includes('login') || err.message.includes('#username')) {
            res.status(401).json({
                error: 'Falha no login do e-Auditoria.',
                detalhe: 'Verifique as credenciais no arquivo .env do servidor.',
                sugestao: 'Confirme que EAUDITORIA_EMAIL e EAUDITORIA_PASSWORD estão corretos.'
            });
        } else {
            res.status(500).json({
                error: 'Erro interno no robô.',
                detalhe: err.message,
                sugestao: 'O layout do e-Auditoria pode ter mudado. Use o upload manual como fallback.'
            });
        }
    }
});

// ── Extração do Fortes (Integração Direta) ───────────────────────────────────
app.post('/api/fortes/extract', async (req, res) => {
    try {
        const payload = req.body;
        const extracted = await extractFortesPayroll(payload);
        // data = folha mensal; provisions = PRD/PRF; encargoBases = eSocial CPP/FGTS
        res.json({
            success: true,
            data: extracted.payroll,
            provisions: extracted.provisions,
            encargoBases: extracted.encargoBases,
        });
    } catch (err) {
        console.error('[/api/fortes/extract] ❌ Erro:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Internal Server Error'
        });
    }
});

// ── Folha Dealer — cadastro de centros + de-para lotação ─────────────────────
app.get('/api/folha-dealer/centers', (req, res) => {
    try {
        const companyId = req.query.companyId || 'braga-veiculos';
        const config = loadCentersConfig(companyId);
        res.json(config);
    } catch (err) {
        console.error('[/api/folha-dealer/centers] GET ❌', err);
        res.status(500).json({ error: err.message || 'Erro ao carregar centros.' });
    }
});

app.put('/api/folha-dealer/centers', (req, res) => {
    try {
        const companyId = req.body?.companyId || 'braga-veiculos';
        const { centers, lotacaoMappings } = req.body || {};
        if (!Array.isArray(centers) || !Array.isArray(lotacaoMappings)) {
            return res.status(400).json({
                error: 'Body deve incluir arrays "centers" e "lotacaoMappings".',
            });
        }
        const saved = saveCentersConfig(companyId, { companyId, centers, lotacaoMappings });
        res.json(saved);
    } catch (err) {
        console.error('[/api/folha-dealer/centers] PUT ❌', err);
        res.status(500).json({ error: err.message || 'Erro ao salvar centros.' });
    }
});

app.post('/api/folha-dealer/centers/lotacao', (req, res) => {
    try {
        const companyId = req.body?.companyId || 'braga-veiculos';
        const { lotacaoCode, dealerCenterCode, allocationMode, active, centerName } = req.body || {};
        if (lotacaoCode === undefined || lotacaoCode === null || !dealerCenterCode) {
            return res.status(400).json({
                error: 'Campos obrigatórios: lotacaoCode, dealerCenterCode.',
            });
        }
        const saved = upsertLotacaoMapping(companyId, {
            lotacaoCode,
            dealerCenterCode,
            allocationMode,
            active,
            centerName,
        });
        res.json(saved);
    } catch (err) {
        console.error('[/api/folha-dealer/centers/lotacao] POST ❌', err);
        res.status(500).json({ error: err.message || 'Erro ao salvar de-para.' });
    }
});

app.delete('/api/folha-dealer/centers/lotacao/:lotacaoCode', (req, res) => {
    try {
        const companyId = req.query.companyId || 'braga-veiculos';
        const lotacaoCode = decodeURIComponent(req.params.lotacaoCode);
        const result = deleteLotacaoMapping(companyId, lotacaoCode);
        if (!result.deleted) {
            return res.status(404).json({
                error: `De-para não encontrado para lotação "${lotacaoCode}".`,
                config: result.config,
            });
        }
        res.json(result);
    } catch (err) {
        console.error('[/api/folha-dealer/centers/lotacao] DELETE ❌', err);
        res.status(500).json({ error: err.message || 'Erro ao remover de-para.' });
    }
});

// ── SPA fallback — Rayo Hub ───────────────────────────────────────────────────
// Deve ficar APÓS todas as rotas /api/* e /subvencoes-app/*.
// Rotas do React Router (ex: /icms, /subvencoes) retornam o index.html do Rayo.
app.get('*', (req, res) => {
    const index = path.join(RAYO_DIST, 'index.html');
    if (fs.existsSync(index)) {
        res.sendFile('index.html', { root: path.resolve(RAYO_DIST) });
    } else {
        res.status(404).send('Execute: cd apps/rayo && npm run build');
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Rayo Server rodando em http://localhost:${PORT}`);
    console.log(`   Acesso na rede: http://<IP-do-servidor>:${PORT}`);
    console.log(`   Health:   GET  http://localhost:${PORT}/api/health`);
    console.log(`   Fila:     GET  http://localhost:${PORT}/api/queue-status`);
    console.log(`   Scraper:  POST http://localhost:${PORT}/api/scrape-eauditoria\n`);
    console.log(`   📋 Sistema de fila ativo: processamento sequencial anti-ban.\n`);
});
