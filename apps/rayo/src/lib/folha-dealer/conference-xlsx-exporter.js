import * as XLSX from 'xlsx';
import { BATCH_TYPE, buildHistory } from './contracts.js';

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
 * Gera um buffer XLSX de conferência a partir de um PayrollAccountingRun.
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
    { Chave: 'Qtd. Lançamentos', Valor: run.entries.length },
    { Chave: 'Qtd. Blockers', Valor: blockerCount },
    { Chave: 'Qtd. Warnings', Valor: warningCount },
  ];
  const wsResume = XLSX.utils.json_to_sheet(resumeData);
  XLSX.utils.book_append_sheet(wb, wsResume, 'Resumo');

  // 2. Aba Lançamentos
  const entriesData = run.entries.map((e, index) => ({
    Linha: index + 1,
    'D/C': e.dc,
    Conta: e.accountCode || '',
    Centro: e.centerCode || '',
    'Valor (R$)': formatReais(e.amountCents),
    Histórico: e.history,
    'Lotação Fortes': e.lotacaoCode,
    'Evento Fortes': e.eventCode,
    Descrição: e.description,
  }));
  const wsEntries = XLSX.utils.json_to_sheet(entriesData);
  XLSX.utils.book_append_sheet(wb, wsEntries, 'Lançamentos');

  // 3. Aba Consolidado
  const consolidatedData = run.consolidatedItems.map((c) => ({
    Empresa: run.companyId,
    Competência: run.competence,
    Lotação: c.lotacaoCode,
    Evento: c.eventCode,
    'Descrição Evento': c.eventName,
    'Valor Consolidado (R$)': formatReais(c.amountCents),
    'Qtd Linhas Origem': c.sourceCount,
  }));
  const wsConsolidated = XLSX.utils.json_to_sheet(consolidatedData);
  XLSX.utils.book_append_sheet(wb, wsConsolidated, 'Consolidado');

  // 4. Aba Validações
  const issuesData = run.issues.map((i) => ({
    Severidade: i.severity,
    Código: i.code,
    Mensagem: i.message,
    Contexto: JSON.stringify(i.context || {}),
  }));
  const wsIssues = XLSX.utils.json_to_sheet(issuesData);
  XLSX.utils.book_append_sheet(wb, wsIssues, 'Validações');

  // 5. Aba De-Para Centros
  const centersData = (config.centerMappings || []).map((m) => ({
    'Lotação Fortes': m.lotacaoCode,
    'Centro Dealer': m.dealerCenterCode,
    'Nome Centro': m.dealerCenterName,
    'Modo Alocação': m.allocationMode,
    Ativo: m.active ? 'Sim' : 'Não',
  }));
  const wsCenters = XLSX.utils.json_to_sheet(centersData);
  XLSX.utils.book_append_sheet(wb, wsCenters, 'De-Para Centros');

  // 6. Aba De-Para Contas
  const accountsData = (config.accountMappings || []).map((m) => ({
    Evento: m.eventCode,
    Descrição: m.description,
    'D/C': m.dc,
    Conta: m.dealerAccountCode,
    Observação: m.observation || '',
    Ativo: m.active ? 'Sim' : 'Não',
  }));
  const wsAccounts = XLSX.utils.json_to_sheet(accountsData);
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'De-Para Contas');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
