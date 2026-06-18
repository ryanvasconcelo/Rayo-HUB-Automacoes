/**
 * fortes-normalizer.js — Normaliza linhas de qualquer origem para PayrollSourceRow.
 *
 * Regras:
 * - amountCents SEMPRE positivo.
 * - Natureza D/C NÃO vem do Fortes; vem do de-para contábil.
 * - Campos obrigatórios: sourceSystem, sourceAdapter, sourceOrigin,
 *   companyId, companyName, competence, lotacaoCode, eventCode, amountCents.
 */

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
