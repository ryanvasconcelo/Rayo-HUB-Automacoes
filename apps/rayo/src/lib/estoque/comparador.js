/**
 * comparador.js — Motor de Comparação Estoque × Razão
 *
 * STATUS POR CHASSI-MÊS:
 *
 *   CONCILIADO       — Chassi em ambos, valor compatível, ainda ativo no Razão
 *   VALOR_DIVERGENTE — Chassi em ambos mas valor difere (>R$0,05)
 *   SAIDO_NO_RAZAO   — Chassi foi creditado (vendido) no Razão neste mês ou antes,
 *                      mas ainda está no Estoque → causa mais comum de divergência
 *   SEM_ENTRADA      — Chassi creditado no Razão (venda lançada) mas NUNCA debitado
 *                      (compra sem lançamento de entrada). Está no Estoque mas a
 *                      contabilidade só registrou a saída.
 *   SO_ESTOQUE       — Chassi no Estoque sem NENHUM registro no Razão (nem débito
 *                      nem crédito). Moto sem origem contábil.
 *   SO_RAZAO         — Chassi com saldo ativo no Razão (débito sem crédito até o mês)
 *                      mas ausente no Estoque.
 *   TIMING           — Chassi presente no Estoque mas o débito do Razão ocorreu
 *                      DEPOIS do fechamento deste mês → diferença de competência
 *                      (normal em meses anteriores ao de referência do Razão).
 */

export const STATUS_ESTOQUE = {
    CONCILIADO: 'CONCILIADO',
    VALOR_DIVERGENTE: 'VALOR_DIVERGENTE',
    SAIDO_NO_RAZAO: 'SAIDO_NO_RAZAO',
    SEM_ENTRADA: 'SEM_ENTRADA',
    SO_ESTOQUE: 'SO_ESTOQUE',
    SO_RAZAO: 'SO_RAZAO',
    TIMING: 'TIMING',
};

const TOLERANCIA = 0.05;

function valoresBatem(a, b) {
    return Math.abs(a - b) <= TOLERANCIA;
}

/**
 * Verifica se o chassi foi creditado (saiu do estoque) no Razão
 * em data dentro ou antes do fechamento do mês M.
 */
function foiCreditadoAteMes(estado, mes) {
    if (!estado || !estado.mesSaida) return false;
    return estado.mesSaida <= mes;
}

/**
 * Verifica se o débito de entrada no Razão ocorreu DEPOIS do mês M
 * (lançamento retroativo — diferença de competência).
 */
function debitoEntradaDepoisDoMes(estado, mes) {
    if (!estado || !estado.mesEntrada) return false;
    return estado.mesEntrada > mes;
}

/**
 * Compara um mês do Estoque contra o chassiEstado do Razão.
 * @param {object} dadosMes — { mes, mesNome, motos, totalEstoque }
 * @param {Map}    chassiEstado — Map<chassi7, estadoRazao>
 * @param {boolean} mesDeReferencia — true = este é o mês-base do Razão (normalmente Dez)
 */
function compararMes(dadosMes, chassiEstado, mesDeReferencia) {
    const { mes, mesNome, motos, totalEstoque } = dadosMes;
    const detalhesChassi = [];
    const chassisNoEstoque = new Set();

    // ── Passo 1: Cada chassi do Estoque ──────────────────────────────────────
    for (const moto of motos) {
        chassisNoEstoque.add(moto.chassi7);
        const est = chassiEstado.get(moto.chassi7);

        // Nenhum registro no Razão
        if (!est) {
            detalhesChassi.push({
                chassi7: moto.chassi7, chassiCompleto: moto.chassiCompleto,
                valorEstoque: moto.valor, valorRazao: 0, delta: moto.valor,
                status: STATUS_ESTOQUE.SO_ESTOQUE,
                mes, mesNome, lancamentosRazao: [],
            });
            continue;
        }

        const temDebito = est.totalDebito > 0;
        const temCredito = est.totalCredito > 0;

        // Crédito sem débito — venda registrada sem entrada contábil
        if (!temDebito && temCredito) {
            detalhesChassi.push({
                chassi7: moto.chassi7, chassiCompleto: moto.chassiCompleto,
                valorEstoque: moto.valor, valorRazao: 0,
                delta: moto.valor,
                status: STATUS_ESTOQUE.SEM_ENTRADA,
                mes, mesNome,
                mesSaida: est.mesSaida,
                lancamentosRazao: est.lancamentos,
            });
            continue;
        }

        // Débito de entrada ocorreu DEPOIS deste mês (timing)
        if (temDebito && !mesDeReferencia && debitoEntradaDepoisDoMes(est, mes)) {
            detalhesChassi.push({
                chassi7: moto.chassi7, chassiCompleto: moto.chassiCompleto,
                valorEstoque: moto.valor, valorRazao: 0, delta: moto.valor,
                status: STATUS_ESTOQUE.TIMING,
                mes, mesNome,
                mesEntradaRazao: est.mesEntrada,
                lancamentosRazao: est.lancamentos,
            });
            continue;
        }

        // Foi creditado (vendido) no Razão até este mês, mas ainda consta no Estoque
        if (foiCreditadoAteMes(est, mes)) {
            detalhesChassi.push({
                chassi7: moto.chassi7, chassiCompleto: moto.chassiCompleto,
                valorEstoque: moto.valor, valorRazao: est.valorEntrada,
                delta: moto.valor,
                status: STATUS_ESTOQUE.SAIDO_NO_RAZAO,
                mes, mesNome, mesSaida: est.mesSaida,
                lancamentosRazao: est.lancamentos,
            });
            continue;
        }

        // Existe em ambos e está ativo no Razão — compara valor
        const valorRazao = est.valorEntrada;
        const delta = moto.valor - valorRazao;
        detalhesChassi.push({
            chassi7: moto.chassi7, chassiCompleto: moto.chassiCompleto,
            valorEstoque: moto.valor, valorRazao,
            delta: valoresBatem(moto.valor, valorRazao) ? 0 : delta,
            status: valoresBatem(moto.valor, valorRazao)
                ? STATUS_ESTOQUE.CONCILIADO
                : STATUS_ESTOQUE.VALOR_DIVERGENTE,
            mes, mesNome, lancamentosRazao: est.lancamentos,
        });
    }

    // ── Passo 2: Ativos no Razão ausentes no Estoque ─────────────────────────
    for (const [chassi7, est] of chassiEstado.entries()) {
        if (chassisNoEstoque.has(chassi7)) continue;
        if (est.totalDebito === 0) continue;
        if (foiCreditadoAteMes(est, mes)) continue;
        if (!est.mesEntrada || est.mesEntrada > mes) continue;

        detalhesChassi.push({
            chassi7, chassiCompleto: chassi7,
            valorEstoque: 0, valorRazao: est.valorEntrada,
            delta: -est.valorEntrada,
            status: STATUS_ESTOQUE.SO_RAZAO,
            mes, mesNome, lancamentosRazao: est.lancamentos,
        });
    }

    // ── Contadores (excluindo TIMING da divergência real) ────────────────────
    const contadores = {
        conciliados: 0, valorDivergente: 0, saidoNoRazao: 0,
        semEntrada: 0, soEstoque: 0, soRazao: 0, timing: 0,
    };
    for (const d of detalhesChassi) {
        switch (d.status) {
            case STATUS_ESTOQUE.CONCILIADO: contadores.conciliados++; break;
            case STATUS_ESTOQUE.VALOR_DIVERGENTE: contadores.valorDivergente++; break;
            case STATUS_ESTOQUE.SAIDO_NO_RAZAO: contadores.saidoNoRazao++; break;
            case STATUS_ESTOQUE.SEM_ENTRADA: contadores.semEntrada++; break;
            case STATUS_ESTOQUE.SO_ESTOQUE: contadores.soEstoque++; break;
            case STATUS_ESTOQUE.SO_RAZAO: contadores.soRazao++; break;
            case STATUS_ESTOQUE.TIMING: contadores.timing++; break;
        }
    }

    // Divergência real = status problemáticos, excluindo TIMING (esperado)
    const itensProblematicos = [
        STATUS_ESTOQUE.SAIDO_NO_RAZAO, STATUS_ESTOQUE.SEM_ENTRADA,
        STATUS_ESTOQUE.SO_ESTOQUE, STATUS_ESTOQUE.SO_RAZAO, STATUS_ESTOQUE.VALOR_DIVERGENTE,
    ];
    const deltaReal = detalhesChassi
        .filter(d => itensProblematicos.includes(d.status))
        .reduce((s, d) => s + Math.abs(d.delta), 0);

    // O delta financeiro entre os totais
    const totalRazaoAtivo = detalhesChassi
        .filter(d => d.status === STATUS_ESTOQUE.CONCILIADO || d.status === STATUS_ESTOQUE.VALOR_DIVERGENTE)
        .reduce((s, d) => s + (d.valorRazao || 0), 0);
    const delta = totalEstoque - totalRazaoAtivo;

    return {
        mes, mesNome,
        totalEstoque, totalRazaoAtivo, delta,
        deltaReal,
        emDivergencia: Math.abs(delta) > TOLERANCIA,
        temTiming: contadores.timing > 0 && !mesDeReferencia,
        contadores,
        detalhesChassi,
        qtdMotosEstoque: motos.length,
    };
}

/**
 * Ponto de entrada principal.
 * @param {{ meses, abasNaoMapeadas }} estoque
 * @param {{ chassiEstado, saldoFinal, saldoPorMes, contaNome }} razao
 */
export function compararEstoqueRazao(estoque, razao) {
    const { meses, abasNaoMapeadas } = estoque;
    const { chassiEstado, saldoFinal, saldoPorMes, contaNome } = razao;

    // Detecta o mês mais recente no Estoque = mês de referência do Razão
    const ultimoMes = meses.length > 0 ? meses[meses.length - 1].mes : null;

    const resumoMensal = [];
    for (const dadosMes of meses) {
        const mesDeReferencia = dadosMes.mes === ultimoMes;
        const comp = compararMes(dadosMes, chassiEstado, mesDeReferencia);
        const saldoMesRazao = saldoPorMes[dadosMes.mes];
        comp.saldoContabilRazao = saldoMesRazao?.saldo ?? null;
        comp.mesDeReferencia = mesDeReferencia;

        // ── Delta correto: o que o usuário VÊ na tabela ─────────────────────
        // Delta = Total Estoque (coluna) − Total Razão Acum. (coluna)
        // Isso torna o delta consistente com o que está visível na tela.
        if (comp.saldoContabilRazao != null) {
            comp.delta = comp.totalEstoque - comp.saldoContabilRazao;
            // Meses com timing puro (Jan–Nov contra Razão anual) não devem
            // ser marcados como divergência — o saldo acum. reflete o ano todo.
            comp.emDivergencia = !comp.temTiming && Math.abs(comp.delta) > TOLERANCIA;
        }

        resumoMensal.push(comp);
    }

    const totais = resumoMensal.reduce((acc, m) => {
        acc.conciliados += m.contadores.conciliados;
        acc.valorDivergente += m.contadores.valorDivergente;
        acc.soEstoque += m.contadores.soEstoque;
        acc.soRazao += m.contadores.soRazao;
        acc.saidoNoRazao += m.contadores.saidoNoRazao;
        acc.semEntrada += m.contadores.semEntrada;
        acc.timing += m.contadores.timing;
        return acc;
    }, { conciliados: 0, valorDivergente: 0, soEstoque: 0, soRazao: 0, saidoNoRazao: 0, semEntrada: 0, timing: 0 });

    const mesesEmDivergencia = resumoMensal
        .filter(m => m.emDivergencia && !m.temTiming)
        .map(m => m.mes);

    return {
        resumoMensal, totais,
        mesesEmDivergencia,
        primeiraMesDivergencia: mesesEmDivergencia[0] || null,
        ultimoMes,
        saldoFinalRazao: saldoFinal,
        contaNome, abasNaoMapeadas,
    };
}
