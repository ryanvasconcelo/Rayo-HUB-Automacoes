aplique a correcao, faca testes de regressao, se passarem, faca o commit e push

Correção já aplicada e no remote (6cabf6c).

Regressão

90/90 nos testes Folha Dealer ligados à correção (encargo, adapter, engine, centers, merge, conference, run, dates, fetcher)
Conferência Fortes AGENDAMENTOS 04/2026: INSS 4.472,42 · RAT 223,62 · Terceiros 1.296,99 · FGTS 1.788,92
5 falhas em dealer-txt-* são antigas (layout/datas/lote) e não vêm deste fix
Commit/push: nada pendente — branch feat/folha-dealer-cadastro-centros já está sincronizada com origin. zIssue.md continua untracked de propósito.

vamos procurar bugs como esses, para antecipar isso

Auditei o pipeline pela mesma classe dos bugs PROV (sinal) e ENCARGO (base sintéica + alíquota). Detalhe no canvas folha-dealer-bug-hunt.

Padrão: trocar fonte oficial Fortes/eSocial por cálculo interno, ou apagar sinal/lotação.

Alta (4)

provisions: [] → Array.isArray desliga Fortes e o fallback → mês sem PRD/PRF zera PROV_*
Folha mensal sai sem lotação ('') → depende do mapa estático
employeeLotacaoMap sobrescreve lotação que já veio do Fortes
CSV não passa IncideFGTS/TipoRegistro → sintético de PROV/ENCARGO quebra ou erra (ainda com P−D + 28,80%)
Média: FGTS tipos ≠ 11 (~R$ 1.483 fora em 04/2026); FAP/RAT hardcoded; LIQUIDO_FOLHA só se > 0; fallback de provisão ainda na BC antiga.

Em abr/2026 o mapa bateu 100% com o Fortes — o risco é estrutural, não divergência atual.

Quer que eu comece pelos 4 altos (nessa ordem)?

execute essas correcoes (meu outro agente ficou sem tokens pra finalizar), se houver algumas duvida sobre elas, me pergunte, nao execute enquanto existirem duvidas:

Auditei o pipeline pela mesma classe dos bugs PROV (sinal) e ENCARGO (base sintéica + alíquota). Detalhe no canvas folha-dealer-bug-hunt.

Padrão: trocar fonte oficial Fortes/eSocial por cálculo interno, ou apagar sinal/lotação.

Alta (4)

provisions: [] → Array.isArray desliga Fortes e o fallback → mês sem PRD/PRF zera PROV_*
Folha mensal sai sem lotação ('') → depende do mapa estático
employeeLotacaoMap sobrescreve lotação que já veio do Fortes
CSV não passa IncideFGTS/TipoRegistro → sintético de PROV/ENCARGO quebra ou erra (ainda com P−D + 28,80%)
Média: FGTS tipos ≠ 11 (~R$ 1.483 fora em 04/2026); FAP/RAT hardcoded; LIQUIDO_FOLHA só se > 0; fallback de provisão ainda na BC antiga.

Em abr/2026 o mapa bateu 100% com o Fortes — o risco é estrutural, não divergência atual.

o fortes/esocial e dados vindos de la devem ser a fonte de verdade principal

Vou ler o código e o relatório antes de mexer em qualquer coisa.

Bash Inspect issue file and folha-dealer files
IN
head -c 3000 zIssue.md; echo; git ls-files | grep -i folha-dealer | head -60; cat /Users/ryanrichard/.claude/projects/-Users-ryanrichard-projecont-Rayo/memory/project_rayo_hub.md

OUT
**vamos precisar montar a base do de para antes de iniciar o processo de engenharia**  

# plano/projeto de eng de sw

## 1. Levantamento de Requisitos (enxuto)
• Entrada de Dados: Importação de arquivo de extrato bancário

• Motor de De/Para: Regras para associar um fornecedor a uma conta

• Interface de Resolução: 
    1. Tela simples para tratar manualmente os lançamentos que o sistema
    não conseguiu associar sozinhos.
    2. Tela simples de exibicao para validacao humana

• Exportação: Relatório ou arquivo estruturado (.CSV) dos lançamentos já categorizados e
conciliados no modelo de importacao fortesERP

## 2. Projeto e Design Técnico
• Arquitetura: Aplicação web nuvem (possivelmente Python, Flask e SQLite)

• Estrutura de Banco de Dados Básica:
    Tabela Campos Principais
    Extrato Importado Data, Descrição Original, Valor, Status (Conciliado/Pendente)
    Regras De/Para, Termo de Busca (Texto Banco), Destino, Conta Contábil

## 3. Implementação (Sprint de Código)
• Passo 1: Desenvolver o parser do arquivo (ler o .pdf ou .CSV e salvar temporariamente).

• Passo 2: Criar a lógica do motor de busca (fazer um loop buscando o termo da regra dentro da
descrição do banco)

• Passo 3: Montar a tela para exibir, tela de ajustes, a tabela e o formulário para salvar novas regras
dinamicamente

## 4. Testes e Validação
• Usar um arquivo real de extrato bancário antigo para rodar o motor e verificar falsos positivos

• Validar se ao criar uma nova regra 'De/Para' na tela, os itens correspondentes mudam de status
automaticamente

apps/rayo-server/folha-dealer-centers-seed-braga.json
apps/rayo-server/folha-dealer-centers-store.js
apps/rayo/src/lib/folha-dealer/account-mapper.js
apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js
apps/rayo/src/lib/folha-dealer/braga-veiculos.fixtures.js
apps/rayo/src/lib/folha-dealer/center-mapper.js
apps/rayo/src/lib/folha-dealer/centers-config-api.js
apps/rayo/src/lib/folha-dealer/conference-xlsx-exporter.js
apps/rayo/src/lib/folha-dealer/contracts.js
apps/rayo/src/lib/folha-dealer/date-helpers.js
apps/rayo/src/lib/folha-dealer/dealer-txt-exporter.js
apps/rayo/src/lib/folha-dealer/dealer-txt-layout.js
apps/rayo/src/lib/folha-dealer/employee-lotacao-map.js
apps/rayo/src/lib/folha-dealer/encargo-calculator.js
apps/rayo/src/lib/folha-dealer/folha-dealer-run-service.js
apps/rayo/src/lib/folha-dealer/folha-validator.js
apps/rayo/src/lib/folha-dealer/fortes-csv-parser.js
apps/rayo/src/lib/folha-dealer/fortes-data-fetcher.js
apps/rayo/src/lib/folha-dealer/fortes-normalizer.js
apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js
apps/rayo/src/lib/folha-dealer/index.js
apps/rayo/src/lib/folha-dealer/journal-builder.js
apps/rayo/src/lib/folha-dealer/merge-center-config.js
apps/rayo/src/lib/folha-dealer/payroll-consolidator.js
apps/rayo/src/lib/folha-dealer/pdf-report-generator.js
apps/rayo/src/lib/folha-dealer/provision-calculator.js
apps/rayo/src/lib/folha-dealer/validation-summarizer.js
apps/rayo/tests/folha-dealer-centers-store.test.js
apps/rayo/tests/folha-dealer-conference-xlsx.test.js
apps/rayo/tests/folha-dealer-date-helpers.test.js
apps/rayo/tests/folha-dealer-dealer-txt-exporter.test.js
apps/rayo/tests/folha-dealer-dealer-txt-layout.test.js
apps/rayo/tests/folha-dealer-encargo-calculator.test.js
apps/rayo/tests/folha-dealer-engine.test.js
apps/rayo/tests/folha-dealer-fortes-data-fetcher.test.js
apps/rayo/tests/folha-dealer-fortes-query-adapter.test.js
apps/rayo/tests/folha-dealer-merge-center-config.test.js
apps/rayo/tests/folha-dealer-run-service.test.js
docs/folha-dealer/braga-veiculos.md
docs/folha-dealer/business-rules.md
docs/folha-dealer/checklist-validacao-dealer.md
docs/folha-dealer/data-contracts.md
docs/folha-dealer/dealer-txt-layout-diagnosis.md
docs/folha-dealer/dealer-txt-layout.md
docs/folha-dealer/fortes-query-map.md
docs/folha-dealer/guia-operacional.md
docs/folha-dealer/implementation-plan.md
docs/folha-dealer/objective.md
docs/folha-dealer/pendencias-producao.md
docs/folha-dealer/reference-files.md
docs/folha-dealer/scope.md
---
name: Rayo Hub Project Overview
description: Monorepo fiscal automation hub; key stack, patterns, and module structure
type: project
---

React 19 + Vite monorepo (`apps/rayo` frontend, `packages/sped-core` shared lib).
SPED files are EFD-ICMS (not EFD-Contribuições despite sped-core naming).

**Key patterns:**
- All processing is client-side (no upload to server, LGPD compliant)
- Inline styles with CSS custom properties (`var(--text-primary)`, `var(--bg-secondary)`, etc.)
- AppLayout wraps all module pages with breadcrumbs
- File drops use DropZone pattern with FileReader
- Virtual scrolling with react-virtuoso for large lists
- Export: `xlsx-js-style` (not plain `xlsx`) for cell styling, jsPDF+autoTable for PDF

**SPED EFD field positions (split by `|`, 0-indexed):**
- C100: [1]=REG, [2]=IND_OPER, [3]=IND_EMIT, [4]=COD_PART, [8]=NUM_DOC, [9]=CHV_NFE
- C170: [1]=REG, [2]=NUM_ITEM, [3]=COD_ITEM, [4]=DESCR_COMPL, [7]=VL_ITEM
- 0200: [1]=REG, [2]=COD_ITEM, [3]=DESCR_ITEM, [4]=COD_BARRA

**Why:** sped-core/parser.js FIELDS constants are offset by +1 from actual array indices (designed for a different context). Use raw field indices in new code.

**How to apply:** Always use raw array index from split('|') in new SPED parsing code, not the FIELDS constants from sped-core.
Artifact
OUT
No published artifacts yet.
O canvas do outro agente não está acessível daqui, então vou trabalhar a partir do código.

Bash Read core pipeline files
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo/src/lib/folha-dealer && wc -l *.js && cat folha-dealer-run-service.js payroll-consolidator.js provision-calculator.js encargo-calculator.js employee-lotacao-map.js

OUT
      20 account-mapper.js
     273 braga-veiculos.config.js
     214 braga-veiculos.fixtures.js
      27 center-mapper.js
      58 centers-config-api.js
     216 conference-xlsx-exporter.js
      82 contracts.js
      20 date-helpers.js
     217 dealer-txt-exporter.js
     499 dealer-txt-layout.js
     160 employee-lotacao-map.js
     269 encargo-calculator.js
      93 folha-dealer-run-service.js
      67 folha-validator.js
      82 fortes-csv-parser.js
     101 fortes-data-fetcher.js
      63 fortes-normalizer.js
     215 fortes-query-adapter.js
     106 index.js
     183 journal-builder.js
     127 merge-center-config.js
      46 payroll-consolidator.js
     166 pdf-report-generator.js
     151 provision-calculator.js
      77 validation-summarizer.js
    3532 total
import { runFolhaDealerEngine } from './index.js';
import { exportDealerTxt } from './dealer-txt-exporter.js';
import { exportConferenceXlsx } from './conference-xlsx-exporter.js';

/**
 * Cria uma execução do motor contábil Folha -> Dealer.
 * @param {object[]} sourceRows - Linhas da origem (PayrollSourceRow[]).
 * @param {object} options - Opções, contendo `config` e `competence`.
 * @returns {object} PayrollAccountingRun
 */
export function createFolhaDealerRun(sourceRows, options) {
  console.log("createFolhaDealerRun args:", sourceRows?.length, options ? Object.keys(options) : "OPTIONS IS UNDEFINED");
  return runFolhaDealerEngine({
    sourceRows,
    config: options.config,
    competence: options.competence
  });
}

/**
 * Registra a aprovação da execução.
 * @param {object} run - O resultado do motor (PayrollAccountingRun).
 * @param {object} approvalData - Dados da aprovação (approvedBy, approvedAt, notes).
 * @returns {object} Novo PayrollAccountingRun atualizado.
 */
export function approveFolhaDealerRun(run, approvalData) {
  if (run.status !== 'ready') {
    throw new Error(`Não é possível aprovar uma execução com status '${run.status}'.`);
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const entry of run.entries || []) {
    if (entry.dc === 'D') {
      totalDebit += entry.amountCents;
    } else if (entry.dc === 'C') {
      totalCredit += entry.amountCents;
    }
  }

  return {
    ...run,
    status: 'approved',
    approval: {
      approvedBy: approvalData.approvedBy,
      approvedAt: approvalData.approvedAt || new Date().toISOString(),
      notes: approvalData.notes || null,
      entriesCount: run.entries ? run.entries.length : 0,
      issuesCount: run.issues ? run.issues.length : 0,
      totals: {
        debitCents: totalDebit,
        creditCents: totalCredit
      }
    }
  };
}

/**
 * Exporta o arquivo TXT do Dealer após aprovação.
 * @param {object} run - O resultado do motor com status 'approved'.
 * @param {object} options - Opções de layout (dealerCompanyField, dealerBranchField, accountingDate).
 * @returns {{ run: object, content: string }}
 */
export function exportApprovedDealerTxt(run, options) {
  if (run.status !== 'approved') {
    throw new Error(`Execução não aprovada. Status atual: ${run.status}.`);
  }

  const exportResult = exportDealerTxt(run, options);

  if (exportResult.issues && exportResult.issues.length > 0) {
    throw new Error(`Falha na exportação do TXT: ${exportResult.issues[0].message}`);
  }

  return {
    run: {
      ...run,
      status: 'exported',
      exportMetadata: exportResult.metadata
    },
    content: exportResult.content
  };
}

/**
 * Exporta a planilha de conferência. Pode ser gerada mesmo com blockers.
 * @param {object} run - Resultado do motor (PayrollAccountingRun).
 * @param {object} options - Opções contendo `config`.
 * @returns {Buffer} XLSX Buffer
 */
export function exportRunConferenceXlsx(run, options) {
  return exportConferenceXlsx(run, options.config);
}
/**
 * payroll-consolidator.js — Consolida PayrollSourceRow por chave de agrupamento.
 *
 * Chave de consolidação:
 *   companyId + competence + lotacaoCode + eventCode
 *
 * Resultado: ConsolidatedPayrollItem[].
 */

/**
 * @param {object[]} rows — PayrollSourceRow normalizadas.
 * @returns {object[]} — ConsolidatedPayrollItem[].
 */
export function consolidatePayrollRows(rows) {
  const map = new Map();

  for (const row of rows) {
    const key = `${row.companyId}|${row.competence}|${row.lotacaoCode}|${row.eventCode}`;

    if (map.has(key)) {
      const item = map.get(key);
      item.amountCents += row.amountCents;
      item.sourceCount += 1;
      // Após agregar mais de uma origem, perde identidade de um único empregado
      if (item.sourceCount > 1) {
        item.employeeId = null;
        item.employeeName = null;
      }
    } else {
      map.set(key, {
        companyId: row.companyId,
        competence: row.competence,
        lotacaoCode: row.lotacaoCode,
        lotacaoName: row.lotacaoName || null,
        eventCode: row.eventCode,
        eventName: row.eventName || null,
        amountCents: row.amountCents,
        sourceCount: 1,
        employeeId: row.employeeId != null ? String(row.employeeId) : null,
        employeeName: row.employeeName || null,
      });
    }
  }

  return Array.from(map.values());
}
/**
 * provision-calculator.js — Fallback sintético de provisões (taxa × BC-FGTS).
 *
 * No fluxo Braga com extract do banco, as provisões vêm de PRD/PRF no Fortes
 * (`sourceOrigin: fortes-provision`) e este módulo NÃO é chamado.
 *
 * Provisões geradas por lotação (fallback CSV / sem Fortes):
 *   PROV_FERIAS    → Férias + 1/3 de Férias
 *   PROV_13        → 13º Salário
 *   PROV_INSS_FER  → INSS Patronal s/ Férias
 *   PROV_INSS_13   → INSS Patronal s/ 13º
 *   PROV_FGTS_FER  → FGTS s/ Férias
 *   PROV_FGTS_13   → FGTS s/ 13º
 *
 * Base de cálculo: BC-FGTS por lotação (soma dos proventos com IncideFGTS=1
 * menos descontos com IncideFGTS=1 que reduzem a base).
 *
 * Módulo puro: não lê arquivos, não escreve arquivos, não acessa banco.
 */

// ---------------------------------------------------------------------------
// Alíquotas padrão (configuráveis por empresa)
// ---------------------------------------------------------------------------

export const DEFAULT_PROVISION_RATES = Object.freeze({
  feriasTerco: 11.11,   // 1/12 × 4/3 ≈ 11,11%
  decimoTerceiro: 8.33,  // 1/12 ≈ 8,33%
  inssPatronal: 28.80,   // 20% + RAT + Terceiros ≈ 28,80%
  fgts: 8.00,            // 8,00%
});

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/**
/**
 * Calcula a BC-FGTS por empregado a partir dos raw rows do Fortes.
 *
 * @param {object[]} rawRows — linhas brutas do CSV/DB Fortes
 * @returns {Map<string, { base: number, lotacaoCode: string, lotacaoName: string, companyId: string, competence: string, employeeId: string, employeeName: string }>}
 */
function calculateFgtsBasePerEmployee(rawRows) {
  const bases = new Map();

  for (const row of rawRows) {
    const incideFgts = String(row.IncideFGTS || row.incideFGTS || '0');
    if (incideFgts !== '1') continue;

    const tipo = String(row.TipoRegistro || row.tipoRegistro || '').toUpperCase();
    if (tipo !== 'PROVENTO' && tipo !== 'DESCONTO') continue;

    const employeeId = String(row.employeeId || '');
    if (!employeeId) continue;
    
    // Create a composite key just in case an employee changes lotação, 
    // but typically employeeId is enough. Let's use employeeId + lotacaoCode
    const lotacaoCode = String(row.lotacaoCode || '');
    const key = `${employeeId}|${lotacaoCode}`;

    const amount = Math.abs(parseInt(row.amountCents || '0', 10));

    if (!bases.has(key)) {
      bases.set(key, {
        base: 0,
        lotacaoCode: lotacaoCode,
        lotacaoName: row.lotacaoName || '',
        companyId: row.companyId,
        competence: row.competence,
        employeeId: employeeId,
        employeeName: row.employeeName || ''
      });
    }

    const entry = bases.get(key);
    if (tipo === 'PROVENTO') {
      entry.base += amount;
    } else {
      entry.base -= amount;
    }
  }

  return bases;
}

/**
 * Gera as 6 provisões trabalhistas como PayrollSourceRow[] sintéticas.
 *
 * @param {object[]} rawRows — linhas brutas do Fortes (com IncideFGTS, TipoRegistro)
 * @param {object} [rates] — alíquotas personalizadas (DEFAULT_PROVISION_RATES se omitido)
 * @returns {object[]} — PayrollSourceRow[] sintéticas (6 por empregado com base > 0)
 */
export function calculateProvisions(rawRows, rates = DEFAULT_PROVISION_RATES) {
  const basesPerEmployee = calculateFgtsBasePerEmployee(rawRows);
  const provisionRows = [];

  const provisionDefs = [
    { eventCode: 'PROV_FERIAS',    eventName: 'Provisão Férias e 1/3',     rateKey: 'feriasTerco',    baseMultiplier: null },
    { eventCode: 'PROV_13',        eventName: 'Provisão 13º Salário',      rateKey: 'decimoTerceiro', baseMultiplier: null },
    { eventCode: 'PROV_INSS_FER',  eventName: 'Provisão INSS s/ Férias',   rateKey: 'inssPatronal',   baseMultiplier: 'feriasTerco' },
    { eventCode: 'PROV_INSS_13',   eventName: 'Provisão INSS s/ 13º',      rateKey: 'inssPatronal',   baseMultiplier: 'decimoTerceiro' },
    { eventCode: 'PROV_FGTS_FER',  eventName: 'Provisão FGTS s/ Férias',   rateKey: 'fgts',           baseMultiplier: 'feriasTerco' },
    { eventCode: 'PROV_FGTS_13',   eventName: 'Provisão FGTS s/ 13º',      rateKey: 'fgts',           baseMultiplier: 'decimoTerceiro' },
  ];

  for (const [key, data] of basesPerEmployee) {
    if (data.base <= 0) continue;

    // Normalizar competência
    let comp = data.competence;
    if (comp && typeof comp === 'string' && !comp.includes('-') && comp.length === 6) {
      comp = `${comp.substring(0, 4)}-${comp.substring(4, 6)}`;
    }

    for (const def of provisionDefs) {
      let base = data.base;

      // INSS e FGTS incidem sobre a provisão de férias/13º, não sobre a base total
      if (def.baseMultiplier) {
        base = Math.round(data.base * (rates[def.baseMultiplier] / 100));
      }

      const amountCents = Math.round(base * (rates[def.rateKey] / 100));

      if (amountCents <= 0) continue;

      provisionRows.push({
        sourceSystem: 'fortes',
        sourceAdapter: 'provision-calculator',
        sourceOrigin: 'provision-derived',
        sourcePayrollId: null,
        companyId: data.companyId != null ? String(data.companyId) : '',
        companyName: '',
        competence: comp || '',
        lotacaoCode: data.lotacaoCode,
        lotacaoName: data.lotacaoName || '',
        eventCode: def.eventCode,
        eventName: def.eventName,
        sourceEventNature: 'PROVISAO',
        sourceReference: `BC-FGTS: ${data.base}`,
        sourceRecordType: 'PROVISAO',
        amountCents,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        sourceLineId: `provision-${def.eventCode}-${data.employeeId}-${data.lotacaoCode}`,
      });
    }
  }

  return provisionRows;
}
/**
 * encargo-calculator.js — Encargos patronais mensais (DCTFWeb / FGTS).
 *
 * Fonte de alíquotas / receitas (Analítico DCTFWeb + FGTS Braga):
 *   1138-01 Empresa (s/Empreg/Avulsos) 20%     → ENCARGO_INSS_PATRONAL
 *   1646-01 GILRAT Ajustado                   → ENCARGO_RAT_FAP
 *   1170-01 Salário Educação 2,50%
 *   1176-01 INCRA 0,20%
 *   1191-01 SENAC 1,00%                       → ENCARGO_TERCEIROS (soma 5,80%)
 *   1196-01 SESC 1,50%
 *   1200-01 SEBRAE 0,60%
 *   FGTS mensal (tipo 11)                     → ENCARGO_FGTS_FOLHA
 *
 * Excluído: 1082-01 INSS descontado do segurado (evento Fortes 310, já mapeado).
 *
 * Contas (diretriz contábil):
 *   INSS / GILRAT / Terceiros → D 6.1.1.02.001 / C 2.1.1.02.001
 *   FGTS                      → D 6.1.1.02.002 / C 2.1.1.02.002
 *
 * Preferência de base (fluxo extract DB):
 *   ES_CS_CP_Base (TipoValor 11) + ES_FGTS_SEGURADO.VALORDEPO → calculateEncargosFromBases
 *
 * Fallback sintético (CSV / sem eSocial):
 *   1) eventos informativos 602 (BC CPP) e 605 (FGTS)
 *   2) senão: Σ proventos IncideFGTS=1 (sem subtrair descontos — base DCTF ≠ líquido FGTS)
 */

export const DEFAULT_ENCARGO_RATES = Object.freeze({
  inssEmpresa: 20.0, // 1138-01
  gilrat: 1.0, // 1646-01 (RAT × FAP da empresa; Braga = 1%)
  terceiros: 5.8, // 1170+1176+1191+1196+1200
  fgts: 8.0, // FGTS mensal (só no fallback sintético)
});

const CPP_DEFS = Object.freeze([
  {
    eventCode: 'ENCARGO_INSS_PATRONAL',
    eventName: 'INSS Patronal (1138-01 Empresa 20%)',
    rateKey: 'inssEmpresa',
    dctfRef: '1138-01',
  },
  {
    eventCode: 'ENCARGO_RAT_FAP',
    eventName: 'GILRAT / RAT-FAP (1646-01)',
    rateKey: 'gilrat',
    dctfRef: '1646-01',
  },
  {
    eventCode: 'ENCARGO_TERCEIROS',
    eventName: 'Terceiros Sistema S (1170/1176/1191/1196/1200)',
    rateKey: 'terceiros',
    dctfRef: '1170-01+1176-01+1191-01+1196-01+1200-01',
  },
]);

function normalizeCompetence(comp) {
  if (comp && typeof comp === 'string' && !comp.includes('-') && comp.length === 6) {
    return `${comp.substring(0, 4)}-${comp.substring(4, 6)}`;
  }
  return comp || '';
}

function pushEncargoRow(encargoRows, data, def, amountCents, sourceReference, sourceAdapter) {
  if (amountCents <= 0) return;
  encargoRows.push({
    sourceSystem: 'fortes',
    sourceAdapter,
    sourceOrigin: sourceAdapter === 'fortes-encargo' ? 'fortes-encargo' : 'encargo-derived',
    sourcePayrollId: null,
    companyId: data.companyId != null ? String(data.companyId) : '',
    companyName: data.companyName || '',
    competence: normalizeCompetence(data.competence),
    lotacaoCode: data.lotacaoCode,
    lotacaoName: data.lotacaoName || '',
    eventCode: def.eventCode,
    eventName: def.eventName,
    sourceEventNature: 'ENCARGO',
    sourceReference,
    sourceRecordType: 'ENCARGO',
    amountCents,
    employeeId: data.employeeId != null ? String(data.employeeId) : null,
    employeeName: data.employeeName || '',
    sourceLineId: `encargo-${def.eventCode}-${data.employeeId}-${data.lotacaoCode}`,
  });
}

/**
 * Encargos a partir das bases oficiais eSocial (extract Fortes).
 *
 * @param {object[]} baseRows — { bcCpCents, fgtsDepoCents, employeeId, lotacaoCode, ... }
 * @param {object} [rates]
 * @returns {object[]}
 */
export function calculateEncargosFromBases(baseRows, rates = DEFAULT_ENCARGO_RATES) {
  const merged = { ...DEFAULT_ENCARGO_RATES, ...rates };
  const encargoRows = [];

  for (const row of baseRows || []) {
    const bcCpCents = Math.round(Number(row.bcCpCents) || 0);
    const fgtsDepoCents = Math.round(Number(row.fgtsDepoCents) || 0);
    if (bcCpCents <= 0 && fgtsDepoCents <= 0) continue;

    const lotacaoCode = row.lotacaoName
      ? String(row.lotacaoName)
      : String(row.lotacaoCode || '');
    const data = {
      companyId: row.companyId,
      companyName: row.companyName || '',
      competence: row.competence,
      employeeId: row.employeeId,
      employeeName: row.employeeName || '',
      lotacaoCode,
      lotacaoName: row.lotacaoName || lotacaoCode,
    };

    if (bcCpCents > 0) {
      for (const def of CPP_DEFS) {
        const amountCents = Math.round(bcCpCents * (merged[def.rateKey] / 100));
        pushEncargoRow(
          encargoRows,
          data,
          def,
          amountCents,
          `ES_CS_CP_Base: ${bcCpCents}; DCTF: ${def.dctfRef}`,
          'fortes-encargo'
        );
      }
    }

    if (fgtsDepoCents > 0) {
      pushEncargoRow(
        encargoRows,
        data,
        {
          eventCode: 'ENCARGO_FGTS_FOLHA',
          eventName: 'FGTS mensal (tipo 11)',
          dctfRef: 'FGTS-11',
        },
        fgtsDepoCents,
        `ES_FGTS_SEGURADO.VALORDEPO: ${fgtsDepoCents}`,
        'fortes-encargo'
      );
    }
  }

  return encargoRows;
}

/**
 * Base sintético por empregado|lotação.
 * Prefere informativos 602/605; senão só proventos IncideFGTS=1.
 */
function calculateBasesPerEmployee(rawRows) {
  const bases = new Map();

  function ensure(key, row, lotacaoCode) {
    if (!bases.has(key)) {
      bases.set(key, {
        bcCpCents: 0,
        fgtsCents: 0,
        hasInformative: false,
        lotacaoCode,
        lotacaoName: row.lotacaoName || '',
        companyId: row.companyId,
        competence: row.competence,
        employeeId: String(row.employeeId || ''),
        employeeName: row.employeeName || '',
      });
    }
    return bases.get(key);
  }

  for (const row of rawRows) {
    const employeeId = String(row.employeeId || '');
    if (!employeeId) continue;
    const lotacaoCode = String(row.lotacaoCode || '');
    const key = `${employeeId}|${lotacaoCode}`;
    const eventCode = String(row.eventCode || '');
    const amount = Math.abs(parseInt(row.amountCents || '0', 10));

    if (eventCode === '602' && amount > 0) {
      const entry = ensure(key, row, lotacaoCode);
      entry.bcCpCents += amount;
      entry.hasInformative = true;
      continue;
    }
    if (eventCode === '605' && amount > 0) {
      const entry = ensure(key, row, lotacaoCode);
      entry.fgtsCents += amount;
      entry.hasInformative = true;
      continue;
    }
  }

  for (const row of rawRows) {
    const employeeId = String(row.employeeId || '');
    if (!employeeId) continue;
    const lotacaoCode = String(row.lotacaoCode || '');
    const key = `${employeeId}|${lotacaoCode}`;
    const entry = bases.get(key);
    if (entry?.hasInformative) continue;

    const incideFgts = String(row.IncideFGTS || row.incideFGTS || '0');
    if (incideFgts !== '1') continue;
    const tipo = String(row.TipoRegistro || row.tipoRegistro || '').toUpperCase();
    // Só proventos: descontos IncideFGTS (INSS, VT…) não reduzem a BC da DCTF
    if (tipo !== 'PROVENTO') continue;

    const amount = Math.abs(parseInt(row.amountCents || '0', 10));
    const slot = ensure(key, row, lotacaoCode);
    slot.bcCpCents += amount;
    slot.fgtsCents += amount;
  }

  return bases;
}

/**
 * Fallback sintético (CSV / sem bases eSocial).
 *
 * @param {object[]} rawRows
 * @param {object} [rates]
 * @returns {object[]}
 */
export function calculateEncargos(rawRows, rates = DEFAULT_ENCARGO_RATES) {
  const merged = { ...DEFAULT_ENCARGO_RATES, ...rates };
  const basesPerEmployee = calculateBasesPerEmployee(rawRows);
  const encargoRows = [];

  for (const [, data] of basesPerEmployee) {
    if (data.bcCpCents <= 0 && data.fgtsCents <= 0) continue;

    if (data.bcCpCents > 0) {
      for (const def of CPP_DEFS) {
        const amountCents = Math.round(data.bcCpCents * (merged[def.rateKey] / 100));
        pushEncargoRow(
          encargoRows,
          data,
          def,
          amountCents,
          `BC-CPP: ${data.bcCpCents}; DCTF: ${def.dctfRef}`,
          'encargo-calculator'
        );
      }
    }

    if (data.fgtsCents > 0) {
      const amountCents = data.hasInformative
        ? data.fgtsCents
        : Math.round(data.fgtsCents * (merged.fgts / 100));
      pushEncargoRow(
        encargoRows,
        data,
        {
          eventCode: 'ENCARGO_FGTS_FOLHA',
          eventName: 'FGTS mensal (tipo 11)',
          dctfRef: 'FGTS-11',
        },
        amountCents,
        data.hasInformative
          ? `EFP 605: ${data.fgtsCents}`
          : `BC-FGTS: ${data.fgtsCents}; DCTF/FGTS: FGTS-11`,
        'encargo-calculator'
      );
    }
  }

  return encargoRows;
}
export const employeeLotacaoMap = {
  "000046": "RECURSOS HUMANOS",
  "000621": "RECURSOS HUMANOS",
  "000574": "RECURSOS HUMANOS",
  "000398": "RECURSOS HUMANOS",
  "000310": "FINANCEIRO",
  "000604": "FINANCEIRO",
  "000306": "FINANCEIRO",
  "000173": "FINANCEIRO",
  "000404": "FINANCEIRO",
  "000004": "FINANCEIRO",
  "000044": "FINANCEIRO",
  "000411": "FISCAL",
  "000038": "FISCAL",
  "000635": "FISCAL",
  "000495": "FISCAL",
  "000341": "FISCAL",
  "000013": "DIRETORIA",
  "000005": "DIRETORIA",
  "000594": "DIRETORIA",
  "000277": "TI",
  "000554": "DEPARTAMENTO DE PEÇAS",
  "000223": "DEPARTAMENTO DE PEÇAS",
  "000008": "DEPARTAMENTO DE PEÇAS",
  "000375": "DEPARTAMENTO DE PEÇAS",
  "000049": "DEPARTAMENTO DE PEÇAS",
  "000371": "DEPARTAMENTO DE PEÇAS",
  "000402": "DEPARTAMENTO DE PEÇAS",
  "000575": "DEPARTAMENTO DE PEÇAS",
  "000485": "DEPARTAMENTO DE PEÇAS",
  "000633": "DEPARTAMENTO DE PEÇAS",
  "000034": "DEPARTAMENTO DE PEÇAS",
  "000051": "DEPARTAMENTO DE PEÇAS",
  "000566": "DEPT. DE ACESSORIOS",
  "000626": "DEPT. DE ACESSORIOS",
  "000009": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000358": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000175": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000043": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000542": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000132": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000630": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000019": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000607": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000568": "DEPT. SERVIÇOS MECANICA MATRIZ",
  "000010": "DEPT. FUNILARIA / PINTURA",
  "000014": "DEPT. PRODUTIVOS",
  "000052": "DEPT. PRODUTIVOS",
  "000018": "DEPT. PRODUTIVOS",
  "000252": "DEPT. PRODUTIVOS",
  "000028": "DEPT. PRODUTIVOS",
  "000017": "DEPT. PRODUTIVOS",
  "000021": "DEPT. PRODUTIVOS",
  "000041": "DEPT. PRODUTIVOS",
  "000072": "DEPT. PRODUTIVOS",
  "000179": "DEPT. PRODUTIVOS",
  "000538": "AGENDAMENTOS",
  "000547": "AGENDAMENTOS",
  "000499": "AGENDAMENTOS",
  "000427": "AGENDAMENTOS",
  "000583": "AGENDAMENTOS",
  "000471": "AGENDAMENTOS",
  "000473": "AGENDAMENTOS",
  "000095": "AGENDAMENTOS",
  "000584": "AGENDAMENTOS",
  "000367": "AGENDAMENTOS",
  "000235": "AGENDAMENTOS",
  "000581": "DEPT. MECANICA FILIAL",
  "000580": "DEPT. MECANICA FILIAL",
  "000424": "DEPT. MECANICA FILIAL",
  "000422": "DEPT. MECANICA FILIAL",
  "000609": "DEPT. PEÇAS FILIAL",
  "000564": "DEPTO. ACESSORIOS FILIAL",
  "000615": "DEPT. VENDAS VEICULOS",
  "000597": "DEPT. VENDAS VEICULOS",
  "000480": "DEPT. VENDAS VEICULOS",
  "000309": "DEPT. VENDAS VEICULOS",
  "000588": "DEPT. VENDAS VEICULOS",
  "000370": "DEPT. VENDAS VEICULOS",
  "000062": "DEPT. VENDAS VEICULOS",
  "000101": "DEPT. VENDAS VEICULOS",
  "000447": "DEPT. VENDAS VEICULOS",
  "000596": "DEPT. VENDAS VEICULOS",
  "000535": "DEPT. VENDAS VEICULOS",
  "000622": "DEPT. VENDAS VEICULOS",
  "000417": "DEPT. VENDAS VEICULOS",
  "000561": "DEPT. VENDAS VEICULOS",
  "000628": "DEPT. VENDAS VEICULOS",
  "000618": "DEPT. VENDAS VEICULOS",
  "000550": "DEPT. VENDAS VEICULOS",
  "000638": "DEPT. VENDAS VEICULOS",
  "000081": "DEPT. VENDAS VEICULOS",
  "000551": "DEPT. VENDAS VEICULOS",
  "000600": "DEPT. VENDAS VEICULOS",
  "000610": "DEPT. VENDAS VEICULOS",
  "000015": "DEPT. VENDAS VEICULOS",
  "000012": "DEPT. VENDAS VEICULOS",
  "000637": "DEPT. VENDAS VEICULOS",
  "000456": "DEPT. VENDAS VEICULOS",
  "000478": "DEPT. VENDAS VEICULOS",
  "000634": "DEPT. VENDAS VEICULOS",
  "000539": "DEPT. VENDAS VEICULOS",
  "000585": "DEPT. VENDAS VEICULOS",
  "000582": "DEPT. VENDAS VEICULOS",
  "000290": "DEPT. DE VENDA DIRETA MATRIZ",
  "000001": "DEPT. DE VENDA DIRETA MATRIZ",
  "000386": "DEPT. DE VENDA DIRETA MATRIZ",
  "000559": "DEPT. DE VENDA DIRETA MATRIZ",
  "000033": "DEPT. DE VENDA DIRETA MATRIZ",
  "000442": "DEPT. DE VENDA DIRETA MATRIZ",
  "000570": "DEPT. DE VENDA DIRETA MATRIZ",
  "000486": "DEPT. DE VENDA DIRETA MATRIZ",
  "000488": "DEPT. DE VENDA DIRETA MATRIZ",
  "000617": "DEPT. DE LEADS MATRIZ",
  "000368": "DEPT. DE LEADS MATRIZ",
  "000518": "DEPT. DE LEADS MATRIZ",
  "000501": "DEPT. DE LEADS MATRIZ",
  "000378": "DEPT. DE FINANCIAMENTO MATRIZ",
  "000640": "DEPT. DE FINANCIAMENTO MATRIZ",
  "000636": "DEPT. DE FINANCIAMENTO MATRIZ",
  "000466": "DEPT. DE FINANCIAMENTO MATRIZ",
  "000616": "BRAGA VEICULOS FILIAL NOVOS",
  "000345": "BRAGA VEICULOS FILIAL NOVOS",
  "000620": "BRAGA VEICULOS FILIAL NOVOS",
  "000511": "BRAGA VEICULOS FILIAL NOVOS",
  "000448": "BRAGA VEICULOS FILIAL NOVOS",
  "000431": "BRAGA VEICULOS FILIAL NOVOS",
  "000163": "BRAGA VEICULOS FILIAL NOVOS",
  "000589": "BRAGA VEICULOS FILIAL NOVOS",
  "000606": "BRAGA VEICULOS FILIAL NOVOS",
  "000629": "BRAGA VEICULOS FILIAL NOVOS",
  "000472": "BRAGA VEICULOS FILIAL NOVOS",
  "000623": "BRAGA VEICULOS FILIAL NOVOS",
  "000624": "BRAGA VEICULOS FILIAL NOVOS",
  "000494": "BRAGA VEICULOS FILIAL NOVOS",
  "000590": "BRAGA VEICULOS FILIAL NOVOS",
  "000631": "BRAGA VEICULOS FILIAL NOVOS",
  "000587": "BRAGA VEICULOS FILIAL NOVOS",
  "000567": "DEPT. FINANCIAMENTO FILIAL",
  "000534": "DEPT. FINANCIAMENTO FILIAL",
  "000156": "DEPTO VENDA DIRETA FILIAL",
  "000625": "DEPTO VENDA DIRETA FILIAL",
  "000627": "DEPTO VENDA DIRETA FILIAL",
  "000182": "DEPTO VENDA DIRETA FILIAL",
  "000639": "DEPTO VENDA DIRETA FILIAL",
  "000454": "DEPTO VENDA DIRETA FILIAL",
  "000579": "BRAGA MULTIMARCAS",
  "000350": "BRAGA MULTIMARCAS",
  "000592": "BRAGA MULTIMARCAS",
  "000546": "BRAGA MULTIMARCAS",
  "000523": "BRAGA MULTIMARCAS",
  "000469": "BRAGA MULTIMARCAS",
  "000619": "BRAGA MULTIMARCAS",
  "000455": "BRAGA MULTIMARCAS",
  "000528": "BRAGA MULTIMARCAS",
  "000529": "BRAGA MULTIMARCAS",
  "000524": "BRAGA MULTIMARCAS",
  "000023": "BRAGA MULTIMARCAS",
  "000632": "DEPT. DE LEADS FILIAL"
};
Bash Read engine, fetcher, adapters, journal builder
IN
cat index.js fortes-data-fetcher.js fortes-query-adapter.js fortes-normalizer.js fortes-csv-parser.js journal-builder.js

OUT
/**
 * index.js — Orquestrador do motor Folha Fortes → Dealer.
 *
 * Exporta a função principal `runFolhaDealerEngine` e re-exporta
 * as peças individuais para uso direto em testes.
 *
 * Pipeline:
 *   sourceRows → normalize → consolidate → buildJournal → validate → PayrollAccountingRun
 */

// Re-exports públicos
export { bragaVeiculosConfig } from './braga-veiculos.config.js';
export { buildBragaRows, buildBragaRowsFortes } from './braga-veiculos.fixtures.js';
export { normalizePayrollRows } from './fortes-normalizer.js';
export { consolidatePayrollRows } from './payroll-consolidator.js';
export { mapCenter } from './center-mapper.js';
export { mapAccount } from './account-mapper.js';
export { buildJournal } from './journal-builder.js';
export { validateJournal, resolveStatus } from './folha-validator.js';
export { exportConferenceXlsx } from './conference-xlsx-exporter.js';
export { buildDealerTxtLine, buildDealerTxtSegments } from './dealer-txt-layout.js';
export {
  buildDealerTxtLine483,
  validateDealerTxtLine483,
  formatDealerLotAccount,
  formatMoneyDealerComma,
  sanitizeHistory,
  stripDiacritics,
} from './dealer-txt-layout.js';
export { exportDealerTxt } from './dealer-txt-exporter.js';
export {
  BATCH_TYPE,
  DEALER_LINE_LENGTH,
  INFORMATIVE_EVENT_CODES,
  EVENT_100_REQUIRED_ACCOUNT,
  ValidationCodes,
  buildHistory,
  accountClass,
  accountRequiresCenter,
} from './contracts.js';

export {
  createFolhaDealerRun,
  approveFolhaDealerRun,
  exportApprovedDealerTxt,
  exportRunConferenceXlsx
} from './folha-dealer-run-service.js';

export { summarizeValidationIssues } from './validation-summarizer.js';
export {
  padCenterCode,
  mergeCenterMappings,
  seedPayloadFromCenterMappings,
  normalizeCentersPayload,
} from './merge-center-config.js';
export { calculateProvisions, DEFAULT_PROVISION_RATES } from './provision-calculator.js';
export { calculateEncargos, calculateEncargosFromBases, DEFAULT_ENCARGO_RATES } from './encargo-calculator.js';

// Imports internos para o pipeline
import { normalizePayrollRows } from './fortes-normalizer.js';
import { consolidatePayrollRows } from './payroll-consolidator.js';
import { buildJournal } from './journal-builder.js';
import { validateJournal, resolveStatus } from './folha-validator.js';

/**
 * Executa o motor completo para uma competência.
 *
 * @param {object} params
 * @param {object}   params.config       — configuração da empresa (centerMappings, accountMappings, etc.).
 * @param {object[]} params.sourceRows   — PayrollSourceRow[] de qualquer origem.
 * @param {string}   params.competence   — competência no formato YYYY-MM.
 * @returns {object} PayrollAccountingRun
 */
export function runFolhaDealerEngine({ config, sourceRows, competence }) {
  // 1. Normalizar
  const normalized = normalizePayrollRows(sourceRows);

  // 2. Consolidar por companyId + competence + lotacaoCode + eventCode
  const consolidatedItems = consolidatePayrollRows(normalized);

  // 3. Gerar journal + issues inline
  const { entries, issues: builderIssues } = buildJournal({
    consolidatedItems,
    config,
    competence,
  });

  // 4. Validar journal final
  const validatorIssues = validateJournal(entries, builderIssues);

  // 5. Merge issues
  const allIssues = [...builderIssues, ...validatorIssues];

  // 6. Resolver status
  const status = resolveStatus(allIssues);

  return {
    companyId: config.company.companyId,
    competence,
    sourceRows: normalized,
    consolidatedItems,
    entries,
    issues: allIssues,
    status,
  };
}
import fs from 'fs/promises';

/**
 * Simula a extração de dados do banco Fortes a partir de um CSV bruto ou JSON.
 * Futuramente será substituído pela conexão real ao BD via driver adequado.
 *
 * @param {string} companyId - Ex: '9274'
 * @param {string} competence - Ex: '202604' ou '2026-04'
 * @returns {Promise<{ metadata: object, rawRows: object[] }>}
 */
export async function fetchFortesDataMock(companyId, competence) {
  const csvPath = '/Users/ryanrichard/projecont/automacoes_RH/automacao_rh_adiantamento/backend/extracao_folha_consolidada.csv';
  
  let content = '';
  try {
    content = await fs.readFile(csvPath, 'utf8');
  } catch (error) {
    throw new Error(`Falha ao ler CSV de mock: ${error.message}`);
  }

  const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { metadata: {}, rawRows: [] };

  const headers = lines[0].split(';');
  const targetCompStr = competence.replace('-', '');
  
  const rawRows = [];
  
  let totalProventos = 0;
  let totalDescontos = 0;
  let totalInformativos = 0;
  const uniqueEmployees = new Set();
  
  const folhaSeqs = new Set();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ? values[j].trim() : '';
    }
    
    // Filtrar apenas a empresa e competência solicitada
    if (String(row.companyId) === String(companyId) && String(row.competence).replace('-', '') === targetCompStr) {
      
      if (!row.eventCode) {
        continue; // Ignorar possiveis artefatos do CSV (linhas de total ou em branco sem evento)
      }

      let provDesc = 0;
      if (row.TipoRegistro === 'PROVENTO') provDesc = 1;
      else if (row.TipoRegistro === 'DESCONTO') provDesc = 2;
      
      const amountCents = parseInt(row.amountCents || '0', 10);
      
      if (provDesc === 1) totalProventos += amountCents;
      else if (provDesc === 2) totalDescontos += amountCents;
      else totalInformativos += amountCents;
      
      if (row.employeeId) uniqueEmployees.add(row.employeeId);
      if (row.sourcePayrollId) folhaSeqs.add(String(row.sourcePayrollId));
      
      rawRows.push({
        companyId: row.companyId,
        companyName: row.companyName,
        competence: row.competence,
        lotacaoCode: row.lotacaoCode,
        lotacaoName: row.lotacaoName,
        eventCode: row.eventCode,
        eventName: row.eventName,
        amountCents: amountCents,
        ProvDesc: provDesc,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        sourcePayrollId: row.sourcePayrollId,
        sourceReference: row.sourceReference
      });
    }
  }
  
  const totalLiquido = totalProventos - totalDescontos;
  const folhaSeqList = Array.from(folhaSeqs).sort((a, b) => Number(a) - Number(b));
  
  const metadata = {
    empresa: companyId,
    competencia: competence,
    // Compat: primeira sequência; preferir folhaSeqs para competências segmentadas
    folhaSeq: folhaSeqList[0] || null,
    folhaSeqs: folhaSeqList,
    quantidadeFolhas: folhaSeqList.length,
    quantidadeLinhas: rawRows.length,
    quantidadeFuncionarios: uniqueEmployees.size,
    totalProventos: totalProventos,
    totalDescontos: totalDescontos,
    totalLiquido: totalLiquido,
    totalInformativos: totalInformativos,
    dataHoraExtracao: new Date().toISOString()
  };
  
  return { metadata, rawRows };
}
/**
 * Adapter para converter retorno bruto de query Fortes em PayrollSourceRow[].
 */

import { calculateProvisions } from './provision-calculator.js';
import {
  calculateEncargos,
  calculateEncargosFromBases,
  DEFAULT_ENCARGO_RATES,
} from './encargo-calculator.js';
import { employeeLotacaoMap } from './employee-lotacao-map.js';

const FORTES_PROVISION_ORIGIN = 'fortes-provision';
const FORTES_ENCARGO_ORIGIN = 'fortes-encargo';

export function mapFortesProvDesc(provDesc) {
  const descMap = {
    '1': 'PROVENTO',
    '2': 'DESCONTO',
    '-1': 'DESCONTO',
    '0': 'INFORMATIVO',
    PROVISAO: 'PROVISAO',
    ENCARGO: 'ENCARGO',
  };
  return descMap[String(provDesc)] || 'INFORMATIVO';
}

export function mapFortesRecordType(row) {
  const tipo = String(row.TipoRegistro || '').toUpperCase();
  if (row.sourceOrigin === FORTES_PROVISION_ORIGIN || tipo === 'PROVISAO') {
    return 'PROVISAO';
  }
  if (row.sourceOrigin === FORTES_ENCARGO_ORIGIN || tipo === 'ENCARGO') {
    return 'ENCARGO';
  }
  return mapFortesProvDesc(row.ProvDesc);
}

export function buildFortesSourceLineId(row, options = {}) {
  const parts = [
    'fortes',
    row.companyId || 'company',
    row.competence || 'comp',
    row.employeeId || 'emp',
    row.eventCode || 'evt',
  ];
  return parts.join('-');
}

function normalizeCompetence(competence) {
  if (competence && typeof competence === 'string' && !competence.includes('-') && competence.length === 6) {
    return `${competence.substring(0, 4)}-${competence.substring(4, 6)}`;
  }
  if (competence && typeof competence === 'number' && String(competence).length === 6) {
    const compStr = String(competence);
    return `${compStr.substring(0, 4)}-${compStr.substring(4, 6)}`;
  }
  return competence || '';
}

function resolveLotacao(raw) {
  if (raw.employeeId && employeeLotacaoMap[raw.employeeId]) {
    return {
      lotacaoCode: employeeLotacaoMap[raw.employeeId],
      lotacaoName: employeeLotacaoMap[raw.employeeId],
    };
  }
  const code = raw.lotacaoCode != null ? String(raw.lotacaoCode) : '';
  const name = raw.lotacaoName ? String(raw.lotacaoName) : '';
  if (code) {
    return { lotacaoCode: code, lotacaoName: name || code };
  }
  if (name) {
    return { lotacaoCode: name, lotacaoName: name };
  }
  return { lotacaoCode: '', lotacaoName: '' };
}

function toPayrollSourceRow(raw, index, { preserveSign = false } = {}) {
  const competence = normalizeCompetence(raw.competence);
  const lotacao = resolveLotacao(raw);
  const amountRaw = Number(raw.amountCents || 0);
  const amountCents = preserveSign ? Math.round(amountRaw) : Math.abs(Math.round(amountRaw));
  const sourceOrigin = raw.sourceOrigin || 'folha-mensal';
  const recordType = mapFortesRecordType(raw);
  let sourceAdapter = 'fortes-query';
  if (sourceOrigin === FORTES_PROVISION_ORIGIN) sourceAdapter = 'fortes-provision';
  else if (sourceOrigin === FORTES_ENCARGO_ORIGIN) sourceAdapter = 'fortes-encargo';

  return {
    sourceSystem: 'fortes',
    sourceAdapter,
    sourceOrigin,
    sourcePayrollId: raw.sourcePayrollId || null,
    companyId: raw.companyId != null ? String(raw.companyId) : '',
    companyName: raw.companyName || '',
    competence,
    lotacaoCode: lotacao.lotacaoCode,
    lotacaoName: lotacao.lotacaoName,
    eventCode: String(raw.eventCode),
    eventName: raw.eventName || '',
    sourceEventNature: recordType,
    sourceReference: raw.sourceReference || '',
    sourceRecordType: recordType,
    amountCents,
    employeeId: raw.employeeId != null ? String(raw.employeeId) : null,
    employeeName: raw.employeeName || null,
    sourceLineId: raw.sourceLineId || `${buildFortesSourceLineId(raw)}-${index}`,
  };
}

/**
 * @param {object[]} rawRows — linhas da folha mensal
 * @param {object} [options]
 * @param {object[]} [options.fortesProvisions] — PROV_* já calculados no Fortes (PRD/PRF)
 * @param {object[]} [options.fortesEncargoBases] — bases eSocial (ES_CS_CP_Base / ES_FGTS_SEGURADO)
 * @param {object|null} provisionRates — se fortesProvisions vier preenchido, o sintético é desligado
 * @param {object|null} encargoRates — alíquotas DCTF; bases eSocial preferidas quando disponíveis
 */
export function normalizeFortesQueryRows(rawRows, options = {}, provisionRates = null, encargoRates = null) {
  const normalized = [];
  const fortesProvisions = Array.isArray(options.fortesProvisions) ? options.fortesProvisions : [];
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

    const amt = Math.abs(raw.amountCents || 0);
    if (type === 'PROVENTO') liquidoPerLotacao[code].amount += amt;
    if (type === 'DESCONTO') liquidoPerLotacao[code].amount -= amt;
  }

  for (const [code, data] of Object.entries(liquidoPerLotacao)) {
    if (data.amount > 0) {
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

  // Provisões: Fortes manda (PRD/PRF). Sem Fortes → fallback sintético taxa×BC-FGTS.
  if (fortesProvisions.length > 0) {
    for (let i = 0; i < fortesProvisions.length; i++) {
      const raw = { ...fortesProvisions[i], sourceOrigin: FORTES_PROVISION_ORIGIN };
      if (raw.eventCode === undefined || raw.eventCode === null || String(raw.eventCode).trim() === '') {
        continue;
      }
      normalized.push(
        toPayrollSourceRow(raw, `prov-${i}`, { preserveSign: true })
      );
    }
  } else if (provisionRates) {
    const provisionRows = calculateProvisions(rawRows, provisionRates);
    normalized.push(...provisionRows);
  }

  // Encargos: bases eSocial (preferido) → senão sintético (602/605 ou proventos FGTS)
  if (fortesEncargoBases.length > 0) {
    const encargoRows = calculateEncargosFromBases(
      fortesEncargoBases,
      encargoRates || DEFAULT_ENCARGO_RATES
    );
    normalized.push(...encargoRows);
  } else if (provisionRates || encargoRates || fortesProvisions.length > 0) {
    const encargoRows = calculateEncargos(rawRows, encargoRates || DEFAULT_ENCARGO_RATES);
    normalized.push(...encargoRows);
  }

  return normalized;
}
/**
 * fortes-normalizer.js — Normaliza linhas de qualquer origem para PayrollSourceRow.
 *
 * Regras:
 * - amountCents positivo na folha mensal (proventos/descontos).
 * - PROV_* de origem Fortes (`fortes-provision`) mantêm o sinal — Provisionar
 *   negativo = estorno (o journal inverte D/C).
 * - Natureza D/C NÃO vem do Fortes; vem do de-para contábil.
 * - Campos obrigatórios: sourceSystem, sourceAdapter, sourceOrigin,
 *   companyId, companyName, competence, lotacaoCode, eventCode, amountCents.
 */

import { employeeLotacaoMap } from './employee-lotacao-map.js';

/**
 * Provisões Fortes (PRD/PRF) e eventos PROV_* preservam sinal.
 * @param {object} row
 * @returns {boolean}
 */
function shouldPreserveSignedAmount(row) {
  if (row?.sourceOrigin === 'fortes-provision') return true;
  const code = String(row?.eventCode || '');
  return code.startsWith('PROV_');
}

/**
 * Normaliza um array de linhas de origem para PayrollSourceRow.
 * @param {object[]} rawRows — linhas brutas (fixture ou query Fortes).
 * @returns {object[]} — linhas normalizadas.
 */
export function normalizePayrollRows(rawRows) {
  return rawRows.map((row, index) => {
    const normalized = { ...row };

    if (typeof normalized.amountCents === 'number' && !shouldPreserveSignedAmount(normalized)) {
      normalized.amountCents = Math.abs(normalized.amountCents);
    }

    // Garantir eventCode como string
    if (normalized.eventCode != null) {
      normalized.eventCode = String(normalized.eventCode);
    }

    // Override Lotação if we have an employee mapped from the XLS
    if (normalized.employeeId && employeeLotacaoMap[normalized.employeeId]) {
      normalized.lotacaoCode = employeeLotacaoMap[normalized.employeeId];
      // Keep lotacaoName in sync for UI purposes
      normalized.lotacaoName = employeeLotacaoMap[normalized.employeeId];
    }

    // Garantir lotacaoCode como string
    if (normalized.lotacaoCode != null) {
      normalized.lotacaoCode = String(normalized.lotacaoCode);
    }

    // Fallback para sourceLineId
    if (!normalized.sourceLineId) {
      normalized.sourceLineId = `norm-${index}`;
    }

    return normalized;
  });
}
export function parseFortesCsv(csvContent, targetCompanyId, targetCompetence) {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { metadata: {}, rawRows: [] };

  const headers = lines[0].split(';');
  const targetCompStr = targetCompetence.replace('-', '');
  
  const rawRows = [];
  
  let totalProventos = 0;
  let totalDescontos = 0;
  let totalInformativos = 0;
  const uniqueEmployees = new Set();
  
  const folhaSeqs = new Set();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ? values[j].trim() : '';
    }
    
    // Filtrar apenas a empresa e competência solicitada
    if (String(row.companyId) === String(targetCompanyId) && String(row.competence).replace('-', '') === targetCompStr) {
      
      if (!row.eventCode) {
        continue; // Ignorar possiveis artefatos do CSV
      }

      let provDesc = 0;
      if (row.TipoRegistro === 'PROVENTO') provDesc = 1;
      else if (row.TipoRegistro === 'DESCONTO') provDesc = 2;
      
      const amountCents = parseInt(row.amountCents || '0', 10);
      
      if (provDesc === 1) totalProventos += amountCents;
      else if (provDesc === 2) totalDescontos += amountCents;
      else totalInformativos += amountCents;
      
      if (row.employeeId) uniqueEmployees.add(row.employeeId);
      if (row.sourcePayrollId) folhaSeqs.add(String(row.sourcePayrollId));
      
      rawRows.push({
        companyId: row.companyId,
        companyName: row.companyName,
        competence: row.competence,
        lotacaoCode: row.lotacaoCode,
        lotacaoName: row.lotacaoName,
        eventCode: row.eventCode,
        eventName: row.eventName,
        amountCents: amountCents,
        ProvDesc: provDesc,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        sourcePayrollId: row.sourcePayrollId,
        sourceReference: row.sourceReference
      });
    }
  }
  
  const totalLiquido = totalProventos - totalDescontos;
  const folhaSeqList = Array.from(folhaSeqs).sort((a, b) => Number(a) - Number(b));
  
  const metadata = {
    empresa: targetCompanyId,
    competencia: targetCompetence,
    // Compat: primeira sequência; preferir folhaSeqs para competências segmentadas
    folhaSeq: folhaSeqList[0] || null,
    folhaSeqs: folhaSeqList,
    quantidadeFolhas: folhaSeqList.length,
    quantidadeLinhas: rawRows.length,
    quantidadeFuncionarios: uniqueEmployees.size,
    totalProventos: totalProventos,
    totalDescontos: totalDescontos,
    totalLiquido: totalLiquido,
    totalInformativos: totalInformativos,
    dataHoraExtracao: new Date().toISOString()
  };
  
  return { metadata, rawRows };
}
/**
 * journal-builder.js — Gera AccountingEntry[] a partir de itens consolidados.
 *
 * Pipeline por item consolidado:
 * 1. Ignora item com amountCents === 0.
 * 2. Ignora eventos informativos.
 * 3. Busca de-para de conta (account mapping).
 * 4. Busca de-para de centro (center mapping).
 * 5. Aplica regra de centro por classe de conta:
 *    - Classe 1 ou 2 → centro removido.
 *    - Classe 3+ → centro obrigatório.
 * 6. Gera AccountingEntry com batchType, history, dc, account, center, amount.
 *
 * NÃO sintetiza contrapartida ausente.
 */

import {
  BATCH_TYPE,
  INFORMATIVE_EVENT_CODES,
  EVENT_100_REQUIRED_ACCOUNT,
  ValidationCodes,
  buildHistory,
  accountRequiresCenter,
} from './contracts.js';
import { mapCenter } from './center-mapper.js';
import { mapAccount } from './account-mapper.js';

/**
 * @param {object} params
 * @param {object[]} params.consolidatedItems — ConsolidatedPayrollItem[]
 * @param {object} params.config — empresa config com centerMappings e accountMappings
 * @param {string} params.competence — YYYY-MM
 * @returns {{ entries: object[], issues: object[] }}
 */
export function buildJournal({ consolidatedItems, config, competence }) {
  const entries = [];
  const issues = [];
  const history = buildHistory(competence);

  for (const item of consolidatedItems) {
    // ------ Zero value → skip + warning ------
    if (item.amountCents === 0) {
      issues.push({
        code: ValidationCodes.ZERO_VALUE_IGNORED,
        severity: 'warning',
        message: `Item com valor zero ignorado: lotação ${item.lotacaoCode}, evento ${item.eventCode}.`,
        context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, competence },
      });
      continue;
    }

    // ------ Informative event → skip + warning ------
    const isInformative = INFORMATIVE_EVENT_CODES.has(item.eventCode) || 
                          (config.informativeEventCodes && config.informativeEventCodes.includes(item.eventCode));

    if (isInformative) {
      issues.push({
        code: ValidationCodes.INFORMATIVE_EVENT_IGNORED,
        severity: 'warning',
        message: `Evento informativo ${item.eventCode} ignorado na geração de lançamentos.`,
        context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, competence },
      });
      continue;
    }

    // ------ Negative value ------
    // PROV_* do Fortes (coluna Provisionar) pode ser negativo = estorno → abs + inverte D/C.
    const isProvisionEvent = String(item.eventCode || '').startsWith('PROV_');
    let signedAmount = item.amountCents;
    let invertDc = false;
    if (signedAmount < 0) {
      if (isProvisionEvent) {
        invertDc = true;
        signedAmount = Math.abs(signedAmount);
      } else {
        issues.push({
          code: ValidationCodes.NEGATIVE_VALUE_WITHOUT_POLICY,
          severity: 'blocker',
          message: `Valor negativo sem política definida: lotação ${item.lotacaoCode}, evento ${item.eventCode}.`,
          context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, amountCents: item.amountCents, competence },
        });
        continue;
      }
    }

    // ------ Account mapping ------
    const accountLines = mapAccount(item.eventCode, item.companyId, config.accountMappings);

    if (accountLines.length === 0) {
      issues.push({
        code: ValidationCodes.MISSING_ACCOUNT_MAPPING,
        severity: 'blocker',
        message: `Evento ${item.eventCode} sem de-para contábil.`,
        context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, competence },
      });
      continue;
    }

    // ------ Event 100 account validation ------
    if (item.eventCode === '100') {
      const badAccount = accountLines.find(
        (line) => line.dealerAccountCode !== EVENT_100_REQUIRED_ACCOUNT
      );
      if (badAccount) {
        issues.push({
          code: ValidationCodes.EVENT_100_ACCOUNT_MISMATCH,
          severity: 'blocker',
          message: `Evento 100 deve usar conta ${EVENT_100_REQUIRED_ACCOUNT}, mas encontrou ${badAccount.dealerAccountCode}.`,
          context: { eventCode: '100', expected: EVENT_100_REQUIRED_ACCOUNT, found: badAccount.dealerAccountCode, competence },
        });
        continue;
      }
    }

    // ------ Center mapping ------
    const centerResult = mapCenter(item.lotacaoCode, item.companyId, config.centerMappings);

    if (!centerResult) {
      issues.push({
        code: ValidationCodes.MISSING_CENTER_MAPPING,
        severity: 'blocker',
        message: `Lotação ${item.lotacaoCode} sem de-para de centro.`,
        context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, competence },
      });
    }

    // ------ Generate entries for each account line ------
    for (const accountLine of accountLines) {
      const requiresCenter = accountRequiresCenter(accountLine.dealerAccountCode);
      let centerCode;

      if (requiresCenter) {
        if (centerResult) {
          centerCode = centerResult.centerCode;
        } else {
          // MISSING_CENTER_MAPPING already emitted above.
          // Also emit MISSING_REQUIRED_CENTER for the specific account.
          issues.push({
            code: ValidationCodes.MISSING_REQUIRED_CENTER,
            severity: 'blocker',
            message: `Conta ${accountLine.dealerAccountCode} exige centro, mas lotação ${item.lotacaoCode} não tem centro mapeado.`,
            context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, accountCode: accountLine.dealerAccountCode, competence },
          });
          centerCode = undefined;
        }
      } else {
        // Contas 1/2 → sem centro, mesmo que tenha mapping
        if (centerResult) {
          issues.push({
            code: ValidationCodes.CENTER_REMOVED_FROM_BALANCE_ACCOUNT,
            severity: 'warning',
            message: `Centro ${centerResult.centerCode} removido da conta ${accountLine.dealerAccountCode} (classe 1/2).`,
            context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, accountCode: accountLine.dealerAccountCode, centerCode: centerResult.centerCode, competence },
          });
        }
        centerCode = undefined;
      }

      const dc = accountLine.dc.toUpperCase();
      const finalDc = invertDc ? (dc === 'D' ? 'C' : 'D') : dc;
      entries.push({
        companyId: item.companyId,
        competence,
        batchType: BATCH_TYPE,
        history,
        dc: finalDc,
        accountCode: accountLine.dealerAccountCode,
        dealerLotAccountCode: accountLine.dealerLotAccountCode,
        centerCode,
        amountCents: signedAmount,
        lotacaoCode: item.lotacaoCode,
        lotacaoName: item.lotacaoName || null,
        eventCode: item.eventCode,
        eventName: item.eventName || null,
        employeeId: item.employeeId != null ? String(item.employeeId) : null,
        employeeName: item.employeeName || null,
        description: accountLine.description || item.eventName || null,
      });
    }
  }

  return { entries, issues };
}
Agora o lado servidor: de onde vêm fortesProvisions, fortesEncargoBases e a lotação da folha mensal.

Bash Find where provisions/encargo bases originate
IN
cd /Users/ryanrichard/projecont && grep -rn "fortesProvisions\|fortesEncargoBases\|normalizeFortesQueryRows\|provisions\b\|encargoBases\|IncideFGTS\|TIPOVALOR\|TipoValor\|VALORDEPO" --include=*.js --include=*.jsx --include=*.py --include=*.sql --include=*.ts . 2>/dev/null | grep -v node_modules | grep -v "/dist/" | head -80

OUT
(eval):1: no matches found: --include=*.js
Shell cwd was reset to /Users/ryanrichard/projecont/Rayo
Bash Find origins of provisions and encargo bases
IN
cd /Users/ryanrichard/projecont && grep -rnE "fortesProvisions|fortesEncargoBases|normalizeFortesQueryRows|encargoBases|IncideFGTS|TipoValor|VALORDEPO|ES_FGTS_SEGURADO" --include='*.js' --include='*.jsx' --include='*.py' --include='*.sql' --include='*.mjs' . 2>/dev/null | grep -v node_modules | grep -v "/dist/" | grep -v "/tests/" | head -80

OUT
automacoes_RH/automacao_rh_adiantamento/backend/extract_fortes_consolidated.py:73:                CASE WHEN ISNULL(CAST(EVE.IndicativoFGTSMensalFerias AS VARCHAR(10)), '0') <> '0' THEN 1 ELSE 0 END AS IncideFGTS,
automacoes_RH/automacao_rh_adiantamento/backend/src/fopag/data_fetcher.py:83:            EVE.IndicativoFGTSMensalFerias AS IncideFGTS
automacoes_RH/automacao_rh_adiantamento/backend/src/fopag/data_fetcher.py:167:                inc_fgts = check_incidence(row.get("IncideFGTS"))
automacoes_RH/automacao_rh_adiantamento/backend/src/fopag/data_fetcher.py:227:            EVE.IndicativoFGTSMensalFerias AS IncideFGTS,
automacoes_RH/automacao_rh_adiantamento/backend/src/fopag/data_fetcher.py:303:                        "fgts": int(d["IncideFGTS"] or 0) > 0,
Rayo/apps/rayo-server/index.js:193:        // data = folha mensal; provisions = PRD/PRF; encargoBases = eSocial CPP/FGTS
Rayo/apps/rayo-server/index.js:198:            encargoBases: extracted.encargoBases,
Rayo/apps/rayo-server/fortes-extractor.js:38:      IncideFGTS: '0',
Rayo/apps/rayo-server/fortes-extractor.js:85:    END AS IncideFGTS,
Rayo/apps/rayo-server/fortes-extractor.js:216: * Bases oficiais eSocial para encargos DCTF/FGTS (mensal, TipoValor 11).
Rayo/apps/rayo-server/fortes-extractor.js:269:      AND TipoValor = 11
Rayo/apps/rayo-server/fortes-extractor.js:276:        SUM(TRY_CAST(VALORDEPO AS FLOAT)) AS fgtsDepo
Rayo/apps/rayo-server/fortes-extractor.js:277:    FROM ES_FGTS_SEGURADO (NOLOCK)
Rayo/apps/rayo-server/fortes-extractor.js:341:    const encargoBases = encargoBaseResult.recordset.map((row) => {
Rayo/apps/rayo-server/fortes-extractor.js:354:        `Bases encargo eSocial=${encargoBases.length}`
Rayo/apps/rayo-server/fortes-extractor.js:360:      encargoBases,
Rayo/apps/rayo/diagnostic-real.mjs:3:import { normalizeFortesQueryRows } from './src/lib/folha-dealer/fortes-query-adapter.js';
Rayo/apps/rayo/diagnostic-real.mjs:12:  let payrollRows = normalizeFortesQueryRows(rawRows);
Rayo/apps/rayo/simulate-fortes-query.mjs:2:import { normalizeFortesQueryRows } from './src/lib/folha-dealer/fortes-query-adapter.js';
Rayo/apps/rayo/simulate-fortes-query.mjs:19:  let payrollRows = normalizeFortesQueryRows(rawRows);
Rayo/apps/rayo/scripts/run-end-to-end-real-db.mjs:5:import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';
Rayo/apps/rayo/scripts/run-end-to-end-real-db.mjs:43:  const normalizedRows = normalizeFortesQueryRows(rawRows);
Rayo/apps/rayo/src/hooks/useFolhaDealer.js:11:import { normalizeFortesQueryRows } from '../lib/folha-dealer/fortes-query-adapter';
Rayo/apps/rayo/src/hooks/useFolhaDealer.js:91:      let payrollRows = normalizeFortesQueryRows(
Rayo/apps/rayo/src/hooks/useFolhaDealer.js:145:        encargosBases: Array.isArray(result.encargoBases) ? result.encargoBases.length : 0,
Rayo/apps/rayo/src/hooks/useFolhaDealer.js:149:      const hasFortesEncargoBases = Array.isArray(result.encargoBases) && result.encargoBases.length > 0;
Rayo/apps/rayo/src/hooks/useFolhaDealer.js:150:      let payrollRows = normalizeFortesQueryRows(
Rayo/apps/rayo/src/hooks/useFolhaDealer.js:153:          ...(hasFortesProvisions ? { fortesProvisions: result.provisions } : {}),
Rayo/apps/rayo/src/hooks/useFolhaDealer.js:154:          ...(hasFortesEncargoBases ? { fortesEncargoBases: result.encargoBases } : {}),
Rayo/apps/rayo/src/lib/folha-dealer/provision-calculator.js:15: * Base de cálculo: BC-FGTS por lotação (soma dos proventos com IncideFGTS=1
Rayo/apps/rayo/src/lib/folha-dealer/provision-calculator.js:16: * menos descontos com IncideFGTS=1 que reduzem a base).
Rayo/apps/rayo/src/lib/folha-dealer/provision-calculator.js:47:    const incideFgts = String(row.IncideFGTS || row.incideFGTS || '0');
Rayo/apps/rayo/src/lib/folha-dealer/provision-calculator.js:89: * @param {object[]} rawRows — linhas brutas do Fortes (com IncideFGTS, TipoRegistro)
Rayo/apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js:253:  fgts: 8.0, // FGTS mensal tipo 11 (fallback; extract usa VALORDEPO)
Rayo/apps/rayo/src/lib/folha-dealer/encargo-calculator.js:21: *   ES_CS_CP_Base (TipoValor 11) + ES_FGTS_SEGURADO.VALORDEPO → calculateEncargosFromBases
Rayo/apps/rayo/src/lib/folha-dealer/encargo-calculator.js:25: *   2) senão: Σ proventos IncideFGTS=1 (sem subtrair descontos — base DCTF ≠ líquido FGTS)
Rayo/apps/rayo/src/lib/folha-dealer/encargo-calculator.js:140:        `ES_FGTS_SEGURADO.VALORDEPO: ${fgtsDepoCents}`,
Rayo/apps/rayo/src/lib/folha-dealer/encargo-calculator.js:151: * Prefere informativos 602/605; senão só proventos IncideFGTS=1.
Rayo/apps/rayo/src/lib/folha-dealer/encargo-calculator.js:203:    const incideFgts = String(row.IncideFGTS || row.incideFGTS || '0');
Rayo/apps/rayo/src/lib/folha-dealer/encargo-calculator.js:206:    // Só proventos: descontos IncideFGTS (INSS, VT…) não reduzem a BC da DCTF
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:115: * @param {object[]} [options.fortesProvisions] — PROV_* já calculados no Fortes (PRD/PRF)
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:116: * @param {object[]} [options.fortesEncargoBases] — bases eSocial (ES_CS_CP_Base / ES_FGTS_SEGURADO)
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:117: * @param {object|null} provisionRates — se fortesProvisions vier preenchido, o sintético é desligado
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:120:export function normalizeFortesQueryRows(rawRows, options = {}, provisionRates = null, encargoRates = null) {
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:122:  const fortesProvisions = Array.isArray(options.fortesProvisions) ? options.fortesProvisions : [];
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:123:  const fortesEncargoBases = Array.isArray(options.fortesEncargoBases)
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:124:    ? options.fortesEncargoBases
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:187:  if (fortesProvisions.length > 0) {
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:188:    for (let i = 0; i < fortesProvisions.length; i++) {
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:189:      const raw = { ...fortesProvisions[i], sourceOrigin: FORTES_PROVISION_ORIGIN };
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:203:  if (fortesEncargoBases.length > 0) {
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:205:      fortesEncargoBases,
Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js:209:  } else if (provisionRates || encargoRates || fortesProvisions.length > 0) {
Shell cwd was reset to /Users/ryanrichard/projecont/Rayo
Bash Read extractor, server route, hook, config rates
IN
cat apps/rayo-server/fortes-extractor.js && sed -n 150,260p apps/rayo-server/index.js && cat apps/rayo/src/hooks/useFolhaDealer.js && sed -n 230,273p apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js

OUT
const mssql = require('mssql');

function buildDbConfig() {
  return {
    user: process.env.DB_USER || 'biprojecont',
    password: process.env.DB_PASSWORD || 'proj@#2087!',
    server: process.env.DB_HOST || '192.168.0.5',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_DATABASE || 'AC',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    requestTimeout: 300000,
  };
}

/**
 * Expand PRD/PRF amount columns into PayrollSourceRow-shaped raw rows.
 * Keeps signed cents (Provisionar can be negative = estorno).
 */
function expandProvisionAmounts(row, defs) {
  const out = [];
  for (const def of defs) {
    const cents = row[def.centsKey];
    if (cents == null || Number(cents) === 0) continue;
    out.push({
      companyId: row.companyId,
      companyName: row.companyName || '',
      competence: row.competence,
      employeeId: row.employeeId,
      employeeName: row.employeeName || '',
      sourcePayrollId: row.sourcePayrollId,
      eventCode: def.eventCode,
      eventName: def.eventName,
      ProvDesc: 'PROVISAO',
      TipoRegistro: 'PROVISAO',
      IncideFGTS: '0',
      amountCents: Number(cents),
      sourceReference: def.sourceReference || '',
      lotacaoCode: row.lotacaoCode || '',
      lotacaoName: row.lotacaoName || '',
      sourceOrigin: 'fortes-provision',
    });
  }
  return out;
}

const PROV_13_DEFS = [
  { centsKey: 'prov13Cents', eventCode: 'PROV_13', eventName: 'Provisão 13º Salário (Fortes)' },
  { centsKey: 'inss13Cents', eventCode: 'PROV_INSS_13', eventName: 'Provisão INSS s/ 13º (Fortes)' },
  { centsKey: 'fgts13Cents', eventCode: 'PROV_FGTS_13', eventName: 'Provisão FGTS s/ 13º (Fortes)' },
];

const PROV_FER_DEFS = [
  { centsKey: 'provFerCents', eventCode: 'PROV_FERIAS', eventName: 'Provisão Férias e 1/3 (Fortes)' },
  { centsKey: 'inssFerCents', eventCode: 'PROV_INSS_FER', eventName: 'Provisão INSS s/ Férias (Fortes)' },
  { centsKey: 'fgtsFerCents', eventCode: 'PROV_FGTS_FER', eventName: 'Provisão FGTS s/ Férias (Fortes)' },
];

const PAYROLL_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @Ano INT = @AnoParam;
DECLARE @Mes INT = @MesParam;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

SELECT
    EFO.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    @AnoMes AS competence,
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
    CASE
        WHEN ISNULL(CAST(EVE.IndicativoFGTSMensalFerias AS VARCHAR(10)), '0') <> '0' THEN '1'
        ELSE '0'
    END AS IncideFGTS,
    CAST(ROUND(EFP.Valor * 100, 0) AS INT) AS amountCents,
    EFP.Referencia AS sourceReference,
    '' AS lotacaoCode,
    '' AS lotacaoName
FROM EFO (NOLOCK)
INNER JOIN EPG (NOLOCK)
    ON EFO.EMP_Codigo = EPG.EMP_Codigo
   AND EFO.EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON EFO.EMP_Codigo = EMP.Codigo
LEFT JOIN EFP (NOLOCK)
    ON EFO.EMP_Codigo = EFP.EMP_Codigo
   AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
   AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq IN (
      SELECT FOL.Seq
      FROM FOL (NOLOCK)
      INNER JOIN FPG (NOLOCK)
          ON FOL.EMP_Codigo = FPG.EMP_Codigo
         AND FOL.Seq = FPG.FOL_Seq
      WHERE FOL.EMP_Codigo = @EmpresaCodigo
        AND FPG.AnoMes = @AnoMes
        AND FOL.Folha = 2
        AND FPG.Tipo IN (1, 4)
  )
ORDER BY EFO.FOL_Seq, EPG.Nome, EFP.EVE_Codigo;
`;

/**
 * Provisão 13º: FOL.Folha = 14, header PRV, detail PRD.
 * Coluna Fortes Provisao = relatório RH "Provisionar".
 */
const PROV_13_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

SELECT
    PRV.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    PRV.AnoMes AS competence,
    PRD.EFO_EPG_Codigo AS employeeId,
    EPG.Nome AS employeeName,
    PRV.FOL_Seq AS sourcePayrollId,
    ISNULL(SEP.LOT_Codigo, '') AS lotacaoCode,
    ISNULL(LOT.Nome, '') AS lotacaoName,
    CAST(ROUND(ISNULL(PRD.Provisao, 0) * 100, 0) AS INT) AS prov13Cents,
    CAST(ROUND(ISNULL(PRD.INSSProvisao, 0) * 100, 0) AS INT) AS inss13Cents,
    CAST(ROUND(ISNULL(PRD.FGTSProvisao, 0) * 100, 0) AS INT) AS fgts13Cents
FROM PRV (NOLOCK)
INNER JOIN FOL (NOLOCK)
    ON PRV.EMP_Codigo = FOL.EMP_Codigo
   AND PRV.FOL_Seq = FOL.Seq
   AND FOL.Folha = 14
INNER JOIN PRD (NOLOCK)
    ON PRV.EMP_Codigo = PRD.EMP_Codigo
   AND PRV.FOL_Seq = PRD.EFO_FOL_Seq
INNER JOIN EFO (NOLOCK)
    ON PRD.EMP_Codigo = EFO.EMP_Codigo
   AND PRD.EFO_FOL_Seq = EFO.FOL_Seq
   AND PRD.EFO_EPG_Codigo = EFO.EPG_Codigo
LEFT JOIN EPG (NOLOCK)
    ON PRD.EMP_Codigo = EPG.EMP_Codigo
   AND PRD.EFO_EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON PRV.EMP_Codigo = EMP.Codigo
LEFT JOIN SEP (NOLOCK)
    ON EFO.EMP_Codigo = SEP.EMP_Codigo
   AND EFO.EPG_Codigo = SEP.EPG_Codigo
   AND EFO.SEP_Data = SEP.Data
LEFT JOIN LOT (NOLOCK)
    ON SEP.EMP_Codigo = LOT.EMP_Codigo
   AND SEP.LOT_Codigo = LOT.Codigo
WHERE PRV.EMP_Codigo = @EmpresaCodigo
  AND PRV.AnoMes = @AnoMes
ORDER BY LOT.Nome, EPG.Nome;
`;

/**
 * Provisão férias: FOL.Folha = 15, AnoMes via PRV no mesmo FOL_Seq, detail PRF.
 */
const PROV_FER_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

SELECT
    PRV.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    PRV.AnoMes AS competence,
    PRF.EFO_EPG_Codigo AS employeeId,
    EPG.Nome AS employeeName,
    PRV.FOL_Seq AS sourcePayrollId,
    ISNULL(SEP.LOT_Codigo, '') AS lotacaoCode,
    ISNULL(LOT.Nome, '') AS lotacaoName,
    CAST(ROUND(ISNULL(PRF.Provisao, 0) * 100, 0) AS INT) AS provFerCents,
    CAST(ROUND(ISNULL(PRF.INSSProvisao, 0) * 100, 0) AS INT) AS inssFerCents,
    CAST(ROUND(ISNULL(PRF.FGTSProvisao, 0) * 100, 0) AS INT) AS fgtsFerCents
FROM PRV (NOLOCK)
INNER JOIN FOL (NOLOCK)
    ON PRV.EMP_Codigo = FOL.EMP_Codigo
   AND PRV.FOL_Seq = FOL.Seq
   AND FOL.Folha = 15
INNER JOIN PRF (NOLOCK)
    ON PRV.EMP_Codigo = PRF.EMP_Codigo
   AND PRV.FOL_Seq = PRF.EFO_FOL_Seq
INNER JOIN EFO (NOLOCK)
    ON PRF.EMP_Codigo = EFO.EMP_Codigo
   AND PRF.EFO_FOL_Seq = EFO.FOL_Seq
   AND PRF.EFO_EPG_Codigo = EFO.EPG_Codigo
LEFT JOIN EPG (NOLOCK)
    ON PRF.EMP_Codigo = EPG.EMP_Codigo
   AND PRF.EFO_EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON PRV.EMP_Codigo = EMP.Codigo
LEFT JOIN SEP (NOLOCK)
    ON EFO.EMP_Codigo = SEP.EMP_Codigo
   AND EFO.EPG_Codigo = SEP.EPG_Codigo
   AND EFO.SEP_Data = SEP.Data
LEFT JOIN LOT (NOLOCK)
    ON SEP.EMP_Codigo = LOT.EMP_Codigo
   AND SEP.LOT_Codigo = LOT.Codigo
WHERE PRV.EMP_Codigo = @EmpresaCodigo
  AND PRV.AnoMes = @AnoMes
ORDER BY LOT.Nome, EPG.Nome;
`;

/**
 * Bases oficiais eSocial para encargos DCTF/FGTS (mensal, TipoValor 11).
 * Lotação via SEP/LOT da folha mensal; de-para Braga usa LOT.Nome.
 */
const ENCARGO_BASE_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

;WITH empLot AS (
    SELECT
        EPG.EMP_Codigo AS companyId,
        EMP.Nome AS companyName,
        EPG.Codigo AS employeeId,
        EPG.Nome AS employeeName,
        EPG.MatriculaESocial AS esMat,
        ISNULL(MAX(SEP.LOT_Codigo), '') AS lotacaoCode,
        ISNULL(MAX(LOT.Nome), '') AS lotacaoName
    FROM EFO (NOLOCK)
    INNER JOIN EPG (NOLOCK)
        ON EFO.EMP_Codigo = EPG.EMP_Codigo
       AND EFO.EPG_Codigo = EPG.Codigo
    INNER JOIN FOL (NOLOCK)
        ON EFO.EMP_Codigo = FOL.EMP_Codigo
       AND EFO.FOL_Seq = FOL.Seq
       AND FOL.Folha = 2
    INNER JOIN FPG (NOLOCK)
        ON FOL.EMP_Codigo = FPG.EMP_Codigo
       AND FOL.Seq = FPG.FOL_Seq
       AND FPG.AnoMes = @AnoMes
       AND FPG.Tipo IN (1, 4)
    LEFT JOIN EMP (NOLOCK)
        ON EPG.EMP_Codigo = EMP.Codigo
    LEFT JOIN SEP (NOLOCK)
        ON EFO.EMP_Codigo = SEP.EMP_Codigo
       AND EFO.EPG_Codigo = SEP.EPG_Codigo
       AND EFO.SEP_Data = SEP.Data
    LEFT JOIN LOT (NOLOCK)
        ON SEP.EMP_Codigo = LOT.EMP_Codigo
       AND SEP.LOT_Codigo = LOT.Codigo
    WHERE EFO.EMP_Codigo = @EmpresaCodigo
    GROUP BY
        EPG.EMP_Codigo,
        EMP.Nome,
        EPG.Codigo,
        EPG.Nome,
        EPG.MatriculaESocial
),
cp AS (
    SELECT
        LTRIM(RTRIM(Matricula)) AS esMat,
        SUM(TRY_CAST(Valor AS FLOAT)) AS bcCp
    FROM ES_CS_CP_Base (NOLOCK)
    WHERE EMP_Codigo = @EmpresaCodigo
      AND PeriodoApuracao = @AnoMes
      AND TipoValor = 11
      AND ISNULL(Indicativo13Salario, 0) = 0
    GROUP BY LTRIM(RTRIM(Matricula))
),
fg AS (
    SELECT
        LTRIM(RTRIM(MATRICULA)) AS esMat,
        SUM(TRY_CAST(VALORDEPO AS FLOAT)) AS fgtsDepo
    FROM ES_FGTS_SEGURADO (NOLOCK)
    WHERE EMP_CODIGO = @EmpresaCodigo
      AND PERIODOAPURACAO = @AnoMes
      AND TIPOVALOR = 11
    GROUP BY LTRIM(RTRIM(MATRICULA))
)
SELECT
    el.companyId,
    el.companyName,
    @AnoMes AS competence,
    el.employeeId,
    el.employeeName,
    el.lotacaoCode,
    el.lotacaoName,
    CAST(ROUND(ISNULL(cp.bcCp, 0) * 100, 0) AS INT) AS bcCpCents,
    CAST(ROUND(ISNULL(fg.fgtsDepo, 0) * 100, 0) AS INT) AS fgtsDepoCents
FROM empLot el
LEFT JOIN cp
    ON cp.esMat = LTRIM(RTRIM(el.esMat))
LEFT JOIN fg
    ON fg.esMat = LTRIM(RTRIM(el.esMat))
WHERE ISNULL(cp.bcCp, 0) > 0
   OR ISNULL(fg.fgtsDepo, 0) > 0
ORDER BY el.lotacaoName, el.employeeName;
`;

async function extractFortesPayroll({ companyId = '9274', competence = '2026-04' }) {
  const dbConfig = buildDbConfig();
  const [anoStr, mesStr] = competence.split('-');
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const anoMesStr = anoStr + (mesStr ? mesStr.padStart(2, '0') : '');

  console.log(`[API Fortes] Conectando ao MSSQL... Empresa: ${companyId}, Competência: ${anoMesStr}`);

  let pool;
  try {
    pool = await mssql.connect(dbConfig);
    const request = () =>
      pool
        .request()
        .input('Company', mssql.VarChar(4), companyId)
        .input('AnoParam', mssql.Int, ano)
        .input('MesParam', mssql.Int, mes)
        .input('AnoMesParam', mssql.VarChar(6), anoMesStr);

    const [payrollResult, prov13Result, provFerResult, encargoBaseResult] = await Promise.all([
      request().query(PAYROLL_QUERY),
      request().query(PROV_13_QUERY),
      request().query(PROV_FER_QUERY),
      request().query(ENCARGO_BASE_QUERY),
    ]);

    const provisions = [];
    for (const row of prov13Result.recordset) {
      // Prefer LOT.Nome as lotacaoCode (de-para Braga usa o nome)
      if (row.lotacaoName) row.lotacaoCode = row.lotacaoName;
      provisions.push(...expandProvisionAmounts(row, PROV_13_DEFS));
    }
    for (const row of provFerResult.recordset) {
      if (row.lotacaoName) row.lotacaoCode = row.lotacaoName;
      provisions.push(...expandProvisionAmounts(row, PROV_FER_DEFS));
    }

    const encargoBases = encargoBaseResult.recordset.map((row) => {
      const lotacaoName = row.lotacaoName || '';
      return {
        ...row,
        // de-para Braga usa o nome da lotação
        lotacaoCode: lotacaoName || row.lotacaoCode || '',
        lotacaoName,
      };
    });

    console.log(
      `[API Fortes] Folha=${payrollResult.recordset.length} linhas; ` +
        `Provisões Fortes=${provisions.length} (13º+férias); ` +
        `Bases encargo eSocial=${encargoBases.length}`
    );

    return {
      payroll: payrollResult.recordset,
      provisions,
      encargoBases,
    };
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

module.exports = {
  extractFortesPayroll,
  expandProvisionAmounts,
  buildDbConfig,
  PROV_13_DEFS,
  PROV_FER_DEFS,
  PAYROLL_QUERY,
  PROV_13_QUERY,
  PROV_FER_QUERY,
  ENCARGO_BASE_QUERY,
};

    console.log(`[/api/scrape-eauditoria] Nova requisição: ${ncms.length} NCMs | ${uf}/${atividade}/${regime} | Posição na fila: ${posicaoNaFila + 1}`);

    try {
        const rules = await enqueue({ ncms, uf, atividade, regime, regimeEspecial });
        console.log(`[/api/scrape-eauditoria] ✅ ${rules.length} regras retornadas`);
        res.json({ rules, total: rules.length });
    } catch (err) {
        console.error('[/api/scrape-eauditoria] ❌ Erro:', err.message);

        if (err.message.includes('Credenciais')) {
            res.status(401).json({
                error: 'Credenciais do e-Auditoria não configuradas.',
                detalhe: err.message,
                sugestao: 'Crie o arquivo .env na pasta rayo-server com EAUDITORIA_EMAIL e EAUDITORIA_PASSWORD.'
            });
        } else if (err.message.includes('Timeout') || err.message.includes('download')) {
            res.status(504).json({
                error: 'Timeout ao aguardar resposta do e-Auditoria.',
                detalhe: err.message,
                sugestao: 'Tente reduzir a quantidade de NCMs ou use o upload manual da base.'
            });
        } else if (err.message.includes('login') || err.message.includes('#username')) {
            res.status(401).json({
                error: 'Falha no login do e-Auditoria.',
                detalhe: 'Verifique as credenciais no arquivo .env do servidor.',
                sugestao: 'Confirme que EAUDITORIA_EMAIL e EAUDITORIA_PASSWORD estão corretos.'
            });
        } else {
            res.status(500).json({
                error: 'Erro interno no robô.',
                detalhe: err.message,
                sugestao: 'O layout do e-Auditoria pode ter mudado. Use o upload manual como fallback.'
            });
        }
    }
});

// ── Extração do Fortes (Integração Direta) ───────────────────────────────────
app.post('/api/fortes/extract', async (req, res) => {
    try {
        const payload = req.body;
        const extracted = await extractFortesPayroll(payload);
        // data = folha mensal; provisions = PRD/PRF; encargoBases = eSocial CPP/FGTS
        res.json({
            success: true,
            data: extracted.payroll,
            provisions: extracted.provisions,
            encargoBases: extracted.encargoBases,
        });
    } catch (err) {
        console.error('[/api/fortes/extract] ❌ Erro:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Internal Server Error'
        });
    }
});

// ── Folha Dealer — cadastro de centros + de-para lotação ─────────────────────
app.get('/api/folha-dealer/centers', (req, res) => {
    try {
        const companyId = req.query.companyId || 'braga-veiculos';
        const config = loadCentersConfig(companyId);
        res.json(config);
    } catch (err) {
        console.error('[/api/folha-dealer/centers] GET ❌', err);
        res.status(500).json({ error: err.message || 'Erro ao carregar centros.' });
    }
});

app.put('/api/folha-dealer/centers', (req, res) => {
    try {
        const companyId = req.body?.companyId || 'braga-veiculos';
        const { centers, lotacaoMappings } = req.body || {};
        if (!Array.isArray(centers) || !Array.isArray(lotacaoMappings)) {
            return res.status(400).json({
                error: 'Body deve incluir arrays "centers" e "lotacaoMappings".',
            });
        }
        const saved = saveCentersConfig(companyId, { companyId, centers, lotacaoMappings });
        res.json(saved);
    } catch (err) {
        console.error('[/api/folha-dealer/centers] PUT ❌', err);
        res.status(500).json({ error: err.message || 'Erro ao salvar centros.' });
    }
});

app.post('/api/folha-dealer/centers/lotacao', (req, res) => {
    try {
        const companyId = req.body?.companyId || 'braga-veiculos';
        const { lotacaoCode, dealerCenterCode, allocationMode, active, centerName } = req.body || {};
        if (lotacaoCode === undefined || lotacaoCode === null || !dealerCenterCode) {
            return res.status(400).json({
                error: 'Campos obrigatórios: lotacaoCode, dealerCenterCode.',
            });
        }
        const saved = upsertLotacaoMapping(companyId, {
            lotacaoCode,
            dealerCenterCode,
            allocationMode,
            active,
            centerName,
        });
        res.json(saved);
    } catch (err) {
        console.error('[/api/folha-dealer/centers/lotacao] POST ❌', err);
        res.status(500).json({ error: err.message || 'Erro ao salvar de-para.' });
    }
});

import { useState, useCallback } from 'react';
import {
  createFolhaDealerRun,
  approveFolhaDealerRun,
  exportApprovedDealerTxt,
  exportRunConferenceXlsx,
  buildBragaRowsFortes,
  bragaVeiculosConfig,
  summarizeValidationIssues
} from '../lib/folha-dealer';
import { normalizeFortesQueryRows } from '../lib/folha-dealer/fortes-query-adapter';
import { parseFortesCsv } from '../lib/folha-dealer/fortes-csv-parser';
import { fetchCentersConfig } from '../lib/folha-dealer/centers-config-api';
import { mergeCenterMappings } from '../lib/folha-dealer/merge-center-config';

const COMPANY_ID = 'braga-veiculos';

async function resolveRuntimeConfig() {
  let centersWarning = null;
  let stored = null;

  try {
    stored = await fetchCentersConfig(COMPANY_ID);
  } catch (err) {
    centersWarning = `Cadastro de centros indisponível (${err.message}). Usando seed do config.`;
  }

  const centerMappings = mergeCenterMappings(
    bragaVeiculosConfig.centerMappings,
    stored,
    COMPANY_ID
  );

  return {
    config: { ...bragaVeiculosConfig, centerMappings },
    centersWarning,
  };
}

export function useFolhaDealer() {
  const [runData, setRunData] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [lastSourceRows, setLastSourceRows] = useState(null);
  const [lastCompetence, setLastCompetence] = useState(null);

  const runWithConfig = useCallback((sourceRows, competence, runtimeConfig, centersWarning) => {
    setConfig(runtimeConfig);
    setWarning(centersWarning);
    setLastSourceRows(sourceRows);
    setLastCompetence(competence);

    const newRun = createFolhaDealerRun(sourceRows, {
      config: runtimeConfig,
      competence,
    });
    setRunData(newRun);
  }, []);

  const processRun = async (companyId, competence) => {
    try {
      setError(null);

      let sourceRows = [];
      if (companyId === 'BRAGA_VEICULOS') {
        sourceRows = buildBragaRowsFortes(competence);
      } else {
        throw new Error(`A empresa ${companyId} não possui configuração/fixtures implementados ainda.`);
      }

      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      runWithConfig(sourceRows, competence, runtimeConfig, centersWarning);
      setMetadata(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const processCsvFortes = async (csvContent, targetCompanyId, targetCompetence) => {
    try {
      setError(null);
      const { metadata: newMetadata, rawRows } = parseFortesCsv(csvContent, targetCompanyId, targetCompetence);
      setMetadata(newMetadata);

      if (rawRows.length === 0) {
        throw new Error('Nenhuma linha encontrada para a empresa e competência informadas no CSV.');
      }

      let payrollRows = normalizeFortesQueryRows(
        rawRows,
        {},
        bragaVeiculosConfig.provisionRates,
        bragaVeiculosConfig.encargoRates
      );
      payrollRows = payrollRows.map(row => ({
        ...row,
        companyId: COMPANY_ID
      }));

      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      runWithConfig(payrollRows, targetCompetence, runtimeConfig, centersWarning);
    } catch (err) {
      setError(err.message);
    }
  };

  const extractFromDatabase = async (companyId, competence) => {
    try {
      setError(null);
      setMetadata(null);

      const response = await fetch('/api/fortes/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, competence })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro na extração do banco de dados.');
      }

      const rawRows = result.data;
      if (!rawRows || rawRows.length === 0) {
        throw new Error('Nenhuma linha encontrada no banco para esta competência.');
      }

      const folhaSeqList = [...new Set(
        rawRows
          .map((row) => row.sourcePayrollId)
          .filter((id) => id !== null && id !== undefined && String(id).trim() !== '')
          .map((id) => String(id))
      )].sort((a, b) => Number(a) - Number(b));

      setMetadata({
        totalLinhasFortes: rawRows.length,
        empresa: rawRows[0]?.companyName || companyId,
        competencia: competence,
        folhaSeq: folhaSeqList[0] || null,
        folhaSeqs: folhaSeqList,
        quantidadeFolhas: folhaSeqList.length,
        provisoesFortes: Array.isArray(result.provisions) ? result.provisions.length : 0,
        encargosBases: Array.isArray(result.encargoBases) ? result.encargoBases.length : 0,
      });

      const hasFortesProvisions = Array.isArray(result.provisions);
      const hasFortesEncargoBases = Array.isArray(result.encargoBases) && result.encargoBases.length > 0;
      let payrollRows = normalizeFortesQueryRows(
        rawRows,
        {
          ...(hasFortesProvisions ? { fortesProvisions: result.provisions } : {}),
          ...(hasFortesEncargoBases ? { fortesEncargoBases: result.encargoBases } : {}),
        },
        hasFortesProvisions ? null : bragaVeiculosConfig.provisionRates,
        bragaVeiculosConfig.encargoRates
      );

      if (companyId === '9274' || companyId === 'BRAGA_VEICULOS') {
        payrollRows = payrollRows.map(row => ({
          ...row,
          companyId: COMPANY_ID
        }));
      } else {
        throw new Error(`Empresa ${companyId} não suportada pelos mocks atuais.`);
      }

      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      runWithConfig(payrollRows, competence, runtimeConfig, centersWarning);
    } catch (err) {
      setError(err.message);
    }
  };

  const reprocessLastRun = async () => {
    if (!lastSourceRows || !lastCompetence) {
      throw new Error('Não há lote anterior para reprocessar. Extraia a folha novamente.');
    }
    try {
      setError(null);
      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      runWithConfig(lastSourceRows, lastCompetence, runtimeConfig, centersWarning);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const approveRun = (approvedBy, notes) => {
    if (!runData) return;
    try {
      setError(null);
      const approved = approveFolhaDealerRun(runData, { approvedBy, notes });
      setRunData(approved);
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadExcel = () => {
    if (!runData || !config) return;
    try {
      setError(null);
      const buffer = exportRunConferenceXlsx(runData, { config });

      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `folha_dealer_${runData.companyId}_${runData.competence}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadTxt = (dealerCompanyField, dealerBranchField, accountingDate) => {
    if (!runData) return;
    try {
      setError(null);

      if (!dealerCompanyField || !dealerBranchField || !accountingDate) {
        throw new Error('Empresa Dealer, Filial Dealer e Data Contábil são obrigatórios para exportar o TXT.');
      }

      const normCompany = String(dealerCompanyField).trim().padStart(2, '0');
      const normBranch = String(dealerBranchField).trim().padStart(3, '0');

      if (normCompany.length !== 2) {
        throw new Error(`A Empresa Dealer deve ter exatamente 2 caracteres. Atual: ${normCompany}`);
      }

      if (normBranch.length !== 3) {
        throw new Error(`A Filial Dealer deve ter exatamente 3 caracteres. Atual: ${normBranch}`);
      }

      if (accountingDate.includes('undefined') || accountingDate.includes('null')) {
        throw new Error('Data contábil possui formato inválido.');
      }

      const { run: newRun, content } = exportApprovedDealerTxt(runData, {
        dealerCompanyField: normCompany,
        dealerBranchField: normBranch,
        accountingDate
      });

      if (content.includes('undefined') || content.includes('null') || content.includes('Invalid Date')) {
        throw new Error('A exportação gerou dados inválidos (undefined, null ou Invalid Date). Verifique as parametrizações.');
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lote_dealer_${runData.companyId}_${runData.competence}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      setRunData(newRun);
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    run: runData,
    config,
    error,
    warning,
    metadata,
    summary: runData ? summarizeValidationIssues(runData) : null,
    processRun,
    processCsvFortes,
    extractFromDatabase,
    reprocessLastRun,
    approveRun,
    downloadExcel,
    downloadTxt
  };
}
  { companyId: company.companyId, eventCode: 'ENCARGO_RAT_FAP', dealerAccountCode: '2.1.1.02.001', dealerLotAccountCode: null, dc: 'C', description: 'INSS a Recolher', active: true },
  { companyId: company.companyId, eventCode: 'ENCARGO_TERCEIROS', dealerAccountCode: '6.1.1.02.001', dealerLotAccountCode: null, dc: 'D', description: 'Terceiros Sistema S (DCTFWeb)', active: true },
  { companyId: company.companyId, eventCode: 'ENCARGO_TERCEIROS', dealerAccountCode: '2.1.1.02.001', dealerLotAccountCode: null, dc: 'C', description: 'INSS a Recolher', active: true },
  { companyId: company.companyId, eventCode: 'ENCARGO_FGTS_FOLHA', dealerAccountCode: '6.1.1.02.002', dealerLotAccountCode: null, dc: 'D', description: 'FGTS mensal (tipo 11)', active: true },
  { companyId: company.companyId, eventCode: 'ENCARGO_FGTS_FOLHA', dealerAccountCode: '2.1.1.02.002', dealerLotAccountCode: null, dc: 'C', description: 'FGTS a Recolher', active: true },
];

// ---------------------------------------------------------------------------
// Alíquotas de provisão Braga Veículos
// ---------------------------------------------------------------------------

const provisionRates = {
  feriasTerco: 11.11,   // 1/12 × 4/3 ≈ 11,11%
  decimoTerceiro: 8.33,  // 1/12 ≈ 8,33%
  inssPatronal: 28.80,   // 20% + RAT + Terceiros ≈ 28,80% (só sobre provisões)
  fgts: 8.00,            // 8,00%
};

// Alíquotas encargos mensais (Analítico DCTFWeb + FGTS) — não inclui 1082-01
const encargoRates = {
  inssEmpresa: 20.0, // 1138-01
  gilrat: 1.0, // 1646-01 (RAT × FAP Braga = 1% no Analítico DCTFWeb)
  terceiros: 5.8, // 1170+1176+1191+1196+1200
  fgts: 8.0, // FGTS mensal tipo 11 (fallback; extract usa VALORDEPO)
};

// ---------------------------------------------------------------------------
// Eventos informativos Braga (complementar ao set global)
// ---------------------------------------------------------------------------

const informativeEventCodes = ['600', '601', '602', '603', '604', '605', '937', '938'];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const bragaVeiculosConfig = Object.freeze({
  company,
  centerMappings,
  accountMappings,
  informativeEventCodes,
  provisionRates,
  encargoRates,
});
Vou checar o cabeçalho do CSV e verificar se o banco Fortes está acessível, para esclarecer os tipos de FGTS e a localização do RAT/FAP antes de perguntar.
Bash Check CSV header and DB reachability
IN
head -1 /Users/ryanrichard/projecont/automacoes_RH/automacao_rh_adiantamento/backend/extracao_folha_consolidada.csv 2>&1; nc -z -G 3 192.168.0.5 1433 2>&1; echo "nc=$?"; ls /Users/ryanrichard/projecont/Rayo/apps/rayo-server/node_modules/mssql >/dev/null 2>&1 && echo has-mssql

OUT
companyId;companyName;competence;sourcePayrollId;employeeId;employeeName;lotacaoCode;lotacaoName;eventCode;eventName;sourceEventNature;sourceReference;amountCents;TipoRegistro;IncideINSS;IncideIRRF;IncideFGTS;sourceOrigin;sourceAdapter;sourceLineId
Connection to 192.168.0.5 port 1433 [tcp/ms-sql-s] succeeded!
nc=0
has-mssql
O banco responde. Vou fazer só consultas de leitura (SELECT) para embasar as perguntas.

Bash Run read-only probe queries on Fortes DB
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo-server && cat > /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/probe.js <<'EOF'
const mssql = require('/Users/ryanrichard/projecont/Rayo/apps/rayo-server/node_modules/mssql');
const { buildDbConfig } = require('/Users/ryanrichard/projecont/Rayo/apps/rayo-server/fortes-extractor.js');
(async () => {
  const pool = await mssql.connect(buildDbConfig());
  const q = async (label, sql) => { try { const r = await pool.request().query(sql); console.log('==', label); console.table(r.recordset.slice(0, 40)); } catch (e) { console.log('==', label, 'ERR', e.message); } };
  await q('fgts tipos', `SELECT TIPOVALOR, COUNT(*) n, SUM(TRY_CAST(VALORDEPO AS FLOAT)) depo FROM ES_FGTS_SEGURADO WHERE EMP_CODIGO='9274' AND PERIODOAPURACAO='202604' GROUP BY TIPOVALOR ORDER BY TIPOVALOR`);
  await q('cp tipos', `SELECT TipoValor, ISNULL(Indicativo13Salario,0) i13, COUNT(*) n, SUM(TRY_CAST(Valor AS FLOAT)) v FROM ES_CS_CP_Base WHERE EMP_Codigo='9274' AND PeriodoApuracao='202604' GROUP BY TipoValor, ISNULL(Indicativo13Salario,0) ORDER BY 1,2`);
  await q('cols rat/fap', `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME LIKE '%FAP%' OR COLUMN_NAME LIKE '%RAT%' AND (TABLE_NAME LIKE 'ES%' OR TABLE_NAME IN ('EMP','EST','LOT')) ORDER BY 1`);
  await q('prov ratio', `SELECT FOL.Folha, SUM(x.Provisao) prov, SUM(x.INSSProvisao) inss, SUM(x.FGTSProvisao) fgts FROM PRV JOIN FOL ON PRV.EMP_Codigo=FOL.EMP_Codigo AND PRV.FOL_Seq=FOL.Seq JOIN (SELECT EMP_Codigo, EFO_FOL_Seq, Provisao, INSSProvisao, FGTSProvisao FROM PRD UNION ALL SELECT EMP_Codigo, EFO_FOL_Seq, Provisao, INSSProvisao, FGTSProvisao FROM PRF) x ON x.EMP_Codigo=PRV.EMP_Codigo AND x.EFO_FOL_Seq=PRV.FOL_Seq WHERE PRV.EMP_Codigo='9274' AND PRV.AnoMes='202604' GROUP BY FOL.Folha`);
  await q('prv meses', `SELECT PRV.AnoMes, FOL.Folha, COUNT(*) n FROM PRV JOIN FOL ON PRV.EMP_Codigo=FOL.EMP_Codigo AND PRV.FOL_Seq=FOL.Seq WHERE PRV.EMP_Codigo='9274' AND PRV.AnoMes >= '202601' GROUP BY PRV.AnoMes, FOL.Folha ORDER BY 1,2`);
  await q('liquido neg por lot', `SELECT ISNULL(LOT.Nome,'') lot, SUM(CASE WHEN CAST(EVE.ProvDesc AS VARCHAR(10))='1' THEN EFP.Valor WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('2','-1') THEN -EFP.Valor ELSE 0 END) liq FROM EFO JOIN FOL ON EFO.EMP_Codigo=FOL.EMP_Codigo AND EFO.FOL_Seq=FOL.Seq AND FOL.Folha=2 JOIN FPG ON FOL.EMP_Codigo=FPG.EMP_Codigo AND FOL.Seq=FPG.FOL_Seq AND FPG.AnoMes='202604' AND FPG.Tipo IN (1,4) JOIN EFP ON EFO.EMP_Codigo=EFP.EMP_Codigo AND EFO.FOL_Seq=EFP.EFO_FOL_Seq AND EFO.EPG_Codigo=EFP.EFO_EPG_Codigo JOIN EVE ON EFP.EMP_Codigo=EVE.EMP_Codigo AND EFP.EVE_Codigo=EVE.Codigo LEFT JOIN SEP ON EFO.EMP_Codigo=SEP.EMP_Codigo AND EFO.EPG_Codigo=SEP.EPG_Codigo AND EFO.SEP_Data=SEP.Data LEFT JOIN LOT ON SEP.EMP_Codigo=LOT.EMP_Codigo AND SEP.LOT_Codigo=LOT.Codigo WHERE EFO.EMP_Codigo='9274' GROUP BY LOT.Nome ORDER BY liq`);
  await pool.close();
})().catch(e => { console.error(e); process.exit(1); });
EOF
node /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/probe.js 2>&1 | head -150

OUT
(eval):16: command not found: node
Bash Locate node binary
IN
ls ~/.nvm/versions/node 2>/dev/null; which -a node nodejs 2>/dev/null; ls /opt/homebrew/bin/node /usr/local/bin/node 2>/dev/null; zsh -lic 'which node' 2>/dev/null

OUT
v24.12.0
node not found
nodejs not found
/opt/homebrew/bin/node
/opt/homebrew/bin/node
Bash Run read-only probe queries on Fortes DB
IN
/opt/homebrew/bin/node /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/probe.js 2>&1 | head -150

OUT
== fgts tipos
┌─────────┬───────────┬─────┬────────────────────┐
│ (index) │ TIPOVALOR │ n   │ depo               │
├─────────┼───────────┼─────┼────────────────────┤
│ 0       │ 11        │ 147 │ 43420.42999999999  │
│ 1       │ 12        │ 1   │ 51.43              │
│ 2       │ 13        │ 1   │ 120.49             │
│ 3       │ 15        │ 3   │ 48.559999999999995 │
│ 4       │ 21        │ 4   │ 405.09             │
│ 5       │ 22        │ 4   │ 263.41             │
│ 6       │ 23        │ 3   │ 594.15             │
└─────────┴───────────┴─────┴────────────────────┘
== cp tipos
┌─────────┬───────────┬─────┬─────┬────────────────────┐
│ (index) │ TipoValor │ i13 │ n   │ v                  │
├─────────┼───────────┼─────┼─────┼────────────────────┤
│ 0       │ 11        │ 0   │ 155 │ 554021.43          │
│ 1       │ 11        │ 1   │ 5   │ 3935.78            │
│ 2       │ 21        │ 0   │ 155 │ 46401.359999999986 │
│ 3       │ 21        │ 1   │ 5   │ 295.15999999999997 │
│ 4       │ 31        │ 0   │ 14  │ 950.0499999999998  │
└─────────┴───────────┴─────┴─────┴────────────────────┘
== cols rat/fap
┌─────────┬───────────────────────────┬───────────────────────────┐
│ (index) │ TABLE_NAME                │ COLUMN_NAME               │
├─────────┼───────────────────────────┼───────────────────────────┤
│ 0       │ 'CES'                     │ 'FAP'                     │
│ 1       │ 'ES_CPT'                  │ 'HouveContratacaoAvulsos' │
│ 2       │ 'ES_CPT'                  │ 'RateioINSS'              │
│ 3       │ 'ES_CS_CP_Aliquotas_EST'  │ 'AliquotaRat'             │
│ 4       │ 'ES_CS_CP_Aliquotas_EST'  │ 'AliquotaRATAjustada'     │
│ 5       │ 'ES_CS_CP_Aliquotas_EST'  │ 'FAP'                     │
│ 6       │ 'ES_CS_CP_Aquisicao'      │ 'ValorRatCalcPR'          │
│ 7       │ 'ES_CS_CP_Aquisicao'      │ 'ValorRatDescPR'          │
│ 8       │ 'ES_CS_CP_Aquisicao'      │ 'ValorRatNRet'            │
│ 9       │ 'ES_CS_CP_Base'           │ 'Rateado'                 │
│ 10      │ 'ES_CS_CP_Comerc'         │ 'ValorRatSusp'            │
│ 11      │ 'ES_CS_CP_Periodo'        │ 'Rateado'                 │
│ 12      │ 'ES_FGTS_ECONSIGNADO'     │ 'NRCONTRATO'              │
│ 13      │ 'ES_INFOCOMPL'            │ 'TIPOCONTRATO'            │
│ 14      │ 'ES_IRRF_CONSOLIDAPURMEN' │ 'vlrIndResContrato'       │
│ 15      │ 'ES_IRRF_TotApurMen'      │ 'VlrIndResContrato'       │
│ 16      │ 'HES'                     │ 'DESCONSIDERAFAP'         │
│ 17      │ 'HES'                     │ 'FAP'                     │
│ 18      │ 'HES'                     │ 'PAJ_CODIGO_FAP'          │
│ 19      │ 'MHS'                     │ 'FAP'                     │
│ 20      │ 'SLTR'                    │ 'FAP'                     │
│ 21      │ 'STOM'                    │ 'DESCONSIDERAFAP'         │
│ 22      │ 'STOM'                    │ 'FAP'                     │
│ 23      │ 'STOM'                    │ 'PAJ_CODIGO_FAP'          │
└─────────┴───────────────────────────┴───────────────────────────┘
== prov ratio
┌─────────┬───────┬────────────────────┬───────────────────┬────────────────────┐
│ (index) │ Folha │ prov               │ inss              │ fgts               │
├─────────┼───────┼────────────────────┼───────────────────┼────────────────────┤
│ 0       │ 14    │ 17935.11           │ 5386.871280000002 │ 1422.651599999999  │
│ 1       │ 15    │ 321099.85999999987 │ 88356.91999999994 │ 25671.739999999994 │
└─────────┴───────┴────────────────────┴───────────────────┴────────────────────┘
== prv meses
┌─────────┬──────────┬───────┬───┐
│ (index) │ AnoMes   │ Folha │ n │
├─────────┼──────────┼───────┼───┤
│ 0       │ '202601' │ 14    │ 1 │
│ 1       │ '202601' │ 15    │ 1 │
│ 2       │ '202602' │ 14    │ 1 │
│ 3       │ '202602' │ 15    │ 1 │
│ 4       │ '202603' │ 14    │ 1 │
│ 5       │ '202603' │ 15    │ 1 │
│ 6       │ '202604' │ 14    │ 1 │
│ 7       │ '202604' │ 15    │ 1 │
│ 8       │ '202605' │ 14    │ 1 │
│ 9       │ '202605' │ 15    │ 1 │
│ 10      │ '202606' │ 14    │ 1 │
│ 11      │ '202606' │ 15    │ 1 │
└─────────┴──────────┴───────┴───┘
== liquido neg por lot
┌─────────┬──────────────────────────────────┬────────────────────┐
│ (index) │ lot                              │ liq                │
├─────────┼──────────────────────────────────┼────────────────────┤
│ 0       │ 'DEPT. FUNILARIA / PINTURA'      │ 0                  │
│ 1       │ 'DEPT. PEÇAS FILIAL'             │ 698.7099999999999  │
│ 2       │ 'DEPTO. ACESSORIOS FILIAL'       │ 1812.51            │
│ 3       │ 'TI'                             │ 2062.2400000000002 │
│ 4       │ 'DEPT. DE LEADS FILIAL'          │ 2508.5099999999998 │
│ 5       │ 'DEPT. DE ACESSORIOS'            │ 3223.8299999999995 │
│ 6       │ 'DIRETORIA'                      │ 4323.449999999999  │
│ 7       │ 'DEPT. FINANCIAMENTO FILIAL'     │ 7928.860000000001  │
│ 8       │ 'DEPT. DE FINANCIAMENTO MATRIZ'  │ 10750.56           │
│ 9       │ 'RECURSOS HUMANOS'               │ 11813.04           │
│ 10      │ 'DEPT. DE LEADS MATRIZ'          │ 12186.08           │
│ 11      │ 'DEPT. SERVIÇOS MECANICA MATRIZ' │ 14296.310000000001 │
│ 12      │ 'FISCAL'                         │ 16103.760000000002 │
│ 13      │ 'AGENDAMENTOS'                   │ 16922.06           │
│ 14      │ 'DEPTO VENDA DIRETA FILIAL'      │ 18309.469999999994 │
│ 15      │ 'DEPT. MECANICA FILIAL'          │ 19519.07           │
│ 16      │ 'FINANCEIRO'                     │ 21432.289999999997 │
│ 17      │ 'DEPARTAMENTO DE PEÇAS'          │ 26473.56           │
│ 18      │ 'BRAGA MULTIMARCAS'              │ 30845.199999999997 │
│ 19      │ 'DEPT. DE VENDA DIRETA MATRIZ'   │ 40297.77999999999  │
│ 20      │ 'DEPT. PRODUTIVOS'               │ 62753.04           │
│ 21      │ 'BRAGA VEICULOS FILIAL NOVOS'    │ 66322.53999999996  │
│ 22      │ 'DEPT. VENDAS VEICULOS'          │ 104302.45000000004 │
└─────────┴──────────────────────────────────┴────────────────────┘
Encontrei que os ~R$ 1.483 correspondem exatamente aos TIPOVALOR 12/13/15/21/22/23, e que a base CPP do 13º (R$ 3.935,78) fica fora do cálculo; também localizei a tabela ES_CS_CP_Aliquotas_EST do Fortes com RAT/FAP. Vou examinar essa tabela em seguida.
Bash Inspect eSocial aliquota and base tables
IN
cat > /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/probe2.js <<'EOF'
const mssql = require('/Users/ryanrichard/projecont/Rayo/apps/rayo-server/node_modules/mssql');
const { buildDbConfig } = require('/Users/ryanrichard/projecont/Rayo/apps/rayo-server/fortes-extractor.js');
(async () => {
  const pool = await mssql.connect(buildDbConfig());
  const q = async (label, sql) => { try { const r = await pool.request().query(sql); console.log('==', label); console.table(r.recordset.slice(0, 30)); } catch (e) { console.log('==', label, 'ERR', e.message); } };
  await q('aliq cols', `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='ES_CS_CP_Aliquotas_EST'`);
  await q('aliq 202604', `SELECT TOP 20 * FROM ES_CS_CP_Aliquotas_EST WHERE EMP_Codigo='9274' AND PeriodoApuracao='202604'`);
  await q('cp base cols', `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='ES_CS_CP_Base'`);
  await q('fgts cols', `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='ES_FGTS_SEGURADO'`);
  await pool.close();
})().catch(e => { console.error(e); process.exit(1); });
EOF
/opt/homebrew/bin/node /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/probe2.js 2>&1 | head -150

OUT
== aliq cols
┌─────────┬───────────────────────┬───────────┐
│ (index) │ COLUMN_NAME           │ DATA_TYPE │
├─────────┼───────────────────────┼───────────┤
│ 0       │ 'EMP_Codigo'          │ 'varchar' │
│ 1       │ 'PeriodoApuracao'     │ 'varchar' │
│ 2       │ 'EST_Codigo'          │ 'varchar' │
│ 3       │ 'TOM_Codigo'          │ 'varchar' │
│ 4       │ 'CNAEPreponderante'   │ 'varchar' │
│ 5       │ 'AliquotaRat'         │ 'float'   │
│ 6       │ 'FAP'                 │ 'float'   │
│ 7       │ 'AliquotaRATAjustada' │ 'float'   │
│ 8       │ 'IndSubstPatrObra'    │ 'int'     │
└─────────┴───────────────────────┴───────────┘
== aliq 202604
┌─────────┬────────────┬─────────────────┬────────────┬────────────┬───────────────────┬─────────────┬─────┬─────────────────────┬──────────────────┐
│ (index) │ EMP_Codigo │ PeriodoApuracao │ EST_Codigo │ TOM_Codigo │ CNAEPreponderante │ AliquotaRat │ FAP │ AliquotaRATAjustada │ IndSubstPatrObra │
├─────────┼────────────┼─────────────────┼────────────┼────────────┼───────────────────┼─────────────┼─────┼─────────────────────┼──────────────────┤
│ 0       │ '9274'     │ '202604'        │ '0001'     │ ''         │ '4511101'         │ 2           │ 0.5 │ 1                   │ 0                │
│ 1       │ '9274'     │ '202604'        │ '0002'     │ ''         │ '4511101'         │ 2           │ 1   │ 2                   │ 0                │
└─────────┴────────────┴─────────────────┴────────────┴────────────┴───────────────────┴─────────────┴─────┴─────────────────────┴──────────────────┘
== cp base cols
┌─────────┬───────────────────────┐
│ (index) │ COLUMN_NAME           │
├─────────┼───────────────────────┤
│ 0       │ 'EMP_Codigo'          │
│ 1       │ 'PeriodoApuracao'     │
│ 2       │ 'CPF'                 │
│ 3       │ 'EST_Codigo'          │
│ 4       │ 'TOM_Codigo'          │
│ 5       │ 'LTR_Codigo'          │
│ 6       │ 'Categoria'           │
│ 7       │ 'Matricula'           │
│ 8       │ 'IndicadorSimples'    │
│ 9       │ 'Indicativo13Salario' │
│ 10      │ 'TipoValor'           │
│ 11      │ 'Valor'               │
│ 12      │ 'ValorFortes'         │
│ 13      │ 'Rateado'             │
└─────────┴───────────────────────┘
== fgts cols
┌─────────┬───────────────────┐
│ (index) │ COLUMN_NAME       │
├─────────┼───────────────────┤
│ 0       │ 'EMP_CODIGO'      │
│ 1       │ 'PERIODOAPURACAO' │
│ 2       │ 'CPF'             │
│ 3       │ 'EST_CODIGO'      │
│ 4       │ 'TOM_CODIGO'      │
│ 5       │ 'LTR_CODIGO'      │
│ 6       │ 'CATEGORIA'       │
│ 7       │ 'MATRICULA'       │
│ 8       │ 'DTADMISSAO'      │
│ 9       │ 'DTDESLIGAMENTO'  │
│ 10      │ 'MTVDESLIGAMENTO' │
│ 11      │ 'TIPOVALOR'       │
│ 12      │ 'VALOR'           │
│ 13      │ 'VALORFORTES'     │
│ 14      │ 'CATEGORIAORIGEM' │
│ 15      │ 'DTVENCIMENTO'    │
│ 16      │ 'REMUNSUC'        │
│ 17      │ 'TIPOINCID'       │
│ 18      │ 'VALORDEPO'       │
│ 19      │ 'VALORDEPOFORTES' │
└─────────┴───────────────────┘
Ponto importante: o RAT ajustado é por estabelecimento (EST 0001 = 1%, EST 0002 = 2%), e o código usa 1% fixo para todos. Vou ver se o EST 0002 tem base em abril.

Bash Check CPP base per establishment and RAT history
IN
cat > /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/probe3.js <<'EOF'
const mssql = require('/Users/ryanrichard/projecont/Rayo/apps/rayo-server/node_modules/mssql');
const { buildDbConfig } = require('/Users/ryanrichard/projecont/Rayo/apps/rayo-server/fortes-extractor.js');
(async () => {
  const pool = await mssql.connect(buildDbConfig());
  const q = async (label, sql) => { const r = await pool.request().query(sql); console.log('==', label); console.table(r.recordset.slice(0, 30)); };
  await q('cp by est', `SELECT EST_Codigo, TipoValor, ISNULL(Indicativo13Salario,0) i13, SUM(Valor) v, COUNT(DISTINCT Matricula) m FROM ES_CS_CP_Base WHERE EMP_Codigo='9274' AND PeriodoApuracao IN ('202604','202605','202606') AND TipoValor=11 GROUP BY EST_Codigo, TipoValor, ISNULL(Indicativo13Salario,0)`);
  await q('aliq hist', `SELECT PeriodoApuracao, EST_Codigo, AliquotaRATAjustada FROM ES_CS_CP_Aliquotas_EST WHERE EMP_Codigo='9274' AND PeriodoApuracao>='202601' ORDER BY 1,2`);
  await q('fgts tipos 13', `SELECT TIPOVALOR, TIPOINCID, SUM(VALOR) base, SUM(VALORDEPO) depo FROM ES_FGTS_SEGURADO WHERE EMP_CODIGO='9274' AND PERIODOAPURACAO='202604' GROUP BY TIPOVALOR, TIPOINCID`);
  await pool.close();
})().catch(e => { console.error(e); process.exit(1); });
EOF
/opt/homebrew/bin/node /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/probe3.js 2>&1 | head -80

OUT
== cp by est
┌─────────┬────────────┬───────────┬─────┬────────────────────┬─────┐
│ (index) │ EST_Codigo │ TipoValor │ i13 │ v                  │ m   │
├─────────┼────────────┼───────────┼─────┼────────────────────┼─────┤
│ 0       │ '0001'     │ 11        │ 0   │ 1332407.5400000007 │ 143 │
│ 1       │ '0002'     │ 11        │ 0   │ 340939.8399999999  │ 31  │
│ 2       │ '0001'     │ 11        │ 1   │ 9244.240000000002  │ 15  │
│ 3       │ '0002'     │ 11        │ 1   │ 4840.83            │ 2   │
└─────────┴────────────┴───────────┴─────┴────────────────────┴─────┘
== aliq hist
┌─────────┬─────────────────┬────────────┬─────────────────────┐
│ (index) │ PeriodoApuracao │ EST_Codigo │ AliquotaRATAjustada │
├─────────┼─────────────────┼────────────┼─────────────────────┤
│ 0       │ '202604'        │ '0001'     │ 1                   │
│ 1       │ '202604'        │ '0002'     │ 2                   │
│ 2       │ '202605'        │ '0001'     │ 1                   │
│ 3       │ '202605'        │ '0002'     │ 2                   │
│ 4       │ '202606'        │ '0001'     │ 1                   │
│ 5       │ '202606'        │ '0002'     │ 2                   │
│ 6       │ '202607'        │ '0001'     │ 1                   │
│ 7       │ '202607'        │ '0002'     │ 2                   │
│ 8       │ '202608'        │ '0001'     │ 1                   │
│ 9       │ '202608'        │ '0002'     │ 2                   │
└─────────┴─────────────────┴────────────┴─────────────────────┘
== fgts tipos 13
┌─────────┬───────────┬───────────┬────────────────────┬────────────────────┐
│ (index) │ TIPOVALOR │ TIPOINCID │ base               │ depo               │
├─────────┼───────────┼───────────┼────────────────────┼────────────────────┤
│ 0       │ 11        │ 1         │ 542763.4299999999  │ 43420.42999999999  │
│ 1       │ 12        │ 1         │ 642.93             │ 51.43              │
│ 2       │ 13        │ 1         │ 1506.15            │ 120.49             │
│ 3       │ 15        │ 1         │ 2428.79            │ 48.559999999999995 │
│ 4       │ 21        │ 1         │ 5063.860000000001  │ 405.09             │
│ 5       │ 22        │ 1         │ 3292.8500000000004 │ 263.41             │
│ 6       │ 23        │ 1         │ 7427               │ 594.15             │
└─────────┴───────────┴───────────┴────────────────────┴────────────────────┘
Já tenho o suficiente para seguir. Vou aplicar direto as correções óbvias e listá-las ao final, mas quatro delas alteram valores contábeis, então preciso da sua decisão antes de mexer em qualquer arquivo.
AskUserQuestion
OUT
Your questions have been answered: "Mês em que o Fortes ainda não calculou PRD/PRF (hoje o PRV só existe até 06/2026): o que o motor deve fazer com PROV_*?"="Fallback sintético + aviso", "FGTS com TIPOVALOR ≠ 11 (12, 13, 15, 21, 22, 23 = R$ 1.483,13 em 04/2026) e base CPP de 13º (Indicativo13Salario=1, R$ 3.935,78 em 04/2026) hoje ficam fora. Como tratar?"="Tudo no encargo do mês (Recomendado)", "No Fortes, o RAT ajustado é por estabelecimento: EST 0001 = 1% (RAT 2 × FAP 0,5) e EST 0002 = 2% (RAT 2 × FAP 1,0). O EST 0002 tem cerca de 31 funcionários e R$ 340 mil de base (04–06/2026). O código usa 1% para todos. Qual valor usar?"="Ler do Fortes por EST (Recomendado)", "Fallback sintético de provisão (fluxo CSV): hoje a base é proventos − descontos e o INSS é 28,80% fixo. A base vai passar a ser só proventos IncideFGTS, como já é nos encargos. Qual alíquota de INSS usar sobre a provisão?"="Soma dos encargos (Recomendado)". You can now continue with these answers in mind.
Decisões registradas. Antes de editar, preciso confirmar como a lotação aparece no CSV: hoje o mapa estático mascara tudo, e ao passar a priorizar o Fortes isso muda.

Bash Check CSV lotação values and contracts/validator
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo && awk -F';' 'NR>1{print $7" | "$8}' /Users/ryanrichard/projecont/automacoes_RH/automacao_rh_adiantamento/backend/extracao_folha_consolidada.csv | sort | uniq -c | head -15; grep -n "lotacaoCode" src/lib/folha-dealer/braga-veiculos.config.js | head -5; cat src/lib/folha-dealer/center-mapper.js; cat src/lib/folha-dealer/contracts.js | sed -n 1,82p; cat src/lib/folha-dealer/folha-validator.js

OUT
  42 001 | RECURSOS HUMANOS
 100 002 | FINANCEIRO
  52 003 | FISCAL
  23 004 | DIRETORIA
  11 005 | TI
 136 006 | DEPARTAMENTO DE PEÇAS
  28 007 | DEPT. DE ACESSORIOS
  91 008 | DEPT. SERVIÇOS MECANICA MATRIZ
   2 009 | DEPT. FUNILARIA / PINTURA
 142 010 | DEPT. PRODUTIVOS
 143 011 | AGENDAMENTOS
  50 012 | DEPT. MECANICA FILIAL
  10 013 | DEPT. PEÇAS FILIAL
  16 014 | DEPTO. ACESSORIOS FILIAL
 416 015 | DEPT. VENDAS VEICULOS
27:  { companyId: company.companyId, lotacaoCode: 'ADM', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
28:  { companyId: company.companyId, lotacaoCode: 'RH', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
29:  { companyId: company.companyId, lotacaoCode: 'FIN', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
30:  { companyId: company.companyId, lotacaoCode: 'FISCAL', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
31:  { companyId: company.companyId, lotacaoCode: 'TI', dealerCenterCode: '000600', dealerCenterName: 'Administração', allocationMode: 'direct', active: true },
/**
 * center-mapper.js — Aplica de-para de lotação Fortes → centro Dealer.
 *
 * Regras:
 * - Retorna o centro Dealer para uma dada lotação + empresa.
 * - Lotações `direct` e `activity` com centro cadastrado no de-para resolvem.
 * - Retorna null se não houver mapeamento (o validator emitirá issue).
 */

/**
 * @param {string} lotacaoCode
 * @param {string} companyId
 * @param {object[]} centerMappings — CenterMapping[]
 * @returns {{ centerCode: string, centerName: string|null } | null}
 */
export function mapCenter(lotacaoCode, companyId, centerMappings) {
  const mapping = centerMappings.find(
    (m) => m.active && m.companyId === companyId && m.lotacaoCode === lotacaoCode
  );

  if (!mapping) return null;

  return {
    centerCode: mapping.dealerCenterCode,
    centerName: mapping.dealerCenterName || null,
  };
}
/**
 * contracts.js — Contratos e constantes do domínio Folha Fortes -> Dealer.
 *
 * Source of truth: docs/folha-dealer/data-contracts.md
 *                  docs/folha-dealer/business-rules.md
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Tipo de lote fixo para lançamentos de folha. */
export const BATCH_TYPE = 'FP';

/** Tamanho fixo da linha TXT Dealer (layout validado). */
export const DEALER_LINE_LENGTH = 483;

/** Eventos informativos / base que nunca geram lançamento contábil. */
export const INFORMATIVE_EVENT_CODES = new Set([
  '600', '601', '602', '603', '604',
]);

/** Conta obrigatória para o evento 100. */
export const EVENT_100_REQUIRED_ACCOUNT = '2.1.1.03.001';

// ---------------------------------------------------------------------------
// Códigos de validação
// ---------------------------------------------------------------------------

export const ValidationCodes = Object.freeze({
  MISSING_CENTER_MAPPING:       'MISSING_CENTER_MAPPING',
  ACTIVITY_MAPPING_REQUIRED:    'ACTIVITY_MAPPING_REQUIRED',
  MISSING_ACCOUNT_MAPPING:      'MISSING_ACCOUNT_MAPPING',
  EVENT_100_ACCOUNT_MISMATCH:   'EVENT_100_ACCOUNT_MISMATCH',
  CENTER_ON_BALANCE_ACCOUNT:    'CENTER_ON_BALANCE_ACCOUNT',
  CENTER_REMOVED_FROM_BALANCE_ACCOUNT: 'CENTER_REMOVED_FROM_BALANCE_ACCOUNT',
  MISSING_REQUIRED_CENTER:      'MISSING_REQUIRED_CENTER',
  UNBALANCED_JOURNAL:           'UNBALANCED_JOURNAL',
  NEGATIVE_VALUE_WITHOUT_POLICY:'NEGATIVE_VALUE_WITHOUT_POLICY',
  ZERO_VALUE_IGNORED:           'ZERO_VALUE_IGNORED',
  INFORMATIVE_EVENT_IGNORED:    'INFORMATIVE_EVENT_IGNORED',
  UNUSED_MAPPING:               'UNUSED_MAPPING',
  ROUNDING_ADJUSTMENT:          'ROUNDING_ADJUSTMENT',
  MISSING_DEALER_LOT_ACCOUNT_CODE: 'MISSING_DEALER_LOT_ACCOUNT_CODE',
  INVALID_DEALER_ACCOUNT_FORMAT:   'INVALID_DEALER_ACCOUNT_FORMAT',
  INVALID_DEALER_LINE_LENGTH:      'INVALID_DEALER_LINE_LENGTH',
});

// ---------------------------------------------------------------------------
// Utilitários de formatação
// ---------------------------------------------------------------------------

/**
 * Gera o histórico padrão: `FOLHA DE PAGAMENTO REF MM/AAAA`.
 * @param {string} competence — formato `YYYY-MM`.
 * @returns {string}
 */
export function buildHistory(competence) {
  const [year, month] = competence.split('-');
  return `FOLHA DE PAGAMENTO REF ${month}/${year}`;
}

/**
 * Retorna o primeiro dígito numérico da conta contábil.
 * Contas iniciadas por 1 ou 2 → patrimoniais (sem centro).
 * Contas iniciadas por 3+ → resultado (exigem centro).
 * @param {string} accountCode
 * @returns {number}
 */
export function accountClass(accountCode) {
  const first = accountCode.replace(/\D/g, '').charAt(0);
  return parseInt(first, 10);
}

/**
 * Retorna true se a conta exige centro de custo (classe >= 3).
 * @param {string} accountCode
 * @returns {boolean}
 */
export function accountRequiresCenter(accountCode) {
  return accountClass(accountCode) >= 3;
}
/**
 * folha-validator.js — Validações pós-geração de lançamentos.
 *
 * Validações neste módulo:
 * - UNBALANCED_JOURNAL: total D ≠ total C.
 * - CENTER_ON_BALANCE_ACCOUNT: conta 1/2 com centro preenchido.
 *
 * As demais validações (MISSING_ACCOUNT_MAPPING, MISSING_CENTER_MAPPING, etc.)
 * são emitidas inline pelo journal-builder durante a geração.
 */

import { ValidationCodes, accountRequiresCenter } from './contracts.js';

/**
 * Valida o journal final.
 * @param {object[]} entries — AccountingEntry[].
 * @param {object[]} existingIssues — issues já coletadas pelo builder.
 * @returns {object[]} — issues adicionais encontradas.
 */
export function validateJournal(entries, existingIssues = []) {
  const additionalIssues = [];

  // ------ CENTER_ON_BALANCE_ACCOUNT ------
  for (const entry of entries) {
    if (!accountRequiresCenter(entry.accountCode) && entry.centerCode) {
      additionalIssues.push({
        code: ValidationCodes.CENTER_ON_BALANCE_ACCOUNT,
        severity: 'blocker',
        message: `Conta ${entry.accountCode} (classe 1/2) recebeu centro ${entry.centerCode}. Centro deve ser removido.`,
        context: { accountCode: entry.accountCode, centerCode: entry.centerCode, eventCode: entry.eventCode },
      });
    }
  }

  // ------ UNBALANCED_JOURNAL ------
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    if (entry.dc === 'D') {
      totalDebit += entry.amountCents;
    } else if (entry.dc === 'C') {
      totalCredit += entry.amountCents;
    }
  }

  if (totalDebit !== totalCredit) {
    additionalIssues.push({
      code: ValidationCodes.UNBALANCED_JOURNAL,
      severity: 'blocker',
      message: `Journal desbalanceado: débitos ${totalDebit} ≠ créditos ${totalCredit}.`,
      context: { totalDebit, totalCredit, difference: totalDebit - totalCredit },
    });
  }

  return additionalIssues;
}

/**
 * Determina o status da execução com base nas issues.
 * @param {object[]} issues
 * @returns {'blocked' | 'ready'}
 */
export function resolveStatus(issues) {
  const hasBlocker = issues.some((i) => i.severity === 'blocker');
  return hasBlocker ? 'blocked' : 'ready';
}
Vou priorizar o nome vindo do Fortes na lotação, já que o de-para da Braga usa nome (como já ocorre com provisões e encargos), enquanto o CSV traz código + nome. Agora rodo os testes como linha de base.
Bash Run folha-dealer test baseline
IN
export PATH=/opt/homebrew/bin:$PATH && grep '"test' package.json; npx vitest run tests/folha-dealer* 2>&1 | tail -15

OUT
    286|     };
    287|     const { line } = buildDealerTxtLine(entry, legacyOptions);
    288|     expect(line.length).toBe(453);
       |                         ^
    289|   });
    290| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  2 failed | 9 passed (11)
      Tests  5 failed | 136 passed (141)
   Start at  10:05:01
   Duration  583ms (transform 438ms, setup 0ms, import 1.35s, tests 132ms, environment 1ms)
Bash List baseline failing tests
IN
export PATH=/opt/homebrew/bin:$PATH && npx vitest run tests/folha-dealer* --reporter=verbose 2>&1 | grep -E "✗|×|FAIL" | head -20

OUT
 ✓ tests/folha-dealer-fortes-query-adapter.test.js > Fortes Query Adapter > 15. usa provisões Fortes (PRD/PRF) e não sintetiza taxa×BC-FGTS 0ms
 × tests/folha-dealer-dealer-txt-layout.test.js > Dealer TXT Layout 483 — buildDealerTxtLine483 > data 1 e data 2 corretas nas posições 374-389 3ms
 × tests/folha-dealer-dealer-txt-layout.test.js > Dealer TXT Layout 483 — buildDealerTxtLine483 > conta com pontos no parâmetro lança erro 1ms
 × tests/folha-dealer-dealer-txt-layout.test.js > Dealer TXT Layout — Legacy backward compat > buildDealerTxtLine still returns 453-char line 2ms
 × tests/folha-dealer-dealer-txt-exporter.test.js > Dealer TXT Exporter — Layout 483 > bloqueia com MISSING_DEALER_LOT_ACCOUNT_CODE quando dealerLotAccountCode é null 4ms
 × tests/folha-dealer-dealer-txt-exporter.test.js > Dealer TXT Exporter — Layout 483 > data 1 e data 2 corretas nas posições 372-391 2ms
 FAIL  tests/folha-dealer-dealer-txt-exporter.test.js > Dealer TXT Exporter — Layout 483 > bloqueia com MISSING_DEALER_LOT_ACCOUNT_CODE quando dealerLotAccountCode é null
 FAIL  tests/folha-dealer-dealer-txt-exporter.test.js > Dealer TXT Exporter — Layout 483 > data 1 e data 2 corretas nas posições 372-391
 FAIL  tests/folha-dealer-dealer-txt-layout.test.js > Dealer TXT Layout 483 — buildDealerTxtLine483 > data 1 e data 2 corretas nas posições 374-389
 FAIL  tests/folha-dealer-dealer-txt-layout.test.js > Dealer TXT Layout 483 — buildDealerTxtLine483 > conta com pontos no parâmetro lança erro
 FAIL  tests/folha-dealer-dealer-txt-layout.test.js > Dealer TXT Layout — Legacy backward compat > buildDealerTxtLine still returns 453-char line
Há 5 falhas pré-existentes, todas no layout TXT, sem relação com esta tarefa. Vou ler os testes do adapter e dos encargos antes de editar.

Bash Read adapter and encargo tests
IN
cat tests/folha-dealer-fortes-query-adapter.test.js; sed -n 1,60p tests/folha-dealer-encargo-calculator.test.js; grep -n "employeeLotacao\|lotacao" tests/folha-dealer-engine.test.js | head -20

OUT
import { describe, it, expect } from 'vitest';
import {
  normalizeFortesQueryRows,
  mapFortesProvDesc,
  mapFortesRecordType,
  buildFortesSourceLineId,
} from '../src/lib/folha-dealer/fortes-query-adapter.js';

describe('Fortes Query Adapter', () => {
  it('1. normaliza uma linha crua Fortes para PayrollSourceRow', () => {
    const raw = [{
      companyId: 2025,
      companyName: 'BRAGA',
      competence: '2026-04',
      lotacaoCode: '10',
      eventCode: '100',
      amountCents: 150000,
      ProvDesc: 1
    }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0]).toEqual(expect.objectContaining({
      sourceSystem: 'fortes',
      sourceAdapter: 'fortes-query',
      sourceOrigin: 'folha-mensal',
      companyId: '2025',
      companyName: 'BRAGA',
      competence: '2026-04',
      lotacaoCode: '10',
      eventCode: '100',
      amountCents: 150000,
      sourceEventNature: 'PROVENTO',
    }));
  });

  it('2. converte competência 202604 para 2026-04', () => {
    const raw = [{ lotacaoCode: '1', eventCode: '1', competence: '202604' }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].competence).toBe('2026-04');
    
    const rawNum = [{ lotacaoCode: '1', eventCode: '1', competence: 202604 }];
    const resultNum = normalizeFortesQueryRows(rawNum);
    expect(resultNum[0].competence).toBe('2026-04');
  });

  it('3. mantém competência 2026-04 quando já vier normalizada', () => {
    const raw = [{ lotacaoCode: '1', eventCode: '1', competence: '2026-04' }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].competence).toBe('2026-04');
  });

  it('4. ProvDesc = 1 vira PROVENTO', () => {
    expect(mapFortesProvDesc(1)).toBe('PROVENTO');
  });

  it('5. ProvDesc = 2 vira DESCONTO', () => {
    expect(mapFortesProvDesc(2)).toBe('DESCONTO');
  });

  it('6. ProvDesc = -1 vira DESCONTO', () => {
    expect(mapFortesProvDesc(-1)).toBe('DESCONTO');
  });

  it('7. ProvDesc = 0 vira INFORMATIVO', () => {
    expect(mapFortesProvDesc(0)).toBe('INFORMATIVO');
  });

  it('8. valor em centavos sempre positivo', () => {
    const raw = [{ lotacaoCode: '1', eventCode: '1', amountCents: -5000 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].amountCents).toBe(5000);
  });

  it('9. preserva lotacaoCode e lotacaoName', () => {
    const raw = [{ lotacaoCode: '005', lotacaoName: 'VENDAS', eventCode: '1' }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('005');
    expect(result[0].lotacaoName).toBe('VENDAS');
  });

  it('10. preserva zeros/códigos como string', () => {
    const raw = [{ lotacaoCode: '010', eventCode: '005', companyId: '020' }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('010');
    expect(result[0].eventCode).toBe('005');
    expect(result[0].companyId).toBe('020');
  });

  it('11. gera sourceLineId', () => {
    const raw = [{ lotacaoCode: '1', eventCode: '2', companyId: 2025, competence: '2026-04', employeeId: 123 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].sourceLineId).toBeDefined();
    expect(typeof result[0].sourceLineId).toBe('string');
  });

  it('12. aceita lotacao vazia quando não houver mapeamento de empregado', () => {
    const raw = [{ eventCode: '1', amountCents: 100 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('');
    expect(result[0].eventCode).toBe('1');
  });

  it('13. ignora linhas sem eventCode', () => {
    const raw = [{ lotacaoCode: '1', amountCents: 100 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result.filter((r) => r.sourceOrigin === 'folha-mensal')).toHaveLength(0);
  });

  it('14. sintetiza a linha LIQUIDO_FOLHA por lotação quando há proventos e descontos', () => {
    const raw = [
      { lotacaoCode: '001', eventCode: '100', amountCents: 500000, ProvDesc: 1 }, // Provento
      { lotacaoCode: '001', eventCode: '200', amountCents: 100000, ProvDesc: 2 }, // Desconto
      { lotacaoCode: '002', eventCode: '100', amountCents: 300000, ProvDesc: 1 }, // Provento
      { lotacaoCode: '002', eventCode: '200', amountCents: 300000, ProvDesc: 2 }, // Desconto -> Zero, não deve gerar líquido
    ];
    
    const result = normalizeFortesQueryRows(raw);
    
    // As 4 linhas originais + 1 linha sintetizada para a lotação 001
    expect(result.length).toBe(5);
    
    const derived = result.find(r => r.eventCode === 'LIQUIDO_FOLHA');
    expect(derived).toBeDefined();
    expect(derived.eventName).toBe('Líquido da Folha a Pagar');
    expect(derived.lotacaoCode).toBe('001');
    expect(derived.amountCents).toBe(400000); // 500k - 100k
    expect(derived.sourceOrigin).toBe('fortes-query-derived');
    expect(derived.sourceRecordType).toBe('DESCONTO'); // Para ser consistente com algo que é a pagar (embora o D/C venha da config)
  });

  it('15. usa provisões Fortes (PRD/PRF) e não sintetiza taxa×BC-FGTS', () => {
    const raw = [
      {
        companyId: '9274',
        competence: '202604',
        lotacaoCode: 'DEPT. VENDAS VEICULOS',
        lotacaoName: 'DEPT. VENDAS VEICULOS',
        eventCode: '011',
        amountCents: 10000000,
        ProvDesc: 1,
        TipoRegistro: 'PROVENTO',
        IncideFGTS: '1',
        employeeId: '000015',
      },
    ];
    const fortesProvisions = [
      {
        companyId: '9274',
        competence: '202604',
        lotacaoCode: 'DEPT. VENDAS VEICULOS',
        lotacaoName: 'DEPT. VENDAS VEICULOS',
        employeeId: '000015',
        eventCode: 'PROV_13',
        eventName: 'Provisão 13º Salário (Fortes)',
        amountCents: 207638,
        sourceOrigin: 'fortes-provision',
        TipoRegistro: 'PROVISAO',
      },
      {
        companyId: '9274',
        competence: '202604',
        lotacaoCode: 'DEPT. DE VENDA DIRETA MATRIZ',
        lotacaoName: 'DEPT. DE VENDA DIRETA MATRIZ',
        employeeId: '000001',
        eventCode: 'PROV_13',
        eventName: 'Provisão 13º Salário (Fortes)',
        amountCents: -11867,
        sourceOrigin: 'fortes-provision',
        TipoRegistro: 'PROVISAO',
      },
    ];

    const result = normalizeFortesQueryRows(
      raw,
      { fortesProvisions },
      { feriasTerco: 11.11, decimoTerceiro: 8.33, inssPatronal: 28.8, fgts: 8 },
      null
    );

    const provRows = result.filter((r) => r.eventCode === 'PROV_13');
    expect(provRows).toHaveLength(2);
    expect(provRows.every((r) => r.sourceOrigin === 'fortes-provision')).toBe(true);
    expect(provRows.find((r) => r.lotacaoCode === 'DEPT. VENDAS VEICULOS').amountCents).toBe(207638);
    expect(provRows.find((r) => r.lotacaoCode === 'DEPT. DE VENDA DIRETA MATRIZ').amountCents).toBe(-11867);

    // Sem linhas sintéticas provision-derived
    expect(result.some((r) => r.sourceOrigin === 'provision-derived')).toBe(false);
  });

  it('16. total PROV_13 por lotação bate com RH Provisionar abr/2026 (17.935,11)', () => {
    // Totais por lotação do relatório Fortes RH (coluna Provisionar) — competência PRV.AnoMes=202604
    const rhByLot = {
      'RECURSOS HUMANOS': 99199,
      FINANCEIRO: 205169,
      FISCAL: 158786,
      DIRETORIA: 46836,
      TI: 28619,
      'DEPARTAMENTO DE PEÇAS': 202902,
      'DEPT. DE ACESSORIOS': 27500,
      'DEPT. SERVIÇOS MECANICA MATRIZ': 119500,
      'DEPT. FUNILARIA / PINTURA': 0,
      'DEPT. PRODUTIVOS': 123750,
      AGENDAMENTOS: 111471,
      'DEPT. MECANICA FILIAL': 55000,
      'DEPT. PEÇAS FILIAL': 6754,
      'DEPTO. ACESSORIOS FILIAL': 13750,
      'DEPT. VENDAS VEICULOS': 207638,
      'DEPT. DE VENDA DIRETA MATRIZ': -11867,
      'DEPT. DE LEADS MATRIZ': 55000,
      'DEPT. DE FINANCIAMENTO MATRIZ': 48416,
      'BRAGA VEICULOS FILIAL NOVOS': 78747,
      'DEPT. FINANCIAMENTO FILIAL': 33722,
      'DEPTO VENDA DIRETA FILIAL': 34570,
      'BRAGA MULTIMARCAS': 134299,
      'DEPT. DE LEADS FILIAL': 13750,
    };

    const fortesProvisions = Object.entries(rhByLot)
      .filter(([, cents]) => cents !== 0)
      .map(([lot, cents]) => ({
        companyId: '9274',
        competence: '202604',
        lotacaoCode: lot,
        lotacaoName: lot,
        eventCode: 'PROV_13',
        amountCents: cents,
        sourceOrigin: 'fortes-provision',
        TipoRegistro: 'PROVISAO',
      }));

    const result = normalizeFortesQueryRows(
      [{ lotacaoCode: 'FINANCEIRO', eventCode: '011', amountCents: 100, ProvDesc: 1 }],
      { fortesProvisions },
      null,
      { inssPatronal: 0.2, ratFap: 0.02, terceiros: 0.058, fgts: 0.08 }
    );

    const byLot = {};
    for (const row of result.filter((r) => r.eventCode === 'PROV_13')) {
      byLot[row.lotacaoCode] = (byLot[row.lotacaoCode] || 0) + row.amountCents;
    }

    let total = 0;
    for (const [lot, cents] of Object.entries(rhByLot)) {
      if (cents === 0) continue;
      expect(byLot[lot]).toBe(cents);
      total += cents;
    }
    expect(total).toBe(1793511);
    expect(result.some((r) => r.sourceOrigin === 'provision-derived')).toBe(false);
  });
});
import { describe, it, expect } from 'vitest';
import {
  calculateEncargos,
  calculateEncargosFromBases,
  DEFAULT_ENCARGO_RATES,
} from '../src/lib/folha-dealer/encargo-calculator.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import { mapAccount } from '../src/lib/folha-dealer/account-mapper.js';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';

function baseRow(overrides = {}) {
  return {
    companyId: '1',
    competence: '2026-06',
    employeeId: '100',
    employeeName: 'Func Teste',
    lotacaoCode: '001',
    lotacaoName: 'TESTE',
    TipoRegistro: 'PROVENTO',
    IncideFGTS: '1',
    amountCents: 100000, // R$ 1.000,00
    eventCode: '011',
    eventName: 'Salário-Base',
    ...overrides,
  };
}

describe('encargo-calculator (DCTFWeb / FGTS)', () => {
  it('gera os 4 encargos patronais (GILRAT 1%) sobre proventos IncideFGTS', () => {
    const rows = calculateEncargos([baseRow()], DEFAULT_ENCARGO_RATES);
    const byCode = Object.fromEntries(rows.map((r) => [r.eventCode, r]));

    expect(Object.keys(byCode).sort()).toEqual([
      'ENCARGO_FGTS_FOLHA',
      'ENCARGO_INSS_PATRONAL',
      'ENCARGO_RAT_FAP',
      'ENCARGO_TERCEIROS',
    ]);

    expect(byCode.ENCARGO_INSS_PATRONAL.amountCents).toBe(20000); // 20%
    expect(byCode.ENCARGO_RAT_FAP.amountCents).toBe(1000); // 1%
    expect(byCode.ENCARGO_TERCEIROS.amountCents).toBe(5800); // 5.8%
    expect(byCode.ENCARGO_FGTS_FOLHA.amountCents).toBe(8000); // 8%
  });

  it('não reduz a BC com descontos IncideFGTS (INSS/VT não saem da base DCTF)', () => {
    const rows = calculateEncargos(
      [
        baseRow({ amountCents: 100000 }),
        baseRow({
          eventCode: '310',
          eventName: 'INSS',
          TipoRegistro: 'DESCONTO',
          IncideFGTS: '1',
          amountCents: 8000,
        }),
      ],
      DEFAULT_ENCARGO_RATES
    );
    const inss = rows.find((r) => r.eventCode === 'ENCARGO_INSS_PATRONAL');
30:                lotacaoCode: 'ADM',
48:                lotacaoCode: 'AGENDAMENTOS',
80:            lotacaoCode: 'AGENDAMENTOS',
81:            lotacaoName: 'AGENDAMENTOS',
94:            (i) => i.lotacaoCode === 'AGENDAMENTOS' && i.eventCode === 'PROV_13'
129:            lotacaoCode: 'AGENDAMENTOS',
130:            lotacaoName: 'AGENDAMENTOS',
147:                lotacaoCode: 'AGENDAMENTOS',
148:                lotacaoName: 'AGENDAMENTOS',
171:                (i) => i.lotacaoCode === 'AGENDAMENTOS' && i.eventCode === r.eventCode
187:                    lotacaoCode: 'AGENDAMENTOS',
188:                    lotacaoName: 'AGENDAMENTOS',
219:            item.lotacaoCode === 'ADM' && item.eventCode === '011'
226:    it('consolida a mesma lotacao+evento de sequencias de folha distintas', () => {
245:            item.lotacaoCode === 'ADM' && item.eventCode === '011'
251:            item.lotacaoCode === 'ADM' && item.eventCode === '011'
255:    it('mantem separados eventos diferentes na mesma lotacao', () => {
261:                sourceLineId: 'inss-mesma-lotacao',
267:        const admItems = consolidated.filter((item) => item.lotacaoCode === 'ADM');
279:                lotacaoCode: 'VEN',
O teste 9 exige que o adapter preserve o código da lotação, então vou mover a troca código→nome para o parser CSV, como o servidor já faz. Vou revisar o summarizer antes de adicionar os novos avisos.
Bash Read validation summarizer and UI usage
IN
cat src/lib/folha-dealer/validation-summarizer.js; grep -rn "ValidationCodes\.\|INFORMATIVE_EVENT_IGNORED" src --include=*.jsx | head

OUT
export function summarizeValidationIssues(runData) {
  const summary = {
    missingCenters: [],
    missingAccounts: [],
    unbalancedJournal: null
  };

  if (!runData || !runData.issues || !runData.consolidatedItems) return summary;

  const { issues, consolidatedItems } = runData;

  const lotacaoMap = {};
  const eventMap = {};

  for (const item of consolidatedItems) {
    if (!lotacaoMap[item.lotacaoCode]) {
      lotacaoMap[item.lotacaoCode] = { 
        name: item.lotacaoName || 'Desconhecida',
        totalCents: 0
      };
    }
    lotacaoMap[item.lotacaoCode].totalCents += item.amountCents;

    if (!eventMap[item.eventCode]) {
      eventMap[item.eventCode] = { 
        name: item.eventName || 'Desconhecido', 
        tipo: item.sourceRecordType || 'Desconhecido',
        totalCents: 0
      };
    }
    eventMap[item.eventCode].totalCents += item.amountCents;
  }

  const centerGroups = {}; 
  const accountGroups = {};

  for (const issue of issues) {
    if (issue.code === 'MISSING_CENTER_MAPPING') {
      const code = issue.context?.lotacaoCode;
      if (!centerGroups[code]) {
        centerGroups[code] = {
          lotacaoCode: code,
          lotacaoName: lotacaoMap[code]?.name || 'Desconhecida',
          count: 0,
          totalCents: lotacaoMap[code]?.totalCents || 0
        };
      }
      centerGroups[code].count++;
    } 
    else if (issue.code === 'MISSING_ACCOUNT_MAPPING') {
      const code = issue.context?.eventCode;
      if (!accountGroups[code]) {
        accountGroups[code] = {
          eventCode: code,
          eventName: eventMap[code]?.name || 'Desconhecido',
          tipo: eventMap[code]?.tipo || 'Desconhecido',
          count: 0,
          totalCents: eventMap[code]?.totalCents || 0
        };
      }
      accountGroups[code].count++;
    }
    else if (issue.code === 'UNBALANCED_JOURNAL') {
      summary.unbalancedJournal = {
        totalDebitCents: issue.context?.totalDebit || 0,
        totalCreditCents: issue.context?.totalCredit || 0,
        differenceCents: Math.abs(issue.context?.difference || 0),
        probableCause: 'Falta crédito explícito do líquido da folha a pagar'
      };
    }
  }

  summary.missingCenters = Object.values(centerGroups).sort((a, b) => b.totalCents - a.totalCents);
  summary.missingAccounts = Object.values(accountGroups).sort((a, b) => b.totalCents - a.totalCents);

  return summary;
}
(eval):1: no matches found: --include=*.jsx
Agora as edições. Começo pelo adapter: lotação com o Fortes em primeiro lugar, líquido com sinal e fallback de provisão.

Bash Edit Fortes query adapter
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo/src/lib/folha-dealer && python3 - <<'EOF'
p='fortes-query-adapter.js'
s=open(p).read()
old_resolve=s[s.index('function resolveLotacao(raw) {'):s.index('function toPayrollSourceRow')]
new_resolve='''/**
 * Lotação: Fortes (SEP/LOT) é a fonte de verdade. O mapa estático por empregado
 * só entra quando a linha chega sem lotação.
 */
export function resolveLotacao(raw) {
  const code = raw.lotacaoCode != null ? String(raw.lotacaoCode) : '';
  const name = raw.lotacaoName ? String(raw.lotacaoName) : '';
  if (code) {
    return { lotacaoCode: code, lotacaoName: name || code };
  }
  if (name) {
    return { lotacaoCode: name, lotacaoName: name };
  }
  const mapped = raw.employeeId ? employeeLotacaoMap[raw.employeeId] : null;
  if (mapped) {
    return { lotacaoCode: mapped, lotacaoName: mapped };
  }
  return { lotacaoCode: '', lotacaoName: '' };
}

'''
s=s.replace(old_resolve,new_resolve)

s=s.replace('''    const amt = Math.abs(raw.amountCents || 0);''','''    const amt = Math.abs(Number(raw.amountCents) || 0);''')
s=s.replace('''  for (const [code, data] of Object.entries(liquidoPerLotacao)) {
    if (data.amount > 0) {''','''  // Líquido com sinal: negativo (descontos > proventos) segue para o journal,
  // que bloqueia por NEGATIVE_VALUE_WITHOUT_POLICY em vez de sumir em silêncio.
  for (const [code, data] of Object.entries(liquidoPerLotacao)) {
    if (data.amount !== 0) {''')

old_prov=s[s.index('  // Provisões: Fortes manda (PRD/PRF).'):s.index('  return normalized;\n}')]
new_prov='''  // Fallbacks sintéticos usam a mesma lotação resolvida da folha
  const rowsWithLotacao = rawRows.map((raw) => ({ ...raw, ...resolveLotacao(raw) }));

  // Provisões: Fortes manda (PRD/PRF). Mês sem PRD/PRF → fallback sintético
  // (sourceOrigin provision-derived; o motor emite SYNTHETIC_PROVISION).
  if (fortesProvisions.length > 0) {
    for (let i = 0; i < fortesProvisions.length; i++) {
      const raw = { ...fortesProvisions[i], sourceOrigin: FORTES_PROVISION_ORIGIN };
      if (raw.eventCode === undefined || raw.eventCode === null || String(raw.eventCode).trim() === '') {
        continue;
      }
      normalized.push(
        toPayrollSourceRow(raw, `prov-${i}`, { preserveSign: true })
      );
    }
  } else if (provisionRates) {
    const provisionRows = calculateProvisions(rowsWithLotacao, provisionRates);
    normalized.push(...provisionRows);
  }

  // Encargos: bases eSocial (preferido) → senão sintético (602/605 ou proventos FGTS)
  if (fortesEncargoBases.length > 0) {
    const encargoRows = calculateEncargosFromBases(
      fortesEncargoBases,
      encargoRates || DEFAULT_ENCARGO_RATES
    );
    normalized.push(...encargoRows);
  } else if (provisionRates || encargoRates || fortesProvisions.length > 0) {
    const encargoRows = calculateEncargos(rowsWithLotacao, encargoRates || DEFAULT_ENCARGO_RATES);
    normalized.push(...encargoRows);
  }

'''
s=s.replace(old_prov,new_prov)
s=s.replace(" * @param {object|null} provisionRates — se fortesProvisions vier preenchido, o sintético é desligado",
 " * @param {object|null} provisionRates — fallback sintético usado só quando fortesProvisions vier vazio")
open(p,'w').write(s)
EOF
git diff --stat

OUT
 .../src/lib/folha-dealer/fortes-query-adapter.js   | 34 +++++++++++++---------
 1 file changed, 21 insertions(+), 13 deletions(-)
Agora o normalizer (mapa só como fallback, líquido preserva sinal):

Bash Edit normalizer, CSV parser and mock fetcher
IN
python3 - <<'EOF'
p='fortes-normalizer.js'
s=open(p).read()
s=s.replace(""" * - PROV_* de origem Fortes (`fortes-provision`) mantêm o sinal — Provisionar
 *   negativo = estorno (o journal inverte D/C).""",""" * - PROV_* de origem Fortes (`fortes-provision`) mantêm o sinal — Provisionar
 *   negativo = estorno (o journal inverte D/C).
 * - LIQUIDO_FOLHA mantém o sinal — negativo vira blocker no journal.
 * - Lotação vinda do Fortes prevalece; mapa estático só preenche lotação vazia.""")
s=s.replace("""/**
 * Provisões Fortes (PRD/PRF) e eventos PROV_* preservam sinal.""","""/**
 * Provisões Fortes (PRD/PRF), eventos PROV_* e o líquido derivado preservam sinal.""")
s=s.replace("""  return code.startsWith('PROV_');""","""  return code.startsWith('PROV_') || code === 'LIQUIDO_FOLHA';""")
s=s.replace("""    // Override Lotação if we have an employee mapped from the XLS
    if (normalized.employeeId && employeeLotacaoMap[normalized.employeeId]) {""","""    // Mapa estático (XLS) só quando a origem não trouxe lotação
    const hasLotacao = normalized.lotacaoCode != null && String(normalized.lotacaoCode) !== '';
    if (!hasLotacao && normalized.employeeId && employeeLotacaoMap[normalized.employeeId]) {""")
s=s.replace("""      // Keep lotacaoName in sync for UI purposes
""","")
open(p,'w').write(s)

p='fortes-csv-parser.js'
s=open(p).read()
for f in [p,'fortes-data-fetcher.js']:
    t=open(f).read()
    t=t.replace("""        lotacaoCode: row.lotacaoCode,
        lotacaoName: row.lotacaoName,""","""        // de-para Braga usa o nome da lotação (mesma regra do extract do banco)
        lotacaoCode: row.lotacaoName || row.lotacaoCode,
        lotacaoName: row.lotacaoName,""")
    t=t.replace("""        ProvDesc: provDesc,""","""        ProvDesc: provDesc,
        TipoRegistro: row.TipoRegistro,
        IncideFGTS: row.IncideFGTS,""")
    open(f,'w').write(t)
EOF
git diff fortes-csv-parser.js fortes-data-fetcher.js | head -50

OUT
diff --git a/apps/rayo/src/lib/folha-dealer/fortes-csv-parser.js b/apps/rayo/src/lib/folha-dealer/fortes-csv-parser.js
index b09c587..5bf906b 100644
--- a/apps/rayo/src/lib/folha-dealer/fortes-csv-parser.js
+++ b/apps/rayo/src/lib/folha-dealer/fortes-csv-parser.js
@@ -45,12 +45,15 @@ export function parseFortesCsv(csvContent, targetCompanyId, targetCompetence) {
         companyId: row.companyId,
         companyName: row.companyName,
         competence: row.competence,
-        lotacaoCode: row.lotacaoCode,
+        // de-para Braga usa o nome da lotação (mesma regra do extract do banco)
+        lotacaoCode: row.lotacaoName || row.lotacaoCode,
         lotacaoName: row.lotacaoName,
         eventCode: row.eventCode,
         eventName: row.eventName,
         amountCents: amountCents,
         ProvDesc: provDesc,
+        TipoRegistro: row.TipoRegistro,
+        IncideFGTS: row.IncideFGTS,
         employeeId: row.employeeId,
         employeeName: row.employeeName,
         sourcePayrollId: row.sourcePayrollId,
diff --git a/apps/rayo/src/lib/folha-dealer/fortes-data-fetcher.js b/apps/rayo/src/lib/folha-dealer/fortes-data-fetcher.js
index 1a2512a..7cfe45a 100644
--- a/apps/rayo/src/lib/folha-dealer/fortes-data-fetcher.js
+++ b/apps/rayo/src/lib/folha-dealer/fortes-data-fetcher.js
@@ -64,12 +64,15 @@ export async function fetchFortesDataMock(companyId, competence) {
         companyId: row.companyId,
         companyName: row.companyName,
         competence: row.competence,
-        lotacaoCode: row.lotacaoCode,
+        // de-para Braga usa o nome da lotação (mesma regra do extract do banco)
+        lotacaoCode: row.lotacaoName || row.lotacaoCode,
         lotacaoName: row.lotacaoName,
         eventCode: row.eventCode,
         eventName: row.eventName,
         amountCents: amountCents,
         ProvDesc: provDesc,
+        TipoRegistro: row.TipoRegistro,
+        IncideFGTS: row.IncideFGTS,
         employeeId: row.employeeId,
         employeeName: row.employeeName,
         sourcePayrollId: row.sourcePayrollId,
Agora o fallback de provisão: base só com proventos e INSS derivado dos encargos.

Bash Edit provision calculator and config rates
IN
python3 - <<'EOF'
p='provision-calculator.js'
s=open(p).read()
s=s.replace(""" * No fluxo Braga com extract do banco, as provisões vêm de PRD/PRF no Fortes
 * (`sourceOrigin: fortes-provision`) e este módulo NÃO é chamado.""",""" * No fluxo Braga com extract do banco, as provisões vêm de PRD/PRF no Fortes
 * (`sourceOrigin: fortes-provision`). Este módulo só roda no CSV ou em mês sem
 * PRD/PRF calculado (o motor emite SYNTHETIC_PROVISION).""")
s=s.replace(""" * Base de cálculo: BC-FGTS por lotação (soma dos proventos com IncideFGTS=1
 * menos descontos com IncideFGTS=1 que reduzem a base).""",""" * Base de cálculo: Σ proventos com IncideFGTS=1 por empregado|lotação.
 * Descontos (INSS, VT…) não reduzem a remuneração que gera férias/13º.""")
s=s.replace("""  inssPatronal: 28.80,   // 20% + RAT + Terceiros ≈ 28,80%""","""  inssPatronal: 26.80,   // = encargos 20% + GILRAT 1% + Terceiros 5,8%""")
s=s.replace("""/**
/**
 * Calcula a BC-FGTS por empregado""","""/**
 * Calcula a base (proventos IncideFGTS) por empregado""")
s=s.replace("""    if (tipo !== 'PROVENTO' && tipo !== 'DESCONTO') continue;""","""    if (tipo !== 'PROVENTO') continue;""")
s=s.replace("""    const entry = bases.get(key);
    if (tipo === 'PROVENTO') {
      entry.base += amount;
    } else {
      entry.base -= amount;
    }""","""    bases.get(key).base += amount;""")
s=s.replace("""        sourceReference: `BC-FGTS: ${data.base}`,""","""        sourceReference: `Base proventos FGTS: ${data.base}`,""")
open(p,'w').write(s)

p='braga-veiculos.config.js'
s=open(p).read()
old=s[s.index('const provisionRates = {'):s.index('// ---------------------------------------------------------------------------\n// Eventos informativos')]
new='''// Alíquotas encargos mensais (Analítico DCTFWeb + FGTS) — não inclui 1082-01
// No extract do banco o GILRAT vem por estabelecimento (ES_CS_CP_Aliquotas_EST)
// e o FGTS vem de VALORDEPO; estes valores são fallback.
const encargoRates = {
  inssEmpresa: 20.0, // 1138-01
  gilrat: 1.0, // 1646-01 (fallback; EST 0001 = 1%, EST 0002 = 2% no eSocial)
  terceiros: 5.8, // 1170+1176+1191+1196+1200
  fgts: 8.0, // FGTS mensal (fallback)
};

// Alíquotas de provisão (fallback sintético; extract usa PRD/PRF do Fortes)
const provisionRates = {
  feriasTerco: 11.11,   // 1/12 × 4/3 ≈ 11,11%
  decimoTerceiro: 8.33,  // 1/12 ≈ 8,33%
  // INSS sobre provisões = mesmas alíquotas patronais dos encargos
  inssPatronal: encargoRates.inssEmpresa + encargoRates.gilrat + encargoRates.terceiros,
  fgts: 8.00,            // 8,00%
};

'''
s=s.replace(old,new)
open(p,'w').write(s)
EOF
git diff braga-veiculos.config.js provision-calculator.js | head -90

OUT
diff --git a/apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js b/apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js
index 75bb6aa..b8397f4 100644
--- a/apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js
+++ b/apps/rayo/src/lib/folha-dealer/braga-veiculos.config.js
@@ -238,19 +238,23 @@ const accountMappings = [
 // Alíquotas de provisão Braga Veículos
 // ---------------------------------------------------------------------------
 
-const provisionRates = {
-  feriasTerco: 11.11,   // 1/12 × 4/3 ≈ 11,11%
-  decimoTerceiro: 8.33,  // 1/12 ≈ 8,33%
-  inssPatronal: 28.80,   // 20% + RAT + Terceiros ≈ 28,80% (só sobre provisões)
-  fgts: 8.00,            // 8,00%
-};
-
 // Alíquotas encargos mensais (Analítico DCTFWeb + FGTS) — não inclui 1082-01
+// No extract do banco o GILRAT vem por estabelecimento (ES_CS_CP_Aliquotas_EST)
+// e o FGTS vem de VALORDEPO; estes valores são fallback.
 const encargoRates = {
   inssEmpresa: 20.0, // 1138-01
-  gilrat: 1.0, // 1646-01 (RAT × FAP Braga = 1% no Analítico DCTFWeb)
+  gilrat: 1.0, // 1646-01 (fallback; EST 0001 = 1%, EST 0002 = 2% no eSocial)
   terceiros: 5.8, // 1170+1176+1191+1196+1200
-  fgts: 8.0, // FGTS mensal tipo 11 (fallback; extract usa VALORDEPO)
+  fgts: 8.0, // FGTS mensal (fallback)
+};
+
+// Alíquotas de provisão (fallback sintético; extract usa PRD/PRF do Fortes)
+const provisionRates = {
+  feriasTerco: 11.11,   // 1/12 × 4/3 ≈ 11,11%
+  decimoTerceiro: 8.33,  // 1/12 ≈ 8,33%
+  // INSS sobre provisões = mesmas alíquotas patronais dos encargos
+  inssPatronal: encargoRates.inssEmpresa + encargoRates.gilrat + encargoRates.terceiros,
+  fgts: 8.00,            // 8,00%
 };
 
 // ---------------------------------------------------------------------------
diff --git a/apps/rayo/src/lib/folha-dealer/provision-calculator.js b/apps/rayo/src/lib/folha-dealer/provision-calculator.js
index 9074550..8f74e9b 100644
--- a/apps/rayo/src/lib/folha-dealer/provision-calculator.js
+++ b/apps/rayo/src/lib/folha-dealer/provision-calculator.js
@@ -2,7 +2,8 @@
  * provision-calculator.js — Fallback sintético de provisões (taxa × BC-FGTS).
  *
  * No fluxo Braga com extract do banco, as provisões vêm de PRD/PRF no Fortes
- * (`sourceOrigin: fortes-provision`) e este módulo NÃO é chamado.
+ * (`sourceOrigin: fortes-provision`). Este módulo só roda no CSV ou em mês sem
+ * PRD/PRF calculado (o motor emite SYNTHETIC_PROVISION).
  *
  * Provisões geradas por lotação (fallback CSV / sem Fortes):
  *   PROV_FERIAS    → Férias + 1/3 de Férias
@@ -12,8 +13,8 @@
  *   PROV_FGTS_FER  → FGTS s/ Férias
  *   PROV_FGTS_13   → FGTS s/ 13º
  *
- * Base de cálculo: BC-FGTS por lotação (soma dos proventos com IncideFGTS=1
- * menos descontos com IncideFGTS=1 que reduzem a base).
+ * Base de cálculo: Σ proventos com IncideFGTS=1 por empregado|lotação.
+ * Descontos (INSS, VT…) não reduzem a remuneração que gera férias/13º.
  *
  * Módulo puro: não lê arquivos, não escreve arquivos, não acessa banco.
  */
@@ -25,7 +26,7 @@
 export const DEFAULT_PROVISION_RATES = Object.freeze({
   feriasTerco: 11.11,   // 1/12 × 4/3 ≈ 11,11%
   decimoTerceiro: 8.33,  // 1/12 ≈ 8,33%
-  inssPatronal: 28.80,   // 20% + RAT + Terceiros ≈ 28,80%
+  inssPatronal: 26.80,   // = encargos 20% + GILRAT 1% + Terceiros 5,8%
   fgts: 8.00,            // 8,00%
 });
 
@@ -34,8 +35,7 @@ export const DEFAULT_PROVISION_RATES = Object.freeze({
 // ---------------------------------------------------------------------------
 
 /**
-/**
- * Calcula a BC-FGTS por empregado a partir dos raw rows do Fortes.
+ * Calcula a base (proventos IncideFGTS) por empregado a partir dos raw rows do Fortes.
  *
  * @param {object[]} rawRows — linhas brutas do CSV/DB Fortes
  * @returns {Map<string, { base: number, lotacaoCode: string, lotacaoName: string, companyId: string, competence: string, employeeId: string, employeeName: string }>}
@@ -48,7 +48,7 @@ function calculateFgtsBasePerEmployee(rawRows) {
     if (incideFgts !== '1') continue;
 
     const tipo = String(row.TipoRegistro || row.tipoRegistro || '').toUpperCase();
-    if (tipo !== 'PROVENTO' && tipo !== 'DESCONTO') continue;
+    if (tipo !== 'PROVENTO') continue;
 
     const employeeId = String(row.employeeId || '');
     if (!employeeId) continue;
Bash Rename config section header and check float sum
IN
sed -i '' 's|^// Alíquotas de provisão Braga Veículos$|// Alíquotas Braga Veículos (encargos + provisões)|' braga-veiculos.config.js && /opt/homebrew/bin/node -e "console.log(20+1+5.8)"

OUT
26.8
Agora o encargo-calculator: GILRAT por estabelecimento e FGTS de todos os tipos.

Bash Edit encargo calculator for per-EST GILRAT
IN
python3 - <<'EOF'
p='encargo-calculator.js'
s=open(p).read()
s=s.replace(""" *   FGTS mensal (tipo 11)                     → ENCARGO_FGTS_FOLHA""",""" *   FGTS do mês (todos os TIPOVALOR)          → ENCARGO_FGTS_FOLHA""")
s=s.replace(""" * Preferência de base (fluxo extract DB):
 *   ES_CS_CP_Base (TipoValor 11) + ES_FGTS_SEGURADO.VALORDEPO → calculateEncargosFromBases""",""" * Preferência de base (fluxo extract DB):
 *   ES_CS_CP_Base (TipoValor 11, inclui 13º) + ES_FGTS_SEGURADO.VALORDEPO (todos os tipos)
 *   + ES_CS_CP_Aliquotas_EST.AliquotaRATAjustada por estabelecimento → calculateEncargosFromBases""")
s=s.replace("""  gilrat: 1.0, // 1646-01 (RAT × FAP da empresa; Braga = 1%)""","""  gilrat: 1.0, // 1646-01 (fallback; extract usa RAT ajustado por estabelecimento)""")
s=s.replace("""  fgts: 8.0, // FGTS mensal (só no fallback sintético)
});""","""  fgts: 8.0, // FGTS mensal (só no fallback sintético)
});

const FGTS_DEF = Object.freeze({
  eventCode: 'ENCARGO_FGTS_FOLHA',
  eventName: 'FGTS do mês',
  dctfRef: 'FGTS',
});""")
s=s.replace("""    sourceLineId: `encargo-${def.eventCode}-${data.employeeId}-${data.lotacaoCode}`,""","""    sourceLineId: `encargo-${def.eventCode}-${data.employeeId}-${data.lotacaoCode}${data.estCode ? `-${data.estCode}` : ''}`,""")
s=s.replace(""" * @param {object[]} baseRows — { bcCpCents, fgtsDepoCents, employeeId, lotacaoCode, ... }""",""" * @param {object[]} baseRows — { bcCpCents, fgtsDepoCents, estCode, gilratPct, employeeId, lotacaoCode, ... }
 *   gilratPct (RAT ajustado do estabelecimento) prevalece sobre rates.gilrat.""")
s=s.replace("""      lotacaoName: row.lotacaoName || lotacaoCode,
    };

    if (bcCpCents > 0) {
      for (const def of CPP_DEFS) {
        const amountCents = Math.round(bcCpCents * (merged[def.rateKey] / 100));
        pushEncargoRow(
          encargoRows,
          data,
          def,
          amountCents,
          `ES_CS_CP_Base: ${bcCpCents}; DCTF: ${def.dctfRef}`,
          'fortes-encargo'
        );
      }
    }

    if (fgtsDepoCents > 0) {
      pushEncargoRow(
        encargoRows,
        data,
        {
          eventCode: 'ENCARGO_FGTS_FOLHA',
          eventName: 'FGTS mensal (tipo 11)',
          dctfRef: 'FGTS-11',
        },
        fgtsDepoCents,""","""      lotacaoName: row.lotacaoName || lotacaoCode,
      estCode: row.estCode ? String(row.estCode) : '',
    };
    const gilratPct = row.gilratPct != null && Number.isFinite(Number(row.gilratPct))
      ? Number(row.gilratPct)
      : null;
    const rowRates = gilratPct != null ? { ...merged, gilrat: gilratPct } : merged;
    const estRef = data.estCode ? `; EST: ${data.estCode}` : '';

    if (bcCpCents > 0) {
      for (const def of CPP_DEFS) {
        const pct = rowRates[def.rateKey];
        const amountCents = Math.round(bcCpCents * (pct / 100));
        pushEncargoRow(
          encargoRows,
          data,
          def,
          amountCents,
          `ES_CS_CP_Base: ${bcCpCents}; DCTF: ${def.dctfRef}; ${pct}%${estRef}`,
          'fortes-encargo'
        );
      }
    }

    if (fgtsDepoCents > 0) {
      pushEncargoRow(
        encargoRows,
        data,
        FGTS_DEF,
        fgtsDepoCents,""")
s=s.replace("""        `ES_FGTS_SEGURADO.VALORDEPO: ${fgtsDepoCents}`,""","""        `ES_FGTS_SEGURADO.VALORDEPO: ${fgtsDepoCents}${estRef}`,""")
s=s.replace("""      pushEncargoRow(
        encargoRows,
        data,
        {
          eventCode: 'ENCARGO_FGTS_FOLHA',
          eventName: 'FGTS mensal (tipo 11)',
          dctfRef: 'FGTS-11',
        },
        amountCents,""","""      pushEncargoRow(
        encargoRows,
        data,
        FGTS_DEF,
        amountCents,""")
s=s.replace("""          : `BC-FGTS: ${data.fgtsCents}; DCTF/FGTS: FGTS-11`,""","""          : `BC-FGTS: ${data.fgtsCents}`,""")
open(p,'w').write(s)
EOF
grep -n "tipo 11\|FGTS-11" encargo-calculator.js braga-veiculos.config.js; git diff encargo-calculator.js | head -120

OUT
braga-veiculos.config.js:233:  { companyId: company.companyId, eventCode: 'ENCARGO_FGTS_FOLHA', dealerAccountCode: '6.1.1.02.002', dealerLotAccountCode: null, dc: 'D', description: 'FGTS mensal (tipo 11)', active: true },
diff --git a/apps/rayo/src/lib/folha-dealer/encargo-calculator.js b/apps/rayo/src/lib/folha-dealer/encargo-calculator.js
index 52b1f13..01a1331 100644
--- a/apps/rayo/src/lib/folha-dealer/encargo-calculator.js
+++ b/apps/rayo/src/lib/folha-dealer/encargo-calculator.js
@@ -9,7 +9,7 @@
  *   1191-01 SENAC 1,00%                       → ENCARGO_TERCEIROS (soma 5,80%)
  *   1196-01 SESC 1,50%
  *   1200-01 SEBRAE 0,60%
- *   FGTS mensal (tipo 11)                     → ENCARGO_FGTS_FOLHA
+ *   FGTS do mês (todos os TIPOVALOR)          → ENCARGO_FGTS_FOLHA
  *
  * Excluído: 1082-01 INSS descontado do segurado (evento Fortes 310, já mapeado).
  *
@@ -18,7 +18,8 @@
  *   FGTS                      → D 6.1.1.02.002 / C 2.1.1.02.002
  *
  * Preferência de base (fluxo extract DB):
- *   ES_CS_CP_Base (TipoValor 11) + ES_FGTS_SEGURADO.VALORDEPO → calculateEncargosFromBases
+ *   ES_CS_CP_Base (TipoValor 11, inclui 13º) + ES_FGTS_SEGURADO.VALORDEPO (todos os tipos)
+ *   + ES_CS_CP_Aliquotas_EST.AliquotaRATAjustada por estabelecimento → calculateEncargosFromBases
  *
  * Fallback sintético (CSV / sem eSocial):
  *   1) eventos informativos 602 (BC CPP) e 605 (FGTS)
@@ -27,11 +28,17 @@
 
 export const DEFAULT_ENCARGO_RATES = Object.freeze({
   inssEmpresa: 20.0, // 1138-01
-  gilrat: 1.0, // 1646-01 (RAT × FAP da empresa; Braga = 1%)
+  gilrat: 1.0, // 1646-01 (fallback; extract usa RAT ajustado por estabelecimento)
   terceiros: 5.8, // 1170+1176+1191+1196+1200
   fgts: 8.0, // FGTS mensal (só no fallback sintético)
 });
 
+const FGTS_DEF = Object.freeze({
+  eventCode: 'ENCARGO_FGTS_FOLHA',
+  eventName: 'FGTS do mês',
+  dctfRef: 'FGTS',
+});
+
 const CPP_DEFS = Object.freeze([
   {
     eventCode: 'ENCARGO_INSS_PATRONAL',
@@ -80,14 +87,15 @@ function pushEncargoRow(encargoRows, data, def, amountCents, sourceReference, so
     amountCents,
     employeeId: data.employeeId != null ? String(data.employeeId) : null,
     employeeName: data.employeeName || '',
-    sourceLineId: `encargo-${def.eventCode}-${data.employeeId}-${data.lotacaoCode}`,
+    sourceLineId: `encargo-${def.eventCode}-${data.employeeId}-${data.lotacaoCode}${data.estCode ? `-${data.estCode}` : ''}`,
   });
 }
 
 /**
  * Encargos a partir das bases oficiais eSocial (extract Fortes).
  *
- * @param {object[]} baseRows — { bcCpCents, fgtsDepoCents, employeeId, lotacaoCode, ... }
+ * @param {object[]} baseRows — { bcCpCents, fgtsDepoCents, estCode, gilratPct, employeeId, lotacaoCode, ... }
+ *   gilratPct (RAT ajustado do estabelecimento) prevalece sobre rates.gilrat.
  * @param {object} [rates]
  * @returns {object[]}
  */
@@ -111,17 +119,24 @@ export function calculateEncargosFromBases(baseRows, rates = DEFAULT_ENCARGO_RAT
       employeeName: row.employeeName || '',
       lotacaoCode,
       lotacaoName: row.lotacaoName || lotacaoCode,
+      estCode: row.estCode ? String(row.estCode) : '',
     };
+    const gilratPct = row.gilratPct != null && Number.isFinite(Number(row.gilratPct))
+      ? Number(row.gilratPct)
+      : null;
+    const rowRates = gilratPct != null ? { ...merged, gilrat: gilratPct } : merged;
+    const estRef = data.estCode ? `; EST: ${data.estCode}` : '';
 
     if (bcCpCents > 0) {
       for (const def of CPP_DEFS) {
-        const amountCents = Math.round(bcCpCents * (merged[def.rateKey] / 100));
+        const pct = rowRates[def.rateKey];
+        const amountCents = Math.round(bcCpCents * (pct / 100));
         pushEncargoRow(
           encargoRows,
           data,
           def,
           amountCents,
-          `ES_CS_CP_Base: ${bcCpCents}; DCTF: ${def.dctfRef}`,
+          `ES_CS_CP_Base: ${bcCpCents}; DCTF: ${def.dctfRef}; ${pct}%${estRef}`,
           'fortes-encargo'
         );
       }
@@ -131,13 +146,9 @@ export function calculateEncargosFromBases(baseRows, rates = DEFAULT_ENCARGO_RAT
       pushEncargoRow(
         encargoRows,
         data,
-        {
-          eventCode: 'ENCARGO_FGTS_FOLHA',
-          eventName: 'FGTS mensal (tipo 11)',
-          dctfRef: 'FGTS-11',
-        },
+        FGTS_DEF,
         fgtsDepoCents,
-        `ES_FGTS_SEGURADO.VALORDEPO: ${fgtsDepoCents}`,
+        `ES_FGTS_SEGURADO.VALORDEPO: ${fgtsDepoCents}${estRef}`,
         'fortes-encargo'
       );
     }
@@ -251,15 +262,11 @@ export function calculateEncargos(rawRows, rates = DEFAULT_ENCARGO_RATES) {
       pushEncargoRow(
         encargoRows,
         data,
-        {
-          eventCode: 'ENCARGO_FGTS_FOLHA',
-          eventName: 'FGTS mensal (tipo 11)',
-          dctfRef: 'FGTS-11',
-        },
+        FGTS_DEF,
         amountCents,
         data.hasInformative
           ? `EFP 605: ${data.fgtsCents}`
-          : `BC-FGTS: ${data.fgtsCents}; DCTF/FGTS: FGTS-11`,
+          : `BC-FGTS: ${data.fgtsCents}`,
         'encargo-calculator'
       );
Bash Guard empty gilrat and rename FGTS description
IN
python3 - <<'EOF'
p='encargo-calculator.js'
s=open(p).read()
s=s.replace("""    const gilratPct = row.gilratPct != null && Number.isFinite(Number(row.gilratPct))
      ? Number(row.gilratPct)
      : null;""","""    const gilratPct =
      row.gilratPct != null && row.gilratPct !== '' && Number.isFinite(Number(row.gilratPct))
        ? Number(row.gilratPct)
        : null;""")
open(p,'w').write(s)
p='braga-veiculos.config.js'
s=open(p).read()
s=s.replace("description: 'FGTS mensal (tipo 11)'","description: 'FGTS do mês'")
open(p,'w').write(s)
EOF
grep -n "FGTS do mês" braga-veiculos.config.js

OUT
233:  { companyId: company.companyId, eventCode: 'ENCARGO_FGTS_FOLHA', dealerAccountCode: '6.1.1.02.002', dealerLotAccountCode: null, dc: 'D', description: 'FGTS do mês', active: true },
Agora os avisos no motor, para que um fallback sintético nunca passe em silêncio:

Bash Add synthetic source warnings to engine
IN
python3 - <<'EOF'
p='contracts.js'
s=open(p).read()
s=s.replace("""  INVALID_DEALER_LINE_LENGTH:      'INVALID_DEALER_LINE_LENGTH',
});""","""  INVALID_DEALER_LINE_LENGTH:      'INVALID_DEALER_LINE_LENGTH',
  SYNTHETIC_PROVISION:             'SYNTHETIC_PROVISION',
  SYNTHETIC_ENCARGO:               'SYNTHETIC_ENCARGO',
});""")
open(p,'w').write(s)

p='index.js'
s=open(p).read()
s=s.replace("""import { validateJournal, resolveStatus } from './folha-validator.js';

/**""","""import { validateJournal, resolveStatus } from './folha-validator.js';
import { ValidationCodes } from './contracts.js';

/**
 * Avisa quando PROV_* / ENCARGO_* saíram do cálculo interno em vez do Fortes/eSocial.
 * @param {object[]} rows — PayrollSourceRow[] normalizadas.
 * @param {string} competence
 * @returns {object[]}
 */
function buildSourceIssues(rows, competence) {
  const issues = [];
  const count = (origin) => rows.filter((r) => r.sourceOrigin === origin).length;

  const syntheticProvisions = count('provision-derived');
  if (syntheticProvisions > 0) {
    issues.push({
      code: ValidationCodes.SYNTHETIC_PROVISION,
      severity: 'warning',
      message: `Provisões sem PRD/PRF do Fortes em ${competence}: ${syntheticProvisions} linhas PROV_* calculadas por alíquota (fallback). Confira com o relatório de provisão do RH.`,
      context: { competence, rows: syntheticProvisions },
    });
  }

  const syntheticEncargos = count('encargo-derived');
  if (syntheticEncargos > 0) {
    issues.push({
      code: ValidationCodes.SYNTHETIC_ENCARGO,
      severity: 'warning',
      message: `Encargos sem bases eSocial em ${competence}: ${syntheticEncargos} linhas ENCARGO_* calculadas por alíquota (fallback). Confira com a DCTFWeb/FGTS Digital.`,
      context: { competence, rows: syntheticEncargos },
    });
  }

  return issues;
}

/**""")
s=s.replace("""  // 5. Merge issues
  const allIssues = [...builderIssues, ...validatorIssues];""","""  // 5. Merge issues
  const allIssues = [...buildSourceIssues(normalized, competence), ...builderIssues, ...validatorIssues];""")
open(p,'w').write(s)
EOF
git diff index.js | head -5

OUT
diff --git a/apps/rayo/src/lib/folha-dealer/index.js b/apps/rayo/src/lib/folha-dealer/index.js
index 89a2dc2..73fc202 100644
--- a/apps/rayo/src/lib/folha-dealer/index.js
+++ b/apps/rayo/src/lib/folha-dealer/index.js
@@ -61,6 +61,40 @@ import { normalizePayrollRows } from './fortes-normalizer.js';
Agora o hook, que passa a enviar sempre as alíquotas de fallback:

Edit useFolhaDealer.js
Removed 1 line
Bash Check UI renders run warnings
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo/src && grep -rn "issues" --include='*.jsx' . | grep -i "warning\|severity\|map(" | head -10

OUT
pages/FolhaDealerPage.jsx:261:                     {row.issues.map((issue, i) => (
Bash Inspect issue rendering in page
IN
grep -n "issues\|warning" pages/FolhaDealerPage.jsx | head -40

OUT
23:      run, error, warning, metadata, summary,
100:         const itemIssues = run.issues.filter(i =>
111:         const hasWarning = itemIssues.some(i => i.severity === 'warning');
155:               issues: itemIssues
175:                     issues: itemIssues
193:                  issues: itemIssues
207:         case 'SEM_CENTRO': result = result.filter(r => r.issues.some(i => i.code === 'MISSING_CENTER_MAPPING' || i.code === 'MISSING_REQUIRED_CENTER')); break;
208:         case 'SEM_CONTA': result = result.filter(r => r.issues.some(i => i.code === 'MISSING_ACCOUNT_MAPPING')); break;
261:                     {row.issues.map((issue, i) => (
487:                           {warning && (
490:                                 <p>{warning}</p>
Bash Read page issue filter and warning banner
IN
sed -n 95,115p pages/FolhaDealerPage.jsx; sed -n 480,500p pages/FolhaDealerPage.jsx

OUT
   const gridRows = useMemo(() => {
      if (!run || !run.consolidatedItems) return [];
      let rows = [];

      run.consolidatedItems.forEach((item, index) => {
         const itemIssues = run.issues.filter(i =>
            (i.context?.lotacaoCode === item.lotacaoCode && i.context?.eventCode === item.eventCode) ||
            (i.code === 'MISSING_ACCOUNT_MAPPING' && i.context?.eventCode === item.eventCode) ||
            (i.code === 'MISSING_CENTER_MAPPING' && i.context?.lotacaoCode === item.lotacaoCode) ||
            (i.code === 'MISSING_REQUIRED_CENTER' && i.context?.lotacaoCode === item.lotacaoCode && i.context?.eventCode === item.eventCode) ||
            (i.code === 'CENTER_REMOVED_FROM_BALANCE_ACCOUNT' && i.context?.lotacaoCode === item.lotacaoCode && i.context?.eventCode === item.eventCode)
         );

         const itemEntries = run.entries.filter(e => e.lotacaoCode === item.lotacaoCode && e.eventCode === item.eventCode);

         const hasBlocker = itemIssues.some(i => i.severity === 'blocker');
         const hasWarning = itemIssues.some(i => i.severity === 'warning');
         const isProvisao = item.eventCode.startsWith('PROV_') || item.eventCode.startsWith('ENCARGO_');

         let status = 'OK';
         if (hasBlocker) status = 'ERRO';
                                 </div>
                              </div>
                           )}
                        </Motion.div>

                        {/* MAIN CONTENT AREA */}
                        <Motion.div className="flex-1 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm overflow-hidden flex flex-col min-h-0">
                           {warning && (
                              <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                 <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                 <p>{warning}</p>
                              </div>
                           )}
                           {activeTab === 'lancamentos' ? (
                              <div className="flex-1 relative overflow-x-auto">
                                 {filteredRows.length > 0 ? (
                                    <TableVirtuoso
                                       data={filteredRows}
                                       className="h-full w-full min-w-[1000px]"
                                       components={VirtuosoTableComponents}
                                       fixedHeaderContent={() => (
Os avisos da execução como um todo não aparecem na grade (ela só mostra issues por item). Vou exibi-los no banner âmbar que já existe.

Bash Render synthetic source warnings in page banner
IN
python3 - <<'EOF'
p='pages/FolhaDealerPage.jsx'
s=open(p).read()
old="""                           {warning && (
                              <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                 <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                 <p>{warning}</p>
                              </div>
                           )}"""
new="""                           {[warning, ...sourceWarnings].filter(Boolean).map((text) => (
                              <div key={text} className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                 <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                 <p>{text}</p>
                              </div>
                           ))}"""
assert old in s
s=s.replace(old,new)
old2="""   const gridRows = useMemo(() => {"""
new2="""   // Avisos de origem (PROV_/ENCARGO_ por alíquota em vez de Fortes/eSocial)
   const sourceWarnings = useMemo(
      () => (run?.issues || [])
         .filter(i => i.code === 'SYNTHETIC_PROVISION' || i.code === 'SYNTHETIC_ENCARGO')
         .map(i => i.message),
      [run]
   );

   const gridRows = useMemo(() => {"""
s=s.replace(old2,new2,1)
open(p,'w').write(s)
EOF
git diff pages/FolhaDealerPage.jsx | head -40

OUT
diff --git a/apps/rayo/src/pages/FolhaDealerPage.jsx b/apps/rayo/src/pages/FolhaDealerPage.jsx
index 3486289..e6c299a 100644
--- a/apps/rayo/src/pages/FolhaDealerPage.jsx
+++ b/apps/rayo/src/pages/FolhaDealerPage.jsx
@@ -92,6 +92,14 @@ export default function FolhaDealerPage() {
       return { debit, credit, difference: Math.abs(debit - credit) };
    }, [run]);
 
+   // Avisos de origem (PROV_/ENCARGO_ por alíquota em vez de Fortes/eSocial)
+   const sourceWarnings = useMemo(
+      () => (run?.issues || [])
+         .filter(i => i.code === 'SYNTHETIC_PROVISION' || i.code === 'SYNTHETIC_ENCARGO')
+         .map(i => i.message),
+      [run]
+   );
+
    const gridRows = useMemo(() => {
       if (!run || !run.consolidatedItems) return [];
       let rows = [];
@@ -484,12 +492,12 @@ export default function FolhaDealerPage() {
 
                         {/* MAIN CONTENT AREA */}
                         <Motion.div className="flex-1 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm overflow-hidden flex flex-col min-h-0">
-                           {warning && (
-                              <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
+                           {[warning, ...sourceWarnings].filter(Boolean).map((text) => (
+                              <div key={text} className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
-                                 <p>{warning}</p>
+                                 <p>{text}</p>
                               </div>
-                           )}
+                           ))}
                            {activeTab === 'lancamentos' ? (
                               <div className="flex-1 relative overflow-x-auto">
                                  {filteredRows.length > 0 ? (
Agora as queries do servidor: lotação na folha mensal e bases eSocial por estabelecimento.

Bash Update payroll and encargo base SQL queries
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo-server && python3 - <<'EOF'
p='fortes-extractor.js'
s=open(p).read()
s=s.replace("""    EFP.Referencia AS sourceReference,
    '' AS lotacaoCode,
    '' AS lotacaoName
FROM EFO (NOLOCK)""","""    EFP.Referencia AS sourceReference,
    ISNULL(SEP.LOT_Codigo, '') AS lotacaoCode,
    ISNULL(LOT.Nome, '') AS lotacaoName
FROM EFO (NOLOCK)""")
s=s.replace("""LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq IN (""","""LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
LEFT JOIN SEP (NOLOCK)
    ON EFO.EMP_Codigo = SEP.EMP_Codigo
   AND EFO.EPG_Codigo = SEP.EPG_Codigo
   AND EFO.SEP_Data = SEP.Data
LEFT JOIN LOT (NOLOCK)
    ON SEP.EMP_Codigo = LOT.EMP_Codigo
   AND SEP.LOT_Codigo = LOT.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq IN (""")

old=s[s.index("""/**
 * Bases oficiais eSocial para encargos"""):s.index("async function extractFortesPayroll")]
new='''/**
 * Bases oficiais eSocial para encargos DCTF/FGTS, por matrícula × estabelecimento.
 * - CPP: ES_CS_CP_Base TipoValor 11 (mensal + 13º).
 * - FGTS: ES_FGTS_SEGURADO.VALORDEPO de todos os TIPOVALOR (mensal, 13º, aviso, aprendiz…).
 * - GILRAT: ES_CS_CP_Aliquotas_EST.AliquotaRATAjustada do estabelecimento.
 * Lotação via SEP/LOT da folha mensal; de-para Braga usa LOT.Nome.
 */
const ENCARGO_BASE_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

;WITH empLot AS (
    SELECT
        EPG.EMP_Codigo AS companyId,
        EMP.Nome AS companyName,
        EPG.Codigo AS employeeId,
        EPG.Nome AS employeeName,
        LTRIM(RTRIM(EPG.MatriculaESocial)) AS esMat,
        ISNULL(MAX(SEP.LOT_Codigo), '') AS lotacaoCode,
        ISNULL(MAX(LOT.Nome), '') AS lotacaoName
    FROM EFO (NOLOCK)
    INNER JOIN EPG (NOLOCK)
        ON EFO.EMP_Codigo = EPG.EMP_Codigo
       AND EFO.EPG_Codigo = EPG.Codigo
    INNER JOIN FOL (NOLOCK)
        ON EFO.EMP_Codigo = FOL.EMP_Codigo
       AND EFO.FOL_Seq = FOL.Seq
       AND FOL.Folha = 2
    INNER JOIN FPG (NOLOCK)
        ON FOL.EMP_Codigo = FPG.EMP_Codigo
       AND FOL.Seq = FPG.FOL_Seq
       AND FPG.AnoMes = @AnoMes
       AND FPG.Tipo IN (1, 4)
    LEFT JOIN EMP (NOLOCK)
        ON EPG.EMP_Codigo = EMP.Codigo
    LEFT JOIN SEP (NOLOCK)
        ON EFO.EMP_Codigo = SEP.EMP_Codigo
       AND EFO.EPG_Codigo = SEP.EPG_Codigo
       AND EFO.SEP_Data = SEP.Data
    LEFT JOIN LOT (NOLOCK)
        ON SEP.EMP_Codigo = LOT.EMP_Codigo
       AND SEP.LOT_Codigo = LOT.Codigo
    WHERE EFO.EMP_Codigo = @EmpresaCodigo
    GROUP BY
        EPG.EMP_Codigo,
        EMP.Nome,
        EPG.Codigo,
        EPG.Nome,
        EPG.MatriculaESocial
),
cp AS (
    SELECT
        LTRIM(RTRIM(Matricula)) AS esMat,
        EST_Codigo AS estCode,
        SUM(TRY_CAST(Valor AS FLOAT)) AS bcCp
    FROM ES_CS_CP_Base (NOLOCK)
    WHERE EMP_Codigo = @EmpresaCodigo
      AND PeriodoApuracao = @AnoMes
      AND TipoValor = 11
    GROUP BY LTRIM(RTRIM(Matricula)), EST_Codigo
),
fg AS (
    SELECT
        LTRIM(RTRIM(MATRICULA)) AS esMat,
        EST_CODIGO AS estCode,
        SUM(TRY_CAST(VALORDEPO AS FLOAT)) AS fgtsDepo
    FROM ES_FGTS_SEGURADO (NOLOCK)
    WHERE EMP_CODIGO = @EmpresaCodigo
      AND PERIODOAPURACAO = @AnoMes
    GROUP BY LTRIM(RTRIM(MATRICULA)), EST_CODIGO
),
bases AS (
    SELECT
        COALESCE(cp.esMat, fg.esMat) AS esMat,
        COALESCE(cp.estCode, fg.estCode) AS estCode,
        ISNULL(cp.bcCp, 0) AS bcCp,
        ISNULL(fg.fgtsDepo, 0) AS fgtsDepo
    FROM cp
    FULL OUTER JOIN fg
        ON fg.esMat = cp.esMat
       AND fg.estCode = cp.estCode
),
rat AS (
    SELECT
        EST_Codigo AS estCode,
        MAX(AliquotaRATAjustada) AS gilratPct
    FROM ES_CS_CP_Aliquotas_EST (NOLOCK)
    WHERE EMP_Codigo = @EmpresaCodigo
      AND PeriodoApuracao = @AnoMes
    GROUP BY EST_Codigo
)
SELECT
    el.companyId,
    el.companyName,
    @AnoMes AS competence,
    el.employeeId,
    el.employeeName,
    el.lotacaoCode,
    el.lotacaoName,
    b.estCode,
    rat.gilratPct,
    CAST(ROUND(b.bcCp * 100, 0) AS INT) AS bcCpCents,
    CAST(ROUND(b.fgtsDepo * 100, 0) AS INT) AS fgtsDepoCents
FROM bases b
INNER JOIN empLot el
    ON el.esMat = b.esMat
LEFT JOIN rat
    ON rat.estCode = b.estCode
WHERE b.bcCp > 0
   OR b.fgtsDepo > 0
ORDER BY el.lotacaoName, el.employeeName, b.estCode;
`;

/**
 * Totais eSocial da competência, sem filtro de matrícula — para conferir se
 * alguma base ficou fora do join com a folha mensal.
 */
const ENCARGO_TOTALS_QUERY = `
DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;

SELECT
    (SELECT CAST(ROUND(ISNULL(SUM(TRY_CAST(Valor AS FLOAT)), 0) * 100, 0) AS BIGINT)
       FROM ES_CS_CP_Base (NOLOCK)
      WHERE EMP_Codigo = @EmpresaCodigo AND PeriodoApuracao = @AnoMes AND TipoValor = 11) AS bcCpCents,
    (SELECT CAST(ROUND(ISNULL(SUM(TRY_CAST(VALORDEPO AS FLOAT)), 0) * 100, 0) AS BIGINT)
       FROM ES_FGTS_SEGURADO (NOLOCK)
      WHERE EMP_CODIGO = @EmpresaCodigo AND PERIODOAPURACAO = @AnoMes) AS fgtsDepoCents;
`;

'''
s=s.replace(old,new)
open(p,'w').write(s)
EOF
echo ok

OUT
ok
Agora a função de extração: lotação por nome na folha e a conferência de cobertura das bases eSocial.

Bash Wire coverage check into extractor and route
IN
python3 - <<'EOF'
p='fortes-extractor.js'
s=open(p).read()
s=s.replace("""    const [payrollResult, prov13Result, provFerResult, encargoBaseResult] = await Promise.all([
      request().query(PAYROLL_QUERY),
      request().query(PROV_13_QUERY),
      request().query(PROV_FER_QUERY),
      request().query(ENCARGO_BASE_QUERY),
    ]);
""","""    const [payrollResult, prov13Result, provFerResult, encargoBaseResult, encargoTotalsResult] =
      await Promise.all([
        request().query(PAYROLL_QUERY),
        request().query(PROV_13_QUERY),
        request().query(PROV_FER_QUERY),
        request().query(ENCARGO_BASE_QUERY),
        request().query(ENCARGO_TOTALS_QUERY),
      ]);

    // de-para Braga usa o nome da lotação (LOT.Nome)
    const payroll = payrollResult.recordset.map((row) =>
      row.lotacaoName ? { ...row, lotacaoCode: row.lotacaoName } : row
    );
""")
s=s.replace("""    console.log(
      `[API Fortes] Folha=${payrollResult.recordset.length} linhas; ` +
        `Provisões Fortes=${provisions.length} (13º+férias); ` +
        `Bases encargo eSocial=${encargoBases.length}`
    );

    return {
      payroll: payrollResult.recordset,
      provisions,
      encargoBases,
    };""","""    const encargoCoverage = buildEncargoCoverage(encargoBases, encargoTotalsResult.recordset[0]);

    console.log(
      `[API Fortes] Folha=${payroll.length} linhas; ` +
        `Provisões Fortes=${provisions.length} (13º+férias); ` +
        `Bases encargo eSocial=${encargoBases.length}; ` +
        `CPP ${encargoCoverage.bcCpCents.extracted}/${encargoCoverage.bcCpCents.expected}, ` +
        `FGTS ${encargoCoverage.fgtsDepoCents.extracted}/${encargoCoverage.fgtsDepoCents.expected}`
    );

    return {
      payroll,
      provisions,
      encargoBases,
      encargoCoverage,
    };""")
s=s.replace("""async function extractFortesPayroll(""","""/**
 * Compara o que entrou nas bases por empregado com o total eSocial da competência.
 */
function buildEncargoCoverage(encargoBases, totalsRow = {}) {
  const sum = (key) => encargoBases.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
  const bcCpExtracted = sum('bcCpCents');
  const fgtsExtracted = sum('fgtsDepoCents');
  const bcCpExpected = Number(totalsRow?.bcCpCents) || 0;
  const fgtsExpected = Number(totalsRow?.fgtsDepoCents) || 0;
  return {
    bcCpCents: { expected: bcCpExpected, extracted: bcCpExtracted, missing: bcCpExpected - bcCpExtracted },
    fgtsDepoCents: { expected: fgtsExpected, extracted: fgtsExtracted, missing: fgtsExpected - fgtsExtracted },
  };
}

async function extractFortesPayroll(""")
s=s.replace("""  expandProvisionAmounts,
  buildDbConfig,""","""  expandProvisionAmounts,
  buildEncargoCoverage,
  buildDbConfig,""")
s=s.replace("""  ENCARGO_BASE_QUERY,
};""","""  ENCARGO_BASE_QUERY,
  ENCARGO_TOTALS_QUERY,
};""")
open(p,'w').write(s)

p='index.js'
s=open(p).read()
s=s.replace("""            encargoBases: extracted.encargoBases,
        });""","""            encargoBases: extracted.encargoBases,
            encargoCoverage: extracted.encargoCoverage,
        });""")
open(p,'w').write(s)
EOF
sed -n 395,480p fortes-extractor.js

OUT
    // de-para Braga usa o nome da lotação (LOT.Nome)
    const payroll = payrollResult.recordset.map((row) =>
      row.lotacaoName ? { ...row, lotacaoCode: row.lotacaoName } : row
    );

    const provisions = [];
    for (const row of prov13Result.recordset) {
      // Prefer LOT.Nome as lotacaoCode (de-para Braga usa o nome)
      if (row.lotacaoName) row.lotacaoCode = row.lotacaoName;
      provisions.push(...expandProvisionAmounts(row, PROV_13_DEFS));
    }
    for (const row of provFerResult.recordset) {
      if (row.lotacaoName) row.lotacaoCode = row.lotacaoName;
      provisions.push(...expandProvisionAmounts(row, PROV_FER_DEFS));
    }

    const encargoBases = encargoBaseResult.recordset.map((row) => {
      const lotacaoName = row.lotacaoName || '';
      return {
        ...row,
        // de-para Braga usa o nome da lotação
        lotacaoCode: lotacaoName || row.lotacaoCode || '',
        lotacaoName,
      };
    });

    const encargoCoverage = buildEncargoCoverage(encargoBases, encargoTotalsResult.recordset[0]);

    console.log(
      `[API Fortes] Folha=${payroll.length} linhas; ` +
        `Provisões Fortes=${provisions.length} (13º+férias); ` +
        `Bases encargo eSocial=${encargoBases.length}; ` +
        `CPP ${encargoCoverage.bcCpCents.extracted}/${encargoCoverage.bcCpCents.expected}, ` +
        `FGTS ${encargoCoverage.fgtsDepoCents.extracted}/${encargoCoverage.fgtsDepoCents.expected}`
    );

    return {
      payroll,
      provisions,
      encargoBases,
      encargoCoverage,
    };
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

module.exports = {
  extractFortesPayroll,
  expandProvisionAmounts,
  buildEncargoCoverage,
  buildDbConfig,
  PROV_13_DEFS,
  PROV_FER_DEFS,
  PAYROLL_QUERY,
  PROV_13_QUERY,
  PROV_FER_QUERY,
  ENCARGO_BASE_QUERY,
  ENCARGO_TOTALS_QUERY,
};
O hook avisa quando alguma base eSocial fica fora do join:

Bash Add encargo coverage warning to hook
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo/src/hooks && python3 - <<'EOF'
p='useFolhaDealer.js'
s=open(p).read()
s=s.replace("""const COMPANY_ID = 'braga-veiculos';
""","""const COMPANY_ID = 'braga-veiculos';

const formatCents = (cents) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Aviso quando parte da base eSocial não casou com empregado da folha mensal. */
function describeEncargoCoverage(coverage) {
  if (!coverage) return null;
  const gaps = [
    ['BC CPP', coverage.bcCpCents],
    ['FGTS', coverage.fgtsDepoCents],
  ].filter(([, c]) => c && c.missing !== 0);
  if (gaps.length === 0) return null;
  const detail = gaps
    .map(([label, c]) => `${label} ${formatCents(c.extracted)} de ${formatCents(c.expected)}`)
    .join('; ');
  return `Bases eSocial sem empregado na folha mensal (encargos incompletos): ${detail}.`;
}
""")
s=s.replace("""      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      runWithConfig(payrollRows, competence, runtimeConfig, centersWarning);
    } catch (err) {
      setError(err.message);
    }
  };

  const reprocessLastRun""","""      const { config: runtimeConfig, centersWarning } = await resolveRuntimeConfig();
      const extractWarning = [centersWarning, describeEncargoCoverage(result.encargoCoverage)]
        .filter(Boolean)
        .join(' ');
      runWithConfig(payrollRows, competence, runtimeConfig, extractWarning || null);
    } catch (err) {
      setError(err.message);
    }
  };

  const reprocessLastRun""")
open(p,'w').write(s)
EOF
git diff --stat

OUT
 apps/rayo-server/fortes-extractor.js               | 132 ++++++++++++++++-----
 apps/rayo-server/index.js                          |   1 +
 apps/rayo/src/hooks/useFolhaDealer.js              |  31 ++++-
 .../src/lib/folha-dealer/braga-veiculos.config.js  |  26 ++--
 apps/rayo/src/lib/folha-dealer/contracts.js        |   2 +
 .../src/lib/folha-dealer/encargo-calculator.js     |  46 ++++---
 .../rayo/src/lib/folha-dealer/fortes-csv-parser.js |   5 +-
 .../src/lib/folha-dealer/fortes-data-fetcher.js    |   5 +-
 .../rayo/src/lib/folha-dealer/fortes-normalizer.js |  12 +-
 .../src/lib/folha-dealer/fortes-query-adapter.js   |  34 ++++--
 apps/rayo/src/lib/folha-dealer/index.js            |  36 +++++-
 .../src/lib/folha-dealer/provision-calculator.js   |  23 ++--
 apps/rayo/src/pages/FolhaDealerPage.jsx            |  16 ++-
 13 files changed, 267 insertions(+), 102 deletions(-)
Rodando os testes:

Bash Run folha-dealer tests after changes
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo && export PATH=/opt/homebrew/bin:$PATH && npx vitest run tests/folha-dealer* 2>&1 | grep -E "×|Test Files|Tests " | head -20; cd ../rayo-server && ls *.test.js tests 2>/dev/null; grep '"test' package.json

OUT
     × data 1 e data 2 corretas nas posições 374-389 4ms
     × conta com pontos no parâmetro lança erro 2ms
     × buildDealerTxtLine still returns 453-char line 3ms
     × bloqueia com MISSING_DEALER_LOT_ACCOUNT_CODE quando dealerLotAccountCode é null 7ms
     × data 1 e data 2 corretas nas posições 372-391 1ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  2 failed | 9 passed (11)
      Tests  5 failed | 136 passed (141)
(eval):1: no matches found: *.test.js
Só as 5 falhas pré-existentes. Agora os testes das regras novas:

Bash List existing encargo test cases
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo && sed -n 60,400p tests/folha-dealer-encargo-calculator.test.js | grep -n "it(\|describe(" ; tail -5 tests/folha-dealer-encargo-calculator.test.js; grep -n "provision\|Provis" tests/folha-dealer-engine.test.js | head

OUT
5:  it('prefere informativos 602/605 quando presentes', () => {
30:  it('calculateEncargosFromBases bate com RH AGENDAMENTOS abr/2026', () => {
61:  it('adapter usa bases eSocial e não gera sintético paralelo', () => {
85:  it('mapeia INSS/GILRAT/Terceiros para 6.1.1.02.001 ↔ 2.1.1.02.001 e FGTS para .002', () => {
102:  it('evento 310 (1082-01) permanece só crédito INSS a Recolher', () => {
112:  it('config Braga usa GILRAT 1%', () => {
  it('config Braga usa GILRAT 1%', () => {
    expect(bragaVeiculosConfig.encargoRates.gilrat).toBe(1);
    expect(DEFAULT_ENCARGO_RATES.gilrat).toBe(1);
  });
});
39:    it('preserva sinal negativo de PROV_* Fortes (estorno Provisionar)', () => {
43:                sourceAdapter: 'fortes-provision',
44:                sourceOrigin: 'fortes-provision',
50:                eventName: 'Provisão 13º Salário (Fortes)',
75:            sourceAdapter: 'fortes-provision',
76:            sourceOrigin: 'fortes-provision',
83:            eventName: 'Provisão 13º Salário (Fortes)',
124:            sourceAdapter: 'fortes-provision',
125:            sourceOrigin: 'fortes-provision',
142:                sourceAdapter: 'fortes-provision',
Bash Read engine test header and file endings
IN
head -30 tests/folha-dealer-engine.test.js; tail -3 tests/folha-dealer-engine.test.js; tail -3 tests/folha-dealer-fortes-query-adapter.test.js

OUT
import { describe, expect, it } from 'vitest';
import {
    buildBragaRows,
    buildBragaRowsFortes,
    bragaVeiculosConfig,
    consolidatePayrollRows,
    normalizePayrollRows,
    runFolhaDealerEngine
} from '../src/lib/folha-dealer/index.js';

const baseRows = () => buildBragaRows();

const runEngine = (overrides = {}) => runFolhaDealerEngine({
    config: bragaVeiculosConfig,
    sourceRows: baseRows(),
    competence: '2026-04',
    ...overrides
});

describe('Folha Dealer engine', () => {
    it('normaliza amountCents sempre positivo na folha mensal', () => {
        const rows = normalizePayrollRows([
            {
                sourceSystem: 'fortes',
                sourceAdapter: 'fixture',
                sourceOrigin: 'folha-mensal',
                companyId: 'braga-veiculos',
                companyName: 'BRAGA VEICULOS LTDA',
                competence: '2026-04',
                lotacaoCode: 'ADM',
    });
});

    expect(result.some((r) => r.sourceOrigin === 'provision-derived')).toBe(false);
  });
});
Bash Add tests and run suite
IN
python3 - <<'EOF'
# adapter tests
p='tests/folha-dealer-fortes-query-adapter.test.js'
s=open(p).read()
s=s.rstrip()
assert s.endswith('});')
s=s[:-3]+'''
  it('17. lotação do Fortes prevalece sobre o mapa estático por empregado', () => {
    // 000046 está no mapa estático como RECURSOS HUMANOS
    const raw = [{
      employeeId: '000046', lotacaoCode: 'FINANCEIRO', lotacaoName: 'FINANCEIRO',
      eventCode: '011', amountCents: 1000, ProvDesc: 1,
    }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('FINANCEIRO');
    expect(result.find((r) => r.eventCode === 'LIQUIDO_FOLHA').lotacaoCode).toBe('FINANCEIRO');
  });

  it('18. mapa estático só preenche lotação vazia', () => {
    const raw = [{ employeeId: '000046', lotacaoCode: '', eventCode: '011', amountCents: 1000, ProvDesc: 1 }];
    const result = normalizeFortesQueryRows(raw);
    expect(result[0].lotacaoCode).toBe('RECURSOS HUMANOS');
  });

  it('19. líquido negativo por lotação é emitido com sinal (não some)', () => {
    const raw = [
      { lotacaoCode: 'TI', eventCode: '011', amountCents: 1000, ProvDesc: 1 },
      { lotacaoCode: 'TI', eventCode: '310', amountCents: 3000, ProvDesc: 2 },
    ];
    const liquido = normalizeFortesQueryRows(raw).find((r) => r.eventCode === 'LIQUIDO_FOLHA');
    expect(liquido.amountCents).toBe(-2000);
  });

  it('20. provisions vazio do Fortes cai no fallback sintético', () => {
    const raw = [{
      companyId: '9274', competence: '202607', employeeId: '1',
      lotacaoCode: 'TI', lotacaoName: 'TI', eventCode: '011', amountCents: 100000,
      ProvDesc: 1, TipoRegistro: 'PROVENTO', IncideFGTS: '1',
    }];
    const result = normalizeFortesQueryRows(
      raw,
      { fortesProvisions: [], fortesEncargoBases: [] },
      { feriasTerco: 11.11, decimoTerceiro: 8.33, inssPatronal: 26.8, fgts: 8 },
      null
    );
    const prov = result.filter((r) => r.sourceOrigin === 'provision-derived');
    expect(prov.map((r) => r.eventCode).sort()).toEqual([
      'PROV_13', 'PROV_FERIAS', 'PROV_FGTS_13', 'PROV_FGTS_FER', 'PROV_INSS_13', 'PROV_INSS_FER',
    ]);
    expect(prov.find((r) => r.eventCode === 'PROV_13').lotacaoCode).toBe('TI');
  });

  it('21. fallback de provisão usa só proventos (descontos não reduzem a base)', () => {
    const common = { companyId: '1', competence: '2026-07', employeeId: '1', lotacaoCode: 'TI', IncideFGTS: '1' };
    const raw = [
      { ...common, eventCode: '011', amountCents: 100000, ProvDesc: 1, TipoRegistro: 'PROVENTO' },
      { ...common, eventCode: '310', amountCents: 10000, ProvDesc: 2, TipoRegistro: 'DESCONTO' },
    ];
    const result = normalizeFortesQueryRows(
      raw, {}, { feriasTerco: 11.11, decimoTerceiro: 8.33, inssPatronal: 26.8, fgts: 8 }, null
    );
    expect(result.find((r) => r.eventCode === 'PROV_13').amountCents).toBe(8330);
    // INSS s/ 13º = 8.330 × 26,8%
    expect(result.find((r) => r.eventCode === 'PROV_INSS_13').amountCents).toBe(2232);
  });
});
'''
s=s.replace("""  it('8. valor em centavos sempre positivo', () => {""","""  it('8. valor em centavos sempre positivo', () => {""")
open(p,'w').write(s)

# encargo tests
p='tests/folha-dealer-encargo-calculator.test.js'
s=open(p).read().rstrip()
s=s[:-3]+'''
  it('GILRAT por estabelecimento vem do eSocial (gilratPct) e prevalece sobre o config', () => {
    const rows = calculateEncargosFromBases(
      [
        { employeeId: '1', lotacaoName: 'MATRIZ', estCode: '0001', gilratPct: 1, bcCpCents: 100000 },
        { employeeId: '2', lotacaoName: 'FILIAL', estCode: '0002', gilratPct: 2, bcCpCents: 100000 },
        { employeeId: '3', lotacaoName: 'SEM EST', bcCpCents: 100000 },
      ],
      { ...DEFAULT_ENCARGO_RATES, gilrat: 1 }
    );
    const rat = (emp) => rows.find((r) => r.eventCode === 'ENCARGO_RAT_FAP' && r.employeeId === emp);
    expect(rat('1').amountCents).toBe(1000);
    expect(rat('2').amountCents).toBe(2000);
    expect(rat('3').amountCents).toBe(1000); // fallback do config
    expect(rat('2').sourceReference).toContain('EST: 0002');
  });

  it('gilratPct vazio/nulo não zera o GILRAT', () => {
    const rows = calculateEncargosFromBases(
      [{ employeeId: '1', lotacaoName: 'X', gilratPct: '', bcCpCents: 100000 }],
      DEFAULT_ENCARGO_RATES
    );
    expect(rows.find((r) => r.eventCode === 'ENCARGO_RAT_FAP').amountCents).toBe(1000);
  });

  it('mesmo empregado em dois estabelecimentos gera linhas separadas', () => {
    const rows = calculateEncargosFromBases([
      { employeeId: '1', lotacaoName: 'X', estCode: '0001', gilratPct: 1, fgtsDepoCents: 500 },
      { employeeId: '1', lotacaoName: 'X', estCode: '0002', gilratPct: 2, fgtsDepoCents: 700 },
    ]);
    const fgts = rows.filter((r) => r.eventCode === 'ENCARGO_FGTS_FOLHA');
    expect(fgts.map((r) => r.amountCents)).toEqual([500, 700]);
    expect(new Set(fgts.map((r) => r.sourceLineId)).size).toBe(2);
  });

  it('provisionRates.inssPatronal da Braga = soma dos encargos patronais', () => {
    const { encargoRates, provisionRates } = bragaVeiculosConfig;
    expect(provisionRates.inssPatronal).toBeCloseTo(
      encargoRates.inssEmpresa + encargoRates.gilrat + encargoRates.terceiros, 10
    );
  });
});
'''
open(p,'w').write(s)

# engine tests
p='tests/folha-dealer-engine.test.js'
s=open(p).read().rstrip()
s=s[:-3]+'''
    it('emite warning quando PROV_/ENCARGO_ vêm do fallback sintético', () => {
        const synthetic = (eventCode, sourceOrigin) => ({
            sourceSystem: 'fortes',
            sourceAdapter: 'provision-calculator',
            sourceOrigin,
            companyId: 'braga-veiculos',
            companyName: '',
            competence: '2026-07',
            lotacaoCode: 'AGENDAMENTOS',
            lotacaoName: 'AGENDAMENTOS',
            eventCode,
            amountCents: 100,
        });
        const run = runEngine({
            competence: '2026-07',
            sourceRows: [
                ...baseRows(),
                synthetic('PROV_13', 'provision-derived'),
                synthetic('ENCARGO_FGTS_FOLHA', 'encargo-derived'),
            ],
        });
        const codes = run.issues.filter((i) => i.severity === 'warning').map((i) => i.code);
        expect(codes).toContain('SYNTHETIC_PROVISION');
        expect(codes).toContain('SYNTHETIC_ENCARGO');
    });

    it('não emite warning de origem quando não há linhas sintéticas', () => {
        const codes = runEngine().issues.map((i) => i.code);
        expect(codes).not.toContain('SYNTHETIC_PROVISION');
        expect(codes).not.toContain('SYNTHETIC_ENCARGO');
    });

    it('LIQUIDO_FOLHA negativo bloqueia em vez de virar positivo', () => {
        const [row] = normalizePayrollRows([{ eventCode: 'LIQUIDO_FOLHA', amountCents: -500, lotacaoCode: 'TI' }]);
        expect(row.amountCents).toBe(-500);
    });

    it('normalizePayrollRows não sobrescreve lotação já informada com o mapa estático', () => {
        const [withLot, withoutLot] = normalizePayrollRows([
            { employeeId: '000046', lotacaoCode: 'FINANCEIRO', eventCode: '011', amountCents: 1 },
            { employeeId: '000046', lotacaoCode: '', eventCode: '011', amountCents: 1 },
        ]);
        expect(withLot.lotacaoCode).toBe('FINANCEIRO');
        expect(withoutLot.lotacaoCode).toBe('RECURSOS HUMANOS');
    });
});
'''
open(p,'w').write(s)
EOF
export PATH=/opt/homebrew/bin:$PATH && npx vitest run tests/folha-dealer* 2>&1 | grep -E "×|Test Files|Tests |AssertionError|Expected|Received" | head -30

OUT
     × data 1 e data 2 corretas nas posições 374-389 2ms
     × conta com pontos no parâmetro lança erro 1ms
     × buildDealerTxtLine still returns 453-char line 3ms
     × bloqueia com MISSING_DEALER_LOT_ACCOUNT_CODE quando dealerLotAccountCode é null 5ms
     × data 1 e data 2 corretas nas posições 372-391 1ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected 'FP        01001    61101002        00…' to be null
- Expected:
+ Received:
AssertionError: expected '  30042026' to be '30/04/2026' // Object.is equality
Expected: "30/04/2026"
Received: "  30042026"
AssertionError: expected [Function] to throw an error
- Expected:
+ Received:
AssertionError: expected 444 to be 453 // Object.is equality
- Expected
+ Received
 Test Files  2 failed | 9 passed (11)
      Tests  5 failed | 149 passed (154)
13 testes novos passando; só restam as 5 falhas pré-existentes. Um dos títulos promete "bloqueia" mas só testa o normalizer, então vou fazer o teste checar o blocker de verdade.

Bash Strengthen negative líquido test and rerun
IN
python3 - <<'EOF'
p='tests/folha-dealer-engine.test.js'
s=open(p).read()
old="""        const [row] = normalizePayrollRows([{ eventCode: 'LIQUIDO_FOLHA', amountCents: -500, lotacaoCode: 'TI' }]);
        expect(row.amountCents).toBe(-500);"""
new="""        const [row] = normalizePayrollRows([{ eventCode: 'LIQUIDO_FOLHA', amountCents: -500, lotacaoCode: 'TI' }]);
        expect(row.amountCents).toBe(-500);

        const run = runEngine({
            sourceRows: [{ ...baseRows()[0], eventCode: 'LIQUIDO_FOLHA', amountCents: -500 }],
        });
        expect(run.status).toBe('blocked');
        expect(run.issues.map((i) => i.code)).toContain('NEGATIVE_VALUE_WITHOUT_POLICY');"""
s=s.replace(old,new)
open(p,'w').write(s)
EOF
export PATH=/opt/homebrew/bin:$PATH && npx vitest run tests/folha-dealer* 2>&1 | grep -E "Tests " 

OUT
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
      Tests  5 failed | 149 passed (154)
Testes ok. Agora a validação real: extrair 04/2026 do banco e rodar o pipeline completo com as queries novas.

Bash Run real extraction and pipeline for 04/2026
IN
cat > /Users/ryanrichard/projecont/Rayo/apps/rayo/scratch-verify-folha.mjs <<'EOF'
import { createRequire } from 'module';
import { normalizeFortesQueryRows } from './src/lib/folha-dealer/fortes-query-adapter.js';
import { runFolhaDealerEngine, bragaVeiculosConfig } from './src/lib/folha-dealer/index.js';
import { employeeLotacaoMap } from './src/lib/folha-dealer/employee-lotacao-map.js';
const require = createRequire(import.meta.url);
const { extractFortesPayroll } = require('../rayo-server/fortes-extractor.js');

const competence = process.argv[2] || '2026-04';
const ex = await extractFortesPayroll({ companyId: '9274', competence });
const emptyLot = ex.payroll.filter((r) => !r.lotacaoCode).length;
const diff = new Map();
for (const r of ex.payroll) {
  const m = employeeLotacaoMap[r.employeeId];
  if (m && m !== r.lotacaoCode) diff.set(r.employeeId, `${m} -> ${r.lotacaoCode}`);
}
console.log({ competence, payroll: ex.payroll.length, emptyLot, mapDivergences: [...diff], provisions: ex.provisions.length, bases: ex.encargoBases.length, coverage: ex.encargoCoverage });

const rows = normalizeFortesQueryRows(
  ex.payroll,
  { fortesProvisions: ex.provisions, fortesEncargoBases: ex.encargoBases },
  bragaVeiculosConfig.provisionRates,
  bragaVeiculosConfig.encargoRates
).map((r) => ({ ...r, companyId: 'braga-veiculos' }));

const totals = {};
for (const r of rows) {
  if (/^(ENCARGO_|PROV_|LIQUIDO)/.test(r.eventCode)) totals[r.eventCode] = (totals[r.eventCode] || 0) + r.amountCents;
}
console.log(Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, (v / 100).toFixed(2)])));
const ratByEst = {};
for (const r of rows.filter((r) => r.eventCode === 'ENCARGO_RAT_FAP')) {
  const est = /EST: (\d+)/.exec(r.sourceReference)?.[1] || '?';
  ratByEst[est] = ((ratByEst[est] || 0) + r.amountCents);
}
console.log('RAT por EST', ratByEst);

const run = runFolhaDealerEngine({ config: bragaVeiculosConfig, sourceRows: rows, competence });
const byCode = {};
for (const i of run.issues) byCode[`${i.severity}:${i.code}`] = (byCode[`${i.severity}:${i.code}`] || 0) + 1;
const blockLots = [...new Set(run.issues.filter((i) => i.code === 'MISSING_CENTER_MAPPING').map((i) => i.context.lotacaoCode))];
console.log({ status: run.status, issues: byCode, missingCenterLots: blockLots });
EOF
cd /Users/ryanrichard/projecont/Rayo/apps/rayo && /opt/homebrew/bin/node scratch-verify-folha.mjs 2026-04 2>&1 | tail -60

OUT
[API Fortes] Conectando ao MSSQL... Empresa: 9274, Competência: 202604
[API Fortes] Folha=1938 linhas; Provisões Fortes=714 (13º+férias); Bases encargo eSocial=149; CPP 54657552/55795721, FGTS 4357966/4490356
{
  competence: '2026-04',
  payroll: 1938,
  emptyLot: 0,
  mapDivergences: [],
  provisions: 714,
  bases: 149,
  coverage: {
    bcCpCents: { expected: 55795721, extracted: 54657552, missing: 1138169 },
    fgtsDepoCents: { expected: 4490356, extracted: 4357966, missing: 132390 }
  }
}
{
  LIQUIDO_FOLHA: '494885.32',
  PROV_13: '17935.11',
  PROV_INSS_13: '5386.68',
  PROV_FGTS_13: '1422.65',
  PROV_FERIAS: '321099.86',
  PROV_INSS_FER: '88356.92',
  PROV_FGTS_FER: '25671.74',
  ENCARGO_INSS_PATRONAL: '109315.12',
  ENCARGO_RAT_FAP: '6652.26',
  ENCARGO_TERCEIROS: '31701.38',
  ENCARGO_FGTS_FOLHA: '43579.66'
}
RAT por EST { '0001': 427939, '0002': 237287 }
{
  status: 'ready',
  issues: {
    'warning:INFORMATIVE_EVENT_IGNORED': 149,
    'warning:CENTER_REMOVED_FROM_BALANCE_ACCOUNT': 334
  },
  missingCenterLots: []
}
O pipeline de 04/2026 está ok (sem linhas sem lotação, PROV_13 batendo com o RH, GILRAT a 2%), mas o novo aviso de cobertura detectou uma divergência real: R$ 11.381,69 de base CPP e R$ 1.323,90 de FGTS do eSocial sem correspondência na folha mensal. Vou investigar quem são esses casos.
Bash Identify eSocial bases missing from monthly payroll
IN
cat > /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/probe4.js <<'EOF'
const mssql = require('/Users/ryanrichard/projecont/Rayo/apps/rayo-server/node_modules/mssql');
const { buildDbConfig } = require('/Users/ryanrichard/projecont/Rayo/apps/rayo-server/fortes-extractor.js');
(async () => {
  const pool = await mssql.connect(buildDbConfig());
  const q = async (label, sql) => { const r = await pool.request().query(sql); console.log('==', label); console.table(r.recordset.slice(0, 40)); };
  const monthly = `SELECT DISTINCT LTRIM(RTRIM(EPG.MatriculaESocial)) m FROM EFO JOIN EPG ON EFO.EMP_Codigo=EPG.EMP_Codigo AND EFO.EPG_Codigo=EPG.Codigo JOIN FOL ON EFO.EMP_Codigo=FOL.EMP_Codigo AND EFO.FOL_Seq=FOL.Seq AND FOL.Folha=2 JOIN FPG ON FOL.EMP_Codigo=FPG.EMP_Codigo AND FOL.Seq=FPG.FOL_Seq AND FPG.AnoMes='202604' AND FPG.Tipo IN (1,4) WHERE EFO.EMP_Codigo='9274'`;
  await q('cp missing', `SELECT LTRIM(RTRIM(b.Matricula)) mat, b.EST_Codigo, b.Categoria, ISNULL(b.Indicativo13Salario,0) i13, SUM(b.Valor) v, (SELECT TOP 1 EPG.Codigo FROM EPG WHERE EPG.EMP_Codigo='9274' AND LTRIM(RTRIM(EPG.MatriculaESocial))=LTRIM(RTRIM(b.Matricula))) epg, (SELECT TOP 1 EPG.Nome FROM EPG WHERE EPG.EMP_Codigo='9274' AND LTRIM(RTRIM(EPG.MatriculaESocial))=LTRIM(RTRIM(b.Matricula))) nome FROM ES_CS_CP_Base b WHERE b.EMP_Codigo='9274' AND b.PeriodoApuracao='202604' AND b.TipoValor=11 AND LTRIM(RTRIM(b.Matricula)) NOT IN (${monthly}) GROUP BY LTRIM(RTRIM(b.Matricula)), b.EST_Codigo, b.Categoria, ISNULL(b.Indicativo13Salario,0)`);
  await q('folhas desses', `SELECT FOL.Folha, FPG.Tipo, FPG.AnoMes, COUNT(DISTINCT EFO.EPG_Codigo) n FROM EFO JOIN EPG ON EFO.EMP_Codigo=EPG.EMP_Codigo AND EFO.EPG_Codigo=EPG.Codigo JOIN FOL ON EFO.EMP_Codigo=FOL.EMP_Codigo AND EFO.FOL_Seq=FOL.Seq LEFT JOIN FPG ON FOL.EMP_Codigo=FPG.EMP_Codigo AND FOL.Seq=FPG.FOL_Seq WHERE EFO.EMP_Codigo='9274' AND LTRIM(RTRIM(EPG.MatriculaESocial)) IN (SELECT LTRIM(RTRIM(Matricula)) FROM ES_CS_CP_Base WHERE EMP_Codigo='9274' AND PeriodoApuracao='202604' AND TipoValor=11 AND LTRIM(RTRIM(Matricula)) NOT IN (${monthly})) AND (FPG.AnoMes='202604' OR FPG.AnoMes IS NULL) GROUP BY FOL.Folha, FPG.Tipo, FPG.AnoMes`);
  await pool.close();
})().catch(e => { console.error(e); process.exit(1); });
EOF
/opt/homebrew/bin/node /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/probe4.js 2>&1 | head -60

OUT
== cp missing
┌─────────┐
│ (index) │
├─────────┤
└─────────┘
== folhas desses
┌─────────┐
│ (index) │
├─────────┤
└─────────┘
Resultado vazio suspeito: é a pegadinha do NOT IN com NULL. Refazendo com filtro de nulos:

Bash Re-run missing-base probe with NULL-safe filter
IN
cd /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad && sed -i '' "s/WHERE EFO.EMP_Codigo='9274'\`;/WHERE EFO.EMP_Codigo='9274' AND EPG.MatriculaESocial IS NOT NULL\`;/" probe4.js && cat >> probe4.js <<'EOF'
EOF
python3 - <<'EOF'
p='probe4.js'
s=open(p).read()
s=s.replace("""  await pool.close();""","""  await q('fgts missing', `SELECT LTRIM(RTRIM(f.MATRICULA)) mat, f.EST_CODIGO, f.CATEGORIA, f.TIPOVALOR, f.DTDESLIGAMENTO, SUM(f.VALORDEPO) depo FROM ES_FGTS_SEGURADO f WHERE f.EMP_CODIGO='9274' AND f.PERIODOAPURACAO='202604' AND LTRIM(RTRIM(f.MATRICULA)) NOT IN (${monthly}) GROUP BY LTRIM(RTRIM(f.MATRICULA)), f.EST_CODIGO, f.CATEGORIA, f.TIPOVALOR, f.DTDESLIGAMENTO`);
  await q('epg sem matricula esocial na folha', `SELECT COUNT(*) n FROM EFO JOIN EPG ON EFO.EMP_Codigo=EPG.EMP_Codigo AND EFO.EPG_Codigo=EPG.Codigo JOIN FOL ON EFO.EMP_Codigo=FOL.EMP_Codigo AND EFO.FOL_Seq=FOL.Seq AND FOL.Folha=2 JOIN FPG ON FOL.EMP_Codigo=FPG.EMP_Codigo AND FOL.Seq=FPG.FOL_Seq AND FPG.AnoMes='202604' AND FPG.Tipo IN (1,4) WHERE EFO.EMP_Codigo='9274' AND EPG.MatriculaESocial IS NULL`);
  await pool.close();""")
open(p,'w').write(s)
EOF
/opt/homebrew/bin/node probe4.js 2>&1 | head -60

OUT
== cp missing
┌─────────┬──────────────┬────────────┬───────────┬─────┬─────────┬──────────┬────────────────────────────────────────┐
│ (index) │ mat          │ EST_Codigo │ Categoria │ i13 │ v       │ epg      │ nome                                   │
├─────────┼──────────────┼────────────┼───────────┼─────┼─────────┼──────────┼────────────────────────────────────────┤
│ 0       │ ''           │ '0001'     │ '722'     │ 0   │ 2259.2  │ null     │ null                                   │
│ 1       │ 'C01S001461' │ '0001'     │ '101'     │ 0   │ 122.85  │ '000558' │ 'ARY MIGUEL FERREIRA DE SOUZA E SILVA' │
│ 2       │ 'C01S001461' │ '0001'     │ '101'     │ 1   │ 642.93  │ '000558' │ 'ARY MIGUEL FERREIRA DE SOUZA E SILVA' │
│ 3       │ 'C01S001498' │ '0001'     │ '101'     │ 0   │ 2994.29 │ '000577' │ 'LUCIANO CAVALCANTI WANDERLEY'         │
│ 4       │ 'C01S001498' │ '0001'     │ '101'     │ 1   │ 1168.99 │ '000577' │ 'LUCIANO CAVALCANTI WANDERLEY'         │
│ 5       │ 'C01S001526' │ '0001'     │ '101'     │ 0   │ 441.81  │ '000599' │ 'CRISTHIANE GOMES DE SOUZA'            │
│ 6       │ 'C01S001526' │ '0001'     │ '101'     │ 1   │ 424.68  │ '000599' │ 'CRISTHIANE GOMES DE SOUZA'            │
│ 7       │ 'C01S001530' │ '0001'     │ '101'     │ 0   │ 590.18  │ '000605' │ 'AFONSO COSTA CHAVES'                  │
│ 8       │ 'C01S001530' │ '0001'     │ '101'     │ 1   │ 412.5   │ '000605' │ 'AFONSO COSTA CHAVES'                  │
│ 9       │ 'C01S001540' │ '0001'     │ '101'     │ 0   │ 1037.58 │ '000611' │ 'ELANE PEREIRA DE OLIVEIRA'            │
│ 10      │ 'C01S001540' │ '0001'     │ '101'     │ 1   │ 1286.68 │ '000611' │ 'ELANE PEREIRA DE OLIVEIRA'            │
└─────────┴──────────────┴────────────┴───────────┴─────┴─────────┴──────────┴────────────────────────────────────────┘
== folhas desses
┌─────────┬───────┬──────┬────────┬───┐
│ (index) │ Folha │ Tipo │ AnoMes │ n │
├─────────┼───────┼──────┼────────┼───┤
│ 0       │ 4     │ null │ null   │ 5 │
│ 1       │ 8     │ null │ null   │ 5 │
│ 2       │ 10    │ null │ null   │ 5 │
│ 3       │ 14    │ null │ null   │ 5 │
│ 4       │ 15    │ null │ null   │ 5 │
└─────────┴───────┴──────┴────────┴───┘
== fgts missing
┌─────────┬──────────────┬────────────┬───────────┬───────────┬──────────────────────────┬────────┐
│ (index) │ mat          │ EST_CODIGO │ CATEGORIA │ TIPOVALOR │ DTDESLIGAMENTO           │ depo   │
├─────────┼──────────────┼────────────┼───────────┼───────────┼──────────────────────────┼────────┤
│ 0       │ 'C01S001461' │ '0001'     │ '101'     │ 11        │ 2026-04-02T00:00:00.000Z │ 9.82   │
│ 1       │ 'C01S001461' │ '0001'     │ '101'     │ 12        │ 2026-04-02T00:00:00.000Z │ 51.43  │
│ 2       │ 'C01S001498' │ '0001'     │ '101'     │ 21        │ 2026-04-22T00:00:00.000Z │ 239.54 │
│ 3       │ 'C01S001498' │ '0001'     │ '101'     │ 22        │ 2026-04-22T00:00:00.000Z │ 93.51  │
│ 4       │ 'C01S001498' │ '0001'     │ '101'     │ 23        │ 2026-04-22T00:00:00.000Z │ 303.93 │
│ 5       │ 'C01S001526' │ '0001'     │ '101'     │ 21        │ 2026-04-10T00:00:00.000Z │ 35.34  │
│ 6       │ 'C01S001526' │ '0001'     │ '101'     │ 22        │ 2026-04-10T00:00:00.000Z │ 33.97  │
│ 7       │ 'C01S001526' │ '0001'     │ '101'     │ 23        │ 2026-04-10T00:00:00.000Z │ 147.22 │
│ 8       │ 'C01S001530' │ '0001'     │ '101'     │ 21        │ 2026-04-10T00:00:00.000Z │ 47.21  │
│ 9       │ 'C01S001530' │ '0001'     │ '101'     │ 22        │ 2026-04-10T00:00:00.000Z │ 33     │
│ 10      │ 'C01S001530' │ '0001'     │ '101'     │ 23        │ 2026-04-10T00:00:00.000Z │ 143    │
│ 11      │ 'C01S001540' │ '0001'     │ '101'     │ 21        │ 2026-04-11T00:00:00.000Z │ 83     │
│ 12      │ 'C01S001540' │ '0001'     │ '101'     │ 22        │ 2026-04-11T00:00:00.000Z │ 102.93 │
└─────────┴──────────────┴────────────┴───────────┴───────────┴──────────────────────────┴────────┘
== epg sem matricula esocial na folha
┌─────────┬───┐
│ (index) │ n │
├─────────┼───┤
│ 0       │ 1 │
└─────────┴───┘
Shell cwd was reset to /Users/ryanrichard/projecont/Rayo
Encontrei duas causas para a lacuna: 5 rescisões de abril que só existem na folha de rescisão (não na mensal), e a categoria 722 (sem matrícula) com regra de CPP diferente. Isso muda o escopo do problema, então vou perguntar sobre isso no final — agora vou conferir um mês sem PRD/PRF (07/2026) para validar o fallback.
Bash Run pipeline for 07/2026 without provisions
IN
cd /Users/ryanrichard/projecont/Rayo/apps/rayo && /opt/homebrew/bin/node scratch-verify-folha.mjs 2026-07 2>&1 | tail -40

OUT
    bcCpCents: { expected: 62224222, extracted: 60574603, missing: 1649619 },
    fgtsDepoCents: { expected: 4922751, extracted: 4812527, missing: 110224 }
  }
}
{
  LIQUIDO_FOLHA: '559605.56',
  PROV_FERIAS: '78144.56',
  PROV_13: '58590.82',
  PROV_INSS_FER: '20942.68',
  PROV_INSS_13: '15702.39',
  PROV_FGTS_FER: '6251.59',
  PROV_FGTS_13: '4687.35',
  ENCARGO_INSS_PATRONAL: '121149.22',
  ENCARGO_RAT_FAP: '7060.15',
  ENCARGO_TERCEIROS: '35133.30',
  ENCARGO_FGTS_FOLHA: '48125.27'
}
RAT por EST { '0002': 200529, '0001': 505486 }
{
  status: 'blocked',
  issues: {
    'warning:SYNTHETIC_PROVISION': 1,
    'blocker:MISSING_CENTER_MAPPING': 159,
    'blocker:MISSING_REQUIRED_CENTER': 136,
    'warning:INFORMATIVE_EVENT_IGNORED': 218,
    'warning:CENTER_REMOVED_FROM_BALANCE_ACCOUNT': 394
  },
  missingCenterLots: [
    'BRAGA VEÍCULOS - LEADS ',
    'BRAGA VEICULOS DEPTO VENDAS NOVOS',
    'BRAGA VEÍCULOS - DEPTO F&I',
    'BRAGA VEÍCULOS - DEPTO F&I MATRIZ',
    'BRAGA VEICULOS DEPTO VENDAS SEMINOVOS',
    'ADMINISTRAÇÃO MATRIZ TI',
    'BRAGA VEÍCULOS - DEPTO ACESSORIOS ',
    'DEPTO ADMINISTRAÇÃO/ FINANCEIRO',
    'BRAGA VEÍCULOS - DEPTO MECANICA',
    'BRAGA VEÍCULOS -  DEPTO LEADS'
  ]
}
Encontrei uma mudança relevante em 07/2026: o Fortes renomeou/reestruturou as lotações, e agora 10 delas ficaram sem de-para no mapa estático (que antes mascarava isso). Vou verificar o tamanho dessa divergência.
Bash Show July lotação divergence summary
IN
/opt/homebrew/bin/node scratch-verify-folha.mjs 2026-07 2>&1 | sed -n 3,12p | cut -c1-400; /opt/homebrew/bin/node -e "
import('./scratch-verify-folha.mjs').catch(()=>{})" >/dev/null 2>&1; true

OUT
{
  competence: '2026-07',
  payroll: 2017,
  emptyLot: 0,
  mapDivergences: [
    [
      '000163',
      'BRAGA VEICULOS FILIAL NOVOS -> ADMINISTRAÇÃO MATRIZ TI'
    ],
    [
Bash Count lotação divergences for July and June
IN
sed -i '' 's|console.log({ competence, payroll: ex.payroll.length, emptyLot, mapDivergences: \[...diff\]|console.log(JSON.stringify([...diff])); console.log({ competence, payroll: ex.payroll.length, emptyLot, mapDivergences: diff.size|' scratch-verify-folha.mjs && /opt/homebrew/bin/node scratch-verify-folha.mjs 2026-07 2>&1 | sed -n 2,3p | head -c 3000; echo; /opt/homebrew/bin/node scratch-verify-folha.mjs 2026-06 2>&1 | grep -E "mapDivergences|status|SYNTHETIC|missing:" 

OUT
[API Fortes] Folha=2017 linhas; Provisões Fortes=0 (13º+férias); Bases encargo eSocial=158; CPP 60574603/62224222, FGTS 4812527/4922751
[["000163","BRAGA VEICULOS FILIAL NOVOS -> ADMINISTRAÇÃO MATRIZ TI"],["000378","DEPT. DE FINANCIAMENTO MATRIZ -> DEPT. FINANCIAMENTO FILIAL"],["000631","BRAGA VEICULOS FILIAL NOVOS -> DEPT. DE FINANCIAMENTO MATRIZ"]]

  mapDivergences: 3,
    bcCpCents: { expected: 51515718, extracted: 50142849, missing: 1372869 },
    fgtsDepoCents: { expected: 4234669, extracted: 3979598, missing: 255071 }
  status: 'blocked',
Bash Compare June run before and after changes
IN
/opt/homebrew/bin/node scratch-verify-folha.mjs 2026-06 2>&1 | tail -22; git stash -q && /opt/homebrew/bin/node scratch-verify-folha.mjs 2026-06 2>&1 | grep -A12 "status" | head -14; git stash pop -q && git status --short

OUT
  PROV_INSS_FER: '-15073.60',
  PROV_FGTS_FER: '-4433.38',
  ENCARGO_INSS_PATRONAL: '100285.66',
  ENCARGO_RAT_FAP: '5859.12',
  ENCARGO_TERCEIROS: '29082.88',
  ENCARGO_FGTS_FOLHA: '39795.98'
}
RAT por EST { '0002': 168962, '0001': 416950 }
{
  status: 'blocked',
  issues: {
    'warning:INFORMATIVE_EVENT_IGNORED': 187,
    'warning:CENTER_REMOVED_FROM_BALANCE_ACCOUNT': 386,
    'blocker:MISSING_CENTER_MAPPING': 33,
    'blocker:MISSING_REQUIRED_CENTER': 26
  },
  missingCenterLots: [
    'BRAGA VEICULOS DEPTO VENDAS NOVOS',
    'BRAGA VEICULOS DEPTO VENDAS SEMINOVOS',
    'ADMINISTRAÇÃO MATRIZ TI'
  ]
}
  status: 'blocked',
  issues: {
    'warning:INFORMATIVE_EVENT_IGNORED': 158,
    'warning:CENTER_REMOVED_FROM_BALANCE_ACCOUNT': 378,
    'blocker:MISSING_CENTER_MAPPING': 8,
    'blocker:MISSING_REQUIRED_CENTER': 8
  },
  missingCenterLots: [
    'BRAGA VEICULOS DEPTO VENDAS NOVOS',
    'BRAGA VEICULOS DEPTO VENDAS SEMINOVOS'
  ]
}
 M ../rayo-server/fortes-extractor.js
 M ../rayo-server/index.js
 M src/hooks/useFolhaDealer.js
 M src/lib/folha-dealer/braga-veiculos.config.js
 M src/lib/folha-dealer/contracts.js
 M src/lib/folha-dealer/encargo-calculator.js
 M src/lib/folha-dealer/fortes-csv-parser.js
 M src/lib/folha-dealer/fortes-data-fetcher.js
 M src/lib/folha-dealer/fortes-normalizer.js
 M src/lib/folha-dealer/fortes-query-adapter.js
 M src/lib/folha-dealer/index.js
 M src/lib/folha-dealer/provision-calculator.js
 M src/pages/FolhaDealerPage.jsx
 M tests/folha-dealer-encargo-calculator.test.js
 M tests/folha-dealer-engine.test.js
 M tests/folha-dealer-fortes-query-adapter.test.js
?? scratch-verify-folha.mjs
?? ../../zIssue.md
Confirmei que junho continua bloqueado, agora revelando uma terceira lotação nova ("ADMINISTRAÇÃO MATRIZ TI") que o mapa estático não capturava — o script usa o seed do config, não o cadastro salvo no servidor. Vou remover o script temporário e rodar o lint.
Bash Lint changed files and compare with baseline
IN
mv scratch-verify-folha.mjs /private/tmp/claude-501/-Users-ryanrichard-projecont-Rayo/f7e87434-631e-4f2c-9fe5-b7ccd7d0ec2f/scratchpad/ && export PATH=/opt/homebrew/bin:$PATH && npx eslint src/lib/folha-dealer src/hooks/useFolhaDealer.js src/pages/FolhaDealerPage.jsx 2>&1 | tail -15; git stash -q; npx eslint src/lib/folha-dealer src/hooks/useFolhaDealer.js src/pages/FolhaDealerPage.jsx 2>&1 | tail -2; git stash pop -q; node -e "require('../rayo-server/fortes-extractor.js'); console.log('server ok')"

OUT
/Users/ryanrichard/projecont/Rayo/apps/rayo/src/lib/folha-dealer/folha-validator.js
  20:42  error  'existingIssues' is assigned a value but never used  no-unused-vars

/Users/ryanrichard/projecont/Rayo/apps/rayo/src/lib/folha-dealer/fortes-query-adapter.js
  39:46  error  'options' is assigned a value but never used  no-unused-vars

/Users/ryanrichard/projecont/Rayo/apps/rayo/src/lib/folha-dealer/pdf-report-generator.js
  52:28  error  'data' is defined but never used                                                           no-unused-vars
  77:7   error  'firstPage' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u  no-unused-vars

/Users/ryanrichard/projecont/Rayo/apps/rayo/src/lib/folha-dealer/provision-calculator.js
  101:15  error  'key' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u  no-unused-vars

✖ 5 problems (5 errors, 0 warnings)

✖ 5 problems (5 errors, 0 warnings)

server ok
Terminei as correções. O lint tem os mesmos 5 erros de antes (nenhum novo) e o servidor carrega. Seguem o resumo e uma decisão pendente.

Resumo
Apliquei todas as correções, com as suas escolhas: provisão sintética com aviso, todos os tipos de FGTS no encargo do mês, RAT lido do Fortes por estabelecimento e INSS da provisão = soma dos encargos. Não fiz commit.

Testes: os 13 testes novos passam. Continuam falhando 5 testes do layout TXT, que já falhavam antes das mudanças. Também rodei o pipeline com o banco real para 04, 06 e 07/2026.

O que mudou
Provisões: mês sem PRD/PRF do Fortes agora usa o cálculo por alíquota em vez de zerar os PROV_*, e mostra um aviso na tela. O mesmo vale para encargos sem base eSocial. A base desse cálculo passou a ser só proventos, e o INSS é 20% + RAT + 5,8% (26,8%), em vez de 28,80%.
Lotação: a folha mensal agora vem com a lotação do Fortes. O mapa estático por empregado só entra quando a lotação vem vazia. O CSV passou a trazer IncideFGTS/TipoRegistro e usa o nome da lotação, como o servidor já fazia.
Encargos:
O RAT vem do eSocial por estabelecimento: 1% na matriz (EST 0001) e 2% na filial (EST 0002).
O FGTS inclui todos os tipos (12, 13, 15, 21, 22, 23), e a base de INSS inclui o 13º.
Em 04/2026, a filial ficou com R$ 2.372,87 de RAT (antes seria cerca de R$ 1.186).
Líquido da folha: quando é negativo, não some mais; o lote fica bloqueado.
Conferência nova: o servidor compara a soma das bases por empregado com o total do eSocial e avisa na tela se faltar algo.
Conferido em 04/2026: nenhuma linha sem lotação, zero divergências com o mapa estático, PROV_13 = R$ 17.935,11 (bate com o RH) e status ready.

O que isso revelou
As lotações do Fortes mudaram a partir de 06/2026. O mapa estático escondia isso:
Em 07/2026, 3 empregados trocaram de lotação (000163, 000378, 000631).
Aparecem 10 lotações sem de-para de centro, como "ADMINISTRAÇÃO MATRIZ TI" e "BRAGA VEÍCULOS - DEPTO F&I".
Junho e julho ficam bloqueados até essas lotações serem cadastradas. Validei só com os centros padrão do config; se você já cadastrou alguma no servidor, ela conta.
Parte da base eSocial não entra nos encargos, e o aviso novo vai aparecer todo mês. Em 04/2026 ficaram fora R$ 11.381,69 de base de INSS e R$ 1.323,90 de FGTS:
Rescindidos: 5 empregados desligados em abril estão só na folha de rescisão (Folha=4), que o extract não lê. Nenhum lançamento deles, nem a folha nem os encargos, entra no lote Dealer.
Diretor sem matrícula eSocial: R$ 2.259,20 de base de um contribuinte individual (categoria 722). Esse caso tem regra de INSS diferente (sem Terceiros e sem RAT), então não dá para aplicar as mesmas alíquotas.
Decisão sua: as rescisões (Folha=4) devem entrar neste lote do Dealer, ou vão num lote separado? E o diretor da categoria 722 precisa de uma regra própria de INSS? Não mexi em nenhum dos dois porque isso muda o escopo.