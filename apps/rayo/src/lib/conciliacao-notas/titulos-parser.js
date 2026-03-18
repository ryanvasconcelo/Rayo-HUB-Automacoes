/**
 * titulos-parser.js — Parser do Relatório "Títulos em Aberto" (Sankhya XLSX)
 *
 * Layout confirmado (header na Row 0, dados a partir da Row 1):
 *   col[0] Origem               (Financeiro / Estoque)
 *   col[1] Nro Único            (ID financeiro único)
 *   col[2] Parceiro (código)    (ex: 251)
 *   col[3] Parceiro (nome)      (ex: "HUIZHOU MACC ELECTRONICS CO., LTD")
 *   col[4] Nro Nota             ← CHAVE de conciliação
 *   col[5] Dt. Vencimento       (ex: "2025-02-06 00:00:00" ou serial Excel)
 *   col[6] Vlr do Desdobramento (valor da parcela)
 *   col[7] Data Baixa           (vazio = em aberto)
 *   col[8] Tipo de Título (cod)
 *   col[9] Tipo de Título (desc)(ex: "BOLETO", "DEPOSITO")
 *   col[10] Banco (cod)
 *   col[11] Banco (nome)
 *   col[12] Tipo de Operação    (ex: "COMPRA - SERVIÇO (SEM RETENÇÃO)")
 *
 * Normalização de Nro Nota: parseInt → remove zeros à esquerda para casar com o Razão.
 * Parcelas: mesma nota pode ter múltiplas linhas (parcelas), cada uma com Nro Único diferente.
 */

import * as XLSX from 'xlsx';

export function normalizeNumNota(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = parseInt(String(raw), 10);
    if (isNaN(n) || n <= 0) return null;
    return String(n);
}

function parseDate(v) {
    if (!v || v === '') return '';
    if (typeof v === 'number') {
        // Serial Excel
        const d = new Date((v - 25569) * 86400 * 1000);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const s = String(v).trim();
    // "2025-02-06 00:00:00" → "06/02/2025"
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return s;
}

/**
 * Parse do relatório Títulos em Aberto (XLSX Sankhya)
 * @param {ArrayBuffer} buffer
 * @returns {NotaGroup[]}
 */
export function parseTitulosEmAberto(buffer) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) return [];

    // Detectar header dinamicamente
    let headerIdx = -1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
        const r = rows[i].map(v => String(v).toLowerCase());
        if (r.some(v => v.includes('nro nota') || v.includes('numnota'))) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) headerIdx = 0; // fallback: assume row 0

    const header = rows[headerIdx].map(v => String(v).toLowerCase().trim());

    // Mapeamento de colunas por nome
    const ci = (name) => {
        const idx = header.findIndex(h => h.includes(name));
        return idx;
    };

    const COL = {
        ORIGEM:   ci('origem'),
        NROFIN:   ci('nro único') !== -1 ? ci('nro único') : ci('nro unico'),
        NOME:     (() => {
            // col[3] é "Parceiro" (nome) — pode haver duplicados, pegar o segundo
            const idxs = header.reduce((a, v, i) => v.includes('parceiro') ? [...a, i] : a, []);
            return idxs.length >= 2 ? idxs[1] : idxs[0] ?? 3;
        })(),
        NRONOTA:  ci('nro nota') !== -1 ? ci('nro nota') : 4,
        DTVENC:   ci('vencimento') !== -1 ? ci('vencimento') : 5,
        VLRDESDO: ci('desdobramento') !== -1 ? ci('desdobramento') : 6,
        DTBAIXA:  ci('baixa') !== -1 ? ci('baixa') : 7,
        TIPOTIT:  (() => {
            const idxs = header.reduce((a, v, i) => v.includes('tipo de título') || v.includes('tipo de titulo') ? [...a, i] : a, []);
            return idxs.length >= 2 ? idxs[1] : idxs[0] ?? 9;
        })(),
        TIPOOPER: ci('operação') !== -1 ? ci('operação') : ci('operacao') !== -1 ? ci('operacao') : 12,
    };

    const mapaNotas = new Map();

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(v => v === '' || v === null)) continue;

        const nroNotaRaw = COL.NRONOTA >= 0 ? row[COL.NRONOTA] : '';
        const numeroNota = normalizeNumNota(nroNotaRaw);
        if (!numeroNota) continue;

        const vlr = typeof row[COL.VLRDESDO] === 'number'
            ? row[COL.VLRDESDO]
            : parseFloat(String(row[COL.VLRDESDO]).replace(',', '.')) || 0;

        const dtBaixa = COL.DTBAIXA >= 0 ? String(row[COL.DTBAIXA] || '').trim() : '';
        const quitado = dtBaixa !== '' && dtBaixa !== '';

        const parcela = {
            nroFin:     COL.NROFIN >= 0 ? String(parseInt(row[COL.NROFIN]) || '').trim() : '',
            vlr,
            dtVencStr:  parseDate(COL.DTVENC >= 0 ? row[COL.DTVENC] : ''),
            dtBaixa,
            quitado,
            tipoTit:    COL.TIPOTIT >= 0 ? String(row[COL.TIPOTIT] || '').trim() : '',
            tipoOper:   COL.TIPOOPER >= 0 ? String(row[COL.TIPOOPER] || '').trim() : '',
        };

        if (!mapaNotas.has(numeroNota)) {
            const nome = COL.NOME >= 0 ? String(row[COL.NOME] || '').trim() : '';
            const origem = COL.ORIGEM >= 0 ? String(row[COL.ORIGEM] || '').trim() : '';
            mapaNotas.set(numeroNota, {
                numeroNota,
                nome,
                origem,
                parcelas: [],
                totalVlr: 0,
            });
        }

        const grupo = mapaNotas.get(numeroNota);
        grupo.parcelas.push(parcela);
        grupo.totalVlr += vlr;
    }

    return Array.from(mapaNotas.values());
}
