# Habilitar Braga Motos no Rayo Dealer

## Contexto

A Braga Veículos já está 100% operacional. Este plano replicou a estrutura para a **Braga Motos (Yamaha)**, empresa distinta no Fortes com CNPJ, centros de resultado e **tabela de eventos próprios**.

Fontes usadas: `Mapeamento_CC_Provisao_x_Dealer_BRAGA_MOTOS.xlsx` (abas `Mapeamento` e `Dealer_CC`), a foto `temp/braga/lotacao braga motos.jpeg` e o banco do Fortes (`AC`, empresa `9277`).

---

## Dados confirmados

| Item | Valor | Fonte |
|---|---|---|
| `fortesCompanyCode` | **9277** (`BRAGA MOTOS LTDA`) | tabela `EMP` |
| CNPJ | **05.216.530/0001-95** | `EMP.CNPJBase` + `EST.SeqCNPJ` (confere com o xlsx) |
| Estabelecimentos | **um só** (`0001`, matriz) | tabela `EST` |
| RAT / FAP | RAT **3%** × FAP **0,50** = **GILRAT 1,5%** | `ES_CS_CP_Aliquotas_EST`, 202604–202608 |
| Terceiros | **5,8%** — FPAS `515` / cód. `0115`, iguais aos da Braga Veículos | `EST.FPAS`, `EST.CodigoTerceiros` |
| Plano de contas Dealer | **o mesmo da Braga Veículos** | o xlsx só traz centros de custo |
| Eventos da folha | **próprios da Braga Motos** (84 com movimento em 2026) | tabela `EVE` da empresa 9277 |
| Centros de custo | 74 lotações Fortes → 59 centros Dealer | xlsx + tabela `LOT` |

> [!IMPORTANT]
> **Os códigos de evento significam coisas diferentes nas duas empresas.**
> `093` é "Desc. Assist. Médica Amil" (crédito) na Braga Veículos e "Comissão
> Liberacred" (débito) na Braga Motos — o mesmo vale para `101`, `102`, `975`,
> `977`, `978`, `979` e `989`. Herdar o de-para contábil da Braga Veículos
> desbalanceava o lote em **R$ 98.912,12** em 08/2026. Por isso o de-para de
> contas foi reconstruído a partir da tabela `EVE` da 9277, reaproveitando
> apenas o **plano de contas** (que é comum) e os **eventos sintéticos** do
> motor (`LIQUIDO_FOLHA`, `PROV_*`, `ENCARGO_*`).

### Alíquotas — Braga Motos × Braga Veículos

| | Braga Veículos | Braga Motos |
|---|---|---|
| INSS empresa | 20,0% | 20,0% |
| GILRAT | 1,0% (EST 0001) / 2,0% (EST 0002) | **1,5%** (EST 0001, único) |
| Terceiros | 5,8% | 5,8% |
| FGTS | 8,0% | 8,0% |

---

## Pendente de confirmação com o cliente

| Item | Situação |
|---|---|
| 29 lotações fora do xlsx (`039`, `046`–`073`, `999`) | Mapeadas pelas mesmas regras do xlsx (localidade > marca > função), marcadas `INFERIDO — confirmar` no config. |
| 9 lotações que o próprio xlsx marcou `[SEM CORRESPONDÊNCIA]` | Mantido o destino sugerido pelo xlsx, marcado `xlsx: SEM CORRESPONDÊNCIA — confirmar`. |
| Eventos sem equivalente na Braga Veículos (`121`, `300`, `979`) | Conta atribuída por analogia, marcada `confirmar` no config. |
| Santa Etelvina | A foto anota `001000`, o cadastro Dealer do xlsx tem `DPTO. SANTA ETELVINA = 001900`. Adotado **001900**. |

Todos esses itens são editáveis pelo contador na aba **Cadastros** sem mexer no código.

---

## Mudanças entregues

### 1. [NEW] `apps/rayo/src/lib/folha-dealer/braga-motos.config.js`

- `company` — `companyId: 'braga-motos'`, CNPJ, `fortesCompanyCode: '9277'`.
- `centerMappings` — 147 entradas: cada lotação pelo **nome real** (`LOT.Nome`, que é a chave usada pelo extractor, inclusive nas variantes com espaço final) e pelo **código** (`LOT.Codigo`) como fallback, mais a lotação vazia.
- `dealerCenters` — catálogo completo dos 59 centros de resultado do Dealer.
- `accountMappings` — 97 entradas: os **76 eventos próprios** da Braga Motos (84 da `EVE` menos os 8 informativos) + 21 dos eventos sintéticos do motor.
- `encargoRates` / `provisionRates` — com o GILRAT de 1,5%.

### 2. [NEW] `apps/rayo/src/lib/folha-dealer/company-configs.js`

Registro das empresas: resolve config por `companyId` e por `fortesCompanyCode`, e alimenta o seletor da tela. Empresa sem config agora **falha explicitamente** em vez de cair na Braga Veículos.

### 3. [NEW] `apps/rayo-server/folha-dealer-centers-seed-braga-motos.json`

59 centros + 147 de-paras, gerado a partir do config.

### 4. [MODIFY] `apps/rayo-server/folha-dealer-centers-store.js`

Braga Motos no mapa `SEED_FILES`; removido o fallback que fazia uma empresa desconhecida ser semeada com o de-para da Braga Veículos.

### 5. [MODIFY] `apps/rayo/src/lib/folha-dealer/index.js`

Re-exporta `bragaMotosConfig` e o registro de empresas.

### 6. [MODIFY] hooks e tela

- `useFolhaDealer.js` — deixa de fixar `braga-veiculos`; resolve o config pelo código Fortes escolhido.
- `useFolhaDealerCenters.js` — o seed passa a vir da empresa recebida por argumento.
- `FolhaDealerPage.jsx` — seletor de empresa; ao trocar, o de-para, a aba Cadastros e os campos Empresa/Filial Dealer acompanham.

### 7. [NEW] `apps/rayo/tests/folha-dealer-braga-motos-config.test.js`

13 testes: integridade do de-para de centros, unicidade evento+D/C, conta obrigatória do evento 100, resolução por empresa e — principalmente — a regressão que impede voltar a herdar os eventos numéricos da Braga Veículos.

---

## Verificação executada

**Automática**

```bash
cd apps/rayo && npx vitest run   # 171 passando (as 6 falhas são anteriores: layout TXT 453/483 e regressão ICMS JR)
cd apps/rayo && npx vite build   # ✓ built
cd apps/rayo && npx eslint src/  # limpo
```

**Contra o banco real (empresa 9277, competências 04/2026 a 08/2026)**

| Competência | Linhas folha | Lotações sem de-para | Eventos sem conta | Status | Débitos = Créditos |
|---|---|---|---|---|---|
| 2026-04 | 2.337 | 0 | 0 | `ready` | R$ 770.949,07 ✓ |
| 2026-05 | 2.611 | 0 | 0 | `ready` | R$ 840.933,34 ✓ |
| 2026-06 | 2.318 | 0 | 0 | `ready` | R$ 762.956,26 ✓ |
| 2026-07 | 2.189 | 0 | 0 | `ready` | R$ 800.266,58 ✓ |
| 2026-08 | 2.512 | 0 | 0 | `ready` | R$ 827.093,40 ✓ |

Export do TXT (08/2026): **1.970 linhas**, todas com 483 caracteres, nenhuma reprovada por `validateDealerTxtLine483`, sem `undefined`/`null`/`Invalid Date`.

**Manual — falta fazer**

1. ~~Confirmar Empresa/Filial Dealer da Braga Motos~~ — confirmado: `07`/`007` (era `01`/`001`, os mesmos da Braga Veículos, e teria lançado o lote na empresa errada no Dealer). Falta importar o TXT no Dealer pra validar.
2. Revisar com o cliente as lotações marcadas `INFERIDO — confirmar` e `SEM CORRESPONDÊNCIA`.
3. Conferir o lote de uma competência com o relatório de provisão do RH (04, 05 e 06/2026 têm PRD/PRF no Fortes; 07 e 08 caem no fallback sintético e o motor avisa).
