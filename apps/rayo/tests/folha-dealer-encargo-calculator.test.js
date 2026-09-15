import { describe, it, expect } from 'vitest';
import { calculateEncargos, DEFAULT_ENCARGO_RATES } from '../src/lib/folha-dealer/encargo-calculator.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import { mapAccount } from '../src/lib/folha-dealer/account-mapper.js';

function baseRow(overrides = {}) {
  return {
    companyId: '1',
    competence: '2026-06',
    employeeId: '100',
    employeeName: 'Func Teste',
    lotacaoCode: '001',
    lotacaoName: 'TESTE',
    TipoRegistro: 'PROVENTO',
    IncideFGTS: '1',
    amountCents: 100000, // R$ 1.000,00
    eventCode: '011',
    eventName: 'Salário-Base',
    ...overrides,
  };
}

describe('encargo-calculator (DCTFWeb / FGTS)', () => {
  it('gera os 4 encargos patronais sobre BC-FGTS (exceto 1082-01)', () => {
    const rows = calculateEncargos([baseRow()], DEFAULT_ENCARGO_RATES);
    const byCode = Object.fromEntries(rows.map((r) => [r.eventCode, r]));

    expect(Object.keys(byCode).sort()).toEqual([
      'ENCARGO_FGTS_FOLHA',
      'ENCARGO_INSS_PATRONAL',
      'ENCARGO_RAT_FAP',
      'ENCARGO_TERCEIROS',
    ]);

    expect(byCode.ENCARGO_INSS_PATRONAL.amountCents).toBe(20000); // 20%
    expect(byCode.ENCARGO_RAT_FAP.amountCents).toBe(2000); // 2%
    expect(byCode.ENCARGO_TERCEIROS.amountCents).toBe(5800); // 5.8%
    expect(byCode.ENCARGO_FGTS_FOLHA.amountCents).toBe(8000); // 8%
  });

  it('mapeia INSS/GILRAT/Terceiros para 6.1.1.02.001 ↔ 2.1.1.02.001 e FGTS para .002', () => {
    const companyId = bragaVeiculosConfig.company.companyId;
    const mappings = bragaVeiculosConfig.accountMappings;
    for (const code of ['ENCARGO_INSS_PATRONAL', 'ENCARGO_RAT_FAP', 'ENCARGO_TERCEIROS']) {
      const mapped = mapAccount(code, companyId, mappings);
      expect(mapped.map((m) => `${m.dc}:${m.dealerAccountCode}`).sort()).toEqual([
        'C:2.1.1.02.001',
        'D:6.1.1.02.001',
      ]);
    }
    const fgts = mapAccount('ENCARGO_FGTS_FOLHA', companyId, mappings);
    expect(fgts.map((m) => `${m.dc}:${m.dealerAccountCode}`).sort()).toEqual([
      'C:2.1.1.02.002',
      'D:6.1.1.02.002',
    ]);
  });

  it('evento 310 (1082-01) permanece só crédito INSS a Recolher', () => {
    const mapped = mapAccount(
      '310',
      bragaVeiculosConfig.company.companyId,
      bragaVeiculosConfig.accountMappings
    );
    expect(mapped.some((m) => m.dc === 'C' && m.dealerAccountCode === '2.1.1.02.001')).toBe(true);
    expect(mapped.some((m) => m.dc === 'D')).toBe(false);
  });
});
