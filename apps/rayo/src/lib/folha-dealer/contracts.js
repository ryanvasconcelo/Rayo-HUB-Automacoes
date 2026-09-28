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

/**
 * Conta obrigatória para o evento 100 (Provisão Cred. Trab. - Provento): crédito
 * do trabalhador, a mesma conta do evento 301 (decisão do contador, 28/09/2026).
 */
export const EVENT_100_REQUIRED_ACCOUNT = '2.1.1.02.007';

/**
 * Tipos de folha do Fortes que o Rayo contabiliza. Cada tipo tem o próprio
 * líquido (conta própria no de-para) e o próprio histórico no TXT. A ordem é a
 * do "Resumo Geral do Mês/Período" do Fortes.
 */
export const PAYROLL_TYPES = Object.freeze({
  MENSAL: Object.freeze({
    label: 'Folha de Pagamento',
    liquidEventCode: 'LIQUIDO_FOLHA',
    liquidEventName: 'Líquido da Folha a Pagar',
    historyLabel: 'FOLHA DE PAGAMENTO',
  }),
  FERIAS: Object.freeze({
    label: 'Férias',
    liquidEventCode: 'LIQUIDO_FERIAS',
    liquidEventName: 'Líquido de Férias',
    historyLabel: 'FERIAS',
  }),
  RESCISAO: Object.freeze({
    label: 'Rescisão',
    liquidEventCode: 'LIQUIDO_RESCISAO',
    liquidEventName: 'Líquido de Rescisão a Pagar',
    historyLabel: 'RESCISAO',
  }),
  COMPLEMENTAR: Object.freeze({
    label: 'Complemento de Folha',
    liquidEventCode: 'LIQUIDO_COMPLEMENTAR',
    liquidEventName: 'Líquido da Folha Complementar',
    historyLabel: 'FOLHA COMPLEMENTAR',
  }),
});

export const DEFAULT_PAYROLL_TYPE = 'MENSAL';

/**
 * Linha sem tipo é folha mensal. Tipo desconhecido é erro: cair na folha
 * mensal jogaria o líquido na conta errada sem aviso.
 * @param {string} [payrollType]
 * @returns {string}
 */
export function resolvePayrollType(payrollType) {
  if (!payrollType) return DEFAULT_PAYROLL_TYPE;
  if (!PAYROLL_TYPES[payrollType]) {
    throw new Error(`Tipo de folha desconhecido: "${payrollType}".`);
  }
  return payrollType;
}

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
  SYNTHETIC_PROVISION:             'SYNTHETIC_PROVISION',
  SYNTHETIC_ENCARGO:               'SYNTHETIC_ENCARGO',
  UNMAPPED_ESOCIAL_ENCARGO:        'UNMAPPED_ESOCIAL_ENCARGO',
});

// ---------------------------------------------------------------------------
// Utilitários de formatação
// ---------------------------------------------------------------------------

/**
 * Gera o histórico do lançamento: `FOLHA DE PAGAMENTO REF MM/AAAA` na folha
 * mensal, `FERIAS REF MM/AAAA` etc. nos demais tipos.
 * @param {string} competence — formato `YYYY-MM`.
 * @param {string} [payrollType]
 * @returns {string}
 */
export function buildHistory(competence, payrollType = DEFAULT_PAYROLL_TYPE) {
  const [year, month] = competence.split('-');
  const { historyLabel } = PAYROLL_TYPES[resolvePayrollType(payrollType)];
  return `${historyLabel} REF ${month}/${year}`;
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
