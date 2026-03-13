/**
 * Motor de Reconciliação SPED EFD × NF-e XML
 *
 * Substitui o relatório C0059 do Sistema MA.
 * Para cada chave NF-e, apresenta o status de presença:
 *   - SPED_SIM_XML_SIM  → ok, base para o cálculo SUV
 *   - SPED_SIM_XML_NAO  → nota escriturada mas sem XML baixado
 *   - SPED_NAO_XML_SIM  → XML existe mas nota não entrou no SPED do período
 *
 * Fonte de verdade: XML (SEFAZ) para CST, orig e valores
 * Tolerância de arredondamento: R$ 0,05
 */

const TOLERANCIA = 0.05;

/**
 * Executa o cruzamento entre os documentos do SPED e os XMLs.
 *
 * @param {Map} spedDocs - Map<chaveNfe, C100Doc> retornado pelo sped-parser
 * @param {NFeDoc[]} xmlDocs - Array de documentos NF-e retornados pelo xml-parser
 * @returns {ReconciledDoc[]}
 */
export function reconciliar(spedDocs, xmlDocs) {
    const xmlMap = new Map(xmlDocs.map((x) => [x.chaveNfe, x]));
    const result = [];

    // 1. Iterar sobre todas as chaves do SPED
    for (const [chave, spedDoc] of spedDocs.entries()) {
        const xmlDoc = xmlMap.get(chave);
        const emXml = Boolean(xmlDoc);

        if (!emXml) {
            result.push({
                chaveNfe: chave,
                numDoc: spedDoc.numDoc,
                dtEntrada: spedDoc.dtEntrada,
                status: 'SPED_SIM_XML_NAO',
                emSped: true,
                emXml: false,
                spedDoc,
                xmlDoc: null,
                itensReconciliados: [],
                divergencias: [],
                elegivel: false,
            });
            continue;
        }

        // 2. Cruzar itens por numItem (posição)
        const itensReconciliados = [];
        const divergencias = [];

        const spedItens = spedDoc.itens || [];
        const xmlItens = xmlDoc.itens || [];

        // Usar o menor dos dois para o cruzamento principal
        const maxItems = Math.max(spedItens.length, xmlItens.length);
        for (let i = 0; i < maxItems; i++) {
            const si = spedItens[i] || null;
            const xi = xmlItens[i] || null;

            const diffVlItem = si && xi ? Math.abs(si.vlItem - xi.vProd) : null;
            const temDivergencia = diffVlItem !== null && diffVlItem > TOLERANCIA;

            if (temDivergencia) {
                divergencias.push({
                    numItem: si?.numItem || String(i + 1),
                    campo: 'VL_ITEM',
                    vlSped: si?.vlItem,
                    vlXml: xi?.vProd,
                    diff: diffVlItem,
                });
            }

            // Verificar CST divergente
            // SPED usa 3 dígitos (ex: "060" = origem 0 + situação 60)
            // XML usa 2 dígitos (ex: "60") — comparar apenas a situação (últimos 2)
            const cstSpedSit = (si?.cstIcms || '').slice(-2);
            const cstXmlSit = (xi?.cst || '');
            const temDivergenciaCST = si && xi && cstSpedSit !== cstXmlSit;
            if (temDivergenciaCST) {
                divergencias.push({
                    numItem: si?.numItem || String(i + 1),
                    campo: 'CST',
                    vlSped: si?.cstIcms,
                    vlXml: xi?.cst,
                    diff: null,
                });
            }

            itensReconciliados.push({
                numItem: si?.numItem || xi?.nItem || String(i + 1),
                // Dados SPED
                sped: si
                    ? { cfop: si.cfop, cstIcms: si.cstIcms, vlItem: si.vlItem, vlDesc: si.vlDesc, vlAbatNt: si.vlAbatNt }
                    : null,
                // Dados XML (fonte de verdade para cst, orig, valores e desoneração)
                xml: xi
                    ? {
                        cfop: xi.cfop, cst: xi.cst, orig: xi.orig,
                        vProd: xi.vProd, vFrete: xi.vFrete, vSeg: xi.vSeg, vDesc: xi.vDesc,
                        vICMSDeson: xi.vICMSDeson,
                    }
                    : null,
                divergente: temDivergencia || temDivergenciaCST,
            });
        }

        result.push({
            chaveNfe: chave,
            numDoc: spedDoc.numDoc,
            dtEntrada: spedDoc.dtEntrada,
            isDevolucao: xmlDoc.isDevolucao,
            refNFe: xmlDoc.refNFe,
            emitUf: xmlDoc.emitUf,
            destUf: xmlDoc.destUf,
            status: 'SPED_SIM_XML_SIM',
            emSped: true,
            emXml: true,
            spedDoc,
            xmlDoc,
            itensReconciliados,
            divergencias,
            elegivel: false, // preenchido depois pelo eligibility-engine
        });
        xmlMap.delete(chave); // marcar XML como processado
    }

    // 3. XMLs que não estão no SPED
    for (const [chave, xmlDoc] of xmlMap.entries()) {
        // Emitente do Amazonas (chave '13') = nota intraestadual — sem subvenção, ignorar
        if (chave.startsWith('13')) continue;

        result.push({
            chaveNfe: chave,
            numDoc: xmlDoc.numDoc,
            dtEntrada: xmlDoc.dhEmi,
            isDevolucao: xmlDoc.isDevolucao,
            refNFe: xmlDoc.refNFe,
            emitUf: xmlDoc.emitUf,
            destUf: xmlDoc.destUf,
            status: 'SPED_NAO_XML_SIM',
            emSped: false,
            emXml: true,
            spedDoc: null,
            xmlDoc,
            itensReconciliados: [],
            divergencias: [],
            elegivel: false,
        });
    }

    return result;
}
