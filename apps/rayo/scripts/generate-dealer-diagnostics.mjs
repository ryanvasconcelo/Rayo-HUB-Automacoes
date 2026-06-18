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

function buildDiagnosticLine({
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
  
  // Colocando conta e centro SEMPRE na posição de débito (conforme pedido)
  const contaPos = padRight(account, 20);
  const centroPos = padRight(center || '', 10);
  const tipoSub = padRight('', 2);
  const codSub = padRight('', 15);
  
  const espaco = padRight('', 24);
  
  const contaCreditoVazia = padRight('', 20);
  const centroCreditoVazio = padRight('', 10);
  const tipoSubCred = padRight('', 2);
  const codSubCred = padRight('', 15);
  
  const nrDoc = padRight('', 8);
  const histPadrao = padRight('', 4);
  const complemento = padRight('TESTE IMPORTACAO FOLHA', 250);
  const data = padRight('16/06/2026', 10);
  const data2 = padRight('', 10);
  const contrapartida = padRight('', 20);
  const valorStr = formatMoneyDealer(valor, 18);

  const line = [
    tipo, nrLote, empresaStr, filialStr,
    contaPos, centroPos, tipoSub, codSub,
    espaco,
    contaCreditoVazia, centroCreditoVazio, tipoSubCred, codSubCred,
    nrDoc, histPadrao, complemento, data, data2, contrapartida, valorStr
  ].join('');

  if (line.length !== 453) {
    throw new Error(`Linha com tamanho inválido: ${line.length}`);
  }
  if (line.includes('undefined') || line.includes('null') || line.includes('Invalid Date')) {
    throw new Error(`Linha contém valores inválidos`);
  }

  return line;
}

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

// --- diag-07-conta-unica-contas-ativas.txt ---
const diag07Lines = [
  buildDiagnosticLine({
    empresa: '07',
    filial: '001',
    account: '1.1.7.02.011',
    center: '000600', // Assumindo centro genérico para o teste, ou vazio
    valor: 1000
  }),
  buildDiagnosticLine({
    empresa: '07',
    filial: '001',
    account: '2.1.2.02.004',
    center: '',
    valor: 1000
  })
];

const diag07Path = path.join(outDir, 'diag-07-conta-unica-contas-ativas.txt');
fs.writeFileSync(diag07Path, diag07Lines.join('\r\n') + '\r\n');
console.log(`Gerado: ${diag07Path}`);
console.log(`Linha 1 (Débito): \n${diag07Lines[0]}`);
console.log(`Linha 2 (Crédito):\n${diag07Lines[1]}\n`);

// --- diag-08-conta-unica-sem-empresa-filial.txt ---
const diag08Lines = [
  buildDiagnosticLine({
    empresa: '',
    filial: '',
    account: '1.1.7.02.011',
    center: '000600',
    valor: 1000
  }),
  buildDiagnosticLine({
    empresa: '',
    filial: '',
    account: '2.1.2.02.004',
    center: '',
    valor: 1000
  })
];

const diag08Path = path.join(outDir, 'diag-08-conta-unica-sem-empresa-filial.txt');
fs.writeFileSync(diag08Path, diag08Lines.join('\r\n') + '\r\n');
console.log(`Gerado: ${diag08Path}`);
console.log(`Linha 1 (Débito): \n${diag08Lines[0]}`);
console.log(`Linha 2 (Crédito):\n${diag08Lines[1]}\n`);
