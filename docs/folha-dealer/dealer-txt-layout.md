# Layout TXT Dealer — Folha Fortes -> Dealer

## Fonte oficial

O layout oficial do TXT Dealer e
`temp/braga/planilha-importacao-dealer.xlsm`.

A aba `Lote` contem os campos de entrada nas colunas `A:H`, a conta RCO005 de
referencia na coluna `I`, o filtro `LANÇAR` na coluna `J`, a linha concatenada
para copia em TXT na coluna `L`, e os segmentos de layout nas colunas `N:AG`.
No sistema, os campos preenchidos no cabecalho da planilha devem vir da
configuracao da empresa, nao de valores fixos no codigo.

Parametros e valores observados:

- `companyDisplayName = BRAGA VEICULOS LTDA`.
- `dealerCompanyField = parametrizavel`.
- `07` e apenas o valor observado no fixture da planilha, nao uma regra
  definitiva de negocio.
- Filial Dealer: `001`.
- Tipo de lote: `FP`.
- Data do lote no fixture: `30/04/2026`.

## Regras ja conhecidas

- O tipo de lote e `FP`.
- O historico padrao e `FOLHA DE PAGAMENTO REF MM/AAAA`.
- Contas iniciadas por `1` ou `2` exportam centro de custo vazio ou com
  espacos, conforme a regra de preenchimento do layout oficial.
- Contas iniciadas por `3` em diante exportam centro de custo.
- O evento Fortes `100 Provisao Cred. Trab.` usa a conta `2.1.1.03.001` e,
  por comecar com `2`, exporta centro de custo vazio ou com espacos.
- O motor e o exportador devem normalizar a natureza D/C para maiusculo.
- O TXT final so pode ser exportado depois da aprovacao do analista contabil.

## Campos extraidos da aba `Lote`

| Coluna | Campo | Tamanho indicado | Regra extraida da linha 8 |
| --- | --- | --- | --- |
| N | Tipo | 2 | `=TEXT($B$6,"00")` |
| O | NR.LOTE | 8 | `=REPT(" ",8)` |
| P | empresa | 2 | `=RIGHT($B$4,2)`; no sistema, `$B$4` vem de `dealerCompanyField` |
| Q | filial | 3 | `=RIGHT($B$5,3)` |
| R | conta debito | 20 | `=IF(A8="D",LEFT(UPPER(B8)&REPT(" ",20),20),REPT(" ",20))` |
| S | c.custo debito | 10 | `=IF(A8="D",LEFT(UPPER(C8)&REPT(" ",10),10)," ")` |
| T | tipo subconta debito | 2 | `=IF(A8="D",LEFT(UPPER(D8)&REPT(" ",2),2)," ")` |
| U | codigo subconta debito | 15 | `=IF(A8="D",LEFT(UPPER(E8)&REPT(" ",15),15)," ")` |
| V | espaco | 24 | `=REPT(" ",24)` |
| W | conta credito | 20 | `=IF(A8="c",LEFT(UPPER(B8)&REPT(" ",20),20),REPT(" ",20))` |
| X | c.custo credito | 10 | `=IF(A8="C",LEFT(UPPER(C8)&REPT(" ",10),10)," ")` |
| Y | tipo subconta credito | 2 | `=IF(A8="C",LEFT(UPPER(D8)&REPT(" ",2),2)," ")` |
| Z | codigo subconta credito | 15 | `=IF(A8="C",LEFT(UPPER(E8)&REPT(" ",15),15)," ")` |
| AA | nr.doc | 8 | `=REPT(" ",8)` |
| AB | hist.padrao | 4 | `=REPT(" ",4)` |
| AC | complemento | 250 | `=LEFT(UPPER(H8)&REPT(" ",250),250)` |
| AD | data | 10 | `=TEXT($G$2,"dd/mm/aaaa")` |
| AE | data 2 | 10 | `=REPT(" ",10)` |
| AF | contrapartida | 20 | `=REPT(" ",20)` |
| AG | valor | 18 | `=REPT(" ",18-LEN(FIXED(F8,2,TRUE)))&FIXED(F8,2,TRUE)` |

## Ambiguidades Resolvidas (Diagnóstico)

Após auditoria na planilha original (`dealer-txt-layout-diagnosis.md`):

1. O rótulo "TEM QUE SER 152" na planilha é um resíduo obsoleto. A soma matemática dos tamanhos projetados nas colunas `N:AG` é de 453 caracteres. O maior influenciador é o campo "Complemento" (`AC`) que ocupa 250 caracteres.
2. A coluna `L` é de fato a concatenação final. O usuário a copia e cola no Bloco de Notas para salvar como `.txt`. Não há macros ocultas.
3. Existe um bug explícito nas fórmulas da planilha: nos blocos condicionais (`S, T, U, X, Y, Z`), quando a condição de Débito/Crédito não bate, a fórmula cospe `" "` (1 espaço) em vez do preenchimento posicional completo de espaços (ex: 10 espaços para centro). Isso corrompe o layout posicional gerando tamanhos flutuantes por linha (ex: 429 caracteres). O exportador oficial deve ignorar esse bug e garantir alinhamento estrito através do uso de `padRight('', size)`.

## Critérios de aceite do exportador

- O exportador deve ter teste automatizado com um caso esperado do layout
  oficial.
- O teste deve cobrir conta iniciada por `1` ou `2` sem centro.
- O teste deve cobrir conta iniciada por `3` em diante com centro.
- O teste deve cobrir tipo de lote `FP`.
- O teste deve cobrir historico `FOLHA DE PAGAMENTO REF MM/AAAA`.
- O exportador TXT deve falhar com `DEALER_LAYOUT_AMBIGUOUS` enquanto as
  ambiguidades acima nao forem resolvidas.
