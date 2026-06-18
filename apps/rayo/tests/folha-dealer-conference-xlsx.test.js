import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  runFolhaDealerEngine,
  bragaVeiculosConfig,
  buildBragaRowsFortes,
  exportConferenceXlsx,
} from '../src/lib/folha-dealer/index.js';

/**
 * Roda o motor e depois gera o workbook do Excel para testes.
 */
function generateTestWorkbook(overrides = {}) {
  const runResult = runFolhaDealerEngine({
    config: bragaVeiculosConfig,
    sourceRows: buildBragaRowsFortes(),
    competence: '2026-04',
    ...overrides,
  });

  const buffer = exportConferenceXlsx(runResult, bragaVeiculosConfig);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  return { runResult, workbook };
}

describe('Folha Dealer - Conference XLSX Exporter', () => {
  it('gera um buffer XLSX válido', () => {
    const { workbook } = generateTestWorkbook();
    expect(workbook).toBeDefined();
    expect(workbook.SheetNames.length).toBeGreaterThan(0);
  });

  it('contém todas as abas esperadas', () => {
    const { workbook } = generateTestWorkbook();
    const expectedSheets = [
      'Resumo',
      'Lançamentos',
      'Consolidado',
      'Validações',
      'De-Para Centros',
      'De-Para Contas',
    ];
    expect(workbook.SheetNames).toEqual(expectedSheets);
  });

  it('aba Resumo tem total débito igual ao total crédito em execução válida', () => {
    const { workbook, runResult } = generateTestWorkbook();
    expect(runResult.status).toBe('ready');

    const wsResume = workbook.Sheets['Resumo'];
    const resumeData = XLSX.utils.sheet_to_json(wsResume);

    const debitRow = resumeData.find((r) => r.Chave === 'Total Débitos (R$)');
    const creditRow = resumeData.find((r) => r.Chave === 'Total Créditos (R$)');
    const diffRow = resumeData.find((r) => r.Chave === 'Diferença (R$)');

    expect(debitRow.Valor).toBeGreaterThan(0);
    expect(debitRow.Valor).toEqual(creditRow.Valor);
    expect(diffRow.Valor).toBe(0);
  });

  it('aba Lançamentos preserva centro 000600/001000 com zeros à esquerda', () => {
    const { workbook } = generateTestWorkbook();
    const wsEntries = workbook.Sheets['Lançamentos'];
    const entriesData = XLSX.utils.sheet_to_json(wsEntries, { raw: false }); // raw:false garante leitura como string formatada no excel

    // Verifica se algum centro foi formatado como "600" em vez de "000600"
    const validCenters = ['000600', '001000', '000300'];
    const hasLostZeros = entriesData.some(
      (e) => e.Centro && e.Centro !== '' && !validCenters.includes(e.Centro)
    );

    expect(hasLostZeros).toBe(false);

    // Garante que o centro 000600 existe na planilha
    const has000600 = entriesData.some((e) => e.Centro === '000600');
    expect(has000600).toBe(true);
  });

  it('conta classe 2 aparece sem centro', () => {
    const { workbook } = generateTestWorkbook();
    const wsEntries = workbook.Sheets['Lançamentos'];
    const entriesData = XLSX.utils.sheet_to_json(wsEntries);

    const classe2Entries = entriesData.filter((e) => e.Conta && e.Conta.startsWith('2.'));
    expect(classe2Entries.length).toBeGreaterThan(0);

    // Nenhuma conta classe 2 deve ter centro
    const anyClass2HasCenter = classe2Entries.some((e) => e.Centro !== '');
    expect(anyClass2HasCenter).toBe(false);
  });

  it('aba Validações contém warnings como CENTER_REMOVED_FROM_BALANCE_ACCOUNT', () => {
    const { workbook } = generateTestWorkbook();
    const wsIssues = workbook.Sheets['Validações'];
    const issuesData = XLSX.utils.sheet_to_json(wsIssues);

    const hasWarning = issuesData.some(
      (i) => i.Código === 'CENTER_REMOVED_FROM_BALANCE_ACCOUNT' && i.Severidade === 'warning'
    );
    expect(hasWarning).toBe(true);
  });

  it('execução bloqueada também gera Excel de conferência, mas com status blocked', () => {
    // Forçamos um erro removendo um mapping
    const badConfig = {
      ...bragaVeiculosConfig,
      accountMappings: bragaVeiculosConfig.accountMappings.filter((m) => m.eventCode !== '310'),
    };

    const runResult = runFolhaDealerEngine({
      config: badConfig,
      sourceRows: buildBragaRowsFortes(),
      competence: '2026-04',
    });

    // Confirma que está blocked
    expect(runResult.status).toBe('blocked');

    const buffer = exportConferenceXlsx(runResult, badConfig);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const wsResume = workbook.Sheets['Resumo'];
    const resumeData = XLSX.utils.sheet_to_json(wsResume);

    const statusRow = resumeData.find((r) => r.Chave === 'Status');
    expect(statusRow.Valor).toBe('blocked');

    // Verifica que blockers aparecem na aba de Validações
    const wsIssues = workbook.Sheets['Validações'];
    const issuesData = XLSX.utils.sheet_to_json(wsIssues);
    const hasBlocker = issuesData.some((i) => i.Severidade === 'blocker');
    expect(hasBlocker).toBe(true);
  });
});
