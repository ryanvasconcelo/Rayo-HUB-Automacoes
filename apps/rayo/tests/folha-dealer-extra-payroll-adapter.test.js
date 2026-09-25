import { describe, expect, it } from 'vitest';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';

const B = { companyId: '9274', competence: '202604', lotacaoCode: 'ADM' };
const PROVENTO = { ProvDesc: 1, TipoRegistro: 'PROVENTO', IncideFGTS: '1' };
const DESCONTO = { ProvDesc: -1, TipoRegistro: 'DESCONTO' };

const mensal = [
  { ...B, employeeId: '1', eventCode: '011', amountCents: 300000, ...PROVENTO },
  { ...B, employeeId: '1', eventCode: '310', amountCents: 30000, ...DESCONTO },
];
const rescisao = [
  { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '200', amountCents: 150000, ...PROVENTO },
  { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '502', amountCents: 10000, ...DESCONTO },
];
const ferias = [
  { ...B, payrollType: 'FERIAS', employeeId: '3', eventCode: '110', amountCents: 90000, ...PROVENTO },
  { ...B, payrollType: 'FERIAS', employeeId: '3', eventCode: '111', amountCents: 30000, ...PROVENTO },
  { ...B, payrollType: 'FERIAS', employeeId: '3', eventCode: '310', amountCents: 12000, ...DESCONTO },
];

const valores = (rows, eventCode) =>
  rows.filter((r) => r.eventCode === eventCode).map((r) => r.amountCents);

describe('adapter — férias, rescisão e complementar', () => {
  it('linha da folha mensal sai marcada como MENSAL', () => {
    const rows = normalizeFortesQueryRows(mensal);
    expect(rows.find((r) => r.eventCode === '011').payrollType).toBe('MENSAL');
    expect(rows.find((r) => r.eventCode === 'LIQUIDO_FOLHA').payrollType).toBe('MENSAL');
  });

  it('gera um líquido por tipo, sem misturar rescisão e férias no líquido da folha', () => {
    const rows = normalizeFortesQueryRows(mensal, { fortesExtraPayroll: [...rescisao, ...ferias] });
    expect(valores(rows, 'LIQUIDO_FOLHA')).toEqual([270000]);
    expect(valores(rows, 'LIQUIDO_RESCISAO')).toEqual([140000]);
    expect(valores(rows, 'LIQUIDO_FERIAS')).toEqual([108000]);
    expect(rows.find((r) => r.eventCode === 'LIQUIDO_RESCISAO')).toMatchObject({
      payrollType: 'RESCISAO',
      lotacaoCode: 'ADM',
      sourceOrigin: 'fortes-query-derived',
      eventName: 'Líquido de Rescisão a Pagar',
    });
  });

  it('mantém o tipo nas linhas de evento, inclusive quando o mesmo código aparece em dois tipos', () => {
    const rows = normalizeFortesQueryRows(mensal, { fortesExtraPayroll: ferias });
    const inss = rows.filter((r) => r.eventCode === '310').map((r) => [r.payrollType, r.amountCents]);
    expect(inss).toEqual([['MENSAL', 30000], ['FERIAS', 12000]]);
  });

  it('líquido de rescisão negativo sai com sinal', () => {
    const rows = normalizeFortesQueryRows([], {
      fortesExtraPayroll: [
        { ...B, payrollType: 'RESCISAO', eventCode: '199', amountCents: 10000, ...PROVENTO },
        { ...B, payrollType: 'RESCISAO', eventCode: '500', amountCents: 25000, ...DESCONTO },
      ],
    });
    expect(valores(rows, 'LIQUIDO_RESCISAO')).toEqual([-15000]);
  });

  it('fallback sintético de provisão/encargo usa só a folha mensal (evita encargo em dobro)', () => {
    const rates = { feriasTerco: 10, decimoTerceiro: 10, inssPatronal: 0, fgts: 0 };
    const sintetico = (rows) =>
      rows
        .filter((r) => r.sourceOrigin === 'provision-derived' || r.sourceOrigin === 'encargo-derived')
        .map((r) => `${r.eventCode}:${r.amountCents}`)
        .sort();

    const soMensal = sintetico(normalizeFortesQueryRows(mensal, {}, rates, null));
    expect(soMensal.length).toBeGreaterThan(0);

    const comExtras = normalizeFortesQueryRows(mensal, { fortesExtraPayroll: [...rescisao, ...ferias] }, rates, null);
    expect(sintetico(comExtras)).toEqual(soMensal);

    // Mesmo que a rescisão chegue por engano junto com a folha mensal
    const extrasEmRawRows = normalizeFortesQueryRows([...mensal, ...rescisao], {}, rates, null);
    expect(sintetico(extrasEmRawRows)).toEqual(soMensal);
  });
});
