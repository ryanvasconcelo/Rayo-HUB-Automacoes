/**
 * provision-calculator.js — Calcula provisões trabalhistas a partir dos dados Fortes.
 *
 * Provisões geradas por lotação:
 *   PROV_FERIAS    → Férias + 1/3 de Férias
 *   PROV_13        → 13º Salário
 *   PROV_INSS_FER  → INSS Patronal s/ Férias
 *   PROV_INSS_13   → INSS Patronal s/ 13º
 *   PROV_FGTS_FER  → FGTS s/ Férias
 *   PROV_FGTS_13   → FGTS s/ 13º
 *
 * Base de cálculo: BC-FGTS por lotação (soma dos proventos com IncideFGTS=1
 * menos descontos com IncideFGTS=1 que reduzem a base).
 *
 * Módulo puro: não lê arquivos, não escreve arquivos, não acessa banco.
 */

// ---------------------------------------------------------------------------
// Alíquotas padrão (configuráveis por empresa)
// ---------------------------------------------------------------------------

export const DEFAULT_PROVISION_RATES = Object.freeze({
  feriasTerco: 11.11,   // 1/12 × 4/3 ≈ 11,11%
  decimoTerceiro: 8.33,  // 1/12 ≈ 8,33%
  inssPatronal: 28.80,   // 20% + RAT + Terceiros ≈ 28,80%
  fgts: 8.00,            // 8,00%
});

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/**
 * Calcula a BC-FGTS por lotação a partir dos raw rows do Fortes.
 *
 * A base é calculada somando proventos com incidência FGTS e subtraindo
 * descontos com incidência FGTS que reduzem a base remuneratória
 * (ex: faltas, atrasos, DSR desconto).
 *
 * @param {object[]} rawRows — linhas brutas do CSV/DB Fortes
 * @returns {Map<string, { base: number, lotacaoName: string, companyId: string, competence: string }>}
 */
function calculateFgtsBasePerLotacao(rawRows) {
  const bases = new Map();

  for (const row of rawRows) {
    const incideFgts = String(row.IncideFGTS || row.incideFGTS || '0');
    if (incideFgts !== '1') continue;

    const tipo = String(row.TipoRegistro || row.tipoRegistro || '').toUpperCase();
    if (tipo !== 'PROVENTO' && tipo !== 'DESCONTO') continue;

    const lotacao = String(row.lotacaoCode || '');
    const amount = Math.abs(parseInt(row.amountCents || '0', 10));

    if (!bases.has(lotacao)) {
      bases.set(lotacao, {
        base: 0,
        lotacaoName: row.lotacaoName || '',
        companyId: row.companyId,
        competence: row.competence,
      });
    }

    const entry = bases.get(lotacao);
    if (tipo === 'PROVENTO') {
      entry.base += amount;
    } else {
      entry.base -= amount;
    }
  }

  return bases;
}

/**
 * Gera as 6 provisões trabalhistas como PayrollSourceRow[] sintéticas.
 *
 * @param {object[]} rawRows — linhas brutas do Fortes (com IncideFGTS, TipoRegistro)
 * @param {object} [rates] — alíquotas personalizadas (DEFAULT_PROVISION_RATES se omitido)
 * @returns {object[]} — PayrollSourceRow[] sintéticas (6 por lotação com base > 0)
 */
export function calculateProvisions(rawRows, rates = DEFAULT_PROVISION_RATES) {
  const basesPerLotacao = calculateFgtsBasePerLotacao(rawRows);
  const provisionRows = [];

  const provisionDefs = [
    { eventCode: 'PROV_FERIAS',    eventName: 'Provisão Férias e 1/3',     rateKey: 'feriasTerco',    baseMultiplier: null },
    { eventCode: 'PROV_13',        eventName: 'Provisão 13º Salário',      rateKey: 'decimoTerceiro', baseMultiplier: null },
    { eventCode: 'PROV_INSS_FER',  eventName: 'Provisão INSS s/ Férias',   rateKey: 'inssPatronal',   baseMultiplier: 'feriasTerco' },
    { eventCode: 'PROV_INSS_13',   eventName: 'Provisão INSS s/ 13º',      rateKey: 'inssPatronal',   baseMultiplier: 'decimoTerceiro' },
    { eventCode: 'PROV_FGTS_FER',  eventName: 'Provisão FGTS s/ Férias',   rateKey: 'fgts',           baseMultiplier: 'feriasTerco' },
    { eventCode: 'PROV_FGTS_13',   eventName: 'Provisão FGTS s/ 13º',      rateKey: 'fgts',           baseMultiplier: 'decimoTerceiro' },
  ];

  for (const [lotacaoCode, data] of basesPerLotacao) {
    if (data.base <= 0) continue;

    // Normalizar competência
    let comp = data.competence;
    if (comp && typeof comp === 'string' && !comp.includes('-') && comp.length === 6) {
      comp = `${comp.substring(0, 4)}-${comp.substring(4, 6)}`;
    }

    for (const def of provisionDefs) {
      let base = data.base;

      // INSS e FGTS incidem sobre a provisão de férias/13º, não sobre a base total
      if (def.baseMultiplier) {
        base = Math.round(data.base * (rates[def.baseMultiplier] / 100));
      }

      const amountCents = Math.round(base * (rates[def.rateKey] / 100));

      if (amountCents <= 0) continue;

      provisionRows.push({
        sourceSystem: 'fortes',
        sourceAdapter: 'provision-calculator',
        sourceOrigin: 'provision-derived',
        sourcePayrollId: null,
        companyId: data.companyId != null ? String(data.companyId) : '',
        companyName: '',
        competence: comp || '',
        lotacaoCode,
        lotacaoName: data.lotacaoName || '',
        eventCode: def.eventCode,
        eventName: def.eventName,
        sourceEventNature: 'PROVISAO',
        sourceReference: `BC-FGTS: ${data.base}`,
        sourceRecordType: 'PROVISAO',
        amountCents,
        employeeId: null,
        employeeName: null,
        sourceLineId: `provision-${def.eventCode}-${lotacaoCode}`,
      });
    }
  }

  return provisionRows;
}
