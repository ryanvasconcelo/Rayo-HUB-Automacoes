/**
 * braga-motos.config.js — Configuração de de-para Braga Motos (Yamaha).
 *
 * Fontes:
 * - Empresa/CNPJ/RAT-FAP: banco Fortes (EMP/EST/ES_CS_CP_Aliquotas_EST), empresa 9277.
 * - Centros: Mapeamento_CC_Provisao_x_Dealer_BRAGA_MOTOS.xlsx (abas Mapeamento e Dealer_CC).
 * - Lotações 039 e 046–073/999 não constam no xlsx; foram inferidas pelas mesmas
 *   regras (localidade > marca > função) e estão marcadas com "INFERIDO — confirmar".
 * - Plano de contas: o xlsx só traz centros de custo. As contas são as mesmas da
 *   Braga Veículos (mesmo plano Dealer), reaproveitadas via bragaVeiculosConfig.
 */

import { bragaVeiculosConfig } from './braga-veiculos.config.js';

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

const company = {
  companyId: 'braga-motos',
  companyName: 'BRAGA MOTOS LTDA',
  cnpj: '05.216.530/0001-95',
  fortesCompanyCode: '9277',
  // Empresa/filial no Dealer ainda não confirmadas pelo cliente — o usuário pode
  // ajustar os campos na tela antes de exportar o TXT.
  dealerCompanyField: '01',
  dealerBranch: '001',
};

// ---------------------------------------------------------------------------
// De-para de centros — lotação Fortes → centro Dealer
// ---------------------------------------------------------------------------

const centerMappings = [
  // ---- Nomes reais das lotações Fortes (LOT.Nome — chave usada pelo extractor) ----
  { companyId: company.companyId, lotacaoCode: 'DEPARTAMENTO CD VENDAS ', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPARTAMENTO CD VENDAS', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true }, // variante sem espaço final
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS PRODUTIVOS - PRACA 14', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS - MANOA', dealerCenterCode: '001160', dealerCenterName: 'DPTO. STAND MANOA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO BRAGA ACESSORIOS VENDAS CACHOEIRINHA', dealerCenterCode: '003500', dealerCenterName: 'BRAGA ACESSORIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO VENDAS - MANOA', dealerCenterCode: '001160', dealerCenterName: 'DPTO. STAND MANOA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'ADMINISTRACAO POS VENDAS PRACA 14', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'BRAGA PARINTINS - VENDAS', dealerCenterCode: '001115', dealerCenterName: 'DPTO. PAREDES DE PAREDE', allocationMode: 'activity', active: true }, // xlsx: SEM CORRESPONDÊNCIA — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA PARINTINS - POS VENDAS', dealerCenterCode: '001115', dealerCenterName: 'DPTO. PAREDES DE PAREDE', allocationMode: 'direct', active: true }, // xlsx: SEM CORRESPONDÊNCIA — confirmar
  { companyId: company.companyId, lotacaoCode: 'DPTO SANTA ETELVINA - VENDAS', dealerCenterCode: '001900', dealerCenterName: 'DPTO. SANTA ETELVINA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO - VENDAS PRACA 14', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS CIDADE DE DEUS - POS VENDAS', dealerCenterCode: '001800', dealerCenterName: 'DPTO. STAND CIDADE DE DEUS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO CIDADE NOVA - POS VENDA', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true }, // xlsx: SEM CORRESPONDÊNCIA — confirmar
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS - GRANDE CIRCULAR', dealerCenterCode: '001500', dealerCenterName: 'DPTO. MOTOS NOVAS GC', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO VENDAS - BRAGA COROADO', dealerCenterCode: '001113', dealerCenterName: 'DPTO.STAND COROADO', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO VENDAS - GRANDE CIRCULAR', dealerCenterCode: '001500', dealerCenterName: 'DPTO. MOTOS NOVAS GC', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO VENDAS - GRANDE VITORIA ', dealerCenterCode: '001114', dealerCenterName: 'DPTO. STAND GRANDE VITORIA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO VENDAS - GRANDE VITORIA', dealerCenterCode: '001114', dealerCenterName: 'DPTO. STAND GRANDE VITORIA', allocationMode: 'activity', active: true }, // variante sem espaço final
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOMARCAS VENDAS PRACA 14', dealerCenterCode: '001122', dealerCenterName: 'BRAGA MOTOMARCAS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO CIDADE NOVA - VENDAS', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true }, // xlsx: SEM CORRESPONDÊNCIA — confirmar
  { companyId: company.companyId, lotacaoCode: 'DPTO VENDAS - CONSORCIO PRACA 14', dealerCenterCode: '008300', dealerCenterName: 'CONSÓRCIO', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO ACESSORIOS VENDAS SUMAUMA', dealerCenterCode: '003100', dealerCenterName: 'DPTO. ACESSÓRIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS - CRM 14', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true }, // xlsx: SEM CORRESPONDÊNCIA — confirmar
  { companyId: company.companyId, lotacaoCode: 'DPTO BRAGA ACESSORIOS CIDADA NOVA', dealerCenterCode: '003500', dealerCenterName: 'BRAGA ACESSORIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS LIRIO DO VALE', dealerCenterCode: '001012', dealerCenterName: 'DPTO. STAND LIRIO DO VALE', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO VENDAS - FINANCIAMENTO PRACA 14', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true }, // xlsx: SEM CORRESPONDÊNCIA — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS VENDAS CIDADE DE DEUS', dealerCenterCode: '001800', dealerCenterName: 'DPTO. STAND CIDADE DE DEUS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS - GRANDE VITORIA', dealerCenterCode: '001114', dealerCenterName: 'DPTO. STAND GRANDE VITORIA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO VENDAS - SEGUROS PRACA 14', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true }, // xlsx: SEM CORRESPONDÊNCIA — confirmar
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS - BRAGA COROADO', dealerCenterCode: '001113', dealerCenterName: 'DPTO.STAND COROADO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPARTAMENTO CD POS VENDAS', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO CIDADE NOVA - POS VENDAS', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true }, // xlsx: SEM CORRESPONDÊNCIA — confirmar
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS PECAS - PRACA 14', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO SANTA ETELVINA - VENDAS ', dealerCenterCode: '001900', dealerCenterName: 'DPTO. SANTA ETELVINA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS VENDAS JAPIIM', dealerCenterCode: '001120', dealerCenterName: 'DPTO. STAND JAPIIM', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'ADMINISTRACAO PRACA 14', dealerCenterCode: '000600', dealerCenterName: 'ADMINISTRAÇÃO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS VENDAS ALVORADA', dealerCenterCode: '001110', dealerCenterName: 'DPTO. STAND ALVORADA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS MECANICA - PRACA 14', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS LIRIO DO VALE VENDAS', dealerCenterCode: '001012', dealerCenterName: 'DPTO. STAND LIRIO DO VALE', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO VENDAS CRM PRACA 14', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true }, // xlsx: SEM CORRESPONDÊNCIA — confirmar
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS PRACA 14', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO BRAGA ACESSORIOS POS  VENDAS CACHOEIRINHA', dealerCenterCode: '004300', dealerCenterName: 'DPTO. MECÂNICA B. ACESSÓRIOS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOMARCAS COROADO', dealerCenterCode: '001122', dealerCenterName: 'BRAGA MOTOMARCAS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPARTAMENTO DE VENDAS ITACOATIARA', dealerCenterCode: '001140', dealerCenterName: 'DPTO. ITACOATIARA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS - SANTA ETELVINA ', dealerCenterCode: '001900', dealerCenterName: 'DPTO. SANTA ETELVINA', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS - SANTA ETELVINA', dealerCenterCode: '001900', dealerCenterName: 'DPTO. SANTA ETELVINA', allocationMode: 'direct', active: true }, // variante sem espaço final
  { companyId: company.companyId, lotacaoCode: 'DPTO POS VENDAS - SAMAUMA', dealerCenterCode: '001200', dealerCenterName: 'DPTO. COMPRAS SUMAUMA', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'DPTO PEÇAS', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO VENDAS', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'DEPTO CRM POS VENDAS', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS DEPTO PECAS MATRIZ ', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS DEPTO PECAS MATRIZ', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true }, // variante sem espaço final
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS DEPTO CRM', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'DEPTO PEÇAS - PRAÇA 14', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'DEPTO PEÇAS - CAMAPUA', dealerCenterCode: '001116', dealerCenterName: 'DPTO. CAMAPUA', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS DEPTO PECAS PARINTINS', dealerCenterCode: '001115', dealerCenterName: 'DPTO. PAREDES DE PAREDE', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS DEPTO VENDAS PARINTINS', dealerCenterCode: '001115', dealerCenterName: 'DPTO. PAREDES DE PAREDE', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS DEPTO MECANICA PRACA 14', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS DEPTO PECAS CIDADE NOVA', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS DEPTO PECAS CIDADE DE DEUS', dealerCenterCode: '001800', dealerCenterName: 'DPTO. STAND CIDADE DE DEUS', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS DEPTO MECANICA COROADO', dealerCenterCode: '001113', dealerCenterName: 'DPTO.STAND COROADO', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO PECAS', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO LOGISTICA', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA VEÍCULOS - DEPTO VENDAS NOVOS', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO ADMINISTRACAO', dealerCenterCode: '000600', dealerCenterName: 'ADMINISTRAÇÃO', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO ACESSORIOS SUMAUMA SHOPPING', dealerCenterCode: '003100', dealerCenterName: 'DPTO. ACESSÓRIOS', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO ACESSORIOS CIDADE NOVA', dealerCenterCode: '003100', dealerCenterName: 'DPTO. ACESSÓRIOS', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO VENDAS CAMAPUA', dealerCenterCode: '001116', dealerCenterName: 'DPTO. CAMAPUA', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA ACESSORIOS', dealerCenterCode: '003500', dealerCenterName: 'BRAGA ACESSORIOS', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO PEÇAS - CD', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO GRANDE VITORIA', dealerCenterCode: '001114', dealerCenterName: 'DPTO. STAND GRANDE VITORIA', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'BRAGA MOTOS - DEPTO BRAGA ACESSÓRIOS CACHOEIRINHA', dealerCenterCode: '003500', dealerCenterName: 'BRAGA ACESSORIOS', allocationMode: 'activity', active: true }, // INFERIDO — confirmar
  { companyId: company.companyId, lotacaoCode: 'GERAL', dealerCenterCode: '000600', dealerCenterName: 'ADMINISTRAÇÃO', allocationMode: 'direct', active: true }, // INFERIDO — confirmar

  // ---- Códigos Fortes (LOT.Codigo) — fallback quando o nome não vem preenchido ----
  { companyId: company.companyId, lotacaoCode: '001', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '002', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '003', dealerCenterCode: '001160', dealerCenterName: 'DPTO. STAND MANOA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '004', dealerCenterCode: '003500', dealerCenterName: 'BRAGA ACESSORIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '005', dealerCenterCode: '001160', dealerCenterName: 'DPTO. STAND MANOA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '006', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '007', dealerCenterCode: '001115', dealerCenterName: 'DPTO. PAREDES DE PAREDE', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '008', dealerCenterCode: '001115', dealerCenterName: 'DPTO. PAREDES DE PAREDE', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '009', dealerCenterCode: '001900', dealerCenterName: 'DPTO. SANTA ETELVINA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '010', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '011', dealerCenterCode: '001800', dealerCenterName: 'DPTO. STAND CIDADE DE DEUS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '012', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '013', dealerCenterCode: '001500', dealerCenterName: 'DPTO. MOTOS NOVAS GC', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '014', dealerCenterCode: '001113', dealerCenterName: 'DPTO.STAND COROADO', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '015', dealerCenterCode: '001500', dealerCenterName: 'DPTO. MOTOS NOVAS GC', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '016', dealerCenterCode: '001114', dealerCenterName: 'DPTO. STAND GRANDE VITORIA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '017', dealerCenterCode: '001122', dealerCenterName: 'BRAGA MOTOMARCAS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '018', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '019', dealerCenterCode: '008300', dealerCenterName: 'CONSÓRCIO', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '020', dealerCenterCode: '003100', dealerCenterName: 'DPTO. ACESSÓRIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '021', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '022', dealerCenterCode: '003500', dealerCenterName: 'BRAGA ACESSORIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '023', dealerCenterCode: '001012', dealerCenterName: 'DPTO. STAND LIRIO DO VALE', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '024', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '025', dealerCenterCode: '001800', dealerCenterName: 'DPTO. STAND CIDADE DE DEUS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '026', dealerCenterCode: '001114', dealerCenterName: 'DPTO. STAND GRANDE VITORIA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '027', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '028', dealerCenterCode: '001113', dealerCenterName: 'DPTO.STAND COROADO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '029', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '030', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '031', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '032', dealerCenterCode: '001900', dealerCenterName: 'DPTO. SANTA ETELVINA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '033', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '034', dealerCenterCode: '001120', dealerCenterName: 'DPTO. STAND JAPIIM', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '035', dealerCenterCode: '000600', dealerCenterName: 'ADMINISTRAÇÃO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '036', dealerCenterCode: '001110', dealerCenterName: 'DPTO. STAND ALVORADA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '037', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '038', dealerCenterCode: '001012', dealerCenterName: 'DPTO. STAND LIRIO DO VALE', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '039', dealerCenterCode: '001115', dealerCenterName: 'DPTO. PAREDES DE PAREDE', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '040', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '041', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '042', dealerCenterCode: '004300', dealerCenterName: 'DPTO. MECÂNICA B. ACESSÓRIOS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '043', dealerCenterCode: '001122', dealerCenterName: 'BRAGA MOTOMARCAS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '044', dealerCenterCode: '008300', dealerCenterName: 'CONSÓRCIO', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '045', dealerCenterCode: '001140', dealerCenterName: 'DPTO. ITACOATIARA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '046', dealerCenterCode: '001900', dealerCenterName: 'DPTO. SANTA ETELVINA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '047', dealerCenterCode: '001200', dealerCenterName: 'DPTO. COMPRAS SUMAUMA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '048', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '049', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '050', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '051', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '052', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '053', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '054', dealerCenterCode: '001116', dealerCenterName: 'DPTO. CAMAPUA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '056', dealerCenterCode: '001115', dealerCenterName: 'DPTO. PAREDES DE PAREDE', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '057', dealerCenterCode: '001115', dealerCenterName: 'DPTO. PAREDES DE PAREDE', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '058', dealerCenterCode: '000300', dealerCenterName: 'MECÂNICA', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '059', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '060', dealerCenterCode: '001800', dealerCenterName: 'DPTO. STAND CIDADE DE DEUS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '061', dealerCenterCode: '001113', dealerCenterName: 'DPTO.STAND COROADO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '062', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '063', dealerCenterCode: '000500', dealerCenterName: 'PEÇAS', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '064', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '065', dealerCenterCode: '001000', dealerCenterName: 'VEÍCULOS NOVOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '066', dealerCenterCode: '000600', dealerCenterName: 'ADMINISTRAÇÃO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '067', dealerCenterCode: '003100', dealerCenterName: 'DPTO. ACESSÓRIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '068', dealerCenterCode: '003100', dealerCenterName: 'DPTO. ACESSÓRIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '069', dealerCenterCode: '001116', dealerCenterName: 'DPTO. CAMAPUA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '070', dealerCenterCode: '003500', dealerCenterName: 'BRAGA ACESSORIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '071', dealerCenterCode: '001121', dealerCenterName: 'DPTO. DEPÓSITO', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '072', dealerCenterCode: '001114', dealerCenterName: 'DPTO. STAND GRANDE VITORIA', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '073', dealerCenterCode: '003500', dealerCenterName: 'BRAGA ACESSORIOS', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '999', dealerCenterCode: '000600', dealerCenterName: 'ADMINISTRAÇÃO', allocationMode: 'direct', active: true },

  // ---- Fallback: lotação vazia cai na Administração ----
  { companyId: company.companyId, lotacaoCode: '', dealerCenterCode: '000600', dealerCenterName: 'ADMINISTRAÇÃO', allocationMode: 'direct', active: true },
];

// ---------------------------------------------------------------------------
// Centros de resultado do Dealer (aba Dealer_CC — catálogo completo)
// ---------------------------------------------------------------------------

const dealerCenters = [
  { code: '000600', name: 'ADMINISTRAÇÃO', active: true },
  { code: '000400', name: 'FUNILÁRIO', active: true },
  { code: '000500', name: 'PEÇAS', active: true },
  { code: '000300', name: 'MECÂNICA', active: true },
  { code: '001000', name: 'VEÍCULOS NOVOS', active: true },
  { code: '002000', name: 'VEÍCULOS USADOS', active: true },
  { code: '000101', name: 'VENDA DIRETA', active: true },
  { code: '008000', name: 'DIRETÓRIO', active: true },
  { code: '008100', name: 'DIRETÓRIO COMERCIAL', active: true },
  { code: '008200', name: 'RECUP TRIB./INC. FISCAIS', active: true },
  { code: '008300', name: 'CONSÓRCIO', active: true },
  { code: '001100', name: 'DPTO. VEÍCULOS NOVOS FILIAL', active: true },
  { code: '003100', name: 'DPTO. ACESSÓRIOS', active: true },
  { code: '003200', name: 'DPTO. ACESSÓRIOS MINI', active: true },
  { code: '003300', name: 'DPTO. ACESSÓRIOS MOTO', active: true },
  { code: '001200', name: 'DPTO. COMPRAS SUMAUMA', active: true },
  { code: '001300', name: 'DPTO. ESTANDE CARREFOUR', active: true },
  { code: '001400', name: 'DPTO. CARREFOUR FLORES', active: true },
  { code: '001500', name: 'DPTO. MOTOS NOVAS GC', active: true },
  { code: '001600', name: 'DPTO. NOVO ISRAEL', active: true },
  { code: '001700', name: 'DPTO. STAND MUTIRAO', active: true },
  { code: '001800', name: 'DPTO. STAND CIDADE DE DEUS', active: true },
  { code: '001900', name: 'DPTO. SANTA ETELVINA', active: true },
  { code: '001110', name: 'DPTO. STAND ALVORADA', active: true },
  { code: '001120', name: 'DPTO. STAND JAPIIM', active: true },
  { code: '001130', name: 'DPTO. STAND COL SANTO ANTONIO', active: true },
  { code: '001140', name: 'DPTO. ITACOATIARA', active: true },
  { code: '001150', name: 'DPTO. STAND JORGE TEIXEIRA', active: true },
  { code: '001160', name: 'DPTO. STAND MANOA', active: true },
  { code: '001170', name: 'DPTO. STAND PARQUE DEZ', active: true },
  { code: '001180', name: 'DPTO. NOVO ALEIXO', active: true },
  { code: '001190', name: 'DPTO. BETANIA', active: true },
  { code: '001111', name: 'DPTO. TARUMA', active: true },
  { code: '001012', name: 'DPTO. STAND LIRIO DO VALE', active: true },
  { code: '001113', name: 'DPTO.STAND COROADO', active: true },
  { code: '001114', name: 'DPTO. STAND GRANDE VITORIA', active: true },
  { code: '001115', name: 'DPTO. PAREDES DE PAREDE', active: true },
  { code: '001116', name: 'DPTO. CAMAPUA', active: true },
  { code: '001117', name: 'DPTO. NOEL NUTELS', active: true },
  { code: '001118', name: 'VENDAS MOTO REY', active: true },
  { code: '003400', name: 'PECAS MOTO REY', active: true },
  { code: '004100', name: 'OFC MOTO REY', active: true },
  { code: '003500', name: 'BRAGA ACESSORIOS', active: true },
  { code: '001122', name: 'BRAGA MOTOMARCAS', active: true },
  { code: '001119', name: 'DPTO. TORQUATO', active: true },
  { code: '001121', name: 'DPTO. DEPÓSITO', active: true },
  { code: '004200', name: 'DPTO. MECÂNICA MOTOMARCAS', active: true },
  { code: '004300', name: 'DPTO. MECÂNICA B. ACESSÓRIOS', active: true },
  { code: '003600', name: 'DPTO. PECAS MOTOMARCAS', active: true },
  { code: '001123', name: 'DPTO.VEICS.NOVOS MINI', active: true },
  { code: '002100', name: 'DPTO.VEICS.USADOS MINI', active: true },
  { code: '002200', name: 'DPTO.VEICS.USADOS MOTO', active: true },
  { code: '004400', name: 'DPTO.MECANICA MINI', active: true },
  { code: '004500', name: 'DPTO.MECANICA MOTO', active: true },
  { code: '006100', name: 'DPTO.FUN/PINT MINI', active: true },
  { code: '006200', name: 'DPTO.FUN/PINT MOTO', active: true },
  { code: '003700', name: 'DPTO.PECAS MINI', active: true },
  { code: '003800', name: 'DPTO.PECAS MOTO', active: true },
  { code: '003900', name: 'DPTO.PECAS B.ACESSORIOS', active: true },
];

// ---------------------------------------------------------------------------
// De-para de contas — evento Fortes (Braga Motos) → conta + D/C Dealer
// ---------------------------------------------------------------------------

/**
 * ATENÇÃO: os códigos de evento da Braga Motos NÃO coincidem com os da Braga
 * Veículos (093 lá é "Desc. Assist. Médica", aqui é "Comissão Liberacred").
 * Este de-para foi montado a partir da tabela EVE da empresa 9277 — eventos com
 * movimento em 2026 — usando o mesmo plano de contas Dealer da Braga Veículos.
 * D/C segue a natureza do evento no Fortes (ProvDesc): provento = D, desconto = C.
 */
const eventAccountMappings = [
  // ---- PROVENTOS (débito) ----
  { eventCode: '005', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Salário-Licença' },
  { eventCode: '008', dealerAccountCode: '2.1.1.02.001', dc: 'D', description: 'Sal. Maternidade pago pela empresa' }, // compensa com INSS a recolher
  { eventCode: '010', dealerAccountCode: '2.1.1.02.001', dc: 'D', description: 'Salário-Família' }, // compensa com INSS a recolher
  { eventCode: '011', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Salário-Base' },
  { eventCode: '030', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão' },
  { eventCode: '042', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Meta - CCT' },
  { eventCode: '045', dealerAccountCode: '6.1.1.04.001', dc: 'D', description: 'Reembolso Assist. Médica Amil' },
  { eventCode: '047', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão s/ peças' },
  { eventCode: '049', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Descanso Semanal Remunerado' }, // DSR geral; o DSR de comissões é o 081
  { eventCode: '054', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'DSR Mês Anterior' },
  { eventCode: '055', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Consórcio' },
  { eventCode: '056', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Mês Anterior' },
  { eventCode: '069', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Dif. do Piso da Categoria' },
  { eventCode: '071', dealerAccountCode: '6.1.1.01.013', dc: 'D', description: 'Bonificação' },
  { eventCode: '075', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Quebra de Caixa' },
  { eventCode: '076', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão peças e acessórios' },
  { eventCode: '078', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Meta' },
  { eventCode: '079', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Complementar' },
  { eventCode: '080', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Meta Complementar' },
  { eventCode: '081', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'DSR sobre comissões' },
  { eventCode: '082', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão - Complementar' },
  { eventCode: '084', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Liberacred' },
  { eventCode: '085', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Meta Consórcio' },
  { eventCode: '090', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Líquido Negativo' },
  { eventCode: '093', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Liberacred' },
  { eventCode: '094', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Reembolso Faltas' },
  { eventCode: '095', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Reembolso DSR s/ Faltas' },
  { eventCode: '096', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Reembolso Atrasos' },
  { eventCode: '098', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Quebra de Caixa - Mês Anterior' },
  { eventCode: '099', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Complemento de Folha' },
  { eventCode: '100', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: 'Provisão Cred. Trab. - Provento' }, // conta exigida pelo motor
  { eventCode: '101', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Meta F&I' },
  { eventCode: '102', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Emplacamento' },
  { eventCode: '107', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão LEADS' },
  { eventCode: '108', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio LEADS' },
  { eventCode: '109', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Meta Semanal' },
  { eventCode: '117', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Seguros' },
  { eventCode: '199', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Saldo de Salário' },
  { eventCode: '907', dealerAccountCode: '6.1.1.04.006', dc: 'D', description: 'Reembolso de Vale-Transporte' },
  { eventCode: '949', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Diferença de Salário' },
  { eventCode: '981', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Venda de Moto' },
  { eventCode: '982', dealerAccountCode: '6.1.1.01.006', dc: 'D', description: 'Crédito banco de horas' },
  { eventCode: '984', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Mecânico' },
  { eventCode: '985', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão financiamento novos' },
  { eventCode: '989', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão F&I' },
  { eventCode: '990', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão s/ vendas' },
  { eventCode: '998', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Seguros Novos' },
  { eventCode: '999', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão - Mês Anterior' },

  // ---- DESCONTOS / RETENÇÕES (crédito) ----
  { eventCode: '037', dealerAccountCode: '6.1.1.01.005', dc: 'C', description: 'Comissão Mês Anterior (Desconto)' },
  { eventCode: '053', dealerAccountCode: '6.1.1.04.001', dc: 'C', description: 'Assistência Odontológica' },
  { eventCode: '057', dealerAccountCode: '6.1.1.01.003', dc: 'C', description: 'Prêmio Mês Anterior (Desconto)' },
  { eventCode: '086', dealerAccountCode: '6.1.1.01.006', dc: 'C', description: 'Débito de banco de horas' },
  { eventCode: '106', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Débito de Crachá' },
  { eventCode: '119', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Devolução Pagamento Indevido' },
  { eventCode: '121', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Desc. franquia da seguradora' }, // sem equivalente na Braga Veículos — confirmar
  { eventCode: '127', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '300', dealerAccountCode: '2.1.1.01.001', dc: 'C', description: 'Adiantamento Compensação' }, // sem equivalente na Braga Veículos — confirmar
  { eventCode: '310', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS' },
  { eventCode: '311', dealerAccountCode: '2.1.3.02.001', dc: 'C', description: 'IRRF' },
  { eventCode: '320', dealerAccountCode: '6.1.1.04.006', dc: 'C', description: 'Vale-Transporte' },
  { eventCode: '321', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Falta' },
  { eventCode: '335', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Descontos por danos' },
  { eventCode: '340', dealerAccountCode: '2.1.1.02.006', dc: 'C', description: 'Pensão Alimentícia' },
  { eventCode: '349', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'DSR Desconto' },
  { eventCode: '390', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Líquido Negativo Compensação' },
  { eventCode: '947', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Desconto Refeição' },
  { eventCode: '948', dealerAccountCode: '6.1.1.04.001', dc: 'C', description: 'Assistência Médica Amil' },
  { eventCode: '973', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '974', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '975', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '976', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '977', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '978', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '979', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Desconto Compra Interna' }, // sem equivalente na Braga Veículos — confirmar
  { eventCode: '983', dealerAccountCode: '1.1.4.01.004', dc: 'C', description: 'Empréstimo' },
  { eventCode: '988', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Atrasos' },
];

/**
 * Eventos sintéticos do motor (LIQUIDO_FOLHA, PROV_*, ENCARGO_*) não vêm da
 * tabela EVE: são gerados pelo pipeline e usam as mesmas contas em todas as
 * empresas do grupo. Por isso são reaproveitados da Braga Veículos.
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
// Alíquotas Braga Motos (encargos + provisões)
// ---------------------------------------------------------------------------

// Estabelecimento único (0001): RAT 3% × FAP 0,50 = GILRAT 1,5% (ES_CS_CP_Aliquotas_EST).
// FPAS 515 / Cód. Terceiros 0115 — mesmos da Braga Veículos, logo Terceiros 5,8%.
// No extract o GILRAT vem por estabelecimento e o FGTS de VALORDEPO; aqui é fallback.
const encargoRates = {
  inssEmpresa: 20.0, // 1138-01
  gilrat: 1.5, // 1646-01 (EST 0001: RAT 3% × FAP 0,50)
  terceiros: 5.8, // 1170+1176+1191+1196+1200
  fgts: 8.0, // FGTS mensal (fallback)
};

// Alíquotas de provisão (fallback sintético; extract usa PRD/PRF do Fortes)
const provisionRates = {
  feriasTerco: 11.11,   // 1/12 × 4/3 ≈ 11,11%
  decimoTerceiro: 8.33,  // 1/12 ≈ 8,33%
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

export const bragaMotosConfig = Object.freeze({
  company,
  centerMappings,
  dealerCenters,
  accountMappings,
  informativeEventCodes,
  provisionRates,
  encargoRates,
});
