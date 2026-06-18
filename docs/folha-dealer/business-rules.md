# Regras de negocio — Folha Fortes -> Dealer

## Regras obrigatorias

1. A empresa inicial do modulo e Braga Veiculos.
2. A competencia deve ser informada no formato interno `YYYY-MM`.
3. O historico padrao dos lancamentos e
   `FOLHA DE PAGAMENTO REF MM/AAAA`.
4. O tipo de lote dos lancamentos e `FP`.
5. A consolidacao ocorre antes dos de-para e agrupa por:
   - empresa;
   - competencia;
   - codigo da lotacao Fortes;
   - codigo do evento Fortes.
6. Valores consolidados iguais a zero nao devem gerar lancamento.
7. Eventos informativos/base, como `600`, `601`, `602`, `603`, e `604`, nao
   devem gerar lancamento contabil.
8. Se um evento informativo tentar virar journal, o motor deve ignora-lo ou
   emitir alerta.
9. O de-para de centro converte lotacao Fortes em centro Dealer.
10. Lotacoes marcadas como `Direta` usam diretamente o centro Dealer do de-para.
11. Lotacoes marcadas como `Por atividade` nao bloqueiam quando ja houver centro
   definido no de-para ou regra explicita cadastrada. Elas bloqueiam somente
   quando nao houver centro nem regra explicita para resolver a alocacao.
12. O de-para de conta converte evento Fortes em uma ou mais linhas contabeis.
   Cada linha deve declarar:
   - codigo do evento Fortes;
   - conta contabil Dealer;
   - natureza `D` ou `C`;
   - regra de centro, quando necessario.
13. O evento Fortes `100 Provisao Cred. Trab.` deve usar a conta contabil
    `2.1.1.03.001`.
14. Contas iniciadas por `1` ou `2` nao levam centro de custo.
15. Contas iniciadas por `3`, `4`, `5`, `6`, `7`, `8`, ou `9` levam centro de
    custo.
16. No TXT Dealer, o campo de centro de custo deve ficar vazio ou preenchido
    com espacos quando a conta iniciar por `1` ou `2`.
17. Como a conta do evento `100` comeca com `2`, esse evento nao leva centro de
    custo no TXT.
18. A natureza D/C deve ser normalizada para maiusculo no motor e nos
    exportadores.
19. O sistema nao deve sintetizar contrapartida contabil ausente. Se o de-para
    nao gerar debito e credito balanceados, a competencia fica bloqueada.
20. A exportacao final do TXT Dealer exige aprovacao do analista contabil.

## Regras conhecidas de Braga Veiculos para lotacoes `Por atividade`

As lotacoes abaixo ja possuem regra explicita de alocacao e nao devem bloquear
o processamento por estarem marcadas como `Por atividade`.

| Lotacao Fortes | Centro Dealer | Centro |
| --- | --- | --- |
| DEPT. PRODUTIVOS | 000300 | MECANICA |
| AGENDAMENTOS | 000300 | MECANICA |
| DEPT. VENDAS VEICULOS | 001000 | VEICULOS NOVOS |
| BRAGA MULTIMARCAS | 002000 | VEICULOS USADOS |
| DEPT. DE LEADS MATRIZ | 001000 | VEICULOS NOVOS |
| DEPT. DE FINANCIAMENTO MATRIZ | 001000 | VEICULOS NOVOS |
| DEPT. FINANCIAMENTO FILIAL | 001100 | VEICULOS NOVOS FILIAL |
| DEPT. DE LEADS FILIAL | 001100 | VEICULOS NOVOS FILIAL |
| DEPTO VENDA DIRETA FILIAL | 000101 | VENDA DIRETA |

## Politica de sinais

Valores positivos seguem a natureza declarada no de-para de conta. Valores
negativos devem ser tratados explicitamente pela regra do evento. Enquanto uma
politica por evento nao existir, valor negativo e uma inconsistencia bloqueante.

## Validacoes bloqueantes

| Codigo | Quando ocorre | Acao esperada |
| --- | --- | --- |
| `MISSING_CENTER_MAPPING` | A lotacao Fortes nao tem centro Dealer. | Bloquear aprovacao. |
| `ACTIVITY_MAPPING_REQUIRED` | A lotacao esta marcada como `Por atividade` e nao existe centro no de-para nem regra explicita cadastrada. | Bloquear aprovacao. |
| `MISSING_ACCOUNT_MAPPING` | O evento Fortes nao tem de-para contabil. | Bloquear aprovacao. |
| `EVENT_100_ACCOUNT_MISMATCH` | O evento `100` aponta para conta diferente de `2.1.1.03.001`. | Bloquear aprovacao. |
| `CENTER_ON_BALANCE_ACCOUNT` | Conta iniciada por `1` ou `2` recebeu centro. | Remover centro e bloquear se a origem insistir no centro. |
| `MISSING_REQUIRED_CENTER` | Conta iniciada por `3` em diante nao recebeu centro. | Bloquear aprovacao. |
| `UNBALANCED_JOURNAL` | Total de debitos difere do total de creditos. | Bloquear aprovacao. |
| `NEGATIVE_VALUE_WITHOUT_POLICY` | Evento tem valor negativo sem regra explicita. | Bloquear aprovacao. |

## Validacoes de alerta

| Codigo | Quando ocorre | Acao esperada |
| --- | --- | --- |
| `ZERO_VALUE_IGNORED` | Item consolidado ficou com valor zero. | Exibir na conferencia. |
| `INFORMATIVE_EVENT_IGNORED` | Evento informativo/base estava presente na origem ou tentou virar lancamento. | Ignorar no journal e exibir alerta. |
| `UNUSED_MAPPING` | De-para cadastrado nao foi usado na competencia. | Exibir como alerta. |
| `ROUNDING_ADJUSTMENT` | Houve ajuste de arredondamento documentado. | Exibir na conferencia. |

## Validacoes exclusivas da exportacao TXT

Estas validacoes nao bloqueiam o motor contabil, as validacoes de negocio, nem
o Excel de conferencia.

| Codigo | Quando ocorre | Acao esperada |
| --- | --- | --- |
| `DEALER_LAYOUT_AMBIGUOUS` | A regra extraida da planilha oficial tem divergencia ou formula ambigua. | Bloquear somente a exportacao TXT final ate confirmacao. |

## Aprovacao

A aprovacao deve registrar empresa, competencia, usuario, data/hora, hash ou
versao dos dados de origem, hash ou versao dos de-para, total de debitos, total
de creditos, quantidade de lancamentos, e lista de validacoes sem bloqueio.
