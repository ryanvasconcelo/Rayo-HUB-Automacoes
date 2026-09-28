# Moto Rey no Folha Dealer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar a Moto Rey no Folha Dealer com a mesma estrutura da Braga Motos: folha mensal, férias, rescisão (inclusive a rescisão complementar) e complementar, com encargos, provisões e baixa de férias, gerando o TXT na empresa 06 / filial 006 do Dealer.

**Architecture:** Um config próprio (`moto-rey.config.js`) com o de-para de centros e de eventos **da própria Moto Rey** (os códigos de evento têm outro significado na BV e na BM), herdando da Braga Veículos só os eventos sintéticos (`LIQUIDO_*`, `PROV_*`, `PROV_BAIXA_*`, `ENCARGO_*`) e os informativos. O registro de empresas, a seed do servidor e a tela já são dirigidos por dados: basta registrar. O extractor passa a ler a Folha 11 (rescisão complementar), que só a Moto Rey tem.

**Tech Stack:** Node (CJS no `apps/rayo-server`, ESM no `apps/rayo`), mssql, React 19, Vitest 4.

**Spec:** Não há documento de spec. Fontes: banco do Fortes (empresa `9275`, pesquisado em 28/09/2026), o catálogo de centros do Dealer em `Mapeamento_CC_Provisao_x_Dealer_BRAGA_MOTOS.xlsx` (aba `Dealer_CC`, na raiz do repositório, fora do git), a planilha `docs/stock/temp/exemplos/RAZAO ESTOQUE MOTO REY 2025.xlsx` (CNPJ completo) e as decisões do contador já aplicadas à Braga Motos (`docs/folha-dealer/business-rules.md`). Valores de referência da folha: `novos/moto-rey-referencia-fortes.md` (fora do git).

---

## Dados da empresa (pesquisados em 28/09/2026)

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

Só a Moto Rey tem (BV e BM não têm nenhuma). Uma folha em 2026: 12/05/2026, 1 empregado, sem `FOL_Seq_Pai`, eventos de rescisão (955 banco de horas, 502 INSS, 900 multa FGTS, bases 604/613). Os valores **não repetem** os da Folha 10 do empregado — é complemento (valores em `novos/moto-rey-referencia-fortes.md`). O plano a trata como **RESCISAO** (competência por `FOL.DtCalculo`). Confirmar com o contador se o Resumo Geral dele a mostra dentro de "Rescisão" (item P4).

### Lotações e centros do Dealer

Lotações da Moto Rey (`LOT`, nomes exatos, sem espaço final) e o que a folha usa em 2026:

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

### Eventos com movimento em 2026 (tipos 2, 4, 10, 11, 17)

62 eventos: 28 proventos, 23 descontos, 11 informativos (`600`–`605`, `610`, `613`, `900`, `902`, `904`). **Cerca de 20 códigos têm significado diferente na BV e/ou na BM** (ex.: `953` é "Comissão s/ peças" na Moto Rey e "Ifood não utilizado" na BV; `977` é "Prêmio Emplacamento" na Moto Rey e "Consignado" na BM). Por isso o de-para é próprio e **não herda eventos numéricos** de nenhuma das duas. Contas propostas na Task 2; as marcadas `confirmar` vão para o contador (P2).

---

## Pendências com o contador (não bloqueiam a implementação)

Tudo abaixo fica editável na aba **Cadastros** da tela, sem mexer no código.

| # | Item | Valor usado no plano |
|---|---|---|
| P1 | Centros de `DEPARTAMENTO CRM`, `DEPARTAMENTO PRACA 14`, `GERAL` e lotação vazia; se o Dealer da empresa 06 tem o centro `000600` | conforme a tabela de lotações |
| P2 | Eventos mapeados por analogia: `049` DSR (BM usa 6.1.1.01.002, BV usa 6.1.1.01.005), `202` Dispensa Próxima à Data-Base, `216` Prêmio Meta CCT, `976` Prêmios Meritocracia, `024` Vale Refeição/Alimentação, `969` Compra Ticket Plus | ver Task 2 |
| P3 | Plano de contas da Moto Rey no Dealer é o mesmo do grupo (o da BV/BM) | assumido |
| P4 | Resumo Geral do Fortes mostra a Folha 11 dentro de "Rescisão"? | tratada como RESCISAO |
| P5 | Históricos no TXT (`FERIAS REF`, `RESCISAO REF`, `FOLHA COMPLEMENTAR REF`) — ainda não confirmados também para BV/BM | iguais aos da BV/BM |

---

## Global Constraints

- **Repositório público** (`ryanvasconcelo/Rayo-HUB-Automacoes`): nunca commitar valores de folha, relatórios, prints ou planilhas de cliente. `novos/` está no `.gitignore`. Valores de referência ficam em `novos/moto-rey-referencia-fortes.md`.
- Empresa/filial Dealer da Moto Rey: `dealerCompanyField: '06'`, `dealerBranch: '006'`.
- `companyId: 'moto-rey'`, `fortesCompanyCode: '9275'`, `cnpj: '49.384.500/0001-63'`.
- Evento `100` obrigatoriamente em `2.1.1.02.007` (regra global do motor, `EVENT_100_REQUIRED_ACCOUNT`).
- Não mexer no layout/data do TXT: o formato atual é o aceito pelo Dealer; as 6 falhas antigas (`folha-dealer-dealer-txt-exporter`, `folha-dealer-dealer-txt-layout`, `jr-regression`) são testes desatualizados, fora deste plano.
- Trabalhar numa branch nova a partir da `main`: `feat/folha-dealer-moto-rey`. No primeiro commit, incluir este plano.
- Todo commit termina com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Testes do front: `cd apps/rayo && npx vitest run <arquivo>`.

## Review Focus

- Mesmo código de evento com significado diferente entre empresas (`953`–`979`, `024`, `327`…): a Moto Rey segue a natureza da própria tabela `EVE` da 9275, nunca a da BV/BM. → Task 2 (teste `naturezaMotoRey`).
- Empregado com Folha 10 e Folha 11 no mesmo mês: os dois entram no líquido de rescisão, sem duplicar. → Task 1 e Task 4 (reconciliação de 05/2026).
- Lotação `GERAL` ou vazia em provisões/encargos (bases eSocial de quem não está na folha do mês): tem que resolver centro, não bloquear. → Task 2 (de-para) e Task 4 (reconciliação sem `MISSING_CENTER_MAPPING`).
- Mês sem provisão no Fortes (08/2026): provisão sintética com aviso, sem baixa inventada. → Task 4.
- Mês sem bases eSocial (03/2026): encargo sintético com aviso. → Task 4.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/rayo-server/fortes-extra-payroll-queries.js` (modify) | Rescisão lê Folhas 10 e 11 |
| `apps/rayo/src/lib/folha-dealer/moto-rey.config.js` (create) | Empresa, centros, eventos, alíquotas da Moto Rey |
| `apps/rayo/tests/folha-dealer-moto-rey-config.test.js` (create) | Integridade do config e do registro |
| `apps/rayo/src/lib/folha-dealer/company-configs.js` (modify) | Registrar a Moto Rey |
| `apps/rayo/src/lib/folha-dealer/index.js` (modify) | Re-exportar `motoReyConfig` |
| `apps/rayo-server/folha-dealer-centers-seed-moto-rey.json` (create) | Seed de centros/lotações do servidor |
| `apps/rayo-server/folha-dealer-centers-store.js` (modify) | Seed da Moto Rey no `SEED_FILES` |
| `apps/rayo/tests/folha-dealer-braga-motos-config.test.js` (modify) | Seletor com três empresas |
| `apps/rayo/tests/folha-dealer-extra-payroll-queries.test.js` (modify) | Folha 11 na rescisão |
| `apps/rayo/tests/folha-dealer-contador-resumo-geral.test.js` (modify) | Teste ao vivo da provisão para a Moto Rey |
| `docs/folha-dealer/moto-rey.md` (create) | Dados, fontes e pendências da Moto Rey |
| `docs/folha-dealer/business-rules.md` (modify) | Folha 11 na rescisão |

---

### Task 1: Rescisão complementar (Folha 11) na query de rescisão

**Files:**
- Modify: `apps/rayo-server/fortes-extra-payroll-queries.js`
- Test: `apps/rayo/tests/folha-dealer-extra-payroll-queries.test.js`

**Interfaces:**
- Produces: `EXTRA_PAYROLL_TYPES[i].folhas: number[]` (substitui `folha: number`); a SQL usa `FOL.Folha IN (<folhas>)`. RESCISAO = `[10, 11]`, FERIAS = `[4]`, COMPLEMENTAR = `[17]`.

- [ ] **Step 0: Criar a branch e versionar o plano**

```bash
git checkout main && git pull && git checkout -b feat/folha-dealer-moto-rey
```

- [ ] **Step 1: Write the failing test**

Em `apps/rayo/tests/folha-dealer-extra-payroll-queries.test.js`, trocar o import:

```js
const {
  competenceDateRange,
  EXTRA_PAYROLL_QUERIES,
} = require('../../rayo-server/fortes-extra-payroll-queries.js');
```

por:

```js
const {
  competenceDateRange,
  EXTRA_PAYROLL_QUERIES,
  EXTRA_PAYROLL_TYPES,
} = require('../../rayo-server/fortes-extra-payroll-queries.js');
```

Substituir `expect(sql).toContain('FOL.Folha = 4');` por `expect(sql).toContain('FOL.Folha IN (4)');` e `expect(sql).toContain('FOL.Folha = 17');` por `expect(sql).toContain('FOL.Folha IN (17)');`.

Substituir o teste da rescisão:

```js
  it('rescisão: Folha 10, competência pela data de cálculo', () => {
    const sql = sqlDe('RESCISAO');
    expect(sql).toContain('FOL.Folha = 10');
    expect(sql).toContain('FOL.DtCalculo >= @DataIni');
    expect(sql).not.toContain('INNER JOIN FER');
  });
```

por:

```js
  it('rescisão: Folhas 10 e 11 (rescisão complementar), competência pela data de cálculo', () => {
    const sql = sqlDe('RESCISAO');
    expect(sql).toContain('FOL.Folha IN (10, 11)');
    expect(sql).toContain('FOL.DtCalculo >= @DataIni');
    expect(sql).not.toContain('INNER JOIN FER');
  });
```

E substituir o teste do 13º rescisório:

```js
  it('nunca lê o 13º rescisório (Folha 8), que repete eventos da rescisão', () => {
    for (const { sql } of EXTRA_PAYROLL_QUERIES) {
      expect(sql).not.toContain('FOL.Folha = 8');
    }
  });
```

por:

```js
  it('nunca lê o 13º rescisório (Folha 8), que repete eventos da rescisão', () => {
    for (const { folhas } of EXTRA_PAYROLL_TYPES) {
      expect(folhas).not.toContain(8);
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-queries.test.js`
Expected: FAIL — `FOL.Folha IN (...)` ausente; `folhas` indefinido.

- [ ] **Step 3: Implement**

Em `apps/rayo-server/fortes-extra-payroll-queries.js`, substituir:

```js
const EXTRA_PAYROLL_TYPES = [
  { payrollType: 'FERIAS', folha: 4, competenceDate: 'FER.DtGozoInicial', joinFer: true, onlyRoot: true },
  { payrollType: 'RESCISAO', folha: 10, competenceDate: 'FOL.DtCalculo', joinFer: false, onlyRoot: false },
  { payrollType: 'COMPLEMENTAR', folha: 17, competenceDate: 'FOL.DtReferencia', joinFer: false, onlyRoot: false },
];
```

por:

```js
// Folha 11 = rescisão complementar (só a Moto Rey tem em 2026): complementa a
// rescisão com valores próprios, sem repetir os da Folha 10.
const EXTRA_PAYROLL_TYPES = [
  { payrollType: 'FERIAS', folhas: [4], competenceDate: 'FER.DtGozoInicial', joinFer: true, onlyRoot: true },
  { payrollType: 'RESCISAO', folhas: [10, 11], competenceDate: 'FOL.DtCalculo', joinFer: false, onlyRoot: false },
  { payrollType: 'COMPLEMENTAR', folhas: [17], competenceDate: 'FOL.DtReferencia', joinFer: false, onlyRoot: false },
];
```

Substituir `function buildExtraPayrollQuery({ payrollType, folha, competenceDate, joinFer, onlyRoot }) {` por `function buildExtraPayrollQuery({ payrollType, folhas, competenceDate, joinFer, onlyRoot }) {` e, na SQL, `  AND FOL.Folha = ${folha}` por `  AND FOL.Folha IN (${folhas.join(', ')})`.

No comentário do topo do arquivo, substituir ` * - Rescisão (FOL.Folha = 10): mês de FOL.DtCalculo. O 13º rescisório` por ` * - Rescisão (FOL.Folha 10 e 11 — a 11 é a rescisão complementar): mês de FOL.DtCalculo. O 13º rescisório`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-queries.test.js tests/folha-dealer-vite-api.test.js && cd ../.. && node -e "require('./apps/rayo-server/fortes-extractor.js'); console.log('ok')"`
Expected: PASS e `ok`.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-09-28-folha-dealer-moto-rey.md apps/rayo-server/fortes-extra-payroll-queries.js apps/rayo/tests/folha-dealer-extra-payroll-queries.test.js
git commit -m "feat(folha): rescisão complementar (Folha 11) entra como rescisão

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Config da Moto Rey

**Files:**
- Create: `apps/rayo/src/lib/folha-dealer/moto-rey.config.js`
- Test: `apps/rayo/tests/folha-dealer-moto-rey-config.test.js` (create)

**Interfaces:**
- Consumes: `bragaVeiculosConfig` (eventos sintéticos e informativos), `EVENT_100_REQUIRED_ACCOUNT` de `contracts.js`.
- Produces: `export const motoReyConfig` com `{ company, centerMappings, dealerCenters, accountMappings, informativeEventCodes, provisionRates, encargoRates }`, mesma forma de `bragaMotosConfig`.

- [ ] **Step 1: Write the failing test**

Criar `apps/rayo/tests/folha-dealer-moto-rey-config.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { motoReyConfig } from '../src/lib/folha-dealer/moto-rey.config.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import { bragaMotosConfig } from '../src/lib/folha-dealer/braga-motos.config.js';
import { EVENT_100_REQUIRED_ACCOUNT } from '../src/lib/folha-dealer/contracts.js';

// Eventos com valor na Moto Rey em 2026 (Folhas 2, 4, 10, 11, 17), levantamento
// de 28/09/2026. P = provento (debita), D = desconto (credita).
const OBSERVADOS = {
  P: ['010', '011', '030', '049', '075', '090', '100', '110', '111', '199', '200', '201', '202', '205', '206',
    '208', '209', '212', '216', '953', '955', '957', '964', '965', '976', '977', '978', '979'],
  D: ['024', '127', '300', '301', '310', '311', '320', '321', '327', '349', '390', '500', '502', '504', '947',
    '954', '959', '960', '969', '970', '971', '974', '975'],
};
const INFORMATIVOS = ['600', '601', '602', '603', '604', '605', '610', '613', '902', '904'];

const dcs = (code) => motoReyConfig.accountMappings.filter((m) => m.eventCode === code).map((m) => m.dc).sort();
const conta = (code, dc) =>
  motoReyConfig.accountMappings.find((m) => m.eventCode === code && m.dc === dc)?.dealerAccountCode;

describe('motoReyConfig — empresa', () => {
  it('usa código, CNPJ e empresa/filial Dealer da Moto Rey', () => {
    expect(motoReyConfig.company).toMatchObject({
      companyId: 'moto-rey',
      companyName: 'BRAGA MOTO REY LTDA',
      cnpj: '49.384.500/0001-63',
      fortesCompanyCode: '9275',
      dealerCompanyField: '06',
      dealerBranch: '006',
    });
  });

  it('não usa empresa/filial Dealer de outra empresa do grupo', () => {
    for (const outra of [bragaVeiculosConfig, bragaMotosConfig]) {
      expect(motoReyConfig.company.dealerCompanyField).not.toBe(outra.company.dealerCompanyField);
    }
  });

  it('aplica o GILRAT do estabelecimento 0001 (RAT 3% × FAP 1,00)', () => {
    expect(motoReyConfig.encargoRates.gilrat).toBe(3);
    expect(motoReyConfig.provisionRates.inssPatronal).toBeCloseTo(28.8, 5);
  });
});

describe('motoReyConfig — centros', () => {
  it('aponta só para centros do catálogo Dealer da Moto Rey', () => {
    const known = new Set(motoReyConfig.dealerCenters.map((c) => c.code));
    const unknown = motoReyConfig.centerMappings.map((m) => m.dealerCenterCode).filter((c) => !known.has(c));
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('resolve toda lotação da 9275 pelo nome, pelo código e a lotação vazia', () => {
    const lotacoes = new Set(motoReyConfig.centerMappings.map((m) => m.lotacaoCode));
    for (const l of [
      'DPT POS VENDAS MECANICA ROYAL ENFIELD', 'DPTO DE VENDAS', 'DEPARTAMENTO CRM', 'BRAGA MOTO REY DEPTO MECANICA',
      'DPT POS VENDAS PEÇAS', 'DEPARTAMENTO PRACA 14', 'GERAL',
      '001', '002', '003', '004', '005', '006', '999', '',
    ]) {
      expect(lotacoes).toContain(l);
    }
  });

  it('não repete lotação com destinos diferentes', () => {
    const byLotacao = new Map();
    for (const m of motoReyConfig.centerMappings) {
      const previous = byLotacao.get(m.lotacaoCode);
      if (previous) expect(previous).toBe(m.dealerCenterCode);
      byLotacao.set(m.lotacaoCode, m.dealerCenterCode);
    }
  });
});

describe('motoReyConfig — contas', () => {
  it('todo provento observado debita e todo desconto observado credita', () => {
    const errados = [
      ...OBSERVADOS.P.filter((c) => dcs(c).join() !== 'D').map((c) => `${c}:${dcs(c)}`),
      ...OBSERVADOS.D.filter((c) => dcs(c).join() !== 'C').map((c) => `${c}:${dcs(c)}`),
    ];
    expect(errados).toEqual([]);
  });

  it('segue a natureza da própria tabela EVE da 9275, não a da BV/BM', () => {
    // Na BV/BM estes códigos são consignado, Ifood, VT etc. (natureza oposta ou outra conta).
    const naturezaMotoRey = {
      '953': ['D', '6.1.1.01.005'], '955': ['D', '6.1.1.01.006'], '957': ['D', '6.1.1.01.005'],
      '964': ['D', '6.1.1.01.005'], '965': ['D', '6.1.1.01.005'], '976': ['D', '6.1.1.01.003'],
      '977': ['D', '6.1.1.01.003'], '978': ['D', '6.1.1.01.003'], '979': ['D', '6.1.1.01.005'],
      '954': ['C', '6.1.1.01.006'], '971': ['C', '6.1.1.04.003'], '975': ['C', '6.1.1.01.002'],
    };
    for (const [code, [dc, account]] of Object.entries(naturezaMotoRey)) {
      expect([code, dcs(code), conta(code, dc)]).toEqual([code, [dc], account]);
    }
  });

  it('aplica as decisões do contador do grupo (férias, 13º, aviso, 100/301, multa)', () => {
    for (const c of ['110', '111', '205', '206', '212']) expect(conta(c, 'D')).toBe('6.1.1.03.001');
    for (const c of ['208', '209']) expect(conta(c, 'D')).toBe('6.1.1.03.002');
    for (const c of ['200', '201']) expect(conta(c, 'D')).toBe('6.1.1.01.004');
    expect(conta('100', 'D')).toBe(EVENT_100_REQUIRED_ACCOUNT);
    expect(conta('301', 'C')).toBe('2.1.1.02.007');
    expect(dcs('900')).toEqual(['C', 'D']);
    expect(conta('900', 'D')).toBe('6.1.1.02.002');
    expect(conta('900', 'C')).toBe('2.1.1.02.002');
  });

  it('informativos não geram lançamento; multa FGTS (900) não é informativa', () => {
    for (const c of INFORMATIVOS) expect(motoReyConfig.informativeEventCodes).toContain(c);
    expect(motoReyConfig.informativeEventCodes).not.toContain('900');
  });

  it('herda da BV só os eventos sintéticos (líquidos, provisões, baixas, encargos)', () => {
    const codes = new Set(motoReyConfig.accountMappings.map((m) => m.eventCode));
    for (const c of ['LIQUIDO_FOLHA', 'LIQUIDO_FERIAS', 'LIQUIDO_RESCISAO', 'LIQUIDO_COMPLEMENTAR',
      'PROV_FERIAS', 'PROV_BAIXA_FERIAS', 'ENCARGO_INSS_PATRONAL', 'ENCARGO_FGTS_FOLHA']) {
      expect(codes).toContain(c);
    }
  });

  it('não repete o par evento + D/C e marca tudo com o companyId da Moto Rey', () => {
    const keys = motoReyConfig.accountMappings.map((m) => `${m.eventCode}:${m.dc}`);
    expect(keys.length).toBe(new Set(keys).size);
    for (const m of motoReyConfig.accountMappings) expect(m.companyId).toBe('moto-rey');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-moto-rey-config.test.js`
Expected: FAIL — módulo `moto-rey.config.js` inexistente.

- [ ] **Step 3: Implement**

Criar `apps/rayo/src/lib/folha-dealer/moto-rey.config.js`:

```js
/**
 * moto-rey.config.js — Configuração de de-para Moto Rey (Royal Enfield).
 *
 * Fontes (pesquisa de 28/09/2026):
 * - Empresa/CNPJ/RAT-FAP: banco Fortes (EMP/EST/ES_CS_CP_Aliquotas_EST), empresa 9275.
 *   CNPJ completo da planilha "RAZAO ESTOQUE MOTO REY 2025.xlsx".
 * - Empresa/filial Dealer 06/006: informado pelo usuário.
 * - Centros: catálogo Dealer (Mapeamento_CC_Provisao_x_Dealer_BRAGA_MOTOS.xlsx,
 *   aba Dealer_CC: VENDAS/PECAS/OFC MOTO REY). CRM, Praça 14, GERAL e lotação
 *   vazia marcados "confirmar".
 * - Eventos: tabela EVE da 9275. Vários códigos têm outro significado na BV e na
 *   BM (953–979, 024, 327…): o de-para é próprio e não herda eventos numéricos.
 *   Contas por analogia com eventos de mesmo nome na BM/BV; os sem equivalente
 *   direto estão marcados "confirmar".
 * - Plano de contas: o mesmo do grupo (BV/BM).
 */

import { bragaVeiculosConfig } from './braga-veiculos.config.js';

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

const company = {
  companyId: 'moto-rey',
  companyName: 'BRAGA MOTO REY LTDA',
  cnpj: '49.384.500/0001-63',
  fortesCompanyCode: '9275',
  dealerCompanyField: '06',
  dealerBranch: '006',
};

// ---------------------------------------------------------------------------
// Centros do Dealer usados pela Moto Rey
// ---------------------------------------------------------------------------

const dealerCenters = [
  { code: '001118', name: 'VENDAS MOTO REY', active: true },
  { code: '003400', name: 'PECAS MOTO REY', active: true },
  { code: '004100', name: 'OFC MOTO REY', active: true },
  { code: '000600', name: 'ADMINISTRAÇÃO', active: true }, // confirmar se existe na empresa 06
];

const centro = (code) => dealerCenters.find((c) => c.code === code);
const lotacao = (lotacaoCode, code) => ({
  companyId: company.companyId,
  lotacaoCode,
  dealerCenterCode: code,
  dealerCenterName: centro(code).name,
  allocationMode: 'direct',
  active: true,
});

// ---------------------------------------------------------------------------
// De-para de centros — lotação Fortes (LOT.Nome e LOT.Codigo) → centro Dealer
// ---------------------------------------------------------------------------

const centerMappings = [
  lotacao('DPT POS VENDAS MECANICA ROYAL ENFIELD', '004100'),
  lotacao('001', '004100'),
  lotacao('DPTO DE VENDAS', '001118'),
  lotacao('002', '001118'),
  lotacao('DEPARTAMENTO CRM', '001118'), // confirmar
  lotacao('003', '001118'), // confirmar
  lotacao('BRAGA MOTO REY DEPTO MECANICA', '004100'),
  lotacao('004', '004100'),
  lotacao('DPT POS VENDAS PEÇAS', '003400'),
  lotacao('005', '003400'),
  lotacao('DEPARTAMENTO PRACA 14', '004100'), // confirmar
  lotacao('006', '004100'), // confirmar
  lotacao('GERAL', '000600'), // confirmar
  lotacao('999', '000600'), // confirmar
  lotacao('', '000600'), // confirmar — lotação vazia (bases eSocial sem empregado na folha)
];

// ---------------------------------------------------------------------------
// De-para de contas — eventos da 9275
// ---------------------------------------------------------------------------

const eventAccountMappings = [
  // ---- PROVENTOS (débito) ----
  { eventCode: '010', dealerAccountCode: '2.1.1.02.001', dc: 'D', description: 'Salário-Família' }, // compensa com INSS a recolher
  { eventCode: '011', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Salário-Base' },
  { eventCode: '030', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissões' },
  { eventCode: '049', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Descanso Semanal Remunerado' }, // confirmar (BV usa 6.1.1.01.005)
  { eventCode: '075', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Quebra de Caixa' },
  { eventCode: '090', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Líquido Negativo' },
  { eventCode: '100', dealerAccountCode: '2.1.1.02.007', dc: 'D', description: 'Provisão Cred. Trab. - Provento' }, // conta exigida pelo motor
  { eventCode: '216', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Meta CCT' }, // confirmar (analogia BV 956)
  { eventCode: '953', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão s/ peças' },
  { eventCode: '955', dealerAccountCode: '6.1.1.01.006', dc: 'D', description: 'Crédito banco de horas' },
  { eventCode: '957', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão s/ vendas' },
  { eventCode: '964', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Mecânico' },
  { eventCode: '965', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Venda de Moto' },
  { eventCode: '976', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmios Meritocracia' }, // confirmar
  { eventCode: '977', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Emplacamento' },
  { eventCode: '978', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Performance' },
  { eventCode: '979', dealerAccountCode: '6.1.1.01.005', dc: 'D', description: 'Comissão Consórcio' },

  // ---- FÉRIAS (folha de férias, Fortes Folha 4) — decisões do contador ----
  { eventCode: '110', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: 'Remuneração de Férias' },
  { eventCode: '111', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: '1/3 de Férias' },
  { eventCode: '301', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Provisão Cred. Trab. - Desconto (crédito do trabalhador / consignado)' },

  // ---- RESCISÃO (Fortes Folhas 10 e 11) ----
  { eventCode: '199', dealerAccountCode: '6.1.1.01.002', dc: 'D', description: 'Saldo de Salário' },
  { eventCode: '200', dealerAccountCode: '6.1.1.01.004', dc: 'D', description: 'Aviso Prévio Indenizado' },
  { eventCode: '201', dealerAccountCode: '6.1.1.01.004', dc: 'D', description: 'Rescisão Antes do Prazo Determinado' },
  { eventCode: '202', dealerAccountCode: '6.1.1.01.004', dc: 'D', description: 'Dispensa Próxima à Data-Base' }, // confirmar
  { eventCode: '205', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: 'Férias Proporcionais' },
  { eventCode: '206', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: 'Férias (Aviso Prévio)' },
  { eventCode: '212', dealerAccountCode: '6.1.1.03.001', dc: 'D', description: '1/3 de Férias Proporcionais' },
  { eventCode: '208', dealerAccountCode: '6.1.1.03.002', dc: 'D', description: '13º Salário (Rescisão)' },
  { eventCode: '209', dealerAccountCode: '6.1.1.03.002', dc: 'D', description: '13º Salário (Aviso Prévio)' },
  { eventCode: '300', dealerAccountCode: '2.1.1.01.001', dc: 'C', description: 'Adiantamento Compensação' },
  { eventCode: '500', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Aviso Prévio (desconto)' },
  { eventCode: '502', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS (Rescisão)' },
  { eventCode: '504', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS 13º Salário' },
  { eventCode: '969', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Compra Ticket Plus' }, // confirmar
  { eventCode: '970', dealerAccountCode: '6.1.1.04.006', dc: 'C', description: 'Vale-Transporte não utilizado' },
  { eventCode: '971', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Vale-Refeição não utilizado' },
  // Multa de 40% do FGTS: custo da empresa, pago em guia própria; não entra no líquido.
  { eventCode: '900', dealerAccountCode: '6.1.1.02.002', dc: 'D', description: 'Multa 40% FGTS (rescisão)' },
  { eventCode: '900', dealerAccountCode: '2.1.1.02.002', dc: 'C', description: 'FGTS a Recolher (multa 40% rescisão)' },

  // ---- DESCONTOS (crédito) ----
  { eventCode: '024', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Vale Refeição / Alimentação' }, // confirmar
  { eventCode: '127', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '310', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS' },
  { eventCode: '311', dealerAccountCode: '2.1.3.02.001', dc: 'C', description: 'IRRF' },
  { eventCode: '320', dealerAccountCode: '6.1.1.04.006', dc: 'C', description: 'Vale-Transporte' },
  { eventCode: '321', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Falta' },
  { eventCode: '327', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Atrasos' },
  { eventCode: '349', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'DSR Desconto' },
  { eventCode: '390', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Líquido Negativo Compensação' },
  { eventCode: '947', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Desconto Refeição' },
  { eventCode: '954', dealerAccountCode: '6.1.1.01.006', dc: 'C', description: 'Débito de banco de horas' },
  { eventCode: '959', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '960', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '974', dealerAccountCode: '2.1.1.02.007', dc: 'C', description: 'Consignado Crédito Trabalhador' },
  { eventCode: '975', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Débito de Crachá' },
];

/**
 * Eventos sintéticos do motor (LIQUIDO_*, PROV_*, PROV_BAIXA_*, ENCARGO_*) não
 * vêm da tabela EVE: usam as mesmas contas em todas as empresas do grupo.
 */
const syntheticAccountMappings = bragaVeiculosConfig.accountMappings.filter(
  (m) => !/^\d+$/.test(m.eventCode)
);

const accountMappings = [
  ...eventAccountMappings.map((m) => ({
    companyId: company.companyId,
    dealerLotAccountCode: null,
    active: true,
    ...m,
  })),
  ...syntheticAccountMappings.map((m) => ({ ...m, companyId: company.companyId })),
];

// ---------------------------------------------------------------------------
// Alíquotas Moto Rey (encargos + provisões)
// ---------------------------------------------------------------------------

// Estabelecimento único (0001): RAT 3% × FAP 1,00 = GILRAT 3% (ES_CS_CP_Aliquotas_EST 04–08/2026).
// FPAS 515 / Cód. Terceiros 0115 — Terceiros 5,8%. No extract o GILRAT vem por
// estabelecimento e o FGTS de VALORDEPO; aqui é fallback.
const encargoRates = {
  inssEmpresa: 20.0, // 1138-01
  gilrat: 3.0, // 1646-01 (EST 0001: RAT 3% × FAP 1,00)
  terceiros: 5.8, // 1170+1176+1191+1196+1200
  fgts: 8.0, // FGTS mensal (fallback)
};

// Alíquotas de provisão (fallback sintético; extract usa PRD/PRF do Fortes)
const provisionRates = {
  feriasTerco: 11.11,
  decimoTerceiro: 8.33,
  inssPatronal: encargoRates.inssEmpresa + encargoRates.gilrat + encargoRates.terceiros,
  fgts: 8.00,
};

// ---------------------------------------------------------------------------
// Eventos informativos — mesmo conjunto da Braga Veículos
// ---------------------------------------------------------------------------

const informativeEventCodes = [...bragaVeiculosConfig.informativeEventCodes];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const motoReyConfig = Object.freeze({
  company,
  centerMappings,
  dealerCenters,
  accountMappings,
  informativeEventCodes,
  provisionRates,
  encargoRates,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-moto-rey-config.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/rayo/src/lib/folha-dealer/moto-rey.config.js apps/rayo/tests/folha-dealer-moto-rey-config.test.js
git commit -m "feat(folha): config da Moto Rey (9275, Dealer 06/006)

De-para de eventos próprio: vários códigos têm outro significado na BV
e na BM. Centros VENDAS/PECAS/OFC MOTO REY; itens por analogia marcados
para confirmar com o contador.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Registrar a Moto Rey (registro, seed do servidor, tela)

**Files:**
- Modify: `apps/rayo/src/lib/folha-dealer/company-configs.js`
- Modify: `apps/rayo/src/lib/folha-dealer/index.js`
- Create: `apps/rayo-server/folha-dealer-centers-seed-moto-rey.json` (gerado)
- Modify: `apps/rayo-server/folha-dealer-centers-store.js`
- Modify: `apps/rayo/tests/folha-dealer-braga-motos-config.test.js`
- Test: `apps/rayo/tests/folha-dealer-moto-rey-config.test.js` (acrescentar)

**Interfaces:**
- Consumes: `motoReyConfig` (Task 2).
- Produces: `getCompanyConfig('moto-rey')`, `getCompanyConfigByFortesCode('9275')`, `FOLHA_DEALER_COMPANIES` com três empresas; a tela (`FolhaDealerPage.jsx`) já monta o seletor a partir de `FOLHA_DEALER_COMPANIES` — não muda.

- [ ] **Step 1: Write the failing tests**

No fim de `apps/rayo/tests/folha-dealer-moto-rey-config.test.js`, acrescentar os imports no topo:

```js
import { readFileSync } from 'node:fs';
import {
  FOLHA_DEALER_COMPANIES,
  getCompanyConfig,
  getCompanyConfigByFortesCode,
} from '../src/lib/folha-dealer/company-configs.js';
```

e os testes no fim do arquivo:

```js

describe('Moto Rey no sistema', () => {
  it('registro resolve por companyId e por código Fortes', () => {
    expect(getCompanyConfig('moto-rey')).toBe(motoReyConfig);
    expect(getCompanyConfigByFortesCode('9275')).toBe(motoReyConfig);
  });

  it('aparece no seletor da tela com empresa/filial Dealer 06/006', () => {
    expect(FOLHA_DEALER_COMPANIES.find((c) => c.companyId === 'moto-rey')).toEqual({
      companyId: 'moto-rey',
      companyName: 'BRAGA MOTO REY LTDA',
      fortesCompanyCode: '9275',
      dealerCompanyField: '06',
      dealerBranch: '006',
    });
  });

  it('seed do servidor reflete o catálogo de centros e o de-para do config', () => {
    const seed = JSON.parse(
      readFileSync(new URL('../../rayo-server/folha-dealer-centers-seed-moto-rey.json', import.meta.url), 'utf8')
    );
    expect(seed.companyId).toBe('moto-rey');
    expect(seed.centers).toEqual(motoReyConfig.dealerCenters);
    expect(seed.lotacaoMappings).toHaveLength(motoReyConfig.centerMappings.length);
  });
});
```

Em `apps/rayo/tests/folha-dealer-braga-motos-config.test.js`, substituir:

```js
  it('expõe as duas empresas para o seletor da tela', () => {
    expect(FOLHA_DEALER_COMPANIES.map((c) => c.companyId)).toEqual([
      'braga-veiculos',
      'braga-motos',
    ]);
  });
```

por:

```js
  it('expõe as empresas habilitadas para o seletor da tela', () => {
    expect(FOLHA_DEALER_COMPANIES.map((c) => c.companyId)).toEqual([
      'braga-veiculos',
      'braga-motos',
      'moto-rey',
    ]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-moto-rey-config.test.js tests/folha-dealer-braga-motos-config.test.js`
Expected: FAIL — empresa `moto-rey` sem configuração; seed inexistente.

- [ ] **Step 3: Implement — registro**

Em `apps/rayo/src/lib/folha-dealer/company-configs.js`, substituir:

```js
import { bragaMotosConfig } from './braga-motos.config.js';

const CONFIGS = [bragaVeiculosConfig, bragaMotosConfig];
```

por:

```js
import { bragaMotosConfig } from './braga-motos.config.js';
import { motoReyConfig } from './moto-rey.config.js';

const CONFIGS = [bragaVeiculosConfig, bragaMotosConfig, motoReyConfig];
```

Em `apps/rayo/src/lib/folha-dealer/index.js`, depois de `export { bragaMotosConfig } from './braga-motos.config.js';`, acrescentar:

```js
export { motoReyConfig } from './moto-rey.config.js';
```

- [ ] **Step 4: Implement — seed do servidor**

Gerar a seed a partir do config (na raiz do repositório):

```bash
node --input-type=module -e "
import { writeFileSync } from 'node:fs';
import { motoReyConfig } from './apps/rayo/src/lib/folha-dealer/moto-rey.config.js';
const seed = {
  companyId: 'moto-rey',
  centers: motoReyConfig.dealerCenters,
  lotacaoMappings: motoReyConfig.centerMappings.map(({ lotacaoCode, dealerCenterCode, allocationMode, active }) =>
    ({ lotacaoCode, dealerCenterCode, allocationMode, active })),
};
writeFileSync('./apps/rayo-server/folha-dealer-centers-seed-moto-rey.json', JSON.stringify(seed, null, 2) + '\n');
console.log(seed.centers.length, 'centros,', seed.lotacaoMappings.length, 'lotações');
"
```

Expected: `4 centros, 15 lotações`.

Em `apps/rayo-server/folha-dealer-centers-store.js`, substituir:

```js
  'braga-motos': path.join(__dirname, 'folha-dealer-centers-seed-braga-motos.json'),
};
```

por:

```js
  'braga-motos': path.join(__dirname, 'folha-dealer-centers-seed-braga-motos.json'),
  'moto-rey': path.join(__dirname, 'folha-dealer-centers-seed-moto-rey.json'),
};
```

- [ ] **Step 5: Run tests and build**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-moto-rey-config.test.js tests/folha-dealer-braga-motos-config.test.js tests/folha-dealer-centers-store.test.js && npx vite build 2>&1 | tail -1`
Expected: PASS; `✓ built`.

- [ ] **Step 6: Commit**

```bash
git add apps/rayo/src/lib/folha-dealer/company-configs.js apps/rayo/src/lib/folha-dealer/index.js apps/rayo-server/folha-dealer-centers-seed-moto-rey.json apps/rayo-server/folha-dealer-centers-store.js apps/rayo/tests/folha-dealer-moto-rey-config.test.js apps/rayo/tests/folha-dealer-braga-motos-config.test.js
git commit -m "feat(folha): habilitar a Moto Rey no Folha Dealer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Conferência no banco, teste ao vivo e documentação

**Files:**
- Modify: `apps/rayo/tests/folha-dealer-contador-resumo-geral.test.js`
- Create: `docs/folha-dealer/moto-rey.md`
- Modify: `docs/folha-dealer/business-rules.md`

**Interfaces:**
- Consumes: tudo das Tasks 1–3; `apps/rayo-server/scripts/reconcile-payroll-types.mjs` (já resolve a empresa por `getCompanyConfigByFortesCode`).

- [ ] **Step 1: Reconciliar contra o banco**

Run: `node apps/rayo-server/scripts/reconcile-payroll-types.mjs 9275 2026-03 2026-08`

Expected:
- Proventos e descontos por tipo, **mês a mês**, iguais a `novos/moto-rey-referencia-fortes.md` (rodar também um mês por vez se precisar comparar: `... 9275 2026-05`). Em 05/2026 a rescisão já inclui a Folha 11: usar a linha **"Rescisão com a Folha 11"** do arquivo de referência.
- `Sem lotação: nenhum`.
- Todos os lotes com D = C, **sem** `MISSING_ACCOUNT_MAPPING`, `MISSING_CENTER_MAPPING` ou `EVENT_100_ACCOUNT_MISMATCH`. Status `ready` (03/2026 e 08/2026 com avisos de encargo/provisão sintéticos, que não bloqueiam).

Se aparecer evento sem conta ou lotação sem centro: é evento/lotação que não existia no levantamento de 28/09. Cadastrar no config (Task 2) com o mesmo critério de analogia, marcar `confirmar`, acrescentar o código em `OBSERVADOS` do teste e rodar de novo. **Não** commitar valores de folha em lugar nenhum.

- [ ] **Step 2: Teste ao vivo da provisão para a Moto Rey**

Em `apps/rayo/tests/folha-dealer-contador-resumo-geral.test.js`, acrescentar o import depois de `import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';`:

```js
import { motoReyConfig } from '../src/lib/folha-dealer/moto-rey.config.js';
```

Transformar o teste ao vivo de provisão numa função reutilizável. Substituir o bloco inteiro que começa em:

```js
    it(`${config.company.companyName}: provisão de férias no lote acompanha o saldo do Fortes (constituição − baixa)`, async () => {
```

e termina no `}, 600_000);` logo antes de `  }` / `});` (o último `it` do arquivo), por:

```js
    it(`${config.company.companyName}: provisão de férias no lote acompanha o saldo do Fortes (constituição − baixa)`, () =>
      conferirProvisaoFerias({ config, fortesCompany: resumo.fortesCompany, inicio: '2026-04', fim: '2026-08' }), 600_000);
```

Logo depois do `}` que fecha o `for (const { config, resumo } of EMPRESAS) {` e antes do `});` final do `describe`, acrescentar:

```js

  // Moto Rey: provisão calculada no Fortes de 01 a 07/2026; folha a partir de 03/2026.
  it(`${motoReyConfig.company.companyName}: provisão de férias no lote acompanha o saldo do Fortes (constituição − baixa)`, () =>
    conferirProvisaoFerias({ config: motoReyConfig, fortesCompany: '9275', inicio: '2026-03', fim: '2026-07' }), 600_000);
```

E no fim do arquivo acrescentar a função (mesmo corpo do teste antigo, parametrizado):

```js

/**
 * Movimento das contas de provisão de férias no lote = variação do saldo da PRF
 * no Fortes (constituição − baixa), mês a mês.
 */
async function conferirProvisaoFerias({ config, fortesCompany, inicio, fim }) {
  const require = createRequire(import.meta.url);
  const mssql = require('mssql');
  const { extractFortesPayroll, buildDbConfig } = require('../../rayo-server/fortes-extractor.js');
  const pool = await mssql.connect(buildDbConfig());
  // Saldo em centavos arredondados linha a linha, como o Rayo lança cada provisão.
  const saldoFortes = async (anoMes, coluna) => {
    const [r] = (await pool.request().query(`
      SELECT ISNULL(SUM(CAST(ROUND(PRF.${coluna}Acumulada * 100, 0) AS BIGINT) + CAST(ROUND(PRF.${coluna}Provisao * 100, 0) AS BIGINT)), 0) AS saldo
      FROM PRF JOIN PRV ON PRV.EMP_Codigo = PRF.EMP_Codigo AND PRV.FOL_Seq = PRF.EFO_FOL_Seq
      JOIN FOL ON FOL.EMP_Codigo = PRV.EMP_Codigo AND FOL.Seq = PRV.FOL_Seq AND FOL.Folha = 15
      WHERE PRF.EMP_Codigo = '${fortesCompany}' AND PRV.AnoMes = '${anoMes}'`)).recordset;
    return Number(r.saldo);
  };
  const passivos = [['', '2.1.1.03.001'], ['INSS', '2.1.1.03.002'], ['FGTS', '2.1.1.03.003']];
  try {
    for (const competence of competencias(inicio, fim)) {
      const ex = await extractFortesPayroll({ companyId: fortesCompany, competence });
      const sourceRows = normalizeFortesQueryRows(
        ex.payroll,
        { fortesProvisions: ex.provisions, fortesEncargoBases: ex.encargoBases, fortesExtraPayroll: ex.extraPayroll },
        config.provisionRates,
        config.encargoRates
      ).map((row) => ({ ...row, companyId: config.company.companyId }));
      const run = runFolhaDealerEngine({ config, sourceRows, competence });
      const [ano, mes] = competence.split('-').map(Number);
      const anterior = mes === 1 ? `${ano - 1}12` : `${ano}${String(mes - 1).padStart(2, '0')}`;
      for (const [coluna, conta] of passivos) {
        const movimentoLote = run.entries
          .filter((e) => e.accountCode === conta)
          .reduce((s, e) => s + (e.dc === 'C' ? e.amountCents : -e.amountCents), 0);
        const variacaoFortes = (await saldoFortes(competence.replace('-', ''), coluna)) - (await saldoFortes(anterior, coluna));
        expect([competence, conta, movimentoLote]).toEqual([competence, conta, variacaoFortes]);
      }
    }
  } finally {
    await pool.close();
  }
}
```

Run: `cd apps/rayo && FORTES_LIVE=1 npx vitest run tests/folha-dealer-contador-resumo-geral.test.js -t "ao vivo"`
Expected: 5 PASS (2 de eventos BV/BM, 2 de provisão BV/BM, 1 de provisão Moto Rey).

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-contador-resumo-geral.test.js && npx eslint tests/folha-dealer-contador-resumo-geral.test.js`
Expected: sem `FORTES_LIVE`, os testes ao vivo aparecem como skipped e o resto passa; ESLint sem erro.

- [ ] **Step 3: Documentar**

Criar `docs/folha-dealer/moto-rey.md` com: a tabela "Dados da empresa", a tabela de lotações e centros e a tabela "Pendências com o contador" deste plano (copiar as três, sem valores em reais), mais a seção:

```markdown
## Diferenças em relação à Braga Motos

- GILRAT 3% (RAT 3% × FAP 1,00), contra 1,5% na Braga Motos.
- Folha mensal a partir de 03/2026; bases eSocial a partir de 04/2026 (03/2026 usa encargo sintético).
- Rescisão complementar (Fortes Folha 11) — só a Moto Rey tem em 2026; entra como rescisão.
- Eventos 953–979, 024, 327, 954, 959, 960, 969, 970 têm significado próprio: de-para não herda BV/BM.
```

Em `docs/folha-dealer/business-rules.md`, na tabela da seção "Férias, rescisão e folha complementar", substituir a linha:

```markdown
| Rescisão | 10 | `FOL.DtCalculo` | `LIQUIDO_RESCISAO` → 2.1.1.01.004 |
```

por:

```markdown
| Rescisão | 10 e 11 (rescisão complementar) | `FOL.DtCalculo` | `LIQUIDO_RESCISAO` → 2.1.1.01.004 |
```

- [ ] **Step 4: Suíte completa, lint e build**

Run: `cd apps/rayo && npx vitest run 2>&1 | tail -5 && npx eslint src tests 2>&1 | tail -3 && npx vite build 2>&1 | tail -1`
Expected: somente as 6 falhas antigas (`folha-dealer-dealer-txt-exporter`, `folha-dealer-dealer-txt-layout`, `jr-regression`); ESLint sem erro nos arquivos tocados; `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add apps/rayo/tests/folha-dealer-contador-resumo-geral.test.js docs/folha-dealer/moto-rey.md docs/folha-dealer/business-rules.md
git commit -m "test(folha): conferência ao vivo da Moto Rey e documentação

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Checagem manual depois do deploy**

Na máquina do Rayo, depois do `git pull`: selecionar **Moto Rey** na tela, extrair 04/2026, conferir que o card "Conferência com o Resumo Geral" mostra os totais de `novos/moto-rey-referencia-fortes.md`, exportar o TXT e importar no Dealer (empresa 06 / filial 006). Se o contador mandar o Resumo Geral da Moto Rey, comparar evento a evento (sem commitar o relatório nem os valores).
