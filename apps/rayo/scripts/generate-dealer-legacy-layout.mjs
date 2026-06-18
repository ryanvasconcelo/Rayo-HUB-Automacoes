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
  // type = 'D' or 'C'
  const isD = type.toUpperCase() === 'D';
  const isC = type.toUpperCase() === 'C';

  // 1 a 4
  const tipoLote = padLeft(options.tipo || 'FP', 2);
  const espacoLote = padRight(options.nrLote || '', 8);
  const empresa = padLeft(options.empresa || '01', 2);
  const filial = padLeft(options.filial || '001', 3);

  // 5 a 8 (Debito)
  const contaDebito = isD ? padRight(options.contaDebito || '', 20) : padRight('', 20);
  const centroDebito = isD ? padRight(options.centroDebito || '', 10) : ' ';
  const tipoSubDebito = isD ? padRight(options.tipoSubDebito || '', 2) : ' ';
  const codSubDebito = isD ? padRight(options.codSubDebito || '', 15) : ' ';

  // 9 (Espaço fixo 24)
  const espacoMeio = padRight('', 24);

  // 10 a 13 (Credito)
  const contaCredito = isC ? padRight(options.contaCredito || '', 20) : padRight('', 20);
  const centroCredito = isC ? padRight(options.centroCredito || '', 10) : ' ';
  const tipoSubCredito = isC ? padRight(options.tipoSubCredito || '', 2) : ' ';
  const codSubCredito = isC ? padRight(options.codSubCredito || '', 15) : ' ';

  // 14 a 20
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

  if (line.length !== 429) {
    throw new Error(`Line length is ${line.length}, expected 429!`);
  }

  // Debug info
  console.log(`[DEBUG - Tipo ${type}] Data começa no índice: ${line.indexOf(data)}`);
  
  return line;
}

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

function generateAndSave(filename, lines) {
  const filePath = path.join(outDir, filename);
  const content = lines.join('\r\n') + '\r\n';
  fs.writeFileSync(filePath, content);
  console.log(`[GERADO] ${filename} (Linhas: ${lines.length}, Tamanho 1a Linha: ${lines[0].length})`);
  console.log(`Tamanho em bytes: ${Buffer.byteLength(content, 'utf8')} bytes`);
}

// 1. diag-18-legacy429-empresa01.txt
const diag18Debito = buildDealerTxtLineFromSpreadsheetLayout('D', {
  empresa: '01',
  filial: '001',
  tipo: 'FP',
  data: '16/06/2026',
  complemento: 'TESTE IMPORTACAO FOLHA',
  valor: 10.00,
  contaDebito: '1.1.7.02.011',
  centroDebito: '000600'
});

const diag18Credito = buildDealerTxtLineFromSpreadsheetLayout('C', {
  empresa: '01',
  filial: '001',
  tipo: 'FP',
  data: '16/06/2026',
  complemento: 'TESTE IMPORTACAO FOLHA',
  valor: 10.00,
  contaCredito: '2.1.2.02.004'
});

generateAndSave('diag-18-legacy429-empresa01.txt', [diag18Debito, diag18Credito]);
console.log('\nConteúdo diag-18 (D):');
console.log(diag18Debito);
console.log('\nConteúdo diag-18 (C):');
console.log(diag18Credito);

// 2. diag-19-legacy429-contas-folha.txt
const diag19Debito = buildDealerTxtLineFromSpreadsheetLayout('D', {
  empresa: '01',
  filial: '001',
  tipo: 'FP',
  data: '16/06/2026',
  complemento: 'TESTE IMPORTACAO FOLHA',
  valor: 10.00,
  contaDebito: '6.1.1.01.002'
});

const diag19Credito = buildDealerTxtLineFromSpreadsheetLayout('C', {
  empresa: '01',
  filial: '001',
  tipo: 'FP',
  data: '16/06/2026',
  complemento: 'TESTE IMPORTACAO FOLHA',
  valor: 10.00,
  contaCredito: '2.1.1.01.001'
});

generateAndSave('diag-19-legacy429-contas-folha.txt', [diag19Debito, diag19Credito]);

console.log('\nValidação Concluída: 429 caracteres com CRLF no final e sem blocos com espaços desnecessários nas linhas opostas.');
