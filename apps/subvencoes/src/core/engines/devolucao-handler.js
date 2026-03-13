/**
 * Handler de Devoluções
 *
 * Notas de devolução (finNFe=4 ou CFOP 1202/1411) devem ter seu valor
 * subtraído do total SUV da nota de origem.
 *
 * Lógica:
 *   1. Identificar notas de devolução pelo refNFe ou pela natureza da operação
 *   2. Encontrar a nota de origem na lista processada
 *   3. Subtrair o valor SUV gerado pela devolução do total
 */

/**
 * Aplica o desconto de devoluções ao resultado calculado.
 * @param {ReconciledDoc[]} docsCalculados
 * @returns {{ docsAjustados, descontoTotalSuv }}
 */
export function aplicarDevolucoes(docsCalculados) {
    let descontoTotalSuv = 0;

    // Mapear notas de devolução com referência
    const devolucoes = docsCalculados.filter(
        (d) => d.isDevolucao && d.emXml && d.xmlDoc?.refNFe
    );

    const docsAjustados = docsCalculados.map((doc) => {
        // Verificar se existe alguma devolução referenciando esta nota
        const devRefs = devolucoes.filter((dev) => dev.xmlDoc.refNFe === doc.chaveNfe);
        if (devRefs.length === 0) return doc;

        // Somar o valor SUV das devoluções desta nota
        let devSuv = 0;
        for (const dev of devRefs) {
            // Calcular SUV da nota de devolução (mesma alíquota da nota original)
            const aliquota = doc.aliquota || 0;
            const totalVProd = dev.xmlDoc?.itens?.reduce((s, i) => s + (i.vProd  || 0), 0) || 0;
            const totalVFrete = dev.xmlDoc?.itens?.reduce((s, i) => s + (i.vFrete || 0), 0) || 0;
            const totalVSeg   = dev.xmlDoc?.itens?.reduce((s, i) => s + (i.vSeg   || 0), 0) || 0;
            const totalVDesc  = dev.xmlDoc?.itens?.reduce((s, i) => s + (i.vDesc  || 0), 0) || 0;
            // Mesma fórmula da calcBase: vProd + vFrete + vSeg - vDesc
            const devBase = totalVProd + totalVFrete + totalVSeg - totalVDesc;
            const devSuvValue = devBase * aliquota;
            devSuv += devSuvValue;
        }

        descontoTotalSuv += devSuv;
        return {
            ...doc,
            devSuv,
            suvAjustado: (doc.totalSuvDoc || 0) - devSuv,
            temDevolucao: true,
        };
    });

    return { docsAjustados, descontoTotalSuv };
}
