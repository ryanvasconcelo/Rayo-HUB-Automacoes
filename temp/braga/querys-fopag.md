Banco: SQL Server/Fortes `AC`

Origem revisada: `automacao_rh_adiantamento/backend/src/fopag/data_fetcher.py`

Este documento organiza as consultas que a aplicacao ja usa hoje para auditoria FOPAG e adiciona os campos cadastrais pedidos:

- nivel de instrucao: `EPG.GrauInstrucao`
- raca/cor de pele: `EPG.RacaCor`

Observacao: o codigo atual da aplicacao nao consumia esses dois campos. Eles foram encontrados no banco via metadata em `EPG`, alem de aparecerem tambem em `CEPG` e `HEPG`. Para o BI de folha, use `EPG`, porque e a tabela de funcionario usada nas queries atuais da FOPAG.

## Parametros padrao

Use estes parametros nas consultas por competencia:

```sql
DECLARE @EmpresaCodigo VARCHAR(4) = '9252';
DECLARE @Ano INT = 2026;
DECLARE @Mes INT = 4;
DECLARE @AnoMes VARCHAR(6);
SET @AnoMes = CAST(@Ano AS VARCHAR(4)) + RIGHT('00' + CAST(@Mes AS VARCHAR(2)), 2);
```

## 1. Empresas ativas

Retorna a dimensao de empresas ativas.

```sql
SELECT
    EMP.Codigo AS EmpresaCodigo,
    EMP.Nome AS EmpresaNome
FROM EMP (NOLOCK)
WHERE EMP.Desativada = 0
ORDER BY EMP.Nome;
```

Campos retornados:

| Campo | Descricao |
| --- | --- |
| `EmpresaCodigo` | Codigo da empresa no Fortes |
| `EmpresaNome` | Nome da empresa |

## 2. Identificar folha mensal da competencia

Esta e a mesma regra de `get_folha_id()` em `data_fetcher.py`.

```sql
SELECT TOP 1
    FOL.EMP_Codigo AS EmpresaCodigo,
    FOL.Seq AS FolhaSeq,
    FPG.AnoMes,
    FOL.Folha AS TipoFolha,
    FPG.Tipo AS TipoProcessamento
FROM FOL (NOLOCK)
INNER JOIN FPG (NOLOCK)
    ON FOL.EMP_Codigo = FPG.EMP_Codigo
   AND FOL.Seq = FPG.FOL_Seq
WHERE FOL.EMP_Codigo = @EmpresaCodigo
  AND FPG.AnoMes = @AnoMes
  AND FOL.Folha = 2
  AND FPG.Tipo IN (1, 4)
ORDER BY FOL.Seq DESC;
```

Campos retornados:

| Campo | Descricao |
| --- | --- |
| `EmpresaCodigo` | Empresa consultada |
| `FolhaSeq` | Sequencial da folha mensal; usar nas proximas queries |
| `AnoMes` | Competencia no formato `AAAAMM` |
| `TipoFolha` | Tipo de folha Fortes; `2` e folha mensal no fluxo atual |
| `TipoProcessamento` | Tipo do processamento em `FPG`; fluxo atual aceita `1` e `4` |

## 3. Cadastro de funcionarios da folha, com escolaridade e raca/cor

Esta query traz um registro por funcionario presente na folha mensal.

```sql
DECLARE @FolhaSeq INT = (
    SELECT TOP 1 FOL.Seq
    FROM FOL (NOLOCK)
    INNER JOIN FPG (NOLOCK)
        ON FOL.EMP_Codigo = FPG.EMP_Codigo
       AND FOL.Seq = FPG.FOL_Seq
    WHERE FOL.EMP_Codigo = @EmpresaCodigo
      AND FPG.AnoMes = @AnoMes
      AND FOL.Folha = 2
      AND FPG.Tipo IN (1, 4)
    ORDER BY FOL.Seq DESC
);

SELECT DISTINCT
    EPG.EMP_Codigo AS EmpresaCodigo,
    EMP.Nome AS EmpresaNome,
    EPG.Codigo AS Matricula,
    EPG.Nome AS NomeFuncionario,
    EPG.CPF,
    EPG.PIS,
    EPG.Sexo,
    EPG.DtNascimento AS DataNascimento,
    EPG.AdmissaoData AS DataAdmissao,
    EPG.DtRescisao AS DataRescisao,
    EPG.Categoria AS CodigoVinculo,
    CASE
        WHEN EPG.Categoria IN ('103', '55', '56', '07') THEN 'Jovem Aprendiz'
        ELSE 'Funcionario Padrao'
    END AS TipoFuncionarioDetectado,
    ISNULL(SEP.HorasMes, 220) AS CargaHoraria,
    EPG.GrauInstrucao AS GrauInstrucaoCodigo,
    CASE EPG.GrauInstrucao
        WHEN '01' THEN 'Analfabeto'
        WHEN '02' THEN 'Ate 5o ano incompleto'
        WHEN '03' THEN '5o ano completo'
        WHEN '04' THEN '6o ao 9o ano incompleto'
        WHEN '05' THEN 'Ensino fundamental completo'
        WHEN '06' THEN 'Ensino medio incompleto'
        WHEN '07' THEN 'Ensino medio completo'
        WHEN '08' THEN 'Educacao superior incompleta'
        WHEN '09' THEN 'Educacao superior completa'
        WHEN '10' THEN 'Pos-graduacao'
        WHEN '11' THEN 'Mestrado'
        WHEN '12' THEN 'Doutorado'
        ELSE 'Nao informado/nao mapeado'
    END AS GrauInstrucaoDescricao,
    EPG.RacaCor AS RacaCorCodigo,
    CASE EPG.RacaCor
        WHEN '1' THEN 'Indigena'
        WHEN '2' THEN 'Branca'
        WHEN '3' THEN 'Nao mapeado no padrao RAIS/Fortes'
        WHEN '4' THEN 'Preta'
        WHEN '6' THEN 'Amarela'
        WHEN '8' THEN 'Parda'
        WHEN '9' THEN 'Nao informado'
        ELSE 'Nao informado/nao mapeado'
    END AS RacaCorDescricao,
    (
        SELECT COUNT(*)
        FROM DEP (NOLOCK)
        WHERE DEP.EMP_Codigo = EPG.EMP_Codigo
          AND DEP.EPG_Codigo = EPG.Codigo
          AND DEP.TB_TIP_DEP_CODIGO IN ('03', '04')
    ) AS DependentesIRRF,
    (
        SELECT COUNT(*)
        FROM DEP (NOLOCK)
        WHERE DEP.EMP_Codigo = EPG.EMP_Codigo
          AND DEP.EPG_Codigo = EPG.Codigo
          AND DEP.TB_TIP_DEP_CODIGO IN ('03', '04')
          AND (
              DATEDIFF(YEAR, DEP.NascData, GETDATE()) < 14
              OR DEP.IncapazTrabalho = 'S'
          )
    ) AS DependentesSalarioFamilia
FROM EFO (NOLOCK)
INNER JOIN EPG (NOLOCK)
    ON EFO.EMP_Codigo = EPG.EMP_Codigo
   AND EFO.EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON EPG.EMP_Codigo = EMP.Codigo
LEFT JOIN SEP (NOLOCK)
    ON EFO.EMP_Codigo = SEP.EMP_Codigo
   AND EFO.EPG_Codigo = SEP.EPG_Codigo
   AND EFO.SEP_Data = SEP.Data
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq = @FolhaSeq
ORDER BY EPG.Nome;
```

Campos retornados:

| Campo | Descricao |
| --- | --- |
| `EmpresaCodigo`, `EmpresaNome` | Empresa |
| `Matricula`, `NomeFuncionario`, `CPF`, `PIS` | Identificacao do trabalhador |
| `Sexo`, `DataNascimento` | Dados pessoais basicos |
| `DataAdmissao`, `DataRescisao`, `CodigoVinculo` | Dados do vinculo |
| `TipoFuncionarioDetectado` | Regra da aplicacao para jovem aprendiz |
| `CargaHoraria` | `SEP.HorasMes`; se nulo, assume `220` |
| `GrauInstrucaoCodigo`, `GrauInstrucaoDescricao` | Nivel de instrucao |
| `RacaCorCodigo`, `RacaCorDescricao` | Raca/cor de pele |
| `DependentesIRRF` | Dependentes validos para IRRF |
| `DependentesSalarioFamilia` | Dependentes validos para salario familia |

Nota sobre `RacaCor`: os valores existentes encontrados em `EPG` foram `1`, `2`, `3`, `4`, `6`, `8`, `9`. O mapeamento acima segue o padrao historico RAIS/Fortes para os codigos mais usados. O codigo `3` apareceu em apenas 1 registro na leitura feita; validar no Fortes antes de usar como dimensao final.

## 4. Eventos da folha mensal

Esta e a query principal de `fetch_payroll_data()`. Retorna uma linha por evento de folha por funcionario.

```sql
DECLARE @FolhaSeq INT = (
    SELECT TOP 1 FOL.Seq
    FROM FOL (NOLOCK)
    INNER JOIN FPG (NOLOCK)
        ON FOL.EMP_Codigo = FPG.EMP_Codigo
       AND FOL.Seq = FPG.FOL_Seq
    WHERE FOL.EMP_Codigo = @EmpresaCodigo
      AND FPG.AnoMes = @AnoMes
      AND FOL.Folha = 2
      AND FPG.Tipo IN (1, 4)
    ORDER BY FOL.Seq DESC
);

SELECT
    EFO.EMP_Codigo AS EmpresaCodigo,
    @AnoMes AS AnoMes,
    EFO.FOL_Seq AS FolhaSeq,
    EPG.Codigo AS Matricula,
    EPG.Nome AS NomeFuncionario,
    EPG.AdmissaoData AS DataAdmissao,
    EPG.DtRescisao AS DataRescisao,
    EPG.Categoria AS CodigoVinculo,
    ISNULL(SEP.HorasMes, 220) AS CargaHoraria,
    EFP.EVE_Codigo AS EventoCodigo,
    EVE.NomeApr AS EventoDescricao,
    EVE.Nome AS EventoNomeCompleto,
    EVE.ProvDesc AS TipoEventoCodigo,
    CASE
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('0', '1') THEN 'PROVENTO'
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('2', '3') THEN 'DESCONTO'
        ELSE 'NAO_CLASSIFICADO'
    END AS NaturezaEvento,
    EFP.Valor AS Valor,
    EFP.Referencia AS Referencia,
    CASE
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('2', '3') THEN -1 * EFP.Valor
        ELSE EFP.Valor
    END AS ValorAssinado,
    EVE.IndicativoCPMensalFerias AS IncideINSSCodigo,
    CASE WHEN ISNULL(CAST(EVE.IndicativoCPMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideINSS,
    EVE.IndicativoIRRFMensal AS IncideIRRFCodigo,
    CASE WHEN ISNULL(CAST(EVE.IndicativoIRRFMensal AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideIRRF,
    EVE.IndicativoFGTSMensalFerias AS IncideFGTSCodigo,
    CASE WHEN ISNULL(CAST(EVE.IndicativoFGTSMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideFGTS,
    CASE
        WHEN EFP.EVE_Codigo IN ('600', '601') THEN 'SALARIO_CONTRATUAL_INFORMATIVO'
        WHEN EFP.EVE_Codigo = '602' THEN 'BASE_INSS_FORTE'
        WHEN EFP.EVE_Codigo = '603' THEN 'BASE_IRRF_FORTE'
        WHEN EFP.EVE_Codigo = '604' THEN 'BASE_FGTS_FORTE'
        WHEN EFP.EVE_Codigo = '310' THEN 'DESCONTO_INSS'
        WHEN EFP.EVE_Codigo = '311' THEN 'DESCONTO_IRRF'
        WHEN EFP.EVE_Codigo = '605' THEN 'DESCONTO_FGTS'
        ELSE 'EVENTO_FINANCEIRO'
    END AS GrupoEventoBI
FROM EFO (NOLOCK)
INNER JOIN EPG (NOLOCK)
    ON EFO.EMP_Codigo = EPG.EMP_Codigo
   AND EFO.EPG_Codigo = EPG.Codigo
LEFT JOIN SEP (NOLOCK)
    ON EFO.EMP_Codigo = SEP.EMP_Codigo
   AND EFO.EPG_Codigo = SEP.EPG_Codigo
   AND EFO.SEP_Data = SEP.Data
LEFT JOIN EFP (NOLOCK)
    ON EFO.EMP_Codigo = EFP.EMP_Codigo
   AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
   AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq = @FolhaSeq
ORDER BY EPG.Nome, EFP.EVE_Codigo;
```

Campos retornados:

| Campo | Descricao |
| --- | --- |
| `EmpresaCodigo`, `AnoMes`, `FolhaSeq` | Chaves de competencia/folha |
| `Matricula`, `NomeFuncionario` | Funcionario |
| `EventoCodigo`, `EventoDescricao`, `EventoNomeCompleto` | Evento da folha |
| `TipoEventoCodigo`, `NaturezaEvento` | Classificacao de provento/desconto |
| `Valor`, `Referencia`, `ValorAssinado` | Valor original, referencia e valor com sinal para somatorios |
| `IncideINSS`, `IncideIRRF`, `IncideFGTS` | Flags de incidencia lidas de `EVE` |
| `GrupoEventoBI` | Agrupamento util para separar bases informativas, descontos de imposto e eventos financeiros |

## 5. Resumo mensal por funcionario

Consolida proventos, descontos, liquido e bases informativas da folha.

```sql
DECLARE @FolhaSeq INT = (
    SELECT TOP 1 FOL.Seq
    FROM FOL (NOLOCK)
    INNER JOIN FPG (NOLOCK)
        ON FOL.EMP_Codigo = FPG.EMP_Codigo
       AND FOL.Seq = FPG.FOL_Seq
    WHERE FOL.EMP_Codigo = @EmpresaCodigo
      AND FPG.AnoMes = @AnoMes
      AND FOL.Folha = 2
      AND FPG.Tipo IN (1, 4)
    ORDER BY FOL.Seq DESC
);

WITH Eventos AS (
    SELECT
        EPG.EMP_Codigo AS EmpresaCodigo,
        @AnoMes AS AnoMes,
        EFO.FOL_Seq AS FolhaSeq,
        EPG.Codigo AS Matricula,
        EPG.Nome AS NomeFuncionario,
        EFP.EVE_Codigo AS EventoCodigo,
        EVE.NomeApr AS EventoDescricao,
        EVE.ProvDesc AS TipoEventoCodigo,
        EFP.Valor,
        EFP.Referencia
    FROM EFO (NOLOCK)
    INNER JOIN EPG (NOLOCK)
        ON EFO.EMP_Codigo = EPG.EMP_Codigo
       AND EFO.EPG_Codigo = EPG.Codigo
    LEFT JOIN EFP (NOLOCK)
        ON EFO.EMP_Codigo = EFP.EMP_Codigo
       AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
       AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
    LEFT JOIN EVE (NOLOCK)
        ON EFP.EMP_Codigo = EVE.EMP_Codigo
       AND EFP.EVE_Codigo = EVE.Codigo
    WHERE EFO.EMP_Codigo = @EmpresaCodigo
      AND EFO.FOL_Seq = @FolhaSeq
)
SELECT
    EmpresaCodigo,
    AnoMes,
    FolhaSeq,
    Matricula,
    NomeFuncionario,
    SUM(CASE
        WHEN CAST(TipoEventoCodigo AS VARCHAR(10)) IN ('0', '1')
         AND EventoCodigo NOT IN ('600', '601', '602', '603', '604')
        THEN Valor ELSE 0 END) AS TotalProventos,
    SUM(CASE
        WHEN CAST(TipoEventoCodigo AS VARCHAR(10)) IN ('2', '3')
         AND EventoCodigo NOT IN ('600', '601', '602', '603', '604')
        THEN Valor ELSE 0 END) AS TotalDescontos,
    SUM(CASE
        WHEN CAST(TipoEventoCodigo AS VARCHAR(10)) IN ('0', '1')
         AND EventoCodigo NOT IN ('600', '601', '602', '603', '604')
        THEN Valor
        WHEN CAST(TipoEventoCodigo AS VARCHAR(10)) IN ('2', '3')
         AND EventoCodigo NOT IN ('600', '601', '602', '603', '604')
        THEN -1 * Valor
        ELSE 0 END) AS LiquidoEstimado,
    MAX(CASE WHEN EventoCodigo = '602' THEN Valor END) AS BaseINSSFortes,
    MAX(CASE WHEN EventoCodigo = '603' THEN Valor END) AS BaseIRRFFortes,
    MAX(CASE WHEN EventoCodigo = '604' THEN Valor END) AS BaseFGTSFortes,
    MAX(CASE WHEN EventoCodigo IN ('600', '601') THEN Valor END) AS SalarioContratualInformativo,
    SUM(CASE WHEN EventoCodigo = '310' THEN Valor ELSE 0 END) AS DescontoINSS,
    SUM(CASE WHEN EventoCodigo = '311' THEN Valor ELSE 0 END) AS DescontoIRRF,
    COUNT(EventoCodigo) AS QtdEventos
FROM Eventos
GROUP BY
    EmpresaCodigo,
    AnoMes,
    FolhaSeq,
    Matricula,
    NomeFuncionario
ORDER BY NomeFuncionario;
```

Campos retornados:

| Campo | Descricao |
| --- | --- |
| `TotalProventos` | Soma de eventos classificados como provento, exceto bases informativas |
| `TotalDescontos` | Soma de eventos classificados como desconto, exceto bases informativas |
| `LiquidoEstimado` | Proventos menos descontos pela natureza do evento |
| `BaseINSSFortes`, `BaseIRRFFortes`, `BaseFGTSFortes` | Bases informativas gravadas em eventos `602`, `603`, `604` |
| `SalarioContratualInformativo` | Maior valor dos eventos informativos `600`/`601` |
| `DescontoINSS`, `DescontoIRRF` | Descontos principais de impostos |
| `QtdEventos` | Quantidade de eventos encontrados para o funcionario |

## 6. Eventos de ferias que tocam a competencia

Esta e a mesma regra de `get_ferias_details()`: pega ferias cujo periodo cruza o mes consultado.

```sql
DECLARE @DataInicioMes DATETIME;
DECLARE @DataFimMes DATETIME;
SET @DataInicioMes = CAST(
    CAST(@Ano AS VARCHAR(4)) + RIGHT('00' + CAST(@Mes AS VARCHAR(2)), 2) + '01'
    AS DATETIME
);
SET @DataFimMes = DATEADD(DAY, -1, DATEADD(MONTH, 1, @DataInicioMes));

SELECT
    FER.EMP_Codigo AS EmpresaCodigo,
    @AnoMes AS AnoMes,
    FOL.Seq AS FolhaSeq,
    FOL.Folha AS TipoFolha,
    FER.EFO_EPG_Codigo AS Matricula,
    EPG.Nome AS NomeFuncionario,
    EVE.Codigo AS EventoCodigo,
    EVE.NomeApr AS EventoDescricao,
    EVE.Nome AS EventoNomeCompleto,
    EVE.InfProvDesc AS TipoEventoCodigo,
    CASE
        WHEN CAST(EVE.InfProvDesc AS VARCHAR(10)) IN ('0', '1') THEN 'PROVENTO'
        WHEN CAST(EVE.InfProvDesc AS VARCHAR(10)) IN ('2', '3') THEN 'DESCONTO'
        ELSE 'NAO_CLASSIFICADO'
    END AS NaturezaEvento,
    EFP.Valor,
    EFP.Referencia,
    CASE
        WHEN CAST(EVE.InfProvDesc AS VARCHAR(10)) IN ('2', '3') THEN -1 * EFP.Valor
        ELSE EFP.Valor
    END AS ValorAssinado,
    EVE.IndicativoCPMensalFerias AS IncideINSSCodigo,
    CASE WHEN ISNULL(CAST(EVE.IndicativoCPMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideINSS,
    EVE.IndicativoIRRFMensal AS IncideIRRFCodigo,
    CASE WHEN ISNULL(CAST(EVE.IndicativoIRRFMensal AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideIRRF,
    EVE.IndicativoFGTSMensalFerias AS IncideFGTSCodigo,
    CASE WHEN ISNULL(CAST(EVE.IndicativoFGTSMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideFGTS,
    CASE
        WHEN EVE.Codigo = '602' THEN 'BASE_INSS'
        WHEN EVE.InfProvDesc = '2'
         AND (EVE.Nome LIKE '%INSS%' OR EVE.NomeApr LIKE '%INSS%')
        THEN 'DESCONTO_INSS'
        ELSE 'OUTRO'
    END AS TipoEventoINSSFerias,
    FER.DtGozoInicial,
    FER.DtGozoFinal,
    DATEDIFF(DAY, FER.DtGozoInicial, FER.DtGozoFinal) + 1 AS DiasFeriasTotal,
    DATEDIFF(
        DAY,
        CASE WHEN FER.DtGozoInicial > @DataInicioMes THEN FER.DtGozoInicial ELSE @DataInicioMes END,
        CASE WHEN FER.DtGozoFinal < @DataFimMes THEN FER.DtGozoFinal ELSE @DataFimMes END
    ) + 1 AS DiasFeriasNaCompetencia,
    'FERIAS' AS OrigemEvento
FROM FER (NOLOCK)
LEFT JOIN EFO (NOLOCK)
    ON FER.EMP_Codigo = EFO.EMP_Codigo
   AND FER.EFO_FOL_Seq = EFO.FOL_Seq
   AND FER.EFO_EPG_Codigo = EFO.EPG_Codigo
LEFT JOIN EPG (NOLOCK)
    ON FER.EMP_Codigo = EPG.EMP_Codigo
   AND FER.EFO_EPG_Codigo = EPG.Codigo
LEFT JOIN FOL (NOLOCK)
    ON EFO.EMP_Codigo = FOL.EMP_Codigo
   AND EFO.FOL_Seq = FOL.Seq
LEFT JOIN EFP (NOLOCK)
    ON EFO.EMP_Codigo = EFP.EMP_Codigo
   AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
   AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
WHERE FER.EMP_Codigo = @EmpresaCodigo
  AND FER.DtGozoInicial <= @DataFimMes
  AND FER.DtGozoFinal >= @DataInicioMes
  AND FOL.Folha IN (4, 5, 20)
  AND EVE.InfProvDesc IN (1, 2)
  AND EFP.Valor > 0
ORDER BY FER.EFO_EPG_Codigo, EVE.Codigo;
```

Campos retornados:

| Campo | Descricao |
| --- | --- |
| `TipoFolha` | Tipos aceitos no fluxo atual: `4`, `5`, `20` |
| `EventoCodigo`, `EventoDescricao`, `Valor`, `Referencia` | Evento do recibo de ferias |
| `IncideINSS`, `IncideIRRF`, `IncideFGTS` | Incidencias do evento |
| `TipoEventoINSSFerias` | Classificacao auxiliar usada pelo auditor para base/desconto de INSS de ferias |
| `DtGozoInicial`, `DtGozoFinal` | Periodo das ferias |
| `DiasFeriasTotal`, `DiasFeriasNaCompetencia` | Ajuda no rateio por competencia |
| `OrigemEvento` | Marcador fixo `FERIAS` |

## 7. Fato unico de eventos: folha mensal + ferias

Para BI, esta e a forma mais pratica: uma unica tabela fato com coluna `OrigemEvento`.

```sql
DECLARE @FolhaSeq INT = (
    SELECT TOP 1 FOL.Seq
    FROM FOL (NOLOCK)
    INNER JOIN FPG (NOLOCK)
        ON FOL.EMP_Codigo = FPG.EMP_Codigo
       AND FOL.Seq = FPG.FOL_Seq
    WHERE FOL.EMP_Codigo = @EmpresaCodigo
      AND FPG.AnoMes = @AnoMes
      AND FOL.Folha = 2
      AND FPG.Tipo IN (1, 4)
    ORDER BY FOL.Seq DESC
);

DECLARE @DataInicioMes DATETIME;
DECLARE @DataFimMes DATETIME;
SET @DataInicioMes = CAST(
    CAST(@Ano AS VARCHAR(4)) + RIGHT('00' + CAST(@Mes AS VARCHAR(2)), 2) + '01'
    AS DATETIME
);
SET @DataFimMes = DATEADD(DAY, -1, DATEADD(MONTH, 1, @DataInicioMes));

SELECT
    EFO.EMP_Codigo AS EmpresaCodigo,
    @AnoMes AS AnoMes,
    EFO.FOL_Seq AS FolhaSeq,
    EPG.Codigo AS Matricula,
    EPG.Nome AS NomeFuncionario,
    EFP.EVE_Codigo AS EventoCodigo,
    EVE.NomeApr AS EventoDescricao,
    EVE.ProvDesc AS TipoEventoCodigo,
    CASE
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('0', '1') THEN 'PROVENTO'
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('2', '3') THEN 'DESCONTO'
        ELSE 'NAO_CLASSIFICADO'
    END AS NaturezaEvento,
    EFP.Valor,
    EFP.Referencia,
    CASE
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('2', '3') THEN -1 * EFP.Valor
        ELSE EFP.Valor
    END AS ValorAssinado,
    CASE WHEN ISNULL(CAST(EVE.IndicativoCPMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideINSS,
    CASE WHEN ISNULL(CAST(EVE.IndicativoIRRFMensal AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideIRRF,
    CASE WHEN ISNULL(CAST(EVE.IndicativoFGTSMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideFGTS,
    CAST(NULL AS DATE) AS DtGozoInicial,
    CAST(NULL AS DATE) AS DtGozoFinal,
    CAST(NULL AS INT) AS DiasFeriasNaCompetencia,
    'FOLHA_MENSAL' AS OrigemEvento
FROM EFO (NOLOCK)
INNER JOIN EPG (NOLOCK)
    ON EFO.EMP_Codigo = EPG.EMP_Codigo
   AND EFO.EPG_Codigo = EPG.Codigo
LEFT JOIN EFP (NOLOCK)
    ON EFO.EMP_Codigo = EFP.EMP_Codigo
   AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
   AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq = @FolhaSeq

UNION ALL

SELECT
    FER.EMP_Codigo AS EmpresaCodigo,
    @AnoMes AS AnoMes,
    FOL.Seq AS FolhaSeq,
    FER.EFO_EPG_Codigo AS Matricula,
    EPG.Nome AS NomeFuncionario,
    EVE.Codigo AS EventoCodigo,
    EVE.NomeApr AS EventoDescricao,
    EVE.InfProvDesc AS TipoEventoCodigo,
    CASE
        WHEN CAST(EVE.InfProvDesc AS VARCHAR(10)) IN ('0', '1') THEN 'PROVENTO'
        WHEN CAST(EVE.InfProvDesc AS VARCHAR(10)) IN ('2', '3') THEN 'DESCONTO'
        ELSE 'NAO_CLASSIFICADO'
    END AS NaturezaEvento,
    EFP.Valor,
    EFP.Referencia,
    CASE
        WHEN CAST(EVE.InfProvDesc AS VARCHAR(10)) IN ('2', '3') THEN -1 * EFP.Valor
        ELSE EFP.Valor
    END AS ValorAssinado,
    CASE WHEN ISNULL(CAST(EVE.IndicativoCPMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideINSS,
    CASE WHEN ISNULL(CAST(EVE.IndicativoIRRFMensal AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideIRRF,
    CASE WHEN ISNULL(CAST(EVE.IndicativoFGTSMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideFGTS,
    FER.DtGozoInicial,
    FER.DtGozoFinal,
    DATEDIFF(
        DAY,
        CASE WHEN FER.DtGozoInicial > @DataInicioMes THEN FER.DtGozoInicial ELSE @DataInicioMes END,
        CASE WHEN FER.DtGozoFinal < @DataFimMes THEN FER.DtGozoFinal ELSE @DataFimMes END
    ) + 1 AS DiasFeriasNaCompetencia,
    'FERIAS' AS OrigemEvento
FROM FER (NOLOCK)
LEFT JOIN EFO (NOLOCK)
    ON FER.EMP_Codigo = EFO.EMP_Codigo
   AND FER.EFO_FOL_Seq = EFO.FOL_Seq
   AND FER.EFO_EPG_Codigo = EFO.EPG_Codigo
LEFT JOIN EPG (NOLOCK)
    ON FER.EMP_Codigo = EPG.EMP_Codigo
   AND FER.EFO_EPG_Codigo = EPG.Codigo
LEFT JOIN FOL (NOLOCK)
    ON EFO.EMP_Codigo = FOL.EMP_Codigo
   AND EFO.FOL_Seq = FOL.Seq
LEFT JOIN EFP (NOLOCK)
    ON EFO.EMP_Codigo = EFP.EMP_Codigo
   AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
   AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
WHERE FER.EMP_Codigo = @EmpresaCodigo
  AND FER.DtGozoInicial <= @DataFimMes
  AND FER.DtGozoFinal >= @DataInicioMes
  AND FOL.Folha IN (4, 5, 20)
  AND EVE.InfProvDesc IN (1, 2)
  AND EFP.Valor > 0;
```

Campos retornados:

| Campo | Descricao |
| --- | --- |
| `OrigemEvento` | `FOLHA_MENSAL` ou `FERIAS` |
| `EmpresaCodigo`, `AnoMes`, `FolhaSeq`, `Matricula` | Chaves da fato |
| `EventoCodigo`, `EventoDescricao` | Evento |
| `NaturezaEvento`, `Valor`, `ValorAssinado` | Medidas financeiras |
| `IncideINSS`, `IncideIRRF`, `IncideFGTS` | Incidencias |
| `DtGozoInicial`, `DtGozoFinal`, `DiasFeriasNaCompetencia` | Preenchidos apenas para ferias |

## 8. Catalogo de eventos

Use como dimensao de eventos.

```sql
SELECT
    EVE.EMP_Codigo AS EmpresaCodigo,
    EVE.Codigo AS EventoCodigo,
    EVE.NomeApr AS EventoDescricao,
    EVE.Nome AS EventoNomeCompleto,
    EVE.ProvDesc AS TipoEventoFolha,
    EVE.InfProvDesc AS TipoEventoFerias,
    EVE.IndicativoCPMensalFerias AS IncideINSSCodigo,
    EVE.IndicativoIRRFMensal AS IncideIRRFCodigo,
    EVE.IndicativoFGTSMensalFerias AS IncideFGTSCodigo
FROM EVE (NOLOCK)
WHERE EVE.EMP_Codigo = @EmpresaCodigo
ORDER BY EVE.Codigo;
```

Campos retornados:

| Campo | Descricao |
| --- | --- |
| `EventoCodigo` | Codigo do evento |
| `EventoDescricao`, `EventoNomeCompleto` | Descricoes do evento |
| `TipoEventoFolha`, `TipoEventoFerias` | Natureza usada em folha mensal e ferias |
| `IncideINSSCodigo`, `IncideIRRFCodigo`, `IncideFGTSCodigo` | Codigos brutos de incidencia |

## 9. Validacoes de metadata

Use se o analista quiser confirmar que os campos existem no ambiente de BI.

```sql
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('EPG', 'CEPG', 'HEPG')
  AND COLUMN_NAME IN ('GrauInstrucao', 'RacaCor')
ORDER BY TABLE_NAME, COLUMN_NAME;
```

Resultado esperado no ambiente consultado:

| Tabela | Campo |
| --- | --- |
| `EPG` | `GrauInstrucao` |
| `EPG` | `RacaCor` |
| `CEPG` | `GrauInstrucao` |
| `CEPG` | `RacaCor` |
| `HEPG` | `GrauInstrucao` |
| `HEPG` | `RacaCor` |

Para conferir os codigos em uso:

```sql
SELECT EPG.GrauInstrucao, COUNT(*) AS Qtde
FROM EPG (NOLOCK)
GROUP BY EPG.GrauInstrucao
ORDER BY EPG.GrauInstrucao;

SELECT EPG.RacaCor, COUNT(*) AS Qtde
FROM EPG (NOLOCK)
GROUP BY EPG.RacaCor
ORDER BY EPG.RacaCor;
```

No ambiente consultado, os codigos encontrados foram:

| Campo | Codigos encontrados |
| --- | --- |
| `GrauInstrucao` | `01`, `02`, `03`, `04`, `05`, `06`, `07`, `08`, `09`, `10`, `11`, `12` |
| `RacaCor` | `1`, `2`, `3`, `4`, `6`, `8`, `9` |

## Observacoes para modelagem BI

- Use `EmpresaCodigo + AnoMes + FolhaSeq + Matricula + EventoCodigo + OrigemEvento` como base da fato de eventos. Se houver eventos repetidos por funcionario, inclua uma chave tecnica/indice no ETL.
- `EPG` e a dimensao cadastral mais alinhada ao fluxo atual da aplicacao.
- `HEPG` parece conter historico de campos cadastrais, com `Data`; pode ser usada futuramente se o BI precisar enxergar escolaridade/raca como historico temporal.
- Eventos `600`, `601`, `602`, `603`, `604` sao tratados pelo auditor como informativos/base. Nao misturar automaticamente em total de proventos/descontos sem regra de negocio.
- A aplicacao soma as ferias ao contexto da auditoria quando o periodo de gozo cruza a competencia, por isso o BI deve manter `OrigemEvento`.
- Todas as queries acima sao somente leitura.