import { describe, expect, it } from 'vitest';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';
import { runFolhaDealerEngine } from '../src/lib/folha-dealer/index.js';

const config = {
  company: { companyId: '9274' },
  informativeEventCodes: [],
  centerMappings: [
    { companyId: '9274', lotacaoCode: 'ADM', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  ],
  accountMappings: [
    { companyId: '9274', eventCode: '011', dealerAccountCode: '6.1.1.01.002', dc: 'D', active: true },
    { companyId: '9274', eventCode: '199', dealerAccountCode: '6.1.1.01.002', dc: 'D', active: true },
    { companyId: '9274', eventCode: '310', dealerAccountCode: '2.1.1.02.001', dc: 'C', active: true },
    { companyId: '9274', eventCode: 'LIQUIDO_FOLHA', dealerAccountCode: '2.1.1.01.001', dc: 'C', active: true },
    { companyId: '9274', eventCode: 'LIQUIDO_RESCISAO', dealerAccountCode: '2.1.1.01.004', dc: 'C', active: true },
  ],
};

const B = { companyId: '9274', competence: '202604', lotacaoCode: 'ADM' };

function run(mensal, rescisao) {
  const sourceRows = normalizeFortesQueryRows(mensal, { fortesExtraPayroll: rescisao });
  return runFolhaDealerEngine({ config, sourceRows, competence: '2026-04' });
}

const lote = run(
  [
    { ...B, employeeId: '1', eventCode: '011', amountCents: 300000, ProvDesc: 1 },
    { ...B, employeeId: '1', eventCode: '310', amountCents: 30000, ProvDesc: -1 },
  ],
  [
    { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '199', amountCents: 100000, ProvDesc: 1 },
    { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '310', amountCents: 8000, ProvDesc: -1 },
  ]
);

describe('journal com folha mensal + rescisão no mesmo mês', () => {
  it('fecha débito = crédito', () => {
    const total = (dc) => lote.entries.filter((e) => e.dc === dc).reduce((s, e) => s + e.amountCents, 0);
    expect(total('D')).toBe(400000);
    expect(total('C')).toBe(400000);
    expect(lote.issues.filter((i) => i.code === 'UNBALANCED_JOURNAL')).toEqual([]);
  });

  it('líquido da rescisão vai para a conta própria com histórico de rescisão', () => {
    expect(lote.entries.find((e) => e.eventCode === 'LIQUIDO_RESCISAO')).toMatchObject({
      dc: 'C',
      accountCode: '2.1.1.01.004',
      amountCents: 92000,
      history: 'RESCISAO REF 04/2026',
      payrollType: 'RESCISAO',
    });
  });

  it('folha mensal mantém conta e histórico de sempre', () => {
    expect(lote.entries.find((e) => e.eventCode === 'LIQUIDO_FOLHA')).toMatchObject({
      accountCode: '2.1.1.01.001',
      amountCents: 270000,
      history: 'FOLHA DE PAGAMENTO REF 04/2026',
      payrollType: 'MENSAL',
    });
  });

  it('não soma o INSS da rescisão com o da folha mensal no consolidado', () => {
    const inss = lote.consolidatedItems
      .filter((c) => c.eventCode === '310')
      .map((c) => [c.payrollType, c.amountCents]);
    expect(inss).toEqual([['MENSAL', 30000], ['RESCISAO', 8000]]);
  });

  it('rescisão com líquido negativo bloqueia em vez de inverter o lançamento', () => {
    const negativo = run([], [
      { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '199', amountCents: 10000, ProvDesc: 1 },
      { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '310', amountCents: 25000, ProvDesc: -1 },
    ]);
    expect(
      negativo.issues.some(
        (i) => i.code === 'NEGATIVE_VALUE_WITHOUT_POLICY' && i.context.eventCode === 'LIQUIDO_RESCISAO'
      )
    ).toBe(true);
    expect(negativo.status).toBe('blocked');
  });
});
