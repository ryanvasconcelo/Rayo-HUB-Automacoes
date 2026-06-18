/**
 * folha-validator.js — Validações pós-geração de lançamentos.
 *
 * Validações neste módulo:
 * - UNBALANCED_JOURNAL: total D ≠ total C.
 * - CENTER_ON_BALANCE_ACCOUNT: conta 1/2 com centro preenchido.
 *
 * As demais validações (MISSING_ACCOUNT_MAPPING, MISSING_CENTER_MAPPING, etc.)
 * são emitidas inline pelo journal-builder durante a geração.
 */

import { ValidationCodes, accountRequiresCenter } from './contracts.js';

/**
 * Valida o journal final.
 * @param {object[]} entries — AccountingEntry[].
 * @param {object[]} existingIssues — issues já coletadas pelo builder.
 * @returns {object[]} — issues adicionais encontradas.
 */
export function validateJournal(entries, existingIssues = []) {
  const additionalIssues = [];

  // ------ CENTER_ON_BALANCE_ACCOUNT ------
  for (const entry of entries) {
    if (!accountRequiresCenter(entry.accountCode) && entry.centerCode) {
      additionalIssues.push({
        code: ValidationCodes.CENTER_ON_BALANCE_ACCOUNT,
        severity: 'blocker',
        message: `Conta ${entry.accountCode} (classe 1/2) recebeu centro ${entry.centerCode}. Centro deve ser removido.`,
        context: { accountCode: entry.accountCode, centerCode: entry.centerCode, eventCode: entry.eventCode },
      });
    }
  }

  // ------ UNBALANCED_JOURNAL ------
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    if (entry.dc === 'D') {
      totalDebit += entry.amountCents;
    } else if (entry.dc === 'C') {
      totalCredit += entry.amountCents;
    }
  }

  if (totalDebit !== totalCredit) {
    additionalIssues.push({
      code: ValidationCodes.UNBALANCED_JOURNAL,
      severity: 'blocker',
      message: `Journal desbalanceado: débitos ${totalDebit} ≠ créditos ${totalCredit}.`,
      context: { totalDebit, totalCredit, difference: totalDebit - totalCredit },
    });
  }

  return additionalIssues;
}

/**
 * Determina o status da execução com base nas issues.
 * @param {object[]} issues
 * @returns {'blocked' | 'ready'}
 */
export function resolveStatus(issues) {
  const hasBlocker = issues.some((i) => i.severity === 'blocker');
  return hasBlocker ? 'blocked' : 'ready';
}
