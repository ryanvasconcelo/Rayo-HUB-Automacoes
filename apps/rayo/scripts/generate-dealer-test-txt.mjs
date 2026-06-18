import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDealerTxtLine } from '../src/lib/folha-dealer/dealer-txt-layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.resolve(__dirname, '../output/dealer-test-import.txt');

const args = process.argv.slice(2);
const accountingDate = args[0] || new Date().toISOString().split('T')[0];

const options = {
  batchType: 'FP',
  dealerCompanyField: '07',
  dealerBranchField: '001',
  accountingDate: accountingDate,
  expectedLineLength: 453,
  strictLength: true,
};

const entryDebit = {
  dc: 'D',
  accountCode: '6.1.1.01.002',
  centerCode: '000600',
  history: 'TESTE IMPORTACAO FOLHA',
  amountCents: 1000,
};

const entryCredit = {
  dc: 'C',
  accountCode: '2.1.1.01.001',
  centerCode: '',
  history: 'TESTE IMPORTACAO FOLHA',
  amountCents: 1000,
};

const { line: lineD } = buildDealerTxtLine(entryDebit, options);
const { line: lineC } = buildDealerTxtLine(entryCredit, options);

const lines = [lineD, lineC];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join('\r\n'));

console.log(`Arquivo gerado: ${outputPath}`);
console.log(`Quantidade de linhas: ${lines.length}`);
console.log(`Tamanho da linha 1: ${lineD.length}`);
console.log(`Tamanho da linha 2: ${lineC.length}`);
console.log(`Total Débito: R$ 10,00`);
console.log(`Total Crédito: R$ 10,00`);
console.log(`Diferença: R$ 0,00`);
