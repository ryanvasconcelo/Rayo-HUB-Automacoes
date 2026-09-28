/**
 * payroll-type-summary.js — Totais por tipo de folha.
 *
 * Mesmo recorte do "Resumo Geral do Mês/Período" do Fortes (proventos,
 * descontos, líquido e empregados por Folha de Pagamento, Férias, Rescisão e
 * Complemento de Folha), para o contador conferir o lote contra o relatório
 * que já usa.
 */

import { PAYROLL_TYPES, resolvePayrollType } from './contracts.js';

// Só provento e desconto: quem tem apenas base informativa (600/601…) não
// entra na contagem de empregados.
const COUNTED_NATURES = new Set(['PROVENTO', 'DESCONTO']);

/**
 * @param {object[]} rows — PayrollSourceRow[] normalizadas.
 * @returns {{ payrollType: string, label: string, proventosCents: number, descontosCents: number, liquidoCents: number, empregados: number }[]}
 */
export function summarizeByPayrollType(rows = []) {
  const byType = new Map();

  for (const row of rows) {
    // Líquido sintético sai como DESCONTO, mas não é desconto do empregado.
    if (row.sourceOrigin === 'fortes-query-derived') continue;
    const nature = row.sourceRecordType;
    if (!COUNTED_NATURES.has(nature)) continue;

    const payrollType = resolvePayrollType(row.payrollType);
    if (!byType.has(payrollType)) {
      byType.set(payrollType, { proventosCents: 0, descontosCents: 0, employees: new Set() });
    }
    const totals = byType.get(payrollType);
    const amount = Math.abs(Number(row.amountCents) || 0);
    if (nature === 'PROVENTO') totals.proventosCents += amount;
    if (nature === 'DESCONTO') totals.descontosCents += amount;
    if (row.employeeId) totals.employees.add(String(row.employeeId));
  }

  return Object.keys(PAYROLL_TYPES)
    .filter((payrollType) => byType.has(payrollType))
    .map((payrollType) => {
      const { proventosCents, descontosCents, employees } = byType.get(payrollType);
      return {
        payrollType,
        label: PAYROLL_TYPES[payrollType].label,
        proventosCents,
        descontosCents,
        liquidoCents: proventosCents - descontosCents,
        empregados: employees.size,
      };
    });
}
