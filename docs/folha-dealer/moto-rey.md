# Moto Rey — Folha Dealer

Empresa habilitada no Folha Dealer com a mesma estrutura da Braga Motos. Config em `apps/rayo/src/lib/folha-dealer/moto-rey.config.js`; seed de centros em `apps/rayo-server/folha-dealer-centers-seed-moto-rey.json`. Pesquisa feita em 28/09/2026 no banco do Fortes (empresa `9275`).

## Dados da empresa

| Item | Valor | Fonte |
|---|---|---|
| Código Fortes | **9275** (`MOTO REY` / razão social `BRAGA MOTO REY LTDA`) | tabela `EMP` |
| CNPJ | **49.384.500/0001-63** | `EMP.CNPJBase` 49384500 + `EST.SeqCNPJ` 0001; DV da planilha de razão de estoque |
| Estabelecimentos | um só (`0001`) | tabela `EST` |
| RAT / FAP | RAT **3%** × FAP **1,00** = **GILRAT 3%** (04–08/2026) | `ES_CS_CP_Aliquotas_EST` |
| Terceiros | **5,8%** — FPAS `515` / cód. `0115`, iguais aos da BV/BM | `EST.FPAS`, `EST.CodigoTerceiros` |
| Empresa / filial Dealer | **06 / 006** | informado pelo usuário |
| Folha mensal | de **03/2026** em diante (10–13 empregados) | `FOL.Folha = 2` + `FPG` |
| Bases eSocial | a partir de **04/2026** → 03/2026 usa encargo sintético (aviso) | `ES_CS_CP_Base`, `ES_FGTS_SEGURADO` |
| Provisões Fortes (PRV/PRD/PRF) | **01 a 07/2026**; 08/2026 ainda não calculada → provisão sintética (aviso) | `PRV` |
| Tipos de folha com valor em 2026 | 2 (mensal), 4 (férias), 8 (13º rescisório — **não entra**), 10 (rescisão), **11 (rescisão complementar)**, 14/15 (provisões) | `FOL.Folha` |
| Braga Acessórios | já está dentro da Braga Motos (usuário, 28/09) — **fora deste plano** | — |

### Folha 11 — rescisão complementar

Só a Moto Rey tem (BV e BM não têm nenhuma). Uma folha em 2026: 12/05/2026, 1 empregado, sem `FOL_Seq_Pai`, eventos de rescisão (955 banco de horas, 049 DSR sobre o banco de horas, 502 INSS, 900 multa FGTS, bases 604/613). Os valores **não repetem** os da Folha 10 do empregado — é complemento. O plano a trata como **RESCISAO** (competência por `FOL.DtCalculo`). Confirmar com o contador se o Resumo Geral dele a mostra dentro de "Rescisão" (item P4).

## Lotações e centros do Dealer

| Cód. | `LOT.Nome` | Uso na folha mensal 2026 | Centro Dealer proposto |
|---|---|---|---|
| 001 | `DPT POS VENDAS MECANICA ROYAL ENFIELD` | 03–08 (6–8 empr.) | `004100` OFC MOTO REY |
| 002 | `DPTO DE VENDAS` | 03–08 (4–5 empr.) | `001118` VENDAS MOTO REY |
| 003 | `DEPARTAMENTO CRM` | 06–08 (1–2 empr.) | `001118` VENDAS MOTO REY — **confirmar (P1)** |
| 004 | `BRAGA MOTO REY DEPTO MECANICA` | 06–08 (1 empr.) | `004100` OFC MOTO REY |
| 005 | `DPT POS VENDAS PEÇAS` | 08 (1 empr.) | `003400` PECAS MOTO REY |
| 006 | `DEPARTAMENTO PRACA 14` | — | `004100` OFC MOTO REY — **confirmar (P1)** |
| 999 | `GERAL` | — (cadastro inicial) | `000600` ADMINISTRAÇÃO — **confirmar (P1)** |
| (vazia) | `''` | — | `000600` ADMINISTRAÇÃO — **confirmar (P1)** |

Os centros `001118`, `003400` e `004100` estão no catálogo de centros do Dealer (aba `Dealer_CC`, linhas 40–42: VENDAS / PECAS / OFC MOTO REY).

## Pendências com o contador

Tudo abaixo fica editável na aba **Cadastros** da tela, sem mexer no código.

| # | Item | Valor usado no plano |
|---|---|---|
| P1 | Centros de `DEPARTAMENTO CRM`, `DEPARTAMENTO PRACA 14`, `GERAL` e lotação vazia; se o Dealer da empresa 06 tem o centro `000600` | conforme a tabela de lotações |
| P2 | Eventos mapeados por analogia: `049` DSR (BM usa 6.1.1.01.002, BV usa 6.1.1.01.005), `202` Dispensa Próxima à Data-Base, `216` Prêmio Meta CCT, `976` Prêmios Meritocracia, `024` Vale Refeição/Alimentação, `969` Compra Ticket Plus | ver Task 2 |
| P3 | Plano de contas da Moto Rey no Dealer é o mesmo do grupo (o da BV/BM) | assumido |
| P4 | Resumo Geral do Fortes mostra a Folha 11 dentro de "Rescisão"? | tratada como RESCISAO |
| P5 | Históricos no TXT (`FERIAS REF`, `RESCISAO REF`, `FOLHA COMPLEMENTAR REF`) — ainda não confirmados também para BV/BM | iguais aos da BV/BM |

## Diferenças em relação à Braga Motos

- GILRAT 3% (RAT 3% × FAP 1,00), contra 1,5% na Braga Motos.
- Folha mensal a partir de 03/2026; bases eSocial a partir de 04/2026 (03/2026 usa encargo sintético).
- Rescisão complementar (Fortes Folha 11) — só a Moto Rey tem em 2026; entra como rescisão.
- Eventos 953–979, 024, 327, 954, 959, 960, 969, 970 têm significado próprio: de-para não herda BV/BM.
