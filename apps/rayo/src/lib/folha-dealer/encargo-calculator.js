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
 *   FGTS mensal (tipo 11) 8%                  → ENCARGO_FGTS_FOLHA
 *
 * Excluído: 1082-01 INSS descontado do segurado (evento Fortes 310, já mapeado).
 *
 * Contas (diretriz contábil):
 *   INSS / GILRAT / Terceiros → D 6.1.1.02.001 / C 2.1.1.02.001
 *   FGTS                      → D 6.1.1.02.002 / C 2.1.1.02.002
 *
 * Base: BC-FGTS por empregado|lotação (IncideFGTS=1), mesma base das provisões.
 */

export const DEFAULT_ENCARGO_RATES = Object.freeze({
  inssEmpresa: 20.0, // 1138-01
  gilrat: 2.0, // 1646-01 (RAT 2% × FAP 1)
  terceiros: 5.8, // 1170+1176+1191+1196+1200
  fgts: 8.0, // FGTS mensal
});

function calculateFgtsBasePerEmployee(rawRows) {
  const bases = new Map();

  for (const row of rawRows) {
    const incideFgts = String(row.IncideFGTS || row.incideFGTS || '0');
    if (incideFgts !== '1') continue;

    const tipo = String(row.TipoRegistro || row.tipoRegistro || '').toUpperCase();
    if (tipo !== 'PROVENTO' && tipo !== 'DESCONTO') continue;

    const employeeId = String(row.employeeId || '');
    if (!employeeId) continue;

    const lotacaoCode = String(row.lotacaoCode || '');
    const key = `${employeeId}|${lotacaoCode}`;
    const amount = Math.abs(parseInt(row.amountCents || '0', 10));

    if (!bases.has(key)) {
      bases.set(key, {
        base: 0,
        lotacaoCode,
        lotacaoName: row.lotacaoName || '',
        companyId: row.companyId,
        competence: row.competence,
        employeeId,
        employeeName: row.employeeName || '',
      });
    }

    const entry = bases.get(key);
    if (tipo === 'PROVENTO') entry.base += amount;
    else entry.base -= amount;
  }

  return bases;
}

/**
 * Gera encargos patronais como PayrollSourceRow[] sintéticas.
 *
 * @param {object[]} rawRows
 * @param {object} [rates]
 * @returns {object[]}
 */
export function calculateEncargos(rawRows, rates = DEFAULT_ENCARGO_RATES) {
  const merged = { ...DEFAULT_ENCARGO_RATES, ...rates };
  const basesPerEmployee = calculateFgtsBasePerEmployee(rawRows);
  const encargoRows = [];

  const defs = [
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
    {
      eventCode: 'ENCARGO_FGTS_FOLHA',
      eventName: 'FGTS mensal (tipo 11)',
      rateKey: 'fgts',
      dctfRef: 'FGTS-11',
    },
  ];

  for (const [, data] of basesPerEmployee) {
    if (data.base <= 0) continue;

    let comp = data.competence;
    if (comp && typeof comp === 'string' && !comp.includes('-') && comp.length === 6) {
      comp = `${comp.substring(0, 4)}-${comp.substring(4, 6)}`;
    }

    for (const def of defs) {
      const amountCents = Math.round(data.base * (merged[def.rateKey] / 100));
      if (amountCents <= 0) continue;

      encargoRows.push({
        sourceSystem: 'fortes',
        sourceAdapter: 'encargo-calculator',
        sourceOrigin: 'encargo-derived',
        sourcePayrollId: null,
        companyId: data.companyId != null ? String(data.companyId) : '',
        companyName: '',
        competence: comp || '',
        lotacaoCode: data.lotacaoCode,
        lotacaoName: data.lotacaoName || '',
        eventCode: def.eventCode,
        eventName: def.eventName,
        sourceEventNature: 'ENCARGO',
        sourceReference: `BC-FGTS: ${data.base}; DCTF/FGTS: ${def.dctfRef}`,
        sourceRecordType: 'ENCARGO',
        amountCents,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        sourceLineId: `encargo-${def.eventCode}-${data.employeeId}-${data.lotacaoCode}`,
      });
    }
  }

  return encargoRows;
}
