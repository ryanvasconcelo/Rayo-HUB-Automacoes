/**
 * encargo-calculator.js — Encargos patronais mensais (DCTFWeb / FGTS).
 *
 * Fonte de alíquotas / receitas (Analítico DCTFWeb + FGTS Braga):
 *   1138-01 Empresa (s/Empreg/Avulsos) 20%     → ENCARGO_INSS_PATRONAL
 *   1646-01 GILRAT Ajustado                   → ENCARGO_RAT_FAP
 *   1170-01 Salário Educação 2,50%
 *   1176-01 INCRA 0,20%
 *   1191-01 SENAC 1,00%                       → ENCARGO_TERCEIROS (soma 5,80%)
 *   1196-01 SESC 1,50%
 *   1200-01 SEBRAE 0,60%
 *   FGTS do mês (todos os TIPOVALOR)          → ENCARGO_FGTS_FOLHA
 *
 * Excluído: 1082-01 INSS descontado do segurado (evento Fortes 310, já mapeado).
 *
 * Contas (diretriz contábil):
 *   INSS / GILRAT / Terceiros → D 6.1.1.02.001 / C 2.1.1.02.001
 *   FGTS                      → D 6.1.1.02.002 / C 2.1.1.02.002
 *
 * Preferência de base (fluxo extract DB):
 *   ES_CS_CP_Base (TipoValor 11, inclui 13º) + ES_FGTS_SEGURADO.VALORDEPO (todos os tipos)
 *   + ES_CS_CP_Aliquotas_EST.AliquotaRATAjustada por estabelecimento → calculateEncargosFromBases
 *
 * Fallback sintético (CSV / sem eSocial):
 *   1) eventos informativos 602 (BC CPP) e 605 (FGTS)
 *   2) senão: Σ proventos IncideFGTS=1 (sem subtrair descontos — base DCTF ≠ líquido FGTS)
 */

export const DEFAULT_ENCARGO_RATES = Object.freeze({
  inssEmpresa: 20.0, // 1138-01
  gilrat: 1.0, // 1646-01 (fallback; extract usa RAT ajustado por estabelecimento)
  terceiros: 5.8, // 1170+1176+1191+1196+1200
  fgts: 8.0, // FGTS mensal (só no fallback sintético)
});

const FGTS_DEF = Object.freeze({
  eventCode: 'ENCARGO_FGTS_FOLHA',
  eventName: 'FGTS do mês',
  dctfRef: 'FGTS',
});

const CPP_DEFS = Object.freeze([
  {
    eventCode: 'ENCARGO_INSS_PATRONAL',
    eventName: 'INSS Patronal (1138-01 Empresa 20%)',
    rateKey: 'inssEmpresa',
    dctfRef: '1138-01',
  },
  {
    eventCode: 'ENCARGO_RAT_FAP',
    eventName: 'GILRAT / RAT-FAP (1646-01)',
    rateKey: 'gilrat',
    dctfRef: '1646-01',
  },
  {
    eventCode: 'ENCARGO_TERCEIROS',
    eventName: 'Terceiros Sistema S (1170/1176/1191/1196/1200)',
    rateKey: 'terceiros',
    dctfRef: '1170-01+1176-01+1191-01+1196-01+1200-01',
  },
]);

function normalizeCompetence(comp) {
  if (comp && typeof comp === 'string' && !comp.includes('-') && comp.length === 6) {
    return `${comp.substring(0, 4)}-${comp.substring(4, 6)}`;
  }
  return comp || '';
}

function pushEncargoRow(
  encargoRows,
  data,
  def,
  amountCents,
  sourceReference,
  sourceAdapter,
  sourceOrigin = null
) {
  if (amountCents <= 0) return;
  encargoRows.push({
    sourceSystem: 'fortes',
    sourceAdapter,
    sourceOrigin: sourceOrigin || (sourceAdapter === 'fortes-encargo' ? 'fortes-encargo' : 'encargo-derived'),
    sourcePayrollId: null,
    companyId: data.companyId != null ? String(data.companyId) : '',
    companyName: data.companyName || '',
    competence: normalizeCompetence(data.competence),
    lotacaoCode: data.lotacaoCode,
    lotacaoName: data.lotacaoName || '',
    eventCode: def.eventCode,
    eventName: def.eventName,
    sourceEventNature: 'ENCARGO',
    sourceReference,
    sourceRecordType: 'ENCARGO',
    amountCents,
    employeeId: data.employeeId != null ? String(data.employeeId) : null,
    employeeName: data.employeeName || '',
    sourceEmployeeReference: data.sourceEmployeeReference || null,
    sourceLineId: `encargo-${def.eventCode}-${data.employeeId || data.sourceEmployeeReference || 'unmapped'}-${data.lotacaoCode}${data.estCode ? `-${data.estCode}` : ''}`,
  });
}

/**
 * Encargos a partir das bases oficiais eSocial (extract Fortes).
 *
 * @param {object[]} baseRows — { bcCpCents, fgtsDepoCents, estCode, gilratPct, employeeId, lotacaoCode, ... }
 *   gilratPct (RAT ajustado do estabelecimento) prevalece sobre rates.gilrat.
 * @param {object} [rates]
 * @returns {object[]}
 */
export function calculateEncargosFromBases(baseRows, rates = DEFAULT_ENCARGO_RATES) {
  const merged = { ...DEFAULT_ENCARGO_RATES, ...rates };
  const encargoRows = [];

  for (const row of baseRows || []) {
    const bcCpCents = Math.round(Number(row.bcCpCents) || 0);
    const fgtsDepoCents = Math.round(Number(row.fgtsDepoCents) || 0);
    if (bcCpCents <= 0 && fgtsDepoCents <= 0) continue;

    const lotacaoCode = row.lotacaoName
      ? String(row.lotacaoName)
      : String(row.lotacaoCode || '');
    const isUnmapped = row.mappingStatus === 'unmapped';
    const sourceOrigin = isUnmapped ? 'fortes-encargo-unmapped' : 'fortes-encargo';
    const sourceEmployeeReference = row.esMat ? String(row.esMat) : null;
    const data = {
      companyId: row.companyId,
      companyName: row.companyName || '',
      competence: row.competence,
      employeeId: row.employeeId,
      employeeName: row.employeeName || '',
      lotacaoCode,
      lotacaoName: row.lotacaoName || lotacaoCode,
      estCode: row.estCode ? String(row.estCode) : '',
      sourceEmployeeReference,
    };
    const gilratPct =
      row.gilratPct != null && row.gilratPct !== '' && Number.isFinite(Number(row.gilratPct))
        ? Number(row.gilratPct)
        : null;
    const rowRates = gilratPct != null ? { ...merged, gilrat: gilratPct } : merged;
    const estRef = data.estCode ? `; EST: ${data.estCode}` : '';
    const mappingRef = isUnmapped
      ? `Matrícula eSocial sem correspondência na folha: ${sourceEmployeeReference || 'não informada'}; `
      : '';

    if (bcCpCents > 0) {
      for (const def of CPP_DEFS) {
        const pct = rowRates[def.rateKey];
        const amountCents = Math.round(bcCpCents * (pct / 100));
        pushEncargoRow(
          encargoRows,
          data,
          def,
          amountCents,
          `${mappingRef}ES_CS_CP_Base: ${bcCpCents}; DCTF: ${def.dctfRef}; ${pct}%${estRef}`,
          'fortes-encargo',
          sourceOrigin
        );
      }
    }

    if (fgtsDepoCents > 0) {
      pushEncargoRow(
        encargoRows,
        data,
        FGTS_DEF,
        fgtsDepoCents,
        `${mappingRef}ES_FGTS_SEGURADO.VALORDEPO: ${fgtsDepoCents}${estRef}`,
        'fortes-encargo',
        sourceOrigin
      );
    }
  }

  return encargoRows;
}

/**
 * Base sintético por empregado|lotação.
 * Prefere informativos 602/605; senão só proventos IncideFGTS=1.
 */
function calculateBasesPerEmployee(rawRows) {
  const bases = new Map();

  function ensure(key, row, lotacaoCode) {
    if (!bases.has(key)) {
      bases.set(key, {
        bcCpCents: 0,
        fgtsCents: 0,
        hasInformative: false,
        lotacaoCode,
        lotacaoName: row.lotacaoName || '',
        companyId: row.companyId,
        competence: row.competence,
        employeeId: String(row.employeeId || ''),
        employeeName: row.employeeName || '',
      });
    }
    return bases.get(key);
  }

  for (const row of rawRows) {
    const employeeId = String(row.employeeId || '');
    if (!employeeId) continue;
    const lotacaoCode = String(row.lotacaoCode || '');
    const key = `${employeeId}|${lotacaoCode}`;
    const eventCode = String(row.eventCode || '');
    const amount = Math.abs(parseInt(row.amountCents || '0', 10));

    if (eventCode === '602' && amount > 0) {
      const entry = ensure(key, row, lotacaoCode);
      entry.bcCpCents += amount;
      entry.hasInformative = true;
      continue;
    }
    if (eventCode === '605' && amount > 0) {
      const entry = ensure(key, row, lotacaoCode);
      entry.fgtsCents += amount;
      entry.hasInformative = true;
      continue;
    }
  }

  for (const row of rawRows) {
    const employeeId = String(row.employeeId || '');
    if (!employeeId) continue;
    const lotacaoCode = String(row.lotacaoCode || '');
    const key = `${employeeId}|${lotacaoCode}`;
    const entry = bases.get(key);
    if (entry?.hasInformative) continue;

    const incideFgts = String(row.IncideFGTS || row.incideFGTS || '0');
    if (incideFgts !== '1') continue;
    const tipo = String(row.TipoRegistro || row.tipoRegistro || '').toUpperCase();
    // Só proventos: descontos IncideFGTS (INSS, VT…) não reduzem a BC da DCTF
    if (tipo !== 'PROVENTO') continue;

    const amount = Math.abs(parseInt(row.amountCents || '0', 10));
    const slot = ensure(key, row, lotacaoCode);
    slot.bcCpCents += amount;
    slot.fgtsCents += amount;
  }

  return bases;
}

/**
 * Fallback sintético (CSV / sem bases eSocial).
 *
 * @param {object[]} rawRows
 * @param {object} [rates]
 * @returns {object[]}
 */
export function calculateEncargos(rawRows, rates = DEFAULT_ENCARGO_RATES) {
  const merged = { ...DEFAULT_ENCARGO_RATES, ...rates };
  const basesPerEmployee = calculateBasesPerEmployee(rawRows);
  const encargoRows = [];

  for (const [, data] of basesPerEmployee) {
    if (data.bcCpCents <= 0 && data.fgtsCents <= 0) continue;

    if (data.bcCpCents > 0) {
      for (const def of CPP_DEFS) {
        const amountCents = Math.round(data.bcCpCents * (merged[def.rateKey] / 100));
        pushEncargoRow(
          encargoRows,
          data,
          def,
          amountCents,
          `BC-CPP: ${data.bcCpCents}; DCTF: ${def.dctfRef}`,
          'encargo-calculator'
        );
      }
    }

    if (data.fgtsCents > 0) {
      const amountCents = data.hasInformative
        ? data.fgtsCents
        : Math.round(data.fgtsCents * (merged.fgts / 100));
      pushEncargoRow(
        encargoRows,
        data,
        FGTS_DEF,
        amountCents,
        data.hasInformative
          ? `EFP 605: ${data.fgtsCents}`
          : `BC-FGTS: ${data.fgtsCents}`,
        'encargo-calculator'
      );
    }
  }

  return encargoRows;
}
