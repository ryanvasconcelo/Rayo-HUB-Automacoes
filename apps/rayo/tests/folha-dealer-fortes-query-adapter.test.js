import { describe, it, expect } from 'vitest';
import {
  normalizeFortesQueryRows,
  mapFortesProvDesc,
  mapFortesRecordType,
  buildFortesSourceLineId,
} from '../src/lib/folha-dealer/fortes-query-adapter.js';

describe('Fortes Query Adapter', () => {
  it('1. normaliza uma linha crua Fortes para PayrollSourceRow', () => {
    const raw = [{
      companyId: 2025,
      companyName: 'BRAGA',
      competence: '2026-04',
      lotacaoCode: '10',
      eventCode: '100',
      amountCents: 150000,
      ProvDesc: 1
    }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0]).toEqual(expect.objectContaining({
      sourceSystem: 'fortes',
      sourceAdapter: 'fortes-query',
      sourceOrigin: 'folha-mensal',
      companyId: '2025',
      companyName: 'BRAGA',
      competence: '2026-04',
      lotacaoCode: '10',
      eventCode: '100',
      amountCents: 150000,
      sourceEventNature: 'PROVENTO',
    }));
  });

  it('2. converte competência 202604 para 2026-04', () => {
    const raw = [{ lotacaoCode: '1', eventCode: '1', competence: '202604' }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].competence).toBe('2026-04');
    
    const rawNum = [{ lotacaoCode: '1', eventCode: '1', competence: 202604 }];
    const resultNum = normalizeFortesQueryRows(rawNum);
    expect(resultNum[0].competence).toBe('2026-04');
  });

  it('3. mantém competência 2026-04 quando já vier normalizada', () => {
    const raw = [{ lotacaoCode: '1', eventCode: '1', competence: '2026-04' }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].competence).toBe('2026-04');
  });

  it('4. ProvDesc = 1 vira PROVENTO', () => {
    expect(mapFortesProvDesc(1)).toBe('PROVENTO');
  });

  it('5. ProvDesc = 2 vira DESCONTO', () => {
    expect(mapFortesProvDesc(2)).toBe('DESCONTO');
  });

  it('6. ProvDesc = -1 vira DESCONTO', () => {
    expect(mapFortesProvDesc(-1)).toBe('DESCONTO');
  });

  it('7. ProvDesc = 0 vira INFORMATIVO', () => {
    expect(mapFortesProvDesc(0)).toBe('INFORMATIVO');
  });

  it('8. valor em centavos sempre positivo', () => {
    const raw = [{ lotacaoCode: '1', eventCode: '1', amountCents: -5000 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].amountCents).toBe(5000);
  });

  it('9. preserva lotacaoCode e lotacaoName', () => {
    const raw = [{ lotacaoCode: '005', lotacaoName: 'VENDAS', eventCode: '1' }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('005');
    expect(result[0].lotacaoName).toBe('VENDAS');
  });

  it('10. preserva zeros/códigos como string', () => {
    const raw = [{ lotacaoCode: '010', eventCode: '005', companyId: '020' }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('010');
    expect(result[0].eventCode).toBe('005');
    expect(result[0].companyId).toBe('020');
  });

  it('11. gera sourceLineId', () => {
    const raw = [{ lotacaoCode: '1', eventCode: '2', companyId: 2025, competence: '2026-04', employeeId: 123 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].sourceLineId).toBeDefined();
    expect(typeof result[0].sourceLineId).toBe('string');
  });

  it('12. aceita lotacao vazia quando não houver mapeamento de empregado', () => {
    const raw = [{ eventCode: '1', amountCents: 100 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('');
    expect(result[0].eventCode).toBe('1');
  });

  it('13. ignora linhas sem eventCode', () => {
    const raw = [{ lotacaoCode: '1', amountCents: 100 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result.filter((r) => r.sourceOrigin === 'folha-mensal')).toHaveLength(0);
  });

  it('14. sintetiza a linha LIQUIDO_FOLHA por lotação quando há proventos e descontos', () => {
    const raw = [
      { lotacaoCode: '001', eventCode: '100', amountCents: 500000, ProvDesc: 1 }, // Provento
      { lotacaoCode: '001', eventCode: '200', amountCents: 100000, ProvDesc: 2 }, // Desconto
      { lotacaoCode: '002', eventCode: '100', amountCents: 300000, ProvDesc: 1 }, // Provento
      { lotacaoCode: '002', eventCode: '200', amountCents: 300000, ProvDesc: 2 }, // Desconto -> Zero, não deve gerar líquido
    ];
    
    const result = normalizeFortesQueryRows(raw);
    
    // As 4 linhas originais + 1 linha sintetizada para a lotação 001
    expect(result.length).toBe(5);
    
    const derived = result.find(r => r.eventCode === 'LIQUIDO_FOLHA');
    expect(derived).toBeDefined();
    expect(derived.eventName).toBe('Líquido da Folha a Pagar');
    expect(derived.lotacaoCode).toBe('001');
    expect(derived.amountCents).toBe(400000); // 500k - 100k
    expect(derived.sourceOrigin).toBe('fortes-query-derived');
    expect(derived.sourceRecordType).toBe('DESCONTO'); // Para ser consistente com algo que é a pagar (embora o D/C venha da config)
  });

  it('15. usa provisões Fortes (PRD/PRF) e não sintetiza taxa×BC-FGTS', () => {
    const raw = [
      {
        companyId: '9274',
        competence: '202604',
        lotacaoCode: 'DEPT. VENDAS VEICULOS',
        lotacaoName: 'DEPT. VENDAS VEICULOS',
        eventCode: '011',
        amountCents: 10000000,
        ProvDesc: 1,
        TipoRegistro: 'PROVENTO',
        IncideFGTS: '1',
        employeeId: '000015',
      },
    ];
    const fortesProvisions = [
      {
        companyId: '9274',
        competence: '202604',
        lotacaoCode: 'DEPT. VENDAS VEICULOS',
        lotacaoName: 'DEPT. VENDAS VEICULOS',
        employeeId: '000015',
        eventCode: 'PROV_13',
        eventName: 'Provisão 13º Salário (Fortes)',
        amountCents: 207638,
        sourceOrigin: 'fortes-provision',
        TipoRegistro: 'PROVISAO',
      },
      {
        companyId: '9274',
        competence: '202604',
        lotacaoCode: 'DEPT. DE VENDA DIRETA MATRIZ',
        lotacaoName: 'DEPT. DE VENDA DIRETA MATRIZ',
        employeeId: '000001',
        eventCode: 'PROV_13',
        eventName: 'Provisão 13º Salário (Fortes)',
        amountCents: -11867,
        sourceOrigin: 'fortes-provision',
        TipoRegistro: 'PROVISAO',
      },
    ];

    const result = normalizeFortesQueryRows(
      raw,
      { fortesProvisions },
      { feriasTerco: 11.11, decimoTerceiro: 8.33, inssPatronal: 28.8, fgts: 8 },
      null
    );

    const provRows = result.filter((r) => r.eventCode === 'PROV_13');
    expect(provRows).toHaveLength(2);
    expect(provRows.every((r) => r.sourceOrigin === 'fortes-provision')).toBe(true);
    expect(provRows.find((r) => r.lotacaoCode === 'DEPT. VENDAS VEICULOS').amountCents).toBe(207638);
    expect(provRows.find((r) => r.lotacaoCode === 'DEPT. DE VENDA DIRETA MATRIZ').amountCents).toBe(-11867);

    // Sem linhas sintéticas provision-derived
    expect(result.some((r) => r.sourceOrigin === 'provision-derived')).toBe(false);
  });

  it('16. total PROV_13 por lotação bate com RH Provisionar abr/2026 (17.935,11)', () => {
    // Totais por lotação do relatório Fortes RH (coluna Provisionar) — competência PRV.AnoMes=202604
    const rhByLot = {
      'RECURSOS HUMANOS': 99199,
      FINANCEIRO: 205169,
      FISCAL: 158786,
      DIRETORIA: 46836,
      TI: 28619,
      'DEPARTAMENTO DE PEÇAS': 202902,
      'DEPT. DE ACESSORIOS': 27500,
      'DEPT. SERVIÇOS MECANICA MATRIZ': 119500,
      'DEPT. FUNILARIA / PINTURA': 0,
      'DEPT. PRODUTIVOS': 123750,
      AGENDAMENTOS: 111471,
      'DEPT. MECANICA FILIAL': 55000,
      'DEPT. PEÇAS FILIAL': 6754,
      'DEPTO. ACESSORIOS FILIAL': 13750,
      'DEPT. VENDAS VEICULOS': 207638,
      'DEPT. DE VENDA DIRETA MATRIZ': -11867,
      'DEPT. DE LEADS MATRIZ': 55000,
      'DEPT. DE FINANCIAMENTO MATRIZ': 48416,
      'BRAGA VEICULOS FILIAL NOVOS': 78747,
      'DEPT. FINANCIAMENTO FILIAL': 33722,
      'DEPTO VENDA DIRETA FILIAL': 34570,
      'BRAGA MULTIMARCAS': 134299,
      'DEPT. DE LEADS FILIAL': 13750,
    };

    const fortesProvisions = Object.entries(rhByLot)
      .filter(([, cents]) => cents !== 0)
      .map(([lot, cents]) => ({
        companyId: '9274',
        competence: '202604',
        lotacaoCode: lot,
        lotacaoName: lot,
        eventCode: 'PROV_13',
        amountCents: cents,
        sourceOrigin: 'fortes-provision',
        TipoRegistro: 'PROVISAO',
      }));

    const result = normalizeFortesQueryRows(
      [{ lotacaoCode: 'FINANCEIRO', eventCode: '011', amountCents: 100, ProvDesc: 1 }],
      { fortesProvisions },
      null,
      { inssPatronal: 0.2, ratFap: 0.02, terceiros: 0.058, fgts: 0.08 }
    );

    const byLot = {};
    for (const row of result.filter((r) => r.eventCode === 'PROV_13')) {
      byLot[row.lotacaoCode] = (byLot[row.lotacaoCode] || 0) + row.amountCents;
    }

    let total = 0;
    for (const [lot, cents] of Object.entries(rhByLot)) {
      if (cents === 0) continue;
      expect(byLot[lot]).toBe(cents);
      total += cents;
    }
    expect(total).toBe(1793511);
    expect(result.some((r) => r.sourceOrigin === 'provision-derived')).toBe(false);
  });

  it('17. lotação do Fortes prevalece sobre o mapa estático por empregado', () => {
    // 000046 está no mapa estático como RECURSOS HUMANOS
    const raw = [{
      employeeId: '000046', lotacaoCode: 'FINANCEIRO', lotacaoName: 'FINANCEIRO',
      eventCode: '011', amountCents: 1000, ProvDesc: 1,
    }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('FINANCEIRO');
    expect(result.find((r) => r.eventCode === 'LIQUIDO_FOLHA').lotacaoCode).toBe('FINANCEIRO');
  });

  it('18. mapa estático só preenche lotação vazia', () => {
    const raw = [{ employeeId: '000046', lotacaoCode: '', eventCode: '011', amountCents: 1000, ProvDesc: 1 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('RECURSOS HUMANOS');
  });

  it('19. líquido negativo por lotação é emitido com sinal (não some)', () => {
    const raw = [
      { lotacaoCode: 'TI', eventCode: '011', amountCents: 1000, ProvDesc: 1 },
      { lotacaoCode: 'TI', eventCode: '310', amountCents: 3000, ProvDesc: 2 },
    ];
    const liquido = normalizeFortesQueryRows(raw).find((r) => r.eventCode === 'LIQUIDO_FOLHA');
    expect(liquido.amountCents).toBe(-2000);
  });

  it('20. provisions vazio do Fortes cai no fallback sintético', () => {
    const raw = [{
      companyId: '9274', competence: '202607', employeeId: '1',
      lotacaoCode: 'TI', lotacaoName: 'TI', eventCode: '011', amountCents: 100000,
      ProvDesc: 1, TipoRegistro: 'PROVENTO', IncideFGTS: '1',
    }];
    const result = normalizeFortesQueryRows(
      raw,
      { fortesProvisions: [], fortesEncargoBases: [] },
      { feriasTerco: 11.11, decimoTerceiro: 8.33, inssPatronal: 26.8, fgts: 8 },
      null
    );
    const prov = result.filter((r) => r.sourceOrigin === 'provision-derived');
    expect(prov.map((r) => r.eventCode).sort()).toEqual([
      'PROV_13', 'PROV_FERIAS', 'PROV_FGTS_13', 'PROV_FGTS_FER', 'PROV_INSS_13', 'PROV_INSS_FER',
    ]);
    expect(prov.find((r) => r.eventCode === 'PROV_13').lotacaoCode).toBe('TI');
  });

  it('21. fallback de provisão usa só proventos (descontos não reduzem a base)', () => {
    const common = { companyId: '1', competence: '2026-07', employeeId: '1', lotacaoCode: 'TI', IncideFGTS: '1' };
    const raw = [
      { ...common, eventCode: '011', amountCents: 100000, ProvDesc: 1, TipoRegistro: 'PROVENTO' },
      { ...common, eventCode: '310', amountCents: 10000, ProvDesc: 2, TipoRegistro: 'DESCONTO' },
    ];
    const result = normalizeFortesQueryRows(
      raw, {}, { feriasTerco: 11.11, decimoTerceiro: 8.33, inssPatronal: 26.8, fgts: 8 }, null
    );
    expect(result.find((r) => r.eventCode === 'PROV_13').amountCents).toBe(8330);
    // INSS s/ 13º = 8.330 × 26,8%
    expect(result.find((r) => r.eventCode === 'PROV_INSS_13').amountCents).toBe(2232);
  });
});
