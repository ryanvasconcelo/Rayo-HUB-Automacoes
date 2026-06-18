import { describe, expect, it } from 'vitest';
import { getLastDayOfCompetence } from '../src/lib/folha-dealer/date-helpers.js';

describe('Date Helpers', () => {
  it('deve retornar o último dia de um mês de 31 dias', () => {
    expect(getLastDayOfCompetence('2026-05')).toBe('2026-05-31');
  });

  it('deve retornar o último dia de um mês de 30 dias', () => {
    expect(getLastDayOfCompetence('2026-04')).toBe('2026-04-30');
  });

  it('deve lidar com ano bissexto (Fevereiro 2024)', () => {
    expect(getLastDayOfCompetence('2024-02')).toBe('2024-02-29');
  });

  it('deve lidar com ano não-bissexto (Fevereiro 2023)', () => {
    expect(getLastDayOfCompetence('2023-02')).toBe('2023-02-28');
  });

  it('deve retornar string vazia se formato for inválido', () => {
    expect(getLastDayOfCompetence('')).toBe('');
    expect(getLastDayOfCompetence('2024-5')).toBe('');
    expect(getLastDayOfCompetence('invalid')).toBe('');
  });
});
