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
import { PAYROLL_TYPES, DEFAULT_PAYROLL_TYPE, resolvePayrollType } from './contracts.js';

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

/**
 * Lotação: Fortes (SEP/LOT) é a fonte de verdade. O mapa estático por empregado
 * só entra quando a linha chega sem lotação.
 */
export function resolveLotacao(raw) {
  const code = raw.lotacaoCode != null ? String(raw.lotacaoCode) : '';
  const name = raw.lotacaoName ? String(raw.lotacaoName) : '';
  if (code) {
    return { lotacaoCode: code, lotacaoName: name || code };
  }
  if (name) {
    return { lotacaoCode: name, lotacaoName: name };
  }
  const mapped = raw.employeeId ? employeeLotacaoMap[raw.employeeId] : null;
  if (mapped) {
    return { lotacaoCode: mapped, lotacaoName: mapped };
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
    payrollType: resolvePayrollType(raw.payrollType),
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
 * @param {object[]} [options.fortesExtraPayroll] — férias, rescisão e complementar (linhas com payrollType)
 * @param {object|null} provisionRates — fallback sintético usado só quando fortesProvisions vier vazio
 * @param {object|null} encargoRates — alíquotas DCTF; bases eSocial preferidas quando disponíveis
 */
export function normalizeFortesQueryRows(rawRows, options = {}, provisionRates = null, encargoRates = null) {
  const normalized = [];
  const fortesProvisions = Array.isArray(options.fortesProvisions) ? options.fortesProvisions : [];
  const fortesEncargoBases = Array.isArray(options.fortesEncargoBases)
    ? options.fortesEncargoBases
    : [];
  const fortesExtraPayroll = Array.isArray(options.fortesExtraPayroll)
    ? options.fortesExtraPayroll
    : [];
  // Folha mensal + férias/rescisão/complementar: mesmo tratamento de evento,
  // mas cada tipo com líquido próprio.
  const payrollRows = [...rawRows, ...fortesExtraPayroll];

  for (let i = 0; i < payrollRows.length; i++) {
    const raw = payrollRows[i];

    if (raw.eventCode === undefined || raw.eventCode === null || String(raw.eventCode).trim() === '') {
      continue;
    }

    normalized.push(toPayrollSourceRow(raw, i, { preserveSign: false }));
  }

  // Líquido por tipo de folha + lotação: férias, rescisão e complementar têm
  // conta de líquido própria e não podem cair no líquido da folha mensal.
  const liquidoPorTipoLotacao = new Map();
  for (const raw of payrollRows) {
    const type = mapFortesRecordType(raw);
    if (type !== 'PROVENTO' && type !== 'DESCONTO') continue;

    const payrollType = resolvePayrollType(raw.payrollType);
    const lotacao = resolveLotacao(raw);
    const key = `${payrollType}|${lotacao.lotacaoCode}`;
    if (!liquidoPorTipoLotacao.has(key)) {
      liquidoPorTipoLotacao.set(key, {
        amount: 0,
        payrollType,
        lotacaoCode: lotacao.lotacaoCode,
        lotacaoName: lotacao.lotacaoName,
        companyId: raw.companyId,
        competence: raw.competence,
      });
    }

    const data = liquidoPorTipoLotacao.get(key);
    const amt = Math.abs(Number(raw.amountCents) || 0);
    data.amount += type === 'PROVENTO' ? amt : -amt;
  }

  // Líquido com sinal: negativo (descontos > proventos) segue para o journal,
  // que bloqueia por NEGATIVE_VALUE_WITHOUT_POLICY em vez de sumir em silêncio.
  for (const data of liquidoPorTipoLotacao.values()) {
    if (data.amount === 0) continue;
    const { liquidEventCode, liquidEventName } = PAYROLL_TYPES[data.payrollType];
    normalized.push({
      sourceSystem: 'fortes',
      sourceAdapter: 'fortes-query',
      sourceOrigin: 'fortes-query-derived',
      sourcePayrollId: null,
      companyId: data.companyId != null ? String(data.companyId) : '',
      companyName: '',
      competence: normalizeCompetence(data.competence) || '',
      payrollType: data.payrollType,
      lotacaoCode: data.lotacaoCode,
      lotacaoName: data.lotacaoName || '',
      eventCode: liquidEventCode,
      eventName: liquidEventName,
      sourceEventNature: 'DESCONTO',
      sourceReference: '',
      sourceRecordType: 'DESCONTO',
      amountCents: Math.round(data.amount),
      employeeId: null,
      employeeName: null,
      sourceLineId: `fortes-derived-liquido-${data.payrollType}-${data.lotacaoCode}`,
    });
  }

  // Fallbacks sintéticos usam só a folha mensal: férias, rescisão e
  // complementar já estão nas bases eSocial e nas provisões do Fortes, e
  // entrar aqui geraria encargo e provisão em dobro.
  const monthlyRows = rawRows.filter(
    (raw) => resolvePayrollType(raw.payrollType) === DEFAULT_PAYROLL_TYPE
  );
  const rowsWithLotacao = monthlyRows.map((raw) => ({ ...raw, ...resolveLotacao(raw) }));

  // Provisões: Fortes manda (PRD/PRF). Mês sem PRD/PRF → fallback sintético
  // (sourceOrigin provision-derived; o motor emite SYNTHETIC_PROVISION).
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
    const provisionRows = calculateProvisions(rowsWithLotacao, provisionRates);
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
    const encargoRows = calculateEncargos(rowsWithLotacao, encargoRates || DEFAULT_ENCARGO_RATES);
    normalized.push(...encargoRows);
  }

  return normalized;
}
