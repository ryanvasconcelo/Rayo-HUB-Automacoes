import { useState, useCallback } from 'react';
import {
  createFolhaDealerRun,
  approveFolhaDealerRun,
  exportApprovedDealerTxt,
  exportRunConferenceXlsx,
  buildBragaRowsFortes,
  bragaVeiculosConfig,
  summarizeValidationIssues
} from '../lib/folha-dealer';
import { normalizeFortesQueryRows } from '../lib/folha-dealer/fortes-query-adapter';
import { parseFortesCsv } from '../lib/folha-dealer/fortes-csv-parser';
import { fetchCentersConfig } from '../lib/folha-dealer/centers-config-api';
import { mergeCenterMappings } from '../lib/folha-dealer/merge-center-config';

const COMPANY_ID = 'braga-veiculos';

const formatCents = (cents) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Aviso quando parte da base eSocial não casou com empregado da folha mensal. */
function describeEncargoCoverage(coverage) {
  if (!coverage) return null;
  const gaps = [
    ['BC CPP', coverage.bcCpCents],
    ['FGTS', coverage.fgtsDepoCents],
  ].filter(([, c]) => c && c.missing !== 0);
  if (gaps.length === 0) return null;
  const detail = gaps
    .map(([label, c]) => `${label} ${formatCents(c.extracted)} de ${formatCents(c.expected)}`)
    .join('; ');
  return `Bases eSocial sem empregado na folha mensal (encargos incompletos): ${detail}.`;
}

async function resolveRuntimeConfig() {
  let centersWarning = null;
  let stored = null;

  try {
    stored = await fetchCentersConfig(COMPANY_ID);
  } catch (err) {
    centersWarning = `Cadastro de centros indisponível (${err.message}). Usando seed do config.`;
  }

  const centerMappings = mergeCenterMappings(
    bragaVeiculosConfig.centerMappings,
    stored,
    COMPANY_ID
  );

  return {
    config: { ...bragaVeiculosConfig, centerMappings },
    centersWarning,
  };
}

export function useFolhaDealer() {
  const [runData, setRunData] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [lastSourceRows, setLastSourceRows] = useState(null);
  const [lastCompetence, setLastCompetence] = useState(null);

  const runWithConfig = useCallback((sourceRows, competence, runtimeConfig, centersWarning) => {
    setConfig(runtimeConfig);
    setWarning(centersWarning);
    setLastSourceRows(sourceRows);
    setLastCompetence(competence);

    const newRun = createFolhaDealerRun(sourceRows, {
      config: runtimeConfig,
      competence,
    });
    setRunData(newRun);
  }, []);

  const processRun = async (companyId, competence) => {
    try {
      setError(null);

      let sourceRows = [];
      if (companyId === 'BRAGA_VEICULOS') {
        sourceRows = buildBragaRowsFortes(competence);
      } else {
        throw new Error(`A empresa ${companyId} não possui configuração/fixtures implementados ainda.`);
      }

      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      runWithConfig(sourceRows, competence, runtimeConfig, centersWarning);
      setMetadata(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const processCsvFortes = async (csvContent, targetCompanyId, targetCompetence) => {
    try {
      setError(null);
      const { metadata: newMetadata, rawRows } = parseFortesCsv(csvContent, targetCompanyId, targetCompetence);
      setMetadata(newMetadata);

      if (rawRows.length === 0) {
        throw new Error('Nenhuma linha encontrada para a empresa e competência informadas no CSV.');
      }

      let payrollRows = normalizeFortesQueryRows(
        rawRows,
        {},
        bragaVeiculosConfig.provisionRates,
        bragaVeiculosConfig.encargoRates
      );
      payrollRows = payrollRows.map(row => ({
        ...row,
        companyId: COMPANY_ID
      }));

      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      runWithConfig(payrollRows, targetCompetence, runtimeConfig, centersWarning);
    } catch (err) {
      setError(err.message);
    }
  };

  const extractFromDatabase = async (companyId, competence) => {
    try {
      setError(null);
      setMetadata(null);

      const response = await fetch('/api/fortes/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, competence })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro na extração do banco de dados.');
      }

      const rawRows = result.data;
      if (!rawRows || rawRows.length === 0) {
        throw new Error('Nenhuma linha encontrada no banco para esta competência.');
      }

      const folhaSeqList = [...new Set(
        rawRows
          .map((row) => row.sourcePayrollId)
          .filter((id) => id !== null && id !== undefined && String(id).trim() !== '')
          .map((id) => String(id))
      )].sort((a, b) => Number(a) - Number(b));

      setMetadata({
        totalLinhasFortes: rawRows.length,
        empresa: rawRows[0]?.companyName || companyId,
        competencia: competence,
        folhaSeq: folhaSeqList[0] || null,
        folhaSeqs: folhaSeqList,
        quantidadeFolhas: folhaSeqList.length,
        provisoesFortes: Array.isArray(result.provisions) ? result.provisions.length : 0,
        encargosBases: Array.isArray(result.encargoBases) ? result.encargoBases.length : 0,
      });

      // PRD/PRF e bases eSocial vazios caem no fallback sintético (o motor emite warning)
      let payrollRows = normalizeFortesQueryRows(
        rawRows,
        {
          fortesProvisions: Array.isArray(result.provisions) ? result.provisions : [],
          fortesEncargoBases: Array.isArray(result.encargoBases) ? result.encargoBases : [],
        },
        bragaVeiculosConfig.provisionRates,
        bragaVeiculosConfig.encargoRates
      );

      if (companyId === '9274' || companyId === 'BRAGA_VEICULOS') {
        payrollRows = payrollRows.map(row => ({
          ...row,
          companyId: COMPANY_ID
        }));
      } else {
        throw new Error(`Empresa ${companyId} não suportada pelos mocks atuais.`);
      }

      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      const extractWarning = [centersWarning, describeEncargoCoverage(result.encargoCoverage)]
        .filter(Boolean)
        .join(' ');
      runWithConfig(payrollRows, competence, runtimeConfig, extractWarning || null);
    } catch (err) {
      setError(err.message);
    }
  };

  const reprocessLastRun = async () => {
    if (!lastSourceRows || !lastCompetence) {
      throw new Error('Não há lote anterior para reprocessar. Extraia a folha novamente.');
    }
    try {
      setError(null);
      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      runWithConfig(lastSourceRows, lastCompetence, runtimeConfig, centersWarning);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const approveRun = (approvedBy, notes) => {
    if (!runData) return;
    try {
      setError(null);
      const approved = approveFolhaDealerRun(runData, { approvedBy, notes });
      setRunData(approved);
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadExcel = () => {
    if (!runData || !config) return;
    try {
      setError(null);
      const buffer = exportRunConferenceXlsx(runData, { config });

      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `folha_dealer_${runData.companyId}_${runData.competence}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadTxt = (dealerCompanyField, dealerBranchField, accountingDate) => {
    if (!runData) return;
    try {
      setError(null);

      if (!dealerCompanyField || !dealerBranchField || !accountingDate) {
        throw new Error('Empresa Dealer, Filial Dealer e Data Contábil são obrigatórios para exportar o TXT.');
      }

      const normCompany = String(dealerCompanyField).trim().padStart(2, '0');
      const normBranch = String(dealerBranchField).trim().padStart(3, '0');

      if (normCompany.length !== 2) {
        throw new Error(`A Empresa Dealer deve ter exatamente 2 caracteres. Atual: ${normCompany}`);
      }

      if (normBranch.length !== 3) {
        throw new Error(`A Filial Dealer deve ter exatamente 3 caracteres. Atual: ${normBranch}`);
      }

      if (accountingDate.includes('undefined') || accountingDate.includes('null')) {
        throw new Error('Data contábil possui formato inválido.');
      }

      const { run: newRun, content } = exportApprovedDealerTxt(runData, {
        dealerCompanyField: normCompany,
        dealerBranchField: normBranch,
        accountingDate
      });

      if (content.includes('undefined') || content.includes('null') || content.includes('Invalid Date')) {
        throw new Error('A exportação gerou dados inválidos (undefined, null ou Invalid Date). Verifique as parametrizações.');
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lote_dealer_${runData.companyId}_${runData.competence}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      setRunData(newRun);
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    run: runData,
    config,
    error,
    warning,
    metadata,
    summary: runData ? summarizeValidationIssues(runData) : null,
    processRun,
    processCsvFortes,
    extractFromDatabase,
    reprocessLastRun,
    approveRun,
    downloadExcel,
    downloadTxt
  };
}
