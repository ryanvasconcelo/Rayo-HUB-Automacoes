/**
 * center-mapper.js — Aplica de-para de lotação Fortes → centro Dealer.
 *
 * Regras:
 * - Retorna o centro Dealer para uma dada lotação + empresa.
 * - Lotações `direct` e `activity` com centro cadastrado no de-para resolvem.
 * - Retorna null se não houver mapeamento (o validator emitirá issue).
 */

/**
 * @param {string} lotacaoCode
 * @param {string} companyId
 * @param {object[]} centerMappings — CenterMapping[]
 * @returns {{ centerCode: string, centerName: string|null } | null}
 */
export function mapCenter(lotacaoCode, companyId, centerMappings) {
  const mapping = centerMappings.find(
    (m) => m.active && m.companyId === companyId && m.lotacaoCode === lotacaoCode
  );

  if (!mapping) return null;

  return {
    centerCode: mapping.dealerCenterCode,
    centerName: mapping.dealerCenterName || null,
  };
}
