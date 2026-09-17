/**
 * fortes-normalizer.js — Normaliza linhas de qualquer origem para PayrollSourceRow.
 *
 * Regras:
 * - amountCents positivo na folha mensal (proventos/descontos).
 * - PROV_* de origem Fortes (`fortes-provision`) mantêm o sinal — Provisionar
 *   negativo = estorno (o journal inverte D/C).
 * - LIQUIDO_FOLHA mantém o sinal — negativo vira blocker no journal.
 * - Lotação vinda do Fortes prevalece; mapa estático só preenche lotação vazia.
 * - Natureza D/C NÃO vem do Fortes; vem do de-para contábil.
 * - Campos obrigatórios: sourceSystem, sourceAdapter, sourceOrigin,
 *   companyId, companyName, competence, lotacaoCode, eventCode, amountCents.
 */

import { employeeLotacaoMap } from './employee-lotacao-map.js';

/**
 * Provisões Fortes (PRD/PRF), eventos PROV_* e o líquido derivado preservam sinal.
 * @param {object} row
 * @returns {boolean}
 */
function shouldPreserveSignedAmount(row) {
  if (row?.sourceOrigin === 'fortes-provision') return true;
  const code = String(row?.eventCode || '');
  return code.startsWith('PROV_') || code === 'LIQUIDO_FOLHA';
}

/**
 * Normaliza um array de linhas de origem para PayrollSourceRow.
 * @param {object[]} rawRows — linhas brutas (fixture ou query Fortes).
 * @returns {object[]} — linhas normalizadas.
 */
export function normalizePayrollRows(rawRows) {
  return rawRows.map((row, index) => {
    const normalized = { ...row };

    if (typeof normalized.amountCents === 'number' && !shouldPreserveSignedAmount(normalized)) {
      normalized.amountCents = Math.abs(normalized.amountCents);
    }

    // Garantir eventCode como string
    if (normalized.eventCode != null) {
      normalized.eventCode = String(normalized.eventCode);
    }

    // Mapa estático (XLS) só quando a origem não trouxe lotação
    const hasLotacao = normalized.lotacaoCode != null && String(normalized.lotacaoCode) !== '';
    if (!hasLotacao && normalized.employeeId && employeeLotacaoMap[normalized.employeeId]) {
      normalized.lotacaoCode = employeeLotacaoMap[normalized.employeeId];
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
