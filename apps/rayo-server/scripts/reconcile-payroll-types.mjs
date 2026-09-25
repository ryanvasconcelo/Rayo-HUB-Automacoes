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
