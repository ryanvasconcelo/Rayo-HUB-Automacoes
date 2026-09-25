import { describe, expect, it } from 'vitest';
import { buildFortesExtractResponse } from '../vite-plugin-fortes-api.js';

describe('Fortes API do Vite', () => {
  it('preserva bases eSocial e pendências de mapeamento na resposta de extração', () => {
    const response = buildFortesExtractResponse({
      payroll: [{ eventCode: '011' }],
      provisions: [{ eventCode: 'PROV_13' }],
      encargoBases: [{ esMat: '001', bcCpCents: 1000 }],
      encargoUnmapped: [{ esMat: '001', mappingStatus: 'unmapped' }],
      encargoCoverage: { bcCpCents: { expected: 1000, extracted: 1000, missing: 0 } },
    });

    expect(response).toEqual(expect.objectContaining({
      success: true,
      data: [{ eventCode: '011' }],
      provisions: [{ eventCode: 'PROV_13' }],
      encargoBases: [{ esMat: '001', bcCpCents: 1000 }],
      encargoUnmapped: [{ esMat: '001', mappingStatus: 'unmapped' }],
      encargoCoverage: { bcCpCents: { expected: 1000, extracted: 1000, missing: 0 } },
    }));
  });

  it('repassa férias, rescisão e complementar na resposta', () => {
    const response = buildFortesExtractResponse({
      payroll: [],
      extraPayroll: [{ payrollType: 'RESCISAO', eventCode: '200' }],
    });
    expect(response.extraPayroll).toEqual([{ payrollType: 'RESCISAO', eventCode: '200' }]);
  });

  it('sem férias/rescisão/complementar, responde lista vazia', () => {
    expect(buildFortesExtractResponse({ payroll: [] }).extraPayroll).toEqual([]);
  });
});
