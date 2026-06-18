/**
 * account-mapper.js — Aplica de-para de evento Fortes → conta + D/C Dealer.
 *
 * Regras:
 * - D/C NUNCA vem do Fortes; vem exclusivamente do de-para contábil.
 * - Um evento pode gerar uma ou mais linhas contábeis.
 * - Retorna array vazio se não houver mapeamento.
 */

/**
 * @param {string} eventCode
 * @param {string} companyId
 * @param {object[]} accountMappings — AccountMappingLine[]
 * @returns {object[]} — AccountMappingLine[] para o evento.
 */
export function mapAccount(eventCode, companyId, accountMappings) {
  return accountMappings.filter(
    (m) => m.active && m.companyId === companyId && m.eventCode === eventCode
  );
}
