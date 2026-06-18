import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDealerTxtLine483 } from '../src/lib/folha-dealer/dealer-txt-layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

function padLeft(str, size) {
  return String(str || '').padStart(size, '0');
}

function padRight(str, size) {
  return String(str || '').padEnd(size, ' ');
}

// Vamos testar enviar o "Código" da tela do Dealer (5095 e 4838) 
// preenchido com zeros até 12 dígitos, e depois com espaços até 20.
// Se isso passar, a "Conta" que o Dealer espera no TXT não é a conta Fortes, é o Código sequencial deles!
const debitAccount = padRight(padLeft('5095', 12), 20); 
const creditAccount = padRight(padLeft('4838', 12), 20); 

let line = buildDealerTxtLine483({
  dealerCompanyField: '01',
  dealerBranchField: '001',
  debitLotAccount: '000000000000', 
  creditLotAccount: '000000000000', 
  amountCents: 1000,
  history: 'TESTE USANDO CODIGO SEQUENCIAL',
  accountingDate: '2026-06-16',
});

// Substitui os placeholders
const part1 = line.substring(0, 15);
const part2 = line.substring(35, 62);
const part3 = line.substring(82);

line = part1 + debitAccount + part2 + creditAccount + part3;

const content = line + '\r\n';
const filePath = path.join(outDir, 'diag-sequential-code-test.txt');
fs.writeFileSync(filePath, content);

console.log(`[GERADO] ${filePath}`);
console.log(`Conta Débito (pos 16-35): '${line.substring(15, 35)}'`);
console.log(`Conta Crédito (pos 63-82): '${line.substring(62, 82)}'`);
