/**
 * moto-rey.config.js — Configuração de de-para Moto Rey (Royal Enfield).
 *
 * Fontes (pesquisa de 28/09/2026):
 * - Empresa/CNPJ/RAT-FAP: banco Fortes (EMP/EST/ES_CS_CP_Aliquotas_EST), empresa 9275.
 *   CNPJ completo da planilha "RAZAO ESTOQUE MOTO REY 2025.xlsx".
 * - Empresa/filial Dealer 06/006: informado pelo usuário.
 * - Centros: catálogo Dealer (Mapeamento_CC_Provisao_x_Dealer_BRAGA_MOTOS.xlsx,
 *   aba Dealer_CC: VENDAS/PECAS/OFC MOTO REY). CRM, Praça 14, GERAL e lotação
 *   vazia marcados "confirmar".
 * - Eventos: tabela EVE da 9275. Vários códigos têm outro significado na BV e na
 *   BM (953–979, 024, 327…): o de-para é próprio e não herda eventos numéricos.
 *   Contas por analogia com eventos de mesmo nome na BM/BV; os sem equivalente
 *   direto estão marcados "confirmar".
 * - Plano de contas: o mesmo do grupo (BV/BM).
 */

import { bragaVeiculosConfig } from './braga-veiculos.config.js';

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

const company = {
  companyId: 'moto-rey',
  companyName: 'BRAGA MOTO REY LTDA',
  cnpj: '49.384.500/0001-63',
  fortesCompanyCode: '9275',
  dealerCompanyField: '06',
  dealerBranch: '006',
};

// ---------------------------------------------------------------------------
// Centros do Dealer usados pela Moto Rey
// ---------------------------------------------------------------------------

const dealerCenters = [
  { code: '001118', name: 'VENDAS MOTO REY', active: true },
  { code: '003400', name: 'PECAS MOTO REY', active: true },
  { code: '004100', name: 'OFC MOTO REY', active: true },
  { code: '000600', name: 'ADMINISTRAÇÃO', active: true }, // confirmar se existe na empresa 06
];

const centro = (code) => dealerCenters.find((c) => c.code === code);
const lotacao = (lotacaoCode, code) => ({
  companyId: company.companyId,
  lotacaoCode,
  dealerCenterCode: code,
  dealerCenterName: centro(code).name,
  allocationMode: 'direct',
  active: true,
});

// ---------------------------------------------------------------------------
// De-para de centros — lotação Fortes (LOT.Nome e LOT.Codigo) → centro Dealer
// ---------------------------------------------------------------------------

const centerMappings = [
  lotacao('DPT POS VENDAS MECANICA ROYAL ENFIELD', '004100'),
  lotacao('001', '004100'),
  lotacao('DPTO DE VENDAS', '001118'),
  lotacao('002', '001118'),
  lotacao('DEPARTAMENTO CRM', '001118'), // confirmar
  lotacao('003', '001118'), // confirmar
  lotacao('BRAGA MOTO REY DEPTO MECANICA', '004100'),
  lotacao('004', '004100'),
  lotacao('DPT POS VENDAS PEÇAS', '003400'),
  lotacao('005', '003400'),
  lotacao('DEPARTAMENTO PRACA 14', '004100'), // confirmar
  lotacao('006', '004100'), // confirmar
  lotacao('GERAL', '000600'), // confirmar
  lotacao('999', '000600'), // confirmar
  lotacao('', '000600'), // confirmar — lotação vazia (bases eSocial sem empregado na folha)
];

// ---------------------------------------------------------------------------
// De-para de contas — eventos da 9275
// ---------------------------------------------------------------------------

const eventAccountMappings = [
  // ---- PROVENTOS (débito) ----
  { eventCode: '010', dealerAccountCode: '2.1.1.02.001', dc: 'D', description: 'Salário-Família' }, // compensa com INSS a recolher
  { eventCode: '011', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Salário-Base' },
  { eventCode: '030', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissões' },
  { eventCode: '049', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Descanso Semanal Remunerado' }, // confirmar (BV usa 6.1.1.01.005)
  { eventCode: '075', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Quebra de Caixa' },
  { eventCode: '090', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Líquido Negativo' },
  { eventCode: '100', dealerAccountCode: '2.1.1.02.007', dc: 'D', description: 'Provisão Cred. Trab. - Provento' }, // conta exigida pelo motor
  { eventCode: '216', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Meta CCT' }, // confirmar (analogia BV 956)
  { eventCode: '953', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão s/ peças' },
  { eventCode: '955', dealerAccountCode: '6.1.1.01.006', dc: 'D', description: 'Crédito banco de horas' },
  { eventCode: '957', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão s/ vendas' },
  { eventCode: '964', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Mecânico' },
  { eventCode: '965', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Venda de Moto' },
  { eventCode: '976', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmios Meritocracia' }, // confirmar
  { eventCode: '977', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Emplacamento' },
  { eventCode: '978', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Performance' },
  { eventCode: '979', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Consórcio' },

  // ---- FÉRIAS (folha de férias, Fortes Folha 4) — decisões do contador ----
  { eventCode: '110', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: 'Remuneração de Férias' },
  { eventCode: '111', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: '1/3 de Férias' },
  { eventCode: '301', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Provisão Cred. Trab. - Desconto (crédito do trabalhador / consignado)' },

  // ---- RESCISÃO (Fortes Folhas 10 e 11) ----
  { eventCode: '199', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Saldo de Salário' },
  { eventCode: '200', dealerAccountCode: '6.1.1.01.004', dc: 'D', description: 'Aviso Prévio Indenizado' },
  { eventCode: '201', dealerAccountCode: '6.1.1.01.004', dc: 'D', description: 'Rescisão Antes do Prazo Determinado' },
  { eventCode: '202', dealerAccountCode: '6.1.1.01.004', dc: 'D', description: 'Dispensa Próxima à Data-Base' }, // confirmar
  { eventCode: '205', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: 'Férias Proporcionais' },
  { eventCode: '206', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: 'Férias (Aviso Prévio)' },
  { eventCode: '212', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: '1/3 de Férias Proporcionais' },
  { eventCode: '208', dealerAccountCode: '6.1.1.03.002', dc: 'D', description: '13º Salário (Rescisão)' },
  { eventCode: '209', dealerAccountCode: '6.1.1.03.002', dc: 'D', description: '13º Salário (Aviso Prévio)' },
  { eventCode: '300', dealerAccountCode: '2.1.1.01.001', dc: 'C', description: 'Adiantamento Compensação' },
  { eventCode: '500', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Aviso Prévio (desconto)' },
  { eventCode: '502', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS (Rescisão)' },
  { eventCode: '504', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS 13º Salário' },
  { eventCode: '969', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Compra Ticket Plus' }, // confirmar
  { eventCode: '970', dealerAccountCode: '6.1.1.04.006', dc: 'C', description: 'Vale-Transporte não utilizado' },
  { eventCode: '971', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Vale-Refeição não utilizado' },
  // Multa de 40% do FGTS: custo da empresa, pago em guia própria; não entra no líquido.
  { eventCode: '900', dealerAccountCode: '6.1.1.02.002', dc: 'D', description: 'Multa 40% FGTS (rescisão)' },
  { eventCode: '900', dealerAccountCode: '2.1.1.02.002', dc: 'C', description: 'FGTS a Recolher (multa 40% rescisão)' },

  // ---- DESCONTOS (crédito) ----
  { eventCode: '024', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Vale Refeição / Alimentação' }, // confirmar
  { eventCode: '127', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '310', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS' },
  { eventCode: '311', dealerAccountCode: '2.1.3.02.001', dc: 'C', description: 'IRRF' },
  { eventCode: '320', dealerAccountCode: '6.1.1.04.006', dc: 'C', description: 'Vale-Transporte' },
  { eventCode: '321', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Falta' },
  { eventCode: '327', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Atrasos' },
  { eventCode: '349', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'DSR Desconto' },
  { eventCode: '390', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Líquido Negativo Compensação' },
  { eventCode: '947', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Desconto Refeição' },
  { eventCode: '954', dealerAccountCode: '6.1.1.01.006', dc: 'C', description: 'Débito de banco de horas' },
  { eventCode: '959', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '960', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '974', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '975', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Débito de Crachá' },
];

/**
 * Eventos sintéticos do motor (LIQUIDO_*, PROV_*, PROV_BAIXA_*, ENCARGO_*) não
 * vêm da tabela EVE: usam as mesmas contas em todas as empresas do grupo.
 */
const syntheticAccountMappings = bragaVeiculosConfig.accountMappings.filter(
  (m) => !/^\d+$/.test(m.eventCode)
);

const accountMappings = [
  ...eventAccountMappings.map((m) => ({
    companyId: company.companyId,
    dealerLotAccountCode: null,
    active: true,
    ...m,
  })),
  ...syntheticAccountMappings.map((m) => ({ ...m, companyId: company.companyId })),
];

// ---------------------------------------------------------------------------
// Alíquotas Moto Rey (encargos + provisões)
// ---------------------------------------------------------------------------

// Estabelecimento único (0001): RAT 3% × FAP 1,00 = GILRAT 3% (ES_CS_CP_Aliquotas_EST 04–08/2026).
// FPAS 515 / Cód. Terceiros 0115 — Terceiros 5,8%. No extract o GILRAT vem por
// estabelecimento e o FGTS de VALORDEPO; aqui é fallback.
const encargoRates = {
  inssEmpresa: 20.0, // 1138-01
  gilrat: 3.0, // 1646-01 (EST 0001: RAT 3% × FAP 1,00)
  terceiros: 5.8, // 1170+1176+1191+1196+1200
  fgts: 8.0, // FGTS mensal (fallback)
};

// Alíquotas de provisão (fallback sintético; extract usa PRD/PRF do Fortes)
const provisionRates = {
  feriasTerco: 11.11,
  decimoTerceiro: 8.33,
  inssPatronal: encargoRates.inssEmpresa + encargoRates.gilrat + encargoRates.terceiros,
  fgts: 8.00,
};

// ---------------------------------------------------------------------------
// Eventos informativos — mesmo conjunto da Braga Veículos
// ---------------------------------------------------------------------------

const informativeEventCodes = [...bragaVeiculosConfig.informativeEventCodes];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const motoReyConfig = Object.freeze({
  company,
  centerMappings,
  dealerCenters,
  accountMappings,
  informativeEventCodes,
  provisionRates,
  encargoRates,
});
