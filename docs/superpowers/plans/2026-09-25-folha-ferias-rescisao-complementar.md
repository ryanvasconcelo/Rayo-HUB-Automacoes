# Férias, Rescisão e Folha Complementar no Folha Dealer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar para o lote contábil do Dealer as folhas de férias, rescisão e complementar do Fortes, que hoje não entram (≈ R$ 1,1 milhão em proventos só em 2026, nas duas empresas).

**Architecture:** O extractor ganha três queries (uma por tipo de folha) e devolve as linhas marcadas com `payrollType`. Esse campo atravessa adapter → consolidador → journal: cada tipo gera o seu próprio líquido (`LIQUIDO_FERIAS`, `LIQUIDO_RESCISAO`, `LIQUIDO_COMPLEMENTAR`) com conta e histórico próprios. Encargos patronais não mudam — as bases eSocial que o Rayo já usa consolidam todos os tipos de folha.

**Tech Stack:** Node (CJS no `apps/rayo-server`, ESM no `apps/rayo`), mssql, React 19, Vitest 4, xlsx.

**Spec:** Não há documento de spec separado. As fontes de verdade são os arquivos do contador em `novos/` — `RELATORIO FOPAG COMPLETA.pdf` (Braga Motos, 04/2026), `Resumo Geral do MêsPeríodo 2026.xlsx` (Braga Veículos, 01–08/2026, com as contas dos líquidos anotadas) e os prints — mais a análise de 25/09/2026 resumida na seção "Como o Fortes organiza essas folhas".

---

## Como o Fortes organiza essas folhas

Regras conferidas **ao centavo** contra os dois relatórios do contador (BM 04/2026 e BV 01–08/2026):

| Tipo | `FOL.Folha` | Entra | Competência pelo mês de |
|---|---|---|---|
| Folha mensal (já existe) | 2 | via `FPG.AnoMes` | `FPG.AnoMes` |
| **Férias** | 4 | só `FOL.FOL_Seq_Pai IS NULL` | `FER.DtGozoInicial` (início do gozo) |
| **Rescisão** | 10 | todas | `FOL.DtCalculo` |
| **Complementar** | 17 | todas | `FOL.DtReferencia` |
| 13º rescisório | 8 | **nunca** — filha da rescisão, repete os eventos 208/209 | — |
| Férias filha de rescisão | 4 com `FOL_Seq_Pai` | **nunca** — repete 203/205/211/212 da rescisão | — |

Essas folhas não têm registro em `FPG` (`AnoMes`/`Tipo` nulos), por isso não dá para aproveitar o filtro da folha mensal.

Na rescisão, 16 de 51 (BV) e 5 de 84 (BM) empregados não resolvem lotação pelo vínculo `EFO.SEP_Data` — a query usa o último `SEP` do empregado como fallback.

**A SQL da Task 5 já foi executada contra o banco durante o planejamento**, exatamente como está escrita: proventos e descontos batem ao centavo com os dois relatórios nos três tipos, e nenhum empregado ficou sem lotação.

---

## Decisões do contador (confirmar antes da Task 4)

A Task 4 usa os valores abaixo. Se o contador mudar algum, só muda o valor na Task 4 — nada mais no plano depende deles.

| # | Decisão | Valor usado no plano | Por quê |
|---|---|---|---|
| 1 | Líquido de férias | `1.1.4.01.002` Adiantamento de Férias | **Anotado pelo contador** no xlsx |
| 2 | Líquido de rescisão | `2.1.1.01.004` Rescisão de Trabalho a Pagar | **Anotado pelo contador** no xlsx |
| 3 | Líquido da complementar | `2.1.1.01.001` Ordenados e Salários a Pagar | Proposta — o contador não anotou; é a mesma do líquido mensal |
| 4 | Proventos de férias (110, 111, 113, 950) e férias na rescisão (203, 205, 206, 211, 212) | D `2.1.1.03.001` Provisões de Férias | Proposta — baixa a provisão que o Rayo já constitui todo mês; debitar despesa duplicaria o custo |
| 5 | 13º na rescisão (160, 208, 209) | D `2.1.1.03.004` Provisão 13º Salário | Proposta — mesma lógica do item 4 |
| 6 | Aviso prévio indenizado (200) e rescisão antecipada (201) | D `6.1.1.01.004` Outros Salários e Ordenados | Proposta — o plano de contas não tem conta de indenização |
| 7 | Evento 301 (Provisão Cred. Trab. - Desconto, nas férias) | C `2.1.1.03.001` | Espelho do evento 100, que o motor já obriga a lançar nessa conta |
| 8 | Histórico no TXT | `FERIAS REF MM/AAAA`, `RESCISAO REF MM/AAAA`, `FOLHA COMPLEMENTAR REF MM/AAAA` | Proposta — a folha mensal continua `FOLHA DE PAGAMENTO REF MM/AAAA` |

**Fora do escopo** (precisa de regra própria do contador): multa de 40% do FGTS (evento 900) — R$ 4.052,42 na BV e R$ 5.839,68 na BM em 01–08/2026. É informativa na folha e hoje não entra em lugar nenhum.

---

## Global Constraints

- Encargos patronais (INSS, RAT, terceiros, FGTS) **não** são gerados para férias, rescisão ou complementar — já vêm completos das bases eSocial.
- A folha mensal tem que sair **idêntica** ao TXT já validado no Dealer: mesmo histórico `FOLHA DE PAGAMENTO REF MM/AAAA`, mesmo `LIQUIDO_FOLHA`.
- Mapeamento de evento → conta é **por empresa**: o mesmo código tem significados diferentes na BV e na BM.
- Linha sem `payrollType` é folha mensal; `payrollType` desconhecido é erro, nunca folha mensal.
- Trabalhar numa branch nova a partir da `main`: `feat/folha-ferias-rescisao-complementar`.
- Todo commit termina com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Testes do front: `cd apps/rayo && npx vitest run <arquivo>`. As 6 falhas já existentes (`folha-dealer-dealer-txt-exporter`, `folha-dealer-dealer-txt-layout`, `jr-regression`) não são deste trabalho.

## Review Focus

- Empregado com folha mensal **e** rescisão no mesmo mês: dois líquidos separados, e o INSS de um não se soma ao do outro no consolidado. → Tasks 2 e 3.
- Rescisão com líquido negativo (evento 090 "Líquido Negativo"): o sinal se mantém e o lote bloqueia, em vez de lançar o líquido invertido. → Tasks 1, 2 e 3.
- Competência de dezembro: o intervalo de datas vira para janeiro do ano seguinte. → Task 5.
- Fallback sintético de provisão/encargo (mês sem PRD/PRF ou sem bases eSocial) não pode incluir férias/rescisão, nem se elas chegarem por engano em `rawRows` — dobraria encargo e provisão. → Task 2.
- 13º rescisório (`Folha=8`) e férias filhas de rescisão nunca entram — duplicariam 13º e férias. → Task 5 (SQL) e Task 7 (reconciliação).

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/rayo/src/lib/folha-dealer/contracts.js` (modify) | `PAYROLL_TYPES`, `DEFAULT_PAYROLL_TYPE`, `resolvePayrollType`, `buildHistory(competence, payrollType)` |
| `apps/rayo/src/lib/folha-dealer/fortes-normalizer.js` (modify) | Preservar sinal de qualquer `LIQUIDO_*` |
| `apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js` (modify) | `fortesExtraPayroll`, `payrollType` nas linhas, líquido por tipo, fallback só com mensal |
| `apps/rayo/src/lib/folha-dealer/payroll-consolidator.js` (modify) | `payrollType` na chave de consolidação |
| `apps/rayo/src/lib/folha-dealer/journal-builder.js` (modify) | Histórico por tipo; `payrollType` no lançamento |
| `apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js` (modify) | Contas dos eventos novos da BV, `LIQUIDO_*`, informativos |
| `apps/rayo/src/lib/folha-dealer/braga-motos.config.js` (modify) | Contas dos eventos novos da BM |
| `apps/rayo-server/fortes-extra-payroll-queries.js` (create) | SQL das três folhas + intervalo de datas da competência |
| `apps/rayo-server/fortes-extractor.js` (modify) | Roda as três queries e devolve `extraPayroll` |
| `apps/rayo/vite-plugin-fortes-api.js`, `apps/rayo-server/index.js` (modify) | Repassar `extraPayroll` na resposta |
| `apps/rayo/src/lib/folha-dealer/payroll-type-summary.js` (create) | Totais por tipo no formato do Resumo Geral do Fortes |
| `apps/rayo/src/components/FolhaDealerResumoPorTipo.jsx` (create) | Card de conferência na tela |
| `apps/rayo/src/hooks/useFolhaDealer.js`, `apps/rayo/src/pages/FolhaDealerPage.jsx` (modify) | Ligar extração e card |
| `apps/rayo/src/lib/folha-dealer/conference-xlsx-exporter.js` (modify) | Aba "Resumo por Tipo" + coluna "Tipo de Folha" |
| `apps/rayo-server/scripts/reconcile-payroll-types.mjs` (create) | Conferência contra o Resumo Geral, direto no banco |
| `docs/folha-dealer/business-rules.md` (modify) | Regras de competência por tipo |

---

### Task 1: Tipos de folha no contrato e sinal do líquido

**Files:**
- Modify: `apps/rayo/src/lib/folha-dealer/contracts.js`
- Modify: `apps/rayo/src/lib/folha-dealer/fortes-normalizer.js:22-26`
- Modify: `apps/rayo/src/lib/folha-dealer/index.js` (bloco de export de `contracts.js`)
- Test: `apps/rayo/tests/folha-dealer-payroll-types.test.js` (create)

**Interfaces:**
- Produces:
  - `PAYROLL_TYPES: Record<'MENSAL'|'FERIAS'|'RESCISAO'|'COMPLEMENTAR', { label: string, liquidEventCode: string, liquidEventName: string, historyLabel: string }>` — ordem de declaração é a ordem de exibição.
  - `DEFAULT_PAYROLL_TYPE = 'MENSAL'`
  - `resolvePayrollType(payrollType?: string): string` — vazio/ausente → `'MENSAL'`; desconhecido → lança `Error('Tipo de folha desconhecido: "<valor>".')`.
  - `buildHistory(competence: 'YYYY-MM', payrollType?: string): string`

- [ ] **Step 0: Criar a branch**

```bash
git checkout main && git pull && git checkout -b feat/folha-ferias-rescisao-complementar
```

- [ ] **Step 1: Write the failing test**

Criar `apps/rayo/tests/folha-dealer-payroll-types.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  PAYROLL_TYPES,
  DEFAULT_PAYROLL_TYPE,
  resolvePayrollType,
  buildHistory,
} from '../src/lib/folha-dealer/contracts.js';
import { normalizePayrollRows } from '../src/lib/folha-dealer/fortes-normalizer.js';

describe('tipos de folha', () => {
  it('mantém o histórico da folha mensal idêntico ao TXT já validado no Dealer', () => {
    expect(buildHistory('2026-04')).toBe('FOLHA DE PAGAMENTO REF 04/2026');
    expect(buildHistory('2026-04', 'MENSAL')).toBe('FOLHA DE PAGAMENTO REF 04/2026');
  });

  it('usa histórico próprio para férias, rescisão e complementar', () => {
    expect(buildHistory('2026-04', 'FERIAS')).toBe('FERIAS REF 04/2026');
    expect(buildHistory('2026-04', 'RESCISAO')).toBe('RESCISAO REF 04/2026');
    expect(buildHistory('2026-04', 'COMPLEMENTAR')).toBe('FOLHA COMPLEMENTAR REF 04/2026');
  });

  it('cada tipo tem um evento de líquido próprio, na ordem do Resumo Geral do Fortes', () => {
    expect(Object.keys(PAYROLL_TYPES)).toEqual(['MENSAL', 'FERIAS', 'RESCISAO', 'COMPLEMENTAR']);
    expect(Object.values(PAYROLL_TYPES).map((t) => t.liquidEventCode)).toEqual([
      'LIQUIDO_FOLHA',
      'LIQUIDO_FERIAS',
      'LIQUIDO_RESCISAO',
      'LIQUIDO_COMPLEMENTAR',
    ]);
    expect(PAYROLL_TYPES.MENSAL.liquidEventName).toBe('Líquido da Folha a Pagar');
  });

  it('linha sem tipo é folha mensal; tipo desconhecido é erro, não folha mensal', () => {
    expect(resolvePayrollType(undefined)).toBe(DEFAULT_PAYROLL_TYPE);
    expect(resolvePayrollType('')).toBe('MENSAL');
    expect(resolvePayrollType('RESCISAO')).toBe('RESCISAO');
    expect(() => resolvePayrollType('13_SALARIO')).toThrow(/Tipo de folha desconhecido/);
  });

  it('preserva o sinal de qualquer líquido — rescisão pode ter líquido negativo', () => {
    const rows = normalizePayrollRows([
      { companyId: 'x', competence: '2026-04', lotacaoCode: 'ADM', eventCode: 'LIQUIDO_RESCISAO', amountCents: -5000 },
      { companyId: 'x', competence: '2026-04', lotacaoCode: 'ADM', eventCode: 'LIQUIDO_FOLHA', amountCents: -100 },
      { companyId: 'x', competence: '2026-04', lotacaoCode: 'ADM', eventCode: '011', amountCents: -300 },
    ]);
    expect(rows.map((r) => r.amountCents)).toEqual([-5000, -100, 300]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-payroll-types.test.js`
Expected: FAIL — `PAYROLL_TYPES` e `resolvePayrollType` não exportados; `LIQUIDO_RESCISAO` sai `5000`.

- [ ] **Step 3: Implement — `contracts.js`**

Logo depois de `export const EVENT_100_REQUIRED_ACCOUNT = '2.1.1.03.001';`, adicionar:

```js

/**
 * Tipos de folha do Fortes que o Rayo contabiliza. Cada tipo tem o próprio
 * líquido (conta própria no de-para) e o próprio histórico no TXT. A ordem é a
 * do "Resumo Geral do Mês/Período" do Fortes.
 */
export const PAYROLL_TYPES = Object.freeze({
  MENSAL: Object.freeze({
    label: 'Folha de Pagamento',
    liquidEventCode: 'LIQUIDO_FOLHA',
    liquidEventName: 'Líquido da Folha a Pagar',
    historyLabel: 'FOLHA DE PAGAMENTO',
  }),
  FERIAS: Object.freeze({
    label: 'Férias',
    liquidEventCode: 'LIQUIDO_FERIAS',
    liquidEventName: 'Líquido de Férias',
    historyLabel: 'FERIAS',
  }),
  RESCISAO: Object.freeze({
    label: 'Rescisão',
    liquidEventCode: 'LIQUIDO_RESCISAO',
    liquidEventName: 'Líquido de Rescisão a Pagar',
    historyLabel: 'RESCISAO',
  }),
  COMPLEMENTAR: Object.freeze({
    label: 'Complemento de Folha',
    liquidEventCode: 'LIQUIDO_COMPLEMENTAR',
    liquidEventName: 'Líquido da Folha Complementar',
    historyLabel: 'FOLHA COMPLEMENTAR',
  }),
});

export const DEFAULT_PAYROLL_TYPE = 'MENSAL';

/**
 * Linha sem tipo é folha mensal. Tipo desconhecido é erro: cair na folha
 * mensal jogaria o líquido na conta errada sem aviso.
 * @param {string} [payrollType]
 * @returns {string}
 */
export function resolvePayrollType(payrollType) {
  if (!payrollType) return DEFAULT_PAYROLL_TYPE;
  if (!PAYROLL_TYPES[payrollType]) {
    throw new Error(`Tipo de folha desconhecido: "${payrollType}".`);
  }
  return payrollType;
}
```

Substituir o bloco do `buildHistory`:

```js
/**
 * Gera o histórico padrão: `FOLHA DE PAGAMENTO REF MM/AAAA`.
 * @param {string} competence — formato `YYYY-MM`.
 * @returns {string}
 */
export function buildHistory(competence) {
  const [year, month] = competence.split('-');
  return `FOLHA DE PAGAMENTO REF ${month}/${year}`;
}
```

por:

```js
/**
 * Gera o histórico do lançamento: `FOLHA DE PAGAMENTO REF MM/AAAA` na folha
 * mensal, `FERIAS REF MM/AAAA` etc. nos demais tipos.
 * @param {string} competence — formato `YYYY-MM`.
 * @param {string} [payrollType]
 * @returns {string}
 */
export function buildHistory(competence, payrollType = DEFAULT_PAYROLL_TYPE) {
  const [year, month] = competence.split('-');
  const { historyLabel } = PAYROLL_TYPES[resolvePayrollType(payrollType)];
  return `${historyLabel} REF ${month}/${year}`;
}
```

- [ ] **Step 4: Implement — `fortes-normalizer.js`**

Substituir:

```js
  return code.startsWith('PROV_') || code === 'LIQUIDO_FOLHA';
```

por:

```js
  // Líquido de qualquer tipo de folha pode ser negativo (ex.: rescisão com
  // "Líquido Negativo"); o journal bloqueia em vez de o sinal sumir.
  return code.startsWith('PROV_') || code.startsWith('LIQUIDO_');
```

- [ ] **Step 5: Implement — `index.js`**

No bloco `export { ... } from './contracts.js';`, substituir:

```js
  buildHistory,
  accountClass,
```

por:

```js
  buildHistory,
  PAYROLL_TYPES,
  DEFAULT_PAYROLL_TYPE,
  resolvePayrollType,
  accountClass,
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-payroll-types.test.js tests/folha-dealer-engine.test.js tests/folha-dealer-conference-xlsx.test.js`
Expected: PASS (5 novos + os existentes desses arquivos).

- [ ] **Step 7: Commit**

```bash
git add apps/rayo/src/lib/folha-dealer/contracts.js apps/rayo/src/lib/folha-dealer/fortes-normalizer.js apps/rayo/src/lib/folha-dealer/index.js apps/rayo/tests/folha-dealer-payroll-types.test.js
git commit -m "feat(folha): tipos de folha com líquido e histórico próprios

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Adapter — férias, rescisão e complementar com líquido próprio

**Files:**
- Modify: `apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js`
- Test: `apps/rayo/tests/folha-dealer-extra-payroll-adapter.test.js` (create)

**Interfaces:**
- Consumes: `PAYROLL_TYPES`, `DEFAULT_PAYROLL_TYPE`, `resolvePayrollType` (Task 1).
- Produces:
  - `normalizeFortesQueryRows(rawRows, { fortesProvisions?, fortesEncargoBases?, fortesExtraPayroll? }, provisionRates?, encargoRates?)` — `fortesExtraPayroll` recebe linhas com `payrollType` (`'FERIAS' | 'RESCISAO' | 'COMPLEMENTAR'`) no mesmo formato das linhas da folha mensal.
  - Toda `PayrollSourceRow` de evento ou líquido passa a ter `payrollType: string`.
  - Líquidos sintéticos: `eventCode = PAYROLL_TYPES[tipo].liquidEventCode`, `sourceOrigin = 'fortes-query-derived'`, um por `payrollType + lotacaoCode`.

- [ ] **Step 1: Write the failing test**

Criar `apps/rayo/tests/folha-dealer-extra-payroll-adapter.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';

const B = { companyId: '9274', competence: '202604', lotacaoCode: 'ADM' };
const PROVENTO = { ProvDesc: 1, TipoRegistro: 'PROVENTO', IncideFGTS: '1' };
const DESCONTO = { ProvDesc: -1, TipoRegistro: 'DESCONTO' };

const mensal = [
  { ...B, employeeId: '1', eventCode: '011', amountCents: 300000, ...PROVENTO },
  { ...B, employeeId: '1', eventCode: '310', amountCents: 30000, ...DESCONTO },
];
const rescisao = [
  { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '200', amountCents: 150000, ...PROVENTO },
  { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '502', amountCents: 10000, ...DESCONTO },
];
const ferias = [
  { ...B, payrollType: 'FERIAS', employeeId: '3', eventCode: '110', amountCents: 90000, ...PROVENTO },
  { ...B, payrollType: 'FERIAS', employeeId: '3', eventCode: '111', amountCents: 30000, ...PROVENTO },
  { ...B, payrollType: 'FERIAS', employeeId: '3', eventCode: '310', amountCents: 12000, ...DESCONTO },
];

const valores = (rows, eventCode) =>
  rows.filter((r) => r.eventCode === eventCode).map((r) => r.amountCents);

describe('adapter — férias, rescisão e complementar', () => {
  it('linha da folha mensal sai marcada como MENSAL', () => {
    const rows = normalizeFortesQueryRows(mensal);
    expect(rows.find((r) => r.eventCode === '011').payrollType).toBe('MENSAL');
    expect(rows.find((r) => r.eventCode === 'LIQUIDO_FOLHA').payrollType).toBe('MENSAL');
  });

  it('gera um líquido por tipo, sem misturar rescisão e férias no líquido da folha', () => {
    const rows = normalizeFortesQueryRows(mensal, { fortesExtraPayroll: [...rescisao, ...ferias] });
    expect(valores(rows, 'LIQUIDO_FOLHA')).toEqual([270000]);
    expect(valores(rows, 'LIQUIDO_RESCISAO')).toEqual([140000]);
    expect(valores(rows, 'LIQUIDO_FERIAS')).toEqual([108000]);
    expect(rows.find((r) => r.eventCode === 'LIQUIDO_RESCISAO')).toMatchObject({
      payrollType: 'RESCISAO',
      lotacaoCode: 'ADM',
      sourceOrigin: 'fortes-query-derived',
      eventName: 'Líquido de Rescisão a Pagar',
    });
  });

  it('mantém o tipo nas linhas de evento, inclusive quando o mesmo código aparece em dois tipos', () => {
    const rows = normalizeFortesQueryRows(mensal, { fortesExtraPayroll: ferias });
    const inss = rows.filter((r) => r.eventCode === '310').map((r) => [r.payrollType, r.amountCents]);
    expect(inss).toEqual([['MENSAL', 30000], ['FERIAS', 12000]]);
  });

  it('líquido de rescisão negativo sai com sinal', () => {
    const rows = normalizeFortesQueryRows([], {
      fortesExtraPayroll: [
        { ...B, payrollType: 'RESCISAO', eventCode: '199', amountCents: 10000, ...PROVENTO },
        { ...B, payrollType: 'RESCISAO', eventCode: '500', amountCents: 25000, ...DESCONTO },
      ],
    });
    expect(valores(rows, 'LIQUIDO_RESCISAO')).toEqual([-15000]);
  });

  it('fallback sintético de provisão/encargo usa só a folha mensal (evita encargo em dobro)', () => {
    const rates = { feriasTerco: 10, decimoTerceiro: 10, inssPatronal: 0, fgts: 0 };
    const sintetico = (rows) =>
      rows
        .filter((r) => r.sourceOrigin === 'provision-derived' || r.sourceOrigin === 'encargo-derived')
        .map((r) => `${r.eventCode}:${r.amountCents}`)
        .sort();

    const soMensal = sintetico(normalizeFortesQueryRows(mensal, {}, rates, null));
    expect(soMensal.length).toBeGreaterThan(0);

    const comExtras = normalizeFortesQueryRows(mensal, { fortesExtraPayroll: [...rescisao, ...ferias] }, rates, null);
    expect(sintetico(comExtras)).toEqual(soMensal);

    // Mesmo que a rescisão chegue por engano junto com a folha mensal
    const extrasEmRawRows = normalizeFortesQueryRows([...mensal, ...rescisao], {}, rates, null);
    expect(sintetico(extrasEmRawRows)).toEqual(soMensal);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-adapter.test.js`
Expected: FAIL — `payrollType` indefinido, sem `LIQUIDO_RESCISAO`/`LIQUIDO_FERIAS`, e o fallback dobra.

- [ ] **Step 3: Implement — imports e linha normalizada**

No topo de `fortes-query-adapter.js`, depois de `import { employeeLotacaoMap } from './employee-lotacao-map.js';`:

```js
import { PAYROLL_TYPES, DEFAULT_PAYROLL_TYPE, resolvePayrollType } from './contracts.js';
```

Em `toPayrollSourceRow`, substituir:

```js
    competence,
    lotacaoCode: lotacao.lotacaoCode,
```

por:

```js
    competence,
    payrollType: resolvePayrollType(raw.payrollType),
    lotacaoCode: lotacao.lotacaoCode,
```

No JSDoc de `normalizeFortesQueryRows`, depois da linha `@param {object[]} [options.fortesEncargoBases] ...`, adicionar:

```js
 * @param {object[]} [options.fortesExtraPayroll] — férias, rescisão e complementar (linhas com payrollType)
```

- [ ] **Step 4: Implement — eventos, líquido por tipo e fallback só com mensal**

Substituir este trecho inteiro de `normalizeFortesQueryRows` (de `const fortesEncargoBases` até a linha do `rowsWithLotacao`):

```js
  const fortesEncargoBases = Array.isArray(options.fortesEncargoBases)
    ? options.fortesEncargoBases
    : [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];

    if (raw.eventCode === undefined || raw.eventCode === null || String(raw.eventCode).trim() === '') {
      continue;
    }

    normalized.push(toPayrollSourceRow(raw, i, { preserveSign: false }));
  }

  // Sintetizar Líquido da Folha por Lotação
  const liquidoPerLotacao = {};
  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const type = mapFortesRecordType(raw);
    if (type !== 'PROVENTO' && type !== 'DESCONTO') continue;

    const lotacao = resolveLotacao(raw);
    const code = lotacao.lotacaoCode;
    if (!liquidoPerLotacao[code]) {
      liquidoPerLotacao[code] = {
        amount: 0,
        companyId: raw.companyId,
        competence: raw.competence,
        lotacaoName: lotacao.lotacaoName,
      };
    }

    const amt = Math.abs(Number(raw.amountCents) || 0);
    if (type === 'PROVENTO') liquidoPerLotacao[code].amount += amt;
    if (type === 'DESCONTO') liquidoPerLotacao[code].amount -= amt;
  }

  // Líquido com sinal: negativo (descontos > proventos) segue para o journal,
  // que bloqueia por NEGATIVE_VALUE_WITHOUT_POLICY em vez de sumir em silêncio.
  for (const [code, data] of Object.entries(liquidoPerLotacao)) {
    if (data.amount !== 0) {
      const comp = normalizeCompetence(data.competence);
      normalized.push({
        sourceSystem: 'fortes',
        sourceAdapter: 'fortes-query',
        sourceOrigin: 'fortes-query-derived',
        sourcePayrollId: null,
        companyId: data.companyId != null ? String(data.companyId) : '',
        companyName: '',
        competence: comp || '',
        lotacaoCode: code,
        lotacaoName: data.lotacaoName || '',
        eventCode: 'LIQUIDO_FOLHA',
        eventName: 'Líquido da Folha a Pagar',
        sourceEventNature: 'DESCONTO',
        sourceReference: '',
        sourceRecordType: 'DESCONTO',
        amountCents: Math.round(data.amount),
        employeeId: null,
        employeeName: null,
        sourceLineId: `fortes-derived-liquido-${code}`,
      });
    }
  }

  // Fallbacks sintéticos usam a mesma lotação resolvida da folha
  const rowsWithLotacao = rawRows.map((raw) => ({ ...raw, ...resolveLotacao(raw) }));
```

por:

```js
  const fortesEncargoBases = Array.isArray(options.fortesEncargoBases)
    ? options.fortesEncargoBases
    : [];
  const fortesExtraPayroll = Array.isArray(options.fortesExtraPayroll)
    ? options.fortesExtraPayroll
    : [];
  // Folha mensal + férias/rescisão/complementar: mesmo tratamento de evento,
  // mas cada tipo com líquido próprio.
  const payrollRows = [...rawRows, ...fortesExtraPayroll];

  for (let i = 0; i < payrollRows.length; i++) {
    const raw = payrollRows[i];

    if (raw.eventCode === undefined || raw.eventCode === null || String(raw.eventCode).trim() === '') {
      continue;
    }

    normalized.push(toPayrollSourceRow(raw, i, { preserveSign: false }));
  }

  // Líquido por tipo de folha + lotação: férias, rescisão e complementar têm
  // conta de líquido própria e não podem cair no líquido da folha mensal.
  const liquidoPorTipoLotacao = new Map();
  for (const raw of payrollRows) {
    const type = mapFortesRecordType(raw);
    if (type !== 'PROVENTO' && type !== 'DESCONTO') continue;

    const payrollType = resolvePayrollType(raw.payrollType);
    const lotacao = resolveLotacao(raw);
    const key = `${payrollType}|${lotacao.lotacaoCode}`;
    if (!liquidoPorTipoLotacao.has(key)) {
      liquidoPorTipoLotacao.set(key, {
        amount: 0,
        payrollType,
        lotacaoCode: lotacao.lotacaoCode,
        lotacaoName: lotacao.lotacaoName,
        companyId: raw.companyId,
        competence: raw.competence,
      });
    }

    const data = liquidoPorTipoLotacao.get(key);
    const amt = Math.abs(Number(raw.amountCents) || 0);
    data.amount += type === 'PROVENTO' ? amt : -amt;
  }

  // Líquido com sinal: negativo (descontos > proventos) segue para o journal,
  // que bloqueia por NEGATIVE_VALUE_WITHOUT_POLICY em vez de sumir em silêncio.
  for (const data of liquidoPorTipoLotacao.values()) {
    if (data.amount === 0) continue;
    const { liquidEventCode, liquidEventName } = PAYROLL_TYPES[data.payrollType];
    normalized.push({
      sourceSystem: 'fortes',
      sourceAdapter: 'fortes-query',
      sourceOrigin: 'fortes-query-derived',
      sourcePayrollId: null,
      companyId: data.companyId != null ? String(data.companyId) : '',
      companyName: '',
      competence: normalizeCompetence(data.competence) || '',
      payrollType: data.payrollType,
      lotacaoCode: data.lotacaoCode,
      lotacaoName: data.lotacaoName || '',
      eventCode: liquidEventCode,
      eventName: liquidEventName,
      sourceEventNature: 'DESCONTO',
      sourceReference: '',
      sourceRecordType: 'DESCONTO',
      amountCents: Math.round(data.amount),
      employeeId: null,
      employeeName: null,
      sourceLineId: `fortes-derived-liquido-${data.payrollType}-${data.lotacaoCode}`,
    });
  }

  // Fallbacks sintéticos usam só a folha mensal: férias, rescisão e
  // complementar já estão nas bases eSocial e nas provisões do Fortes, e
  // entrar aqui geraria encargo e provisão em dobro.
  const monthlyRows = rawRows.filter(
    (raw) => resolvePayrollType(raw.payrollType) === DEFAULT_PAYROLL_TYPE
  );
  const rowsWithLotacao = monthlyRows.map((raw) => ({ ...raw, ...resolveLotacao(raw) }));
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-adapter.test.js tests/folha-dealer-fortes-query-adapter.test.js`
Expected: PASS — os 5 novos e todos os existentes do adapter (os testes 14, 17 e 19 do `LIQUIDO_FOLHA` continuam iguais).

- [ ] **Step 6: Commit**

```bash
git add apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js apps/rayo/tests/folha-dealer-extra-payroll-adapter.test.js
git commit -m "feat(folha): adapter recebe férias, rescisão e complementar com líquido próprio

O fallback sintético de provisão/encargo passa a usar só a folha mensal:
os demais tipos já estão nas bases eSocial e gerariam encargo em dobro.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Consolidador e journal separam por tipo de folha

**Files:**
- Modify: `apps/rayo/src/lib/folha-dealer/payroll-consolidator.js`
- Modify: `apps/rayo/src/lib/folha-dealer/journal-builder.js`
- Test: `apps/rayo/tests/folha-dealer-extra-payroll-journal.test.js` (create)

**Interfaces:**
- Consumes: `normalizeFortesQueryRows` com `fortesExtraPayroll` (Task 2); `buildHistory(competence, payrollType)`, `DEFAULT_PAYROLL_TYPE` (Task 1).
- Produces: `ConsolidatedPayrollItem.payrollType: string`; `AccountingEntry.payrollType: string` e `AccountingEntry.history` do tipo do item.

- [ ] **Step 1: Write the failing test**

Criar `apps/rayo/tests/folha-dealer-extra-payroll-journal.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';
import { runFolhaDealerEngine } from '../src/lib/folha-dealer/index.js';

const config = {
  company: { companyId: '9274' },
  informativeEventCodes: [],
  centerMappings: [
    { companyId: '9274', lotacaoCode: 'ADM', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
  ],
  accountMappings: [
    { companyId: '9274', eventCode: '011', dealerAccountCode: '6.1.1.01.002', dc: 'D', active: true },
    { companyId: '9274', eventCode: '199', dealerAccountCode: '6.1.1.01.002', dc: 'D', active: true },
    { companyId: '9274', eventCode: '310', dealerAccountCode: '2.1.1.02.001', dc: 'C', active: true },
    { companyId: '9274', eventCode: 'LIQUIDO_FOLHA', dealerAccountCode: '2.1.1.01.001', dc: 'C', active: true },
    { companyId: '9274', eventCode: 'LIQUIDO_RESCISAO', dealerAccountCode: '2.1.1.01.004', dc: 'C', active: true },
  ],
};

const B = { companyId: '9274', competence: '202604', lotacaoCode: 'ADM' };

function run(mensal, rescisao) {
  const sourceRows = normalizeFortesQueryRows(mensal, { fortesExtraPayroll: rescisao });
  return runFolhaDealerEngine({ config, sourceRows, competence: '2026-04' });
}

const lote = run(
  [
    { ...B, employeeId: '1', eventCode: '011', amountCents: 300000, ProvDesc: 1 },
    { ...B, employeeId: '1', eventCode: '310', amountCents: 30000, ProvDesc: -1 },
  ],
  [
    { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '199', amountCents: 100000, ProvDesc: 1 },
    { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '310', amountCents: 8000, ProvDesc: -1 },
  ]
);

describe('journal com folha mensal + rescisão no mesmo mês', () => {
  it('fecha débito = crédito', () => {
    const total = (dc) => lote.entries.filter((e) => e.dc === dc).reduce((s, e) => s + e.amountCents, 0);
    expect(total('D')).toBe(400000);
    expect(total('C')).toBe(400000);
    expect(lote.issues.filter((i) => i.code === 'UNBALANCED_JOURNAL')).toEqual([]);
  });

  it('líquido da rescisão vai para a conta própria com histórico de rescisão', () => {
    expect(lote.entries.find((e) => e.eventCode === 'LIQUIDO_RESCISAO')).toMatchObject({
      dc: 'C',
      accountCode: '2.1.1.01.004',
      amountCents: 92000,
      history: 'RESCISAO REF 04/2026',
      payrollType: 'RESCISAO',
    });
  });

  it('folha mensal mantém conta e histórico de sempre', () => {
    expect(lote.entries.find((e) => e.eventCode === 'LIQUIDO_FOLHA')).toMatchObject({
      accountCode: '2.1.1.01.001',
      amountCents: 270000,
      history: 'FOLHA DE PAGAMENTO REF 04/2026',
      payrollType: 'MENSAL',
    });
  });

  it('não soma o INSS da rescisão com o da folha mensal no consolidado', () => {
    const inss = lote.consolidatedItems
      .filter((c) => c.eventCode === '310')
      .map((c) => [c.payrollType, c.amountCents]);
    expect(inss).toEqual([['MENSAL', 30000], ['RESCISAO', 8000]]);
  });

  it('rescisão com líquido negativo bloqueia em vez de inverter o lançamento', () => {
    const negativo = run([], [
      { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '199', amountCents: 10000, ProvDesc: 1 },
      { ...B, payrollType: 'RESCISAO', employeeId: '2', eventCode: '310', amountCents: 25000, ProvDesc: -1 },
    ]);
    expect(
      negativo.issues.some(
        (i) => i.code === 'NEGATIVE_VALUE_WITHOUT_POLICY' && i.context.eventCode === 'LIQUIDO_RESCISAO'
      )
    ).toBe(true);
    expect(negativo.status).toBe('blocked');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-journal.test.js`
Expected: FAIL — histórico sai `FOLHA DE PAGAMENTO` na rescisão, `payrollType` indefinido nos lançamentos, e o 310 consolidado vira um item só de 38000.

- [ ] **Step 3: Implement — consolidador**

Em `payroll-consolidator.js`, no topo (depois do comentário do arquivo):

```js
import { DEFAULT_PAYROLL_TYPE } from './contracts.js';
```

Trocar o comentário de chave:

```js
 * Chave de consolidação:
 *   companyId + competence + lotacaoCode + eventCode
```

por:

```js
 * Chave de consolidação:
 *   companyId + competence + payrollType + lotacaoCode + eventCode
 * (o mesmo evento em tipos de folha diferentes não se soma — cada tipo tem
 * líquido e histórico próprios).
```

Substituir:

```js
    const key = `${row.companyId}|${row.competence}|${row.lotacaoCode}|${row.eventCode}`;
```

por:

```js
    const payrollType = row.payrollType || DEFAULT_PAYROLL_TYPE;
    const key = `${row.companyId}|${row.competence}|${payrollType}|${row.lotacaoCode}|${row.eventCode}`;
```

E, no objeto do `map.set(key, {`, substituir:

```js
        competence: row.competence,
        lotacaoCode: row.lotacaoCode,
```

por:

```js
        competence: row.competence,
        payrollType,
        lotacaoCode: row.lotacaoCode,
```

- [ ] **Step 4: Implement — journal**

Em `journal-builder.js`, no import de `./contracts.js`, substituir `  buildHistory,` por:

```js
  buildHistory,
  DEFAULT_PAYROLL_TYPE,
```

Remover a linha:

```js
  const history = buildHistory(competence);
```

Logo antes do comentário `    // ------ Generate entries for each account line ------`, adicionar:

```js
    const history = buildHistory(competence, item.payrollType);

```

No `entries.push({`, substituir:

```js
        history,
        dc: finalDc,
```

por:

```js
        history,
        payrollType: item.payrollType || DEFAULT_PAYROLL_TYPE,
        dc: finalDc,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-journal.test.js tests/folha-dealer-engine.test.js tests/folha-dealer-run-service.test.js tests/folha-dealer-conference-xlsx.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/rayo/src/lib/folha-dealer/payroll-consolidator.js apps/rayo/src/lib/folha-dealer/journal-builder.js apps/rayo/tests/folha-dealer-extra-payroll-journal.test.js
git commit -m "feat(folha): consolidado e lançamentos separados por tipo de folha

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: De-para de contas dos eventos novos nas duas empresas

Usa os valores da seção "Decisões do contador". Os eventos são os que tiveram valor em férias/rescisão/complementar em 01–09/2026 (levantamento de 25/09/2026). A complementar não precisa de evento novo: usa os mesmos códigos da folha mensal, todos já mapeados.

**Files:**
- Modify: `apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js`
- Modify: `apps/rayo/src/lib/folha-dealer/braga-motos.config.js`
- Modify: `apps/rayo/tests/folha-dealer-braga-motos-config.test.js` (troca uma asserção frágil)
- Test: `apps/rayo/tests/folha-dealer-extra-payroll-mappings.test.js` (create)

**Interfaces:**
- Consumes: eventos sintéticos `LIQUIDO_FERIAS`, `LIQUIDO_RESCISAO`, `LIQUIDO_COMPLEMENTAR` (Task 1).
- Produces: `accountMappings` e `informativeEventCodes` completos para férias/rescisão/complementar nas duas empresas. A Braga Motos herda os `LIQUIDO_*` e os informativos da Braga Veículos automaticamente (`syntheticAccountMappings` e `informativeEventCodes` já derivam da BV).

- [ ] **Step 1: Write the failing test**

Criar `apps/rayo/tests/folha-dealer-extra-payroll-mappings.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import { bragaMotosConfig } from '../src/lib/folha-dealer/braga-motos.config.js';

// Eventos com valor em férias/rescisão no Fortes, 01–09/2026 (levantamento de
// 25/09/2026). P = provento (tem que debitar), D = desconto (tem que creditar).
const OBSERVADOS = {
  'braga-veiculos': {
    P: ['110', '111', '113', '151', '950', '085', '086', '199', '200', '203', '205', '206', '208', '209', '211', '212'],
    D: ['301', '344', '450', '500', '501', '502', '504', '507', '953', '954', '957', '971', '972'],
  },
  'braga-motos': {
    P: ['110', '111', '113', '950', '025', '105', '160', '200', '201', '203', '205', '206', '208', '209', '211', '212', '213'],
    D: ['301', '344', '122', '129', '314', '500', '501', '502', '504', '930', '971', '972', '980', '993', '994', '995'],
  },
};

// Bases de cálculo da rescisão (ProvDesc = 0): nunca geram lançamento.
const INFORMATIVOS_RESCISAO = ['610', '613', '900', '902', '904'];

for (const config of [bragaVeiculosConfig, bragaMotosConfig]) {
  const { companyId } = config.company;
  const dcsDoEvento = (code) => config.accountMappings.filter((m) => m.eventCode === code).map((m) => m.dc);
  const contaCredito = (code) =>
    config.accountMappings.find((m) => m.eventCode === code && m.dc === 'C')?.dealerAccountCode;

  describe(`${companyId} — de-para de férias, rescisão e complementar`, () => {
    it('todo provento observado debita', () => {
      for (const code of OBSERVADOS[companyId].P) {
        expect([code, dcsDoEvento(code)]).toEqual([code, ['D']]);
      }
    });

    it('todo desconto observado credita', () => {
      for (const code of OBSERVADOS[companyId].D) {
        expect([code, dcsDoEvento(code)]).toEqual([code, ['C']]);
      }
    });

    it('bases de cálculo da rescisão são informativas', () => {
      for (const code of INFORMATIVOS_RESCISAO) {
        expect(config.informativeEventCodes).toContain(code);
      }
    });

    it('líquidos vão para as contas definidas com o contador', () => {
      expect(contaCredito('LIQUIDO_FOLHA')).toBe('2.1.1.01.001');
      expect(contaCredito('LIQUIDO_FERIAS')).toBe('1.1.4.01.002');
      expect(contaCredito('LIQUIDO_RESCISAO')).toBe('2.1.1.01.004');
      expect(contaCredito('LIQUIDO_COMPLEMENTAR')).toBe('2.1.1.01.001');
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-mappings.test.js`
Expected: FAIL — eventos sem mapeamento, informativos ausentes, `LIQUIDO_FERIAS` indefinido.

- [ ] **Step 3: Implement — Braga Veículos, líquidos**

Em `braga-veiculos.config.js`, logo depois da linha:

```js
  { companyId: company.companyId, eventCode: 'LIQUIDO_FOLHA', dealerAccountCode: '2.1.1.01.001', dealerLotAccountCode: null, dc: 'C', description: 'Ordenados e Salários a Pagar', active: true },
```

adicionar:

```js
  { companyId: company.companyId, eventCode: 'LIQUIDO_FERIAS', dealerAccountCode: '1.1.4.01.002', dealerLotAccountCode: null, dc: 'C', description: 'Adiantamento de Férias (líquido de férias)', active: true },
  { companyId: company.companyId, eventCode: 'LIQUIDO_RESCISAO', dealerAccountCode: '2.1.1.01.004', dealerLotAccountCode: null, dc: 'C', description: 'Rescisão de Trabalho a Pagar', active: true },
  { companyId: company.companyId, eventCode: 'LIQUIDO_COMPLEMENTAR', dealerAccountCode: '2.1.1.01.001', dealerLotAccountCode: null, dc: 'C', description: 'Ordenados e Salários a Pagar (complementar)', active: true },
```

- [ ] **Step 4: Implement — Braga Veículos, eventos de férias e rescisão**

Logo antes da linha `  // ---- PROVISÕES TRABALHISTAS (débito = despesa 6.1.1.03.xxx) ----`, adicionar:

```js
  // ---- FÉRIAS (folha de férias, Fortes Folha 4) ----
  // Proventos baixam a provisão de férias que o Rayo já constitui todo mês.
  { companyId: company.companyId, eventCode: '110', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: 'Remuneração de Férias', active: true },
  { companyId: company.companyId, eventCode: '111', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: '1/3 de Férias', active: true },
  { companyId: company.companyId, eventCode: '113', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: 'Abono Pecuniário', active: true },
  { companyId: company.companyId, eventCode: '950', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: '1/3 de Abono Pecuniário', active: true },
  { companyId: company.companyId, eventCode: '151', dealerAccountCode: '1.1.4.01.003', dealerLotAccountCode: null, dc: 'D', description: 'Adiantamento de 13º Salário (pago nas férias)', active: true },
  { companyId: company.companyId, eventCode: '301', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'C', description: 'Provisão Cred. Trab. - Desconto (contrapartida do evento 100)', active: true },
  { companyId: company.companyId, eventCode: '344', dealerAccountCode: '2.1.1.02.006', dealerLotAccountCode: null, dc: 'C', description: 'Pensão Alimentícia - Férias', active: true },

  // ---- RESCISÃO (Fortes Folha 10) ----
  { companyId: company.companyId, eventCode: '085', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'D', description: 'Reembolso Falta', active: true },
  { companyId: company.companyId, eventCode: '086', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'D', description: 'Reembolso DSR', active: true },
  { companyId: company.companyId, eventCode: '199', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'D', description: 'Saldo de Salário', active: true },
  { companyId: company.companyId, eventCode: '200', dealerAccountCode: '6.1.1.01.004', dealerLotAccountCode: null, dc: 'D', description: 'Aviso Prévio Indenizado', active: true },
  { companyId: company.companyId, eventCode: '203', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: 'Férias Vencidas', active: true },
  { companyId: company.companyId, eventCode: '205', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: 'Férias Proporcionais', active: true },
  { companyId: company.companyId, eventCode: '206', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: 'Férias (Aviso Prévio)', active: true },
  { companyId: company.companyId, eventCode: '211', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: '1/3 de Férias Vencidas', active: true },
  { companyId: company.companyId, eventCode: '212', dealerAccountCode: '2.1.1.03.001', dealerLotAccountCode: null, dc: 'D', description: '1/3 de Férias Proporcionais', active: true },
  { companyId: company.companyId, eventCode: '208', dealerAccountCode: '2.1.1.03.004', dealerLotAccountCode: null, dc: 'D', description: '13º Salário (Rescisão)', active: true },
  { companyId: company.companyId, eventCode: '209', dealerAccountCode: '2.1.1.03.004', dealerLotAccountCode: null, dc: 'D', description: '13º Salário (Aviso Prévio)', active: true },
  { companyId: company.companyId, eventCode: '450', dealerAccountCode: '1.1.4.01.003', dealerLotAccountCode: null, dc: 'C', description: 'Adiantamento 13º Salário - Compensação', active: true },
  { companyId: company.companyId, eventCode: '500', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'C', description: 'Aviso Prévio (desconto)', active: true },
  { companyId: company.companyId, eventCode: '501', dealerAccountCode: '6.1.1.01.002', dealerLotAccountCode: null, dc: 'C', description: 'Rescisão Antes do Prazo Determinado (desconto)', active: true },
  { companyId: company.companyId, eventCode: '502', dealerAccountCode: '2.1.1.02.001', dealerLotAccountCode: null, dc: 'C', description: 'INSS (Rescisão)', active: true },
  { companyId: company.companyId, eventCode: '504', dealerAccountCode: '2.1.1.02.001', dealerLotAccountCode: null, dc: 'C', description: 'INSS 13º Salário', active: true },
  { companyId: company.companyId, eventCode: '507', dealerAccountCode: '2.1.3.02.001', dealerLotAccountCode: null, dc: 'C', description: 'IRRF 13º Salário', active: true },
  { companyId: company.companyId, eventCode: '953', dealerAccountCode: '6.1.1.04.003', dealerLotAccountCode: null, dc: 'C', description: 'Ifood Benefícios não utilizado', active: true },
  { companyId: company.companyId, eventCode: '954', dealerAccountCode: '6.1.1.04.006', dealerLotAccountCode: null, dc: 'C', description: 'Vale-Transporte não utilizado', active: true },
  { companyId: company.companyId, eventCode: '957', dealerAccountCode: '6.1.1.01.006', dealerLotAccountCode: null, dc: 'C', description: 'Débito de Banco de Horas', active: true },
  { companyId: company.companyId, eventCode: '971', dealerAccountCode: '6.1.1.04.003', dealerLotAccountCode: null, dc: 'C', description: 'Vale-Refeição não utilizado', active: true },
  { companyId: company.companyId, eventCode: '972', dealerAccountCode: '6.1.1.01.006', dealerLotAccountCode: null, dc: 'C', description: 'Débito de Banco de Horas', active: true },

```

- [ ] **Step 5: Implement — Braga Veículos, informativos**

Substituir:

```js
const informativeEventCodes = ['600', '601', '602', '603', '604', '605', '937', '938'];
```

por:

```js
// 610/613/900/902/904: bases de cálculo e multa FGTS da rescisão (ProvDesc = 0).
const informativeEventCodes = [
  '600', '601', '602', '603', '604', '605', '610', '613', '900', '902', '904', '937', '938',
];
```

- [ ] **Step 6: Implement — Braga Motos, eventos de férias e rescisão**

Em `braga-motos.config.js`, dentro de `eventAccountMappings`, substituir o fim da lista:

```js
  { eventCode: '988', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Atrasos' },
];
```

por:

```js
  { eventCode: '988', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Atrasos' },

  // ---- FÉRIAS (folha de férias, Fortes Folha 4) ----
  // Proventos baixam a provisão de férias que o Rayo já constitui todo mês.
  { eventCode: '110', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: 'Remuneração de Férias' },
  { eventCode: '111', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: '1/3 de Férias' },
  { eventCode: '113', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: 'Abono Pecuniário' },
  { eventCode: '950', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: '1/3 de Abono Pecuniário' },
  { eventCode: '301', dealerAccountCode: '2.1.1.03.001', dc: 'C', description: 'Provisão Cred. Trab. - Desconto (contrapartida do evento 100)' },
  { eventCode: '344', dealerAccountCode: '2.1.1.02.006', dc: 'C', description: 'Pensão Alimentícia - Férias' },

  // ---- RESCISÃO (Fortes Folha 10) ----
  { eventCode: '025', dealerAccountCode: '2.1.1.02.001', dc: 'D', description: 'Salário-Família Retroativo' }, // compensa com INSS a recolher
  { eventCode: '105', dealerAccountCode: '6.1.1.01.003', dc: 'D', description: 'Prêmio Emplacamento Mês Anterior' },
  { eventCode: '160', dealerAccountCode: '2.1.1.03.004', dc: 'D', description: '13º Salário' },
  { eventCode: '200', dealerAccountCode: '6.1.1.01.004', dc: 'D', description: 'Aviso Prévio Indenizado' },
  { eventCode: '201', dealerAccountCode: '6.1.1.01.004', dc: 'D', description: 'Rescisão Antes do Prazo Determinado' },
  { eventCode: '203', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: 'Férias Vencidas' },
  { eventCode: '205', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: 'Férias Proporcionais' },
  { eventCode: '206', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: 'Férias (Aviso Prévio)' },
  { eventCode: '211', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: '1/3 de Férias Vencidas' },
  { eventCode: '212', dealerAccountCode: '2.1.1.03.001', dc: 'D', description: '1/3 de Férias Proporcionais' },
  { eventCode: '208', dealerAccountCode: '2.1.1.03.004', dc: 'D', description: '13º Salário (Rescisão)' },
  { eventCode: '209', dealerAccountCode: '2.1.1.03.004', dc: 'D', description: '13º Salário (Aviso Prévio)' },
  { eventCode: '213', dealerAccountCode: '2.1.1.02.001', dc: 'D', description: 'Sal. Maternidade 13º pago pela empresa' }, // compensa com INSS a recolher
  { eventCode: '122', dealerAccountCode: '6.1.1.04.006', dc: 'C', description: 'Vale-Transporte - Mês Anterior' },
  { eventCode: '129', dealerAccountCode: '6.1.1.01.006', dc: 'C', description: 'Débito de Banco de Horas' },
  { eventCode: '314', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS 13º Salário' },
  { eventCode: '500', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Aviso Prévio (desconto)' },
  { eventCode: '501', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Rescisão Antes do Prazo Determinado (desconto)' },
  { eventCode: '502', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS (Rescisão)' },
  { eventCode: '504', dealerAccountCode: '2.1.1.02.001', dc: 'C', description: 'INSS 13º Salário' },
  { eventCode: '930', dealerAccountCode: '6.1.1.01.006', dc: 'C', description: 'Débito de Banco de Horas' },
  { eventCode: '971', dealerAccountCode: '6.1.1.04.006', dc: 'C', description: 'Vale-Transporte não utilizado' },
  { eventCode: '972', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Ifood Benefícios não utilizado' },
  { eventCode: '980', dealerAccountCode: '6.1.1.04.003', dc: 'C', description: 'Vale-Refeição não utilizado' },
  { eventCode: '993', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'Desconto de Faltas' },
  { eventCode: '994', dealerAccountCode: '6.1.1.01.002', dc: 'C', description: 'DSR Desconto s/ Faltas' },
  { eventCode: '995', dealerAccountCode: '6.1.1.04.006', dc: 'C', description: 'Descontos de Vale-Transporte' },
];
```

- [ ] **Step 7: Trocar a asserção frágil do teste da Braga Motos**

Com os eventos de férias/rescisão — que têm o mesmo significado nas duas empresas — a sobreposição de códigos entre BV e BM cresce legitimamente, e a regra "menos da metade" deixa de medir o que importa. Em `apps/rayo/tests/folha-dealer-braga-motos-config.test.js`, substituir:

```js
    const motos = numeric(bragaMotosConfig.accountMappings);
    const veiculos = numeric(bragaVeiculosConfig.accountMappings);

    expect(motos.has('093:C')).toBe(false);
    expect(motos.has('093:D')).toBe(true);
    // Sobreposição legítima existe (310 INSS, 311 IRRF…), mas não pode ser total.
    const inherited = [...veiculos].filter((k) => motos.has(k));
    expect(inherited.length).toBeLessThan(veiculos.size / 2);
```

por:

```js
    const motos = numeric(bragaMotosConfig.accountMappings);

    // Códigos com significado diferente nas duas empresas: a Braga Motos segue
    // a natureza do próprio evento (tabela EVE da 9277), nunca a da BV.
    const naturezaMotos = {
      '093': 'D', '101': 'D', '102': 'D', '975': 'C', '977': 'C', '978': 'C', '979': 'C', '989': 'D',
    };
    for (const [code, dc] of Object.entries(naturezaMotos)) {
      expect(motos.has(`${code}:${dc}`)).toBe(true);
      expect(motos.has(`${code}:${dc === 'D' ? 'C' : 'D'}`)).toBe(false);
    }
```

O import de `bragaVeiculosConfig` continua: o arquivo ainda o usa no teste de empresa/filial Dealer e no de registro de empresas.

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-mappings.test.js tests/folha-dealer-braga-motos-config.test.js tests/folha-dealer-braga-veiculos-centers.test.js tests/folha-dealer-engine.test.js`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js apps/rayo/src/lib/folha-dealer/braga-motos.config.js apps/rayo/tests/folha-dealer-extra-payroll-mappings.test.js apps/rayo/tests/folha-dealer-braga-motos-config.test.js
git commit -m "feat(folha): contas de férias, rescisão e complementar nas duas empresas

Líquido de férias em 1.1.4.01.002 e de rescisão em 2.1.1.01.004, como
anotado pelo contador no Resumo Geral. Proventos de férias e 13º na
rescisão baixam as provisões (2.1.1.03.001 / 2.1.1.03.004).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Extractor — queries de férias, rescisão e complementar

**Files:**
- Create: `apps/rayo-server/fortes-extra-payroll-queries.js`
- Modify: `apps/rayo-server/fortes-extractor.js`
- Modify: `apps/rayo/vite-plugin-fortes-api.js` (`buildFortesExtractResponse`)
- Modify: `apps/rayo-server/index.js` (rota `POST /api/fortes/extract`)
- Test: `apps/rayo/tests/folha-dealer-extra-payroll-queries.test.js` (create)
- Test: `apps/rayo/tests/folha-dealer-vite-api.test.js` (modify)

**Interfaces:**
- Produces (CJS, `apps/rayo-server/fortes-extra-payroll-queries.js`):
  - `competenceDateRange(competence: 'YYYY-MM'): { dataIni: 'YYYY-MM-01', dataFim: 'YYYY-MM-01' }` — `dataFim` é o dia 1 do mês seguinte (exclusivo). Formato inválido lança `Error('Competência inválida: ...')`.
  - `buildExtraPayrollQuery(def): string`
  - `EXTRA_PAYROLL_QUERIES: { payrollType: 'FERIAS'|'RESCISAO'|'COMPLEMENTAR', sql: string }[]` — usa os parâmetros `@Company`, `@AnoMesParam`, `@DataIniParam`, `@DataFimParam`.
- Produces: `extractFortesPayroll(...)` passa a devolver também `extraPayroll: object[]` (linhas com `payrollType` e `lotacaoCode` = `LOT.Nome`); a resposta de `/api/fortes/extract` ganha `extraPayroll` (lista vazia quando não houver).

- [ ] **Step 1: Write the failing tests**

Criar `apps/rayo/tests/folha-dealer-extra-payroll-queries.test.js`:

```js
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  competenceDateRange,
  EXTRA_PAYROLL_QUERIES,
} = require('../../rayo-server/fortes-extra-payroll-queries.js');

describe('competenceDateRange', () => {
  it('vai do dia 1 da competência ao dia 1 do mês seguinte', () => {
    expect(competenceDateRange('2026-04')).toEqual({ dataIni: '2026-04-01', dataFim: '2026-05-01' });
  });

  it('dezembro vira para janeiro do ano seguinte', () => {
    expect(competenceDateRange('2026-12')).toEqual({ dataIni: '2026-12-01', dataFim: '2027-01-01' });
  });

  it('recusa competência fora do formato AAAA-MM', () => {
    expect(() => competenceDateRange('04-2026')).toThrow(/Competência inválida/);
    expect(() => competenceDateRange('2026-13')).toThrow(/Competência inválida/);
  });
});

describe('queries de férias, rescisão e complementar', () => {
  const sqlDe = (tipo) => EXTRA_PAYROLL_QUERIES.find((q) => q.payrollType === tipo).sql;

  it('cobre exatamente férias, rescisão e complementar', () => {
    expect(EXTRA_PAYROLL_QUERIES.map((q) => q.payrollType)).toEqual(['FERIAS', 'RESCISAO', 'COMPLEMENTAR']);
  });

  it('férias: Folha 4, só a folha raiz, competência pelo início do gozo', () => {
    const sql = sqlDe('FERIAS');
    expect(sql).toContain('FOL.Folha = 4');
    expect(sql).toContain('FOL.FOL_Seq_Pai IS NULL');
    expect(sql).toContain('FER.DtGozoInicial >= @DataIni');
    expect(sql).toContain("'FERIAS' AS payrollType");
  });

  it('rescisão: Folha 10, competência pela data de cálculo', () => {
    const sql = sqlDe('RESCISAO');
    expect(sql).toContain('FOL.Folha = 10');
    expect(sql).toContain('FOL.DtCalculo >= @DataIni');
    expect(sql).not.toContain('INNER JOIN FER');
  });

  it('complementar: Folha 17, competência pela data de referência', () => {
    const sql = sqlDe('COMPLEMENTAR');
    expect(sql).toContain('FOL.Folha = 17');
    expect(sql).toContain('FOL.DtReferencia >= @DataIni');
  });

  it('nunca lê o 13º rescisório (Folha 8), que repete eventos da rescisão', () => {
    for (const { sql } of EXTRA_PAYROLL_QUERIES) {
      expect(sql).not.toContain('FOL.Folha = 8');
    }
  });

  it('lotação cai para o último cadastro quando o vínculo da folha não resolve', () => {
    expect(sqlDe('RESCISAO')).toContain('COALESCE(SEP.LOT_Codigo, SEPU.LOT_Codigo)');
  });
});
```

Em `apps/rayo/tests/folha-dealer-vite-api.test.js`, antes do `});` final do `describe`, adicionar:

```js

  it('repassa férias, rescisão e complementar na resposta', () => {
    const response = buildFortesExtractResponse({
      payroll: [],
      extraPayroll: [{ payrollType: 'RESCISAO', eventCode: '200' }],
    });
    expect(response.extraPayroll).toEqual([{ payrollType: 'RESCISAO', eventCode: '200' }]);
  });

  it('sem férias/rescisão/complementar, responde lista vazia', () => {
    expect(buildFortesExtractResponse({ payroll: [] }).extraPayroll).toEqual([]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-queries.test.js tests/folha-dealer-vite-api.test.js`
Expected: FAIL — módulo inexistente; `extraPayroll` indefinido.

- [ ] **Step 3: Implement — módulo de queries**

Criar `apps/rayo-server/fortes-extra-payroll-queries.js`:

```js
/**
 * fortes-extra-payroll-queries.js — Férias, rescisão e folha complementar.
 *
 * No Fortes essas folhas não têm FPG (AnoMes/Tipo nulos), então a competência
 * sai de uma data própria de cada tipo. Regras conferidas ao centavo com o
 * "Resumo Geral do Mês/Período" do Fortes (BM 04/2026 e BV 01–08/2026):
 * - Férias (FOL.Folha = 4): mês de início do gozo (FER.DtGozoInicial). Só a
 *   folha raiz — as filhas de rescisão (FOL_Seq_Pai) repetem férias que já
 *   estão dentro da rescisão.
 * - Rescisão (FOL.Folha = 10): mês de FOL.DtCalculo. O 13º rescisório
 *   (FOL.Folha = 8) é filho da rescisão e repete os eventos 208/209: não entra.
 * - Complementar (FOL.Folha = 17): mês de FOL.DtReferencia.
 *
 * Lotação: vínculo da folha (EFO.SEP_Data); sem ele — comum na rescisão —,
 * o último cadastro SEP do empregado.
 */

const EXTRA_PAYROLL_TYPES = [
  { payrollType: 'FERIAS', folha: 4, competenceDate: 'FER.DtGozoInicial', joinFer: true, onlyRoot: true },
  { payrollType: 'RESCISAO', folha: 10, competenceDate: 'FOL.DtCalculo', joinFer: false, onlyRoot: false },
  { payrollType: 'COMPLEMENTAR', folha: 17, competenceDate: 'FOL.DtReferencia', joinFer: false, onlyRoot: false },
];

/**
 * @param {string} competence — AAAA-MM
 * @returns {{ dataIni: string, dataFim: string }} dataFim exclusivo (dia 1 do mês seguinte)
 */
function competenceDateRange(competence) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(competence || ''));
  const month = match ? Number(match[2]) : 0;
  if (!match || month < 1 || month > 12) {
    throw new Error(`Competência inválida: "${competence}" (esperado AAAA-MM).`);
  }
  const year = Number(match[1]);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const firstDay = (y, m) => `${y}-${String(m).padStart(2, '0')}-01`;
  return { dataIni: firstDay(year, month), dataFim: firstDay(nextYear, nextMonth) };
}

function buildExtraPayrollQuery({ payrollType, folha, competenceDate, joinFer, onlyRoot }) {
  return `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @DataIni DATE = CAST(@DataIniParam AS DATE);
DECLARE @DataFim DATE = CAST(@DataFimParam AS DATE);

SELECT
    EFO.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    @AnoMesParam AS competence,
    '${payrollType}' AS payrollType,
    EPG.Codigo AS employeeId,
    EPG.Nome AS employeeName,
    EFO.FOL_Seq AS sourcePayrollId,
    EFP.EVE_Codigo AS eventCode,
    EVE.NomeApr AS eventName,
    EVE.ProvDesc AS ProvDesc,
    CASE
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) = '1' THEN 'PROVENTO'
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('2', '-1') THEN 'DESCONTO'
        ELSE 'INFORMATIVO'
    END AS TipoRegistro,
    CAST(ROUND(EFP.Valor * 100, 0) AS INT) AS amountCents,
    EFP.Referencia AS sourceReference,
    ISNULL(COALESCE(SEP.LOT_Codigo, SEPU.LOT_Codigo), '') AS lotacaoCode,
    ISNULL(LOT.Nome, '') AS lotacaoName
FROM FOL (NOLOCK)
INNER JOIN EFO (NOLOCK)
    ON EFO.EMP_Codigo = FOL.EMP_Codigo
   AND EFO.FOL_Seq = FOL.Seq
${joinFer ? `INNER JOIN FER (NOLOCK)
    ON FER.EMP_Codigo = EFO.EMP_Codigo
   AND FER.EFO_FOL_Seq = EFO.FOL_Seq
   AND FER.EFO_EPG_Codigo = EFO.EPG_Codigo` : ''}
INNER JOIN EPG (NOLOCK)
    ON EPG.EMP_Codigo = EFO.EMP_Codigo
   AND EPG.Codigo = EFO.EPG_Codigo
INNER JOIN EFP (NOLOCK)
    ON EFP.EMP_Codigo = EFO.EMP_Codigo
   AND EFP.EFO_FOL_Seq = EFO.FOL_Seq
   AND EFP.EFO_EPG_Codigo = EFO.EPG_Codigo
LEFT JOIN EVE (NOLOCK)
    ON EVE.EMP_Codigo = EFP.EMP_Codigo
   AND EVE.Codigo = EFP.EVE_Codigo
LEFT JOIN EMP (NOLOCK)
    ON EMP.Codigo = EFO.EMP_Codigo
LEFT JOIN SEP (NOLOCK)
    ON SEP.EMP_Codigo = EFO.EMP_Codigo
   AND SEP.EPG_Codigo = EFO.EPG_Codigo
   AND SEP.Data = EFO.SEP_Data
OUTER APPLY (
    SELECT TOP 1 S2.LOT_Codigo
    FROM SEP S2 (NOLOCK)
    WHERE S2.EMP_Codigo = EFO.EMP_Codigo
      AND S2.EPG_Codigo = EFO.EPG_Codigo
    ORDER BY S2.Data DESC
) SEPU
LEFT JOIN LOT (NOLOCK)
    ON LOT.EMP_Codigo = EFO.EMP_Codigo
   AND LOT.Codigo = COALESCE(SEP.LOT_Codigo, SEPU.LOT_Codigo)
WHERE FOL.EMP_Codigo = @EmpresaCodigo
  AND FOL.Folha = ${folha}
  ${onlyRoot ? 'AND FOL.FOL_Seq_Pai IS NULL' : ''}
  AND ${competenceDate} >= @DataIni
  AND ${competenceDate} < @DataFim
ORDER BY EFO.FOL_Seq, EPG.Nome, EFP.EVE_Codigo;
`;
}

const EXTRA_PAYROLL_QUERIES = EXTRA_PAYROLL_TYPES.map((def) => ({
  payrollType: def.payrollType,
  sql: buildExtraPayrollQuery(def),
}));

module.exports = {
  EXTRA_PAYROLL_TYPES,
  EXTRA_PAYROLL_QUERIES,
  buildExtraPayrollQuery,
  competenceDateRange,
};
```

- [ ] **Step 4: Implement — extractor**

Em `apps/rayo-server/fortes-extractor.js`, substituir a primeira linha:

```js
const mssql = require('mssql');
```

por:

```js
const mssql = require('mssql');
const { EXTRA_PAYROLL_QUERIES, competenceDateRange } = require('./fortes-extra-payroll-queries');
```

Em `extractFortesPayroll`, depois de:

```js
  const anoMesStr = anoStr + (mesStr ? mesStr.padStart(2, '0') : '');
```

adicionar:

```js
  const { dataIni, dataFim } = competenceDateRange(`${anoMesStr.slice(0, 4)}-${anoMesStr.slice(4, 6)}`);
```

Substituir:

```js
        .input('AnoMesParam', mssql.VarChar(6), anoMesStr);
```

por:

```js
        .input('AnoMesParam', mssql.VarChar(6), anoMesStr)
        .input('DataIniParam', mssql.VarChar(10), dataIni)
        .input('DataFimParam', mssql.VarChar(10), dataFim);
```

Substituir:

```js
    const [payrollResult, prov13Result, provFerResult, encargoBaseResult, encargoTotalsResult] =
      await Promise.all([
        request().query(PAYROLL_QUERY),
        request().query(PROV_13_QUERY),
        request().query(PROV_FER_QUERY),
        request().query(ENCARGO_BASE_QUERY),
        request().query(ENCARGO_TOTALS_QUERY),
      ]);
```

por:

```js
    const [payrollResult, prov13Result, provFerResult, encargoBaseResult, encargoTotalsResult, ...extraResults] =
      await Promise.all([
        request().query(PAYROLL_QUERY),
        request().query(PROV_13_QUERY),
        request().query(PROV_FER_QUERY),
        request().query(ENCARGO_BASE_QUERY),
        request().query(ENCARGO_TOTALS_QUERY),
        ...EXTRA_PAYROLL_QUERIES.map((q) => request().query(q.sql)),
      ]);
```

Logo antes de `    const encargoBases = encargoBaseResult.recordset.map((row) => {`, adicionar:

```js
    // Férias, rescisão e complementar: mesma chave de lotação (LOT.Nome) da folha mensal
    const extraPayroll = extraResults.flatMap((result) =>
      result.recordset.map((row) => (row.lotacaoName ? { ...row, lotacaoCode: row.lotacaoName } : row))
    );

```

Substituir:

```js
        `Bases encargo eSocial=${encargoBases.length}; ` +
```

por:

```js
        `Bases encargo eSocial=${encargoBases.length}; ` +
        `Férias/rescisão/complementar=${extraPayroll.length} linhas; ` +
```

Substituir:

```js
    return {
      payroll,
      provisions,
```

por:

```js
    return {
      payroll,
      extraPayroll,
      provisions,
```

- [ ] **Step 5: Implement — respostas da API**

Em `apps/rayo/vite-plugin-fortes-api.js`, substituir:

```js
    encargoUnmapped: extracted.encargoUnmapped,
    encargoCoverage: extracted.encargoCoverage,
  };
```

por:

```js
    encargoUnmapped: extracted.encargoUnmapped,
    encargoCoverage: extracted.encargoCoverage,
    extraPayroll: extracted.extraPayroll || [],
  };
```

Em `apps/rayo-server/index.js`, substituir:

```js
            encargoUnmapped: extracted.encargoUnmapped,
            encargoCoverage: extracted.encargoCoverage,
```

por:

```js
            encargoUnmapped: extracted.encargoUnmapped,
            encargoCoverage: extracted.encargoCoverage,
            extraPayroll: extracted.extraPayroll || [],
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-extra-payroll-queries.test.js tests/folha-dealer-vite-api.test.js`
Expected: PASS.

Run também: `node -e "require('./apps/rayo-server/fortes-extractor.js'); console.log('ok')"` na raiz do repositório.
Expected: `ok` (o módulo carrega sem erro de sintaxe).

- [ ] **Step 7: Commit**

```bash
git add apps/rayo-server/fortes-extra-payroll-queries.js apps/rayo-server/fortes-extractor.js apps/rayo-server/index.js apps/rayo/vite-plugin-fortes-api.js apps/rayo/tests/folha-dealer-extra-payroll-queries.test.js apps/rayo/tests/folha-dealer-vite-api.test.js
git commit -m "feat(folha): extrair férias, rescisão e complementar do Fortes

Competência de cada tipo sai de uma data própria (gozo, cálculo,
referência), porque essas folhas não têm FPG. 13º rescisório e férias
filhas de rescisão ficam de fora: repetem valores da rescisão.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Resumo por tipo na tela e no Excel de conferência

**Files:**
- Create: `apps/rayo/src/lib/folha-dealer/payroll-type-summary.js`
- Create: `apps/rayo/src/components/FolhaDealerResumoPorTipo.jsx`
- Modify: `apps/rayo/src/lib/folha-dealer/index.js`
- Modify: `apps/rayo/src/hooks/useFolhaDealer.js`
- Modify: `apps/rayo/src/pages/FolhaDealerPage.jsx`
- Modify: `apps/rayo/src/lib/folha-dealer/conference-xlsx-exporter.js`
- Test: `apps/rayo/tests/folha-dealer-payroll-type-summary.test.js` (create)
- Test: `apps/rayo/tests/folha-dealer-conference-xlsx.test.js` (modify)

**Interfaces:**
- Consumes: `extraPayroll` da resposta da API (Task 5); `fortesExtraPayroll` do adapter (Task 2); `PAYROLL_TYPES`, `resolvePayrollType` (Task 1); `payrollType` em `sourceRows`, `entries` e `consolidatedItems` (Tasks 2–3).
- Produces: `summarizeByPayrollType(rows: PayrollSourceRow[]): { payrollType: string, label: string, proventosCents: number, descontosCents: number, liquidoCents: number, empregados: number }[]` — na ordem de `PAYROLL_TYPES`, só tipos presentes. `metadata.resumoPorTipo` no hook.

- [ ] **Step 1: Write the failing tests**

Criar `apps/rayo/tests/folha-dealer-payroll-type-summary.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';
import { summarizeByPayrollType } from '../src/lib/folha-dealer/payroll-type-summary.js';

const B = { companyId: '9277', competence: '202604', lotacaoCode: 'ADM' };
const rows = normalizeFortesQueryRows(
  [
    { ...B, employeeId: '1', eventCode: '011', amountCents: 300000, ProvDesc: 1 },
    { ...B, employeeId: '1', eventCode: '310', amountCents: 30000, ProvDesc: -1 },
    { ...B, employeeId: '9', eventCode: '604', amountCents: 50000, ProvDesc: 0 },
  ],
  {
    fortesExtraPayroll: [
      { ...B, payrollType: 'FERIAS', employeeId: '2', eventCode: '110', amountCents: 90000, ProvDesc: 1 },
      { ...B, payrollType: 'FERIAS', employeeId: '2', eventCode: '310', amountCents: 9000, ProvDesc: -1 },
    ],
  }
);

describe('summarizeByPayrollType', () => {
  it('fecha proventos, descontos, líquido e empregados por tipo, como o Resumo Geral do Fortes', () => {
    expect(summarizeByPayrollType(rows)).toEqual([
      { payrollType: 'MENSAL', label: 'Folha de Pagamento', proventosCents: 300000, descontosCents: 30000, liquidoCents: 270000, empregados: 2 },
      { payrollType: 'FERIAS', label: 'Férias', proventosCents: 90000, descontosCents: 9000, liquidoCents: 81000, empregados: 1 },
    ]);
  });

  it('não conta o líquido sintético como desconto', () => {
    const mensal = summarizeByPayrollType(rows).find((t) => t.payrollType === 'MENSAL');
    expect(mensal.descontosCents).toBe(30000);
  });

  it('lista vazia não quebra', () => {
    expect(summarizeByPayrollType([])).toEqual([]);
  });
});
```

Em `apps/rayo/tests/folha-dealer-conference-xlsx.test.js`, substituir:

```js
    const expectedSheets = [
      'Resumo',
      'Analítico',
```

por:

```js
    const expectedSheets = [
      'Resumo',
      'Resumo por Tipo',
      'Analítico',
```

No topo do mesmo arquivo, depois de `import * as XLSX from 'xlsx';`, adicionar:

```js
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';
```

E, antes do `});` final do `describe` principal, adicionar. O resumo usa linhas vindas do adapter porque as da fixture (`buildBragaRowsFortes`) não trazem `sourceRecordType`:

```js

  it('aba Resumo por Tipo traz o total da folha mensal no formato do Resumo Geral do Fortes', () => {
    const base = { companyId: 'braga-veiculos', competence: '202604', employeeId: '1', lotacaoCode: 'RECURSOS HUMANOS' };
    const sourceRows = normalizeFortesQueryRows([
      { ...base, eventCode: '011', amountCents: 300000, ProvDesc: 1 },
      { ...base, eventCode: '310', amountCents: 30000, ProvDesc: -1 },
    ]);
    const { workbook } = generateTestWorkbook({ sourceRows });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Resumo por Tipo']);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Tipo de Folha']).toBe('Folha de Pagamento');
    expect(rows[0].Empregados).toBe(1);
    expect(Object.keys(rows[0])).toEqual([
      'Tipo de Folha', 'Empregados', 'Proventos (R$)', 'Descontos (R$)', 'Líquido (R$)',
    ]);
  });

  it('lançamentos informam o tipo de folha', () => {
    const { workbook } = generateTestWorkbook();
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Lançamentos']);
    expect(rows.every((r) => r['Tipo de Folha'] === 'Folha de Pagamento')).toBe(true);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-payroll-type-summary.test.js tests/folha-dealer-conference-xlsx.test.js`
Expected: FAIL — módulo inexistente; aba e coluna ausentes.

- [ ] **Step 3: Implement — resumo por tipo**

Criar `apps/rayo/src/lib/folha-dealer/payroll-type-summary.js`:

```js
/**
 * payroll-type-summary.js — Totais por tipo de folha.
 *
 * Mesmo recorte do "Resumo Geral do Mês/Período" do Fortes (proventos,
 * descontos, líquido e empregados por Folha de Pagamento, Férias, Rescisão e
 * Complemento de Folha), para o contador conferir o lote contra o relatório
 * que já usa.
 */

import { PAYROLL_TYPES, resolvePayrollType } from './contracts.js';

const COUNTED_NATURES = new Set(['PROVENTO', 'DESCONTO', 'INFORMATIVO']);

/**
 * @param {object[]} rows — PayrollSourceRow[] normalizadas.
 * @returns {{ payrollType: string, label: string, proventosCents: number, descontosCents: number, liquidoCents: number, empregados: number }[]}
 */
export function summarizeByPayrollType(rows = []) {
  const byType = new Map();

  for (const row of rows) {
    // Líquido sintético sai como DESCONTO, mas não é desconto do empregado.
    if (row.sourceOrigin === 'fortes-query-derived') continue;
    const nature = row.sourceRecordType;
    if (!COUNTED_NATURES.has(nature)) continue;

    const payrollType = resolvePayrollType(row.payrollType);
    if (!byType.has(payrollType)) {
      byType.set(payrollType, { proventosCents: 0, descontosCents: 0, employees: new Set() });
    }
    const totals = byType.get(payrollType);
    const amount = Math.abs(Number(row.amountCents) || 0);
    if (nature === 'PROVENTO') totals.proventosCents += amount;
    if (nature === 'DESCONTO') totals.descontosCents += amount;
    if (row.employeeId) totals.employees.add(String(row.employeeId));
  }

  return Object.keys(PAYROLL_TYPES)
    .filter((payrollType) => byType.has(payrollType))
    .map((payrollType) => {
      const { proventosCents, descontosCents, employees } = byType.get(payrollType);
      return {
        payrollType,
        label: PAYROLL_TYPES[payrollType].label,
        proventosCents,
        descontosCents,
        liquidoCents: proventosCents - descontosCents,
        empregados: employees.size,
      };
    });
}
```

Em `apps/rayo/src/lib/folha-dealer/index.js`, substituir:

```js
export { summarizeValidationIssues } from './validation-summarizer.js';
```

por:

```js
export { summarizeValidationIssues } from './validation-summarizer.js';
export { summarizeByPayrollType } from './payroll-type-summary.js';
```

- [ ] **Step 4: Implement — Excel de conferência**

Em `conference-xlsx-exporter.js`, substituir a linha 2:

```js
import { BATCH_TYPE, buildHistory } from './contracts.js';
```

por:

```js
import { BATCH_TYPE, buildHistory, PAYROLL_TYPES, resolvePayrollType } from './contracts.js';
import { summarizeByPayrollType } from './payroll-type-summary.js';

const payrollTypeLabel = (payrollType) => PAYROLL_TYPES[resolvePayrollType(payrollType)].label;
```

Logo depois de:

```js
  XLSX.utils.book_append_sheet(wb, wsResume, 'Resumo');
```

adicionar:

```js

  // 1b. Aba Resumo por Tipo — mesmo recorte do "Resumo Geral do Mês/Período" do Fortes
  const resumoPorTipo = summarizeByPayrollType(run.sourceRows || []).map((t) => ({
    'Tipo de Folha': t.label,
    Empregados: t.empregados,
    'Proventos (R$)': formatReais(t.proventosCents),
    'Descontos (R$)': formatReais(t.descontosCents),
    'Líquido (R$)': formatReais(t.liquidoCents),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumoPorTipo), 'Resumo por Tipo');
```

Na aba Analítico, substituir:

```js
    'Código Evento': row.eventCode || '',
```

por:

```js
    'Tipo de Folha': payrollTypeLabel(row.payrollType),
    'Código Evento': row.eventCode || '',
```

Na aba Lançamentos, substituir:

```js
    'Lotação Fortes': e.lotacaoCode || '',
```

por:

```js
    'Tipo de Folha': payrollTypeLabel(e.payrollType),
    'Lotação Fortes': e.lotacaoCode || '',
```

Na aba Consolidado, substituir:

```js
    Lotação: c.lotacaoCode,
```

por:

```js
    'Tipo de Folha': payrollTypeLabel(c.payrollType),
    Lotação: c.lotacaoCode,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/rayo && npx vitest run tests/folha-dealer-payroll-type-summary.test.js tests/folha-dealer-conference-xlsx.test.js`
Expected: PASS.

- [ ] **Step 6: Implement — hook**

Em `apps/rayo/src/hooks/useFolhaDealer.js`, no import de `'../lib/folha-dealer'`, substituir:

```js
  summarizeValidationIssues
} from '../lib/folha-dealer';
```

por:

```js
  summarizeValidationIssues,
  summarizeByPayrollType
} from '../lib/folha-dealer';
```

Em `extractFromDatabase`, substituir:

```js
          fortesEncargoBases: Array.isArray(result.encargoBases) ? result.encargoBases : [],
        },
```

por:

```js
          fortesEncargoBases: Array.isArray(result.encargoBases) ? result.encargoBases : [],
          fortesExtraPayroll: Array.isArray(result.extraPayroll) ? result.extraPayroll : [],
        },
```

E substituir:

```js
      payrollRows = payrollRows.map(row => ({
        ...row,
        companyId: baseConfig.company.companyId
      }));

      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig(baseConfig);
      const extractWarning = [
```

por:

```js
      payrollRows = payrollRows.map(row => ({
        ...row,
        companyId: baseConfig.company.companyId
      }));
      setMetadata((prev) => ({ ...prev, resumoPorTipo: summarizeByPayrollType(payrollRows) }));

      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig(baseConfig);
      const extractWarning = [
```

- [ ] **Step 7: Implement — card na tela**

Criar `apps/rayo/src/components/FolhaDealerResumoPorTipo.jsx`:

```jsx
/**
 * Totais por tipo de folha no formato do "Resumo Geral do Mês/Período" do
 * Fortes, para o contador conferir o lote com o relatório que já usa.
 */
const formatCurrency = (cents) =>
   (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FolhaDealerResumoPorTipo({ resumo }) {
   if (!resumo?.length) return null;

   return (
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-[1.5rem] p-6 flex flex-col gap-4">
         <h3 className="font-bold text-slate-900 text-sm">Conferência com o Resumo Geral</h3>
         <div className="flex flex-col gap-3">
            {resumo.map((tipo) => (
               <div key={tipo.payrollType} className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-semibold text-slate-700">{tipo.label}</span>
                     <span className="text-[10px] text-slate-400">{tipo.empregados} empregado(s)</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-500">
                     <span>Proventos</span>
                     <span>{formatCurrency(tipo.proventosCents)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-500">
                     <span>Descontos</span>
                     <span>{formatCurrency(tipo.descontosCents)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-800 font-semibold">
                     <span>Líquido</span>
                     <span>{formatCurrency(tipo.liquidoCents)}</span>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}
```

Em `apps/rayo/src/pages/FolhaDealerPage.jsx`, substituir:

```jsx
import FolhaDealerCadastrosPanel, { QuickLotacaoMappingModal } from '../components/FolhaDealerCadastrosPanel';
```

por:

```jsx
import FolhaDealerCadastrosPanel, { QuickLotacaoMappingModal } from '../components/FolhaDealerCadastrosPanel';
import FolhaDealerResumoPorTipo from '../components/FolhaDealerResumoPorTipo';
```

E substituir:

```jsx
                     className="w-72 shrink-0 flex flex-col gap-4 sticky top-28"
                  >
```

por:

```jsx
                     className="w-72 shrink-0 flex flex-col gap-4 sticky top-28"
                  >
                     <FolhaDealerResumoPorTipo resumo={metadata?.resumoPorTipo} />
```

- [ ] **Step 8: Build e testes**

Run: `cd apps/rayo && npx vite build 2>&1 | tail -3 && npx vitest run tests/folha-dealer-payroll-type-summary.test.js tests/folha-dealer-conference-xlsx.test.js`
Expected: `✓ built`; testes PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/rayo/src/lib/folha-dealer/payroll-type-summary.js apps/rayo/src/lib/folha-dealer/index.js apps/rayo/src/lib/folha-dealer/conference-xlsx-exporter.js apps/rayo/src/hooks/useFolhaDealer.js apps/rayo/src/pages/FolhaDealerPage.jsx apps/rayo/src/components/FolhaDealerResumoPorTipo.jsx apps/rayo/tests/folha-dealer-payroll-type-summary.test.js apps/rayo/tests/folha-dealer-conference-xlsx.test.js
git commit -m "feat(folha): conferência por tipo de folha na tela e no Excel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Reconciliação contra o Resumo Geral do contador

**Files:**
- Create: `apps/rayo-server/scripts/reconcile-payroll-types.mjs`
- Modify: `docs/folha-dealer/business-rules.md` (adicionar seção no fim)

**Interfaces:**
- Consumes: `extractFortesPayroll` → `extraPayroll` (Task 5); `normalizeFortesQueryRows` (Task 2); `summarizeByPayrollType` (Task 6); `getCompanyConfigByFortesCode`, `createFolhaDealerRun`, `mergeCenterMappings`, `mergeAccountMappings`, `loadCentersConfig` (já existentes).
- Produces: script de linha de comando, sem export.

- [ ] **Step 1: Criar o script**

Criar `apps/rayo-server/scripts/reconcile-payroll-types.mjs`:

```js
/**
 * Confere o que o Rayo extrai do Fortes contra o "Resumo Geral do Mês/Período".
 *
 * Uso: node apps/rayo-server/scripts/reconcile-payroll-types.mjs <empresaFortes> <AAAA-MM> [AAAA-MM final]
 * Ex.: node apps/rayo-server/scripts/reconcile-payroll-types.mjs 9277 2026-04
 *      node apps/rayo-server/scripts/reconcile-payroll-types.mjs 9274 2026-01 2026-08
 *
 * Imprime, por tipo de folha, proventos/descontos/líquido (somados no período)
 * e, para cada competência, o status do lote, débito × crédito e os bloqueios.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { extractFortesPayroll } = require('../fortes-extractor.js');
const { loadCentersConfig } = require('../folha-dealer-centers-store.js');

const lib = (file) => new URL(`../../rayo/src/lib/folha-dealer/${file}`, import.meta.url).href;
const { normalizeFortesQueryRows } = await import(lib('fortes-query-adapter.js'));
const { summarizeByPayrollType } = await import(lib('payroll-type-summary.js'));
const { getCompanyConfigByFortesCode } = await import(lib('company-configs.js'));
const { createFolhaDealerRun } = await import(lib('folha-dealer-run-service.js'));
const { mergeCenterMappings, mergeAccountMappings } = await import(lib('merge-center-config.js'));

const COMPETENCE = /^\d{4}-\d{2}$/;
const [empresa, inicio, fim = inicio] = process.argv.slice(2);
if (!empresa || !COMPETENCE.test(inicio || '') || !COMPETENCE.test(fim)) {
  console.error('Uso: node apps/rayo-server/scripts/reconcile-payroll-types.mjs <empresaFortes> <AAAA-MM> [AAAA-MM final]');
  process.exit(1);
}

function* competencias(ini, end) {
  let [year, month] = ini.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    yield `${year}-${String(month).padStart(2, '0')}`;
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
}

const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const baseConfig = getCompanyConfigByFortesCode(empresa);
const companyId = baseConfig.company.companyId;
const stored = loadCentersConfig(companyId);
const config = {
  ...baseConfig,
  centerMappings: mergeCenterMappings(baseConfig.centerMappings, stored, companyId),
  accountMappings: mergeAccountMappings(baseConfig.accountMappings, stored, companyId),
};

const totais = new Map();
const lotes = [];
const semLotacao = new Map();

for (const competence of competencias(inicio, fim)) {
  const ex = await extractFortesPayroll({ companyId: empresa, competence });

  for (const row of ex.extraPayroll) {
    if (!row.lotacaoCode) {
      const set = semLotacao.get(row.payrollType) || new Set();
      set.add(`${competence}:${row.employeeId}`);
      semLotacao.set(row.payrollType, set);
    }
  }

  const rows = normalizeFortesQueryRows(
    ex.payroll,
    { fortesProvisions: ex.provisions, fortesEncargoBases: ex.encargoBases, fortesExtraPayroll: ex.extraPayroll },
    config.provisionRates,
    config.encargoRates
  ).map((row) => ({ ...row, companyId }));

  for (const t of summarizeByPayrollType(rows)) {
    const acc = totais.get(t.payrollType) || { label: t.label, proventosCents: 0, descontosCents: 0, empregados: 0 };
    acc.proventosCents += t.proventosCents;
    acc.descontosCents += t.descontosCents;
    acc.empregados += t.empregados;
    totais.set(t.payrollType, acc);
  }

  const run = createFolhaDealerRun(rows, { config, competence });
  const soma = (dc) => run.entries.filter((e) => e.dc === dc).reduce((s, e) => s + e.amountCents, 0);
  const bloqueios = {};
  for (const issue of run.issues.filter((i) => i.severity === 'blocker')) {
    bloqueios[issue.code] = (bloqueios[issue.code] || 0) + 1;
  }
  lotes.push({ competence, status: run.status, debito: soma('D'), credito: soma('C'), bloqueios });
}

console.log(`\n${baseConfig.company.companyName} (${empresa}) — ${inicio} a ${fim}\n`);
console.log('Tipo de folha'.padEnd(24), 'Empregados'.padStart(10), 'Proventos'.padStart(16), 'Descontos'.padStart(16), 'Líquido'.padStart(16));
let geralP = 0;
let geralD = 0;
for (const t of totais.values()) {
  geralP += t.proventosCents;
  geralD += t.descontosCents;
  console.log(
    t.label.padEnd(24),
    String(t.empregados).padStart(10),
    brl(t.proventosCents).padStart(16),
    brl(t.descontosCents).padStart(16),
    brl(t.proventosCents - t.descontosCents).padStart(16)
  );
}
console.log('Total Geral'.padEnd(24), ''.padStart(10), brl(geralP).padStart(16), brl(geralD).padStart(16), brl(geralP - geralD).padStart(16));
console.log('\n(Empregados é soma por competência — só compare com o Resumo em período de um mês.)');

console.log('\nSem lotação (empregado × competência):',
  semLotacao.size === 0 ? 'nenhum' : [...semLotacao].map(([tipo, set]) => `${tipo}=${set.size}`).join(', '));

console.log('\nLotes:');
for (const l of lotes) {
  const blq = Object.keys(l.bloqueios).length ? JSON.stringify(l.bloqueios) : 'sem bloqueio';
  console.log(`  ${l.competence}  ${l.status.padEnd(8)}  D ${brl(l.debito).padStart(14)}  C ${brl(l.credito).padStart(14)}  ${blq}`);
}
```

- [ ] **Step 2: Rodar contra o Resumo da Braga Motos (04/2026)**

Run: `node apps/rayo-server/scripts/reconcile-payroll-types.mjs 9277 2026-04`

Expected — idêntico ao PDF `novos/RELATORIO FOPAG COMPLETA.pdf`:

| Tipo | Empregados | Proventos | Descontos | Líquido |
|---|---|---|---|---|
| Folha de Pagamento | — | 389.876,36 | 90.785,01 | 299.091,35 |
| Férias | 6 | 16.437,45 | 4.305,66 | 12.131,79 |
| Rescisão | 15 | 37.914,62 | 21.416,64 | 16.497,98 |
| Complemento de Folha | 63 | 30.050,30 | 1.589,57 | 28.460,73 |
| **Total Geral** | | **474.278,73** | **118.096,88** | **356.181,85** |

E: `Sem lotação: nenhum`; lote `2026-04  ready` com D = C e `sem bloqueio`.

Os valores em reais são o critério obrigatório. A contagem de empregados considera só quem tem evento: na folha mensal dá 182 (o Resumo mostra 188) e na complementar 63 (o Resumo mostra 64, há um empregado sem nenhum evento) — diferença esperada, não é defeito.

Se algum valor divergir: rodar a query do tipo divergente direto no banco (copiar de `EXTRA_PAYROLL_QUERIES`) e comparar evento a evento com a seção correspondente do PDF antes de mexer em código.

- [ ] **Step 3: Rodar contra o Resumo da Braga Veículos (01–08/2026)**

Run: `node apps/rayo-server/scripts/reconcile-payroll-types.mjs 9274 2026-01 2026-08`

Expected — idêntico ao `novos/Resumo Geral do MêsPeríodo 2026.xlsx`:

| Tipo | Proventos | Descontos | Líquido |
|---|---|---|---|
| Folha de Pagamento | 3.542.194,85 | 745.851,66 | 2.796.343,19 |
| Férias | 152.230,28 | 29.470,16 | 122.760,12 |
| Rescisão | 148.219,38 | 47.166,02 | 101.053,36 |
| Complemento de Folha | 13.359,93 | 142,52 | 13.217,41 |
| **Total Geral** | **3.856.004,44** | **822.630,36** | **3.033.374,08** |

E: `Sem lotação: nenhum`. Nos lotes, D = C em todas as competências. Competências que já estavam bloqueadas antes deste trabalho por lotação nova sem de-para (`MISSING_CENTER_MAPPING`, ex.: "BRAGA VEÍCULOS - LEADS" em 06–08/2026) continuam assim — é cadastro do contador, fora deste plano. Nenhuma pode ter `MISSING_ACCOUNT_MAPPING`.

- [ ] **Step 4: Documentar a regra de negócio**

No fim de `docs/folha-dealer/business-rules.md`, adicionar:

```markdown

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
- A multa de 40% do FGTS (evento 900) é informativa e não gera lançamento — precisa de regra própria.
- Para conferir contra o Resumo Geral: `node apps/rayo-server/scripts/reconcile-payroll-types.mjs <empresaFortes> <AAAA-MM> [AAAA-MM final]`.
```

- [ ] **Step 5: Suíte completa, lint e build**

Run: `cd apps/rayo && npx vitest run 2>&1 | tail -5 && npx eslint src tests 2>&1 | tail -10 && npx vite build 2>&1 | tail -2`
Expected: somente as 6 falhas já existentes (`folha-dealer-dealer-txt-exporter`, `folha-dealer-dealer-txt-layout`, `jr-regression`); ESLint sem erro nos arquivos tocados; `✓ built`.

- [ ] **Step 6: Commit**

```bash
git add apps/rayo-server/scripts/reconcile-payroll-types.mjs docs/folha-dealer/business-rules.md
git commit -m "docs(folha): regra de férias/rescisão/complementar e script de reconciliação

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
