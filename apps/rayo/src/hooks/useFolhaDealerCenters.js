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
 * Hook de cadastro de centros + de-para lotação (API servidor).
 * Expõe payload editável, merge com seed e CRUD.
 */
export function useFolhaDealerCenters(companyId = DEFAULT_COMPANY_ID) {
  const [stored, setStored] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(true);

  const seedConfig = useMemo(() => getCompanyConfig(companyId), [companyId]);
  const seedMappings = seedConfig.centerMappings;
  const seedAccountMappings = seedConfig.accountMappings;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCentersConfig(companyId);
      setStored(normalizeCentersPayload(data, companyId));
      setApiAvailable(true);
    } catch (err) {
      setApiAvailable(false);
      setError(err.message);
      setStored(seedPayloadFromCenterMappings(companyId, seedMappings, seedAccountMappings));
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
      const saved = await apiSaveCentersConfig(companyId, payload);
      const normalized = normalizeCentersPayload(saved, companyId);
      setStored(normalized);
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
      setStored(normalized);
      setApiAvailable(true);
      return normalized;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [companyId]);

  const removeLotacao = useCallback(async (lotacaoCode) => {
    setSaving(true);
    setError(null);
    try {
      const result = await apiDeleteLotacao(companyId, lotacaoCode);
      const normalized = normalizeCentersPayload(result.config || result, companyId);
      setStored(normalized);
      setApiAvailable(true);
      return normalized;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [companyId]);

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
    reload: load,
    saveAll,
    upsertLotacao,
    removeLotacao,
  };
}
