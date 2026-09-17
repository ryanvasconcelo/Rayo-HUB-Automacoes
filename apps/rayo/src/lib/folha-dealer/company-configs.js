/**
 * company-configs.js — Registro das empresas habilitadas no Folha → Dealer.
 *
 * Resolve o config pelo `companyId` interno ('braga-veiculos') ou pelo código
 * da empresa no Fortes ('9274'), que é o valor escolhido na tela de extração.
 */

import { bragaVeiculosConfig } from './braga-veiculos.config.js';
import { bragaMotosConfig } from './braga-motos.config.js';

const CONFIGS = [bragaVeiculosConfig, bragaMotosConfig];

const BY_COMPANY_ID = new Map(CONFIGS.map((c) => [c.company.companyId, c]));
const BY_FORTES_CODE = new Map(CONFIGS.map((c) => [c.company.fortesCompanyCode, c]));

/** Empresas para popular o seletor da tela. */
export const FOLHA_DEALER_COMPANIES = CONFIGS.map((c) => ({
  companyId: c.company.companyId,
  companyName: c.company.companyName,
  fortesCompanyCode: c.company.fortesCompanyCode,
  dealerCompanyField: c.company.dealerCompanyField,
  dealerBranch: c.company.dealerBranch,
}));

export const DEFAULT_COMPANY_ID = bragaVeiculosConfig.company.companyId;

/**
 * @param {string} companyId — id interno (ex.: 'braga-motos').
 * @returns {object} config da empresa.
 */
export function getCompanyConfig(companyId) {
  const config = BY_COMPANY_ID.get(companyId);
  if (!config) {
    throw new Error(`Empresa ${companyId} não possui configuração Folha → Dealer.`);
  }
  return config;
}

/**
 * @param {string} fortesCompanyCode — código da empresa no Fortes (ex.: '9277').
 * @returns {object} config da empresa.
 */
export function getCompanyConfigByFortesCode(fortesCompanyCode) {
  const config = BY_FORTES_CODE.get(String(fortesCompanyCode));
  if (!config) {
    throw new Error(`Empresa ${fortesCompanyCode} não possui configuração Folha → Dealer.`);
  }
  return config;
}
