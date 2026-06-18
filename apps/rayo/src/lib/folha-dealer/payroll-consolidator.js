/**
 * payroll-consolidator.js — Consolida PayrollSourceRow por chave de agrupamento.
 *
 * Chave de consolidação:
 *   companyId + competence + lotacaoCode + eventCode
 *
 * Resultado: ConsolidatedPayrollItem[].
 */

/**
 * @param {object[]} rows — PayrollSourceRow normalizadas.
 * @returns {object[]} — ConsolidatedPayrollItem[].
 */
export function consolidatePayrollRows(rows) {
  const map = new Map();

  for (const row of rows) {
    const key = `${row.companyId}|${row.competence}|${row.lotacaoCode}|${row.eventCode}`;

    if (map.has(key)) {
      const item = map.get(key);
      item.amountCents += row.amountCents;
      item.sourceCount += 1;
    } else {
      map.set(key, {
        companyId: row.companyId,
        competence: row.competence,
        lotacaoCode: row.lotacaoCode,
        lotacaoName: row.lotacaoName || null,
        eventCode: row.eventCode,
        eventName: row.eventName || null,
        amountCents: row.amountCents,
        sourceCount: 1,
      });
    }
  }

  return Array.from(map.values());
}
