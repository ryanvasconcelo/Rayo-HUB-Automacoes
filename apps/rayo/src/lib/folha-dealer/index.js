/**
 * index.js — Orquestrador do motor Folha Fortes → Dealer.
 *
 * Exporta a função principal `runFolhaDealerEngine` e re-exporta
 * as peças individuais para uso direto em testes.
 *
 * Pipeline:
 *   sourceRows → normalize → consolidate → buildJournal → validate → PayrollAccountingRun
 */

// Re-exports públicos
export { bragaVeiculosConfig } from './braga-veiculos.config.js';
export { buildBragaRows, buildBragaRowsFortes } from './braga-veiculos.fixtures.js';
export { normalizePayrollRows } from './fortes-normalizer.js';
export { consolidatePayrollRows } from './payroll-consolidator.js';
export { mapCenter } from './center-mapper.js';
export { mapAccount } from './account-mapper.js';
export { buildJournal } from './journal-builder.js';
export { validateJournal, resolveStatus } from './folha-validator.js';
export { exportConferenceXlsx } from './conference-xlsx-exporter.js';
export { buildDealerTxtLine, buildDealerTxtSegments } from './dealer-txt-layout.js';
export {
  buildDealerTxtLine483,
  validateDealerTxtLine483,
  formatDealerLotAccount,
  formatMoneyDealerComma,
  sanitizeHistory,
  stripDiacritics,
} from './dealer-txt-layout.js';
export { exportDealerTxt } from './dealer-txt-exporter.js';
export {
  BATCH_TYPE,
  DEALER_LINE_LENGTH,
  INFORMATIVE_EVENT_CODES,
  EVENT_100_REQUIRED_ACCOUNT,
  ValidationCodes,
  buildHistory,
  accountClass,
  accountRequiresCenter,
} from './contracts.js';

export {
  createFolhaDealerRun,
  approveFolhaDealerRun,
  exportApprovedDealerTxt,
  exportRunConferenceXlsx
} from './folha-dealer-run-service.js';

export { summarizeValidationIssues } from './validation-summarizer.js';

// Imports internos para o pipeline
import { normalizePayrollRows } from './fortes-normalizer.js';
import { consolidatePayrollRows } from './payroll-consolidator.js';
import { buildJournal } from './journal-builder.js';
import { validateJournal, resolveStatus } from './folha-validator.js';

/**
 * Executa o motor completo para uma competência.
 *
 * @param {object} params
 * @param {object}   params.config       — configuração da empresa (centerMappings, accountMappings, etc.).
 * @param {object[]} params.sourceRows   — PayrollSourceRow[] de qualquer origem.
 * @param {string}   params.competence   — competência no formato YYYY-MM.
 * @returns {object} PayrollAccountingRun
 */
export function runFolhaDealerEngine({ config, sourceRows, competence }) {
  // 1. Normalizar
  const normalized = normalizePayrollRows(sourceRows);

  // 2. Consolidar por companyId + competence + lotacaoCode + eventCode
  const consolidatedItems = consolidatePayrollRows(normalized);

  // 3. Gerar journal + issues inline
  const { entries, issues: builderIssues } = buildJournal({
    consolidatedItems,
    config,
    competence,
  });

  // 4. Validar journal final
  const validatorIssues = validateJournal(entries, builderIssues);

  // 5. Merge issues
  const allIssues = [...builderIssues, ...validatorIssues];

  // 6. Resolver status
  const status = resolveStatus(allIssues);

  return {
    companyId: config.company.companyId,
    competence,
    sourceRows: normalized,
    consolidatedItems,
    entries,
    issues: allIssues,
    status,
  };
}
