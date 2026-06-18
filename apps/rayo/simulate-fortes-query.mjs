import { fetchFortesDataMock } from './src/lib/folha-dealer/fortes-data-fetcher.js';
import { normalizeFortesQueryRows } from './src/lib/folha-dealer/fortes-query-adapter.js';
import { createFolhaDealerRun, approveFolhaDealerRun } from './src/lib/folha-dealer/folha-dealer-run-service.js';
import { exportDealerTxt } from './src/lib/folha-dealer/dealer-txt-exporter.js';
import { exportConferenceXlsx } from './src/lib/folha-dealer/conference-xlsx-exporter.js';
import { bragaVeiculosConfig } from './src/lib/folha-dealer/braga-veiculos.config.js';
import fs from 'fs/promises';
import path from 'path';

async function run() {
  console.log("Iniciando extração do banco Fortes (Simulado)...");
  
  const { metadata, rawRows } = await fetchFortesDataMock('9274', '202604');
  
  console.log("\nMetadados da extração:");
  console.log(JSON.stringify(metadata, null, 2));
  
  console.log("\nNormalizando dados...");
  let payrollRows = normalizeFortesQueryRows(rawRows);
  
  // Como o adapter manteve o companyId real '9274', vamos forçar temporariamente o 
  // companyId para bater com as chaves do de-para ('braga-veiculos') para o motor.
  payrollRows = payrollRows.map(row => ({
    ...row,
    companyId: 'braga-veiculos'
  }));

  console.log("Alimentando o motor contábil...");
  
  const runResult = createFolhaDealerRun(payrollRows, {
    config: bragaVeiculosConfig,
    competence: '2026-04'
  });
  
  console.log(`Status do motor: ${runResult.status}`);
  console.log(`Lançamentos gerados: ${runResult.entries.length}`);
  
  const blockers = runResult.issues.filter(i => i.severity === 'blocker');
  const warnings = runResult.issues.filter(i => i.severity === 'warning');

  if (blockers.length > 0) {
    console.log("\nBlockers encontrados:");
    blockers.forEach(b => console.log(`- [${b.code}] ${b.message}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\nWarnings: ${warnings.length} (amostra de 5)`);
    warnings.slice(0, 5).forEach(w => console.log(`- [${w.code}] ${w.message}`));
  }
  
  if (runResult.status === 'ready') {
    console.log("\nAprovando execução...");
    const approvedRun = approveFolhaDealerRun(runResult, 'System Admin', 'Aprovação Automática Dry Run');
    
    console.log("Exportando TXT...");
    const txtBuffer = exportDealerTxt(approvedRun, {
      dealerCompanyField: bragaVeiculosConfig.company.dealerCompanyField,
      dealerBranchField: bragaVeiculosConfig.company.dealerBranch,
      accountingDate: '30042026'
    });
    
    await fs.writeFile('dry-run-dealer.txt', txtBuffer);
    console.log("TXT salvo como dry-run-dealer.txt");
    
    console.log("Exportando XLSX de conferência...");
    const xlsxBuffer = exportConferenceXlsx(approvedRun, bragaVeiculosConfig);
    await fs.writeFile('dry-run-conference.xlsx', xlsxBuffer);
    console.log("XLSX salvo como dry-run-conference.xlsx");
  } else {
    console.log("\nExecução bloqueada. Exportando XLSX de conferência com os bloqueios...");
    const xlsxBuffer = exportConferenceXlsx(runResult, bragaVeiculosConfig);
    await fs.writeFile('dry-run-conference-blocked.xlsx', xlsxBuffer);
    console.log("XLSX salvo como dry-run-conference-blocked.xlsx");
  }
}

run().catch(console.error);
