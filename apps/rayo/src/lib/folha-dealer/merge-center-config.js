/**
 * merge-center-config.js — Merge seed (config JS) + overrides do servidor.
 *
 * Cadastros do contador substituem o seed pela chave lotacaoCode
 * e alimentam a lista de centros Dealer.
 */

/**
 * Normaliza código de centro Dealer para 6 dígitos (ex. `999` → `000999`).
 * @param {string|number} code
 * @returns {string}
 */
export function padCenterCode(code) {
  const digits = String(code ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(6, '0').slice(-6);
}

/**
 * Converte centerMappings do config JS no payload persistido no servidor.
 * @param {string} companyId
 * @param {object[]} centerMappings
 * @returns {{ companyId: string, centers: object[], lotacaoMappings: object[] }}
 */
export function seedPayloadFromCenterMappings(companyId, centerMappings = [], accountMappings = []) {
  const centersMap = new Map();
  const lotacaoMap = new Map();
  const accountMap = new Map();

  for (const m of centerMappings) {
    const dealerCenterCode = padCenterCode(m.dealerCenterCode);
    if (dealerCenterCode && !centersMap.has(dealerCenterCode)) {
      centersMap.set(dealerCenterCode, {
        code: dealerCenterCode,
        name: m.dealerCenterName || dealerCenterCode,
        active: true,
      });
    }

    lotacaoMap.set(m.lotacaoCode, {
      lotacaoCode: m.lotacaoCode,
      dealerCenterCode,
      allocationMode: m.allocationMode || 'direct',
      active: m.active !== false,
    });
  }

  for (const m of accountMappings) {
    const dc = (m.dc || 'D').toUpperCase();
    const key = `${m.eventCode}:${dc}`;
    accountMap.set(key, {
      eventCode: m.eventCode,
      dealerAccountCode: m.dealerAccountCode,
      dealerLotAccountCode: m.dealerLotAccountCode || null,
      dc,
      description: m.description || '',
      active: m.active !== false,
    });
  }

  return {
    companyId,
    centers: [...centersMap.values()],
    lotacaoMappings: [...lotacaoMap.values()],
    accountMappings: [...accountMap.values()],
  };
}

/**
 * Normaliza payload do servidor (pad de códigos, defaults).
 * @param {object} payload
 * @param {string} [companyId]
 * @returns {{ companyId: string, centers: object[], lotacaoMappings: object[], updatedAt?: string }}
 */
export function normalizeCentersPayload(payload, companyId) {
  const centers = (payload?.centers || []).map((c) => ({
    code: padCenterCode(c.code),
    name: String(c.name || '').trim() || padCenterCode(c.code),
    active: c.active !== false,
  })).filter((c) => c.code);

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
    companyId: payload?.companyId || companyId || 'braga-veiculos',
    centers,
    lotacaoMappings,
    accountMappings,
    ...(payload?.updatedAt ? { updatedAt: payload.updatedAt } : {}),
  };
}

/**
 * Mescla seed (centerMappings do config) com payload armazenado no servidor.
 * Overrides por lotacaoCode substituem o seed; nomes vêm da lista de centros.
 *
 * @param {object[]} seedMappings — CenterMapping[] do config JS
 * @param {object|null} stored — { centers, lotacaoMappings } do servidor
 * @param {string} [companyId='braga-veiculos']
 * @returns {object[]} CenterMapping[] para o motor
 */
export function mergeCenterMappings(seedMappings = [], stored = null, companyId = 'braga-veiculos') {
  const byLotacao = new Map();

  for (const m of seedMappings) {
    byLotacao.set(m.lotacaoCode, {
      companyId: m.companyId || companyId,
      lotacaoCode: m.lotacaoCode,
      dealerCenterCode: padCenterCode(m.dealerCenterCode),
      dealerCenterName: m.dealerCenterName || null,
      allocationMode: m.allocationMode || 'direct',
      active: m.active !== false,
    });
  }

  if (!stored) {
    return [...byLotacao.values()];
  }

  const normalized = normalizeCentersPayload(stored, companyId);
  const centerNameByCode = new Map(
    normalized.centers.map((c) => [c.code, c.name])
  );

  for (const m of normalized.lotacaoMappings) {
    const code = m.dealerCenterCode;
    byLotacao.set(m.lotacaoCode, {
      companyId,
      lotacaoCode: m.lotacaoCode,
      dealerCenterCode: code,
      dealerCenterName: centerNameByCode.get(code) || null,
      allocationMode: m.allocationMode,
      active: m.active !== false,
    });
  }

  return [...byLotacao.values()];
}

/**
 * Mescla seed (accountMappings do config) com payload armazenado no servidor.
 * Overrides por eventCode substituem o seed.
 *
 * @param {object[]} seedMappings — AccountMapping[] do config JS
 * @param {object|null} stored — { accountMappings } do servidor
 * @param {string} [companyId='braga-veiculos']
 * @returns {object[]} AccountMapping[] para o motor
 */
export function mergeAccountMappings(seedMappings = [], stored = null, companyId = 'braga-veiculos') {
  const byKey = new Map();

  for (const m of seedMappings) {
    const dc = (m.dc || 'D').toUpperCase();
    const key = `${m.eventCode}:${dc}`;
    byKey.set(key, {
      companyId: m.companyId || companyId,
      eventCode: m.eventCode,
      dealerAccountCode: m.dealerAccountCode,
      dealerLotAccountCode: m.dealerLotAccountCode || null,
      dc,
      description: m.description || '',
      active: m.active !== false,
    });
  }

  if (!stored) {
    return [...byKey.values()];
  }

  const normalized = normalizeCentersPayload(stored, companyId);

  for (const m of normalized.accountMappings) {
    const dc = (m.dc || 'D').toUpperCase();
    const key = `${m.eventCode}:${dc}`;
    byKey.set(key, {
      companyId,
      eventCode: m.eventCode,
      dealerAccountCode: m.dealerAccountCode,
      dealerLotAccountCode: m.dealerLotAccountCode || null,
      dc,
      description: m.description,
      active: m.active !== false,
    });
  }

  return [...byKey.values()];
}
