/**
 * banco-reconciler.js — Motor de Conciliação Bancária
 *
 * Recebe os lançamentos ATIVOS (pós-netting) de ambas as fontes
 * e realiza o matching Fonte A × Fonte B.
 *
 * Chave de matching (em ordem de prioridade):
 *   1. doc (Fonte A) === nrOrigem (Fonte B)  — correspondência exata por Nr. Doc/Origem
 *
 * Status de saída:
 *   CONCILIADO       — match encontrado, |delta| ≤ R$ 0,05
 *   DIVERGENTE       — match encontrado, mas valores diferem > R$ 0,05
 *   PENDENTE_RAZAO   — existe no Saldo (Fonte B) mas não encontrado no Razão (Fonte A)
 *   PENDENTE_BANCO   — existe no Razão (Fonte A) mas não encontrado no Saldo (Fonte B)
 */

const TOLERANCIA = 0.05;

export const STATUS_BANCO = {
    CONCILIADO: 'CONCILIADO',
    DIVERGENTE: 'DIVERGENTE',
    PENDENTE_RAZAO: 'PENDENTE_RAZAO',
    PENDENTE_BANCO: 'PENDENTE_BANCO',
};

/**
 * Formata número BR
 */
function fmtBR(v) {
    if (typeof v !== 'number') return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Motor principal de conciliação Banco × Razão.
 *
 * @param {RazaoBancoEntry[]} razaoAtivos   — Fonte A pós-netting
 * @param {SaldoContaEntry[]} saldoAtivos   — Fonte B pós-netting
 * @returns {ConciliacaoBancariaResultado}
 */
export function reconcileBanco(razaoAtivos, saldoAtivos) {
    const resultados = [];
    const saldoUsados = new Set(); // índices já casados

    // Indexa Saldo por nrOrigem para O(1) lookup
    const saldoByNrOrigem = new Map();
    saldoAtivos.forEach((l, idx) => {
        if (!saldoByNrOrigem.has(l.nrOrigem)) {
            saldoByNrOrigem.set(l.nrOrigem, []);
        }
        saldoByNrOrigem.get(l.nrOrigem).push({ l, idx });
    });

    // === Fase A: Para cada lançamento do Razão, busca par no Saldo ===
    for (const razao of razaoAtivos) {
        const candidatos = saldoByNrOrigem.get(razao.doc) || [];
        const candidatoNaoUsado = candidatos.find(c => !saldoUsados.has(c.idx));

        if (!candidatoNaoUsado) {
            // Sem par no Saldo → PENDENTE_BANCO
            resultados.push({
                type: 'PENDENTE_BANCO',
                status: STATUS_BANCO.PENDENTE_BANCO,
                // Razão
                razaoDoc: razao.doc,
                razaoNome: razao.nome,
                razaoDetalhes: razao.detalhes,
                razaoDataStr: razao.dataPgtoStr || razao.dataVctoStr,
                razaoDebito: razao.debito,
                razaoCredito: razao.credito,
                razaoValor: razao.valor,
                // Saldo
                saldoNrOrigem: null,
                saldoDetalhes: null,
                saldoDataStr: null,
                saldoDebito: 0,
                saldoCredito: 0,
                saldoCdML: 0,
                saldoContaContrapartida: null,
                // Delta
                delta: razao.valor,
                deltaAbs: Math.abs(razao.valor),
                // Lançamentos raw
                lancamentosRazao: [razao],
                lancamentosSaldo: [],
            });
            continue;
        }

        const { l: saldo, idx } = candidatoNaoUsado;
        saldoUsados.add(idx);

        // Comparar valores: Razão usa debito/credito absolutos; Saldo usa cdML (com sinal)
        // Estratégia: compara o valor líquido de cada lado
        const valorRazao = razao.valor; // débito positivo, crédito negativo
        const valorSaldo = saldo.cdML;  // positivo = entrada, negativo = saída

        const delta = Math.abs(valorRazao - valorSaldo);
        const status = delta <= TOLERANCIA ? STATUS_BANCO.CONCILIADO : STATUS_BANCO.DIVERGENTE;

        resultados.push({
            type: 'MATCHED',
            status,
            // Razão
            razaoDoc: razao.doc,
            razaoNome: razao.nome,
            razaoDetalhes: razao.detalhes,
            razaoDataStr: razao.dataPgtoStr || razao.dataVctoStr,
            razaoDebito: razao.debito,
            razaoCredito: razao.credito,
            razaoValor: valorRazao,
            // Saldo
            saldoNrOrigem: saldo.nrOrigem,
            saldoDetalhes: saldo.detalhes,
            saldoDataStr: saldo.dataStr,
            saldoDebito: saldo.debito,
            saldoCredito: saldo.credito,
            saldoCdML: saldo.cdML,
            saldoContaContrapartida: saldo.contaContrapartida,
            // Delta
            delta: valorRazao - valorSaldo,
            deltaAbs: delta,
            // Lançamentos raw
            lancamentosRazao: [razao],
            lancamentosSaldo: [saldo],
        });
    }

    // === Fase B: Sobras do Saldo sem par no Razão → PENDENTE_RAZAO ===
    saldoAtivos.forEach((saldo, idx) => {
        if (saldoUsados.has(idx)) return;

        resultados.push({
            type: 'PENDENTE_RAZAO',
            status: STATUS_BANCO.PENDENTE_RAZAO,
            // Razão
            razaoDoc: null,
            razaoNome: null,
            razaoDetalhes: null,
            razaoDataStr: null,
            razaoDebito: 0,
            razaoCredito: 0,
            razaoValor: 0,
            // Saldo
            saldoNrOrigem: saldo.nrOrigem,
            saldoDetalhes: saldo.detalhes,
            saldoDataStr: saldo.dataStr,
            saldoDebito: saldo.debito,
            saldoCredito: saldo.credito,
            saldoCdML: saldo.cdML,
            saldoContaContrapartida: saldo.contaContrapartida,
            // Delta
            delta: -saldo.cdML,
            deltaAbs: Math.abs(saldo.cdML),
            // Lançamentos raw
            lancamentosRazao: [],
            lancamentosSaldo: [saldo],
        });
    });

    // === Ordenação: DIVERGENTE > PENDENTE_RAZAO > PENDENTE_BANCO > CONCILIADO ===
    const ordem = {
        [STATUS_BANCO.DIVERGENTE]: 0,
        [STATUS_BANCO.PENDENTE_RAZAO]: 1,
        [STATUS_BANCO.PENDENTE_BANCO]: 2,
        [STATUS_BANCO.CONCILIADO]: 3,
    };
    resultados.sort((a, b) => ordem[a.status] - ordem[b.status]);

    // === Totalizadores ===
    const totalRazao = razaoAtivos.reduce((s, l) => s + l.debito, 0);
    const totalSaldo = saldoAtivos.reduce((s, l) => s + l.debito, 0);

    const contadores = {
        conciliados: resultados.filter(r => r.status === STATUS_BANCO.CONCILIADO).length,
        divergentes: resultados.filter(r => r.status === STATUS_BANCO.DIVERGENTE).length,
        pendentesRazao: resultados.filter(r => r.status === STATUS_BANCO.PENDENTE_RAZAO).length,
        pendentesBanco: resultados.filter(r => r.status === STATUS_BANCO.PENDENTE_BANCO).length,
        total: resultados.length,
    };

    return {
        resultados,
        totalRazao,
        totalSaldo,
        diferencaGeral: totalRazao - totalSaldo,
        contadores,
    };
}
