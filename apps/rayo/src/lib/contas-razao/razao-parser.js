/**
 * razao-parser.js — Parser do Razão Contábil NBS (XLSX)
 *
 * Layout do arquivo NBS (confirmado nos arquivos reais):
 *   Row 0: Cabeçalho empresa (CNPJ)
 *   Row 1: "Razão Por Conta" + Período
 *   Row 3: Header colunas
 *   Row 5: "Conta: XXXXX" (nome da conta)
 *   Row 7+: Dados de lançamentos (data como serial Excel)
 *   Última linha com dados: "SALDO ATUAL"
 *
 * Índices de coluna (0-based):
 *   0: Data (serial Excel ou "SALDO ATUAL")
 *   1: Emp.
 *   2: CC
 *   3: Histórico (contém Nr. Recibo em texto livre)
 *   5: C/Partida
 *   6: Lote
 *   7: Lanç.
 *   8: Débito
 *   9: Crédito
 *   11: Saldo
 *   12: D/C
 */

import * as XLSX from 'xlsx';

// Regex para extrair Nr. Recibo do campo Histórico
// Cobre: "Recibo 25474/2025", "Recibo 25187/", "Recibo 25187 "
const RECIBO_REGEX = /Recibo\s+(\d+)/i;

/**
 * Converte serial Excel para Date (sistema 1900)
 */
function excelSerialToDate(serial) {
    if (typeof serial !== 'number' || isNaN(serial)) return null;
    // Excel epoch: 1 = 01/01/1900 (com bug: conta 29/02/1900 inexistente)
    const utcDays = serial - 25569; // dias desde 01/01/1970
    const ms = utcDays * 86400 * 1000;
    return new Date(ms);
}

function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Extrai Nr. Recibo do campo Histórico
 */
function extractRecibo(historico) {
    if (typeof historico !== 'string') return null;
    const match = historico.match(RECIBO_REGEX);
    return match ? match[1] : null;
}

/**
 * Detecta se uma linha é de totalização (SALDO ATUAL / Totais)
 */
function isTotalizadorRow(row) {
    const col0 = String(row[0] || '').trim().toUpperCase();
    return col0 === 'SALDO ATUAL' || col0.startsWith('TOTAIS');
}

/**
 * Detecta se uma linha é de dados de lançamento
 * (coluna 0 deve ser número > 40000 = alguma data depois de 2009)
 */
function isLancamentoRow(row) {
    return typeof row[0] === 'number' && row[0] > 40000;
}

/**
 * Parse de um único arquivo de Razão XLSX
 * @param {ArrayBuffer} buffer
 * @param {string} mesFonte - 'anterior' | 'atual' | 'posterior'
 * @returns {{ lancamentos: RazaoEntry[], contaNome: string, saldoFinal: number }}
 */
export function parseRazao(buffer, mesFonte = 'atual') {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Extrai nome da conta (linha 5, coluna 1)
    const contaRow = rows.find(r => String(r[0] || '').startsWith('Conta:'));
    const contaNome = contaRow ? String(contaRow[1] || '').trim() : '';

    const lancamentos = [];
    let saldoFinal = 0;

    for (const row of rows) {
        if (isTotalizadorRow(row)) {
            // Captura saldo final
            saldoFinal = typeof row[11] === 'number' ? row[11] : saldoFinal;
            continue;
        }

        if (!isLancamentoRow(row)) continue;

        const historico = String(row[3] || '');
        const debito = typeof row[8] === 'number' ? row[8] : 0;
        const credito = typeof row[9] === 'number' ? row[9] : 0;

        // Ignora linhas sem movimentação
        if (debito === 0 && credito === 0) continue;

        lancamentos.push({
            data: excelSerialToDate(row[0]),
            dataStr: formatDate(excelSerialToDate(row[0])),
            emp: String(row[1] || '').trim(),
            historico,
            nrRecibo: extractRecibo(historico),
            lote: String(row[6] || '').trim(),
            lanc: String(row[7] || '').trim(),
            debito,
            credito,
            saldo: typeof row[11] === 'number' ? row[11] : 0,
            dc: String(row[12] || '').trim(),
            mesFonte,
        });
    }

    return { lancamentos, contaNome, saldoFinal };
}

/**
 * Mescla múltiplos arquivos de razão em um único dataset
 * @param {Array<{buffer: ArrayBuffer, mesFonte: string}>} arquivos
 */
export function mergeRazaoFiles(arquivos) {
    const allLancamentos = [];
    let contaNome = '';
    let saldoFinal = 0;

    for (const { buffer, mesFonte } of arquivos) {
        const result = parseRazao(buffer, mesFonte);
        allLancamentos.push(...result.lancamentos);
        if (mesFonte === 'atual') {
            contaNome = result.contaNome;
            saldoFinal = result.saldoFinal;
        }
    }

    // Mapa de recibo → lançamentos (pode haver vários por recibo)
    const byRecibo = new Map();
    for (const l of allLancamentos) {
        if (!l.nrRecibo) continue;
        if (!byRecibo.has(l.nrRecibo)) byRecibo.set(l.nrRecibo, []);
        byRecibo.get(l.nrRecibo).push(l);
    }

    return { lancamentos: allLancamentos, byRecibo, contaNome, saldoFinal };
}
