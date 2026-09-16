import { describe, expect, it } from 'vitest';
import {
  padCenterCode,
  mergeCenterMappings,
  seedPayloadFromCenterMappings,
  normalizeCentersPayload,
} from '../src/lib/folha-dealer/merge-center-config.js';

describe('padCenterCode', () => {
  it('preenche com zeros à esquerda até 6 dígitos', () => {
    expect(padCenterCode('999')).toBe('000999');
    expect(padCenterCode(999)).toBe('000999');
    expect(padCenterCode('000600')).toBe('000600');
  });

  it('retorna string vazia para código inválido', () => {
    expect(padCenterCode('')).toBe('');
    expect(padCenterCode(null)).toBe('');
  });
});

describe('mergeCenterMappings', () => {
  const seed = [
    {
      companyId: 'braga-veiculos',
      lotacaoCode: 'GERAL',
      dealerCenterCode: '000999',
      dealerCenterName: 'Geral',
      allocationMode: 'direct',
      active: true,
    },
    {
      companyId: 'braga-veiculos',
      lotacaoCode: 'ADM',
      dealerCenterCode: '000600',
      dealerCenterName: 'Administração',
      allocationMode: 'direct',
      active: true,
    },
  ];

  it('sem stored retorna o seed', () => {
    const merged = mergeCenterMappings(seed, null);
    expect(merged).toHaveLength(2);
    expect(merged.find((m) => m.lotacaoCode === 'GERAL')?.dealerCenterCode).toBe('000999');
  });

  it('override por lotacaoCode substitui o seed e usa nome do centro', () => {
    const stored = {
      centers: [{ code: '000300', name: 'Mecânica', active: true }],
      lotacaoMappings: [
        {
          lotacaoCode: 'GERAL',
          dealerCenterCode: '300',
          allocationMode: 'activity',
          active: true,
        },
      ],
    };

    const merged = mergeCenterMappings(seed, stored);
    const geral = merged.find((m) => m.lotacaoCode === 'GERAL');
    expect(geral.dealerCenterCode).toBe('000300');
    expect(geral.dealerCenterName).toBe('Mecânica');
    expect(geral.allocationMode).toBe('activity');

    const adm = merged.find((m) => m.lotacaoCode === 'ADM');
    expect(adm.dealerCenterCode).toBe('000600');
  });

  it('adiciona lotação nova que não existe no seed', () => {
    const stored = {
      centers: [{ code: '000999', name: 'Geral', active: true }],
      lotacaoMappings: [
        { lotacaoCode: 'NOVA_LOT', dealerCenterCode: '000999', allocationMode: 'direct', active: true },
      ],
    };
    const merged = mergeCenterMappings(seed, stored);
    expect(merged.find((m) => m.lotacaoCode === 'NOVA_LOT')?.dealerCenterCode).toBe('000999');
  });
});

describe('seedPayloadFromCenterMappings / normalize', () => {
  it('deduplica centros e normaliza pad', () => {
    const payload = seedPayloadFromCenterMappings('braga-veiculos', [
      { lotacaoCode: 'A', dealerCenterCode: '999', dealerCenterName: 'Geral', allocationMode: 'direct', active: true },
      { lotacaoCode: 'B', dealerCenterCode: '000999', dealerCenterName: 'Geral', allocationMode: 'direct', active: true },
    ]);
    expect(payload.centers).toHaveLength(1);
    expect(payload.centers[0].code).toBe('000999');
    expect(payload.lotacaoMappings).toHaveLength(2);
  });

  it('normalizeCentersPayload aplica pad nos códigos', () => {
    const normalized = normalizeCentersPayload({
      centers: [{ code: '999', name: 'Geral', active: true }],
      lotacaoMappings: [{ lotacaoCode: 'X', dealerCenterCode: '999', allocationMode: 'direct', active: true }],
    }, 'braga-veiculos');
    expect(normalized.centers[0].code).toBe('000999');
    expect(normalized.lotacaoMappings[0].dealerCenterCode).toBe('000999');
  });
});
