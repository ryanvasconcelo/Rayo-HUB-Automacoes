# Contratos de dados — Folha Fortes -> Dealer

## Convencoes

- Valores monetarios devem ser armazenados internamente em centavos inteiros.
- Datas de competencia usam `YYYY-MM`.
- O historico exibido e exportado usa `MM/AAAA`.
- Codigos de conta podem ser exibidos com mascara, mas comparacoes de classe
  contabil usam o primeiro digito numerico da conta.
- Objetos de origem devem manter campos de rastreio para conferencia.
- A fonte operacional esperada e query no Fortes ERP. Fixtures podem produzir
  o mesmo contrato somente em testes ou desenvolvimento.

## `PayrollSourceRow`

Linha normalizada vinda de query no Fortes ou de uma origem futura. Fixtures de
teste tambem devem gerar este contrato.

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `sourceSystem` | Sim | Origem dos dados, como `fortes`. |
| `sourceAdapter` | Sim | Adapter usado, como `fortes-query`, `fixture`, ou `nbs`. |
| `sourceOrigin` | Sim | Origem funcional, como `folha-mensal`, `ferias`, `rescisao`, ou `complemento`. |
| `sourcePayrollId` | Nao | Identificador da folha/processamento na origem, como `FolhaSeq`. |
| `companyId` | Sim | Identificador interno da empresa. |
| `companyName` | Sim | Nome da empresa. |
| `competence` | Sim | Competencia em `YYYY-MM`. |
| `lotacaoCode` | Sim | Codigo da lotacao na origem. |
| `lotacaoName` | Nao | Nome da lotacao na origem. |
| `eventCode` | Sim | Codigo do evento de folha na origem. |
| `eventName` | Nao | Nome do evento de folha. |
| `sourceEventNature` | Nao | Natureza vinda do Fortes, como `PROVENTO`, `DESCONTO`, `INFORMATIVO`, ou `NAO_CLASSIFICADO`. |
| `sourceReference` | Nao | Referencia do evento; no Fortes, vem de `EFP.Referencia`. |
| `sourceRecordType` | Nao | Classificacao auxiliar, como `FINANCEIRO` ou `INFORMATIVO_BASE`. |
| `amountCents` | Sim | Valor monetario original em centavos, sempre positivo. |
| `employeeId` | Nao | Identificador do colaborador, quando disponivel. |
| `employeeName` | Nao | Nome do colaborador, quando disponivel. |
| `sourceLineId` | Nao | Identificador ou linha original para auditoria. |

O motor nao deve usar o sinal de `ValorAssinado` das queries Fortes para
definir debito ou credito. A natureza contabil vem do de-para de conta.
Se existir identificador unico fisico em `EFP`, use esse identificador como
`sourceLineId`. Se nao existir, use a chave natural
`EMP_Codigo + AnoMes + FOL_Seq + EPG_Codigo + EVE_Codigo`, valide duplicidade,
e use `ROW_NUMBER()` apenas como fallback rastreavel dentro da execucao.

## `ConsolidatedPayrollItem`

Resultado da consolidacao por lotacao e evento.

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `companyId` | Sim | Empresa consolidada. |
| `competence` | Sim | Competencia em `YYYY-MM`. |
| `lotacaoCode` | Sim | Lotacao Fortes. |
| `lotacaoName` | Nao | Nome da lotacao Fortes. |
| `eventCode` | Sim | Evento Fortes. |
| `eventName` | Nao | Nome do evento Fortes. |
| `amountCents` | Sim | Soma do grupo. |
| `sourceCount` | Sim | Quantidade de linhas de origem consolidadas. |

## `CenterMapping`

De-para de lotacao Fortes para centro Dealer.

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `companyId` | Sim | Empresa dona do mapeamento. |
| `lotacaoCode` | Sim | Codigo da lotacao Fortes. |
| `dealerCenterCode` | Sim | Codigo do centro no Dealer. |
| `dealerCenterName` | Nao | Nome do centro no Dealer. |
| `allocationMode` | Sim | `direct` ou `activity`. |
| `active` | Sim | Indica se a regra esta ativa. |

## `AccountMappingLine`

Linha de de-para contabil por evento.

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `companyId` | Sim | Empresa dona do mapeamento. |
| `eventCode` | Sim | Codigo do evento Fortes. |
| `dealerAccountCode` | Sim | Conta contabil Dealer. |
| `dc` | Sim | Natureza normalizada para `D` ou `C`. |
| `description` | Nao | Descricao funcional da regra. |
| `negativePolicy` | Nao | Politica para valor negativo, quando existir. |
| `active` | Sim | Indica se a regra esta ativa. |

Eventos de encargos e provisoes podem nao ter codigo Fortes. Nesses casos,
usar uma chave tecnica estavel, como `ENCARGO_INSS_PATRONAL` ou
`PROVISAO_FERIAS`, para manter o mesmo contrato.

## `AccountingEntry`

Lancamento gerado pelo motor.

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `companyId` | Sim | Empresa do lancamento. |
| `competence` | Sim | Competencia em `YYYY-MM`. |
| `batchType` | Sim | Sempre `FP`. |
| `history` | Sim | Historico padrao ou override aprovado. |
| `dc` | Sim | Natureza normalizada para `D` ou `C`. |
| `accountCode` | Sim | Conta contabil Dealer. |
| `centerCode` | Nao | Centro Dealer quando exigido pela conta. |
| `subAccountType` | Nao | Tipo de subconta usado no layout Dealer. |
| `subAccountCode` | Nao | Codigo de subconta usado no layout Dealer. |
| `amountCents` | Sim | Valor em centavos. |
| `lotacaoCode` | Sim | Lotacao Fortes de origem. |
| `eventCode` | Sim | Evento Fortes de origem. |

## `ValidationIssue`

Inconsistencia ou alerta detectado na competencia.

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `code` | Sim | Codigo documentado em `business-rules.md`. |
| `severity` | Sim | `blocker`, `warning`, ou `export-blocker`. |
| `message` | Sim | Mensagem para o analista. |
| `context` | Nao | Empresa, competencia, lotacao, evento, conta, ou centro. |

## `PayrollAccountingRun`

Execucao completa da competencia.

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `companyId` | Sim | Empresa processada. |
| `competence` | Sim | Competencia processada. |
| `sourceRows` | Sim | Linhas normalizadas. |
| `consolidatedItems` | Sim | Itens por lotacao e evento. |
| `entries` | Sim | Lancamentos D/C gerados. |
| `issues` | Sim | Validacoes e alertas. |
| `status` | Sim | `draft`, `blocked`, `ready`, `approved`, ou `exported`. |
| `approval` | Nao | Registro de aprovacao. |
