/**
 * Adapter para converter retorno bruto de query Fortes em PayrollSourceRow[].
 */

import { calculateProvisions } from './provision-calculator.js';
import { employeeLotacaoMap } from './employee-lotacao-map.js';

export function mapFortesProvDesc(provDesc) {
  const descMap = {
    '1': 'PROVENTO',
    '2': 'DESCONTO',
    '-1': 'DESCONTO',
    '0': 'INFORMATIVO'
  };
  return descMap[String(provDesc)] || 'INFORMATIVO';
}

export function mapFortesRecordType(row) {
  return mapFortesProvDesc(row.ProvDesc);
}

export function buildFortesSourceLineId(row, options = {}) {
  const parts = [
    'fortes',
    row.companyId || 'company',
    row.competence || 'comp',
    row.employeeId || 'emp',
    row.eventCode || 'evt'
  ];
  return parts.join('-');
}

export function normalizeFortesQueryRows(rawRows, options = {}, provisionRates = null) {
  const normalized = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];

    if (raw.employeeId && employeeLotacaoMap[raw.employeeId]) {
      raw.lotacaoCode = employeeLotacaoMap[raw.employeeId];
      raw.lotacaoName = employeeLotacaoMap[raw.employeeId];
    } else if (raw.lotacaoCode === undefined || raw.lotacaoCode === null) {
      raw.lotacaoCode = '';
    }
    if (raw.eventCode === undefined || raw.eventCode === null || String(raw.eventCode).trim() === '') {
      continue; // Ignorar funcionários/linhas que não possuem eventos financeiros calculados
    }

    // Normalizar competência
    let competence = raw.competence;
    if (competence && typeof competence === 'string' && !competence.includes('-') && competence.length === 6) {
      competence = `${competence.substring(0, 4)}-${competence.substring(4, 6)}`;
    } else if (competence && typeof competence === 'number' && String(competence).length === 6) {
      const compStr = String(competence);
      competence = `${compStr.substring(0, 4)}-${compStr.substring(4, 6)}`;
    }

    // Valor sempre positivo
    const amountCents = Math.abs(raw.amountCents || 0);

    // sourceLineId
    const sourceLineId = raw.sourceLineId || buildFortesSourceLineId(raw, options) + `-${i}`;

    normalized.push({
      sourceSystem: 'fortes',
      sourceAdapter: 'fortes-query',
      sourceOrigin: 'folha-mensal',
      sourcePayrollId: raw.sourcePayrollId || null,
      companyId: raw.companyId != null ? String(raw.companyId) : '',
      companyName: raw.companyName || '',
      competence: competence || '',
      lotacaoCode: String(raw.lotacaoCode),
      lotacaoName: raw.lotacaoName || '',
      eventCode: String(raw.eventCode),
      eventName: raw.eventName || '',
      sourceEventNature: mapFortesRecordType(raw),
      sourceReference: raw.sourceReference || '',
      sourceRecordType: mapFortesRecordType(raw),
      amountCents: amountCents,
      employeeId: raw.employeeId != null ? String(raw.employeeId) : null,
      employeeName: raw.employeeName || null,
      sourceLineId: sourceLineId,
    });
  }

  // Sintetizar Líquido da Folha por Lotação
  const liquidoPerLotacao = {};
  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const type = mapFortesRecordType(raw);
    if (type !== 'PROVENTO' && type !== 'DESCONTO') continue;
    
    const code = String(raw.lotacaoCode);
    if (!liquidoPerLotacao[code]) {
      liquidoPerLotacao[code] = { 
        amount: 0, 
        companyId: raw.companyId, 
        competence: raw.competence, 
        lotacaoName: raw.lotacaoName 
      };
    }
    
    const amt = Math.abs(raw.amountCents || 0);
    if (type === 'PROVENTO') liquidoPerLotacao[code].amount += amt;
    if (type === 'DESCONTO') liquidoPerLotacao[code].amount -= amt;
  }

  for (const [code, data] of Object.entries(liquidoPerLotacao)) {
    if (data.amount > 0) {
      // Normalizar competência para as linhas derivadas
      let comp = data.competence;
      if (comp && typeof comp === 'string' && !comp.includes('-') && comp.length === 6) {
        comp = `${comp.substring(0, 4)}-${comp.substring(4, 6)}`;
      } else if (comp && typeof comp === 'number' && String(comp).length === 6) {
        const compStr = String(comp);
        comp = `${compStr.substring(0, 4)}-${compStr.substring(4, 6)}`;
      }

      normalized.push({
        sourceSystem: 'fortes',
        sourceAdapter: 'fortes-query',
        sourceOrigin: 'fortes-query-derived',
        sourcePayrollId: null,
        companyId: data.companyId != null ? String(data.companyId) : '',
        companyName: '',
        competence: comp || '',
        lotacaoCode: code,
        lotacaoName: data.lotacaoName || '',
        eventCode: 'LIQUIDO_FOLHA',
        eventName: 'Líquido da Folha a Pagar',
        sourceEventNature: 'DESCONTO', 
        sourceReference: '',
        sourceRecordType: 'DESCONTO',
        amountCents: Math.round(data.amount),
        employeeId: null,
        employeeName: null,
        sourceLineId: `fortes-derived-liquido-${code}`,
      });
    }
  }

  // Sintetizar Provisões Trabalhistas por Lotação
  if (provisionRates) {
    const provisionRows = calculateProvisions(rawRows, provisionRates);
    normalized.push(...provisionRows);
  }

  return normalized;
}
