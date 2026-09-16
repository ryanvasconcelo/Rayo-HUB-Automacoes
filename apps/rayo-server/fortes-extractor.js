const mssql = require('mssql');

function buildDbConfig() {
  return {
    user: process.env.DB_USER || 'biprojecont',
    password: process.env.DB_PASSWORD || 'proj@#2087!',
    server: process.env.DB_HOST || '192.168.0.5',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_DATABASE || 'AC',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    requestTimeout: 300000,
  };
}

/**
 * Expand PRD/PRF amount columns into PayrollSourceRow-shaped raw rows.
 * Keeps signed cents (Provisionar can be negative = estorno).
 */
function expandProvisionAmounts(row, defs) {
  const out = [];
  for (const def of defs) {
    const cents = row[def.centsKey];
    if (cents == null || Number(cents) === 0) continue;
    out.push({
      companyId: row.companyId,
      companyName: row.companyName || '',
      competence: row.competence,
      employeeId: row.employeeId,
      employeeName: row.employeeName || '',
      sourcePayrollId: row.sourcePayrollId,
      eventCode: def.eventCode,
      eventName: def.eventName,
      ProvDesc: 'PROVISAO',
      TipoRegistro: 'PROVISAO',
      IncideFGTS: '0',
      amountCents: Number(cents),
      sourceReference: def.sourceReference || '',
      lotacaoCode: row.lotacaoCode || '',
      lotacaoName: row.lotacaoName || '',
      sourceOrigin: 'fortes-provision',
    });
  }
  return out;
}

const PROV_13_DEFS = [
  { centsKey: 'prov13Cents', eventCode: 'PROV_13', eventName: 'Provisão 13º Salário (Fortes)' },
  { centsKey: 'inss13Cents', eventCode: 'PROV_INSS_13', eventName: 'Provisão INSS s/ 13º (Fortes)' },
  { centsKey: 'fgts13Cents', eventCode: 'PROV_FGTS_13', eventName: 'Provisão FGTS s/ 13º (Fortes)' },
];

const PROV_FER_DEFS = [
  { centsKey: 'provFerCents', eventCode: 'PROV_FERIAS', eventName: 'Provisão Férias e 1/3 (Fortes)' },
  { centsKey: 'inssFerCents', eventCode: 'PROV_INSS_FER', eventName: 'Provisão INSS s/ Férias (Fortes)' },
  { centsKey: 'fgtsFerCents', eventCode: 'PROV_FGTS_FER', eventName: 'Provisão FGTS s/ Férias (Fortes)' },
];

const PAYROLL_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @Ano INT = @AnoParam;
DECLARE @Mes INT = @MesParam;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

SELECT
    EFO.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    @AnoMes AS competence,
    EPG.Codigo AS employeeId,
    EPG.Nome AS employeeName,
    EFO.FOL_Seq AS sourcePayrollId,
    EFP.EVE_Codigo AS eventCode,
    EVE.NomeApr AS eventName,
    EVE.ProvDesc AS ProvDesc,
    CASE
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) = '1' THEN 'PROVENTO'
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('2', '-1') THEN 'DESCONTO'
        ELSE 'INFORMATIVO'
    END AS TipoRegistro,
    CASE
        WHEN ISNULL(CAST(EVE.IndicativoFGTSMensalFerias AS VARCHAR(10)), '0') <> '0' THEN '1'
        ELSE '0'
    END AS IncideFGTS,
    CAST(ROUND(EFP.Valor * 100, 0) AS INT) AS amountCents,
    EFP.Referencia AS sourceReference,
    '' AS lotacaoCode,
    '' AS lotacaoName
FROM EFO (NOLOCK)
INNER JOIN EPG (NOLOCK)
    ON EFO.EMP_Codigo = EPG.EMP_Codigo
   AND EFO.EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON EFO.EMP_Codigo = EMP.Codigo
LEFT JOIN EFP (NOLOCK)
    ON EFO.EMP_Codigo = EFP.EMP_Codigo
   AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
   AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq IN (
      SELECT FOL.Seq
      FROM FOL (NOLOCK)
      INNER JOIN FPG (NOLOCK)
          ON FOL.EMP_Codigo = FPG.EMP_Codigo
         AND FOL.Seq = FPG.FOL_Seq
      WHERE FOL.EMP_Codigo = @EmpresaCodigo
        AND FPG.AnoMes = @AnoMes
        AND FOL.Folha = 2
        AND FPG.Tipo IN (1, 4)
  )
ORDER BY EFO.FOL_Seq, EPG.Nome, EFP.EVE_Codigo;
`;

/**
 * Provisão 13º: FOL.Folha = 14, header PRV, detail PRD.
 * Coluna Fortes Provisao = relatório RH "Provisionar".
 */
const PROV_13_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

SELECT
    PRV.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    PRV.AnoMes AS competence,
    PRD.EFO_EPG_Codigo AS employeeId,
    EPG.Nome AS employeeName,
    PRV.FOL_Seq AS sourcePayrollId,
    ISNULL(SEP.LOT_Codigo, '') AS lotacaoCode,
    ISNULL(LOT.Nome, '') AS lotacaoName,
    CAST(ROUND(ISNULL(PRD.Provisao, 0) * 100, 0) AS INT) AS prov13Cents,
    CAST(ROUND(ISNULL(PRD.INSSProvisao, 0) * 100, 0) AS INT) AS inss13Cents,
    CAST(ROUND(ISNULL(PRD.FGTSProvisao, 0) * 100, 0) AS INT) AS fgts13Cents
FROM PRV (NOLOCK)
INNER JOIN FOL (NOLOCK)
    ON PRV.EMP_Codigo = FOL.EMP_Codigo
   AND PRV.FOL_Seq = FOL.Seq
   AND FOL.Folha = 14
INNER JOIN PRD (NOLOCK)
    ON PRV.EMP_Codigo = PRD.EMP_Codigo
   AND PRV.FOL_Seq = PRD.EFO_FOL_Seq
INNER JOIN EFO (NOLOCK)
    ON PRD.EMP_Codigo = EFO.EMP_Codigo
   AND PRD.EFO_FOL_Seq = EFO.FOL_Seq
   AND PRD.EFO_EPG_Codigo = EFO.EPG_Codigo
LEFT JOIN EPG (NOLOCK)
    ON PRD.EMP_Codigo = EPG.EMP_Codigo
   AND PRD.EFO_EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON PRV.EMP_Codigo = EMP.Codigo
LEFT JOIN SEP (NOLOCK)
    ON EFO.EMP_Codigo = SEP.EMP_Codigo
   AND EFO.EPG_Codigo = SEP.EPG_Codigo
   AND EFO.SEP_Data = SEP.Data
LEFT JOIN LOT (NOLOCK)
    ON SEP.EMP_Codigo = LOT.EMP_Codigo
   AND SEP.LOT_Codigo = LOT.Codigo
WHERE PRV.EMP_Codigo = @EmpresaCodigo
  AND PRV.AnoMes = @AnoMes
ORDER BY LOT.Nome, EPG.Nome;
`;

/**
 * Provisão férias: FOL.Folha = 15, AnoMes via PRV no mesmo FOL_Seq, detail PRF.
 */
const PROV_FER_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

SELECT
    PRV.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    PRV.AnoMes AS competence,
    PRF.EFO_EPG_Codigo AS employeeId,
    EPG.Nome AS employeeName,
    PRV.FOL_Seq AS sourcePayrollId,
    ISNULL(SEP.LOT_Codigo, '') AS lotacaoCode,
    ISNULL(LOT.Nome, '') AS lotacaoName,
    CAST(ROUND(ISNULL(PRF.Provisao, 0) * 100, 0) AS INT) AS provFerCents,
    CAST(ROUND(ISNULL(PRF.INSSProvisao, 0) * 100, 0) AS INT) AS inssFerCents,
    CAST(ROUND(ISNULL(PRF.FGTSProvisao, 0) * 100, 0) AS INT) AS fgtsFerCents
FROM PRV (NOLOCK)
INNER JOIN FOL (NOLOCK)
    ON PRV.EMP_Codigo = FOL.EMP_Codigo
   AND PRV.FOL_Seq = FOL.Seq
   AND FOL.Folha = 15
INNER JOIN PRF (NOLOCK)
    ON PRV.EMP_Codigo = PRF.EMP_Codigo
   AND PRV.FOL_Seq = PRF.EFO_FOL_Seq
INNER JOIN EFO (NOLOCK)
    ON PRF.EMP_Codigo = EFO.EMP_Codigo
   AND PRF.EFO_FOL_Seq = EFO.FOL_Seq
   AND PRF.EFO_EPG_Codigo = EFO.EPG_Codigo
LEFT JOIN EPG (NOLOCK)
    ON PRF.EMP_Codigo = EPG.EMP_Codigo
   AND PRF.EFO_EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON PRV.EMP_Codigo = EMP.Codigo
LEFT JOIN SEP (NOLOCK)
    ON EFO.EMP_Codigo = SEP.EMP_Codigo
   AND EFO.EPG_Codigo = SEP.EPG_Codigo
   AND EFO.SEP_Data = SEP.Data
LEFT JOIN LOT (NOLOCK)
    ON SEP.EMP_Codigo = LOT.EMP_Codigo
   AND SEP.LOT_Codigo = LOT.Codigo
WHERE PRV.EMP_Codigo = @EmpresaCodigo
  AND PRV.AnoMes = @AnoMes
ORDER BY LOT.Nome, EPG.Nome;
`;

/**
 * Bases oficiais eSocial para encargos DCTF/FGTS (mensal, TipoValor 11).
 * Lotação via SEP/LOT da folha mensal; de-para Braga usa LOT.Nome.
 */
const ENCARGO_BASE_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

;WITH empLot AS (
    SELECT
        EPG.EMP_Codigo AS companyId,
        EMP.Nome AS companyName,
        EPG.Codigo AS employeeId,
        EPG.Nome AS employeeName,
        EPG.MatriculaESocial AS esMat,
        ISNULL(MAX(SEP.LOT_Codigo), '') AS lotacaoCode,
        ISNULL(MAX(LOT.Nome), '') AS lotacaoName
    FROM EFO (NOLOCK)
    INNER JOIN EPG (NOLOCK)
        ON EFO.EMP_Codigo = EPG.EMP_Codigo
       AND EFO.EPG_Codigo = EPG.Codigo
    INNER JOIN FOL (NOLOCK)
        ON EFO.EMP_Codigo = FOL.EMP_Codigo
       AND EFO.FOL_Seq = FOL.Seq
       AND FOL.Folha = 2
    INNER JOIN FPG (NOLOCK)
        ON FOL.EMP_Codigo = FPG.EMP_Codigo
       AND FOL.Seq = FPG.FOL_Seq
       AND FPG.AnoMes = @AnoMes
       AND FPG.Tipo IN (1, 4)
    LEFT JOIN EMP (NOLOCK)
        ON EPG.EMP_Codigo = EMP.Codigo
    LEFT JOIN SEP (NOLOCK)
        ON EFO.EMP_Codigo = SEP.EMP_Codigo
       AND EFO.EPG_Codigo = SEP.EPG_Codigo
       AND EFO.SEP_Data = SEP.Data
    LEFT JOIN LOT (NOLOCK)
        ON SEP.EMP_Codigo = LOT.EMP_Codigo
       AND SEP.LOT_Codigo = LOT.Codigo
    WHERE EFO.EMP_Codigo = @EmpresaCodigo
    GROUP BY
        EPG.EMP_Codigo,
        EMP.Nome,
        EPG.Codigo,
        EPG.Nome,
        EPG.MatriculaESocial
),
cp AS (
    SELECT
        LTRIM(RTRIM(Matricula)) AS esMat,
        SUM(TRY_CAST(Valor AS FLOAT)) AS bcCp
    FROM ES_CS_CP_Base (NOLOCK)
    WHERE EMP_Codigo = @EmpresaCodigo
      AND PeriodoApuracao = @AnoMes
      AND TipoValor = 11
      AND ISNULL(Indicativo13Salario, 0) = 0
    GROUP BY LTRIM(RTRIM(Matricula))
),
fg AS (
    SELECT
        LTRIM(RTRIM(MATRICULA)) AS esMat,
        SUM(TRY_CAST(VALORDEPO AS FLOAT)) AS fgtsDepo
    FROM ES_FGTS_SEGURADO (NOLOCK)
    WHERE EMP_CODIGO = @EmpresaCodigo
      AND PERIODOAPURACAO = @AnoMes
      AND TIPOVALOR = 11
    GROUP BY LTRIM(RTRIM(MATRICULA))
)
SELECT
    el.companyId,
    el.companyName,
    @AnoMes AS competence,
    el.employeeId,
    el.employeeName,
    el.lotacaoCode,
    el.lotacaoName,
    CAST(ROUND(ISNULL(cp.bcCp, 0) * 100, 0) AS INT) AS bcCpCents,
    CAST(ROUND(ISNULL(fg.fgtsDepo, 0) * 100, 0) AS INT) AS fgtsDepoCents
FROM empLot el
LEFT JOIN cp
    ON cp.esMat = LTRIM(RTRIM(el.esMat))
LEFT JOIN fg
    ON fg.esMat = LTRIM(RTRIM(el.esMat))
WHERE ISNULL(cp.bcCp, 0) > 0
   OR ISNULL(fg.fgtsDepo, 0) > 0
ORDER BY el.lotacaoName, el.employeeName;
`;

async function extractFortesPayroll({ companyId = '9274', competence = '2026-04' }) {
  const dbConfig = buildDbConfig();
  const [anoStr, mesStr] = competence.split('-');
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const anoMesStr = anoStr + (mesStr ? mesStr.padStart(2, '0') : '');

  console.log(`[API Fortes] Conectando ao MSSQL... Empresa: ${companyId}, Competência: ${anoMesStr}`);

  let pool;
  try {
    pool = await mssql.connect(dbConfig);
    const request = () =>
      pool
        .request()
        .input('Company', mssql.VarChar(4), companyId)
        .input('AnoParam', mssql.Int, ano)
        .input('MesParam', mssql.Int, mes)
        .input('AnoMesParam', mssql.VarChar(6), anoMesStr);

    const [payrollResult, prov13Result, provFerResult, encargoBaseResult] = await Promise.all([
      request().query(PAYROLL_QUERY),
      request().query(PROV_13_QUERY),
      request().query(PROV_FER_QUERY),
      request().query(ENCARGO_BASE_QUERY),
    ]);

    const provisions = [];
    for (const row of prov13Result.recordset) {
      // Prefer LOT.Nome as lotacaoCode (de-para Braga usa o nome)
      if (row.lotacaoName) row.lotacaoCode = row.lotacaoName;
      provisions.push(...expandProvisionAmounts(row, PROV_13_DEFS));
    }
    for (const row of provFerResult.recordset) {
      if (row.lotacaoName) row.lotacaoCode = row.lotacaoName;
      provisions.push(...expandProvisionAmounts(row, PROV_FER_DEFS));
    }

    const encargoBases = encargoBaseResult.recordset.map((row) => {
      const lotacaoName = row.lotacaoName || '';
      return {
        ...row,
        // de-para Braga usa o nome da lotação
        lotacaoCode: lotacaoName || row.lotacaoCode || '',
        lotacaoName,
      };
    });

    console.log(
      `[API Fortes] Folha=${payrollResult.recordset.length} linhas; ` +
        `Provisões Fortes=${provisions.length} (13º+férias); ` +
        `Bases encargo eSocial=${encargoBases.length}`
    );

    return {
      payroll: payrollResult.recordset,
      provisions,
      encargoBases,
    };
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

module.exports = {
  extractFortesPayroll,
  expandProvisionAmounts,
  buildDbConfig,
  PROV_13_DEFS,
  PROV_FER_DEFS,
  PAYROLL_QUERY,
  PROV_13_QUERY,
  PROV_FER_QUERY,
  ENCARGO_BASE_QUERY,
};
