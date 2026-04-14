/**
 * razao-banco-parser.js — Parser do Razão Simplificado (Fonte A)
 *
 * Layout confirmado no arquivo "razao-planilha.xlsx":
 *   Row 1 (linha 0): vazia
 *   Row 2 (linha 1): cabeçalho da conta — col[0]=codigo, col[1]=":BANCO ...", col[2]="Saldo Inicial", col[3]="Saldo Final"
 *   Row 3 (linha 2): colunas: Doc | Nome do Fornecedor | Detalhes da Linha | Data de Vencimento |
 *                             Data de Pagamento | Débito | Crédito | (cols extras vazias)
 *   Row 4+ (linha 3+): dados de lançamentos
 *
 * Índices de coluna (0-based):
 *   0: Doc (número inteiro — chave de cruzamento com Nº origem do Saldo)
 *   1: Nome do Fornecedor
 *   2: Detalhes da Linha
 *   3: Data de Vencimento (Date object do XLSX)
 *   4: Data de Pagamento (Date object do XLSX)
 *   5: Débito
 *   6: Crédito
 */

import * as XLSX from 'xlsx';

const COL = {
    DOC: 0,
    NOME: 1,
    DETALHES: 2,
    DATA_VCTO: 3,
    DATA_PGTO: 4,
    DEBITO: 5,
    CREDITO: 6,
};

function formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Detecta linha de cabeçalho de conta (contém "Saldo Inicial" ou "BANCO")
 */
function isCabecalhoRow(row) {
    return String(row[1] || '').includes('BANCO') || String(row[2] || '').includes('Saldo');
}

/**
 * Detecta linha de dados real — col[0] deve ser número inteiro (Doc)
 */
function isLancamentoRow(row) {
    return typeof row[COL.DOC] === 'number' && Number.isInteger(row[COL.DOC]) && row[COL.DOC] > 0;
}

/**
 * Parse do arquivo Razão Simplificado (Fonte A).
 *
 * @param {ArrayBuffer} buffer
 * @returns {{ lancamentos: RazaoBancoEntry[], contaNome: string, saldoInicial: number, saldoFinal: number }}
 */
export function parseRazaoBanco(buffer) {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let contaNome = '';
    let saldoInicial = 0;
    let saldoFinal = 0;
    const lancamentos = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Linha de cabeçalho da conta (linha 1 — índice 1)
        if (i === 1 && row[0]) {
            contaNome = `${String(row[0]).trim()} ${String(row[1] || '').trim()}`.trim();
            // Extrai saldo inicial e final
            const saldoInicialStr = String(row[2] || '').replace('Saldo Inicial - R$:', '').replace(/\./g, '').replace(',', '.').trim();
            const saldoFinalStr = String(row[3] || '').replace('Saldo Final - R$:', '').replace(/\./g, '').replace(',', '.').trim();
            saldoInicial = parseFloat(saldoInicialStr) || 0;
            saldoFinal = parseFloat(saldoFinalStr) || 0;
            continue;
        }

        if (!isLancamentoRow(row)) continue;

        const docRaw = row[COL.DOC];
        const doc = String(docRaw).trim();

        const debito = typeof row[COL.DEBITO] === 'number' ? row[COL.DEBITO] : parseFloat(row[COL.DEBITO]) || 0;
        const credito = typeof row[COL.CREDITO] === 'number' ? row[COL.CREDITO] : parseFloat(row[COL.CREDITO]) || 0;

        if (debito === 0 && credito === 0) continue;

        const dataVcto = row[COL.DATA_VCTO] instanceof Date ? row[COL.DATA_VCTO] : null;
        const dataPgto = row[COL.DATA_PGTO] instanceof Date ? row[COL.DATA_PGTO] : null;

        lancamentos.push({
            doc,                           // chave de matching com nrOrigem
            nome: String(row[COL.NOME] || '').trim(),
            detalhes: String(row[COL.DETALHES] || '').trim(),
            dataVcto,
            dataVctoStr: formatDate(dataVcto),
            dataPgto,
            dataPgtoStr: formatDate(dataPgto),
            debito,
            credito,
            // Sinal líquido: débito = positivo, crédito = negativo
            valor: debito > 0 ? debito : -credito,
            status: 'ATIVO',
        });
    }

    return { lancamentos, contaNome, saldoInicial, saldoFinal };
}
