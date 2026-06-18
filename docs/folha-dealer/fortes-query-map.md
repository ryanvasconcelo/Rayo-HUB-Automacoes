# Mapa de queries Fortes — Folha Fortes -> Dealer

## Fonte revisada

Fontes:

- `temp/braga/querys-fopag.md`;
- `temp/braga/querys-fopag-2.md`;
- `temp/braga/querys-fopag-3.md`.

Banco indicado: SQL Server/Fortes `AC`.

As queries neste arquivo sao ponto de partida para o adapter Fortes futuro.
Elas nao entram no primeiro bloco como conexao de banco. O primeiro bloco deve
usar fixtures que simulem o resultado normalizado em `PayrollSourceRow`.

Importante: o draft em `querys-fopag-3.md` usava `EFO.LOT_Codigo`. Essa
hipotese esta errada e nao deve ser implementada. A lotacao processada da folha
deve vir de `SEP.LOT_Codigo`, ligada a partir da data `EFO.SEP_Data`.

## Decisao de arquitetura

O motor puro recebe `PayrollSourceRow`. Ele nao executa SQL e nao conhece o
banco Fortes.

O adapter Fortes futuro deve:

1. Resolver a empresa e a competencia.
2. Buscar a folha/processamento correto no Fortes.
3. Retornar linhas por funcionario, lotacao, e evento.
4. Normalizar essas linhas para `PayrollSourceRow`.
5. Entregar somente dados ja prontos para consolidacao por lotacao e evento.

## O que ja podemos aproveitar

| Query no arquivo | Uso para o modulo | Status |
| --- | --- | --- |
| `1. Empresas ativas` | Lista empresas ativas no Fortes. Serve para configuracao e selecao futura de empresa. | Aproveitavel. |
| `2. Identificar folha mensal da competencia` | Resolve `FolhaSeq` para a folha mensal por empresa e competencia. | Aproveitavel para o adapter Fortes. |
| `3. Cadastro de funcionarios da folha` | Traz matricula, nome, CPF, PIS, admissao, rescisao, carga horaria, escolaridade, raca/cor, e dependentes. | Aproveitavel como dimensao/enriquecimento, nao como fato contabil principal. |
| `4. Eventos da folha mensal` | Traz uma linha por evento por funcionario, com evento, natureza Fortes, valor, referencia, e incidencias. | Principal candidata para gerar `PayrollSourceRow`; deve ser estendida com lotacao via `EFO -> SEP -> LOT`. |
| `5. Resumo mensal por funcionario` | Consolida proventos, descontos, liquido estimado, bases Fortes, INSS, IRRF, e quantidade de eventos. | Aproveitavel para conferencia e validacao, nao para lancamento por evento. |
| `6. Eventos de ferias que tocam a competencia` | Busca eventos de ferias que cruzam a competencia. | Aproveitavel em fase futura ou origem `ferias`; fora do primeiro motor se o escopo ficar em folha mensal. |
| `7. Fato unico de eventos: folha mensal + ferias` | Une folha mensal e ferias com `OrigemEvento`. | Boa base futura para adapter unico; tambem precisa receber lotacao via `SEP -> LOT`. |
| `8. Catalogo de eventos` | Lista eventos, descricoes, natureza e codigos de incidencia. | Aproveitavel para validar e manter de-para de eventos. |
| `9. Validacoes de metadata` | Confirma campos cadastrais de escolaridade e raca/cor. | Fora do motor contabil; util para BI. |

## Mapeamento para `PayrollSourceRow`

Campos que a query `4. Eventos da folha mensal` ja fornece:

| Campo da query | Campo do contrato | Transformacao |
| --- | --- | --- |
| `EmpresaCodigo` | `companyId` | Usar codigo Fortes ou mapear para id interno da empresa. |
| `EmpresaNome` | `companyName` | A query principal ainda nao retorna; pode vir de `EMP` ou configuracao. |
| `AnoMes` | `competence` | Converter de `AAAAMM` para `YYYY-MM`. |
| `FolhaSeq` | `sourcePayrollId` | Preservar como rastreio. |
| `Matricula` | `employeeId` | Preservar como rastreio. |
| `NomeFuncionario` | `employeeName` | Preservar para conferencia. |
| `EventoCodigo` | `eventCode` | Preservar com zeros e formato original. |
| `EventoDescricao` ou `EventoNomeCompleto` | `eventName` | Usar descricao curta ou completa conforme conferencia. |
| `NaturezaEvento` | `sourceEventNature` | Preservar como informacao da origem, usando a regra correta de `EVE.ProvDesc`. |
| `EFP.Referencia` | `sourceReference` | Campo correto de referencia do evento. |
| `EFP.Valor` | `amountCents` | Converter com `CAST(ROUND(EFP.Valor * 100, 0) AS BIGINT)` e manter positivo. |
| `IncideINSS`, `IncideIRRF`, `IncideFGTS` | Metadados de origem | Usar em validacoes futuras e conferencia. |
| Constante `folha-mensal` | `sourceOrigin` | Informar a origem funcional. |
| Constante `fortes-query` | `sourceAdapter` | Informar o adapter. |

Campos obrigatorios que devem entrar na query operacional:

| Campo do contrato | Necessidade |
| --- | --- |
| `lotacaoCode` | Usar `SEP.LOT_Codigo`, nao `EFO.LOT_Codigo`. |
| `lotacaoName` | Usar preferencialmente `LOT.Nome`, validando se bate com o de-para Braga. |
| `sourceLineId` | Recomendado para rastrear eventos repetidos por funcionario. |

## Empresa Fortes candidata

O codigo usado como exemplo em drafts antigos nao deve ser usado como candidato
de Braga.

Descobertas atuais:

| Codigo Fortes | Empresa | Situacao aparente |
| --- | --- | --- |
| `2025` | BRAGA VEICULOS LTDA | Aparentemente desativada |
| `2027` | BRAGA MOTORS LTDA | Aparentemente ativa |

`fortesCompanyCode` continua a confirmar no banco. A decisao final depende das
queries de descoberta D1/D2 e da existencia da folha da competencia.

## Join correto de lotacao

Nao usar `EFO.LOT_Codigo`. A lotacao processada deve seguir este caminho
conceitual:

```text
EFO -> SEP -> LOT
```

Joins:

```sql
EFO.EMP_Codigo = SEP.EMP_Codigo
EFO.EPG_Codigo = SEP.EPG_Codigo
EFO.SEP_Data = SEP.Data
SEP.EMP_Codigo = LOT.EMP_Codigo
SEP.LOT_Codigo = LOT.Codigo
```

Campos esperados:

- `SEP.LOT_Codigo` como `lotacaoCode`.
- `LOT.Nome` provavelmente como `lotacaoName`.

Validar no banco se `LOT.Nome` e exatamente o nome usado no de-para, como
`RECURSOS HUMANOS` e `DEPT. VENDAS VEICULOS`.

## Regra correta de `EVE.ProvDesc`

Use esta interpretacao para folha mensal:

| `EVE.ProvDesc` | Classificacao |
| --- | --- |
| `1` | `PROVENTO` |
| `2` | `DESCONTO` |
| `-1` | `DESCONTO` / desconto especial / provisao |
| `0` | `INFORMATIVO` |
| Demais valores | `NAO_CLASSIFICADO` |

Nao tratar `0` como provento. Nao tratar `3` como desconto sem validacao
especifica.

Essa classificacao e metadado da origem. A natureza contabil D/C nao vem do
Fortes; ela vem exclusivamente do de-para contabil.

## Eventos informativos/base

Eventos informativos/base, como `600`, `601`, `602`, `603`, e `604`, nao devem
gerar lancamento contabil. Eles podem vir na query para conferencia, bases e
auditoria, mas o motor deve ignora-los ou emitir alerta se algum informativo
tentar virar journal.

`EFP.Valor` vem positivo. `amountCents` deve ser sempre positivo. Nao usar
`ValorAssinado` para gerar debito ou credito.

## Filtros e joins confirmados

Para a folha mensal principal/retificacao, continuam validos:

```sql
FOL.Folha = 2
FPG.Tipo IN (1, 4)
```

O join `EFO -> EFP` continua correto por:

```sql
EFO.EMP_Codigo = EFP.EMP_Codigo
EFO.FOL_Seq = EFP.EFO_FOL_Seq
EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
```

## Politica de `sourceLineId`

Se existir identificador unico fisico em `EFP`, usar esse identificador.

Se nao existir, usar chave composta natural:

```text
EMP_Codigo + AnoMes + FOL_Seq + EPG_Codigo + EVE_Codigo
```

Rodar validacao de duplicidade sobre a chave natural. Se houver duplicidade,
usar `ROW_NUMBER()` apenas como fallback documentado para preservar
rastreabilidade dentro da execucao.

## O que precisamos pesquisar no banco

| Lacuna | Pergunta a responder |
| --- | --- |
| Codigo Fortes final | Confirmar se a folha da competencia esta em `2025` ou `2027`, usando D1/D2 e existencia da folha. |
| Nome da lotacao | Confirmar se `LOT.Nome` retorna exatamente o nome usado no de-para Braga. |
| Mudanca de lotacao no mes | Se o funcionario troca de lotacao dentro da competencia, o evento deve seguir a lotacao da folha, a lotacao vigente na data do evento, ou algum rateio? |
| Chave tecnica do evento | Existe sequencial ou chave primaria fisica em `EFP`? Se nao existir, validar duplicidade da chave natural. |
| Tipos de folha futuros | Alem de `FOL.Folha = 2` com `FPG.Tipo IN (1, 4)`, quais filtros representam rescisao, complemento, ferias, 13o, e outras folhas? |
| Rescisao e complemento | Quais tabelas e filtros representam rescisao e complemento, se entrarem em versao futura? |
| Bases para encargos | Eventos `602`, `603`, `604` bastam para INSS, IRRF, e FGTS, ou ha bases especificas por tipo de folha que precisamos consultar? |
| Liquido de folha e obrigacoes | A contrapartida de liquido/obrigações vem de evento, resumo, ou formula por lotacao? Qual conta deve ser usada para cada caso? |
| Cargo/atividade | Se uma lotacao `Por atividade` nao tiver centro direto no de-para, qual tabela fornece cargo, funcao, atividade, ou regra para resolver centro? |

## Draft operacional da query principal

A query operacional para o adapter Fortes deve ser uma versao da query
`4. Eventos da folha mensal` com `SEP -> LOT`, centavos inteiros e
classificacao correta de `EVE.ProvDesc`.

```sql
SELECT
    EFO.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    @AnoMes AS competence,
    EFO.FOL_Seq AS sourcePayrollId,
    EPG.Codigo AS employeeId,
    EPG.Nome AS employeeName,
    SEP.LOT_Codigo AS lotacaoCode,
    LOT.Nome AS lotacaoName,
    EFP.EVE_Codigo AS eventCode,
    EVE.NomeApr AS eventName,
    CASE
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) = '1' THEN 'PROVENTO'
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) = '2' THEN 'DESCONTO'
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) = '-1' THEN 'DESCONTO'
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) = '0' THEN 'INFORMATIVO'
        ELSE 'NAO_CLASSIFICADO'
    END AS sourceEventNature,
    EFP.Referencia AS sourceReference,
    CAST(ROUND(EFP.Valor * 100, 0) AS BIGINT) AS amountCents,
    CASE
        WHEN EFP.EVE_Codigo IN ('600', '601', '602', '603', '604') THEN 'INFORMATIVO_BASE'
        ELSE 'FINANCEIRO'
    END AS sourceRecordType,
    'folha-mensal' AS sourceOrigin,
    'fortes-query' AS sourceAdapter,
    CONCAT(EFO.EMP_Codigo, '-', @AnoMes, '-', EFO.FOL_Seq, '-', EPG.Codigo, '-', EFP.EVE_Codigo) AS sourceLineId
FROM EFO (NOLOCK)
INNER JOIN EPG (NOLOCK)
    ON EFO.EMP_Codigo = EPG.EMP_Codigo
   AND EFO.EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON EFO.EMP_Codigo = EMP.Codigo
LEFT JOIN SEP (NOLOCK)
    ON EFO.EMP_Codigo = SEP.EMP_Codigo
   AND EFO.EPG_Codigo = SEP.EPG_Codigo
   AND EFO.SEP_Data = SEP.Data
LEFT JOIN LOT (NOLOCK)
    ON SEP.EMP_Codigo = LOT.EMP_Codigo
   AND SEP.LOT_Codigo = LOT.Codigo
LEFT JOIN EFP (NOLOCK)
    ON EFO.EMP_Codigo = EFP.EMP_Codigo
   AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
   AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq = @FolhaSeq;
```

O adapter deve descartar ou marcar como informativos os eventos `600`, `601`,
`602`, `603`, e `604` conforme regra documentada antes de gerar lancamentos
contabeis. Esses eventos podem continuar disponiveis para conferencia e bases.

## Impacto no primeiro bloco

No primeiro bloco, nao vamos pesquisar o banco nem implementar backend Fortes.
Mesmo assim, as fixtures da Braga devem representar o formato esperado da query
operacional ja com `lotacaoCode` e `lotacaoName`. Isso evita escrever um motor
que funcione apenas para planilha ou PDF.

O teste do normalizador deve provar que uma linha bruta com campos equivalentes
a query operacional vira `PayrollSourceRow`.

## Criterio de prontidao da query Fortes

A query Fortes esta pronta para o adapter quando:

- retorna uma linha por evento financeiro por funcionario;
- retorna lotacao codigo/nome em todas as linhas contabilizaveis;
- permite rastrear a linha original por chave tecnica;
- reconcilia totais por evento com o resumo Fortes da competencia;
- reconcilia totais por lotacao com o fixture de conferencia;
- separa eventos financeiros de eventos informativos/base;
- preserva dados suficientes para auditoria do analista contabil.
