/**
 * notas-reconciler.js — Motor de Conciliação Notas × Razão
 *
 * Algoritmo:
 * 1. Para cada NotaGroup do Relatório (Sankhya), busca no byNumNota do Razão.
 * 2. Não encontrou em nenhum lançamento → INCONSISTÊNCIA
 * 3. Encontrou: soma créditos do Razão → compara com totalVlrFin
 *    - |delta| ≤ 0.05 → CONCILIADO
 *    - |delta| > 0.05 → INVESTIGAR
 * 4. Créditos no Razão sem par no Relatório → SEM_RELATÓRIO
 *
 * Normalização de "nota": ambos os lados já chegam normalizados (sem zeros à esquerda).
 */

export const STATUS = {
    CONCILIADO:    'CONCILIADO',
    INVESTIGAR:    'INVESTIGAR',
    INCONSISTENCIA: 'INCONSISTENCIA',
    SEM_RELATORIO: 'SEM_RELATORIO',
};

const TOLERANCIA = 0.05;

/**
 * Motor principal de conciliação.
 *
 * @param {NotaGroup[]} relatorio     - grupos de notas do relatório Sankhya
 * @param {Map<string, Lancamento[]>} byNumNota - lançamentos do Razão agrupados por numeroNota
 * @returns {ConciliacaoNotasResultado}
 */
export function reconcileNotas(relatorio, byNumNota) {
    const resultados = [];
    const notasRelatorio = new Set();

    for (const grupo of relatorio) {
        const { numeroNota, nome, codparc, descrnat, parcelas, totalVlrFin } = grupo;
        notasRelatorio.add(numeroNota);

        const lancamentosRazao = byNumNota.get(numeroNota) || [];

        // Sem lançamento no Razão → INCONSISTÊNCIA
        if (lancamentosRazao.length === 0) {
            resultados.push({
                numeroNota,
                nome,
                codparc,
                descrnat,
                totalVlrFin,
                totalCreditoRazao: 0,
                delta: totalVlrFin,
                status: STATUS.INCONSISTENCIA,
                parcelas,
                lancamentosRazao: [],
            });
            continue;
        }

        // Consolida créditos do Razão para esta nota
        const totalCreditoRazao = lancamentosRazao.reduce((acc, l) => acc + l.credito, 0);
        const delta = Math.abs(totalVlrFin - totalCreditoRazao);

        let status;
        if (totalCreditoRazao === 0) {
            status = STATUS.INVESTIGAR;
        } else if (delta <= TOLERANCIA) {
            status = STATUS.CONCILIADO;
        } else {
            status = STATUS.INVESTIGAR;
        }

        resultados.push({
            numeroNota,
            nome,
            codparc,
            descrnat,
            totalVlrFin,
            totalCreditoRazao,
            delta: totalVlrFin - totalCreditoRazao, // positivo = falta no razão; negativo = a mais
            status,
            parcelas,
            lancamentosRazao,
        });
    }

    // SEM_RELATÓRIO: créditos no Razão sem par no Relatório
    for (const [numeroNota, lancamentos] of byNumNota) {
        if (notasRelatorio.has(numeroNota)) continue;

        const totalCreditoRazao = lancamentos.reduce((acc, l) => acc + l.credito, 0);
        if (totalCreditoRazao === 0) continue; // só débitos, irrelevante aqui

        const primeiro = lancamentos[0];
        resultados.push({
            numeroNota,
            nome: '',
            codparc: '',
            descrnat: primeiro.historico || '',
            totalVlrFin: 0,
            totalCreditoRazao,
            delta: -totalCreditoRazao,
            status: STATUS.SEM_RELATORIO,
            parcelas: [],
            lancamentosRazao: lancamentos,
        });
    }

    // Ordenação: INCONSISTENCIA → INVESTIGAR → CONCILIADO → SEM_RELATORIO
    const ordem = {
        [STATUS.INCONSISTENCIA]: 0,
        [STATUS.INVESTIGAR]: 1,
        [STATUS.CONCILIADO]: 2,
        [STATUS.SEM_RELATORIO]: 3,
    };
    resultados.sort((a, b) => ordem[a.status] - ordem[b.status]);

    // Totalizadores
    const totalRelatorio = relatorio.reduce((acc, g) => acc + g.totalVlrFin, 0);
    const totalCreditoRazao = [...byNumNota.values()].flat().reduce((acc, l) => acc + l.credito, 0);
    const diferencaGeral = totalRelatorio - totalCreditoRazao;

    const contadores = {
        conciliados:    resultados.filter(r => r.status === STATUS.CONCILIADO).length,
        investigar:     resultados.filter(r => r.status === STATUS.INVESTIGAR).length,
        inconsistencias: resultados.filter(r => r.status === STATUS.INCONSISTENCIA).length,
        semRelatorio:   resultados.filter(r => r.status === STATUS.SEM_RELATORIO).length,
    };

    return {
        resultados,
        totalRelatorio,
        totalCreditoRazao,
        diferencaGeral,
        contadores,
    };
}
