import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFortesCsv } from '../src/lib/folha-dealer/fortes-csv-parser.js';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';
import { createFolhaDealerRun, approveFolhaDealerRun, exportApprovedDealerTxt } from '../src/lib/folha-dealer/folha-dealer-run-service.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, '../output/extracao_folha_consolidada_local.csv');
const outDir = path.resolve(__dirname, '../output');

fs.mkdirSync(outDir, { recursive: true });

async function runEndToEnd() {
  console.log('1. Lendo CSV original de extração...');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  // A extração usa ID 9274 e competencia 202604
  console.log('2. Fazendo parse do CSV...');
  const { rawRows } = parseFortesCsv(csvContent, '9274', '2026-04');
  
  console.log(`-> Encontradas ${rawRows.length} linhas para a empresa 9274.`);
  
  // Como o nosso mock de config usa 'braga-veiculos', vamos adaptar o companyId para o mapper achar os Centros de Custo
  for (const row of rawRows) {
    row.companyId = bragaVeiculosConfig.company.companyId;
  }
  
  // Formatando o dealerLotAccountCode para o formato que o dev do Dealer pediu (sem pontos, alinhado à direita com espaços)
  for (const mapping of bragaVeiculosConfig.accountMappings) {
    if (mapping.dealerAccountCode && !mapping.dealerLotAccountCode) {
      const cleanCode = mapping.dealerAccountCode.replace(/\./g, '');
      mapping.dealerLotAccountCode = cleanCode.padStart(12, ' ');
    }
  }
  
  console.log('Exemplo de mapping modificado:', bragaVeiculosConfig.accountMappings.find(m => m.eventCode === '011'));
  
  console.log('3. Normalizando para o formato do Dealer Engine...');
  const normalizedRows = normalizeFortesQueryRows(rawRows);
  console.log(`-> Normalizadas ${normalizedRows.length} linhas (incluindo líquidos calculados).`);
  console.log('Primeira linha normalizada:', normalizedRows[0]);
  
  console.log('4. Criando Run no FolhaDealerRunService...');
  const runState = createFolhaDealerRun(normalizedRows, {
    competence: '2026-04',
    config: bragaVeiculosConfig
  });
  
  if (runState.status === 'blocked') {
    console.error('================================================');
    console.error('ERRO: O Run foi bloqueado pelo Motor Contábil!');
    
    const blockers = runState.issues.filter(i => i.severity === 'blocker');
    
    const missingEvents = [...new Set(blockers.filter(i => i.code === 'MISSING_ACCOUNT_MAPPING').map(i => i.context.eventCode))].sort();
    
    // Some issues might have been created by missing centers, let's see if we can find any
    const missingCenters = [...new Set(blockers.filter(i => i.code === 'MISSING_CENTER_MAPPING').map(i => i.context.lotacaoCode))].sort();
    
    console.log(`\nFaltam De-Para para ${missingEvents.length} Eventos:`);
    console.log(missingEvents.join(', '));
    
    if (missingCenters.length > 0) {
       console.log(`\nFaltam De-Para para ${missingCenters.length} Centros de Resultado:`);
       console.log(missingCenters.join(', '));
    }
    
    // Let's also find which Lotação codes exist in the raw rows that are not in the center mapping
    const rawLotacoes = [...new Set(rawRows.map(r => r.lotacaoCode))].sort();
    const mappedLotacoes = bragaVeiculosConfig.centerMappings.map(m => m.lotacaoCode);
    const unmappedLotacoes = rawLotacoes.filter(l => !mappedLotacoes.includes(l));
    
    console.log(`\nLotações brutas presentes no banco sem mapeamento de Centro de Resultado:`);
    console.log(unmappedLotacoes.join(', '));

    console.error('================================================');
    process.exit(1);
  }
  
  console.log('5. Aprovando o Run...');
  const approvedRun = approveFolhaDealerRun(runState, {
    approvedBy: 'ryan',
    approvedAt: new Date().toISOString(),
    notes: 'Aprovação Automática E2E'
  });
  
  console.log('6. Exportando TXT do Dealer...');
  
  // Data de exportação hoje para testes, ou data de fechamento 2026-04-30
  const txtOptions = {
    dealerCompanyField: '01',
    dealerBranchField: '001',
    accountingDate: '2026-04-30'
  };
  
  const result = exportApprovedDealerTxt(approvedRun, txtOptions);
  
  const txtPath = path.join(outDir, 'folha-braga-2026-04-E2E.txt');
  fs.writeFileSync(txtPath, result.content);
  
  console.log('');
  console.log('============= SUCESSO =============');
  console.log(`Arquivo Final TXT Gerado: ${txtPath}`);
  console.log(`Linhas no TXT: ${result.content.split('\\n').length - 1}`);
}

runEndToEnd().catch(console.error);
