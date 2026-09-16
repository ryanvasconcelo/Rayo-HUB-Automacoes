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
                eventCode: '011',
                amountCents: -12345
            }
        ]);

        expect(rows[0].amountCents).toBe(12345);
    });

    it('preserva sinal negativo de PROV_* Fortes (estorno Provisionar)', () => {
        const rows = normalizePayrollRows([
            {
                sourceSystem: 'fortes',
                sourceAdapter: 'fortes-provision',
                sourceOrigin: 'fortes-provision',
                companyId: 'braga-veiculos',
                companyName: 'BRAGA VEICULOS LTDA',
                competence: '2026-04',
                lotacaoCode: 'AGENDAMENTOS',
                eventCode: 'PROV_13',
                eventName: 'Provisão 13º Salário (Fortes)',
                employeeId: '000547',
                employeeName: 'ALINE CARVALHO CUNHA',
                amountCents: -41250,
            },
        ]);

        expect(rows[0].amountCents).toBe(-41250);
    });

    it('AGENDAMENTOS PROV_13 com estorno ALINE fecha líquido 1.114,71 (RH abr/2026)', () => {
        const sourceRows = [
            { employeeId: '000538', employeeName: 'ADRIANA OLIVEIRA DA SILVA', amountCents: 13750 },
            { employeeId: '000547', employeeName: 'ALINE CARVALHO CUNHA', amountCents: -41250 },
            { employeeId: '000499', employeeName: 'ANA CLAUDIA SILVA LOPES', amountCents: 13750 },
            { employeeId: '000427', employeeName: 'ELIMARA GARCIA DE PALMA', amountCents: 34193 },
            { employeeId: '000583', employeeName: 'GABRIELE SEVALHO PENA', amountCents: 13750 },
            { employeeId: '000471', employeeName: 'LUCIANA BATISTA DOS SANTOS', amountCents: 14733 },
            { employeeId: '000473', employeeName: 'MACIELE GARONE MEDEIROS', amountCents: 14733 },
            { employeeId: '000095', employeeName: 'MAYARA BEZERRA LEAO', amountCents: 16380 },
            { employeeId: '000584', employeeName: 'SILVANEIDE MIGUEL DE AQUINO', amountCents: 13750 },
            { employeeId: '000367', employeeName: 'SILVIA CARLA DA SILVA MOUSINHO', amountCents: 0 },
            { employeeId: '000235', employeeName: 'WANDERLANE DE OLIVEIRA BARROS', amountCents: 17682 },
        ].map((r) => ({
            sourceSystem: 'fortes',
            sourceAdapter: 'fortes-provision',
            sourceOrigin: 'fortes-provision',
            companyId: 'braga-veiculos',
            companyName: 'BRAGA VEICULOS LTDA',
            competence: '2026-04',
            lotacaoCode: 'AGENDAMENTOS',
            lotacaoName: 'AGENDAMENTOS',
            eventCode: 'PROV_13',
            eventName: 'Provisão 13º Salário (Fortes)',
            ...r,
        }));

        const run = runFolhaDealerEngine({
            config: bragaVeiculosConfig,
            sourceRows,
            competence: '2026-04',
        });

        const consolidated = run.consolidatedItems.find(
            (i) => i.lotacaoCode === 'AGENDAMENTOS' && i.eventCode === 'PROV_13'
        );
        expect(consolidated.amountCents).toBe(111471);

        const alineSource = run.sourceRows.find((r) => String(r.employeeId) === '000547');
        expect(alineSource.amountCents).toBe(-41250);

        // Estorno no journal consolidado: líquido positivo → D/C padrão do de-para
        const debit = run.entries
            .filter((e) => e.eventCode === 'PROV_13' && e.dc === 'D')
            .reduce((s, e) => s + e.amountCents, 0);
        const credit = run.entries
            .filter((e) => e.eventCode === 'PROV_13' && e.dc === 'C')
            .reduce((s, e) => s + e.amountCents, 0);
        expect(debit).toBe(111471);
        expect(credit).toBe(111471);
    });

    it('preserva sinal em todos os PROV_* Fortes (13º INSS/FGTS e férias)', () => {
        const negatives = [
            { eventCode: 'PROV_13', amountCents: -41250 },
            { eventCode: 'PROV_INSS_13', amountCents: -10643 },
            { eventCode: 'PROV_FGTS_13', amountCents: -3300 },
            { eventCode: 'PROV_FERIAS', amountCents: -220000 },
            { eventCode: 'PROV_INSS_FER', amountCents: -56760 },
            { eventCode: 'PROV_FGTS_FER', amountCents: -17600 },
        ];

        const sourceRows = negatives.map((r, i) => ({
            sourceSystem: 'fortes',
            sourceAdapter: 'fortes-provision',
            sourceOrigin: 'fortes-provision',
            companyId: 'braga-veiculos',
            companyName: 'BRAGA VEICULOS LTDA',
            competence: '2026-04',
            lotacaoCode: 'AGENDAMENTOS',
            lotacaoName: 'AGENDAMENTOS',
            eventName: r.eventCode,
            employeeId: '000547',
            employeeName: 'ALINE CARVALHO CUNHA',
            sourceLineId: `neg-${i}`,
            ...r,
        }));

        // Positivo na mesma lotação para cada evento → líquido = positivo + negativo
        for (const r of negatives) {
            sourceRows.push({
                sourceSystem: 'fortes',
                sourceAdapter: 'fortes-provision',
                sourceOrigin: 'fortes-provision',
                companyId: 'braga-veiculos',
                companyName: 'BRAGA VEICULOS LTDA',
                competence: '2026-04',
                lotacaoCode: 'AGENDAMENTOS',
                lotacaoName: 'AGENDAMENTOS',
                eventCode: r.eventCode,
                eventName: r.eventCode,
                employeeId: '000538',
                employeeName: 'ADRIANA',
                amountCents: Math.abs(r.amountCents) + 1000,
                sourceLineId: `pos-${r.eventCode}`,
            });
        }

        const run = runFolhaDealerEngine({
            config: bragaVeiculosConfig,
            sourceRows,
            competence: '2026-04',
        });

        for (const r of negatives) {
            const src = run.sourceRows.find(
                (row) => row.eventCode === r.eventCode && String(row.employeeId) === '000547'
            );
            expect(src.amountCents).toBe(r.amountCents);

            const consolidated = run.consolidatedItems.find(
                (i) => i.lotacaoCode === 'AGENDAMENTOS' && i.eventCode === r.eventCode
            );
            // líquido = (|neg| + 1000) + neg = 1000
            expect(consolidated.amountCents).toBe(1000);
        }
    });

    it('journal segmentado inverte D/C no estorno PROV_FERIAS', async () => {
        const { buildJournal } = await import('../src/lib/folha-dealer/journal-builder.js');
        const { entries } = buildJournal({
            competence: '2026-04',
            config: bragaVeiculosConfig,
            consolidatedItems: [
                {
                    companyId: 'braga-veiculos',
                    competence: '2026-04',
                    lotacaoCode: 'AGENDAMENTOS',
                    lotacaoName: 'AGENDAMENTOS',
                    eventCode: 'PROV_FERIAS',
                    eventName: 'Provisão Férias',
                    amountCents: -220000,
                    sourceCount: 1,
                    employeeId: '000547',
                    employeeName: 'ALINE',
                },
            ],
        });

        const despesa = entries.find((e) => e.accountCode === '6.1.1.03.001');
        const passivo = entries.find((e) => e.accountCode === '2.1.1.03.001');
        expect(despesa.dc).toBe('C'); // invertido de D
        expect(passivo.dc).toBe('D'); // invertido de C
        expect(despesa.amountCents).toBe(220000);
        expect(passivo.amountCents).toBe(220000);
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

    it('consolida a mesma lotacao+evento de sequencias de folha distintas', () => {
        const [salaryRow] = baseRows();
        const rows = normalizePayrollRows([
            {
                ...salaryRow,
                sourcePayrollId: '93',
                sourceLineId: 'folha-93',
                amountCents: 100000,
            },
            {
                ...salaryRow,
                sourcePayrollId: '94',
                sourceLineId: 'folha-94',
                amountCents: 45000,
            },
        ]);

        const consolidated = consolidatePayrollRows(rows);
        const salaryAdm = consolidated.find((item) =>
            item.lotacaoCode === 'ADM' && item.eventCode === '011'
        );

        expect(salaryAdm.amountCents).toBe(145000);
        expect(salaryAdm.sourceCount).toBe(2);
        expect(consolidated.filter((item) =>
            item.lotacaoCode === 'ADM' && item.eventCode === '011'
        )).toHaveLength(1);
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
            informativeEventCodes: ['8888'] // Evento fictício sem de-para real
        };

        const result = runEngine({
            config,
            sourceRows: [
                ...baseRows(),
                {
                    ...baseRows()[0],
                    sourceLineId: 'info-configurado',
                    eventCode: '8888',
                    eventName: 'Evento Informativo Custom',
                    amountCents: 10000
                }
            ]
        });

        // Não deve gerar entry para 8888
        expect(result.entries.some((entry) => entry.eventCode === '8888')).toBe(false);
        
        // Deve avisar que foi ignorado
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'INFORMATIVE_EVENT_IGNORED',
                severity: 'warning',
                context: expect.objectContaining({ eventCode: '8888' })
            })
        ]));

        // NÃO deve bloquear reclamando de MISSING_ACCOUNT_MAPPING
        const missingAccount = result.issues.find(i => i.code === 'MISSING_ACCOUNT_MAPPING' && i.context?.eventCode === '8888');
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
                    eventCode: '8888',
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

    it('aplica de-para do contador para comissões e prêmios de maio/2026', () => {
        const commission = bragaVeiculosConfig.accountMappings.find(
            (m) => m.eventCode === '980' && m.active
        );
        const premioFi = bragaVeiculosConfig.accountMappings.find(
            (m) => m.eventCode === '997' && m.active
        );
        const descMeta = bragaVeiculosConfig.accountMappings.find(
            (m) => m.eventCode === '999' && m.active
        );
        const difPiso = bragaVeiculosConfig.accountMappings.find(
            (m) => m.eventCode === '996' && m.active
        );

        expect(commission.dealerAccountCode).toBe('6.1.1.01.005');
        expect(commission.dc).toBe('D');
        expect(premioFi.dealerAccountCode).toBe('6.1.1.01.003');
        expect(premioFi.dc).toBe('D');
        expect(descMeta.dealerAccountCode).toBe('6.1.1.01.003');
        expect(descMeta.dc).toBe('C');
        expect(difPiso.dealerAccountCode).toBe('6.1.1.01.002');
        expect(difPiso.dc).toBe('D');
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

