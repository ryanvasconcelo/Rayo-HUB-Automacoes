-- ====================================================================================
-- ADAPTER OPERACIONAL FORTES -> DEALER (Draft)
-- Traz as métricas financeiras já com EmpresaNome, LotacaoCodigo, LotacaoNome, e SourceLineId.
-- ====================================================================================

DECLARE @EmpresaCodigo VARCHAR(4) = '9252'; -- A confirmar com as queries de descoberta
DECLARE @Ano INT = 2026;
DECLARE @Mes INT = 4;
DECLARE @AnoMes VARCHAR(6);
SET @AnoMes = CAST(@Ano AS VARCHAR(4)) + RIGHT('00' + CAST(@Mes AS VARCHAR(2)), 2);

-- Identifica a última folha processada da competência e empresa
DECLARE @FolhaSeq INT = (
    SELECT TOP 1 FOL.Seq
    FROM FOL (NOLOCK)
    INNER JOIN FPG (NOLOCK)
        ON FOL.EMP_Codigo = FPG.EMP_Codigo
       AND FOL.Seq = FPG.FOL_Seq
    WHERE FOL.EMP_Codigo = @EmpresaCodigo
      AND FPG.AnoMes = @AnoMes
      AND FOL.Folha = 2        -- Folha Mensal
      AND FPG.Tipo IN (1, 4)   -- Status permitidos
    ORDER BY FOL.Seq DESC
);

SELECT
    EFO.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    @AnoMes AS competence,
    EFO.FOL_Seq AS sourcePayrollId,
    EPG.Codigo AS employeeId,
    EPG.Nome AS employeeName,
    
    -- Lotação
    EFO.LOT_Codigo AS lotacaoCode,
    LOT.Nome AS lotacaoName,   -- ou LOT.Descricao, dependendo do retorno na descoberta
    
    -- Evento
    EFP.EVE_Codigo AS eventCode,
    EVE.NomeApr AS eventName,
    EVE.ProvDesc AS sourceEventNature,
    EFP.Referencia AS sourceReference,
    
    -- Valor em centavos para adequar ao PayrollSourceRow
    CAST(EFP.Valor * 100 AS BIGINT) AS amountCents,
    
    -- Incidências e Metadados (Opcional para Motor, Útil para BI)
    CASE WHEN ISNULL(CAST(EVE.IndicativoCPMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideINSS,
    CASE WHEN ISNULL(CAST(EVE.IndicativoIRRFMensal AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideIRRF,
    CASE WHEN ISNULL(CAST(EVE.IndicativoFGTSMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideFGTS,

    -- Marcadores de Adapter
    'folha-mensal' AS sourceOrigin,
    'fortes-query' AS sourceAdapter,

    -- Classificação (Filtro Documentado)
    CASE
        WHEN EFP.EVE_Codigo IN ('600', '601', '602', '603', '604') THEN 'INFORMATIVO_BASE'
        ELSE 'FINANCEIRO'
    END AS TipoRegistro,

    -- Chave Técnica Rastreadora
    CONCAT(EFO.EMP_Codigo, '-', @AnoMes, '-', EFO.FOL_Seq, '-', EPG.Codigo, '-', EFP.EVE_Codigo) AS sourceLineId

FROM EFO (NOLOCK)
INNER JOIN EPG (NOLOCK)
    ON EFO.EMP_Codigo = EPG.EMP_Codigo
   AND EFO.EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON EFO.EMP_Codigo = EMP.Codigo
LEFT JOIN LOT (NOLOCK)
    ON EFO.EMP_Codigo = LOT.EMP_Codigo
   AND EFO.LOT_Codigo = LOT.Codigo
LEFT JOIN EFP (NOLOCK)
    ON EFO.EMP_Codigo = EFP.EMP_Codigo
   AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
   AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq = @FolhaSeq
  
-- Como regra documentada, o sistema pode pular as bases na contabilidade (comentado abaixo se o motor fizer o descarte)
-- AND EFP.EVE_Codigo NOT IN ('600', '601', '602', '603', '604')

ORDER BY EPG.Nome, EFP.EVE_Codigo;

