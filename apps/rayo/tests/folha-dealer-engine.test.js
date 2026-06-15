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
    it('normaliza amountCents sempre positivo', () => {
        const rows = normalizePayrollRows([
            {
                sourceSystem: 'fortes',
                sourceAdapter: 'fixture',
                sourceOrigin: 'folha-mensal',
                companyId: 'braga-veiculos',
                companyName: 'BRAGA VEICULOS LTDA',
                competence: '2026-04',
                lotacaoCode: 'ADM',
                eventCode: '011',
                amountCents: -12345
            }
        ]);

        expect(rows[0].amountCents).toBe(12345);
    });

    it('consolida duas linhas iguais em um item', () => {
        const rows = normalizePayrollRows([
            ...baseRows(),
            {
                ...baseRows()[0],
                sourceLineId: 'extra-salario',
                amountCents: 5000
            }
        ]);

        const consolidated = consolidatePayrollRows(rows);
        const salaryAdm = consolidated.find((item) =>
            item.lotacaoCode === 'ADM' && item.eventCode === '011'
        );

        expect(salaryAdm.amountCents).toBe(105000);
        expect(salaryAdm.sourceCount).toBe(2);
    });

    it('mantem separados eventos diferentes na mesma lotacao', () => {
        const [salaryRow] = baseRows();
        const consolidated = consolidatePayrollRows([
            salaryRow,
            {
                ...salaryRow,
                sourceLineId: 'inss-mesma-lotacao',
                eventCode: '310',
                eventName: 'INSS',
                amountCents: 10000
            }
        ]);
        const admItems = consolidated.filter((item) => item.lotacaoCode === 'ADM');

        expect(admItems.map((item) => item.eventCode).sort()).toEqual(['011', '310']);
    });

    it('mantem separadas lotacoes diferentes no mesmo evento', () => {
        const [salaryRow] = baseRows();
        const consolidated = consolidatePayrollRows([
            salaryRow,
            {
                ...salaryRow,
                sourceLineId: 'salario-vendas',
                lotacaoCode: 'VEN',
                lotacaoName: 'DEPT. VENDAS VEICULOS',
                amountCents: 70000
            },
            {
                ...salaryRow,
                sourceLineId: 'salario-mecanica',
                lotacaoCode: 'MEC',
                lotacaoName: 'DEPT. PRODUTIVOS',
                amountCents: 30000
            }
        ]);
        const salaryItems = consolidated.filter((item) => item.eventCode === '011');

        expect(salaryItems.map((item) => item.lotacaoCode).sort()).toEqual(['ADM', 'MEC', 'VEN']);
    });

    it('gera centro para conta iniciada por 6', () => {
        const result = runEngine();
        const salaryEntry = result.entries.find((entry) =>
            entry.eventCode === '011' && entry.lotacaoCode === 'VEN'
        );

        expect(salaryEntry.accountCode).toBe('6.1.1.01.002');
        expect(salaryEntry.centerCode).toBe('001000');
    });

    it('remove centro para conta iniciada por 2', () => {
        const result = runEngine();
        const inssEntry = result.entries.find((entry) => entry.eventCode === '310');

        expect(inssEntry.accountCode).toBe('2.1.1.02.001');
        expect(inssEntry.centerCode).toBeUndefined();
    });

    it('evento 100 usa 2.1.1.03.001', () => {
        const result = runEngine();
        const event100 = result.entries.find((entry) => entry.eventCode === '100');

        expect(event100.accountCode).toBe('2.1.1.03.001');
    });

    it('evento 100 nao leva centro', () => {
        const result = runEngine();
        const event100 = result.entries.find((entry) => entry.eventCode === '100');

        expect(event100.centerCode).toBeUndefined();
    });

    it('evento informativo nao gera lancamento', () => {
        const result = runEngine();

        expect(result.entries.some((entry) => entry.eventCode === '600')).toBe(false);
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'INFORMATIVE_EVENT_IGNORED',
                severity: 'warning'
            })
        ]));
    });

    it('evento informativo configurado no config é ignorado e não gera MISSING_ACCOUNT_MAPPING', () => {
        const config = {
            ...bragaVeiculosConfig,
            informativeEventCodes: ['999'] // Evento fictício 999
        };

        const result = runEngine({
            config,
            sourceRows: [
                ...baseRows(),
                {
                    ...baseRows()[0],
                    sourceLineId: 'info-configurado',
                    eventCode: '999',
                    eventName: 'Evento Informativo Custom',
                    amountCents: 10000
                }
            ]
        });

        // Não deve gerar entry para 999
        expect(result.entries.some((entry) => entry.eventCode === '999')).toBe(false);
        
        // Deve avisar que foi ignorado
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'INFORMATIVE_EVENT_IGNORED',
                severity: 'warning',
                context: expect.objectContaining({ eventCode: '999' })
            })
        ]));

        // NÃO deve bloquear reclamando de MISSING_ACCOUNT_MAPPING
        const missingAccount = result.issues.find(i => i.code === 'MISSING_ACCOUNT_MAPPING' && i.context?.eventCode === '999');
        expect(missingAccount).toBeUndefined();

        // O run ainda deve ser ready (assumindo que o baseRows seja balanceado)
        expect(result.status).toBe('ready');
    });

    it('bloqueia evento sem conta', () => {
        const result = runEngine({
            sourceRows: [
                ...baseRows(),
                {
                    ...baseRows()[0],
                    sourceLineId: 'event-sem-conta',
                    eventCode: '999',
                    eventName: 'Evento sem de-para',
                    amountCents: 10000
                }
            ]
        });

        expect(result.status).toBe('blocked');
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'MISSING_ACCOUNT_MAPPING',
                severity: 'blocker'
            })
        ]));
    });

    it('bloqueia lotacao sem centro quando a conta exige centro', () => {
        const result = runEngine({
            sourceRows: [
                {
                    ...baseRows()[0],
                    sourceLineId: 'sem-centro',
                    lotacaoCode: 'SEM_CENTRO',
                    lotacaoName: 'LOTACAO SEM CENTRO',
                    amountCents: 10000
                }
            ]
        });

        expect(result.status).toBe('blocked');
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'MISSING_CENTER_MAPPING',
                severity: 'blocker'
            })
        ]));
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'MISSING_REQUIRED_CENTER',
                severity: 'blocker'
            })
        ]));
    });

    it('bloqueia journal desbalanceado', () => {
        const config = {
            ...bragaVeiculosConfig,
            accountMappings: bragaVeiculosConfig.accountMappings.filter((mapping) =>
                mapping.eventCode !== '310'
            )
        };

        const result = runEngine({ config });

        expect(result.status).toBe('blocked');
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'UNBALANCED_JOURNAL',
                severity: 'blocker'
            })
        ]));
    });

    it('gera historico FOLHA DE PAGAMENTO REF MM/AAAA', () => {
        const result = runEngine();

        expect(result.entries.every((entry) =>
            entry.history === 'FOLHA DE PAGAMENTO REF 04/2026'
        )).toBe(true);
    });

    it('usa batchType FP', () => {
        const result = runEngine();

        expect(result.entries.every((entry) => entry.batchType === 'FP')).toBe(true);
    });

    // ====================================================================
    // Novos testes — revisão técnica
    // ====================================================================

    it('status ready quando nao ha blockers', () => {
        const result = runEngine();

        expect(result.status).toBe('ready');
        expect(result.entries.length).toBeGreaterThan(0);
        expect(result.issues.every((i) => i.severity !== 'blocker')).toBe(true);
    });

    it('motor nao sintetiza contrapartida — entries vem exclusivamente do accountMapping', () => {
        // Só evento 011 (D 6.1.1.01.002) sem nenhum crédito configurado
        const config = {
            ...bragaVeiculosConfig,
            accountMappings: bragaVeiculosConfig.accountMappings.filter((m) =>
                m.eventCode === '011'
            )
        };

        const result = runEngine({
            config,
            sourceRows: [baseRows()[0]] // apenas salário ADM
        });

        // Deve gerar apenas 1 entry (o débito do 011), não inventar crédito
        expect(result.entries.length).toBe(1);
        expect(result.entries[0].dc).toBe('D');
        expect(result.entries[0].eventCode).toBe('011');

        // E deve detectar desbalanceamento
        expect(result.status).toBe('blocked');
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'UNBALANCED_JOURNAL',
                severity: 'blocker'
            })
        ]));
    });

    it('emite warning CENTER_REMOVED_FROM_BALANCE_ACCOUNT ao remover centro de conta 1/2', () => {
        const result = runEngine();

        // INSS (310) → conta 2.1.1.02.001 → centro removido
        const centerRemovedWarnings = result.issues.filter(
            (i) => i.code === 'CENTER_REMOVED_FROM_BALANCE_ACCOUNT'
        );

        expect(centerRemovedWarnings.length).toBeGreaterThan(0);
        expect(centerRemovedWarnings.every((w) => w.severity === 'warning')).toBe(true);

        // O warning não deve bloquear
        expect(result.status).toBe('ready');
    });

    it('funciona com lotacoes reais Fortes (RECURSOS HUMANOS, DEPT. VENDAS VEICULOS, DEPT. SERVIÇOS MECANICA MATRIZ)', () => {
        const result = runFolhaDealerEngine({
            config: bragaVeiculosConfig,
            sourceRows: buildBragaRowsFortes(),
            competence: '2026-04',
        });

        // Status deve ser ready (sem blockers)
        expect(result.status).toBe('ready');

        // Deve gerar entries para os 3 lotações × 011 (D) + 3 lotações × 310 (C) + 1 × 100 (D)
        // = 3 + 3 + 1 = 7 entries
        expect(result.entries.length).toBe(7);

        // Confirma que RECURSOS HUMANOS resolveu centro 000600
        const rhSalary = result.entries.find(
            (e) => e.lotacaoCode === 'RECURSOS HUMANOS' && e.eventCode === '011'
        );
        expect(rhSalary).toBeDefined();
        expect(rhSalary.centerCode).toBe('000600');
        expect(rhSalary.accountCode).toBe('6.1.1.01.002');

        // Confirma que DEPT. VENDAS VEICULOS resolveu centro 001000
        const vendasSalary = result.entries.find(
            (e) => e.lotacaoCode === 'DEPT. VENDAS VEICULOS' && e.eventCode === '011'
        );
        expect(vendasSalary).toBeDefined();
        expect(vendasSalary.centerCode).toBe('001000');

        // Confirma que DEPT. SERVIÇOS MECANICA MATRIZ resolveu centro 000300
        const mecSalary = result.entries.find(
            (e) => e.lotacaoCode === 'DEPT. SERVIÇOS MECANICA MATRIZ' && e.eventCode === '011'
        );
        expect(mecSalary).toBeDefined();
        expect(mecSalary.centerCode).toBe('000300');

        // Informativo ignorado
        expect(result.entries.some((e) => e.eventCode === '600')).toBe(false);
    });
});

