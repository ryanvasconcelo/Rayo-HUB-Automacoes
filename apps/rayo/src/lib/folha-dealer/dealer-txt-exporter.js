/**
 * dealer-txt-exporter.js — Exportador de TXT para o sistema Dealer (layout 483).
 *
 * Consome o resultado do motor (PayrollAccountingRun) e gera o texto final.
 *
 * Regras:
 * - 1 entry contábil do Rayo = 1 linha TXT Dealer.
 * - Se entry.dc === 'D', preenche apenas o bloco de débito.
 * - Se entry.dc === 'C', preenche apenas o bloco de crédito.
 * - NÃO pareia D+C por valor.
 * - NÃO sintetiza contrapartida.
 * - Bloqueia com MISSING_DEALER_LOT_ACCOUNT_CODE se a conta interna não estiver mapeada.
 */

import { DEALER_LINE_LENGTH, ValidationCodes } from './contracts.js';
import { buildDealerTxtLine483, validateDealerTxtLine483, normalizeDc } from './dealer-txt-layout.js';

/**
 * @typedef {object} DealerTxtExporterOptions
 * @property {string} dealerCompanyField — ex: "01"
 * @property {string} dealerBranchField — ex: "001"
 * @property {string} accountingDate — ex: "2026-04-30"
 * @property {boolean} [requireApproval=true]
 * @property {boolean} [includeTrailingNewline=true]
 * @property {object[]} [accountMappings] — array de accountMapping para resolver dealerLotAccountCode
 */

/**
 * Resolve o dealerLotAccountCode a partir do dealerAccountCode (RCO005) e
 * do array de accountMappings do config.
 *
 * @param {string} dealerAccountCode — conta RCO005, ex: "6.1.1.01.002"
 * @param {string} dc — "D" ou "C"
 * @param {object[]} accountMappings — config.accountMappings
 * @returns {string|null}
 */
function resolveLotAccountCode(dealerAccountCode, dc, accountMappings) {
  if (!accountMappings || !dealerAccountCode) return null;
  const mapping = accountMappings.find(
    (m) => m.active && m.dealerAccountCode === dealerAccountCode && m.dc === dc
  );
  if (!mapping) return null;
  return mapping.dealerLotAccountCode || null;
}

/**
 * Exporta o resultado contábil para o layout TXT Dealer (483 caracteres).
 *
 * @param {object} runResult — PayrollAccountingRun
 * @param {DealerTxtExporterOptions} options
 * @returns {object} DealerTxtExportResult
 */
export function exportDealerTxt(runResult, options = {}) {
  const issues = [];

  const requireApproval = options.requireApproval !== false;
  const includeTrailingNewline = options.includeTrailingNewline !== false;

  // --- Validações Preliminares ---

  if (runResult.status === 'blocked') {
    issues.push({
      code: 'DEALER_TXT_EXPORT_BLOCKED',
      severity: 'blocker',
      message: 'O status do motor está blocked. Não é possível exportar.',
    });
  }

  const runBlockers = runResult.issues?.filter((i) => i.severity === 'blocker') || [];
  if (runBlockers.length > 0) {
    issues.push({
      code: 'DEALER_TXT_EXPORT_BLOCKED',
      severity: 'blocker',
      message: 'Existem issues do tipo blocker no resultado do motor.',
    });
  }

  if (requireApproval && !runResult.approval) {
    issues.push({
      code: 'DEALER_TXT_APPROVAL_REQUIRED',
      severity: 'blocker',
      message: 'Aprovação contábil é exigida para exportar o TXT final.',
    });
  }

  if (!options.dealerCompanyField || !options.dealerBranchField || !options.accountingDate) {
    issues.push({
      code: 'DEALER_TXT_MISSING_OPTION',
      severity: 'blocker',
      message: 'Campos dealerCompanyField, dealerBranchField e accountingDate são obrigatórios.',
    });
  }

  if (!runResult.entries || runResult.entries.length === 0) {
    issues.push({
      code: 'DEALER_TXT_EMPTY',
      severity: 'blocker',
      message: 'Não há lançamentos contábeis (entries) para exportar.',
    });
  }

  if (issues.length > 0) {
    return {
      content: null,
      lineCount: 0,
      lineLength: DEALER_LINE_LENGTH,
      issues,
      metadata: { runStatus: runResult.status },
    };
  }

  // --- Montar as linhas ---

  const lines = [];
  const accountMappings = options.accountMappings || [];

  for (let i = 0; i < runResult.entries.length; i++) {
    const entry = runResult.entries[i];
    const dc = normalizeDc(entry.dc);
    const sequencial = i + 1;

    // Resolver dealerLotAccountCode via entry (preferido) ou fallback para o config
    let lotAccountCode = entry.dealerLotAccountCode || resolveLotAccountCode(
      entry.accountCode, dc, accountMappings
    );
    
    // Fallback: se não tiver mapeado, usa a conta analítica sem os pontos
    if (!lotAccountCode && entry.accountCode) {
      lotAccountCode = entry.accountCode.replace(/\\./g, '');
    }

    if (!lotAccountCode) {
      issues.push({
        code: ValidationCodes.MISSING_DEALER_LOT_ACCOUNT_CODE,
        severity: 'blocker',
        message: `Entry ${sequencial}: conta "${entry.accountCode}" (${dc}) sem dealerLotAccountCode mapeado.`,
        context: {
          entryIndex: i,
          accountCode: entry.accountCode,
          dc,
          eventCode: entry.eventCode,
          lotacaoCode: entry.lotacaoCode,
        },
      });
      continue;
    }

    // Montar parâmetros para a linha
    const lineParams = {
      dealerCompanyField: options.dealerCompanyField,
      dealerBranchField: options.dealerBranchField,
      debitLotAccount: dc === 'D' ? lotAccountCode : null,
      debitCenter: dc === 'D' ? (entry.centerCode || null) : null,
      debitRcoAccount: dc === 'D' ? entry.accountCode : null,
      creditLotAccount: dc === 'C' ? lotAccountCode : null,
      creditCenter: dc === 'C' ? (entry.centerCode || null) : null,
      creditRcoAccount: dc === 'C' ? entry.accountCode : null,
      sequencial,
      history: entry.history || '',
      accountingDate: options.accountingDate,
      amountCents: entry.amountCents,
    };

    try {
      const line = buildDealerTxtLine483(lineParams);

      // Validar a linha montada
      const lineIssues = validateDealerTxtLine483(line);
      if (lineIssues.some((li) => li.severity === 'blocker')) {
        for (const li of lineIssues) {
          issues.push({
            ...li,
            message: `Linha ${sequencial}: ${li.message}`,
          });
        }
      }

      lines.push(line);
    } catch (err) {
      issues.push({
        code: ValidationCodes.INVALID_DEALER_ACCOUNT_FORMAT,
        severity: 'blocker',
        message: `Linha ${sequencial}: ${err.message}`,
        context: { entryIndex: i, accountCode: entry.accountCode },
      });
    }
  }

  if (issues.length > 0) {
    return {
      content: null,
      lineCount: 0,
      lineLength: DEALER_LINE_LENGTH,
      issues,
      metadata: { runStatus: runResult.status },
    };
  }

  // --- Gerar conteúdo final ---

  let content = lines.join('\r\n');
  if (includeTrailingNewline) {
    content += '\r\n';
  }

  return {
    content,
    lineCount: lines.length,
    lineLength: DEALER_LINE_LENGTH,
    issues: [],
    metadata: {
      dealerCompanyField: options.dealerCompanyField,
      accountingDate: options.accountingDate,
      runStatus: runResult.status,
    },
  };
}
