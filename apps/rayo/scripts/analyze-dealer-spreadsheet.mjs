import * as xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const spreadsheetPath = path.resolve(__dirname, '../../../../temp/braga/planilha-importacao-dealer.xlsm');

console.log(`Lendo: ${spreadsheetPath}`);

try {
  const workbook = xlsx.readFile(spreadsheetPath, { cellFormula: true });
  
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n=== Aba: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });
    
    // Mostra as primeiras 5 linhas
    for (let i = 0; i < Math.min(5, json.length); i++) {
      console.log(`Linha ${i+1}:`);
      const row = json[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length; j++) {
        if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
          const cellAddress = xlsx.utils.encode_cell({ c: j, r: i });
          const cell = sheet[cellAddress];
          let formula = '';
          if (cell && cell.f) {
            formula = ` [Fórmula: =${cell.f}]`;
          }
          console.log(`  Col ${xlsx.utils.encode_col(j)} (${cellAddress}): ${row[j]}${formula}`);
        }
      }
    }
    
    if (sheetName.toLowerCase().includes('lote') || sheetName.toLowerCase().includes('planilha1')) {
      console.log('\n--- Inspecionando colunas de montagem (Linha 3 a 5) ---');
      for (let i = 1; i < Math.min(5, json.length); i++) {
         const row = json[i];
         if (!row) continue;
         for (let j = 0; j < row.length; j++) {
            if (row[j]) {
                const cellAddress = xlsx.utils.encode_cell({ c: j, r: i });
                const cell = sheet[cellAddress];
                if (cell && typeof cell.v === 'string' && cell.v.length > 50) {
                    console.log(`  -> TEXTO LONGO GERADO em ${cellAddress}: tamanho=${cell.v.length}`);
                    console.log(`  -> Fórmula: =${cell.f || 'nenhuma'}`);
                    // console.log(`  -> Texto: ${cell.v.substring(0, 100)}...`);
                }
            }
         }
      }
    }
  }
} catch (error) {
  console.error('Erro ao ler a planilha:', error);
}
