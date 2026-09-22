import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { bragaMotosConfig } from '../src/lib/folha-dealer/braga-motos.config.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import {
  FOLHA_DEALER_COMPANIES,
  getCompanyConfig,
  getCompanyConfigByFortesCode,
} from '../src/lib/folha-dealer/company-configs.js';
import { EVENT_100_REQUIRED_ACCOUNT } from '../src/lib/folha-dealer/contracts.js';

const seed = JSON.parse(
  readFileSync(
    new URL('../../rayo-server/folha-dealer-centers-seed-braga-motos.json', import.meta.url),
    'utf8'
  )
);

describe('bragaMotosConfig — empresa', () => {
  it('usa o código e o CNPJ da Braga Motos no Fortes (empresa 9277)', () => {
    expect(bragaMotosConfig.company).toMatchObject({
      companyId: 'braga-motos',
      fortesCompanyCode: '9277',
      cnpj: '05.216.530/0001-95',
    });
  });

  it('aplica o GILRAT do estabelecimento 0001 (RAT 3% × FAP 0,50)', () => {
    expect(bragaMotosConfig.encargoRates.gilrat).toBe(1.5);
    expect(bragaMotosConfig.provisionRates.inssPatronal).toBeCloseTo(27.3, 5);
  });

  it('usa empresa/filial Dealer próprias (07/165), não as da Braga Veículos', () => {
    // 01/001 é a Braga Veículos. Um lote da Braga Motos com esses códigos é
    // lançado na empresa errada dentro do Dealer.
    expect(bragaMotosConfig.company.dealerCompanyField).toBe('07');
    expect(bragaMotosConfig.company.dealerBranch).toBe('007');
    expect(bragaMotosConfig.company.dealerCompanyField).not.toBe(bragaVeiculosConfig.company.dealerCompanyField);
    expect(bragaMotosConfig.company.dealerBranch).not.toBe(bragaVeiculosConfig.company.dealerBranch);
  });
});

describe('bragaMotosConfig — de-para de centros', () => {
  it('aponta só para centros existentes no cadastro Dealer da Braga Motos', () => {
    const known = new Set(bragaMotosConfig.dealerCenters.map((c) => c.code));
    const unknown = bragaMotosConfig.centerMappings
      .map((m) => m.dealerCenterCode)
      .filter((code) => !known.has(code));
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('não repete lotação com destinos diferentes', () => {
    const byLotacao = new Map();
    for (const m of bragaMotosConfig.centerMappings) {
      const previous = byLotacao.get(m.lotacaoCode);
      if (previous) expect(previous).toBe(m.dealerCenterCode);
      byLotacao.set(m.lotacaoCode, m.dealerCenterCode);
    }
  });
});

describe('bragaMotosConfig — de-para de contas', () => {
  it('não herda eventos numéricos da Braga Veículos (os códigos têm outro significado)', () => {
    // 093 é "Desc. Assist. Médica Amil" (C) na Braga Veículos e
    // "Comissão Liberacred" (D) na Braga Motos — herdar inverteria o lançamento.
    const numeric = (mappings) =>
      new Set(mappings.filter((m) => /^\d+$/.test(m.eventCode)).map((m) => `${m.eventCode}:${m.dc}`));

    const motos = numeric(bragaMotosConfig.accountMappings);
    const veiculos = numeric(bragaVeiculosConfig.accountMappings);

    expect(motos.has('093:C')).toBe(false);
    expect(motos.has('093:D')).toBe(true);
    // Sobreposição legítima existe (310 INSS, 311 IRRF…), mas não pode ser total.
    const inherited = [...veiculos].filter((k) => motos.has(k));
    expect(inherited.length).toBeLessThan(veiculos.size / 2);
  });

  it('reaproveita os eventos sintéticos do motor', () => {
    const synthetic = bragaMotosConfig.accountMappings.filter((m) => !/^\d+$/.test(m.eventCode));
    const codes = new Set(synthetic.map((m) => m.eventCode));
    expect(codes).toContain('LIQUIDO_FOLHA');
    expect(codes).toContain('PROV_FERIAS');
    expect(codes).toContain('ENCARGO_INSS_PATRONAL');
  });

  it('usa a conta obrigatória do evento 100', () => {
    const event100 = bragaMotosConfig.accountMappings.filter((m) => m.eventCode === '100');
    expect(event100.length).toBeGreaterThan(0);
    for (const m of event100) {
      expect(m.dealerAccountCode).toBe(EVENT_100_REQUIRED_ACCOUNT);
    }
  });

  it('não repete o par evento + D/C', () => {
    const keys = bragaMotosConfig.accountMappings.map((m) => `${m.eventCode}:${m.dc}`);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('marca todo mapeamento com o companyId da Braga Motos', () => {
    for (const m of bragaMotosConfig.accountMappings) {
      expect(m.companyId).toBe('braga-motos');
    }
  });
});

describe('seed do servidor', () => {
  it('reflete o de-para e o catálogo de centros do config', () => {
    expect(seed.companyId).toBe('braga-motos');
    expect(seed.centers).toHaveLength(bragaMotosConfig.dealerCenters.length);
    expect(seed.lotacaoMappings).toHaveLength(bragaMotosConfig.centerMappings.length);
  });
});

describe('registro de empresas', () => {
  it('resolve por companyId e por código Fortes', () => {
    expect(getCompanyConfig('braga-motos')).toBe(bragaMotosConfig);
    expect(getCompanyConfigByFortesCode('9277')).toBe(bragaMotosConfig);
    expect(getCompanyConfigByFortesCode('9274')).toBe(bragaVeiculosConfig);
  });

  it('recusa empresa sem configuração em vez de cair na Braga Veículos', () => {
    expect(() => getCompanyConfig('braga-motors')).toThrow(/não possui configuração/);
    expect(() => getCompanyConfigByFortesCode('9276')).toThrow(/não possui configuração/);
  });

  it('expõe as duas empresas para o seletor da tela', () => {
    expect(FOLHA_DEALER_COMPANIES.map((c) => c.companyId)).toEqual([
      'braga-veiculos',
      'braga-motos',
    ]);
  });
});
