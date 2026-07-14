/**
 * fortes-normalizer.js — Normaliza linhas de qualquer origem para PayrollSourceRow.
 *
 * Regras:
 * - amountCents SEMPRE positivo.
 * - Natureza D/C NÃO vem do Fortes; vem do de-para contábil.
 * - Campos obrigatórios: sourceSystem, sourceAdapter, sourceOrigin,
 *   companyId, companyName, competence, lotacaoCode, eventCode, amountCents.
 */

import { employeeLotacaoMap } from './employee-lotacao-map.js';

/**
 * Normaliza um array de linhas de origem para PayrollSourceRow.
 * @param {object[]} rawRows — linhas brutas (fixture ou query Fortes).
 * @returns {object[]} — linhas normalizadas com amountCents sempre positivo.
 */
export function normalizePayrollRows(rawRows) {
  return rawRows.map((row, index) => {
    const normalized = { ...row };

    // amountCents sempre positivo (regra 1)
    if (typeof normalized.amountCents === 'number') {
      normalized.amountCents = Math.abs(normalized.amountCents);
    }

    // Garantir eventCode como string
    if (normalized.eventCode != null) {
      normalized.eventCode = String(normalized.eventCode);
    }

    // Override Lotação if we have an employee mapped from the XLS
    if (normalized.employeeId && employeeLotacaoMap[normalized.employeeId]) {
      normalized.lotacaoCode = employeeLotacaoMap[normalized.employeeId];
      // Keep lotacaoName in sync for UI purposes
      normalized.lotacaoName = employeeLotacaoMap[normalized.employeeId];
    }

    // Garantir lotacaoCode como string
    if (normalized.lotacaoCode != null) {
      normalized.lotacaoCode = String(normalized.lotacaoCode);
    }

    // Fallback para sourceLineId
    if (!normalized.sourceLineId) {
      normalized.sourceLineId = `norm-${index}`;
    }

    return normalized;
  });
}
