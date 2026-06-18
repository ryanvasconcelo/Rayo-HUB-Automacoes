// diagnostic sweep just in case
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function padRight(value, size) {
  const str = String(value || '').substring(0, size);
  return str.padEnd(size, ' ');
}

function padLeft(value, size) {
  const str = String(value || '').substring(0, size);
  return str.padStart(size, ' ');
}

function formatMoneyDealer(amount, size) {
  const decimal = Number(amount).toFixed(2);
  return padLeft(decimal, size);
}

function buildDealerTxtLineFromSpreadsheetLayout(type, options) {
  const isD = type.toUpperCase() === 'D';
  const isC = type.toUpperCase() === 'C';

  const tipoLote = padLeft(options.tipo || 'FP', 2);
  const espacoLote = padRight(options.nrLote || '', 8);
  const empresa = padLeft(options.empresa || '01', 2);
  const filial = padLeft(options.filial || '001', 3);

  const contaDebito = isD ? padRight(options.contaDebito || '', 20) : padRight('', 20);
  const centroDebito = isD ? padRight(options.centroDebito || '', 10) : ' ';
  const tipoSubDebito = isD ? padRight(options.tipoSubDebito || '', 2) : ' ';
  const codSubDebito = isD ? padRight(options.codSubDebito || '', 15) : ' ';

  const espacoMeio = padRight('', 24);

  const contaCredito = isC ? padRight(options.contaCredito || '', 20) : padRight('', 20);
  const centroCredito = isC ? padRight(options.centroCredito || '', 10) : ' ';
  const tipoSubCredito = isC ? padRight(options.tipoSubCredito || '', 2) : ' ';
  const codSubCredito = isC ? padRight(options.codSubCredito || '', 15) : ' ';

  const nrDoc = padRight(options.nrDoc || '', 8);
  const histPadrao = padRight(options.histPadrao || '', 4);
  const complemento = padRight(options.complemento || '', 250);
  const data = padRight(options.data || '', 10);
  const data2 = padRight(options.data2 || '', 10);
  const contrapartida = padRight(options.contrapartida || '', 20);
  const valor = formatMoneyDealer(options.valor || 0, 18);

  const parts = [
    tipoLote, espacoLote, empresa, filial,
    contaDebito, centroDebito, tipoSubDebito, codSubDebito,
    espacoMeio,
    contaCredito, centroCredito, tipoSubCredito, codSubCredito,
    nrDoc, histPadrao, complemento, data, data2, contrapartida, valor
  ];

  const line = parts.join('');
  return line;
}

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

function generateAndSave(filename, lines) {
  const filePath = path.join(outDir, filename);
  const content = lines.join('\r\n') + '\r\n';
  fs.writeFileSync(filePath, content);
}

// Data format variations on the 429 layout
generateAndSave('diag-21-legacy-data-MMDDYYYY.txt', [
  buildDealerTxtLineFromSpreadsheetLayout('D', { contaDebito: '6.1.1.01.002', data: '06/16/2026' })
]);
generateAndSave('diag-22-legacy-data-DDMMYYYY-nobarras.txt', [
  buildDealerTxtLineFromSpreadsheetLayout('D', { contaDebito: '6.1.1.01.002', data: '16062026' })
]);
generateAndSave('diag-23-legacy-data-YYYYMMDD.txt', [
  buildDealerTxtLineFromSpreadsheetLayout('D', { contaDebito: '6.1.1.01.002', data: '20260616' })
]);
generateAndSave('diag-24-legacy-data-05-06-2026.txt', [
  buildDealerTxtLineFromSpreadsheetLayout('D', { contaDebito: '6.1.1.01.002', data: '05/06/2026' })
]);

console.log('Arquivos gerados.');
