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
export {
  padCenterCode,
  mergeCenterMappings,
  seedPayloadFromCenterMappings,
  normalizeCentersPayload,
} from './merge-center-config.js';
export { calculateProvisions, DEFAULT_PROVISION_RATES } from './provision-calculator.js';
export { calculateEncargos, calculateEncargosFromBases, DEFAULT_ENCARGO_RATES } from './encargo-calculator.js';

// Imports internos para o pipeline
import { normalizePayrollRows } from './fortes-normalizer.js';
import { consolidatePayrollRows } from './payroll-consolidator.js';
import { buildJournal } from './journal-builder.js';
import { validateJournal, resolveStatus } from './folha-validator.js';
import { ValidationCodes } from './contracts.js';

/**
 * Avisa quando PROV_* / ENCARGO_* saíram do cálculo interno em vez do Fortes/eSocial.
 * @param {object[]} rows — PayrollSourceRow[] normalizadas.
 * @param {string} competence
 * @returns {object[]}
 */
function buildSourceIssues(rows, competence) {
  const issues = [];
  const count = (origin) => rows.filter((r) => r.sourceOrigin === origin).length;

  const syntheticProvisions = count('provision-derived');
  if (syntheticProvisions > 0) {
    issues.push({
      code: ValidationCodes.SYNTHETIC_PROVISION,
      severity: 'warning',
      message: `Provisões sem PRD/PRF do Fortes em ${competence}: ${syntheticProvisions} linhas PROV_* calculadas por alíquota (fallback). Confira com o relatório de provisão do RH.`,
      context: { competence, rows: syntheticProvisions },
    });
  }

  const syntheticEncargos = count('encargo-derived');
  if (syntheticEncargos > 0) {
    issues.push({
      code: ValidationCodes.SYNTHETIC_ENCARGO,
      severity: 'warning',
      message: `Encargos sem bases eSocial em ${competence}: ${syntheticEncargos} linhas ENCARGO_* calculadas por alíquota (fallback). Confira com a DCTFWeb/FGTS Digital.`,
      context: { competence, rows: syntheticEncargos },
    });
  }

  const unmappedEncargos = rows.filter((r) => r.sourceOrigin === 'fortes-encargo-unmapped');
  if (unmappedEncargos.length > 0) {
    const employeeReferences = new Set(
      unmappedEncargos
        .map((r) => r.sourceEmployeeReference)
        .filter(Boolean)
    );
    const sourceDescription = employeeReferences.size > 0
      ? `${employeeReferences.size} matrícula(s) eSocial`
      : 'uma ou mais bases eSocial';
    issues.push({
      code: ValidationCodes.UNMAPPED_ESOCIAL_ENCARGO,
      severity: 'warning',
      message: `Encargos de ${sourceDescription} sem empregado correspondente na folha mensal em ${competence} foram carregados no centro provisório. Ajuste o de-para antes do fechamento.`,
      context: {
        competence,
        rows: unmappedEncargos.length,
        employeeReferences: Array.from(employeeReferences),
      },
    });
  }

  return issues;
}

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
  const allIssues = [...buildSourceIssues(normalized, competence), ...builderIssues, ...validatorIssues];

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
