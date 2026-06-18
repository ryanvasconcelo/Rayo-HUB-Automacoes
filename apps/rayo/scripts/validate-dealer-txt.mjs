import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Forneça o caminho do arquivo TXT a ser validado.');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), args[0]);

if (!fs.existsSync(filePath)) {
  console.error(`Arquivo não existe: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

if (!content) {
  console.error('Arquivo vazio.');
  process.exit(1);
}

// Verifica e divide as linhas garantindo que mantém vazias para checar trailing se necessário, mas o principal é filtrar o que é linha válida
const hasCRLF = content.includes('\r\n');
const lines = content.split(/\r?\n/).filter(l => l.length > 0);

let hasError = false;

if (lines.length === 0) {
  console.error('Arquivo não tem linhas.');
  hasError = true;
}

if (!hasCRLF && lines.length > 0) {
  console.error('Arquivo não usa CRLF.');
  hasError = true;
}

let totalDebit = 0;
let totalCredit = 0;

lines.forEach((line, index) => {
  const lineNum = index + 1;
  
  if (line.length !== 453) {
    console.error(`Erro na linha ${lineNum}: Tamanho incorreto (${line.length} ao invés de 453)`);
    hasError = true;
  }
  
  if (line.includes('undefined')) {
    console.error(`Erro na linha ${lineNum}: Contém 'undefined'`);
    hasError = true;
  }
  
  if (line.includes('null')) {
    console.error(`Erro na linha ${lineNum}: Contém 'null'`);
    hasError = true;
  }
  
  if (line.includes('Invalid Date')) {
    console.error(`Erro na linha ${lineNum}: Contém 'Invalid Date'`);
    hasError = true;
  }

  // Conta debito vai de 15 a 35 (20 chars)
  const isDebit = line.substring(15, 35).trim() !== '';
  // Valor vai nas ultimas 18 casas (de 435 a 453)
  const valorStr = line.substring(435, 453).trim();
  const valorNum = parseFloat(valorStr);
  
  if (!isNaN(valorNum)) {
    if (isDebit) {
      totalDebit += valorNum;
    } else {
      totalCredit += valorNum;
    }
  }
});

console.log(`Quantidade de linhas: ${lines.length}`);
console.log(`Total Débito: R$ ${(totalDebit).toFixed(2)}`);
console.log(`Total Crédito: R$ ${(totalCredit).toFixed(2)}`);
const diff = Math.abs(totalDebit - totalCredit);
console.log(`Diferença: R$ ${diff.toFixed(2)}`);

if (hasError) {
  console.error('Foram encontrados erros no arquivo.');
  process.exit(1);
} else {
  console.log('TXT Dealer válido para teste de importação.');
}
