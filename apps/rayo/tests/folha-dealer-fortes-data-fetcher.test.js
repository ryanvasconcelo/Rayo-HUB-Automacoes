import { describe, it, expect, vi } from 'vitest';
import fs from 'fs/promises';
import { fetchFortesDataMock } from '../src/lib/folha-dealer/fortes-data-fetcher.js';

// Mock do fs.readFile para simular o CSV sem ler o disco real
vi.mock('fs/promises');

describe('Fortes Data Fetcher', () => {
  const mockCsv = `companyId;companyName;competence;sourcePayrollId;employeeId;employeeName;lotacaoCode;lotacaoName;eventCode;eventName;sourceEventNature;sourceReference;amountCents;TipoRegistro;IncideINSS;IncideIRRF;IncideFGTS;sourceOrigin;sourceAdapter;sourceLineId
9274;BRAGA VEÍCULOS;202604;93;000009;ADALBERTO;008;MECANICA;600;Salário;0;0.0;114000;INFORMATIVO;1;1;1;folha-mensal;fortes-query;linha1
9274;BRAGA VEÍCULOS;202604;93;000538;ADRIANA;011;AGENDAMENTOS;011;Salário-Base;1;30.0;165000;PROVENTO;1;1;1;folha-mensal;fortes-query;linha2
9274;BRAGA VEÍCULOS;202604;93;000538;ADRIANA;011;AGENDAMENTOS;310;INSS;-1;9.0;19942;DESCONTO;1;1;1;folha-mensal;fortes-query;linha3`;

  it('1. função monta payload bruto esperado e empresa 9274 aceita', async () => {
    fs.readFile.mockResolvedValue(mockCsv);
    const { rawRows } = await fetchFortesDataMock('9274', '202604');
    
    expect(rawRows).toHaveLength(3);
    expect(rawRows[1].companyId).toBe('9274');
    expect(rawRows[1].competence).toBe('202604');
    expect(rawRows[1].ProvDesc).toBe(1); // PROVENTO = 1
    expect(rawRows[2].ProvDesc).toBe(2); // DESCONTO = 2
  });

  it('2. totais extraídos podem ser reportados (metadados)', async () => {
    fs.readFile.mockResolvedValue(mockCsv);
    const { metadata } = await fetchFortesDataMock('9274', '202604');
    
    expect(metadata.empresa).toBe('9274');
    expect(metadata.competencia).toBe('202604');
    expect(metadata.folhaSeq).toBe('93');
    expect(metadata.quantidadeLinhas).toBe(3);
    expect(metadata.quantidadeFuncionarios).toBe(2); // ADALBERTO e ADRIANA
    expect(metadata.totalProventos).toBe(165000);
    expect(metadata.totalDescontos).toBe(19942);
    expect(metadata.totalLiquido).toBe(165000 - 19942);
    expect(metadata.totalInformativos).toBe(114000);
  });

  it('3. não existe filtro por employeeName', async () => {
    // O mock não tem nenhuma regra excluindo nomes específicos. 
    // Vamos garantir que todos do CSV voltam.
    fs.readFile.mockResolvedValue(mockCsv);
    const { rawRows } = await fetchFortesDataMock('9274', '202604');
    
    const names = rawRows.map(r => r.employeeName);
    expect(names).toContain('ADALBERTO');
    expect(names).toContain('ADRIANA');
  });
  
  it('4. retorna vazio se empresa/competência não baterem', async () => {
    fs.readFile.mockResolvedValue(mockCsv);
    const { rawRows } = await fetchFortesDataMock('9999', '202604');
    expect(rawRows).toHaveLength(0);
  });
});
