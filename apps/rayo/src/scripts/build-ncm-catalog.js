import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho absoluto para a Tabela NCM fornecida na sprint JR
const excelPath = path.resolve(__dirname, '../../../../temp/sprint JR/Tabela_NCM_Vigente_20260527.xlsx');
const outPath = path.resolve(__dirname, '../lib/auditor/data/ncm_vigente.json');

console.log(`Lendo arquivo: ${excelPath}`);

if (!fs.existsSync(excelPath)) {
    console.error(`Erro: Arquivo Excel não encontrado em ${excelPath}`);
    process.exit(1);
}

const wb = xlsx.readFile(excelPath);
const wsName = wb.SheetNames[0];
const ws = wb.Sheets[wsName];

// Ler como um array de arrays para encontrar o cabeçalho dinamicamente
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

let headerIndex = -1;
let codigoColIdx = -1;
let descColIdx = -1;

for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    const cIdx = row.findIndex(c => String(c).trim() === 'Código');
    const dIdx = row.findIndex(c => String(c).trim() === 'Descrição');
    
    if (cIdx !== -1 && dIdx !== -1) {
        headerIndex = i;
        codigoColIdx = cIdx;
        descColIdx = dIdx;
        break;
    }
}

if (headerIndex === -1) {
    console.error(`Erro: Não foi possível localizar as colunas "Código" e "Descrição" nas primeiras 20 linhas.`);
    process.exit(1);
}

console.log(`Cabeçalho detectado na linha ${headerIndex + 1}. Coluna Código: ${codigoColIdx}, Coluna Descrição: ${descColIdx}`);

const ncmMap = {};

for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const codigoRaw = String(row[codigoColIdx] || '').replace(/\D/g, '');
    const descricao = String(row[descColIdx] || '').trim();

    if (codigoRaw && codigoRaw.length === 8 && descricao) {
        ncmMap[codigoRaw] = descricao;
    }
}

const numNcms = Object.keys(ncmMap).length;
console.log(`Extraídos ${numNcms} NCMs válidos (8 dígitos).`);

fs.writeFileSync(outPath, JSON.stringify(ncmMap, null, 2), 'utf8');
console.log(`Catálogo salvo em: ${outPath}`);
