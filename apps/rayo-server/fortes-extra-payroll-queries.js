/**
 * fortes-extra-payroll-queries.js — Férias, rescisão e folha complementar.
 *
 * No Fortes essas folhas não têm FPG (AnoMes/Tipo nulos), então a competência
 * sai de uma data própria de cada tipo. Regras conferidas ao centavo com o
 * "Resumo Geral do Mês/Período" do Fortes (BM 04/2026 e BV 01–08/2026):
 * - Férias (FOL.Folha = 4): mês de início do gozo (FER.DtGozoInicial). Só a
 *   folha raiz — as filhas de rescisão (FOL_Seq_Pai) repetem férias que já
 *   estão dentro da rescisão.
 * - Rescisão (FOL.Folha = 10): mês de FOL.DtCalculo. O 13º rescisório
 *   (FOL.Folha = 8) é filho da rescisão e repete os eventos 208/209: não entra.
 * - Complementar (FOL.Folha = 17): mês de FOL.DtReferencia.
 *
 * Lotação: vínculo da folha (EFO.SEP_Data); sem ele — comum na rescisão —,
 * o último cadastro SEP do empregado.
 */

const EXTRA_PAYROLL_TYPES = [
  { payrollType: 'FERIAS', folha: 4, competenceDate: 'FER.DtGozoInicial', joinFer: true, onlyRoot: true },
  { payrollType: 'RESCISAO', folha: 10, competenceDate: 'FOL.DtCalculo', joinFer: false, onlyRoot: false },
  { payrollType: 'COMPLEMENTAR', folha: 17, competenceDate: 'FOL.DtReferencia', joinFer: false, onlyRoot: false },
];

/**
 * @param {string} competence — AAAA-MM
 * @returns {{ dataIni: string, dataFim: string }} dataFim exclusivo (dia 1 do mês seguinte)
 */
function competenceDateRange(competence) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(competence || ''));
  const month = match ? Number(match[2]) : 0;
  if (!match || month < 1 || month > 12) {
    throw new Error(`Competência inválida: "${competence}" (esperado AAAA-MM).`);
  }
  const year = Number(match[1]);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const firstDay = (y, m) => `${y}-${String(m).padStart(2, '0')}-01`;
  return { dataIni: firstDay(year, month), dataFim: firstDay(nextYear, nextMonth) };
}

function buildExtraPayrollQuery({ payrollType, folha, competenceDate, joinFer, onlyRoot }) {
  return `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @DataIni DATE = CAST(@DataIniParam AS DATE);
DECLARE @DataFim DATE = CAST(@DataFimParam AS DATE);

SELECT
    EFO.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    @AnoMesParam AS competence,
    '${payrollType}' AS payrollType,
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
    CAST(ROUND(EFP.Valor * 100, 0) AS INT) AS amountCents,
    EFP.Referencia AS sourceReference,
    ISNULL(COALESCE(SEP.LOT_Codigo, SEPU.LOT_Codigo), '') AS lotacaoCode,
    ISNULL(LOT.Nome, '') AS lotacaoName
FROM FOL (NOLOCK)
INNER JOIN EFO (NOLOCK)
    ON EFO.EMP_Codigo = FOL.EMP_Codigo
   AND EFO.FOL_Seq = FOL.Seq
${joinFer ? `INNER JOIN FER (NOLOCK)
    ON FER.EMP_Codigo = EFO.EMP_Codigo
   AND FER.EFO_FOL_Seq = EFO.FOL_Seq
   AND FER.EFO_EPG_Codigo = EFO.EPG_Codigo` : ''}
INNER JOIN EPG (NOLOCK)
    ON EPG.EMP_Codigo = EFO.EMP_Codigo
   AND EPG.Codigo = EFO.EPG_Codigo
INNER JOIN EFP (NOLOCK)
    ON EFP.EMP_Codigo = EFO.EMP_Codigo
   AND EFP.EFO_FOL_Seq = EFO.FOL_Seq
   AND EFP.EFO_EPG_Codigo = EFO.EPG_Codigo
LEFT JOIN EVE (NOLOCK)
    ON EVE.EMP_Codigo = EFP.EMP_Codigo
   AND EVE.Codigo = EFP.EVE_Codigo
LEFT JOIN EMP (NOLOCK)
    ON EMP.Codigo = EFO.EMP_Codigo
LEFT JOIN SEP (NOLOCK)
    ON SEP.EMP_Codigo = EFO.EMP_Codigo
   AND SEP.EPG_Codigo = EFO.EPG_Codigo
   AND SEP.Data = EFO.SEP_Data
OUTER APPLY (
    SELECT TOP 1 S2.LOT_Codigo
    FROM SEP S2 (NOLOCK)
    WHERE S2.EMP_Codigo = EFO.EMP_Codigo
      AND S2.EPG_Codigo = EFO.EPG_Codigo
    ORDER BY S2.Data DESC
) SEPU
LEFT JOIN LOT (NOLOCK)
    ON LOT.EMP_Codigo = EFO.EMP_Codigo
   AND LOT.Codigo = COALESCE(SEP.LOT_Codigo, SEPU.LOT_Codigo)
WHERE FOL.EMP_Codigo = @EmpresaCodigo
  AND FOL.Folha = ${folha}
  ${onlyRoot ? 'AND FOL.FOL_Seq_Pai IS NULL' : ''}
  AND ${competenceDate} >= @DataIni
  AND ${competenceDate} < @DataFim
ORDER BY EFO.FOL_Seq, EPG.Nome, EFP.EVE_Codigo;
`;
}

const EXTRA_PAYROLL_QUERIES = EXTRA_PAYROLL_TYPES.map((def) => ({
  payrollType: def.payrollType,
  sql: buildExtraPayrollQuery(def),
}));

module.exports = {
  EXTRA_PAYROLL_TYPES,
  EXTRA_PAYROLL_QUERIES,
  buildExtraPayrollQuery,
  competenceDateRange,
};
