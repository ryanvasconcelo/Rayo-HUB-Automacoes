/**
 * Motor de Elegibilidade — Subvenção para Investimento (AM)
 *
 * Regras determinísticas confirmadas no kickoff com Wilson (05/03/2026)
 * e no briefing do Convênio 65/88 / Lei 14.789/23:
 *
 *  1. Confronto SIM/SIM: nota precisa estar no SPED e ter XML (já garantido pela reconciliação)
 *  2. CFOP do SPED inicia com "2" — confirma que é uma entrada interestadual
 *     (fornecedor emite com 6.1xx / 6.4xx; destinatário escritura como 2.1xx / 2.4xx)
 *  3. Origem (orig) do XML ≠ 1, 2, 6, 7 — exclui produtos de origem estrangeira / equiparados
 *  4. vICMSDeson > 0 no XML — valor desonerado declarado pelo fornecedor (Convênio 65/88)
 *  5. Devoluções tratadas separadamente (devolucao-handler); nunca entram aqui
 *
 *  NCM NÃO é utilizado para elegibilidade.
 *  IBS/CBS NÃO entra no cálculo.
 */

/** Origens que EXCLUEM o item (importados ou equiparados a importado) */
const ORIGENS_EXCLUIDAS = new Set(['1', '2', '6', '7']);

/**
 * Verifica se um item de nota é elegível para Subvenção para Investimento.
 *
 * @param {{ cfopSped: string, orig: string, vICMSDeson: number, vlAbatNtSped: number }} item
 * @returns {{ elegivel: boolean, motivo: string | null }}
 */
export function isItemElegivel({ cfopSped, orig, vICMSDeson, vlAbatNtSped = 0 }) {
    // Critério 1: CFOP do SPED deve iniciar com "2" (entrada interestadual)
    if (!String(cfopSped || '').startsWith('2')) {
        return {
            elegivel: false,
            motivo: `CFOP SPED "${cfopSped}" não é entrada interestadual (não inicia com 2)`,
        };
    }

    // Critério 2: produto não pode ser de origem estrangeira ou equiparado
    if (ORIGENS_EXCLUIDAS.has(String(orig))) {
        return {
            elegivel: false,
            motivo: `Origem importada (orig=${orig}) — excluído pelo Convênio 65/88`,
        };
    }

    // Critério 3: ICMS desonerado declarado pelo fornecedor deve ser > 0
    // Fonte primária: vICMSDeson do XML. Fallback: vlAbatNt do SPED (espelho escriturado pelo destinatário)
    const desoneracao = (vICMSDeson || 0) > 0 ? vICMSDeson : (vlAbatNtSped || 0);
    if (desoneracao <= 0) {
        return {
            elegivel: false,
            motivo: 'Sem ICMS desonerado declarado pelo fornecedor (vICMSDeson = 0 e VL_ABAT_NT SPED = 0)',
        };
    }

    return { elegivel: true, motivo: null };
}

/**
 * Aplica o motor de elegibilidade a todos os documentos reconciliados.
 * Preenche `elegivel` e `motivoInelegivel` por item.
 *
 * @param {ReconciledDoc[]} docs
 * @returns {ReconciledDoc[]}
 */
export function aplicarElegibilidade(docs) {
    return docs.map((doc) => {
        // Documentos sem XML ou devoluções não calculam SUV
        if (!doc.emXml || doc.isDevolucao) {
            return { ...doc, elegivel: false };
        }

        const itensAtualizados = doc.itensReconciliados.map((item) => {
            // CFOP elegível vem do SPED (como o cliente escriturou a entrada)
            const cfopSped = item.sped?.cfop || '';
            const orig = item.xml?.orig || '0';
            const vICMSDeson = item.xml?.vICMSDeson || 0;
            // Fallback: VL_ABAT_NT do SPED como evidência de desoneração quando XML não traz vICMSDeson
            const vlAbatNtSped = item.sped?.vlAbatNt || 0;

            const { elegivel, motivo } = isItemElegivel({ cfopSped, orig, vICMSDeson, vlAbatNtSped });
            return { ...item, elegivel, motivoInelegivel: motivo };
        });

        const docElegivel = itensAtualizados.some((i) => i.elegivel);
        return { ...doc, elegivel: docElegivel, itensReconciliados: itensAtualizados };
    });
}
