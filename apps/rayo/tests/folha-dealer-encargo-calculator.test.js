import { describe, it, expect } from 'vitest';
import {
  calculateEncargos,
  calculateEncargosFromBases,
  DEFAULT_ENCARGO_RATES,
} from '../src/lib/folha-dealer/encargo-calculator.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import { mapAccount } from '../src/lib/folha-dealer/account-mapper.js';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';

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
  it('gera os 4 encargos patronais (GILRAT 1%) sobre proventos IncideFGTS', () => {
    const rows = calculateEncargos([baseRow()], DEFAULT_ENCARGO_RATES);
    const byCode = Object.fromEntries(rows.map((r) => [r.eventCode, r]));

    expect(Object.keys(byCode).sort()).toEqual([
      'ENCARGO_FGTS_FOLHA',
      'ENCARGO_INSS_PATRONAL',
      'ENCARGO_RAT_FAP',
      'ENCARGO_TERCEIROS',
    ]);

    expect(byCode.ENCARGO_INSS_PATRONAL.amountCents).toBe(20000); // 20%
    expect(byCode.ENCARGO_RAT_FAP.amountCents).toBe(1000); // 1%
    expect(byCode.ENCARGO_TERCEIROS.amountCents).toBe(5800); // 5.8%
    expect(byCode.ENCARGO_FGTS_FOLHA.amountCents).toBe(8000); // 8%
  });

  it('não reduz a BC com descontos IncideFGTS (INSS/VT não saem da base DCTF)', () => {
    const rows = calculateEncargos(
      [
        baseRow({ amountCents: 100000 }),
        baseRow({
          eventCode: '310',
          eventName: 'INSS',
          TipoRegistro: 'DESCONTO',
          IncideFGTS: '1',
          amountCents: 8000,
        }),
      ],
      DEFAULT_ENCARGO_RATES
    );
    const inss = rows.find((r) => r.eventCode === 'ENCARGO_INSS_PATRONAL');
    expect(inss.amountCents).toBe(20000);
  });

  it('prefere informativos 602/605 quando presentes', () => {
    const rows = calculateEncargos(
      [
        baseRow({ amountCents: 50000 }),
        baseRow({
          eventCode: '602',
          TipoRegistro: 'INFORMATIVO',
          IncideFGTS: '0',
          amountCents: 2236212,
        }),
        baseRow({
          eventCode: '605',
          TipoRegistro: 'INFORMATIVO',
          IncideFGTS: '0',
          amountCents: 178892,
        }),
      ],
      DEFAULT_ENCARGO_RATES
    );
    const byCode = Object.fromEntries(rows.map((r) => [r.eventCode, r]));
    expect(byCode.ENCARGO_INSS_PATRONAL.amountCents).toBe(447242); // 20% de 22362,12
    expect(byCode.ENCARGO_RAT_FAP.amountCents).toBe(22362); // 1%
    expect(byCode.ENCARGO_FGTS_FOLHA.amountCents).toBe(178892); // valor 605 direto
  });

  it('calculateEncargosFromBases bate com RH AGENDAMENTOS abr/2026', () => {
    // Bases eSocial por empregado (lotação 011) — conferido no Fortes
    const bases = [
      { employeeId: '000538', lotacaoName: 'AGENDAMENTOS', bcCpCents: 248600, fgtsDepoCents: 19888 },
      { employeeId: '000547', lotacaoName: 'AGENDAMENTOS', bcCpCents: 261400, fgtsDepoCents: 20912 },
      { employeeId: '000499', lotacaoName: 'AGENDAMENTOS', bcCpCents: 248162, fgtsDepoCents: 19852 },
      { employeeId: '000427', lotacaoName: 'AGENDAMENTOS', bcCpCents: 233315, fgtsDepoCents: 18665 },
      { employeeId: '000583', lotacaoName: 'AGENDAMENTOS', bcCpCents: 233200, fgtsDepoCents: 18656 },
      { employeeId: '000471', lotacaoName: 'AGENDAMENTOS', bcCpCents: 210367, fgtsDepoCents: 16829 },
      { employeeId: '000473', lotacaoName: 'AGENDAMENTOS', bcCpCents: 171523, fgtsDepoCents: 13721 },
      { employeeId: '000095', lotacaoName: 'AGENDAMENTOS', bcCpCents: 192748, fgtsDepoCents: 15419 },
      { employeeId: '000584', lotacaoName: 'AGENDAMENTOS', bcCpCents: 201137, fgtsDepoCents: 16090 },
      { employeeId: '000235', lotacaoName: 'AGENDAMENTOS', bcCpCents: 235760, fgtsDepoCents: 18860 },
    ].map((r) => ({
      ...r,
      companyId: '9274',
      competence: '202604',
      lotacaoCode: 'AGENDAMENTOS',
    }));

    const rows = calculateEncargosFromBases(bases, bragaVeiculosConfig.encargoRates);
    const sum = (code) =>
      rows.filter((r) => r.eventCode === code).reduce((a, r) => a + r.amountCents, 0);

    expect(sum('ENCARGO_INSS_PATRONAL')).toBe(447242);
    expect(sum('ENCARGO_RAT_FAP')).toBe(22362);
    expect(sum('ENCARGO_TERCEIROS')).toBe(129699);
    expect(sum('ENCARGO_FGTS_FOLHA')).toBe(178892);
    expect(rows.every((r) => r.sourceOrigin === 'fortes-encargo')).toBe(true);
  });

  it('adapter usa bases eSocial e não gera sintético paralelo', () => {
    const result = normalizeFortesQueryRows(
      [baseRow({ lotacaoCode: 'AGENDAMENTOS', amountCents: 100 })],
      {
        fortesEncargoBases: [
          {
            companyId: '9274',
            competence: '202604',
            employeeId: '000538',
            lotacaoName: 'AGENDAMENTOS',
            bcCpCents: 248600,
            fgtsDepoCents: 19888,
          },
        ],
      },
      null,
      bragaVeiculosConfig.encargoRates
    );
    const encargos = result.filter((r) => String(r.eventCode).startsWith('ENCARGO_'));
    expect(encargos.every((r) => r.sourceOrigin === 'fortes-encargo')).toBe(true);
    expect(encargos.some((r) => r.sourceOrigin === 'encargo-derived')).toBe(false);
    expect(encargos.find((r) => r.eventCode === 'ENCARGO_RAT_FAP').amountCents).toBe(2486);
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

  it('config Braga usa GILRAT 1%', () => {
    expect(bragaVeiculosConfig.encargoRates.gilrat).toBe(1);
    expect(DEFAULT_ENCARGO_RATES.gilrat).toBe(1);
  });

  it('GILRAT por estabelecimento vem do eSocial (gilratPct) e prevalece sobre o config', () => {
    const rows = calculateEncargosFromBases(
      [
        { employeeId: '1', lotacaoName: 'MATRIZ', estCode: '0001', gilratPct: 1, bcCpCents: 100000 },
        { employeeId: '2', lotacaoName: 'FILIAL', estCode: '0002', gilratPct: 2, bcCpCents: 100000 },
        { employeeId: '3', lotacaoName: 'SEM EST', bcCpCents: 100000 },
      ],
      { ...DEFAULT_ENCARGO_RATES, gilrat: 1 }
    );
    const rat = (emp) => rows.find((r) => r.eventCode === 'ENCARGO_RAT_FAP' && r.employeeId === emp);
    expect(rat('1').amountCents).toBe(1000);
    expect(rat('2').amountCents).toBe(2000);
    expect(rat('3').amountCents).toBe(1000); // fallback do config
    expect(rat('2').sourceReference).toContain('EST: 0002');
  });

  it('gilratPct vazio/nulo não zera o GILRAT', () => {
    const rows = calculateEncargosFromBases(
      [{ employeeId: '1', lotacaoName: 'X', gilratPct: '', bcCpCents: 100000 }],
      DEFAULT_ENCARGO_RATES
    );
    expect(rows.find((r) => r.eventCode === 'ENCARGO_RAT_FAP').amountCents).toBe(1000);
  });

  it('mesmo empregado em dois estabelecimentos gera linhas separadas', () => {
    const rows = calculateEncargosFromBases([
      { employeeId: '1', lotacaoName: 'X', estCode: '0001', gilratPct: 1, fgtsDepoCents: 500 },
      { employeeId: '1', lotacaoName: 'X', estCode: '0002', gilratPct: 2, fgtsDepoCents: 700 },
    ]);
    const fgts = rows.filter((r) => r.eventCode === 'ENCARGO_FGTS_FOLHA');
    expect(fgts.map((r) => r.amountCents)).toEqual([500, 700]);
    expect(new Set(fgts.map((r) => r.sourceLineId)).size).toBe(2);
  });

  it('provisionRates.inssPatronal da Braga = soma dos encargos patronais', () => {
    const { encargoRates, provisionRates } = bragaVeiculosConfig;
    expect(provisionRates.inssPatronal).toBeCloseTo(
      encargoRates.inssEmpresa + encargoRates.gilrat + encargoRates.terceiros, 10
    );
  });
});
