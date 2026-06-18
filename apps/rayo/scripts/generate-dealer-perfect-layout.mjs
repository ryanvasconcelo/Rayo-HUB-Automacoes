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

function buildPerfectLayout({
  tipo = 'FP',
  nrLote = '',
  empresa = '01',
  filial = '001',
  
  contaDebito = '',
  centroDebito = '',
  tipoSubDebito = '',
  codSubDebito = '',
  
  contaCredito = '',
  centroCredito = '',
  tipoSubCredito = '',
  codSubCredito = '',
  
  nrDoc = '',
  histPadrao = '',
  complemento = 'TESTE IMPORTACAO FOLHA',
  data = '30/04/2026', // DD/MM/YYYY
  data2 = '',
  contrapartida = '',
  valorCents = 3202365 // R$ 320.23,65
}) {
  const parts = [
    padLeft(tipo, 2),
    padRight(nrLote, 8),
    padLeft(empresa, 2),
    padLeft(filial, 3),
    
    padRight(contaDebito, 20),
    padRight(centroDebito, 10),
    padRight(tipoSubDebito, 2),
    padRight(codSubDebito, 15),
    
    padRight(contaCredito, 20),
    padRight(centroCredito, 10),
    padRight(tipoSubCredito, 2),
    padRight(codSubCredito, 15),
    
    padRight(nrDoc, 8),
    padRight(histPadrao, 4),
    padRight(complemento, 250),
    padRight(data, 10),
    padRight(data2, 10),
    padRight(contrapartida, 20),
    formatMoneyDealer(valorCents, 18)
  ];

  const line = parts.join('');
  if (line.length !== 429) {
    throw new Error(`Tamanho inválido: ${line.length}`);
  }
  return line;
}

const outDir = path.resolve(__dirname, '../output/dealer-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

function generateAndSave(filename, options) {
  const line = buildPerfectLayout(options);
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, line + '\r\n');
  console.log(`[GERADO] ${filename} (tamanho: ${line.length})`);
}

// Vamos gerar um arquivo com as contas reais do plano de folha, testando a "Partida Dobrada" (Debito e Credito na mesma linha)
generateAndSave('diag-18-perfect-layout-partida-dobrada.txt', {
  contaDebito: '6.1.1.01.002',
  contaCredito: '2.1.1.01.001',
  valorCents: 150000 // R$ 1.500,00
});

// Vamos gerar arquivos separados para Debito e Credito, igual a planilha original faz
generateAndSave('diag-19-perfect-layout-apenas-debito.txt', {
  contaDebito: '6.1.1.01.002',
  valorCents: 150000
});

generateAndSave('diag-20-perfect-layout-apenas-credito.txt', {
  contaCredito: '2.1.1.01.001',
  valorCents: 150000
});

console.log('\nTodos os arquivos gerados com 429 caracteres e posições absolutas corretas.');
