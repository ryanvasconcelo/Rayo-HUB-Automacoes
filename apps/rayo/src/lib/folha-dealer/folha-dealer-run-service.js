import { runFolhaDealerEngine } from './index.js';
import { exportDealerTxt } from './dealer-txt-exporter.js';
import { exportConferenceXlsx } from './conference-xlsx-exporter.js';

/**
 * Cria uma execução do motor contábil Folha -> Dealer.
 * @param {object[]} sourceRows - Linhas da origem (PayrollSourceRow[]).
 * @param {object} options - Opções, contendo `config` e `competence`.
 * @returns {object} PayrollAccountingRun
 */
export function createFolhaDealerRun(sourceRows, options) {
  console.log("createFolhaDealerRun args:", sourceRows?.length, options ? Object.keys(options) : "OPTIONS IS UNDEFINED");
  return runFolhaDealerEngine({
    sourceRows,
    config: options.config,
    competence: options.competence
  });
}

/**
 * Registra a aprovação da execução.
 * @param {object} run - O resultado do motor (PayrollAccountingRun).
 * @param {object} approvalData - Dados da aprovação (approvedBy, approvedAt, notes).
 * @returns {object} Novo PayrollAccountingRun atualizado.
 */
export function approveFolhaDealerRun(run, approvalData) {
  if (run.status !== 'ready') {
    throw new Error(`Não é possível aprovar uma execução com status '${run.status}'.`);
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const entry of run.entries || []) {
    if (entry.dc === 'D') {
      totalDebit += entry.amountCents;
    } else if (entry.dc === 'C') {
      totalCredit += entry.amountCents;
    }
  }

  return {
    ...run,
    status: 'approved',
    approval: {
      approvedBy: approvalData.approvedBy,
      approvedAt: approvalData.approvedAt || new Date().toISOString(),
      notes: approvalData.notes || null,
      entriesCount: run.entries ? run.entries.length : 0,
      issuesCount: run.issues ? run.issues.length : 0,
      totals: {
        debitCents: totalDebit,
        creditCents: totalCredit
      }
    }
  };
}

/**
 * Exporta o arquivo TXT do Dealer após aprovação.
 * @param {object} run - O resultado do motor com status 'approved'.
 * @param {object} options - Opções de layout (dealerCompanyField, dealerBranchField, accountingDate).
 * @returns {{ run: object, content: string }}
 */
export function exportApprovedDealerTxt(run, options) {
  if (run.status !== 'approved') {
    throw new Error(`Execução não aprovada. Status atual: ${run.status}.`);
  }

  const exportResult = exportDealerTxt(run, options);

  if (exportResult.issues && exportResult.issues.length > 0) {
    throw new Error(`Falha na exportação do TXT: ${exportResult.issues[0].message}`);
  }

  return {
    run: {
      ...run,
      status: 'exported',
      exportMetadata: exportResult.metadata
    },
    content: exportResult.content
  };
}

/**
 * Exporta a planilha de conferência. Pode ser gerada mesmo com blockers.
 * @param {object} run - Resultado do motor (PayrollAccountingRun).
 * @param {object} options - Opções contendo `config`.
 * @returns {Buffer} XLSX Buffer
 */
export function exportRunConferenceXlsx(run, options) {
  return exportConferenceXlsx(run, options.config);
}
