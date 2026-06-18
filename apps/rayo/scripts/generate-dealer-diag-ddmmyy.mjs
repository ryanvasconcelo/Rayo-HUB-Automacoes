import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDealerTxtLine483 } from '../src/lib/folha-dealer/dealer-txt-layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

function buildLineWithDDMMYY(seq) {
  // A data que queremos é 17/06/2026.
  // Pela análise matemática do erro do Dealer, o formato exigido é DDMMYY (6 caracteres)
  // E ele está lendo a partir da posição 374 (índice 373).
  // A posição 372 e 373 são ignoradas (ou fazem parte de outro campo).
  
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
    history: 'TESTE MATEMATICO DDMMAA',
    accountingDate: '2026-06-17', // Ignorado pelo nosso replace manual
    amountCents: 1000,
  });

  const part1 = line.substring(0, 371); // Até a posição 371
  // Injeta 2 espaços (pos 372 e 373)
  const gap = '  ';
  // Injeta Data 1 (pos 374-379)
  const data1 = '170626'; // 17 de Junho de 2026 (DDMMYY)
  // Injeta Data 2 (pos 380-385)
  const data2 = '170626'; // 17 de Junho de 2026 (DDMMYY)
  
  const part2 = line.substring(385); // Pega do índice 385 em diante para completar 483
  
  return part1 + gap + data1 + data2 + part2;
}

const line1 = buildLineWithDDMMYY(1);

const content = line1 + '\r\n';
const filePath = path.join(outDir, 'diag-ddmmyy-test.txt');
fs.writeFileSync(filePath, content);

console.log(`[GERADO] ${filePath}`);
console.log(`Tamanho da linha gerada: ${line1.length}`);
