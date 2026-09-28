import { describe, expect, it } from 'vitest';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';
import { summarizeByPayrollType } from '../src/lib/folha-dealer/payroll-type-summary.js';

const B = { companyId: '9277', competence: '202604', lotacaoCode: 'ADM' };
const rows = normalizeFortesQueryRows(
  [
    { ...B, employeeId: '1', eventCode: '011', amountCents: 300000, ProvDesc: 1 },
    { ...B, employeeId: '1', eventCode: '310', amountCents: 30000, ProvDesc: -1 },
    { ...B, employeeId: '9', eventCode: '604', amountCents: 50000, ProvDesc: 0 },
  ],
  {
    fortesExtraPayroll: [
      { ...B, payrollType: 'FERIAS', employeeId: '2', eventCode: '110', amountCents: 90000, ProvDesc: 1 },
      { ...B, payrollType: 'FERIAS', employeeId: '2', eventCode: '310', amountCents: 9000, ProvDesc: -1 },
    ],
  }
);

describe('summarizeByPayrollType', () => {
  it('fecha proventos, descontos, líquido e empregados por tipo, como o Resumo Geral do Fortes', () => {
    expect(summarizeByPayrollType(rows)).toEqual([
      { payrollType: 'MENSAL', label: 'Folha de Pagamento', proventosCents: 300000, descontosCents: 30000, liquidoCents: 270000, empregados: 2 },
      { payrollType: 'FERIAS', label: 'Férias', proventosCents: 90000, descontosCents: 9000, liquidoCents: 81000, empregados: 1 },
    ]);
  });

  it('não conta o líquido sintético como desconto', () => {
    const mensal = summarizeByPayrollType(rows).find((t) => t.payrollType === 'MENSAL');
    expect(mensal.descontosCents).toBe(30000);
  });

  it('lista vazia não quebra', () => {
    expect(summarizeByPayrollType([])).toEqual([]);
  });
});
