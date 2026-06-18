/**
 * braga-veiculos.fixtures.js — Fixtures de PayrollSourceRow para testes.
 *
 * Competência fixture: 04/2026.
 * Empresa: BRAGA VEICULOS LTDA.
 *
 * Gera linhas mínimas para exercitar todos os caminhos do motor:
 * - Lotação ADM (administrativo direto → centro 000600)
 * - Lotação VEN (vendas → centro 001000)
 * - Lotação MEC (mecânica → centro 000300)
 * - Evento 011 Salário-Base (D, conta 6.x → exige centro)
 * - Evento 310 INSS (C, conta 2.x → sem centro)
 * - Evento 100 Provisão Cred. Trab. (D, conta 2.1.1.03.001 → sem centro)
 * - Evento 600 informativo (não gera journal)
 */

/**
 * Builds the minimum set of PayrollSourceRow fixtures for Braga Veículos.
 * @returns {import('./contracts.js').PayrollSourceRow[]}
 */
export function buildBragaRows() {
  const base = {
    sourceSystem: 'fortes',
    sourceAdapter: 'fixture',
    sourceOrigin: 'folha-mensal',
    companyId: 'braga-veiculos',
    companyName: 'BRAGA VEICULOS LTDA',
    competence: '2026-04',
  };

  return [
    // ------ Salário-Base (011) por lotação ------
    {
      ...base,
      lotacaoCode: 'ADM',
      lotacaoName: 'RECURSOS HUMANOS',
      eventCode: '011',
      eventName: 'Salário-Base',
      amountCents: 100000, // R$ 1.000,00
      sourceLineId: 'fix-011-adm',
    },
    {
      ...base,
      lotacaoCode: 'VEN',
      lotacaoName: 'DEPT. VENDAS VEICULOS',
      eventCode: '011',
      eventName: 'Salário-Base',
      amountCents: 150000, // R$ 1.500,00
      sourceLineId: 'fix-011-ven',
    },
    {
      ...base,
      lotacaoCode: 'MEC',
      lotacaoName: 'DEPT. PRODUTIVOS',
      eventCode: '011',
      eventName: 'Salário-Base',
      amountCents: 120000, // R$ 1.200,00
      sourceLineId: 'fix-011-mec',
    },

    // ------ INSS (310) — desconto, crédito 2.1.1.02.001 ------
    {
      ...base,
      lotacaoCode: 'ADM',
      lotacaoName: 'RECURSOS HUMANOS',
      eventCode: '310',
      eventName: 'INSS',
      amountCents: 130000, // R$ 1.300,00 (80000 originais + 50000 para balancear o evento 100)
      sourceLineId: 'fix-310-adm',
    },
    {
      ...base,
      lotacaoCode: 'VEN',
      lotacaoName: 'DEPT. VENDAS VEICULOS',
      eventCode: '310',
      eventName: 'INSS',
      amountCents: 120000, // R$ 1.200,00
      sourceLineId: 'fix-310-ven',
    },
    {
      ...base,
      lotacaoCode: 'MEC',
      lotacaoName: 'DEPT. PRODUTIVOS',
      eventCode: '310',
      eventName: 'INSS',
      amountCents: 170000, // R$ 1.700,00
      sourceLineId: 'fix-310-mec',
    },

    // ------ Provisão Cred. Trab. (100) — D, 2.1.1.03.001, sem centro ------
    {
      ...base,
      lotacaoCode: 'ADM',
      lotacaoName: 'RECURSOS HUMANOS',
      eventCode: '100',
      eventName: 'Provisão Cred. Trab.',
      amountCents: 50000, // R$ 500,00
      sourceLineId: 'fix-100-adm',
    },

    // ------ Informativo (600) — não gera journal ------
    {
      ...base,
      lotacaoCode: 'ADM',
      lotacaoName: 'RECURSOS HUMANOS',
      eventCode: '600',
      eventName: 'Base INSS',
      sourceRecordType: 'INFORMATIVO_BASE',
      sourceEventNature: 'INFORMATIVO',
      amountCents: 200000,
      sourceLineId: 'fix-600-adm',
    },
  ];
}

/**
 * Fixture com nomes de lotação reais do Fortes, conforme docs/folha-dealer/braga-veiculos.md.
 * Testa que o de-para funciona com os nomes como virão das queries Fortes.
 * @returns {import('./contracts.js').PayrollSourceRow[]}
 */
export function buildBragaRowsFortes() {
  const base = {
    sourceSystem: 'fortes',
    sourceAdapter: 'fixture',
    sourceOrigin: 'folha-mensal',
    companyId: 'braga-veiculos',
    companyName: 'BRAGA VEICULOS LTDA',
    competence: '2026-04',
  };

  return [
    // Salário-Base (011) — lotações reais
    {
      ...base,
      lotacaoCode: 'RECURSOS HUMANOS',
      lotacaoName: 'RECURSOS HUMANOS',
      eventCode: '011',
      eventName: 'Salário-Base',
      amountCents: 100000,
      sourceLineId: 'fortes-011-rh',
    },
    {
      ...base,
      lotacaoCode: 'DEPT. VENDAS VEICULOS',
      lotacaoName: 'DEPT. VENDAS VEICULOS',
      eventCode: '011',
      eventName: 'Salário-Base',
      amountCents: 150000,
      sourceLineId: 'fortes-011-vendas',
    },
    {
      ...base,
      lotacaoCode: 'DEPT. SERVIÇOS MECANICA MATRIZ',
      lotacaoName: 'DEPT. SERVIÇOS MECANICA MATRIZ',
      eventCode: '011',
      eventName: 'Salário-Base',
      amountCents: 120000,
      sourceLineId: 'fortes-011-mecanica',
    },

    // INSS (310)
    {
      ...base,
      lotacaoCode: 'RECURSOS HUMANOS',
      lotacaoName: 'RECURSOS HUMANOS',
      eventCode: '310',
      eventName: 'INSS',
      amountCents: 130000, // R$ 1.300,00 (80000 originais + 50000 para balancear)
      sourceLineId: 'fortes-310-rh',
    },
    {
      ...base,
      lotacaoCode: 'DEPT. VENDAS VEICULOS',
      lotacaoName: 'DEPT. VENDAS VEICULOS',
      eventCode: '310',
      eventName: 'INSS',
      amountCents: 120000,
      sourceLineId: 'fortes-310-vendas',
    },
    {
      ...base,
      lotacaoCode: 'DEPT. SERVIÇOS MECANICA MATRIZ',
      lotacaoName: 'DEPT. SERVIÇOS MECANICA MATRIZ',
      eventCode: '310',
      eventName: 'INSS',
      amountCents: 170000,
      sourceLineId: 'fortes-310-mecanica',
    },

    // Provisão Cred. Trab. (100)
    {
      ...base,
      lotacaoCode: 'RECURSOS HUMANOS',
      lotacaoName: 'RECURSOS HUMANOS',
      eventCode: '100',
      eventName: 'Provisão Cred. Trab.',
      amountCents: 50000,
      sourceLineId: 'fortes-100-rh',
    },

    // Informativo (600)
    {
      ...base,
      lotacaoCode: 'RECURSOS HUMANOS',
      lotacaoName: 'RECURSOS HUMANOS',
      eventCode: '600',
      eventName: 'Base INSS',
      sourceRecordType: 'INFORMATIVO_BASE',
      sourceEventNature: 'INFORMATIVO',
      amountCents: 200000,
      sourceLineId: 'fortes-600-rh',
    },
  ];
}
