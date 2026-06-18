import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDealerTxtLine483 } from '../src/lib/folha-dealer/dealer-txt-layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

// Usar contas do Fortes diretamente, a conversão ocorre dentro do buildDealerTxtLine483
const debitAccount = '6.1.1.01.002'; // vira 000061101002
const creditAccount = '2.1.1.01.001'; // vira 000021101001

const line1 = buildDealerTxtLine483({
  dealerCompanyField: '01',
  dealerBranchField: '001',
  debitLotAccount: debitAccount,
  debitCenter: null,
  debitRcoAccount: null,
  creditLotAccount: creditAccount,
  creditCenter: null,
  creditRcoAccount: null,
  sequencial: 1,
  history: 'TESTE CONVERSAO DE CONTAS',
  accountingDate: '2026-06-16', // Dia 16/06/2026
  amountCents: 1000, // R$ 10,00
});

const content = line1 + '\r\n';
const filePath = path.join(outDir, 'diag-conversion-test.txt');
fs.writeFileSync(filePath, content);

console.log(`[GERADO] ${filePath}`);
console.log(`\nLinha Gerada:\n${line1}`);
console.log(`\nTamanho da linha gerada: ${line1.length} caracteres`);
console.log(`Data 1 (pos 374-381): '${line1.substring(373, 381)}'`);
console.log(`Data 2 (pos 382-389): '${line1.substring(381, 389)}'`);
console.log(`Conta Débito convertida (pos 16-35): '${line1.substring(15, 35)}'`);
console.log(`Conta Crédito convertida (pos 63-82): '${line1.substring(62, 82)}'`);
