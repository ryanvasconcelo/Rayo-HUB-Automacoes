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
   A chave **nao** inclui `FolhaSeq`/`sourcePayrollId`: quando a competencia
   tiver varias sequencias de folha mensal no Fortes, todas entram na mesma
   consolidacao da competencia.
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
negativos devem ser tratados explicitamente pela regra do evento.

**Exceção explícita — provisões Fortes (`PROV_*`, origem `fortes-provision`):**
a coluna `PRD`/`PRF.Provisao` (relatório RH **Provisionar**) pode ser negativa
(= estorno). O motor preserva o sinal, consolida o líquido por lotação+evento e,
no journal, usa o valor absoluto invertendo D/C. Folha mensal continua com
`amountCents` positivo.

## Validacoes bloqueantes

| Codigo | Quando ocorre | Acao esperada |
| --- | --- | --- |
| `MISSING_CENTER_MAPPING` | A lotacao Fortes nao tem centro Dealer. | Bloquear aprovacao. |
| `ACTIVITY_MAPPING_REQUIRED` | A lotacao esta marcada como `Por atividade` e nao existe centro no de-para nem regra explicita cadastrada. | Bloquear aprovacao. |
| `MISSING_ACCOUNT_MAPPING` | O evento Fortes nao tem de-para contabil. | Bloquear aprovacao. |
| `EVENT_100_ACCOUNT_MISMATCH` | O evento `100` aponta para conta diferente de `2.1.1.02.007`. | Bloquear aprovacao. |
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

## Férias, rescisão e folha complementar

O Fortes guarda cada uma como uma folha própria (`FOL.Folha`), sem registro em `FPG`. A competência de cada uma sai de uma data própria — regra conferida ao centavo com o "Resumo Geral do Mês/Período" do Fortes (Braga Motos 04/2026 e Braga Veículos 01–08/2026):

| Tipo | `FOL.Folha` | Competência pelo mês de | Líquido |
|---|---|---|---|
| Férias | 4, só sem `FOL_Seq_Pai` | `FER.DtGozoInicial` | `LIQUIDO_FERIAS` → 1.1.4.01.002 |
| Rescisão | 10 | `FOL.DtCalculo` | `LIQUIDO_RESCISAO` → 2.1.1.01.004 |
| Complementar | 17 | `FOL.DtReferencia` | `LIQUIDO_COMPLEMENTAR` → 2.1.1.01.001 |

- O 13º rescisório (`Folha=8`) e as férias filhas de rescisão (`Folha=4` com `FOL_Seq_Pai`) **não entram**: repetem os eventos 208/209 e 203/205/211/212 que já estão na rescisão.
- **Encargos patronais não são gerados** para esses tipos: as bases eSocial (`ES_CS_CP_Base`, `ES_FGTS_SEGURADO`) já consolidam todos os tipos de folha da competência.
- Histórico no TXT: `FERIAS REF MM/AAAA`, `RESCISAO REF MM/AAAA`, `FOLHA COMPLEMENTAR REF MM/AAAA`. A folha mensal continua `FOLHA DE PAGAMENTO REF MM/AAAA`.
- Contas definidas com o contador (28/09/2026): proventos de férias (110, 111, 113, 950) e férias na rescisão (203, 205, 206, 211, 212) a débito de 6.1.1.03.001; 13º na rescisão (160, 208, 209) a débito de 6.1.1.03.002; aviso prévio indenizado e rescisão antecipada (200, 201) a débito de 6.1.1.01.004; evento 301 a crédito e evento 100 a débito de 2.1.1.02.007.
- Baixa da provisão de férias (contador, 28/09/2026): as férias são pagas em despesa, e a provisão do empregado zera sempre que as férias acontecem (gozo ou rescisão). No Fortes (PRF), por empregado × período aquisitivo, `Acumulada` é o saldo anterior já deduzido da baixa do mês e `Provisao` é a constituição do mês (no mês das férias, o complemento). O Rayo lança a constituição (PROV_FERIAS, PROV_INSS_FER, PROV_FGTS_FER) e a baixa = saldo final do mês anterior − `Acumulada` do mês (PROV_BAIXA_FERIAS / PROV_BAIXA_INSS_FER / PROV_BAIXA_FGTS_FER: D provisão 2.1.1.03.001/002/003, C despesa 6.1.1.03.001/003/005). Período que some da PRF (rescisão) baixa o saldo inteiro; sem PRF do mês ou do mês anterior, não há baixa. A provisão de 13º não tem baixa automática: o contador zera no fim do ano.
- A multa de 40% do FGTS (evento 900) é informativa no Fortes, mas vai para o Dealer na competência da data de cálculo da rescisão: D 6.1.1.02.002 / C 2.1.1.02.002. Não entra no líquido da rescisão e não está nas bases eSocial do FGTS mensal (sem duplicidade).
- Para conferir contra o Resumo Geral: `node apps/rayo-server/scripts/reconcile-payroll-types.mjs <empresaFortes> <AAAA-MM> [AAAA-MM final]`.
- Testes de conformidade com o contador: `apps/rayo/tests/folha-dealer-contador-resumo-geral.test.js` confere o lote contra o Resumo Geral (valor de cada evento, contas dos líquidos, decisões do contador). Com `FORTES_LIVE=1` também compara, evento a evento, a extração do banco com o relatório.
