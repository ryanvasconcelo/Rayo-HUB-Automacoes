import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';
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
      'Resumo por Tipo',
      'Analítico',
      'Lançamentos',
      'Consolidado',
      'Validações',
      'De-Para Centros',
      'De-Para Contas',
    ];
    expect(workbook.SheetNames).toEqual(expectedSheets);
  });

  it('aba Analítico exibe nome do evento e linhas segmentadas (não consolidadas)', () => {
    const { workbook, runResult } = generateTestWorkbook();
    const ws = workbook.Sheets['Analítico'];
    const rows = XLSX.utils.sheet_to_json(ws);

    expect(rows.length).toBe(runResult.sourceRows.length);
    expect(rows[0]).toHaveProperty('Código Evento');
    expect(rows[0]).toHaveProperty('Nome do Evento');

    const withName = rows.filter((r) => r['Nome do Evento'] && String(r['Nome do Evento']).trim() !== '');
    expect(withName.length).toBeGreaterThan(0);
  });

  it('aba Lançamentos é segmentada e inclui Nome do Evento', () => {
    const { workbook, runResult } = generateTestWorkbook();
    const ws = workbook.Sheets['Lançamentos'];
    const rows = XLSX.utils.sheet_to_json(ws);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty('Código Evento');
    expect(rows[0]).toHaveProperty('Nome do Evento');
    expect(rows[0]).toHaveProperty('Lotação Fortes');
    expect(rows[0]).toHaveProperty('Matrícula');

    const withName = rows.filter((r) => r['Nome do Evento'] && String(r['Nome do Evento']).trim() !== '');
    expect(withName.length).toBeGreaterThan(0);

    // Segmentado: Lançamentos do Excel ≥ partidas do TXT consolidado
    expect(rows.length).toBeGreaterThanOrEqual(runResult.entries.length);
  });

  it('aba Consolidado também exibe Nome do Evento', () => {
    const { workbook } = generateTestWorkbook();
    const ws = workbook.Sheets['Consolidado'];
    const rows = XLSX.utils.sheet_to_json(ws);
    expect(rows[0]).toHaveProperty('Nome do Evento');
    expect(rows[0]).toHaveProperty('Código Evento');
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

  it('aba Resumo por Tipo traz o total da folha mensal no formato do Resumo Geral do Fortes', () => {
    const base = { companyId: 'braga-veiculos', competence: '202604', employeeId: '1', lotacaoCode: 'RECURSOS HUMANOS' };
    const sourceRows = normalizeFortesQueryRows([
      { ...base, eventCode: '011', amountCents: 300000, ProvDesc: 1 },
      { ...base, eventCode: '310', amountCents: 30000, ProvDesc: -1 },
    ]);
    const { workbook } = generateTestWorkbook({ sourceRows });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Resumo por Tipo']);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Tipo de Folha']).toBe('Folha de Pagamento');
    expect(rows[0].Empregados).toBe(1);
    expect(Object.keys(rows[0])).toEqual([
      'Tipo de Folha', 'Empregados', 'Proventos (R$)', 'Descontos (R$)', 'Líquido (R$)',
    ]);
  });

  it('aba Resumo mostra o histórico de cada tipo de folha do lote', () => {
    const base = { companyId: 'braga-veiculos', competence: '202604', lotacaoCode: 'RECURSOS HUMANOS' };
    const sourceRows = normalizeFortesQueryRows(
      [{ ...base, employeeId: '1', eventCode: '011', amountCents: 300000, ProvDesc: 1 }],
      { fortesExtraPayroll: [{ ...base, payrollType: 'RESCISAO', employeeId: '2', eventCode: '199', amountCents: 100000, ProvDesc: 1 }] }
    );
    const { workbook } = generateTestWorkbook({ sourceRows });
    const resumo = XLSX.utils.sheet_to_json(workbook.Sheets.Resumo);
    const historicos = resumo.filter((r) => String(r.Chave).startsWith('Histórico')).map((r) => [r.Chave, r.Valor]);
    expect(historicos).toEqual([
      ['Histórico — Folha de Pagamento', 'FOLHA DE PAGAMENTO REF 04/2026'],
      ['Histórico — Rescisão', 'RESCISAO REF 04/2026'],
    ]);
  });

  it('lançamentos informam o tipo de folha', () => {
    const { workbook } = generateTestWorkbook();
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Lançamentos']);
    expect(rows.every((r) => r['Tipo de Folha'] === 'Folha de Pagamento')).toBe(true);
  });
});
