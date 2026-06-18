/**
 * contracts.js — Contratos e constantes do domínio Folha Fortes -> Dealer.
 *
 * Source of truth: docs/folha-dealer/data-contracts.md
 *                  docs/folha-dealer/business-rules.md
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Tipo de lote fixo para lançamentos de folha. */
export const BATCH_TYPE = 'FP';

/** Tamanho fixo da linha TXT Dealer (layout validado). */
export const DEALER_LINE_LENGTH = 483;

/** Eventos informativos / base que nunca geram lançamento contábil. */
export const INFORMATIVE_EVENT_CODES = new Set([
  '600', '601', '602', '603', '604',
]);

/** Conta obrigatória para o evento 100. */
export const EVENT_100_REQUIRED_ACCOUNT = '2.1.1.03.001';

// ---------------------------------------------------------------------------
// Códigos de validação
// ---------------------------------------------------------------------------

export const ValidationCodes = Object.freeze({
  MISSING_CENTER_MAPPING:       'MISSING_CENTER_MAPPING',
  ACTIVITY_MAPPING_REQUIRED:    'ACTIVITY_MAPPING_REQUIRED',
  MISSING_ACCOUNT_MAPPING:      'MISSING_ACCOUNT_MAPPING',
  EVENT_100_ACCOUNT_MISMATCH:   'EVENT_100_ACCOUNT_MISMATCH',
  CENTER_ON_BALANCE_ACCOUNT:    'CENTER_ON_BALANCE_ACCOUNT',
  CENTER_REMOVED_FROM_BALANCE_ACCOUNT: 'CENTER_REMOVED_FROM_BALANCE_ACCOUNT',
  MISSING_REQUIRED_CENTER:      'MISSING_REQUIRED_CENTER',
  UNBALANCED_JOURNAL:           'UNBALANCED_JOURNAL',
  NEGATIVE_VALUE_WITHOUT_POLICY:'NEGATIVE_VALUE_WITHOUT_POLICY',
  ZERO_VALUE_IGNORED:           'ZERO_VALUE_IGNORED',
  INFORMATIVE_EVENT_IGNORED:    'INFORMATIVE_EVENT_IGNORED',
  UNUSED_MAPPING:               'UNUSED_MAPPING',
  ROUNDING_ADJUSTMENT:          'ROUNDING_ADJUSTMENT',
  MISSING_DEALER_LOT_ACCOUNT_CODE: 'MISSING_DEALER_LOT_ACCOUNT_CODE',
  INVALID_DEALER_ACCOUNT_FORMAT:   'INVALID_DEALER_ACCOUNT_FORMAT',
  INVALID_DEALER_LINE_LENGTH:      'INVALID_DEALER_LINE_LENGTH',
});

// ---------------------------------------------------------------------------
// Utilitários de formatação
// ---------------------------------------------------------------------------

/**
 * Gera o histórico padrão: `FOLHA DE PAGAMENTO REF MM/AAAA`.
 * @param {string} competence — formato `YYYY-MM`.
 * @returns {string}
 */
export function buildHistory(competence) {
  const [year, month] = competence.split('-');
  return `FOLHA DE PAGAMENTO REF ${month}/${year}`;
}

/**
 * Retorna o primeiro dígito numérico da conta contábil.
 * Contas iniciadas por 1 ou 2 → patrimoniais (sem centro).
 * Contas iniciadas por 3+ → resultado (exigem centro).
 * @param {string} accountCode
 * @returns {number}
 */
export function accountClass(accountCode) {
  const first = accountCode.replace(/\D/g, '').charAt(0);
  return parseInt(first, 10);
}

/**
 * Retorna true se a conta exige centro de custo (classe >= 3).
 * @param {string} accountCode
 * @returns {boolean}
 */
export function accountRequiresCenter(accountCode) {
  return accountClass(accountCode) >= 3;
}
