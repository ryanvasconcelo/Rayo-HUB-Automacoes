import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  competenceDateRange,
  EXTRA_PAYROLL_QUERIES,
  EXTRA_PAYROLL_TYPES,
} = require('../../rayo-server/fortes-extra-payroll-queries.js');

describe('competenceDateRange', () => {
  it('vai do dia 1 da competência ao dia 1 do mês seguinte', () => {
    expect(competenceDateRange('2026-04')).toEqual({ dataIni: '2026-04-01', dataFim: '2026-05-01' });
  });

  it('dezembro vira para janeiro do ano seguinte', () => {
    expect(competenceDateRange('2026-12')).toEqual({ dataIni: '2026-12-01', dataFim: '2027-01-01' });
  });

  it('recusa competência fora do formato AAAA-MM', () => {
    expect(() => competenceDateRange('04-2026')).toThrow(/Competência inválida/);
    expect(() => competenceDateRange('2026-13')).toThrow(/Competência inválida/);
  });
});

describe('queries de férias, rescisão e complementar', () => {
  const sqlDe = (tipo) => EXTRA_PAYROLL_QUERIES.find((q) => q.payrollType === tipo).sql;

  it('cobre exatamente férias, rescisão e complementar', () => {
    expect(EXTRA_PAYROLL_QUERIES.map((q) => q.payrollType)).toEqual(['FERIAS', 'RESCISAO', 'COMPLEMENTAR']);
  });

  it('férias: Folha 4, só a folha raiz, competência pelo início do gozo', () => {
    const sql = sqlDe('FERIAS');
    expect(sql).toContain('FOL.Folha IN (4)');
    expect(sql).toContain('FOL.FOL_Seq_Pai IS NULL');
    expect(sql).toContain('FER.DtGozoInicial >= @DataIni');
    expect(sql).toContain("'FERIAS' AS payrollType");
  });

  it('rescisão: Folhas 10 e 11 (rescisão complementar), competência pela data de cálculo', () => {
    const sql = sqlDe('RESCISAO');
    expect(sql).toContain('FOL.Folha IN (10, 11)');
    expect(sql).toContain('FOL.DtCalculo >= @DataIni');
    expect(sql).not.toContain('INNER JOIN FER');
  });

  it('complementar: Folha 17, competência pela data de referência', () => {
    const sql = sqlDe('COMPLEMENTAR');
    expect(sql).toContain('FOL.Folha IN (17)');
    expect(sql).toContain('FOL.DtReferencia >= @DataIni');
  });

  it('nunca lê o 13º rescisório (Folha 8), que repete eventos da rescisão', () => {
    for (const { folhas } of EXTRA_PAYROLL_TYPES) {
      expect(folhas).not.toContain(8);
    }
  });

  it('lotação cai para o último cadastro quando o vínculo da folha não resolve', () => {
    expect(sqlDe('RESCISAO')).toContain('COALESCE(SEP.LOT_Codigo, SEPU.LOT_Codigo)');
  });
});
