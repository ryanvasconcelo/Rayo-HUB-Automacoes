/**
 * razaoParser.js — Parser do Razão Contábil de Estoque (XLSX)
 *
 * Layout do arquivo (confirmado nos dados reais):
 *   Row 0: Cabeçalho empresa (CNPJ)
 *   Row 1: "Razão Por Conta" + Período
 *   Row 3: Header colunas: Data | Emp. | CC | Histórico | | C/Partida | Lote | Lanç. | Débito | Crédito | | Saldo
 *   Row 5: "Conta: XXXXX" (nome da conta)
 *   Row 6: "SALDO ANTERIOR"
 *   Row 7+: Lançamentos
 *   Última linha: "SALDO ATUAL"
 *
 * Índices de coluna (0-based):
 *   0: Data (serial Excel)
 *   3: Histórico (contém "Chassi XXXXXXX")
 *   8: Débito (entrada de moto no estoque)
 *   9: Crédito (saída de moto do estoque)
 *   11: Saldo acumulado
 */

import * as XLSX from 'xlsx';
import { extrairChave7 } from './parser';

// Regex para capturar o chassi do campo Histórico
// Cobre: "Chassi M004316", "Chassi: M004316", "Chassi:M0l3574"
// Pega a primeira sequência alfanumérica após "Chassi"
const CHASSI_REGEX = /[Cc]hassi[:\s]+([A-Z0-9a-z]{3,})/;

/**
 * Converte serial Excel para Date
 */
function excelSerialToDate(serial) {
    if (typeof serial !== 'number' || isNaN(serial) || serial < 40000) return null;
    const utcDays = serial - 25569;
    return new Date(utcDays * 86400 * 1000);
}

/**
 * Formata Date como "YYYY-MM" para agrupamento por mês.
 */
function toMesKey(date) {
    if (!date) return null;
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return m;
}

/**
 * Extrai o chassi de 7 caracteres do campo Histórico.
 * Usa regex para encontrar o token após "Chassi", depois pega os últimos 7.
 */
function extrairChassiDoHistorico(historico) {
    if (!historico || typeof historico !== 'string') return null;
    const match = historico.match(CHASSI_REGEX);
    if (!match) return null;
    const token = match[1].trim();
    return extrairChave7(token);
}

/**
 * Verifica se uma linha é de lançamento real (col 0 = serial de data)
 */
function isLancamento(row) {
    return typeof row[0] === 'number' && row[0] > 40000;
}

/**
 * Verifica se é linha de totalização
 */
function isTotalizador(row) {
    const col0 = String(row[0] || '').trim().toUpperCase();
    return col0 === 'SALDO ATUAL' || col0 === 'SALDO ANTERIOR' || col0.startsWith('TOTAIS');
}

/**
 * Parse do Razão Contábil de Estoque.
 * Retorna todos os lançamentos com chassi identificado, agrupados por mês.
 *
 * @param {ArrayBuffer} buffer
 * @returns {RazaoEstoqueResult}
 */
export function parseRazaoEstoque(buffer) {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Extrai nome da conta
    const contaRow = rows.find(r => String(r[0] || '').startsWith('Conta:'));
    const contaNome = contaRow ? String(contaRow[1] || '').trim() : '';

    // Saldo anterior (linha 6 = "SALDO ANTERIOR", col 11)
    let saldoAnterior = 0;
    const saldoAntRow = rows.find(r => String(r[0] || '').trim().toUpperCase() === 'SALDO ANTERIOR');
    if (saldoAntRow) {
        saldoAnterior = typeof saldoAntRow[11] === 'number' ? saldoAntRow[11] : 0;
    }

    const lancamentos = [];
    let saldoFinal = 0;

    for (const row of rows) {
        if (isTotalizador(row)) {
            const s = row[11];
            if (typeof s === 'number') saldoFinal = s;
            continue;
        }
        if (!isLancamento(row)) continue;

        const historico = String(row[3] || '');
        const debito = typeof row[8] === 'number' ? row[8] : 0;
        const credito = typeof row[9] === 'number' ? row[9] : 0;
        if (debito === 0 && credito === 0) continue;

        const date = excelSerialToDate(row[0]);
        const mes = toMesKey(date);
        const chassi7 = extrairChassiDoHistorico(historico);

        lancamentos.push({
            date,
            mes,           // '01'...'12'
            historico,
            chassi7,       // últimos 7 chars ou null se não encontrado
            debito,
            credito,
            saldo: typeof row[11] === 'number' ? row[11] : 0,
            lote: String(row[6] || '').trim(),
        });
    }

    // ── Agrupa por chassi7 ────────────────────────────────────────────────────
    // chassiMap: chassi7 → { debitos: [...], creditos: [...] }
    const chassiMap = new Map();

    for (const lanc of lancamentos) {
        if (!lanc.chassi7) continue;
        if (!chassiMap.has(lanc.chassi7)) {
            chassiMap.set(lanc.chassi7, {
                chassi7: lanc.chassi7,
                lancamentos: [],
                totalDebito: 0,
                totalCredito: 0,
            });
        }
        const entry = chassiMap.get(lanc.chassi7);
        entry.lancamentos.push(lanc);
        entry.totalDebito += lanc.debito;
        entry.totalCredito += lanc.credito;
    }

    // ── Saldo acumulado do Razão por mês ──────────────────────────────────────
    // Para cada mês MM: saldo = saldoAnterior + Σdébitos(jan..MM) - Σcréditos(jan..MM)
    const MESES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const saldoPorMes = {};
    let acumulado = saldoAnterior;

    for (const mes of MESES) {
        const lancMes = lancamentos.filter(l => l.mes === mes);
        const debMes = lancMes.reduce((s, l) => s + l.debito, 0);
        const creMes = lancMes.reduce((s, l) => s + l.credito, 0);
        acumulado = acumulado + debMes - creMes;
        saldoPorMes[mes] = {
            saldo: acumulado,
            totalDebito: debMes,
            totalCredito: creMes,
            lancamentos: lancMes,
        };
    }

    // ── Mapa de chassi7 → estado por mês ─────────────────────────────────────
    // Para cada chassi: em qual mês ele entrou (primeiro débito) e saiu (primeiro crédito)?
    const chassiEstado = new Map();
    for (const [chassi7, entry] of chassiMap.entries()) {
        const debitosOrdenados = entry.lancamentos
            .filter(l => l.debito > 0)
            .sort((a, b) => (a.date || 0) - (b.date || 0));
        const creditosOrdenados = entry.lancamentos
            .filter(l => l.credito > 0)
            .sort((a, b) => (a.date || 0) - (b.date || 0));

        chassiEstado.set(chassi7, {
            chassi7,
            mesEntrada: debitosOrdenados[0]?.mes || null,
            mesSaida: creditosOrdenados[0]?.mes || null,
            valorEntrada: debitosOrdenados[0]?.debito || 0,
            totalDebito: entry.totalDebito,
            totalCredito: entry.totalCredito,
            lancamentos: entry.lancamentos,
        });
    }

    return {
        contaNome,
        saldoAnterior,
        saldoFinal,
        lancamentos,
        saldoPorMes,    // { '01': { saldo, totalDebito, totalCredito }, ... }
        chassiEstado,   // Map<chassi7, { mesEntrada, mesSaida, valorEntrada, ... }>
        chassiMap,      // Map<chassi7, { lancamentos, totalDebito, totalCredito }>
    };
}
