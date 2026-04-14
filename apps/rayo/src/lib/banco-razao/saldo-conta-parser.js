/**
 * saldo-conta-parser.js — Parser do Relatório "Saldo da Conta" (ERP/SAP)
 *
 * Layout confirmado nos arquivos reais (Sheet1):
 *   Row 1 (header): #, Data de lançamento, Nº transação, Origem, Nº origem,
 *                   Conta de contrapartida, Detalhes, C/D (ML), Saldo acumulado (MC),
 *                   Débito (MC), Crédito (MC), Contrato guarda-chuva
 *   Row 2: saldo inicial (Origem = 'SI')
 *   Row 3+: lançamentos reais
 *
 * Padrões de anulação confirmados nos dados reais:
 *   1. Texto "Anular entrada para pagamento nº XXXXX" no campo Detalhes → ESTORNO EXPLÍCITO
 *   2. Mesmo Nº origem com movimento oposto (D→C ou C→D) de mesmo valor → ANULADO_INTERNO
 */

import * as XLSX from 'xlsx';

// Detecta estorno explícito pelo texto do campo Detalhes
const ANULAR_REGEX = /Anular entrada para pagamento\s+n[oº°]?\s*(\d+)/i;

const COL = {
    SEQ: 0,
    DATA: 1,
    NR_TRANSACAO: 2,
    ORIGEM: 3,
    NR_ORIGEM: 4,
    CONTA_CONTRAPARTIDA: 5,
    DETALHES: 6,
    CD_ML: 7,
    SALDO_ACUMULADO: 8,
    DEBITO: 9,
    CREDITO: 10,
};

/**
 * @param {string} detalhes
 * @returns {boolean}
 */
function isEstornoExplicito(detalhes) {
    return ANULAR_REGEX.test(detalhes);
}

/**
 * @param {string} detalhes
 * @returns {string|null} — Nr. Origem anulado
 */
function extractOrigemAnulada(detalhes) {
    const m = String(detalhes).match(ANULAR_REGEX);
    return m ? m[1] : null;
}

/**
 * Converte string "DD/MM/YYYY" para Date
 */
function parseDataBR(str) {
    if (!str || typeof str !== 'string') return null;
    const [d, m, y] = str.split('/');
    if (!d || !m || !y) return null;
    return new Date(Number(y), Number(m) - 1, Number(d));
}

/**
 * Parse do arquivo "Saldo da Conta" (XLSX).
 *
 * @param {ArrayBuffer} buffer
 * @returns {{ lancamentos: SaldoContaEntry[], saldoInicial: number, contaNome: string }}
 */
export function parseSaldoConta(buffer) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) return { lancamentos: [], saldoInicial: 0, contaNome: '' };

    // Extrai conta do cabeçalho (linha 0, col 0)
    const contaNome = String(rows[0]?.[0] || '').trim();

    let saldoInicial = 0;
    const lancamentos = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        // Linha de saldo inicial (Origem = 'SI' ou seq = '1' sem data)
        if (String(row[COL.ORIGEM] || '').trim() === 'SI') {
            saldoInicial = typeof row[COL.SALDO_ACUMULADO] === 'number'
                ? row[COL.SALDO_ACUMULADO]
                : parseFloat(row[COL.SALDO_ACUMULADO]) || 0;
            continue;
        }

        // Pula linhas vazias ou sem Nr. Origem
        const nrOrigemRaw = row[COL.NR_ORIGEM];
        if (!nrOrigemRaw && nrOrigemRaw !== 0) continue;
        const nrOrigem = String(nrOrigemRaw).trim();
        if (!nrOrigem) continue;

        const detalhes = String(row[COL.DETALHES] || '').trim();
        const cdML = typeof row[COL.CD_ML] === 'number' ? row[COL.CD_ML] : parseFloat(row[COL.CD_ML]) || 0;

        // Derivar débito/crédito a partir do C/D (ML)
        // C/D positivo → débito (entrada na conta); negativo → crédito (saída)
        const debito = cdML > 0 ? cdML : 0;
        const credito = cdML < 0 ? Math.abs(cdML) : 0;

        const estaEstorno = isEstornoExplicito(detalhes);
        const origemAnulada = estaEstorno ? extractOrigemAnulada(detalhes) : null;

        const dataStr = String(row[COL.DATA] || '').trim();

        lancamentos.push({
            seq: String(row[COL.SEQ] || '').trim(),
            data: parseDataBR(dataStr),
            dataStr,
            nrTransacao: row[COL.NR_TRANSACAO],
            origem: String(row[COL.ORIGEM] || '').trim(),
            nrOrigem,
            contaContrapartida: String(row[COL.CONTA_CONTRAPARTIDA] || '').trim(),
            detalhes,
            cdML,
            saldoAcumulado: typeof row[COL.SALDO_ACUMULADO] === 'number' ? row[COL.SALDO_ACUMULADO] : 0,
            debito,
            credito,
            isEstorno: estaEstorno,
            origemAnulada,
            status: 'ATIVO', // será atualizado pelo netting-engine
        });
    }

    return { lancamentos, saldoInicial, contaNome };
}
