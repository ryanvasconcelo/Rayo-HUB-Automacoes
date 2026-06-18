import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = '../../temp/braga/planilha-importacao-dealer.xlsm';
const buffer = readFileSync(filePath);
const wb = XLSX.read(buffer, { type: 'buffer', cellFormula: true, cellStyles: true, cellHTML: false });
const ws = wb.Sheets['Lote'];

if (!ws) {
  console.error("Aba 'Lote' não encontrada!");
  process.exit(1);
}

// Converte a aba para formato matriz A1...
const range = XLSX.utils.decode_range(ws['!ref']);

let text152Cells = [];
let lenFormulas = [];
let lancarRows = [];

for (let R = range.s.r; R <= range.e.r; ++R) {
  // Ler a linha 
  const getCell = (colChar) => {
    const C = XLSX.utils.decode_col(colChar);
    const cellAddress = {c:C, r:R};
    return ws[XLSX.utils.encode_cell(cellAddress)];
  };

  const getVal = (colChar) => getCell(colChar)?.v;
  const getForm = (colChar) => getCell(colChar)?.f;
  const getTxt = (colChar) => getCell(colChar)?.w || getVal(colChar);

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = {c:C, r:R};
    const cellRef = XLSX.utils.encode_cell(cellAddress);
    const cell = ws[cellRef];
    if (cell) {
      if (typeof cell.v === 'string' && cell.v.includes('152')) {
        text152Cells.push({ cell: cellRef, value: cell.v });
      }
      if (cell.f && (cell.f.includes('LEN') || cell.f.includes('NÚM.CARACT') || cell.f.includes('CONCAT') || cell.f.includes('TEXTJOIN'))) {
        lenFormulas.push({ cell: cellRef, formula: cell.f, value: cell.v });
      }
    }
  }

  // A coluna J é a coluna "LANÇAR"
  const lancaVal = getVal('J');
  if (lancaVal === 'LANÇAR' || lancaVal === 'LANCAR') {
    const rowObj = {
      row: R + 1,
      A: getTxt('A'), B: getTxt('B'), C: getTxt('C'), D: getTxt('D'),
      E: getTxt('E'), F: getVal('F'), G: getTxt('G'), H: getTxt('H'),
      J: getTxt('J'),
      L_form: getForm('L'), L_val: getTxt('L'),
      // Pegar as colunas N:AG
      N_form: getForm('N'), N_val: getTxt('N'),
      O_form: getForm('O'), O_val: getTxt('O'),
      P_form: getForm('P'), P_val: getTxt('P'),
      Q_form: getForm('Q'), Q_val: getTxt('Q'),
      R_form: getForm('R'), R_val: getTxt('R'),
      S_form: getForm('S'), S_val: getTxt('S'),
      T_form: getForm('T'), T_val: getTxt('T'),
      U_form: getForm('U'), U_val: getTxt('U'),
      V_form: getForm('V'), V_val: getTxt('V'),
      W_form: getForm('W'), W_val: getTxt('W'),
      X_form: getForm('X'), X_val: getTxt('X'),
      Y_form: getForm('Y'), Y_val: getTxt('Y'),
      Z_form: getForm('Z'), Z_val: getTxt('Z'),
      AA_form: getForm('AA'), AA_val: getTxt('AA'),
      AB_form: getForm('AB'), AB_val: getTxt('AB'),
      AC_form: getForm('AC'), AC_val: getTxt('AC'),
      AD_form: getForm('AD'), AD_val: getTxt('AD'),
      AE_form: getForm('AE'), AE_val: getTxt('AE'),
      AF_form: getForm('AF'), AF_val: getTxt('AF'),
      AG_form: getForm('AG'), AG_val: getTxt('AG'),
    };

    lancarRows.push(rowObj);
  }
}

console.log("=== Células com 152 ===");
console.log(JSON.stringify(text152Cells, null, 2));

console.log("\n=== Fórmulas de Tamanho (LEN, etc) ===");
console.log(JSON.stringify(lenFormulas.slice(0, 5), null, 2));

console.log("\n=== Análise da Linha 8 ===");
const getCellRef = (c, r) => XLSX.utils.encode_cell({c: XLSX.utils.decode_col(c), r: r});

['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'L'].forEach(c => {
  const cell = ws[getCellRef(c, 7)];
  console.log(`${c}8: val=`, cell?.v, ` formula=`, cell?.f);
});

// Procurar qualquer linha que tenha valor na coluna A
let foundData = false;
for (let i = 7; i < 500; i++) {
  const A = ws[getCellRef('A', i)];
  if (A && A.v) {
    console.log(`\n=== Linha com dados encontrada: Linha ${i+1} ===`);
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'L', 'AI'].forEach(c => {
      const cell = ws[getCellRef(c, i)];
      console.log(`${c}${i+1}: val=`, cell?.v, ` formula=`, cell?.f);
    });
    
    let sumSizes = 0;
    let concatL = '';
    ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG'].forEach(c => {
      const cell = ws[getCellRef(c, i)];
      console.log(`${c}${i+1} formula:`, cell?.f);
    });
    
    foundData = true;
    break;
  }
}
if (!foundData) console.log("Nenhuma linha com dados encontrada na coluna A.");



