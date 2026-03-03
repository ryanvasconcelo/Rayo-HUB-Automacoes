/**
 * relatorio-parser.js — Parser do Relatório Financeiro Sifin (XLS/XLSX)
 *
 * Layout confirmado (Saídas AF e Saldo Acumulado AF):
 *   Row 0 (header): Emp | CPF/CNPJ | Nome | Tipo Adiantamento | Entrada | Vencimento |
 *                   Valor | Saldo | Doc./ | Nr. Recibo | Natureza | Observação | Lote | ...
 *   Row 1+: dados de lançamentos
 *
 * Nr. Recibo é campo numérico — tratar como string para comparação.
 * Saldo = 0 → quitado; Saldo > 0 → em aberto
 */

import * as XLSX from 'xlsx';

const COL = {
    EMP: 0,
    CNPJ: 1,
    NOME: 2,
    TIPO: 3,
    ENTRADA: 4,
    VCTO: 5,
    VALOR: 6,
    SALDO: 7,
    DOC: 8,
    NR_RECIBO: 9,
    NATUREZA: 10,
    OBS: 11,
    LOTE: 12,
};

function excelSerialToDate(serial) {
    if (typeof serial !== 'number' || isNaN(serial)) return null;
    const ms = (serial - 25569) * 86400 * 1000;
    return new Date(ms);
}

function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Parse do Relatório Financeiro (XLS ou XLSX)
 * @param {ArrayBuffer} buffer
 * @returns {RelatorioEntry[]}
 */
export function parseRelatorio(buffer) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) return [];

    // Valida header (linha 0 deve conter "Nr. Recibo" ou "Recibo")
    const header = rows[0].map(h => String(h).toLowerCase());
    const hasRecibo = header.some(h => h.includes('recibo'));
    if (!hasRecibo) {
        throw new Error('Arquivo de Relatório Financeiro inválido: coluna "Nr. Recibo" não encontrada.');
    }

    const lancamentos = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        // Linha vazia ou sem empresa → pula
        if (!row[COL.EMP] && !row[COL.NR_RECIBO]) continue;

        const nrReciboRaw = row[COL.NR_RECIBO];
        if (!nrReciboRaw && nrReciboRaw !== 0) continue;

        const nrRecibo = String(nrReciboRaw).trim();
        if (!nrRecibo || nrRecibo === '0') continue;

        const valor = typeof row[COL.VALOR] === 'number' ? row[COL.VALOR] : parseFloat(row[COL.VALOR]) || 0;
        const saldo = typeof row[COL.SALDO] === 'number' ? row[COL.SALDO] : parseFloat(row[COL.SALDO]) || 0;

        const entradaDate = excelSerialToDate(row[COL.ENTRADA]);

        lancamentos.push({
            nrRecibo,
            emp: String(row[COL.EMP] || '').trim(),
            cnpj: String(row[COL.CNPJ] || '').trim(),
            nome: String(row[COL.NOME] || '').trim(),
            tipo: String(row[COL.TIPO] || '').trim(),
            entrada: entradaDate,
            entradaStr: formatDate(entradaDate),
            valor,
            saldo,
            quitado: saldo === 0,
            doc: String(row[COL.DOC] || '').trim(),
            natureza: String(row[COL.NATUREZA] || '').trim(),
            obs: String(row[COL.OBS] || '').trim(),
            lote: String(row[COL.LOTE] || '').trim(),
        });
    }

    return lancamentos;
}

/**
 * Lê múltiplos arquivos de relatório financeiro e os mescla em um array único.
 * Sifin Saídas e Sifin Saldo Acumulado não possuem sobreposição de Nr. Recibo
 * na mesma competência. Se houver, preserva o primeiro valor.
 * 
 * @param {ArrayBuffer[]} buffers 
 * @returns {RelatorioEntry[]}
 */
export function parseAndMergeRelatorios(buffers) {
    const todosLancamentos = [];

    for (const buffer of buffers) {
        if (!buffer) continue; // Pode passar buffers null se o usuário não fizer upload
        const parciais = parseRelatorio(buffer);
        todosLancamentos.push(...parciais);
    }

    // Remocao de possiveis duplicatas usando Set tracking de Nr. Recibo
    const mapaRecibos = new Map();
    for (const l of todosLancamentos) {
        if (!mapaRecibos.has(l.nrRecibo)) {
            mapaRecibos.set(l.nrRecibo, l);
        }
    }

    return Array.from(mapaRecibos.values());
}
