/**
 * fortes-provision-reversal.js — Baixa da provisão de férias (Fortes PRF).
 *
 * O contador lança o pagamento de férias em despesa (6.1.1.03.001) e zera a
 * provisão do empregado sempre que as férias acontecem (gozo ou rescisão).
 *
 * Como o Fortes registra a provisão, por empregado × período aquisitivo:
 * - Acumulada = saldo do mês anterior já deduzido da baixa do mês;
 * - Provisao  = constituição do mês (no mês das férias, o complemento);
 * - saldo final = Acumulada + Provisao.
 * Logo, baixa do mês = saldo final do mês anterior − Acumulada do mês.
 * Período que deixa de aparecer (rescisão) baixa o saldo inteiro.
 *
 * O Rayo já lança a Provisao (PROV_*); aqui saem as baixas (PROV_BAIXA_*),
 * que debitam a provisão e creditam a despesa. Baixa negativa (saldo que cresce
 * fora da provisão do mês) segue com sinal: o journal inverte D/C de PROV_*.
 */

const REVERSAL_DEFS = [
  { eventCode: 'PROV_BAIXA_FERIAS', eventName: 'Baixa Provisão Férias e 1/3 (Fortes)', provKey: 'provFerCents', acumKey: 'provFerAcumCents' },
  { eventCode: 'PROV_BAIXA_INSS_FER', eventName: 'Baixa Provisão INSS s/ Férias (Fortes)', provKey: 'inssFerCents', acumKey: 'inssFerAcumCents' },
  { eventCode: 'PROV_BAIXA_FGTS_FER', eventName: 'Baixa Provisão FGTS s/ Férias (Fortes)', provKey: 'fgtsFerCents', acumKey: 'fgtsFerAcumCents' },
];

const periodKey = (row) => `${row.employeeId}|${row.periodStart}`;
const cents = (value) => Number(value) || 0;

/**
 * @param {object} params
 * @param {string} params.competence — AAAAMM da competência do lote
 * @param {object[]} params.current — linhas PRF da competência
 * @param {object[]} params.previous — linhas PRF da competência anterior
 * @returns {object[]} linhas de provisão (sourceOrigin fortes-provision) com PROV_BAIXA_*
 */
function computeVacationProvisionReversals({ competence, current = [], previous = [] }) {
  // Sem a provisão de um dos dois meses calculada no Fortes, não há como
  // distinguir baixa de mês não calculado.
  if (current.length === 0 || previous.length === 0) return [];

  const previousByKey = new Map(previous.map((row) => [periodKey(row), row]));
  const currentKeys = new Set(current.map(periodKey));
  const out = [];

  const emit = (row, def, amountCents) => {
    if (amountCents === 0) return;
    out.push({
      companyId: row.companyId,
      companyName: row.companyName || '',
      competence,
      employeeId: row.employeeId,
      employeeName: row.employeeName || '',
      sourcePayrollId: row.sourcePayrollId,
      eventCode: def.eventCode,
      eventName: def.eventName,
      ProvDesc: 'PROVISAO',
      TipoRegistro: 'PROVISAO',
      IncideFGTS: '0',
      amountCents,
      sourceReference: '',
      lotacaoCode: row.lotacaoCode || '',
      lotacaoName: row.lotacaoName || '',
      sourceOrigin: 'fortes-provision',
    });
  };

  const saldoFinal = (row, def) => (row ? cents(row[def.acumKey]) + cents(row[def.provKey]) : 0);

  for (const row of current) {
    const prev = previousByKey.get(periodKey(row));
    for (const def of REVERSAL_DEFS) {
      emit(row, def, saldoFinal(prev, def) - cents(row[def.acumKey]));
    }
  }

  for (const prev of previous) {
    if (currentKeys.has(periodKey(prev))) continue;
    for (const def of REVERSAL_DEFS) {
      emit(prev, def, saldoFinal(prev, def));
    }
  }

  return out;
}

module.exports = { computeVacationProvisionReversals, REVERSAL_DEFS };
