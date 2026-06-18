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

function formatMoneyDealer(amountCents, size) {
  const decimal = (amountCents / 100).toFixed(2);
  return padLeft(decimal, size);
}

// BUG COMPATIBILITY: As fórmulas da planilha geram " " (1 espaço) em vez do tamanho total
// quando a conta não é daquela natureza.
function buildBugCompatibleLine({
  dc,
  empresa,
  filial,
  account,
  center,
  valor
}) {
  const tipo = padLeft('FP', 2);
  const nrLote = padRight('', 8);
  const empresaStr = padLeft(empresa, 2);
  const filialStr = padLeft(filial, 3);
  
  // DÉBITO
  const posR = dc === 'D' ? padRight(account, 20) : padRight('', 20); // Planilha faz REPT(" ",20) mesmo falso
  const posS = dc === 'D' ? padRight(center || '', 10) : ' '; // BUG DA PLANILHA
  const posT = dc === 'D' ? padRight('', 2) : ' '; // BUG DA PLANILHA
  const posU = dc === 'D' ? padRight('', 15) : ' '; // BUG DA PLANILHA
  
  const espaco = padRight('', 24);
  
  // CRÉDITO
  const posW = dc === 'C' ? padRight(account, 20) : padRight('', 20); // REPT(" ",20)
  const posX = dc === 'C' ? padRight(center || '', 10) : ' '; // BUG DA PLANILHA
  const posY = dc === 'C' ? padRight('', 2) : ' '; // BUG DA PLANILHA
  const posZ = dc === 'C' ? padRight('', 15) : ' '; // BUG DA PLANILHA
  
  const nrDoc = padRight('', 8);
  const histPadrao = padRight('', 4);
  const complemento = padRight('TESTE IMPORTACAO FOLHA', 250);
  const data = padRight('16/06/2026', 10);
  const data2 = padRight('', 10);
  const contrapartida = padRight('', 20);
  const valorStr = formatMoneyDealer(valor, 18);

  const line = [
    tipo, nrLote, empresaStr, filialStr,
    posR, posS, posT, posU,
    espaco,
    posW, posX, posY, posZ,
    nrDoc, histPadrao, complemento, data, data2, contrapartida, valorStr
  ].join('');

  return line;
}

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

const lines = [
  buildBugCompatibleLine({
    dc: 'D',
    empresa: '01',
    filial: '001',
    account: '1.1.7.02.011',
    center: '000600',
    valor: 1000
  }),
  buildBugCompatibleLine({
    dc: 'C',
    empresa: '01',
    filial: '001',
    account: '2.1.2.02.004',
    center: '',
    valor: 1000
  })
];

const diag10Path = path.join(outDir, 'diag-10-bug-compatible.txt');
fs.writeFileSync(diag10Path, lines.join('\r\n') + '\r\n');
console.log(`Gerado: ${diag10Path}`);
console.log(`Tamanho Linha 1: ${lines[0].length}`);
console.log(`Tamanho Linha 2: ${lines[1].length}`);
