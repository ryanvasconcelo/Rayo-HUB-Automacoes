import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDealerTxtLine483 } from '../src/lib/folha-dealer/dealer-txt-layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

// Cria uma cópia local da função para forçar as strings de data brutas
// pois a buildDealerTxtLine483 atual passa a data por formatDateDealer que injeta barras.
function buildLineWithRawDate(seq, rawDate) {
  // Chamamos a original e depois fazemos um replace na posição exata da data
  const line = buildDealerTxtLine483({
    dealerCompanyField: '01',
    dealerBranchField: '001',
    debitLotAccount: '111111111111',
    debitCenter: null,
    debitRcoAccount: null,
    creditLotAccount: '222222222222',
    creditCenter: null,
    creditRcoAccount: null,
    sequencial: seq,
    history: `TESTE DATA FORMATO ${rawDate}`,
    accountingDate: '2026-06-17', // Vai ser sobrescrito abaixo
    amountCents: 1000,
  });

  const part1 = line.substring(0, 371); // até pos 371
  const date1 = rawDate.padEnd(10, ' ');
  const date2 = rawDate.padEnd(10, ' ');
  const part2 = line.substring(391); // de 391 em diante
  
  return part1 + date1 + date2 + part2;
}

// 1. Formato com barras: 17/06/2026
const line1 = buildLineWithRawDate(1, '17/06/2026');

// 2. Formato DDMMAAAA: 17062026
const line2 = buildLineWithRawDate(2, '17062026');

// 3. Formato AAAAMMDD: 20260617
const line3 = buildLineWithRawDate(3, '20260617');

// 4. Formato MMDDAAAA (Padrão US): 06/17/2026
const line4 = buildLineWithRawDate(4, '06/17/2026');

const content = [line1, line2, line3, line4].join('\r\n') + '\r\n';
const filePath = path.join(outDir, 'diag-dates-test.txt');
fs.writeFileSync(filePath, content);

console.log(`[GERADO] ${filePath}`);
console.log('Este arquivo testa 4 formatos de data nas posições 372-391:');
console.log('Linha 1: 17/06/2026');
console.log('Linha 2: 17062026');
console.log('Linha 3: 20260617');
console.log('Linha 4: 06/17/2026');
