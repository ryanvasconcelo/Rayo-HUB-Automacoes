/**
 * netting-engine.js — Motor de Anulação Interna (Netting)
 *
 * Aplica limpeza nos lançamentos ANTES da conciliação entre fontes,
 * identificando pares que se anulam dentro da mesma fonte.
 *
 * Dois algoritmos de detecção (executados em ordem):
 *
 * 1. ESTORNO EXPLÍCITO (Fase 1 — só Fonte B / Saldo da Conta):
 *    Detecta lançamentos com isEstorno=true e marca o lançamento
 *    correspondente (nrOrigem === origemAnulada) como ANULADO.
 *    O próprio estorno vira ESTORNO (não entra no matching).
 *
 * 2. ANULADO INTERNO (Fase 2 — ambas as fontes):
 *    Detecta pares com mesmo Nº Doc/Origem que possuem movimento
 *    oposto de mesmo valor absoluto (um débito + um crédito iguais).
 *    Ambos são marcados como ANULADO_INTERNO.
 *
 * Retorna:
 *   ativos      — lançamentos que sobrevivem para o matching
 *   anulados    — pares cancelados (para exibição no painel de netting)
 *   estatisticas
 */

/**
 * Aplica netting nos lançamentos do Saldo da Conta (Fonte B).
 * Modifica os objetos in-place (campo status).
 *
 * @param {SaldoContaEntry[]} lancamentos
 * @returns {{ ativos: SaldoContaEntry[], anulados: SaldoContaEntry[], estatisticas }}
 */
export function applyNettingSaldoConta(lancamentos) {
    // === FASE 1: Estornos Explícitos ===
    // Coleta todos os estornos explícitos
    const estornosExplicitos = lancamentos.filter(l => l.isEstorno);

    for (const estorno of estornosExplicitos) {
        // Marca o estorno em si
        estorno.status = 'ESTORNO';

        // Localiza o lançamento original que está sendo anulado
        const origemAnulada = estorno.origemAnulada;
        if (!origemAnulada) continue;

        const original = lancamentos.find(
            l => l.nrOrigem === origemAnulada && l.status === 'ATIVO'
        );
        if (original) {
            original.status = 'ANULADO';
            original.anuladoPor = estorno.seq; // referência cruzada
        }
    }

    // === FASE 2: Pares Déb/Cred Interno (mesmo nrOrigem, valores espelhados) ===
    // Agrupa por nrOrigem
    const porOrigem = new Map();
    for (const l of lancamentos) {
        if (l.status !== 'ATIVO') continue;
        if (!porOrigem.has(l.nrOrigem)) porOrigem.set(l.nrOrigem, []);
        porOrigem.get(l.nrOrigem).push(l);
    }

    for (const [, grupo] of porOrigem) {
        if (grupo.length < 2) continue;

        // Tenta casar pares débito/crédito de mesmo valor absoluto
        const debitos = grupo.filter(l => l.debito > 0 && l.credito === 0);
        const creditos = grupo.filter(l => l.credito > 0 && l.debito === 0);

        for (const deb of debitos) {
            const parceiro = creditos.find(
                c => c.status === 'ATIVO' && Math.abs(c.credito - deb.debito) < 0.01
            );
            if (parceiro) {
                deb.status = 'ANULADO_INTERNO';
                parceiro.status = 'ANULADO_INTERNO';
                deb.anuladoInternoCom = parceiro.seq;
                parceiro.anuladoInternoCom = deb.seq;
            }
        }
    }

    const ativos = lancamentos.filter(l => l.status === 'ATIVO');
    const anulados = lancamentos.filter(l => l.status !== 'ATIVO');

    return {
        ativos,
        anulados,
        estatisticas: {
            total: lancamentos.length,
            ativos: ativos.length,
            anulados: anulados.length,
            estornosExplicitos: lancamentos.filter(l => l.status === 'ANULADO').length,
            anuladosInternos: lancamentos.filter(l => l.status === 'ANULADO_INTERNO').length,
            estornos: lancamentos.filter(l => l.status === 'ESTORNO').length,
        },
    };
}

/**
 * Aplica netting nos lançamentos do Razão (Fonte A).
 * Detecta apenas pares internos (Fase 2) — sem estornos explícitos.
 *
 * @param {RazaoBancoEntry[]} lancamentos
 * @returns {{ ativos: RazaoBancoEntry[], anulados: RazaoBancoEntry[], estatisticas }}
 */
export function applyNettingRazao(lancamentos) {
    // Agrupa por doc
    const porDoc = new Map();
    for (const l of lancamentos) {
        if (!porDoc.has(l.doc)) porDoc.set(l.doc, []);
        porDoc.get(l.doc).push(l);
    }

    for (const [, grupo] of porDoc) {
        if (grupo.length < 2) continue;

        const debitos = grupo.filter(l => l.debito > 0 && l.credito === 0 && l.status === 'ATIVO');
        const creditos = grupo.filter(l => l.credito > 0 && l.debito === 0 && l.status === 'ATIVO');

        for (const deb of debitos) {
            const parceiro = creditos.find(
                c => c.status === 'ATIVO' && Math.abs(c.credito - deb.debito) < 0.01
            );
            if (parceiro) {
                deb.status = 'ANULADO_INTERNO';
                parceiro.status = 'ANULADO_INTERNO';
            }
        }
    }

    const ativos = lancamentos.filter(l => l.status === 'ATIVO');
    const anulados = lancamentos.filter(l => l.status !== 'ATIVO');

    return {
        ativos,
        anulados,
        estatisticas: {
            total: lancamentos.length,
            ativos: ativos.length,
            anulados: anulados.length,
            anuladosInternos: anulados.length,
        },
    };
}
