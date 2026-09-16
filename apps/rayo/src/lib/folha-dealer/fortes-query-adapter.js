/**
 * Adapter para converter retorno bruto de query Fortes em PayrollSourceRow[].
 */

import { calculateProvisions } from './provision-calculator.js';
import {
  calculateEncargos,
  calculateEncargosFromBases,
  DEFAULT_ENCARGO_RATES,
} from './encargo-calculator.js';
import { employeeLotacaoMap } from './employee-lotacao-map.js';

const FORTES_PROVISION_ORIGIN = 'fortes-provision';
const FORTES_ENCARGO_ORIGIN = 'fortes-encargo';

export function mapFortesProvDesc(provDesc) {
  const descMap = {
    '1': 'PROVENTO',
    '2': 'DESCONTO',
    '-1': 'DESCONTO',
    '0': 'INFORMATIVO',
    PROVISAO: 'PROVISAO',
    ENCARGO: 'ENCARGO',
  };
  return descMap[String(provDesc)] || 'INFORMATIVO';
}

export function mapFortesRecordType(row) {
  const tipo = String(row.TipoRegistro || '').toUpperCase();
  if (row.sourceOrigin === FORTES_PROVISION_ORIGIN || tipo === 'PROVISAO') {
    return 'PROVISAO';
  }
  if (row.sourceOrigin === FORTES_ENCARGO_ORIGIN || tipo === 'ENCARGO') {
    return 'ENCARGO';
  }
  return mapFortesProvDesc(row.ProvDesc);
}

export function buildFortesSourceLineId(row, options = {}) {
  const parts = [
    'fortes',
    row.companyId || 'company',
    row.competence || 'comp',
    row.employeeId || 'emp',
    row.eventCode || 'evt',
  ];
  return parts.join('-');
}

function normalizeCompetence(competence) {
  if (competence && typeof competence === 'string' && !competence.includes('-') && competence.length === 6) {
    return `${competence.substring(0, 4)}-${competence.substring(4, 6)}`;
  }
  if (competence && typeof competence === 'number' && String(competence).length === 6) {
    const compStr = String(competence);
    return `${compStr.substring(0, 4)}-${compStr.substring(4, 6)}`;
  }
  return competence || '';
}

function resolveLotacao(raw) {
  if (raw.employeeId && employeeLotacaoMap[raw.employeeId]) {
    return {
      lotacaoCode: employeeLotacaoMap[raw.employeeId],
      lotacaoName: employeeLotacaoMap[raw.employeeId],
    };
  }
  const code = raw.lotacaoCode != null ? String(raw.lotacaoCode) : '';
  const name = raw.lotacaoName ? String(raw.lotacaoName) : '';
  if (code) {
    return { lotacaoCode: code, lotacaoName: name || code };
  }
  if (name) {
    return { lotacaoCode: name, lotacaoName: name };
  }
  return { lotacaoCode: '', lotacaoName: '' };
}

function toPayrollSourceRow(raw, index, { preserveSign = false } = {}) {
  const competence = normalizeCompetence(raw.competence);
  const lotacao = resolveLotacao(raw);
  const amountRaw = Number(raw.amountCents || 0);
  const amountCents = preserveSign ? Math.round(amountRaw) : Math.abs(Math.round(amountRaw));
  const sourceOrigin = raw.sourceOrigin || 'folha-mensal';
  const recordType = mapFortesRecordType(raw);
  let sourceAdapter = 'fortes-query';
  if (sourceOrigin === FORTES_PROVISION_ORIGIN) sourceAdapter = 'fortes-provision';
  else if (sourceOrigin === FORTES_ENCARGO_ORIGIN) sourceAdapter = 'fortes-encargo';

  return {
    sourceSystem: 'fortes',
    sourceAdapter,
    sourceOrigin,
    sourcePayrollId: raw.sourcePayrollId || null,
    companyId: raw.companyId != null ? String(raw.companyId) : '',
    companyName: raw.companyName || '',
    competence,
    lotacaoCode: lotacao.lotacaoCode,
    lotacaoName: lotacao.lotacaoName,
    eventCode: String(raw.eventCode),
    eventName: raw.eventName || '',
    sourceEventNature: recordType,
    sourceReference: raw.sourceReference || '',
    sourceRecordType: recordType,
    amountCents,
    employeeId: raw.employeeId != null ? String(raw.employeeId) : null,
    employeeName: raw.employeeName || null,
    sourceLineId: raw.sourceLineId || `${buildFortesSourceLineId(raw)}-${index}`,
  };
}

/**
 * @param {object[]} rawRows — linhas da folha mensal
 * @param {object} [options]
 * @param {object[]} [options.fortesProvisions] — PROV_* já calculados no Fortes (PRD/PRF)
 * @param {object[]} [options.fortesEncargoBases] — bases eSocial (ES_CS_CP_Base / ES_FGTS_SEGURADO)
 * @param {object|null} provisionRates — se fortesProvisions vier preenchido, o sintético é desligado
 * @param {object|null} encargoRates — alíquotas DCTF; bases eSocial preferidas quando disponíveis
 */
export function normalizeFortesQueryRows(rawRows, options = {}, provisionRates = null, encargoRates = null) {
  const normalized = [];
  const fortesProvisions = Array.isArray(options.fortesProvisions) ? options.fortesProvisions : [];
  const fortesEncargoBases = Array.isArray(options.fortesEncargoBases)
    ? options.fortesEncargoBases
    : [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];

    if (raw.eventCode === undefined || raw.eventCode === null || String(raw.eventCode).trim() === '') {
      continue;
    }

    normalized.push(toPayrollSourceRow(raw, i, { preserveSign: false }));
  }

  // Sintetizar Líquido da Folha por Lotação
  const liquidoPerLotacao = {};
  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const type = mapFortesRecordType(raw);
    if (type !== 'PROVENTO' && type !== 'DESCONTO') continue;

    const lotacao = resolveLotacao(raw);
    const code = lotacao.lotacaoCode;
    if (!liquidoPerLotacao[code]) {
      liquidoPerLotacao[code] = {
        amount: 0,
        companyId: raw.companyId,
        competence: raw.competence,
        lotacaoName: lotacao.lotacaoName,
      };
    }

    const amt = Math.abs(raw.amountCents || 0);
    if (type === 'PROVENTO') liquidoPerLotacao[code].amount += amt;
    if (type === 'DESCONTO') liquidoPerLotacao[code].amount -= amt;
  }

  for (const [code, data] of Object.entries(liquidoPerLotacao)) {
    if (data.amount > 0) {
      const comp = normalizeCompetence(data.competence);
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

  // Provisões: Fortes manda (PRD/PRF). Sem Fortes → fallback sintético taxa×BC-FGTS.
  if (fortesProvisions.length > 0) {
    for (let i = 0; i < fortesProvisions.length; i++) {
      const raw = { ...fortesProvisions[i], sourceOrigin: FORTES_PROVISION_ORIGIN };
      if (raw.eventCode === undefined || raw.eventCode === null || String(raw.eventCode).trim() === '') {
        continue;
      }
      normalized.push(
        toPayrollSourceRow(raw, `prov-${i}`, { preserveSign: true })
      );
    }
  } else if (provisionRates) {
    const provisionRows = calculateProvisions(rawRows, provisionRates);
    normalized.push(...provisionRows);
  }

  // Encargos: bases eSocial (preferido) → senão sintético (602/605 ou proventos FGTS)
  if (fortesEncargoBases.length > 0) {
    const encargoRows = calculateEncargosFromBases(
      fortesEncargoBases,
      encargoRates || DEFAULT_ENCARGO_RATES
    );
    normalized.push(...encargoRows);
  } else if (provisionRates || encargoRates || fortesProvisions.length > 0) {
    const encargoRows = calculateEncargos(rawRows, encargoRates || DEFAULT_ENCARGO_RATES);
    normalized.push(...encargoRows);
  }

  return normalized;
}
