/**
 * dealer-txt-layout.js — Layout posicional TXT Dealer (483 caracteres)
 *
 * Dicionário posicional confirmado pelo TXT validado (txt-validado.TXT):
 *
 *   Pos 1–2    (2)   Tipo lançamento       constante "FP"
 *   Pos 3–10   (8)   Espaço lote           espaços
 *   Pos 11–12  (2)   Empresa               ex: "01"
 *   Pos 13–15  (3)   Filial                ex: "001"
 *   Pos 16–35  (20)  Conta débito          12 dígitos sem pontos, pad right
 *   Pos 36–45  (10)  Centro débito         pad right
 *   Pos 46–47  (2)   Tipo subconta débito  espaços
 *   Pos 48–62  (15)  Subconta débito       espaços
 *   Pos 63–82  (20)  Conta crédito         12 dígitos sem pontos, pad right
 *   Pos 83–92  (10)  Centro crédito        pad right
 *   Pos 93–94  (2)   Tipo subconta crédito espaços
 *   Pos 95–109 (15)  Subconta crédito      espaços
 *   Pos 110–117(8)   Nº doc / sequencial   pad right
 *   Pos 118–121(4)   Histórico padrão      espaços
 *   Pos 122–371(250) Complemento histórico uppercase, pad right
 *   Pos 372–381(10)  Data 1                DD/MM/YYYY
 *   Pos 382–391(10)  Data 2                DD/MM/YYYY (mesma data)
 *   Pos 392–411(20)  Contrapartida         espaços
 *   Pos 412–429(18)  Valor                 000000000042472,17
 *   Pos 430–483(54)  Padding final         espaços
 *
 * Total: 483 caracteres por linha. Quebra CRLF.
 *
 * Módulo puro: não lê arquivos, não escreve arquivos, não acessa banco.
 */

import { DEALER_LINE_LENGTH, ValidationCodes } from './contracts.js';
import { accountClass } from './contracts.js';

// ---------------------------------------------------------------------------
// Helpers de padding
// ---------------------------------------------------------------------------

/**
 * Preenche com espaços à direita até atingir o tamanho.
 * Trunca se ultrapassar.
 */
export function padRight(value, size) {
  const str = String(value || '').substring(0, size);
  return str.padEnd(size, ' ');
}

/**
 * Preenche com espaços à esquerda até atingir o tamanho.
 * Trunca se ultrapassar.
 */
export function padLeft(value, size) {
  const str = String(value || '').substring(0, size);
  return str.padStart(size, ' ');
}

// ---------------------------------------------------------------------------
// Formatação de conta interna Dealer
// ---------------------------------------------------------------------------

/**
 * Remove qualquer caractere que não seja dígito.
 */
export function onlyDigits(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Normaliza D/C para maiúsculo.
 */
export function normalizeDc(value) {
  if (!value) return '';
  const upper = String(value).toUpperCase().trim();
  return (upper === 'D' || upper === 'C') ? upper : '';
}

/**
 * Formata conta interna Dealer para o TXT (12 dígitos, sem pontos).
 *
 * - Aceita apenas dígitos.
 * - Rejeita contas com pontos → INVALID_DEALER_ACCOUNT_FORMAT.
 * - Preenche à direita com espaços até `size`.
 *
 * @param {string} lotAccountCode — conta interna Dealer, ex: "123001000001"
 * @param {number} [size=20]
 * @returns {string}
 * @throws {Error} se a conta contiver pontos
 */
export function formatDealerLotAccount(accountCode, size = 20) {
  if (!accountCode) return padRight('', size);
  
  // Remove todos os caracteres não numéricos
  const digits = String(accountCode).replace(/\D/g, '');
  
  if (digits.length === 0) {
    throw new Error(
      `${ValidationCodes.INVALID_DEALER_ACCOUNT_FORMAT}: Conta não contém dígitos válidos.`
    );
  }
  
  // A "Conta no Lote" do Dealer é convertida para 12 dígitos com espaços à esquerda
  const dealerCode = digits.padStart(12, ' ').slice(-12);
  
  // O layout fixo do Dealer reserva 'size' (20 posições), então preenchemos o resto com espaços
  return padRight(dealerCode, size);
}

// ---------------------------------------------------------------------------
// Formatação de valor
// ---------------------------------------------------------------------------

/**
 * Formata valor em centavos para o formato Dealer: vírgula decimal, zeros à esquerda.
 * Exemplo: 4247217 → "000000000042472,17"
 *
 * @param {number} amountCents — valor em centavos (inteiro)
 * @param {number} [size=18]
 * @returns {string}
 */
export function formatMoneyDealerComma(amountCents, size = 18) {
  const abs = Math.abs(amountCents);
  const intPart = Math.floor(abs / 100);
  const decPart = abs % 100;
  const formatted = `${intPart},${String(decPart).padStart(2, '0')}`;
  return formatted.padStart(size, '0');
}

// ---------------------------------------------------------------------------
// Formatação de data
// ---------------------------------------------------------------------------

/**
 * Formata data YYYY-MM-DD para DDMMYYYY (8 caracteres, sem barras).
 * Se já vier nesse formato, retorna igual.
 */
export function formatDateDealer(date) {
  if (!date) return padRight('', 8);
  let str = String(date).trim();
  
  // Se vier com barras, remove
  str = str.replace(/\//g, '');
  
  if (str.length === 8) return str;
  
  // YYYY-MM-DD → DDMMYYYY
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      return `${parts[2]}${parts[1]}${parts[0]}`;
    }
  }
  return padRight(str, 8);
}

// ---------------------------------------------------------------------------
// Formatação de centro
// ---------------------------------------------------------------------------

/**
 * Formata o centro Dealer, respeitando a classe da conta.
 * Contas classe 1 ou 2 → centro vazio.
 */
export function formatDealerCenter(centerCode, accountCode, size = 10) {
  if (!centerCode) return padRight('', size);
  if (accountCode) {
    const aClass = accountClass(accountCode);
    if (aClass === 1 || aClass === 2) {
      return padRight('', size);
    }
  }
  return padRight(centerCode, size);
}

// ---------------------------------------------------------------------------
// Sanitização de histórico (encoding-safe)
// ---------------------------------------------------------------------------

/**
 * Remove diacríticos/acentos de uma string para garantir compatibilidade
 * com Latin-1/Windows-1252. Assim string.length === byte length.
 */
export function stripDiacritics(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Sanitiza o histórico para o TXT: uppercase, sem acentos, truncado a 250.
 */
export function sanitizeHistory(history, size = 250) {
  if (!history) return padRight('', size);
  const clean = stripDiacritics(history).toUpperCase();
  return padRight(clean, size);
}

// ---------------------------------------------------------------------------
// Builder da linha 483
// ---------------------------------------------------------------------------

/**
 * @typedef {object} DealerTxtLine483Params
 * @property {string} dealerCompanyField — ex: "01"
 * @property {string} dealerBranchField — ex: "001"
 * @property {string|null} debitLotAccount — conta interna débito, ex: "123001000001"
 * @property {string|null} debitCenter — centro débito, ex: "001000"
 * @property {string|null} debitRcoAccount — conta RCO005 do débito (para lookup de classe)
 * @property {string|null} creditLotAccount — conta interna crédito, ex: "214001000001"
 * @property {string|null} creditCenter — centro crédito, ex: "000600"
 * @property {string|null} creditRcoAccount — conta RCO005 do crédito (para lookup de classe)
 * @property {number} sequencial — número sequencial da linha (1-based)
 * @property {string} history — texto do histórico
 * @property {string} accountingDate — data no formato YYYY-MM-DD ou DD/MM/YYYY
 * @property {number} amountCents — valor em centavos
 */

/**
 * Monta uma linha TXT Dealer de exatamente 483 caracteres.
 *
 * @param {DealerTxtLine483Params} params
 * @returns {string} linha de 483 caracteres
 */
export function buildDealerTxtLine483(params) {
  const {
    dealerCompanyField = '01',
    dealerBranchField = '001',
    debitLotAccount = null,
    debitCenter = null,
    debitRcoAccount = null,
    creditLotAccount = null,
    creditCenter = null,
    creditRcoAccount = null,
    sequencial = 1,
    history = '',
    accountingDate = '',
    amountCents = 0,
  } = params;

  // Pos 1–2: Tipo lançamento
  const tipo = padRight('FP', 2);                                        // 2

  // Pos 3–10: Espaço lote
  const espacoLote = padRight('', 8);                                    // 8

  // Pos 11–12: Empresa
  const empresa = padLeft(dealerCompanyField, 2);                        // 2

  // Pos 13–15: Filial
  const filial = padLeft(dealerBranchField, 3);                          // 3

  // Pos 16–35: Conta débito (20)
  const contaDebito = formatDealerLotAccount(debitLotAccount, 20);       // 20

  // Pos 36–45: Centro débito (10) — usa RCO para decidir classe
  const centroDebito = formatDealerCenter(debitCenter, debitRcoAccount, 10); // 10

  // Pos 46–47: Tipo subconta débito
  const tipoSubDeb = padRight('', 2);                                    // 2

  // Pos 48–62: Subconta débito
  const subcontaDeb = padRight('', 15);                                  // 15

  // Pos 63–82: Conta crédito (20)
  const contaCredito = formatDealerLotAccount(creditLotAccount, 20);     // 20

  // Pos 83–92: Centro crédito (10)
  const centroCredito = formatDealerCenter(creditCenter, creditRcoAccount, 10); // 10

  // Pos 93–94: Tipo subconta crédito
  const tipoSubCred = padRight('', 2);                                   // 2

  // Pos 95–109: Subconta crédito
  const subcontaCred = padRight('', 15);                                 // 15

  // Pos 110–117: Nº doc / sequencial (8)
  const nrDoc = padRight(String(sequencial), 8);                         // 8

  // Pos 118–121: Histórico padrão (4)
  const histPadrao = padRight('', 4);                                    // 4

  // Pos 122–371: Complemento histórico (250) — sanitizado
  const complemento = sanitizeHistory(history, 250);                     // 250

  // Pos 372-373: Espaço antes da data (2)
  const gapData = padRight('', 2);                                       // 2

  // Pos 374–381: Data 1 (8) - DDMMAAAA
  const data1 = formatDateDealer(accountingDate);                        // 8

  // Pos 382–389: Data 2 (8) — mesma data, DDMMAAAA
  const data2 = formatDateDealer(accountingDate);                        // 8

  // Pos 390–411: Contrapartida / Gap antes do valor (22)
  const contrapartida = padRight('', 22);                                // 22

  // Pos 412–429: Valor (18) — vírgula decimal, zeros à esquerda
  const valor = formatMoneyDealerComma(amountCents, 18);                 // 18

  // Pos 430–483: Padding final (54)
  const paddingFinal = padRight('', 54);                                 // 54

  const line = [
    tipo, espacoLote, empresa, filial,
    contaDebito, centroDebito, tipoSubDeb, subcontaDeb,
    contaCredito, centroCredito, tipoSubCred, subcontaCred,
    nrDoc, histPadrao, complemento, gapData,
    data1, data2, contrapartida, valor,
    paddingFinal,
  ].join('');

  return line;
}

// ---------------------------------------------------------------------------
// Validação da linha 483
// ---------------------------------------------------------------------------

/**
 * Valida uma linha TXT Dealer de 483 caracteres.
 *
 * @param {string} line
 * @returns {object[]} array de issues (vazio se OK)
 */
export function validateDealerTxtLine483(line) {
  const issues = [];

  // 1. Tamanho
  if (line.length !== DEALER_LINE_LENGTH) {
    issues.push({
      code: ValidationCodes.INVALID_DEALER_LINE_LENGTH,
      severity: 'blocker',
      message: `Tamanho da linha (${line.length}) diverge do esperado (${DEALER_LINE_LENGTH}).`,
      context: { lineLength: line.length, expected: DEALER_LINE_LENGTH },
    });
    return issues; // Se o tamanho está errado, as posições abaixo são inválidas
  }

  // 2. Prefixo FP
  const tipo = line.substring(0, 2);
  if (tipo !== 'FP') {
    issues.push({
      code: 'INVALID_DEALER_BATCH_TYPE',
      severity: 'blocker',
      message: `Tipo de lote "${tipo}" inválido. Esperado "FP".`,
    });
  }

  // 3. Data 1 (pos 374–381, index 373–381)
  const data1 = line.substring(373, 381);
  if (data1.trim() && !/^\d{8}$/.test(data1)) {
    issues.push({
      code: 'INVALID_DEALER_DATE_FORMAT',
      severity: 'blocker',
      message: `Data 1 "${data1}" não está no formato DDMMAAAA.`,
      context: { position: '374-381', value: data1 },
    });
  }

  // 4. Data 2 (pos 382–389, index 381–389)
  const data2 = line.substring(381, 389);
  if (data2.trim() && !/^\d{8}$/.test(data2)) {
    issues.push({
      code: 'INVALID_DEALER_DATE_FORMAT',
      severity: 'blocker',
      message: `Data 2 "${data2}" não está no formato DDMMAAAA.`,
      context: { position: '382-389', value: data2 },
    });
  }

  // 5. Valor (pos 412–429, index 411–429)
  const valor = line.substring(411, 429);
  if (!/^\d+,\d{2}$/.test(valor)) {
    issues.push({
      code: 'INVALID_DEALER_VALUE_FORMAT',
      severity: 'blocker',
      message: `Valor "${valor}" não está no formato esperado (zeros,centavos).`,
      context: { position: '412-429', value: valor },
    });
  }

  // 6. Contas com pontos (nunca devem aparecer)
  const contaDebito = line.substring(15, 35);
  const contaCredito = line.substring(62, 82);
  if (contaDebito.includes('.') || contaCredito.includes('.')) {
    issues.push({
      code: ValidationCodes.INVALID_DEALER_ACCOUNT_FORMAT,
      severity: 'blocker',
      message: `Conta com pontos encontrada no TXT. Débito: "${contaDebito.trim()}", Crédito: "${contaCredito.trim()}".`,
    });
  }

  // 7. Padding final (pos 430–483, index 429–483)
  const padding = line.substring(429, 483);
  if (padding !== ' '.repeat(54)) {
    issues.push({
      code: 'INVALID_DEALER_PADDING',
      severity: 'warning',
      message: `Padding final não são 54 espaços.`,
      context: { value: JSON.stringify(padding), length: padding.length },
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Legacy compatibility exports (deprecated — used by old tests)
// ---------------------------------------------------------------------------

/** @deprecated Use formatMoneyDealerComma instead */
export function formatMoneyDealer(amountCents, size) {
  const decimal = (amountCents / 100).toFixed(2);
  return padLeft(decimal, size);
}

/** @deprecated Dealer TXT uses internal lot accounts, not RCO005 */
export function formatDealerAccount(accountCode) {
  if (!accountCode) return '';
  return String(accountCode).trim();
}

/** @deprecated Use buildDealerTxtLine483 instead */
export function buildDealerTxtSegments(entry, options) {
  const dc = normalizeDc(entry.dc);
  const account = formatDealerAccount(entry.accountCode);
  const center = formatDealerCenter(entry.centerCode, entry.accountCode, 10);

  const tipo = padLeft(options.batchType, 2);
  const nrLote = padRight('', 8);
  const empresa = padLeft(options.dealerCompanyField, 2);
  const filial = padLeft(options.dealerBranchField, 3);

  const contaDebito = dc === 'D' ? padRight(account, 20) : padRight('', 20);
  const centroDebito = dc === 'D' ? padRight(center, 10) : padRight('', 10);
  const tipoSubDeb = padRight('', 2);
  const codSubDeb = padRight('', 15);

  const espaco = padRight('', 17);

  const contaCredito = dc === 'C' ? padRight(account, 20) : padRight('', 20);
  const centroCredito = dc === 'C' ? padRight(center, 10) : padRight('', 10);
  const tipoSubCred = padRight('', 2);
  const codSubCred = padRight('', 15);

  const nrDoc = padRight('', 8);
  const histPadrao = padRight('', 4);
  const complemento = padRight(entry.history.toUpperCase(), 250);
  const data = formatDateDealer(options.accountingDate);
  const data2 = padRight('', 10);
  const contrapartida = padRight('', 20);
  const valor = formatMoneyDealer(entry.amountCents, 18);

  return [
    tipo, nrLote, empresa, filial,
    contaDebito, centroDebito, tipoSubDeb, codSubDeb,
    espaco,
    contaCredito, centroCredito, tipoSubCred, codSubCred,
    nrDoc, histPadrao, complemento, data, data2, contrapartida, valor
  ];
}

/** @deprecated Use buildDealerTxtLine483 + validateDealerTxtLine483 instead */
export function buildDealerTxtLine(entry, options) {
  const segments = buildDealerTxtSegments(entry, options);
  const line = segments.join('');
  const expectedLength = options.expectedLineLength || 453;
  let issue = null;
  if (line.length !== expectedLength) {
    issue = {
      code: 'DEALER_TXT_INVALID_LINE_LENGTH',
      severity: options.strictLength ? 'blocker' : 'warning',
      message: `Tamanho da linha (${line.length}) diverge do layout esperado (${expectedLength}).`,
      context: { lineLength: line.length, expectedLength },
    };
    if (options.strictLength) {
      throw new Error(issue.message);
    }
  }
  return { line, issue };
}

/** @deprecated Use validateDealerTxtLine483 instead */
export function validateDealerTxtLine(line, options) {
  const expectedLength = options.expectedLineLength || 453;
  if (line.length !== expectedLength) {
    const issue = {
      code: 'DEALER_TXT_INVALID_LINE_LENGTH',
      severity: options.strictLength ? 'blocker' : 'warning',
      message: `Tamanho da linha (${line.length}) diverge do layout esperado (${expectedLength}).`,
      context: { lineLength: line.length, expectedLength },
    };
    if (options.strictLength) {
      throw new Error(issue.message);
    }
    return issue;
  }
  return null;
}
