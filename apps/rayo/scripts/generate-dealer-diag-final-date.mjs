import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDealerTxtLine483 } from '../src/lib/folha-dealer/dealer-txt-layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

// Gera o arquivo final usando as funções originais do código fonte (já ajustadas)
const line1 = buildDealerTxtLine483({
  dealerCompanyField: '01',
  dealerBranchField: '001',
  debitLotAccount: '111111111111',
  debitCenter: null,
  debitRcoAccount: null,
  creditLotAccount: '222222222222',
  creditCenter: null,
  creditRcoAccount: null,
  sequencial: 1,
  history: 'TESTE FINAL DATA DDMMAAAA 8 CARACTERES',
  accountingDate: '2026-06-17', // O código fonte vai converter para 17062026
  amountCents: 1000,
});

const content = line1 + '\r\n';
const filePath = path.join(outDir, 'diag-final-date-test.txt');
fs.writeFileSync(filePath, content);

console.log(`[GERADO] ${filePath}`);
console.log(`Tamanho da linha gerada: ${line1.length} caracteres`);
console.log(`Data 1 começa na pos 374: ${line1.substring(373, 381)}`);
console.log(`Data 2 começa na pos 382: ${line1.substring(381, 389)}`);
