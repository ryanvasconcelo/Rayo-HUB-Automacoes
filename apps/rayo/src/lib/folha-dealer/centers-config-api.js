/**
 * centers-config-api.js — Cliente HTTP do cadastro de centros Folha Dealer.
 */

const BASE = '/api/folha-dealer/centers';

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.detalhe || `HTTP ${response.status}`);
  }
  return data;
}

/**
 * @param {string} [companyId='braga-veiculos']
 */
export async function fetchCentersConfig(companyId = 'braga-veiculos') {
  const url = `${BASE}?companyId=${encodeURIComponent(companyId)}`;
  const response = await fetch(url);
  return parseJson(response);
}

/**
 * @param {string} companyId
 * @param {{ centers: object[], lotacaoMappings: object[] }} payload
 */
export async function saveCentersConfig(companyId, payload) {
  const response = await fetch(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, ...payload }),
  });
  return parseJson(response);
}

/**
 * @param {string} companyId
 * @param {{ lotacaoCode: string, dealerCenterCode: string, allocationMode?: string, active?: boolean, centerName?: string }} mapping
 */
export async function upsertLotacaoMapping(companyId, mapping) {
  const response = await fetch(`${BASE}/lotacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, ...mapping }),
  });
  return parseJson(response);
}

/**
 * @param {string} companyId
 * @param {string} lotacaoCode
 */
export async function deleteLotacaoMapping(companyId, lotacaoCode) {
  const url = `${BASE}/lotacao/${encodeURIComponent(lotacaoCode)}?companyId=${encodeURIComponent(companyId)}`;
  const response = await fetch(url, { method: 'DELETE' });
  return parseJson(response);
}
