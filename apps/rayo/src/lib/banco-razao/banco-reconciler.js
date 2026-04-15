/**
 * banco-reconciler.js — Motor de Conciliação Bancária Universal
 */

const TOLERANCIA = 0.05;

export const STATUS_BANCO = {
    CONCILIADO: 'CONCILIADO',
    DIVERGENTE: 'DIVERGENTE',
    PENDENTE_RAZAO: 'PENDENTE_RAZAO',
    PENDENTE_BANCO: 'PENDENTE_BANCO',
};

/**
 * Normaliza uma chave de documento para matching (remover espaços, zeros à esquerda, etc.)
 */
function normalizeKey(key) {
    if (!key) return '';
    return String(key).trim().replace(/^0+/, '');
}

export function reconcileBanco(razaoAtivos, saldoAtivos) {
    const resultados = [];
    const saldoUsados = new Set();

    // Indexa Saldo por múltiplas chaves (Origem e Transação)
    const saldoByOrigem = new Map();
    const saldoByTransacao = new Map();

    saldoAtivos.forEach((l, idx) => {
        const keyOrigem = normalizeKey(l.nrOrigem);
        const keyTrans = normalizeKey(l.nrTransacao);

        if (keyOrigem) {
            if (!saldoByOrigem.has(keyOrigem)) saldoByOrigem.set(keyOrigem, []);
            saldoByOrigem.get(keyOrigem).push({ l, idx });
        }
        if (keyTrans) {
            if (!saldoByTransacao.has(keyTrans)) saldoByTransacao.set(keyTrans, []);
            saldoByTransacao.get(keyTrans).push({ l, idx });
        }
    });

    // === Fase A: Matching do Razão p/ Saldo ===
    for (const razao of razaoAtivos) {
        const keyRazao = normalizeKey(razao.doc);
        const keyTransRazao = normalizeKey(razao.transacao);

        // Tenta match por Doc -> Origem
        let candidatos = saldoByOrigem.get(keyRazao) || [];
        
        // Tenta match por Doc -> Transação (Caso o cliente peça ou layout mude)
        if (candidatos.length === 0) {
            candidatos = saldoByTransacao.get(keyRazao) || [];
        }

        // Se o Razão tem Transação explícita, tenta match por Transação -> Transação
        if (candidatos.length === 0 && keyTransRazao) {
            candidatos = saldoByTransacao.get(keyTransRazao) || [];
        }

        const candidatoNaoUsado = candidatos.find(c => !saldoUsados.has(c.idx));

        if (!candidatoNaoUsado) {
            resultados.push({
                type: 'PENDENTE_BANCO',
                status: STATUS_BANCO.PENDENTE_BANCO,
                razaoDoc: razao.doc,
                razaoNome: razao.nome,
                razaoDetalhes: razao.detalhes,
                razaoDataStr: razao.dataPgtoStr,
                razaoDebito: razao.debito,
                razaoCredito: razao.credito,
                razaoValor: razao.valor,
                saldoNrOrigem: null,
                saldoDetalhes: null,
                saldoDataStr: null,
                saldoDebito: 0,
                saldoCredito: 0,
                saldoCdML: 0,
                saldoContaContrapartida: null,
                delta: razao.valor,
                deltaAbs: Math.abs(razao.valor),
                lancamentosRazao: [razao],
                lancamentosSaldo: [],
            });
            continue;
        }

        const { l: saldo, idx } = candidatoNaoUsado;
        saldoUsados.add(idx);

        const valorRazao = razao.valor;
        const valorSaldo = saldo.cdML;

        const delta = Math.abs(valorRazao - valorSaldo);
        const status = delta <= TOLERANCIA ? STATUS_BANCO.CONCILIADO : STATUS_BANCO.DIVERGENTE;

        resultados.push({
            type: 'MATCHED',
            status,
            razaoDoc: razao.doc,
            razaoNome: razao.nome,
            razaoDetalhes: razao.detalhes,
            razaoDataStr: razao.dataPgtoStr,
            razaoDebito: razao.debito,
            razaoCredito: razao.credito,
            razaoValor: valorRazao,
            saldoNrOrigem: saldo.nrOrigem,
            saldoDetalhes: saldo.detalhes,
            saldoDataStr: saldo.dataStr,
            saldoDebito: saldo.debito,
            saldoCredito: saldo.credito,
            saldoCdML: saldo.cdML,
            saldoContaContrapartida: saldo.contaContrapartida,
            delta: valorRazao - valorSaldo,
            deltaAbs: delta,
            lancamentosRazao: [razao],
            lancamentosSaldo: [saldo],
        });
    }

    // === Fase B: Sobras do Saldo ===
    saldoAtivos.forEach((saldo, idx) => {
        if (saldoUsados.has(idx)) return;

        // Suporte a schemas invertidos: se o item veio de parseSaldoConta mas foi convertido
        // para schema do Razão, ele pode ter .doc em vez de .nrOrigem
        const nrOrigem = saldo.nrOrigem || saldo.doc || null;
        const cdML = typeof saldo.cdML === 'number' ? saldo.cdML : (saldo.debito > 0 ? saldo.debito : -(saldo.credito || 0));

        resultados.push({
            type: 'PENDENTE_RAZAO',
            status: STATUS_BANCO.PENDENTE_RAZAO,
            razaoDoc: null,
            razaoNome: null,
            razaoDetalhes: null,
            razaoDataStr: null,
            razaoDebito: 0,
            razaoCredito: 0,
            razaoValor: 0,
            saldoNrOrigem: nrOrigem,
            saldoDetalhes: saldo.detalhes || saldo.nome || null,
            saldoDataStr: saldo.dataStr || saldo.dataPgtoStr || null,
            saldoDebito: saldo.debito || 0,
            saldoCredito: saldo.credito || 0,
            saldoCdML: cdML,
            saldoContaContrapartida: saldo.contaContrapartida || saldo.detalhes || null,
            delta: -cdML,
            deltaAbs: Math.abs(cdML),
            lancamentosRazao: [],
            lancamentosSaldo: [saldo],
        });
    });

    const ordem = {
        [STATUS_BANCO.DIVERGENTE]: 0,
        [STATUS_BANCO.PENDENTE_RAZAO]: 1,
        [STATUS_BANCO.PENDENTE_BANCO]: 2,
        [STATUS_BANCO.CONCILIADO]: 3,
    };
    resultados.sort((a, b) => (ordem[a.status] ?? 99) - (ordem[b.status] ?? 99));

    const totalRazao = razaoAtivos.reduce((s, l) => s + Math.abs(l.debito || l.credito), 0);
    const totalSaldo = saldoAtivos.reduce((s, l) => s + Math.abs(l.debito || l.credito), 0);

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
