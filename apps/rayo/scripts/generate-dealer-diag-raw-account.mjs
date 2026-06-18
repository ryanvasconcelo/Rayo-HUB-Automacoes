import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDealerTxtLine483 } from '../src/lib/folha-dealer/dealer-txt-layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

// Helper simplificado: manda a string bruta preenchida à direita, sem remover pontos
function padRight(str, size) {
  return String(str || '').padEnd(size, ' ');
}

// Sobrescrevendo temporariamente a conversão para mandar EXATAMENTE como está na tela
const debitAccount = padRight('6.1.1.01.002', 20); // Manda com pontos!
const creditAccount = padRight('2.1.1.01.005', 20); // Usando a conta da sua tela

// Gerando a linha na mão para evitar a conversão do código fonte atual
let line = buildDealerTxtLine483({
  dealerCompanyField: '01',
  dealerBranchField: '001',
  debitLotAccount: '000000000000', // placeholder
  creditLotAccount: '000000000000', // placeholder
  amountCents: 1000,
  history: 'TESTE CONTA COM PONTOS',
  accountingDate: '2026-06-16',
});

// Substitui os placeholders pelas contas brutas nas posições exatas
const part1 = line.substring(0, 15); // Antes do debito
const part2 = line.substring(35, 62); // Entre debito e credito
const part3 = line.substring(82); // Depois do credito

line = part1 + debitAccount + part2 + creditAccount + part3;

const content = line + '\r\n';
const filePath = path.join(outDir, 'diag-raw-account-test.txt');
fs.writeFileSync(filePath, content);

console.log(`[GERADO] ${filePath}`);
console.log(`Conta Débito (pos 16-35): '${line.substring(15, 35)}'`);
console.log(`Conta Crédito (pos 63-82): '${line.substring(62, 82)}'`);
