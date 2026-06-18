import fs from 'fs';
import * as xlsx from 'xlsx';

const filePath = '/Users/ryanrichard/projecont/Rayo/temp/braga/dados validados/RCO005_PlanoConta (1).xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

// Procurando a coluna com a conta formatada (ex: 6.1.1.01.002) e a conta Dealer de 12 dígitos
console.log('--- AMOSTRA DAS PRIMEIRAS 10 LINHAS ---');
for (let i = 0; i < Math.min(10, data.length); i++) {
  console.log(`Row ${i}:`, data[i]);
}

// Tentativa heurística de achar a coluna RCO005 (formato com pontos) e a de 12 dígitos
const mappings = {};
let foundCount = 0;

data.forEach(row => {
  if (!Array.isArray(row)) return;
  
  // Extrai strings da linha
  const strings = row.map(cell => String(cell || '').trim());
  
  // Procura uma conta formato Fortes (com pontos)
  const fortesAcc = strings.find(s => /^\d(\.\d+)+$/.test(s));
  
  // Procura uma conta formato Dealer (12 dígitos numéricos)
  const dealerAcc = strings.find(s => /^\d{12}$/.test(s));
  
  if (fortesAcc && dealerAcc) {
    mappings[fortesAcc] = dealerAcc;
    foundCount++;
  }
});

console.log('\n--- MAPA ENCONTRADO (Heurística: Formato Fortes -> 12 Dígitos) ---');
console.log(`Encontrados ${foundCount} mapeamentos possíveis.`);
if (foundCount > 0) {
  const sample = Object.entries(mappings).slice(0, 5);
  console.log('Amostra de mapeamento:', sample);
} else {
  console.log('Não foi possível achar o padrão automático na mesma linha.');
  console.log('Por favor verifique as colunas manualmente na amostra de dados.');
}
