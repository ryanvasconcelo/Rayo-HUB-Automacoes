import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDealerTxtLine483 } from '../src/lib/folha-dealer/dealer-txt-layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

function formatWithSpaces(accountCode, size = 20) {
  // Remove pontos
  const digits = String(accountCode).replace(/\D/g, '');
  // Preenche com espaços à esquerda até dar 12 posições (substituindo os zeros)
  const dealerCode = digits.padStart(12, ' ').slice(-12);
  // Preenche com espaços à direita até dar os 20 do layout
  return dealerCode.padEnd(size, ' ');
}

const debitAccount = formatWithSpaces('6.1.1.01.002'); 
const creditAccount = formatWithSpaces('2.1.1.01.005');

let line = buildDealerTxtLine483({
  dealerCompanyField: '01',
  dealerBranchField: '001',
  debitLotAccount: '000000000000', // ignorado
  creditLotAccount: '000000000000', // ignorado
  amountCents: 1000,
  history: 'TESTE ESPACOS A ESQUERDA',
  accountingDate: '2026-06-16',
});

// Substitui os placeholders na linha
const part1 = line.substring(0, 15);
const part2 = line.substring(35, 62);
const part3 = line.substring(82);

line = part1 + debitAccount + part2 + creditAccount + part3;

const content = line + '\r\n';
const filePath = path.join(outDir, 'diag-spaces-left-test.txt');
fs.writeFileSync(filePath, content);

console.log(`[GERADO] ${filePath}`);
console.log(`Conta Débito bruta: '6.1.1.01.002'`);
console.log(`Conta Débito formatada (pos 16-35): '${line.substring(15, 35)}'`);
console.log(`Conta Crédito bruta: '2.1.1.01.005'`);
console.log(`Conta Crédito formatada (pos 63-82): '${line.substring(62, 82)}'`);
