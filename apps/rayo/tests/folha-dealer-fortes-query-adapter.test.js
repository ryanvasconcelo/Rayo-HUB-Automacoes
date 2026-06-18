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

  it('12. bloqueia ou reporta erro quando faltar lotacaoCode', () => {
    const raw = [{ eventCode: '1' }];
    expect(() => normalizeFortesQueryRows(raw)).toThrow(/Lotação ausente/);
  });

  it('13. bloqueia ou reporta erro quando faltar eventCode', () => {
    const raw = [{ lotacaoCode: '1' }];
    expect(() => normalizeFortesQueryRows(raw)).toThrow(/Evento ausente/);
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
});
