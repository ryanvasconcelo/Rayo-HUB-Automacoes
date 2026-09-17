/**
 * folha-dealer-centers-store.js — Persistência JSON de centros + de-para lotação.
 *
 * Arquivo: data/folha-dealer-centers-{companyId}.json
 * Seed na primeira leitura a partir de folha-dealer-centers-seed-braga.json
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_COMPANY_ID = 'braga-veiculos';

const SEED_FILES = {
  'braga-veiculos': path.join(__dirname, 'folha-dealer-centers-seed-braga.json'),
  'braga-motos': path.join(__dirname, 'folha-dealer-centers-seed-braga-motos.json'),
};

function getDataDir() {
  return process.env.FOLHA_DEALER_CENTERS_DATA_DIR
    || path.join(__dirname, 'data');
}

function padCenterCode(code) {
  const digits = String(code ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(6, '0').slice(-6);
}

function ensureDataDir() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function filePathFor(companyId) {
  const safe = String(companyId || DEFAULT_COMPANY_ID).replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(getDataDir(), `folha-dealer-centers-${safe || DEFAULT_COMPANY_ID}.json`);
}

function normalizePayload(payload, companyId) {
  const centers = (payload?.centers || [])
    .map((c) => ({
      code: padCenterCode(c.code),
      name: String(c.name || '').trim() || padCenterCode(c.code),
      active: c.active !== false,
    }))
    .filter((c) => c.code);

  const lotacaoMappings = (payload?.lotacaoMappings || []).map((m) => ({
    lotacaoCode: m.lotacaoCode ?? '',
    dealerCenterCode: padCenterCode(m.dealerCenterCode),
    allocationMode: m.allocationMode === 'activity' ? 'activity' : 'direct',
    active: m.active !== false,
  }));

  const accountMappings = (payload?.accountMappings || []).map((m) => ({
    eventCode: String(m.eventCode || '').trim(),
    dealerAccountCode: String(m.dealerAccountCode || '').trim(),
    dealerLotAccountCode: m.dealerLotAccountCode || null,
    dc: (m.dc || 'D').toUpperCase(),
    description: String(m.description || '').trim(),
    active: m.active !== false,
  })).filter(m => m.eventCode && m.dealerAccountCode);

  return {
    companyId: payload?.companyId || companyId || DEFAULT_COMPANY_ID,
    centers,
    lotacaoMappings,
    accountMappings,
    updatedAt: payload?.updatedAt || new Date().toISOString(),
  };
}

function loadSeed(companyId) {
  // Sem fallback entre empresas: seed de outra empresa contaminaria o de-para.
  const seedPath = SEED_FILES[companyId];
  if (!seedPath || !fs.existsSync(seedPath)) {
    return normalizePayload(
      { companyId, centers: [], lotacaoMappings: [], accountMappings: [] },
      companyId
    );
  }
  const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  return normalizePayload(raw, companyId);
}

/**
 * Carrega config de centros. Se o arquivo não existir, grava o seed e retorna.
 * @param {string} [companyId]
 */
function loadCentersConfig(companyId = DEFAULT_COMPANY_ID) {
  ensureDataDir();
  const filePath = filePathFor(companyId);

  if (!fs.existsSync(filePath)) {
    const seeded = loadSeed(companyId);
    seeded.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return normalizePayload(raw, companyId);
}

/**
 * Salva payload completo (centers + lotacaoMappings).
 * @param {string} companyId
 * @param {object} payload
 */
function saveCentersConfig(companyId, payload) {
  ensureDataDir();
  const normalized = normalizePayload(payload, companyId);
  normalized.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePathFor(companyId), JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

/**
 * Upsert de um de-para lotação → centro.
 * @param {string} companyId
 * @param {{ lotacaoCode: string, dealerCenterCode: string, allocationMode?: string, active?: boolean, centerName?: string }} mapping
 */
function upsertLotacaoMapping(companyId, mapping) {
  const current = loadCentersConfig(companyId);
  const dealerCenterCode = padCenterCode(mapping.dealerCenterCode);
  const lotacaoCode = mapping.lotacaoCode ?? '';

  if (!dealerCenterCode) {
    throw new Error('dealerCenterCode é obrigatório.');
  }

  const centerIdx = current.centers.findIndex((c) => c.code === dealerCenterCode);
  if (centerIdx === -1) {
    current.centers.push({
      code: dealerCenterCode,
      name: mapping.centerName || dealerCenterCode,
      active: true,
    });
  } else if (mapping.centerName) {
    current.centers[centerIdx] = {
      ...current.centers[centerIdx],
      name: mapping.centerName,
    };
  }

  const nextMapping = {
    lotacaoCode,
    dealerCenterCode,
    allocationMode: mapping.allocationMode === 'activity' ? 'activity' : 'direct',
    active: mapping.active !== false,
  };

  const mapIdx = current.lotacaoMappings.findIndex((m) => m.lotacaoCode === lotacaoCode);
  if (mapIdx === -1) {
    current.lotacaoMappings.push(nextMapping);
  } else {
    current.lotacaoMappings[mapIdx] = nextMapping;
  }

  return saveCentersConfig(companyId, current);
}

/**
 * Remove de-para por lotacaoCode.
 * @param {string} companyId
 * @param {string} lotacaoCode
 */
function deleteLotacaoMapping(companyId, lotacaoCode) {
  const current = loadCentersConfig(companyId);
  const before = current.lotacaoMappings.length;
  current.lotacaoMappings = current.lotacaoMappings.filter(
    (m) => m.lotacaoCode !== lotacaoCode
  );
  if (current.lotacaoMappings.length === before) {
    return { deleted: false, config: current };
  }
  const saved = saveCentersConfig(companyId, current);
  return { deleted: true, config: saved };
}

module.exports = {
  loadCentersConfig,
  saveCentersConfig,
  upsertLotacaoMapping,
  deleteLotacaoMapping,
  padCenterCode,
  normalizePayload,
  getDataDir,
  filePathFor,
};
