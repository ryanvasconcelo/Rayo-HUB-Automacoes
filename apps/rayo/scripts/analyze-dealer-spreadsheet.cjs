const xlsx = require('xlsx');
const path = require('path');

const spreadsheetPath = path.resolve(__dirname, '../../../temp/braga/planilha-importacao-dealer.xlsm');

try {
  const workbook = xlsx.readFile(spreadsheetPath, { cellFormula: true });
  const sheet = workbook.Sheets['Lote'];
  
  console.log('\nRow 8 (First data row):');
  for (let j = 0; j <= 45; j++) {
    const cellAddress = xlsx.utils.encode_cell({ c: j, r: 7 });
    const cell = sheet[cellAddress];
    let val = '';
    if (cell && cell.v !== undefined) val = cell.v;
    let formula = '';
    if (cell && cell.f) formula = ` [Fórmula: =${cell.f}]`;
    
    if (cell) {
        console.log(`  Col ${xlsx.utils.encode_col(j)}: Val=${val}${formula}`);
    }
  }

} catch (error) {
  console.error('Erro ao ler a planilha:', error);
}
