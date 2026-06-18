import fs from 'fs';
import { parseFortesCsv } from './src/lib/folha-dealer/fortes-csv-parser.js';
import { normalizeFortesQueryRows } from './src/lib/folha-dealer/fortes-query-adapter.js';
import { createFolhaDealerRun, approveFolhaDealerRun } from './src/lib/folha-dealer/folha-dealer-run-service.js';
import { bragaVeiculosConfig } from './src/lib/folha-dealer/braga-veiculos.config.js';
import { exportDealerTxt } from './src/lib/folha-dealer/dealer-txt-exporter.js';

try {
  const csvContent = fs.readFileSync('/Users/ryanrichard/projecont/automacoes_RH/automacao_rh_adiantamento/backend/extracao_folha_consolidada.csv', 'utf8');
  
  const { rawRows } = parseFortesCsv(csvContent, '9274', '202604');
  let payrollRows = normalizeFortesQueryRows(rawRows);
  
  payrollRows = payrollRows.map(row => ({
    ...row,
    companyId: 'braga-veiculos'
  }));

  const runResult = createFolhaDealerRun(payrollRows, {
    config: bragaVeiculosConfig,
    competence: '2026-04'
  });

  const missingCenters = new Set();
  const missingAccounts = new Set();
  
  runResult.issues.forEach(i => {
    if (i.code === 'MISSING_CENTER_MAPPING') missingCenters.add(i.context.lotacaoCode);
    if (i.code === 'MISSING_ACCOUNT_MAPPING') missingAccounts.add(i.context.eventCode);
  });

  let totalDebit = 0;
  let totalCredit = 0;
  runResult.entries.forEach(e => {
    if (e.dc === 'D') totalDebit += e.amountCents;
    if (e.dc === 'C') totalCredit += e.amountCents;
  });

  console.log('Status final:', runResult.status);
  console.log('Total Débito:', totalDebit / 100);
  console.log('Total Crédito:', totalCredit / 100);
  console.log('Diferença:', Math.abs(totalDebit - totalCredit) / 100);
  console.log('Blockers count:', runResult.issues.filter(i => i.severity === 'blocker').length);
  console.log('Missing centers grouped:', Array.from(missingCenters));
  console.log('Missing accounts grouped:', Array.from(missingAccounts));

  if (runResult.status === 'ready') {
    let errorBeforeApproval = false;
    try {
      exportDealerTxt(runResult, { dealerCompanyField: '02', dealerBranchField: '001', accountingDate: '31102023' });
    } catch (e) {
      errorBeforeApproval = true;
    }
    console.log('TXT bloqueado antes da aprovação?', errorBeforeApproval ? 'Sim' : 'Não');

    const approved = approveFolhaDealerRun(runResult, { approvedBy: 'System', notes: 'OK' });
    let errorAfterApproval = false;
    try {
      exportDealerTxt(approved, { dealerCompanyField: '02', dealerBranchField: '001', accountingDate: '31102023' });
    } catch (e) {
      errorAfterApproval = true;
    }
    console.log('TXT liberado depois da aprovação?', !errorAfterApproval ? 'Sim' : 'Não');
  }

} catch (err) {
  console.error('Erro:', err.message);
}
