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

function buildPadraoLine({
  empresa,
  filial,
  contaDebito,
  centroDebito,
  contaCredito,
  centroCredito,
  valor
}) {
  const tipo = padLeft('FP', 2);
  const nrLote = padRight('', 8);
  const empresaStr = padLeft(empresa, 2);
  const filialStr = padLeft(filial, 3);
  
  // Débito
  const posR = padRight(contaDebito, 20);
  const posS = padRight(centroDebito, 10);
  const tipoSubDeb = padRight('', 2);
  const codSubDeb = padRight('', 15);
  
  const espaco = padRight('', 24);
  
  // Crédito
  const posW = padRight(contaCredito, 20);
  const posX = padRight(centroCredito, 10);
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
    posR, posS, tipoSubDeb, codSubDeb,
    espaco,
    posW, posX, tipoSubCred, codSubCred,
    nrDoc, histPadrao, complemento, data, data2, contrapartida, valorStr
  ].join('');

  if (line.length !== 453) throw new Error(`Tamanho inválido: ${line.length}`);
  return line;
}

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

// --- diag-09-empresa-01-layout-padrao.txt ---
// Cria um lançamento perfeitamente equilibrado em UMA SÓ LINHA
// Assim como o Layout Padrão original suporta
const line1 = buildPadraoLine({
  empresa: '01',
  filial: '001',
  contaDebito: '1.1.7.02.011',
  centroDebito: '000600',
  contaCredito: '2.1.2.02.004',
  centroCredito: '',
  valor: 1000
});

const diag09Path = path.join(outDir, 'diag-09-empresa-01-layout-padrao.txt');
fs.writeFileSync(diag09Path, line1 + '\r\n');
console.log(`Gerado: ${diag09Path}`);
console.log(`Linha Única (Débito + Crédito):\n${line1}\n`);
