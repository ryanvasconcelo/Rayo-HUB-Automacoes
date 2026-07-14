/**
 * braga-veiculos.config.js — Configuração de de-para Braga Veículos.
 *
 * Source of truth: docs/folha-dealer/braga-veiculos.md
 *
 * NOTA: fortesCompanyCode ainda pendente de confirmação via queries D1/D2.
 */

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

const company = {
  companyId: 'braga-veiculos',
  companyName: 'BRAGA VEICULOS LTDA',
  cnpj: '04.011.946/0001-04',
  fortesCompanyCode: 'PENDENTE', // confirmar no banco Fortes
  dealerCompanyField: '01',
  dealerBranch: '001',
};

// ---------------------------------------------------------------------------
// De-para de centros — lotação Fortes → centro Dealer
// ---------------------------------------------------------------------------

const centerMappings = [
  { companyId: company.companyId, lotacaoCode: 'ADM', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'RH', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'FIN', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'FISCAL', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'TI', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DIR', dealerCenterCode: '008000', dealerCenterName: 'Diretoria', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'PEC', dealerCenterCode: '000500', dealerCenterName: 'Peças', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'ACES', dealerCenterCode: '003100', dealerCenterName: 'Acessórios', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'MEC', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'FUN', dealerCenterCode: '000400', dealerCenterName: 'Funil./Pintura', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'PROD', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'AGEND', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'MEC_FIL', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'PEC_FIL', dealerCenterCode: '000500', dealerCenterName: 'Peças', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'ACES_FIL', dealerCenterCode: '003100', dealerCenterName: 'Acessórios', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'VEN', dealerCenterCode: '001000', dealerCenterName: 'Veíc. Novos', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'VD_MAT', dealerCenterCode: '000101', dealerCenterName: 'Venda Direta', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'LEADS_MAT', dealerCenterCode: '001000', dealerCenterName: 'Veíc. Novos', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'FINANC_MAT', dealerCenterCode: '001000', dealerCenterName: 'Veíc. Novos', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'FIL_NOVOS', dealerCenterCode: '001100', dealerCenterName: 'Veíc. Novos – Filial', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'FINANC_FIL', dealerCenterCode: '001100', dealerCenterName: 'Veíc. Novos – Filial', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'VD_FIL', dealerCenterCode: '000101', dealerCenterName: 'Venda Direta', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'MULTI', dealerCenterCode: '002000', dealerCenterName: 'Veíc. Usados', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'LEADS_FIL', dealerCenterCode: '001100', dealerCenterName: 'Veíc. Novos – Filial', allocationMode: 'activity', active: true },

  // ---- Nomes reais Fortes (conforme docs/folha-dealer/braga-veiculos.md) ----
  { companyId: company.companyId, lotacaoCode: 'RECURSOS HUMANOS', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'FINANCEIRO', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'FISCAL', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DIRETORIA', dealerCenterCode: '008000', dealerCenterName: 'Diretoria', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'TI', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPARTAMENTO DE PEÇAS', dealerCenterCode: '000500', dealerCenterName: 'Peças', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. DE ACESSORIOS', dealerCenterCode: '003100', dealerCenterName: 'Acessórios', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. SERVIÇOS MECANICA MATRIZ', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. FUNILARIA / PINTURA', dealerCenterCode: '000400', dealerCenterName: 'Funil./Pintura', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. PRODUTIVOS', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'AGENDAMENTOS', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. MECANICA FILIAL', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. PEÇAS FILIAL', dealerCenterCode: '000500', dealerCenterName: 'Peças', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPTO. ACESSORIOS FILIAL', dealerCenterCode: '003100', dealerCenterName: 'Acessórios', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. VENDAS VEICULOS', dealerCenterCode: '001000', dealerCenterName: 'Veíc. Novos', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. DE VENDA DIRETA MATRIZ', dealerCenterCode: '000101', dealerCenterName: 'Venda Direta', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. DE LEADS MATRIZ', dealerCenterCode: '001000', dealerCenterName: 'Veíc. Novos', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. DE FINANCIAMENTO MATRIZ', dealerCenterCode: '001000', dealerCenterName: 'Veíc. Novos', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'BRAGA VEICULOS FILIAL NOVOS', dealerCenterCode: '001100', dealerCenterName: 'Veíc. Novos – Filial', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. FINANCIAMENTO FILIAL', dealerCenterCode: '001100', dealerCenterName: 'Veíc. Novos – Filial', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPTO VENDA DIRETA FILIAL', dealerCenterCode: '000101', dealerCenterName: 'Venda Direta', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'BRAGA MULTIMARCAS', dealerCenterCode: '002000', dealerCenterName: 'Veíc. Usados', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: 'DEPT. DE LEADS FILIAL', dealerCenterCode: '001100', dealerCenterName: 'Veíc. Novos – Filial', allocationMode: 'activity', active: true },

  // ---- Códigos Reais Fortes extraídos do CSV ----
  { companyId: company.companyId, lotacaoCode: '015', dealerCenterCode: '001000', dealerCenterName: 'Veíc. Novos', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '010', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '020', dealerCenterCode: '001100', dealerCenterName: 'Veíc. Novos – Filial', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '016', dealerCenterCode: '000101', dealerCenterName: 'Venda Direta', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '006', dealerCenterCode: '000500', dealerCenterName: 'Peças', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '023', dealerCenterCode: '002000', dealerCenterName: 'Veíc. Usados', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '002', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '011', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '012', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '008', dealerCenterCode: '000300', dealerCenterName: 'Mecânica', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '003', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '022', dealerCenterCode: '000101', dealerCenterName: 'Venda Direta', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '001', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '017', dealerCenterCode: '001000', dealerCenterName: 'Veíc. Novos', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '019', dealerCenterCode: '001000', dealerCenterName: 'Veíc. Novos', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '021', dealerCenterCode: '001100', dealerCenterName: 'Veíc. Novos – Filial', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '004', dealerCenterCode: '008000', dealerCenterName: 'Diretoria', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '007', dealerCenterCode: '003100', dealerCenterName: 'Acessórios', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '005', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '014', dealerCenterCode: '003100', dealerCenterName: 'Acessórios', allocationMode: 'direct', active: true },
  { companyId: company.companyId, lotacaoCode: '024', dealerCenterCode: '001100', dealerCenterName: 'Veíc. Novos – Filial', allocationMode: 'activity', active: true },
  { companyId: company.companyId, lotacaoCode: '013', dealerCenterCode: '000500', dealerCenterName: 'Peças', allocationMode: 'direct', active: true },

  // ---- Fallback (Lotação Vazia temporária enquanto ajustamos o SQL) ----
  { companyId: company.companyId, lotacaoCode: '', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
];

// ---------------------------------------------------------------------------
// De-para de contas — evento Fortes → conta + D/C Dealer
// ---------------------------------------------------------------------------

const accountMappings = [
  // ---- PROVENTOS (débito) ----
  { companyId: company.companyId, eventCode: '004', dealerAccountCode: '6.1.1.05.002', dealerLotAccountCode: null, dc: 'D', description: 'Pró-labore', active: true },
  { companyId: company.companyId, eventCode: '010', dealerAccountCode: '2.1.1.02.001', dealerLotAccountCode: null, dc: 'D', description: 'Salário-família', active: true },
  { companyId: company.companyId, eventCode: '011', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'D', description: 'Salário-Base', active: true },
  { companyId: company.companyId, eventCode: '030', dealerAccountCode: '6.1.1.01.005', dealerLotAccountCode: null, dc: 'D', description: 'Comissões', active: true },
  { companyId: company.companyId, eventCode: '049', dealerAccountCode: '6.1.1.01.005', dealerLotAccountCode: null, dc: 'D', description: 'DSR sobre comissões', active: true },
  { companyId: company.companyId, eventCode: '078', dealerAccountCode: '6.1.1.04.001', dealerLotAccountCode: null, dc: 'D', description: 'Reembolso Assist. Médica', active: true },
  { companyId: company.companyId, eventCode: '099', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'D', description: 'Complemento de Folha', active: true },
  { companyId: company.companyId, eventCode: '075', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'D', description: 'Quebra de Caixa', active: true },
  { companyId: company.companyId, eventCode: '090', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'D', description: 'Líquido Negativo', active: true },
  { companyId: company.companyId, eventCode: '100', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: 'Provisão Cred. Trab.', active: true },
  { companyId: company.companyId, eventCode: '614', dealerAccountCode: '6.1.1.01.005', dealerLotAccountCode: null, dc: 'D', description: 'Comissão Complementar', active: true },
  { companyId: company.companyId, eventCode: '907', dealerAccountCode: '6.1.1.04.006', dealerLotAccountCode: null, dc: 'D', description: 'Reembolso de Vale Transporte', active: true },
  { companyId: company.companyId, eventCode: '956', dealerAccountCode: '6.1.1.01.003', dealerLotAccountCode: null, dc: 'D', description: 'Prêmio Meta - CCT', active: true },
  { companyId: company.companyId, eventCode: '975', dealerAccountCode: '6.1.1.01.013', dealerLotAccountCode: null, dc: 'D', description: 'Bonificação', active: true },
  { companyId: company.companyId, eventCode: '979', dealerAccountCode: '6.1.1.01.005', dealerLotAccountCode: null, dc: 'D', description: 'Comissão F&I', active: true },
  { companyId: company.companyId, eventCode: '981', dealerAccountCode: '6.1.1.01.005', dealerLotAccountCode: null, dc: 'D', description: 'Comissão Venda Leads', active: true },
  { companyId: company.companyId, eventCode: '988', dealerAccountCode: '6.1.1.01.013', dealerLotAccountCode: null, dc: 'D', description: 'Bonificação Mês Anterior', active: true },
  { companyId: company.companyId, eventCode: '991', dealerAccountCode: '6.1.1.01.003', dealerLotAccountCode: null, dc: 'D', description: 'Prêmio Captação Semi Novos', active: true },

  // ---- DESCONTOS / RETENÇÕES (crédito) ----
  { companyId: company.companyId, eventCode: 'LIQUIDO_FOLHA', dealerAccountCode: '2.1.1.01.001', dealerLotAccountCode: null, dc: 'C', description: 'Ordenados e Salários a Pagar', active: true },
  { companyId: company.companyId, eventCode: '127', dealerAccountCode: '2.1.1.02.007', dealerLotAccountCode: null, dc: 'C', description: 'Consignado Crédito Trab.', active: true },
  { companyId: company.companyId, eventCode: '302', dealerAccountCode: '6.1.1.04.001', dealerLotAccountCode: null, dc: 'C', description: 'Assistência Médica Amil', active: true },
  { companyId: company.companyId, eventCode: '310', dealerAccountCode: '2.1.1.02.001', dealerLotAccountCode: null, dc: 'C', description: 'INSS', active: true },
  { companyId: company.companyId, eventCode: '311', dealerAccountCode: '2.1.3.02.001', dealerLotAccountCode: null, dc: 'C', description: 'IRRF', active: true },
  { companyId: company.companyId, eventCode: '320', dealerAccountCode: '6.1.1.04.006', dealerLotAccountCode: null, dc: 'C', description: 'Vale-Transporte', active: true },
  { companyId: company.companyId, eventCode: '321', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'C', description: 'Falta', active: true },
  { companyId: company.companyId, eventCode: '340', dealerAccountCode: '2.1.1.02.006', dealerLotAccountCode: null, dc: 'C', description: 'Pensão Alimentícia', active: true },
  { companyId: company.companyId, eventCode: '349', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'C', description: 'DSR Desconto', active: true },
  { companyId: company.companyId, eventCode: '909', dealerAccountCode: '6.1.1.04.001', dealerLotAccountCode: null, dc: 'C', description: 'Assistência Odontológica', active: true },
  { companyId: company.companyId, eventCode: '947', dealerAccountCode: '6.1.1.04.003', dealerLotAccountCode: null, dc: 'C', description: 'Des. Refeição', active: true },
  { companyId: company.companyId, eventCode: '962', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'C', description: 'Atrasos', active: true },
  { companyId: company.companyId, eventCode: '963', dealerAccountCode: '2.1.1.02.007', dealerLotAccountCode: null, dc: 'C', description: 'Consignado', active: true },
  { companyId: company.companyId, eventCode: '964', dealerAccountCode: '2.1.1.02.007', dealerLotAccountCode: null, dc: 'C', description: 'Consignado', active: true },
  { companyId: company.companyId, eventCode: '965', dealerAccountCode: '2.1.1.02.007', dealerLotAccountCode: null, dc: 'C', description: 'Consignado', active: true },
  { companyId: company.companyId, eventCode: '966', dealerAccountCode: '2.1.1.02.007', dealerLotAccountCode: null, dc: 'C', description: 'Consignado', active: true },
  { companyId: company.companyId, eventCode: '967', dealerAccountCode: '2.1.1.02.007', dealerLotAccountCode: null, dc: 'C', description: 'Consignado', active: true },
  { companyId: company.companyId, eventCode: '968', dealerAccountCode: '2.1.1.02.007', dealerLotAccountCode: null, dc: 'C', description: 'Consignado', active: true },
  { companyId: company.companyId, eventCode: '969', dealerAccountCode: '2.1.1.02.007', dealerLotAccountCode: null, dc: 'C', description: 'Consignado', active: true },
  { companyId: company.companyId, eventCode: '970', dealerAccountCode: '2.1.1.02.007', dealerLotAccountCode: null, dc: 'C', description: 'Consignado', active: true },
  { companyId: company.companyId, eventCode: '985', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'C', description: 'Descontos por danos', active: true },
  { companyId: company.companyId, eventCode: '986', dealerAccountCode: '1.1.4.01.004', dealerLotAccountCode: null, dc: 'C', description: 'Empréstimo', active: true },
  { companyId: company.companyId, eventCode: '987', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'C', description: 'Débito de Crachá', active: true },
  { companyId: company.companyId, eventCode: '989', dealerAccountCode: '6.1.1.01.013', dealerLotAccountCode: null, dc: 'C', description: 'Estorno Bonificação', active: true },

  // ---- PROVISÕES TRABALHISTAS (débito = despesa 6.1.1.03.xxx) ----
  { companyId: company.companyId, eventCode: 'PROV_FERIAS',   dealerAccountCode: '6.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: 'Férias e 1/3 de Férias', active: true },
  { companyId: company.companyId, eventCode: 'PROV_13',       dealerAccountCode: '6.1.1.03.002', dealerLotAccountCode: null, dc: 'D', description: '13º Salário', active: true },
  { companyId: company.companyId, eventCode: 'PROV_INSS_FER', dealerAccountCode: '6.1.1.03.003', dealerLotAccountCode: null, dc: 'D', description: 'INSS s/ Férias', active: true },
  { companyId: company.companyId, eventCode: 'PROV_INSS_13',  dealerAccountCode: '6.1.1.03.004', dealerLotAccountCode: null, dc: 'D', description: 'INSS s/ 13º Salário', active: true },
  { companyId: company.companyId, eventCode: 'PROV_FGTS_FER', dealerAccountCode: '6.1.1.03.005', dealerLotAccountCode: null, dc: 'D', description: 'FGTS s/ Férias', active: true },
  { companyId: company.companyId, eventCode: 'PROV_FGTS_13',  dealerAccountCode: '6.1.1.03.006', dealerLotAccountCode: null, dc: 'D', description: 'FGTS s/ 13º Salário', active: true },

  // ---- PROVISÕES TRABALHISTAS (crédito = passivo 2.1.1.03.xxx) ----
  // Pareamento D↔C confirmado pelo RCO005 (NÃO é sequencial)
  { companyId: company.companyId, eventCode: 'PROV_FERIAS',   dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'C', description: 'Provisão Férias a Pagar', active: true },
  { companyId: company.companyId, eventCode: 'PROV_13',       dealerAccountCode: '2.1.1.03.004', dealerLotAccountCode: null, dc: 'C', description: 'Provisão 13º a Pagar', active: true },
  { companyId: company.companyId, eventCode: 'PROV_INSS_FER', dealerAccountCode: '2.1.1.03.002', dealerLotAccountCode: null, dc: 'C', description: 'Provisão INSS Férias a Pagar', active: true },
  { companyId: company.companyId, eventCode: 'PROV_INSS_13',  dealerAccountCode: '2.1.1.03.005', dealerLotAccountCode: null, dc: 'C', description: 'Provisão INSS 13º a Pagar', active: true },
  { companyId: company.companyId, eventCode: 'PROV_FGTS_FER', dealerAccountCode: '2.1.1.03.003', dealerLotAccountCode: null, dc: 'C', description: 'Provisão FGTS Férias a Pagar', active: true },
  { companyId: company.companyId, eventCode: 'PROV_FGTS_13',  dealerAccountCode: '2.1.1.03.006', dealerLotAccountCode: null, dc: 'C', description: 'Provisão FGTS 13º a Pagar', active: true },
];

// ---------------------------------------------------------------------------
// Alíquotas de provisão Braga Veículos
// ---------------------------------------------------------------------------

const provisionRates = {
  feriasTerco: 11.11,   // 1/12 × 4/3 ≈ 11,11%
  decimoTerceiro: 8.33,  // 1/12 ≈ 8,33%
  inssPatronal: 28.80,   // 20% + RAT + Terceiros ≈ 28,80%
  fgts: 8.00,            // 8,00%
};

// ---------------------------------------------------------------------------
// Eventos informativos Braga (complementar ao set global)
// ---------------------------------------------------------------------------

const informativeEventCodes = ['600', '601', '602', '603', '604', '605', '937', '938'];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const bragaVeiculosConfig = Object.freeze({
  company,
  centerMappings,
  accountMappings,
  informativeEventCodes,
  provisionRates,
});
