/**
 * notas-razao-parser.js — Parser do Razão Contábil NBS para Conciliação de Notas
 *
 * Layout confirmado (17 colunas, linhas de dados intercaladas com linhas vazias):
 *   col[2]  : Cont. Contábil  (ex: "1.1.2.01.0001")
 *   col[4]  : Descrição       (ex: "CLIENTE A RECEBER")
 *   col[5]  : Cta Red.        (ex: "13")
 *   col[6]  : Dt. Movto       (ex: "07/01/2026")
 *   col[7]  : Lote
 *   col[8]  : Lanç
 *   col[9]  : Histórico       ← contém o Número da Nota
 *   col[13] : Débito
 *   col[14] : Crédito
 *   col[15] : Saldo Acum.
 *
 * Extração do Número da Nota:
 *   "Compensação Conf 000682 J H..."   → "682"
 *   "VLR REF DEVOLUÇÃO DE VENDAS 000230MS..."  → "230"
 *   "VLR REF DEVOLUÇÃO DE VENDAS 6563208NOVO..." → "6563208"
 *
 * Normalização: parseInt(texto) → remove zeros à esquerda para bater com Sankhya
 */

import * as XLSX from 'xlsx';

// Regex para capturar o número da nota em dois padrões:
// 1. Após "Conf <espaços>" → compensações de adiantamento
// 2. Após "VENDAS " → devoluções de venda
const NOTA_REGEX = /(?:Conf\s+|VENDAS\s+)(\d{4,10})/i;

/**
 * Normaliza um número de nota removendo zeros à esquerda.
 * "000682" → "682"   |   "6563208" → "6563208"   |   682 → "682"
 */
function normalizeNumNota(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = parseInt(String(raw), 10);
    if (isNaN(n)) return null;
    return String(n);
}

/**
 * Extrai o Número da Nota do campo Histórico.
 */
function extractNumNota(historico) {
    if (typeof historico !== 'string') return null;
    const match = historico.match(NOTA_REGEX);
    const raw = match ? match[1] : null;
    return normalizeNumNota(raw);
}

/**
 * Detecta se uma linha é de dados de lançamento.
 * Critério: col[2] preenchida (conta contábil) e col[6] tem data.
 */
function isLancamentoRow(row) {
    const conta = String(row[2] || '').trim();
    const data = String(row[6] || '').trim();
    return conta.length > 0 && /\d{2}\/\d{2}\/\d{4}/.test(data);
}

/**
 * Parse de um arquivo de Razão XLS/XLSX
 * @param {ArrayBuffer} buffer
 * @returns {{ lancamentos: RazaoEntry[], byNumNota: Map<string, RazaoEntry[]>, contaNome: string, saldoFinal: number }}
 */
export function parseRazaoNotas(buffer) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Extrai nome da conta (busca linha com "Cont. Contábil" no header, pega descrição da conta depois)
    let contaNome = '';
    let saldoFinal = 0;
    const lancamentos = [];

    for (const row of rows) {
        const col2 = String(row[2] || '').trim();
        const col15 = row[15];

        // Captura saldo do último extrato ("SALDO ATUAL" costuma aparecer na col 2 ou col 0)
        const anyText = String(row[0] || '') + String(row[2] || '');
        if (anyText.toUpperCase().includes('SALDO ATUAL') && typeof col15 === 'number') {
            saldoFinal = col15;
            continue;
        }

        if (!isLancamentoRow(row)) continue;

        // Nome da conta: col[4] (ex: "CLIENTE A RECEBER")
        if (!contaNome) {
            const possivel = String(row[4] || '').trim();
            if (possivel) contaNome = possivel;
        }

        const historico = String(row[9] || '');
        const debito = typeof row[13] === 'number' ? row[13] : parseFloat(row[13]) || 0;
        const credito = typeof row[14] === 'number' ? row[14] : parseFloat(row[14]) || 0;

        if (debito === 0 && credito === 0) continue;

        lancamentos.push({
            dataStr: String(row[6] || '').trim(),
            lote: String(row[7] || '').trim(),
            lanc: String(row[8] || '').trim(),
            historico,
            numeroNota: extractNumNota(historico),
            debito,
            credito,
            saldoAcum: typeof row[15] === 'number' ? row[15] : 0,
        });
    }

    // Agrupa por numeroNota
    const byNumNota = new Map();
    for (const l of lancamentos) {
        if (!l.numeroNota) continue;
        if (!byNumNota.has(l.numeroNota)) byNumNota.set(l.numeroNota, []);
        byNumNota.get(l.numeroNota).push(l);
    }

    return { lancamentos, byNumNota, contaNome, saldoFinal };
}
