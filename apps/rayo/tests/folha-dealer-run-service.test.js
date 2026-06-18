import { describe, it, expect } from 'vitest';
import {
  createFolhaDealerRun,
  approveFolhaDealerRun,
  exportApprovedDealerTxt,
  exportRunConferenceXlsx
} from '../src/lib/folha-dealer/folha-dealer-run-service.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import { buildBragaRows } from '../src/lib/folha-dealer/braga-veiculos.fixtures.js';

describe('folha-dealer-run-service', () => {
  const competence = '2026-04';
  const options = { config: bragaVeiculosConfig, competence };
  const validRows = buildBragaRows();

  // Helper: accountMappings com dealerLotAccountCode fake preenchido
  function txtOptionsWithLotCodes() {
    const mappings = bragaVeiculosConfig.accountMappings.map((m, idx) => ({
      ...m,
      dealerLotAccountCode: `${String(idx + 1).padStart(12, '0')}`,
    }));
    return {
      dealerCompanyField: '01',
      dealerBranchField: '001',
      accountingDate: '2026-04-30',
      accountMappings: mappings,
    };
  }

  it('1. cria execução ready quando motor não tem blockers', () => {
    const run = createFolhaDealerRun(validRows, options);
    expect(run.status).toBe('ready');
    expect(run.issues.filter(i => i.severity === 'blocker')).toHaveLength(0);
  });

  it('2. cria execução blocked quando motor tem blockers', () => {
    // Adding a generic event that has no mapping will generate a blocker issue
    const invalidRows = [...validRows, { ...validRows[0], eventCode: '999', eventName: 'Invalid Event', amount: 100.0 }];
    const run = createFolhaDealerRun(invalidRows, options);
    
    expect(run.status).toBe('blocked');
    expect(run.issues.some(i => i.severity === 'blocker')).toBe(true);
  });

  it('3. não aprova execução bloqueada', () => {
    const invalidRows = [...validRows, { ...validRows[0], eventCode: '999', eventName: 'Invalid Event', amount: 100.0 }];
    const run = createFolhaDealerRun(invalidRows, options);
    
    expect(() => approveFolhaDealerRun(run, { approvedBy: 'analyst' })).toThrow(/Não é possível aprovar/);
  });

  it('4. aprova execução ready e muda status para approved', () => {
    let run = createFolhaDealerRun(validRows, options);
    run = approveFolhaDealerRun(run, { approvedBy: 'analyst' });
    expect(run.status).toBe('approved');
  });

  it('5. registra approvedBy e approvedAt', () => {
    let run = createFolhaDealerRun(validRows, options);
    const fixedDate = '2026-06-15T12:00:00.000Z';
    run = approveFolhaDealerRun(run, { approvedBy: 'analyst', approvedAt: fixedDate });
    
    expect(run.approval.approvedBy).toBe('analyst');
    expect(run.approval.approvedAt).toBe(fixedDate);
  });

  it('6. gera Excel mesmo se blocked', () => {
    const invalidRows = [...validRows, { ...validRows[0], eventCode: '999', eventName: 'Invalid Event', amount: 100.0 }];
    const run = createFolhaDealerRun(invalidRows, options);
    const excelBuffer = exportRunConferenceXlsx(run, options);
    
    expect(excelBuffer).toBeDefined();
    expect(excelBuffer.length).toBeGreaterThan(0);
  });

  it('7. não gera TXT se não aprovado', () => {
    const run = createFolhaDealerRun(validRows, options);
    const txtOpts = txtOptionsWithLotCodes();
    
    expect(() => exportApprovedDealerTxt(run, txtOpts)).toThrow(/Execução não aprovada/);
  });

  it('8. gera TXT após aprovação', () => {
    let run = createFolhaDealerRun(validRows, options);
    run = approveFolhaDealerRun(run, { approvedBy: 'analyst' });
    
    const txtOpts = txtOptionsWithLotCodes();
    const result = exportApprovedDealerTxt(run, txtOpts);
    
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('9. após gerar TXT, status vira exported', () => {
    let run = createFolhaDealerRun(validRows, options);
    run = approveFolhaDealerRun(run, { approvedBy: 'analyst' });
    
    const txtOpts = txtOptionsWithLotCodes();
    const result = exportApprovedDealerTxt(run, txtOpts);
    
    expect(result.run.status).toBe('exported');
  });

  it('10. mantém totais e quantidade de lançamentos no snapshot de aprovação', () => {
    let run = createFolhaDealerRun(validRows, options);
    run = approveFolhaDealerRun(run, { approvedBy: 'analyst' });
    
    expect(run.approval.entriesCount).toBe(run.entries.length);
    expect(run.approval.totals.debitCents).toBeGreaterThan(0);
    expect(run.approval.totals.creditCents).toBeGreaterThan(0);
    expect(run.approval.totals.debitCents).toBe(run.approval.totals.creditCents); // O lote balanceou
  });

  it('11. não altera entries do motor durante aprovação/exportação', () => {
    let run = createFolhaDealerRun(validRows, options);
    const originalEntriesSnapshot = JSON.stringify(run.entries);
    
    run = approveFolhaDealerRun(run, { approvedBy: 'analyst' });
    
    const txtOpts = txtOptionsWithLotCodes();
    const result = exportApprovedDealerTxt(run, txtOpts);
    
    expect(JSON.stringify(result.run.entries)).toBe(originalEntriesSnapshot);
  });
});
