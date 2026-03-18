/**
 * fornecedores-razao-parser.js — Parser do Razão de Fornecedores (NBS)
 *
 * Mesmo layout do Razão de Clientes (17 colunas, linhas alternadas com vazias):
 *   col[2]  Cont. Contábil   (ex: "2.1.1.01.0001")
 *   col[4]  Descrição        (ex: "FORNECEDORES NACIONAIS")
 *   col[5]  Cta Red.
 *   col[6]  Dt. Movto        (ex: "02/01/2026")
 *   col[7]  Lote
 *   col[8]  Lanç
 *   col[9]  Histórico        ← CHAVE: número da NF
 *   col[13] Débito
 *   col[14] Crédito
 *   col[15] Saldo Acum.
 *
 * Padrões de NF no Histórico:
 *   "COMPRA SERVIÇO NF000164 DE CLOUD LABS"   → nota 164
 *   "COMPRA SERVIÇO NF81469365 DE HAPVIDA"    → nota 81469365
 *   "COMPRA PARA USO E CONSUMO 068514 SO..."  → nota 68514
 *   "Pagamento Conf 011058 R DA COSTA..."      → (pagamento, ignorar)
 *
 * Normalização: parseInt → remove zeros à esquerda
 */

import * as XLSX from 'xlsx';

// Prioridade 1: "NF" seguido de número
// Prioridade 2: número após "CONSUMO " ou "COMPRA " sozinho (sem "NF")
const NF_REGEX = /NF\s*(\d{1,10})/i;
const CONSUMO_REGEX = /(?:CONSUMO|USO)\s+(\d{5,10})/i;

export function normalizeNumNota(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = parseInt(String(raw), 10);
    if (isNaN(n) || n <= 0) return null;
    return String(n);
}

function extractNumNota(historico) {
    if (typeof historico !== 'string') return null;
    const m1 = historico.match(NF_REGEX);
    if (m1) return normalizeNumNota(m1[1]);
    const m2 = historico.match(CONSUMO_REGEX);
    if (m2) return normalizeNumNota(m2[1]);
    return null;
}

function isLancamentoRow(row) {
    const conta = String(row[2] || '').trim();
    const data = String(row[6] || '').trim();
    return conta.length > 0 && /\d{2}\/\d{2}\/\d{4}/.test(data);
}

/**
 * Parse do Razão de Fornecedores (XLS/XLSX NBS)
 * @param {ArrayBuffer} buffer
 * @returns {{ lancamentos, byNumNota: Map, contaNome, saldoFinal }}
 */
export function parseFornecedoresRazao(buffer) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let contaNome = '';
    let saldoFinal = 0;
    const lancamentos = [];

    for (const row of rows) {
        const anyText = String(row[0] || '') + String(row[2] || '');
        if (anyText.toUpperCase().includes('SALDO ATUAL')) {
            if (typeof row[15] === 'number') saldoFinal = row[15];
            continue;
        }
        if (!isLancamentoRow(row)) continue;

        if (!contaNome) {
            const possivel = String(row[4] || '').trim();
            if (possivel) contaNome = possivel;
        }

        const historico = String(row[9] || '');
        const debito  = typeof row[13] === 'number' ? row[13] : parseFloat(row[13]) || 0;
        const credito = typeof row[14] === 'number' ? row[14] : parseFloat(row[14]) || 0;
        if (debito === 0 && credito === 0) continue;

        lancamentos.push({
            dataStr:    String(row[6] || '').trim(),
            lote:       String(row[7] || '').trim(),
            lanc:       String(row[8] || '').trim(),
            historico,
            numeroNota: extractNumNota(historico),
            debito,
            credito,
            saldoAcum:  typeof row[15] === 'number' ? row[15] : 0,
        });
    }

    // Agrupar por numeroNota
    const byNumNota = new Map();
    for (const l of lancamentos) {
        if (!l.numeroNota) continue;
        if (!byNumNota.has(l.numeroNota)) byNumNota.set(l.numeroNota, []);
        byNumNota.get(l.numeroNota).push(l);
    }

    return { lancamentos, byNumNota, contaNome, saldoFinal };
}
