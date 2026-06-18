/**
 * generate-dealer-diag-483.mjs — Gera TXT de diagnóstico (layout 483 chars)
 *
 * Usa contas extraídas do TXT validado apenas para testar o layout.
 * NÃO usa essas contas como de-para real da Braga.
 *
 * Objetivo: validar que o Dealer aceita o layout de 483 caracteres
 * com empresa 01, filial 001, datas duplicadas, valor com vírgula.
 *
 * IMPORTANTE: O exportador oficial (dealer-txt-exporter.js) NÃO faz
 * pareamento D+C na mesma linha. Ele sempre gera linhas somente-débito
 * e somente-crédito (1 entry do motor = 1 linha TXT).
 * Este script gera um arquivo misto (D+C) apenas para validação de
 * layout bruto, mas também gera arquivos com linhas unilaterais para
 * teste fiel ao comportamento oficial.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDealerTxtLine483,
  validateDealerTxtLine483,
} from '../src/lib/folha-dealer/dealer-txt-layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

// Contas do TXT validado (apenas para teste de layout)
const DIAG_DEBIT_ACCOUNT = '123001000001';
const DIAG_CREDIT_ACCOUNT = '214001000001';
const DIAG_DATE = '17/06/2026';

// Linha 1: Débito
const line1 = buildDealerTxtLine483({
  dealerCompanyField: '01',
  dealerBranchField: '001',
  debitLotAccount: DIAG_DEBIT_ACCOUNT,
  debitCenter: null,
  debitRcoAccount: null,
  creditLotAccount: DIAG_CREDIT_ACCOUNT,
  creditCenter: null,
  creditRcoAccount: null,
  sequencial: 1,
  history: 'TESTE IMPORTACAO LAYOUT 483 RAYO',
  accountingDate: DIAG_DATE,
  amountCents: 1000,
});

// Linha 2: Débito + Crédito (como no TXT validado)
const line2 = buildDealerTxtLine483({
  dealerCompanyField: '01',
  dealerBranchField: '001',
  debitLotAccount: '331001000001',
  debitCenter: '001000',
  debitRcoAccount: '6.1.1.01.002', // classe 6 → centro preservado
  creditLotAccount: '214001000001',
  creditCenter: null,
  creditRcoAccount: '2.1.1.01.001', // classe 2 → sem centro
  sequencial: 2,
  history: 'VALOR REFERENTE SALARIOS NESTE MES',
  accountingDate: DIAG_DATE,
  amountCents: 4247217,
});

// Validar
for (const [idx, line] of [line1, line2].entries()) {
  const issues = validateDealerTxtLine483(line);
  console.log(`Linha ${idx + 1}: ${line.length} chars, Issues: ${issues.length}`);
  if (issues.length > 0) {
    console.error('  ISSUES:', JSON.stringify(issues, null, 2));
  }
}

// Salvar diag misto (D+C)
const contentMixed = [line1, line2].join('\r\n') + '\r\n';
const filePathMixed = path.join(outDir, 'diag-25-layout-483.txt');
fs.writeFileSync(filePathMixed, contentMixed);

// Salvar diag somente débito
const contentDebit = line1 + '\r\n';
const filePathDebit = path.join(outDir, 'diag-only-debit-483.txt');
fs.writeFileSync(filePathDebit, contentDebit);

// Salvar diag somente crédito
const line3 = buildDealerTxtLine483({
  dealerCompanyField: '01',
  dealerBranchField: '001',
  debitLotAccount: null,
  debitCenter: null,
  debitRcoAccount: null,
  creditLotAccount: DIAG_CREDIT_ACCOUNT,
  creditCenter: null,
  creditRcoAccount: null,
  sequencial: 1,
  history: 'TESTE IMPORTACAO SOMENTE CREDITO',
  accountingDate: DIAG_DATE,
  amountCents: 1000,
});
const contentCredit = line3 + '\r\n';
const filePathCredit = path.join(outDir, 'diag-only-credit-483.txt');
fs.writeFileSync(filePathCredit, contentCredit);

console.log(`\n[GERADO] ${filePathMixed}`);
console.log(`[GERADO] ${filePathDebit}`);
console.log(`[GERADO] ${filePathCredit}`);
console.log(`Linhas: 2 (misto), 1 (débito), 1 (crédito)`);
console.log(`Tamanho linha 1: ${line1.length}`);
console.log(`Tamanho linha 2: ${line2.length}`);
console.log(`Bytes misto: ${Buffer.byteLength(contentMixed, 'utf8')}`);

// Extrair posições para verificação
function dumpPositions(label, line) {
  console.log(`\n=== ${label} ===`);
  console.log(`  Empresa/Filial: "${line.substring(10, 15)}"`);
  console.log(`  Conta Débito:   "${line.substring(15, 35).trim()}"`);
  console.log(`  Centro Débito:  "${line.substring(35, 45).trim()}"`);
  console.log(`  Conta Crédito:  "${line.substring(62, 82).trim()}"`);
  console.log(`  Centro Crédito: "${line.substring(82, 92).trim()}"`);
  console.log(`  Sequencial:     "${line.substring(109, 117).trim()}"`);
  console.log(`  Data 1:         "${line.substring(371, 381)}"`);
  console.log(`  Data 2:         "${line.substring(381, 391)}"`);
  console.log(`  Valor:          "${line.substring(411, 429)}"`);
  console.log(`  Padding len:    ${line.substring(429, 483).length}`);
}

dumpPositions('Linha 1', line1);
dumpPositions('Linha 2', line2);
