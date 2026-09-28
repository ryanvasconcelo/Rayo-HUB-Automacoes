import { describe, expect, it } from 'vitest';
import { motoReyConfig } from '../src/lib/folha-dealer/moto-rey.config.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import { bragaMotosConfig } from '../src/lib/folha-dealer/braga-motos.config.js';
import { EVENT_100_REQUIRED_ACCOUNT } from '../src/lib/folha-dealer/contracts.js';
import { readFileSync } from 'node:fs';
import {
  FOLHA_DEALER_COMPANIES,
  getCompanyConfig,
  getCompanyConfigByFortesCode,
} from '../src/lib/folha-dealer/company-configs.js';

// Eventos com valor na Moto Rey em 2026 (Folhas 2, 4, 10, 11, 17), levantamento
// de 28/09/2026. P = provento (debita), D = desconto (credita).
const OBSERVADOS = {
  P: ['010', '011', '030', '049', '075', '090', '100', '110', '111', '199', '200', '201', '202', '205', '206',
    '208', '209', '212', '216', '953', '955', '957', '964', '965', '976', '977', '978', '979'],
  D: ['024', '127', '300', '301', '310', '311', '320', '321', '327', '349', '390', '500', '502', '504', '947',
    '954', '959', '960', '969', '970', '971', '974', '975'],
};
const INFORMATIVOS = ['600', '601', '602', '603', '604', '605', '610', '613', '902', '904'];

const dcs = (code) => motoReyConfig.accountMappings.filter((m) => m.eventCode === code).map((m) => m.dc).sort();
const conta = (code, dc) =>
  motoReyConfig.accountMappings.find((m) => m.eventCode === code && m.dc === dc)?.dealerAccountCode;

describe('motoReyConfig — empresa', () => {
  it('usa código, CNPJ e empresa/filial Dealer da Moto Rey', () => {
    expect(motoReyConfig.company).toMatchObject({
      companyId: 'moto-rey',
      companyName: 'BRAGA MOTO REY LTDA',
      cnpj: '49.384.500/0001-63',
      fortesCompanyCode: '9275',
      dealerCompanyField: '06',
      dealerBranch: '006',
    });
  });

  it('não usa empresa/filial Dealer de outra empresa do grupo', () => {
    for (const outra of [bragaVeiculosConfig, bragaMotosConfig]) {
      expect(motoReyConfig.company.dealerCompanyField).not.toBe(outra.company.dealerCompanyField);
    }
  });

  it('aplica o GILRAT do estabelecimento 0001 (RAT 3% × FAP 1,00)', () => {
    expect(motoReyConfig.encargoRates.gilrat).toBe(3);
    expect(motoReyConfig.provisionRates.inssPatronal).toBeCloseTo(28.8, 5);
  });
});

describe('motoReyConfig — centros', () => {
  it('aponta só para centros do catálogo Dealer da Moto Rey', () => {
    const known = new Set(motoReyConfig.dealerCenters.map((c) => c.code));
    const unknown = motoReyConfig.centerMappings.map((m) => m.dealerCenterCode).filter((c) => !known.has(c));
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('resolve toda lotação da 9275 pelo nome, pelo código e a lotação vazia', () => {
    const lotacoes = new Set(motoReyConfig.centerMappings.map((m) => m.lotacaoCode));
    for (const l of [
      'DPT POS VENDAS MECANICA ROYAL ENFIELD', 'DPTO DE VENDAS', 'DEPARTAMENTO CRM', 'BRAGA MOTO REY DEPTO MECANICA',
      'DPT POS VENDAS PEÇAS', 'DEPARTAMENTO PRACA 14', 'GERAL',
      '001', '002', '003', '004', '005', '006', '999', '',
    ]) {
      expect(lotacoes).toContain(l);
    }
  });

  it('não repete lotação com destinos diferentes', () => {
    const byLotacao = new Map();
    for (const m of motoReyConfig.centerMappings) {
      const previous = byLotacao.get(m.lotacaoCode);
      if (previous) expect(previous).toBe(m.dealerCenterCode);
      byLotacao.set(m.lotacaoCode, m.dealerCenterCode);
    }
  });
});

describe('motoReyConfig — contas', () => {
  it('todo provento observado debita e todo desconto observado credita', () => {
    const errados = [
      ...OBSERVADOS.P.filter((c) => dcs(c).join() !== 'D').map((c) => `${c}:${dcs(c)}`),
      ...OBSERVADOS.D.filter((c) => dcs(c).join() !== 'C').map((c) => `${c}:${dcs(c)}`),
    ];
    expect(errados).toEqual([]);
  });

  it('segue a natureza da própria tabela EVE da 9275, não a da BV/BM', () => {
    // Na BV/BM estes códigos são consignado, Ifood, VT etc. (natureza oposta ou outra conta).
    const naturezaMotoRey = {
      '953': ['D', '6.1.1.01.005'], '955': ['D', '6.1.1.01.006'], '957': ['D', '6.1.1.01.005'],
      '964': ['D', '6.1.1.01.005'], '965': ['D', '6.1.1.01.005'], '976': ['D', '6.1.1.01.003'],
      '977': ['D', '6.1.1.01.003'], '978': ['D', '6.1.1.01.003'], '979': ['D', '6.1.1.01.005'],
      '954': ['C', '6.1.1.01.006'], '971': ['C', '6.1.1.04.003'], '975': ['C', '6.1.1.01.002'],
    };
    for (const [code, [dc, account]] of Object.entries(naturezaMotoRey)) {
      expect([code, dcs(code), conta(code, dc)]).toEqual([code, [dc], account]);
    }
  });

  it('aplica as decisões do contador do grupo (férias, 13º, aviso, 100/301, multa)', () => {
    for (const c of ['110', '111', '205', '206', '212']) expect(conta(c, 'D')).toBe('6.1.1.03.001');
    for (const c of ['208', '209']) expect(conta(c, 'D')).toBe('6.1.1.03.002');
    for (const c of ['200', '201']) expect(conta(c, 'D')).toBe('6.1.1.01.004');
    expect(conta('100', 'D')).toBe(EVENT_100_REQUIRED_ACCOUNT);
    expect(conta('301', 'C')).toBe('2.1.1.02.007');
    expect(dcs('900')).toEqual(['C', 'D']);
    expect(conta('900', 'D')).toBe('6.1.1.02.002');
    expect(conta('900', 'C')).toBe('2.1.1.02.002');
  });

  it('informativos não geram lançamento; multa FGTS (900) não é informativa', () => {
    for (const c of INFORMATIVOS) expect(motoReyConfig.informativeEventCodes).toContain(c);
    expect(motoReyConfig.informativeEventCodes).not.toContain('900');
  });

  it('herda da BV só os eventos sintéticos (líquidos, provisões, baixas, encargos)', () => {
    const codes = new Set(motoReyConfig.accountMappings.map((m) => m.eventCode));
    for (const c of ['LIQUIDO_FOLHA', 'LIQUIDO_FERIAS', 'LIQUIDO_RESCISAO', 'LIQUIDO_COMPLEMENTAR',
      'PROV_FERIAS', 'PROV_BAIXA_FERIAS', 'ENCARGO_INSS_PATRONAL', 'ENCARGO_FGTS_FOLHA']) {
      expect(codes).toContain(c);
    }
  });

  it('não repete o par evento + D/C e marca tudo com o companyId da Moto Rey', () => {
    const keys = motoReyConfig.accountMappings.map((m) => `${m.eventCode}:${m.dc}`);
    expect(keys.length).toBe(new Set(keys).size);
    for (const m of motoReyConfig.accountMappings) expect(m.companyId).toBe('moto-rey');
  });
});

describe('Moto Rey no sistema', () => {
  it('registro resolve por companyId e por código Fortes', () => {
    expect(getCompanyConfig('moto-rey')).toBe(motoReyConfig);
    expect(getCompanyConfigByFortesCode('9275')).toBe(motoReyConfig);
  });

  it('aparece no seletor da tela com empresa/filial Dealer 06/006', () => {
    expect(FOLHA_DEALER_COMPANIES.find((c) => c.companyId === 'moto-rey')).toEqual({
      companyId: 'moto-rey',
      companyName: 'BRAGA MOTO REY LTDA',
      fortesCompanyCode: '9275',
      dealerCompanyField: '06',
      dealerBranch: '006',
    });
  });

  it('seed do servidor reflete o catálogo de centros e o de-para do config', () => {
    const seed = JSON.parse(
      readFileSync(new URL('../../rayo-server/folha-dealer-centers-seed-moto-rey.json', import.meta.url), 'utf8')
    );
    expect(seed.companyId).toBe('moto-rey');
    expect(seed.centers).toEqual(motoReyConfig.dealerCenters);
    expect(seed.lotacaoMappings).toHaveLength(motoReyConfig.centerMappings.length);
  });
});
