/**
 * Conferência contra o "Resumo Geral do Mês/Período" que o contador usa.
 *
 * A fixture traz o valor de cada evento, por tipo de folha, transcrito dos
 * relatórios do contador (Braga Motos 04/2026, Braga Veículos 01–08/2026).
 * Estes testes garantem que o lote do Rayo:
 * - reconhece todo evento que o contador vê no relatório (nenhum sem conta);
 * - lança cada evento com o valor do relatório, a débito se provento e a
 *   crédito se desconto;
 * - fecha, por tipo de folha, os mesmos proventos/descontos/líquido do relatório;
 * - leva cada líquido para a conta combinada com o contador, com o histórico do tipo;
 * - segue as decisões do contador (baixa de provisão, aviso prévio etc.);
 * - não gera encargo patronal para férias, rescisão ou complementar.
 *
 * Com FORTES_LIVE=1 (e acesso ao SQL Server do Fortes), também compara, evento
 * a evento, o que o Rayo extrai do banco com o relatório.
 */
import { createRequire } from 'node:module';
import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { normalizeFortesQueryRows } from '../src/lib/folha-dealer/fortes-query-adapter.js';
import { runFolhaDealerEngine } from '../src/lib/folha-dealer/index.js';
import { summarizeByPayrollType } from '../src/lib/folha-dealer/payroll-type-summary.js';
import { bragaMotosConfig } from '../src/lib/folha-dealer/braga-motos.config.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import {
  bragaMotosResumoGeral,
  bragaVeiculosResumoGeral,
} from './fixtures/folha-dealer-resumo-geral-contador.js';

// Totais impressos em cada relatório (proventos, descontos, líquido), em centavos.
const TOTAIS_IMPRESSOS = {
  '9277': {
    MENSAL: [38987636, 9078501, 29909135],
    FERIAS: [1643745, 430566, 1213179],
    RESCISAO: [3791462, 2141664, 1649798],
    COMPLEMENTAR: [3005030, 158957, 2846073],
    TOTAL_GERAL: [47427873, 11809688, 35618185],
  },
  '9274': {
    MENSAL: [354219485, 74585166, 279634319],
    FERIAS: [15223028, 2947016, 12276012],
    RESCISAO: [14821938, 4716602, 10105336],
    COMPLEMENTAR: [1335993, 14252, 1321741],
    TOTAL_GERAL: [385600444, 82263036, 303337408],
  },
};

// Contas dos líquidos e histórico no TXT, combinados com o contador.
const LIQUIDOS = {
  MENSAL: { eventCode: 'LIQUIDO_FOLHA', conta: '2.1.1.01.001', historico: 'FOLHA DE PAGAMENTO REF' },
  FERIAS: { eventCode: 'LIQUIDO_FERIAS', conta: '1.1.4.01.002', historico: 'FERIAS REF' },
  RESCISAO: { eventCode: 'LIQUIDO_RESCISAO', conta: '2.1.1.01.004', historico: 'RESCISAO REF' },
  COMPLEMENTAR: { eventCode: 'LIQUIDO_COMPLEMENTAR', conta: '2.1.1.01.001', historico: 'FOLHA COMPLEMENTAR REF' },
};

// Decisões do contador (validadas em 28/09/2026): evento → conta e natureza, por tipo de folha.
const DECISOES = [
  { tipo: 'FERIAS', eventos: ['110', '111', '113', '950'], conta: '6.1.1.03.001', dc: 'D', motivo: 'proventos de férias em despesa de férias' },
  { tipo: 'FERIAS', eventos: ['301'], conta: '2.1.1.02.007', dc: 'C', motivo: 'desconto do crédito do trabalhador (consignado)' },
  { tipo: 'MENSAL', eventos: ['100'], conta: '2.1.1.02.007', dc: 'D', motivo: 'evento 100 na mesma conta do 301' },
  { tipo: 'RESCISAO', eventos: ['100'], conta: '2.1.1.02.007', dc: 'D', motivo: 'evento 100 na mesma conta do 301' },
  { tipo: 'RESCISAO', eventos: ['203', '205', '206', '211', '212'], conta: '6.1.1.03.001', dc: 'D', motivo: 'férias na rescisão em despesa de férias' },
  { tipo: 'RESCISAO', eventos: ['160', '208', '209'], conta: '6.1.1.03.002', dc: 'D', motivo: '13º na rescisão em despesa de 13º' },
  { tipo: 'RESCISAO', eventos: ['200', '201'], conta: '6.1.1.01.004', dc: 'D', motivo: 'aviso prévio indenizado / rescisão antecipada' },
];

// Multa de 40% do FGTS (evento 900, informativo no Fortes): vai para o Dealer
// na competência da data de cálculo da rescisão.
const MULTA_FGTS = { eventCode: '900', debito: '6.1.1.02.002', credito: '2.1.1.02.002' };

const EMPRESAS = [
  { config: bragaMotosConfig, resumo: bragaMotosResumoGeral },
  { config: bragaVeiculosConfig, resumo: bragaVeiculosResumoGeral },
];

const soma = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);
const eventosDoRelatorio = (resumo) =>
  Object.entries(resumo.tipos).flatMap(([tipo, { proventos, descontos }]) => [
    ...Object.entries(proventos).map(([code, cents]) => ({ tipo, code, cents, natureza: 'PROVENTO' })),
    ...Object.entries(descontos).map(([code, cents]) => ({ tipo, code, cents, natureza: 'DESCONTO' })),
  ]);

/** Monta o lote a partir do relatório: um lançamento de origem por evento. */
function loteDoRelatorio({ config, resumo }) {
  const companyId = config.company.companyId;
  const lotacaoCode = config.centerMappings.find((m) => m.active && m.allocationMode === 'direct').lotacaoCode;
  const competence = resumo.periodo.inicio;
  const linhas = eventosDoRelatorio(resumo).map((e) => ({
    companyId,
    competence: competence.replace('-', ''),
    payrollType: e.tipo === 'MENSAL' ? undefined : e.tipo,
    lotacaoCode,
    employeeId: '1',
    eventCode: e.code,
    amountCents: e.cents,
    ProvDesc: e.natureza === 'PROVENTO' ? 1 : -1,
    TipoRegistro: e.natureza,
    // Sem PRD/PRF nem bases eSocial, o motor cai no cálculo sintético de
    // provisão/encargo sobre os proventos com incidência de FGTS.
    IncideFGTS: e.natureza === 'PROVENTO' ? '1' : '0',
  }));
  const normalizar = (extras) =>
    normalizeFortesQueryRows(
      linhas.filter((l) => !l.payrollType),
      { fortesExtraPayroll: extras },
      config.provisionRates,
      config.encargoRates
    ).map((row) => ({ ...row, companyId }));
  const sourceRows = normalizar(linhas.filter((l) => l.payrollType));
  const soFolhaMensal = normalizar([]);
  const run = runFolhaDealerEngine({ config, sourceRows, competence });
  return { sourceRows, soFolhaMensal, run, competence };
}

for (const empresa of EMPRESAS) {
  const { config, resumo } = empresa;
  const nome = `${config.company.companyName} (${resumo.fortesCompany}) ${resumo.periodo.inicio}..${resumo.periodo.fim}`;
  const totais = TOTAIS_IMPRESSOS[resumo.fortesCompany];

  describe(`Resumo Geral do contador — ${nome}`, () => {
    it('fixture confere com os totais impressos no relatório', () => {
      let geralP = 0;
      let geralD = 0;
      for (const [tipo, { proventos, descontos }] of Object.entries(resumo.tipos)) {
        const [p, d, liquido] = totais[tipo];
        expect([tipo, soma(proventos), soma(descontos)]).toEqual([tipo, p, d]);
        expect(p - d).toBe(liquido);
        geralP += p;
        geralD += d;
      }
      expect([geralP, geralD, geralP - geralD]).toEqual(totais.TOTAL_GERAL);
    });

    it('todo evento do relatório tem conta no de-para: provento a débito, desconto a crédito', () => {
      const semConta = [];
      for (const e of eventosDoRelatorio(resumo)) {
        const dcs = config.accountMappings.filter((m) => m.active !== false && m.eventCode === e.code).map((m) => m.dc);
        const esperado = e.natureza === 'PROVENTO' ? 'D' : 'C';
        if (dcs.length !== 1 || dcs[0] !== esperado) semConta.push(`${e.tipo} ${e.code} → ${JSON.stringify(dcs)}`);
      }
      expect(semConta).toEqual([]);
    });

    describe('lote gerado a partir do relatório', () => {
      const { sourceRows, soFolhaMensal, run, competence } = loteDoRelatorio(empresa);
      const [ano, mes] = competence.split('-');

      it('fecha débito = crédito, sem evento sem conta e sem bloqueio', () => {
        const total = (dc) => run.entries.filter((e) => e.dc === dc).reduce((s, e) => s + e.amountCents, 0);
        expect(total('D')).toBe(total('C'));
        expect(run.issues.filter((i) => i.severity === 'blocker').map((i) => `${i.code} ${i.context?.eventCode || ''}`)).toEqual([]);
        expect(run.status).toBe('ready');
      });

      it('resumo por tipo bate ao centavo com o relatório', () => {
        const resumoRayo = summarizeByPayrollType(sourceRows).map((t) => [
          t.payrollType, t.proventosCents, t.descontosCents, t.liquidoCents,
        ]);
        expect(resumoRayo).toEqual(
          ['MENSAL', 'FERIAS', 'RESCISAO', 'COMPLEMENTAR'].map((tipo) => [tipo, ...totais[tipo]])
        );
      });

      it('cada evento é lançado com o valor do relatório, a débito se provento e a crédito se desconto', () => {
        const divergentes = [];
        for (const e of eventosDoRelatorio(resumo)) {
          const lancs = run.entries.filter((x) => x.eventCode === e.code && x.payrollType === e.tipo);
          const dcs = [...new Set(lancs.map((x) => x.dc))];
          const valor = lancs.reduce((s, x) => s + x.amountCents, 0);
          const dc = e.natureza === 'PROVENTO' ? 'D' : 'C';
          if (valor !== e.cents || dcs.join() !== dc) {
            divergentes.push(`${e.tipo} ${e.code}: relatório ${e.cents} ${dc}, lote ${valor} ${dcs.join('/')}`);
          }
        }
        expect(divergentes).toEqual([]);
      });

      it('cada líquido vai para a conta combinada com o contador, com o histórico do tipo de folha', () => {
        for (const [tipo, { eventCode, conta, historico }] of Object.entries(LIQUIDOS)) {
          const lancs = run.entries.filter((e) => e.eventCode === eventCode);
          expect(lancs.map((e) => [e.dc, e.accountCode, e.payrollType, e.history])).toEqual(
            lancs.map(() => ['C', conta, tipo, `${historico} ${mes}/${ano}`])
          );
          expect([tipo, lancs.reduce((s, e) => s + e.amountCents, 0)]).toEqual([tipo, totais[tipo][2]]);
        }
      });

      it('segue as decisões do contador (provisões, aviso prévio, evento 301)', () => {
        const conferidos = [];
        for (const { tipo, eventos, conta, dc, motivo } of DECISOES) {
          for (const code of eventos) {
            const noRelatorio = resumo.tipos[tipo][dc === 'D' ? 'proventos' : 'descontos'][code];
            if (!noRelatorio) continue;
            const lancs = run.entries.filter((e) => e.eventCode === code && e.payrollType === tipo);
            expect([motivo, code, [...new Set(lancs.map((e) => `${e.dc} ${e.accountCode}`))]]).toEqual([
              motivo, code, [`${dc} ${conta}`],
            ]);
            expect(lancs.reduce((s, e) => s + e.amountCents, 0)).toBe(noRelatorio);
            conferidos.push(code);
          }
        }
        expect(conferidos.length).toBeGreaterThan(0);
      });

      it('não gera encargo patronal nem provisão para férias, rescisão ou complementar', () => {
        // Encargo e provisão desses tipos já vêm nas bases eSocial/PRD/PRF do
        // Fortes; o cálculo sintético tem que sair igual ao da folha mensal sozinha.
        const sinteticos = (rows) =>
          rows
            .filter((r) => r.sourceOrigin === 'provision-derived' || r.sourceOrigin === 'encargo-derived')
            .map((r) => `${r.eventCode}:${r.amountCents}`)
            .sort();
        expect(sinteticos(soFolhaMensal).length).toBeGreaterThan(0);
        expect(sinteticos(sourceRows)).toEqual(sinteticos(soFolhaMensal));
        const lancados = run.entries.filter((e) => /^(ENCARGO_|PROV_)/.test(e.eventCode));
        expect(lancados.length).toBeGreaterThan(0);
        expect([...new Set(lancados.map((e) => e.history))]).toEqual([`FOLHA DE PAGAMENTO REF ${mes}/${ano}`]);
      });
    });

    it('multa de 40% do FGTS vai para o Dealer (D despesa FGTS / C FGTS a recolher) sem mexer no líquido da rescisão', () => {
      const companyId = config.company.companyId;
      const lotacaoCode = config.centerMappings.find((m) => m.active && m.allocationMode === 'direct').lotacaoCode;
      const base = { companyId, competence: '202604', payrollType: 'RESCISAO', lotacaoCode, employeeId: '2' };
      const sourceRows = normalizeFortesQueryRows([], {
        fortesExtraPayroll: [
          { ...base, eventCode: '199', amountCents: 300000, ProvDesc: 1, TipoRegistro: 'PROVENTO' },
          { ...base, eventCode: '900', amountCents: 41906, ProvDesc: 0, TipoRegistro: 'INFORMATIVO' },
        ],
      }).map((row) => ({ ...row, companyId }));
      const run = runFolhaDealerEngine({ config, sourceRows, competence: '2026-04' });

      const multa = run.entries.filter((e) => e.eventCode === MULTA_FGTS.eventCode);
      expect(multa.map((e) => [e.dc, e.accountCode, e.amountCents, e.history]).sort()).toEqual([
        ['C', MULTA_FGTS.credito, 41906, 'RESCISAO REF 04/2026'],
        ['D', MULTA_FGTS.debito, 41906, 'RESCISAO REF 04/2026'],
      ]);
      const liquido = run.entries.filter((e) => e.eventCode === 'LIQUIDO_RESCISAO');
      expect(liquido.reduce((s, e) => s + e.amountCents, 0)).toBe(300000);
      expect(run.issues.filter((i) => i.severity === 'blocker')).toEqual([]);
    });
  });
}

// ---------------------------------------------------------------------------
// Conferência direta no banco do Fortes (opcional: FORTES_LIVE=1)
// ---------------------------------------------------------------------------

function* competencias(inicio, fim) {
  let [ano, mes] = inicio.split('-').map(Number);
  const [anoFim, mesFim] = fim.split('-').map(Number);
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    yield `${ano}-${String(mes).padStart(2, '0')}`;
    mes += 1;
    if (mes > 12) { mes = 1; ano += 1; }
  }
}

describe.skipIf(!process.env.FORTES_LIVE)('Fortes ao vivo × Resumo Geral do contador', () => {
  const require = createRequire(import.meta.url);

  for (const { config, resumo } of EMPRESAS) {
    it(`${config.company.companyName}: cada evento extraído do banco bate com o relatório`, async () => {
      const { extractFortesPayroll } = require('../../rayo-server/fortes-extractor.js');
      const extraido = {};
      const empregados = {};
      for (const competence of competencias(resumo.periodo.inicio, resumo.periodo.fim)) {
        const ex = await extractFortesPayroll({ companyId: resumo.fortesCompany, competence });
        const rows = normalizeFortesQueryRows(ex.payroll, { fortesExtraPayroll: ex.extraPayroll });
        for (const row of rows) {
          if (row.sourceOrigin === 'fortes-query-derived') continue;
          if (row.sourceRecordType !== 'PROVENTO' && row.sourceRecordType !== 'DESCONTO') continue;
          const lado = row.sourceRecordType === 'PROVENTO' ? 'proventos' : 'descontos';
          const tipo = (extraido[row.payrollType] ||= { proventos: {}, descontos: {} });
          tipo[lado][row.eventCode] = (tipo[lado][row.eventCode] || 0) + Math.abs(row.amountCents);
          (empregados[row.payrollType] ||= new Set()).add(`${competence}:${row.employeeId}`);
        }
      }
      const semZeros = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== 0));
      for (const [tipo, esperado] of Object.entries(resumo.tipos)) {
        expect([tipo, semZeros(extraido[tipo]?.proventos || {})]).toEqual([tipo, esperado.proventos]);
        expect([tipo, semZeros(extraido[tipo]?.descontos || {})]).toEqual([tipo, esperado.descontos]);
      }
      if (resumo.fortesCompany === '9277') {
        // "Total de Empregados" do relatório de 04/2026
        expect(empregados.FERIAS.size).toBe(6);
        expect(empregados.RESCISAO.size).toBe(15);
      }
    }, 600_000);
  }
});
