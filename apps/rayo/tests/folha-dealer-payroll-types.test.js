import { describe, expect, it } from 'vitest';
import {
  PAYROLL_TYPES,
  DEFAULT_PAYROLL_TYPE,
  resolvePayrollType,
  buildHistory,
} from '../src/lib/folha-dealer/contracts.js';
import { normalizePayrollRows } from '../src/lib/folha-dealer/fortes-normalizer.js';

describe('tipos de folha', () => {
  it('mantém o histórico da folha mensal idêntico ao TXT já validado no Dealer', () => {
    expect(buildHistory('2026-04')).toBe('FOLHA DE PAGAMENTO REF 04/2026');
    expect(buildHistory('2026-04', 'MENSAL')).toBe('FOLHA DE PAGAMENTO REF 04/2026');
  });

  it('usa histórico próprio para férias, rescisão e complementar', () => {
    expect(buildHistory('2026-04', 'FERIAS')).toBe('FERIAS REF 04/2026');
    expect(buildHistory('2026-04', 'RESCISAO')).toBe('RESCISAO REF 04/2026');
    expect(buildHistory('2026-04', 'COMPLEMENTAR')).toBe('FOLHA COMPLEMENTAR REF 04/2026');
  });

  it('cada tipo tem um evento de líquido próprio, na ordem do Resumo Geral do Fortes', () => {
    expect(Object.keys(PAYROLL_TYPES)).toEqual(['MENSAL', 'FERIAS', 'RESCISAO', 'COMPLEMENTAR']);
    expect(Object.values(PAYROLL_TYPES).map((t) => t.liquidEventCode)).toEqual([
      'LIQUIDO_FOLHA',
      'LIQUIDO_FERIAS',
      'LIQUIDO_RESCISAO',
      'LIQUIDO_COMPLEMENTAR',
    ]);
    expect(PAYROLL_TYPES.MENSAL.liquidEventName).toBe('Líquido da Folha a Pagar');
  });

  it('linha sem tipo é folha mensal; tipo desconhecido é erro, não folha mensal', () => {
    expect(resolvePayrollType(undefined)).toBe(DEFAULT_PAYROLL_TYPE);
    expect(resolvePayrollType('')).toBe('MENSAL');
    expect(resolvePayrollType('RESCISAO')).toBe('RESCISAO');
    expect(() => resolvePayrollType('13_SALARIO')).toThrow(/Tipo de folha desconhecido/);
  });

  it('preserva o sinal de qualquer líquido — rescisão pode ter líquido negativo', () => {
    const rows = normalizePayrollRows([
      { companyId: 'x', competence: '2026-04', lotacaoCode: 'ADM', eventCode: 'LIQUIDO_RESCISAO', amountCents: -5000 },
      { companyId: 'x', competence: '2026-04', lotacaoCode: 'ADM', eventCode: 'LIQUIDO_FOLHA', amountCents: -100 },
      { companyId: 'x', competence: '2026-04', lotacaoCode: 'ADM', eventCode: '011', amountCents: -300 },
    ]);
    expect(rows.map((r) => r.amountCents)).toEqual([-5000, -100, 300]);
  });
});
