import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_COMPANY_ID,
  getCompanyConfig,
} from '../lib/folha-dealer/company-configs.js';
import {
  fetchCentersConfig,
  saveCentersConfig as apiSaveCentersConfig,
  upsertLotacaoMapping as apiUpsertLotacao,
  deleteLotacaoMapping as apiDeleteLotacao,
} from '../lib/folha-dealer/centers-config-api.js';
import {
  mergeCenterMappings,
  normalizeCentersPayload,
  seedPayloadFromCenterMappings,
  mergeAccountMappings,
} from '../lib/folha-dealer/merge-center-config.js';

/**
 * Se o JSON do servidor ainda não tem contas (bug antigo do PUT),
 * hidrata a lista editável a partir do seed do config JS.
 */
function hydrateStoredFromSeed(normalized, companyId, seedMappings, seedAccountMappings) {
  const next = { ...normalized };
  const seedPayload = seedPayloadFromCenterMappings(
    companyId,
    seedMappings,
    seedAccountMappings
  );

  if ((!next.accountMappings || next.accountMappings.length === 0) && seedPayload.accountMappings.length > 0) {
    next.accountMappings = seedPayload.accountMappings;
  }

  // Centros/lotações: se arquivo veio vazio, usa seed (primeira abertura)
  if ((!next.centers || next.centers.length === 0) && seedPayload.centers.length > 0) {
    next.centers = seedPayload.centers;
  }
  if ((!next.lotacaoMappings || next.lotacaoMappings.length === 0) && seedPayload.lotacaoMappings.length > 0) {
    next.lotacaoMappings = seedPayload.lotacaoMappings;
  }

  return next;
}

/**
 * Hook de cadastro de centros + de-para lotação + evento→conta (API servidor).
 */
export function useFolhaDealerCenters(companyId = DEFAULT_COMPANY_ID) {
  const [stored, setStored] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(true);
  /** true quando contas vieram do seed JS porque o JSON do servidor estava vazio */
  const [accountsHydratedFromSeed, setAccountsHydratedFromSeed] = useState(false);

  const seedConfig = useMemo(() => getCompanyConfig(companyId), [companyId]);
  const seedMappings = seedConfig.centerMappings;
  const seedAccountMappings = seedConfig.accountMappings;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCentersConfig(companyId);
      const normalized = normalizeCentersPayload(data, companyId);
      const serverHadNoAccounts = (normalized.accountMappings || []).length === 0;
      const hydrated = hydrateStoredFromSeed(
        normalized,
        companyId,
        seedMappings,
        seedAccountMappings
      );
      setStored(hydrated);
      setAccountsHydratedFromSeed(
        serverHadNoAccounts && (hydrated.accountMappings || []).length > 0
      );
      setApiAvailable(true);
    } catch (err) {
      setApiAvailable(false);
      setError(err.message);
      setStored(seedPayloadFromCenterMappings(companyId, seedMappings, seedAccountMappings));
      setAccountsHydratedFromSeed(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, seedMappings, seedAccountMappings]);

  useEffect(() => {
    load();
  }, [load]);

  const mergedCenterMappings = mergeCenterMappings(seedMappings, stored, companyId);
  const mergedAccountMappings = mergeAccountMappings(seedAccountMappings, stored, companyId);

  const saveAll = useCallback(async (payload) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiSaveCentersConfig(companyId, {
        centers: payload.centers,
        lotacaoMappings: payload.lotacaoMappings,
        accountMappings: payload.accountMappings || [],
      });
      const normalized = normalizeCentersPayload(saved, companyId);
      setStored(normalized);
      setAccountsHydratedFromSeed(false);
      setApiAvailable(true);
      return normalized;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [companyId]);

  const upsertLotacao = useCallback(async (mapping) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiUpsertLotacao(companyId, mapping);
      const normalized = normalizeCentersPayload(saved, companyId);
      setStored(
        hydrateStoredFromSeed(normalized, companyId, seedMappings, seedAccountMappings)
      );
      setApiAvailable(true);
      return normalized;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [companyId, seedMappings, seedAccountMappings]);

  const removeLotacao = useCallback(async (lotacaoCode) => {
    setSaving(true);
    setError(null);
    try {
      const result = await apiDeleteLotacao(companyId, lotacaoCode);
      const normalized = normalizeCentersPayload(result.config || result, companyId);
      setStored(
        hydrateStoredFromSeed(normalized, companyId, seedMappings, seedAccountMappings)
      );
      setApiAvailable(true);
      return normalized;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [companyId, seedMappings, seedAccountMappings]);

  return {
    companyId,
    stored,
    setStored,
    mergedCenterMappings,
    mergedAccountMappings,
    loading,
    saving,
    error,
    apiAvailable,
    accountsHydratedFromSeed,
    reload: load,
    saveAll,
    upsertLotacao,
    removeLotacao,
  };
}
