import { useState } from 'react';
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

export function useFolhaDealer() {
  const [runData, setRunData] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  const processRun = (companyId, competence) => {
    try {
      setError(null);
      
      let sourceRows = [];
      let currentConfig = null;

      if (companyId === 'BRAGA_VEICULOS') {
        sourceRows = buildBragaRowsFortes(competence);
        currentConfig = bragaVeiculosConfig;
      } else {
        throw new Error(`A empresa ${companyId} não possui configuração/fixtures implementados ainda.`);
      }

      setConfig(currentConfig);

      const newRun = createFolhaDealerRun(sourceRows, {
        config: currentConfig,
        competence
      });

      setRunData(newRun);
      setMetadata(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const processCsvFortes = (csvContent, targetCompanyId, targetCompetence) => {
    try {
      setError(null);
      const { metadata: newMetadata, rawRows } = parseFortesCsv(csvContent, targetCompanyId, targetCompetence);
      setMetadata(newMetadata);

      if (rawRows.length === 0) {
        throw new Error('Nenhuma linha encontrada para a empresa e competência informadas no CSV.');
      }

      let payrollRows = normalizeFortesQueryRows(rawRows);
      // Forçar 'braga-veiculos' para bater com as chaves do de-para do motor.
      payrollRows = payrollRows.map(row => ({
        ...row,
        companyId: 'braga-veiculos'
      }));

      setConfig(bragaVeiculosConfig);

      const newRun = createFolhaDealerRun(payrollRows, {
        config: bragaVeiculosConfig,
        competence: targetCompetence
      });

      setRunData(newRun);
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

      setMetadata({
        totalLinhasFortes: rawRows.length,
        empresa: rawRows[0]?.companyName || companyId,
        competencia: competence,
      });

      let payrollRows = normalizeFortesQueryRows(rawRows);
      
      // Forçar 'braga-veiculos' se for 9274 para bater com o de-para do mock atual
      if (companyId === '9274' || companyId === 'BRAGA_VEICULOS') {
        payrollRows = payrollRows.map(row => ({
          ...row,
          companyId: 'braga-veiculos'
        }));
        setConfig(bragaVeiculosConfig);
      } else {
        throw new Error(`Empresa ${companyId} não suportada pelos mocks atuais.`);
      }

      const newRun = createFolhaDealerRun(payrollRows, {
        config: bragaVeiculosConfig,
        competence
      });

      setRunData(newRun);
    } catch (err) {
      setError(err.message);
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
      
      // Converte o buffer gerado pelo XLSX (que no navegador pode ser um Uint8Array) em Blob
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
    metadata,
    summary: runData ? summarizeValidationIssues(runData) : null,
    processRun,
    processCsvFortes,
    extractFromDatabase,
    approveRun,
    downloadExcel,
    downloadTxt
  };
}
