import * as XLSX from 'xlsx';
import { BATCH_TYPE, buildHistory } from './contracts.js';
import { buildJournal } from './journal-builder.js';

/**
 * @typedef {import('./contracts.js').PayrollAccountingRun} PayrollAccountingRun
 */

/**
 * Formata centavos para valor numérico em reais.
 * @param {number} cents
 * @returns {number}
 */
const formatReais = (cents) => cents / 100;

/**
 * Calcula os totais do run
 * @param {object[]} entries
 * @returns {{ debit: number, credit: number, difference: number }}
 */
function calculateTotals(entries) {
  let debitCents = 0;
  let creditCents = 0;

  for (const entry of entries) {
    if (entry.dc === 'D') debitCents += entry.amountCents;
    if (entry.dc === 'C') creditCents += entry.amountCents;
  }

  return {
    debit: formatReais(debitCents),
    credit: formatReais(creditCents),
    difference: formatReais(Math.abs(debitCents - creditCents)),
  };
}

/**
 * Uma linha de origem = um item "consolidado" unitário (sem agregar lotação+evento).
 * Usado só no Excel de conferência para acurácia analítica.
 * @param {object[]} sourceRows
 * @returns {object[]}
 */
function buildSegmentedItems(sourceRows) {
  return (sourceRows || [])
    .filter((row) => row && row.eventCode != null && String(row.eventCode).trim() !== '')
    .map((row) => ({
      companyId: row.companyId,
      competence: row.competence,
      lotacaoCode: row.lotacaoCode,
      lotacaoName: row.lotacaoName || null,
      eventCode: row.eventCode,
      eventName: row.eventName || null,
      amountCents: row.amountCents,
      sourceCount: 1,
      employeeId: row.employeeId != null ? String(row.employeeId) : null,
      employeeName: row.employeeName || null,
      sourceOrigin: row.sourceOrigin || null,
      sourceLineId: row.sourceLineId || null,
    }));
}

/**
 * Gera um buffer XLSX de conferência a partir de um PayrollAccountingRun.
 *
 * Lançamentos e Analítico são segmentados (uma origem por linha), não consolidados
 * por lotação+evento — para facilitar cruzamento com o RH.
 *
 * @param {PayrollAccountingRun} run - O resultado da execução do motor.
 * @param {object} config - A configuração (mappings) usada no run.
 * @returns {Buffer} Buffer do arquivo XLSX.
 */
export function exportConferenceXlsx(run, config) {
  const wb = XLSX.utils.book_new();

  const totals = calculateTotals(run.entries);
  const blockerCount = run.issues.filter((i) => i.severity === 'blocker').length;
  const warningCount = run.issues.filter((i) => i.severity === 'warning').length;

  const segmentedItems = buildSegmentedItems(run.sourceRows);
  const { entries: segmentedEntries } = buildJournal({
    consolidatedItems: segmentedItems,
    config,
    competence: run.competence,
  });

  // 1. Aba Resumo
  const resumeData = [
    { Chave: 'Empresa', Valor: run.companyId },
    { Chave: 'Competência', Valor: run.competence },
    { Chave: 'Histórico', Valor: buildHistory(run.competence) },
    { Chave: 'BatchType', Valor: BATCH_TYPE },
    { Chave: 'Status', Valor: run.status },
    { Chave: 'Total Débitos (R$)', Valor: totals.debit },
    { Chave: 'Total Créditos (R$)', Valor: totals.credit },
    { Chave: 'Diferença (R$)', Valor: totals.difference },
    { Chave: 'Qtd. Lançamentos (TXT consolidado)', Valor: run.entries.length },
    { Chave: 'Qtd. Lançamentos (Excel segmentado)', Valor: segmentedEntries.length },
    { Chave: 'Qtd. Linhas origem', Valor: (run.sourceRows || []).length },
    { Chave: 'Qtd. Blockers', Valor: blockerCount },
    { Chave: 'Qtd. Warnings', Valor: warningCount },
  ];
  const wsResume = XLSX.utils.json_to_sheet(resumeData);
  XLSX.utils.book_append_sheet(wb, wsResume, 'Resumo');

  // 2. Aba Analítico — origem segmentada (empregado × evento), com nome do evento
  const analiticoData = (run.sourceRows || []).map((row, index) => ({
    Linha: index + 1,
    Matrícula: row.employeeId != null ? String(row.employeeId) : '',
    Colaborador: row.employeeName || '',
    'Lotação Fortes': row.lotacaoCode || '',
    'Nome Lotação': row.lotacaoName || '',
    'Código Evento': row.eventCode || '',
    'Nome do Evento': row.eventName || '',
    'Valor (R$)': formatReais(row.amountCents || 0),
    Natureza: row.sourceRecordType || row.sourceEventNature || '',
    Origem: row.sourceOrigin || '',
    'Folha Seq': row.sourcePayrollId != null ? String(row.sourcePayrollId) : '',
    Referência: row.sourceReference || '',
  }));
  const wsAnalitico = XLSX.utils.json_to_sheet(analiticoData);
  XLSX.utils.book_append_sheet(wb, wsAnalitico, 'Analítico');

  // 3. Aba Lançamentos — partidas D/C segmentadas (não agregadas por lotação+evento)
  const entriesData = segmentedEntries.map((e, index) => ({
    Linha: index + 1,
    'D/C': e.dc,
    Conta: e.accountCode || '',
    Centro: e.centerCode || '',
    'Valor (R$)': formatReais(e.amountCents),
    Histórico: e.history,
    Matrícula: e.employeeId || '',
    Colaborador: e.employeeName || '',
    'Lotação Fortes': e.lotacaoCode || '',
    'Código Evento': e.eventCode || '',
    'Nome do Evento': e.eventName || '',
    'Descrição Conta': e.description || '',
  }));
  const wsEntries = XLSX.utils.json_to_sheet(entriesData);
  XLSX.utils.book_append_sheet(wb, wsEntries, 'Lançamentos');

  // 4. Aba Consolidado — totais por lotação+evento (referência / TXT)
  const consolidatedData = (run.consolidatedItems || []).map((c) => ({
    Empresa: run.companyId,
    Competência: run.competence,
    Lotação: c.lotacaoCode,
    'Nome Lotação': c.lotacaoName || '',
    'Código Evento': c.eventCode,
    'Nome do Evento': c.eventName || '',
    'Valor Consolidado (R$)': formatReais(c.amountCents),
    'Qtd Linhas Origem': c.sourceCount,
  }));
  const wsConsolidated = XLSX.utils.json_to_sheet(consolidatedData);
  XLSX.utils.book_append_sheet(wb, wsConsolidated, 'Consolidado');

  // 5. Aba Validações
  const issuesData = run.issues.map((i) => ({
    Severidade: i.severity,
    Código: i.code,
    Mensagem: i.message,
    Contexto: JSON.stringify(i.context || {}),
  }));
  const wsIssues = XLSX.utils.json_to_sheet(issuesData);
  XLSX.utils.book_append_sheet(wb, wsIssues, 'Validações');

  // 6. Aba De-Para Centros
  const centersData = (config.centerMappings || []).map((m) => ({
    'Lotação Fortes': m.lotacaoCode,
    'Centro Dealer': m.dealerCenterCode,
    'Nome Centro': m.dealerCenterName,
    'Modo Alocação': m.allocationMode,
    Ativo: m.active ? 'Sim' : 'Não',
  }));
  const wsCenters = XLSX.utils.json_to_sheet(centersData);
  XLSX.utils.book_append_sheet(wb, wsCenters, 'De-Para Centros');

  // 7. Aba De-Para Contas
  const accountsData = (config.accountMappings || []).map((m) => ({
    Evento: m.eventCode,
    'Nome / Descrição': m.description,
    'D/C': m.dc,
    Conta: m.dealerAccountCode,
    Observação: m.observation || '',
    Ativo: m.active ? 'Sim' : 'Não',
  }));
  const wsAccounts = XLSX.utils.json_to_sheet(accountsData);
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'De-Para Contas');

  // 8. Aba Provisões / Encargos (já segmentada por empregado)
  const provisionsData = (run.sourceRows || [])
    .filter(
      (r) =>
        r.sourceOrigin === 'provision-derived' ||
        r.sourceOrigin === 'encargo-derived' ||
        r.sourceOrigin === 'fortes-provision' ||
        (r.eventCode && (r.eventCode.startsWith('PROV_') || r.eventCode.startsWith('ENCARGO_')))
    )
    .map((p) => ({
      Empresa: run.companyId,
      Competência: run.competence,
      Matrícula: p.employeeId != null ? String(p.employeeId) : '',
      Colaborador: p.employeeName || '',
      'Lotação Fortes': p.lotacaoCode || '',
      'Código Evento': p.eventCode || '',
      'Nome do Evento': p.eventName || '',
      'Valor (R$)': formatReais(p.amountCents),
      Origem: p.sourceOrigin || '',
      'Referência / Base': p.sourceReference || '',
    }));

  if (provisionsData.length > 0) {
    const wsProvisions = XLSX.utils.json_to_sheet(provisionsData);
    XLSX.utils.book_append_sheet(wb, wsProvisions, 'Provisões');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
