/**
 * reconciler.js — Motor de Conciliação Razão × Relatório Financeiro
 *
 * Algoritmo:
 * 1. Para cada entrada do Relatório Financeiro, busca no Map do Razão por Nr. Recibo
 * 2. Se não encontrou em nenhum dos meses carregados → INCONSISTÊNCIA
 * 3. Se encontrou: soma débitos e créditos (consolida rateio)
 *    - |delta| ≤ 0.05 → CONCILIADO
 *    - |delta| > 0.05 → INVESTIGAR
 * 4. Entradas do Razão sem correspondente no Relatório → SEM_FINANCEIRO
 *
 * Status:
 *   CONCILIADO     → tudo fecha (tolerância R$ 0,05)
 *   INVESTIGAR     → encontrou débito mas valores divergem
 *   INCONSISTENCIA → no relatório, sem nenhum débito em nenhum mês carregado
 *   SEM_FINANCEIRO → no razão como débito, sem par no relatório
 */

export const STATUS = {
    CONCILIADO: 'CONCILIADO',
    INVESTIGAR: 'INVESTIGAR',
    INCONSISTENCIA: 'INCONSISTENCIA',
    SEM_FINANCEIRO: 'SEM_FINANCEIRO',
};

const TOLERANCIA = 0.05;

/**
 * Consolida os lançamentos do razão para um dado Nr. Recibo
 * Retorna totais de débito e crédito somados de todos os meses
 */
function consolidarRazao(lancamentosGrupo) {
    let totalDebito = 0;
    let totalCredito = 0;
    const mesesEncontrados = new Set();

    for (const l of lancamentosGrupo) {
        totalDebito += l.debito;
        totalCredito += l.credito;
        mesesEncontrados.add(l.mesFonte);
    }

    return { totalDebito, totalCredito, mesesEncontrados: [...mesesEncontrados] };
}

/**
 * Motor principal de conciliação
 *
 * @param {RelatorioEntry[]} relatorio - lançamentos do relatório financeiro
 * @param {Map<string, RazaoEntry[]>} razaoByRecibo - razão agrupado por Nr. Recibo
 * @returns {ConciliacaoResultado}
 */
export function reconcile(relatorio, razaoByRecibo) {
    const resultados = [];

    // Conjunto de recibos processados (para detectar SEM_FINANCEIRO depois)
    const recibosRelatorio = new Set();

    for (const entry of relatorio) {
        const { nrRecibo, nome, valor, entrada, entradaStr, obs } = entry;
        recibosRelatorio.add(nrRecibo);

        const lancamentosRazao = razaoByRecibo.get(nrRecibo);

        // Nenhum lançamento no razão em nenhum mês → INCONSISTÊNCIA
        if (!lancamentosRazao || lancamentosRazao.length === 0) {
            resultados.push({
                nrRecibo,
                nome,
                obs,
                valorRelatorio: valor,
                totalDebitoRazao: 0,
                totalCreditoRazao: 0,
                delta: valor,
                mesesEncontrados: [],
                lancamentosRazao: [],
                status: STATUS.INCONSISTENCIA,
                entrada,
                entradaStr,
            });
            continue;
        }

        // Consolidar rateio: soma todos os débitos/créditos deste recibo em todos os meses
        const { totalDebito, totalCredito, mesesEncontrados } = consolidarRazao(lancamentosRazao);

        // Usar o valor do relatório como referência (o que financeiro acha que existe)
        const delta = Math.abs(valor - totalDebito);

        let status;
        if (totalDebito === 0 && totalCredito > 0) {
            // Apenas crédito encontrado, débito deve estar fora da janela carregada
            status = STATUS.INVESTIGAR;
        } else if (delta <= TOLERANCIA) {
            status = STATUS.CONCILIADO;
        } else {
            status = STATUS.INVESTIGAR;
        }

        resultados.push({
            nrRecibo,
            nome,
            obs,
            valorRelatorio: valor,
            totalDebitoRazao: totalDebito,
            totalCreditoRazao: totalCredito,
            delta: valor - totalDebito, // positivo = falta no razão; negativo = sobrando
            mesesEncontrados,
            lancamentosRazao,
            status,
            entrada,
            entradaStr,
        });
    }

    // Detectar SEM_FINANCEIRO: recibos no razão (como débito) sem correspondente no relatório
    for (const [nrRecibo, lancamentos] of razaoByRecibo) {
        if (recibosRelatorio.has(nrRecibo)) continue;

        const debitoTotal = lancamentos.reduce((acc, l) => acc + l.debito, 0);
        if (debitoTotal === 0) continue; // só créditos → competência já tratada

        const primeiro = lancamentos[0];
        resultados.push({
            nrRecibo,
            nome: '',
            obs: primeiro.historico,
            valorRelatorio: 0,
            totalDebitoRazao: debitoTotal,
            totalCreditoRazao: lancamentos.reduce((acc, l) => acc + l.credito, 0),
            delta: -debitoTotal,
            mesesEncontrados: [...new Set(lancamentos.map(l => l.mesFonte))],
            lancamentosRazao: lancamentos,
            status: STATUS.SEM_FINANCEIRO,
            entrada: primeiro.data,
            entradaStr: primeiro.dataStr,
        });
    }

    // Ordenação: INCONSISTENCIA primeiro, depois INVESTIGAR, CONCILIADO, SEM_FINANCEIRO
    const ordemStatus = {
        [STATUS.INCONSISTENCIA]: 0,
        [STATUS.INVESTIGAR]: 1,
        [STATUS.CONCILIADO]: 2,
        [STATUS.SEM_FINANCEIRO]: 3,
    };
    resultados.sort((a, b) => ordemStatus[a.status] - ordemStatus[b.status]);

    // Totalizadores
    // O usuário solicitou que o Total Débitos Razão global reflita APENAS o mês atual
    const totalRelatorio = relatorio.reduce((a, e) => a + e.valor, 0);
    const todosLancamentos = [...razaoByRecibo.values()].flat();
    const totalDebitoRazao = todosLancamentos
        .filter(l => l.mesFonte === 'atual')
        .reduce((a, l) => a + l.debito, 0);

    const diferencaGeral = totalRelatorio - totalDebitoRazao;

    const contadores = {
        conciliados: resultados.filter(r => r.status === STATUS.CONCILIADO).length,
        investigar: resultados.filter(r => r.status === STATUS.INVESTIGAR).length,
        inconsistencias: resultados.filter(r => r.status === STATUS.INCONSISTENCIA).length,
        semFinanceiro: resultados.filter(r => r.status === STATUS.SEM_FINANCEIRO).length,
    };

    return {
        resultados,
        totalRelatorio,
        totalDebitoRazao,
        diferencaGeral,
        contadores,
    };
}
