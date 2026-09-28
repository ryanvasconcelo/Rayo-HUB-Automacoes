import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { computeVacationProvisionReversals } = require('../../rayo-server/fortes-provision-reversal.js');

// Linha da provisão de férias do Fortes (PRF) por empregado × período aquisitivo.
// No Fortes: Acumulada = saldo anterior já deduzido da baixa do mês;
// saldo final = Acumulada + Provisao.
const linha = (employeeId, periodStart, prov, acum, extra = {}) => ({
  companyId: '9277',
  competence: '202604',
  employeeId,
  periodStart,
  lotacaoCode: 'OFICINA',
  lotacaoName: 'OFICINA',
  provFerCents: prov,
  provFerAcumCents: acum,
  inssFerCents: 0,
  inssFerAcumCents: 0,
  fgtsFerCents: 0,
  fgtsFerAcumCents: 0,
  ...extra,
});

const baixas = (rows, eventCode = 'PROV_BAIXA_FERIAS') =>
  rows.filter((r) => r.eventCode === eventCode).map((r) => [r.employeeId, r.amountCents]);

describe('baixa da provisão de férias (Fortes PRF)', () => {
  it('férias sem saldo provisionado: baixa o valor que o Fortes complementou no mês', () => {
    // ROBERTO, 04/2026: nada provisionado antes; gozo em abril
    const rows = computeVacationProvisionReversals({
      competence: '202604',
      previous: [linha('263', '2025-03-01', 0, 0)],
      current: [linha('263', '2025-03-01', 309419, -309419)],
    });
    expect(baixas(rows)).toEqual([['263', 309419]]);
  });

  it('férias com saldo provisionado: baixa o saldo anterior mais o complemento', () => {
    // saldo de março 2.200,00; em abril Acumulada = -3.204,91
    const rows = computeVacationProvisionReversals({
      competence: '202604',
      previous: [linha('211', '2025-04-01', 18333, 201667)],
      current: [linha('211', '2025-04-01', 320491, -320491)],
    });
    expect(baixas(rows)).toEqual([['211', 540491]]);
  });

  it('mês sem férias: provisão só acumula, sem baixa', () => {
    const rows = computeVacationProvisionReversals({
      competence: '202607',
      previous: [linha('263', '2026-03-01', 36426, 36907)],
      current: [linha('263', '2026-03-01', 24569, 73333)],
    });
    expect(rows).toEqual([]);
  });

  it('período novo (sem linha no mês anterior) não gera baixa', () => {
    const rows = computeVacationProvisionReversals({
      competence: '202605',
      previous: [linha('263', '2025-03-01', 0, 0)],
      current: [linha('263', '2025-03-01', 0, 0), linha('263', '2026-03-01', 36907, 0)],
    });
    expect(rows).toEqual([]);
  });

  it('período que some no mês (rescisão) baixa o saldo inteiro, na lotação do mês anterior', () => {
    const rows = computeVacationProvisionReversals({
      competence: '202602',
      previous: [
        linha('098', '2025-01-05', 18333, 201667, { lotacaoCode: 'VENDAS', lotacaoName: 'VENDAS' }),
        linha('001', '2025-06-01', 18333, 18333),
      ],
      current: [linha('001', '2025-06-01', 18333, 36666)],
    });
    expect(rows.map((r) => [r.employeeId, r.eventCode, r.amountCents, r.competence, r.lotacaoCode])).toEqual([
      ['098', 'PROV_BAIXA_FERIAS', 220000, '202602', 'VENDAS'],
    ]);
  });

  it('baixa também INSS e FGTS provisionados sobre as férias', () => {
    const rows = computeVacationProvisionReversals({
      competence: '202604',
      previous: [linha('263', '2025-03-01', 0, 0, { inssFerCents: 5000, inssFerAcumCents: 10000, fgtsFerCents: 1500, fgtsFerAcumCents: 3000 })],
      current: [linha('263', '2025-03-01', 309419, -309419, { inssFerCents: 84471, inssFerAcumCents: -84471, fgtsFerCents: 24754, fgtsFerAcumCents: -24754 })],
    });
    expect(baixas(rows, 'PROV_BAIXA_INSS_FER')).toEqual([['263', 99471]]);
    expect(baixas(rows, 'PROV_BAIXA_FGTS_FER')).toEqual([['263', 29254]]);
  });

  it('sem provisão do mês anterior ou do mês atual calculada no Fortes, não inventa baixa', () => {
    const anterior = [linha('098', '2025-01-05', 18333, 201667)];
    expect(computeVacationProvisionReversals({ competence: '202609', previous: anterior, current: [] })).toEqual([]);
    expect(
      computeVacationProvisionReversals({ competence: '202601', previous: [], current: [linha('098', '2025-01-05', 5000, -5000)] })
    ).toEqual([]);
  });

  it('saldo que cresce além da provisão do mês sai como baixa negativa (o journal inverte D/C)', () => {
    const rows = computeVacationProvisionReversals({
      competence: '202605',
      previous: [linha('263', '2026-03-01', 0, 80000)],
      current: [linha('263', '2026-03-01', 0, 100000)],
    });
    expect(baixas(rows)).toEqual([['263', -20000]]);
  });
});
