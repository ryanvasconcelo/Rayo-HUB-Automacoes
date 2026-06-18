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

// Base do diag-09
function buildBaseLayout({
  empresa = '01',
  filial = '001',
  contaDebito = '1.1.7.02.011',
  centroDebito = '000600',
  contaCredito = '2.1.2.02.004',
  centroCredito = '',
  valor = 1000,
  dataOverride = '16/06/2026',
  datePos = 'default' // 'default', 'inicio', 'antes-historico', 'final'
}) {
  const tipo = padLeft('FP', 2);
  const nrLote = padRight('', 8);
  const empresaStr = padLeft(empresa, 2);
  const filialStr = padLeft(filial, 3);
  
  const posR = padRight(contaDebito, 20);
  const posS = padRight(centroDebito, 10);
  const tipoSubDeb = padRight('', 2);
  const codSubDeb = padRight('', 15);
  const espaco = padRight('', 24);
  const posW = padRight(contaCredito, 20);
  const posX = padRight(centroCredito, 10);
  const tipoSubCred = padRight('', 2);
  const codSubCred = padRight('', 15);
  const nrDoc = padRight('', 8);
  const histPadrao = padRight('', 4);
  const complemento = padRight('TESTE IMPORTACAO FOLHA', 250);
  const data = padRight(dataOverride, 10);
  const data2 = padRight('', 10);
  const contrapartida = padRight('', 20);
  const valorStr = formatMoneyDealer(valor, 18);

  let parts = [];

  if (datePos === 'default') {
    parts = [
      tipo, nrLote, empresaStr, filialStr,
      posR, posS, tipoSubDeb, codSubDeb, espaco,
      posW, posX, tipoSubCred, codSubCred,
      nrDoc, histPadrao, complemento, data, data2, contrapartida, valorStr
    ];
  } else if (datePos === 'inicio') {
    // Logo após empresa/filial
    parts = [
      tipo, nrLote, empresaStr, filialStr,
      data, // Inserida aqui
      posR, posS, tipoSubDeb, codSubDeb, espaco,
      posW, posX, tipoSubCred, codSubCred,
      nrDoc, histPadrao, complemento, data2, contrapartida, valorStr
    ];
  } else if (datePos === 'antes-historico') {
    // Antes de Histórico (histPadrao)
    parts = [
      tipo, nrLote, empresaStr, filialStr,
      posR, posS, tipoSubDeb, codSubDeb, espaco,
      posW, posX, tipoSubCred, codSubCred,
      nrDoc, data, // Inserida aqui
      histPadrao, complemento, data2, contrapartida, valorStr
    ];
  } else if (datePos === 'final') {
    // No final (após valor)
    parts = [
      tipo, nrLote, empresaStr, filialStr,
      posR, posS, tipoSubDeb, codSubDeb, espaco,
      posW, posX, tipoSubCred, codSubCred,
      nrDoc, histPadrao, complemento, data2, contrapartida, valorStr,
      data // Inserida aqui
    ];
  }

  const line = parts.join('');
  if (line.length !== 453) throw new Error(`Tamanho inválido: ${line.length}`);
  return line;
}

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

function generateAndSave(filename, options) {
  const line = buildBaseLayout(options);
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, line + '\r\n');
  console.log(`[GERADO] ${filename} (tamanho: ${line.length})`);
}

// 1. diag-10-empresa01-data-ddmmyyyy.txt
generateAndSave('diag-10-empresa01-data-ddmmyyyy.txt', { dataOverride: '16/06/2026' });

// 2. diag-11-empresa01-data-ddmmaaaa-sem-barras.txt
generateAndSave('diag-11-empresa01-data-ddmmaaaa-sem-barras.txt', { dataOverride: '16062026' });

// 3. diag-12-empresa01-data-yyyymmdd.txt
generateAndSave('diag-12-empresa01-data-yyyymmdd.txt', { dataOverride: '20260616' });

// 4. diag-13-empresa01-data-no-inicio.txt
generateAndSave('diag-13-empresa01-data-no-inicio.txt', { datePos: 'inicio' });

// 5. diag-14-empresa01-data-antes-historico.txt
generateAndSave('diag-14-empresa01-data-antes-historico.txt', { datePos: 'antes-historico' });

// 6. diag-15-empresa01-data-final.txt
generateAndSave('diag-15-empresa01-data-final.txt', { datePos: 'final' });

// 7. diag-16-empresa01-contas-plano-folha.txt
generateAndSave('diag-16-empresa01-contas-plano-folha.txt', {
  contaDebito: '6.1.1.01.002',
  contaCredito: '2.1.1.01.001'
});

// 8. diag-17-empresa01-sem-centro.txt
generateAndSave('diag-17-empresa01-sem-centro.txt', {
  centroDebito: '',
  centroCredito: ''
});

console.log('\nTodos os arquivos gerados com 453 caracteres, em linha única com débito e crédito, e CRLF.');
