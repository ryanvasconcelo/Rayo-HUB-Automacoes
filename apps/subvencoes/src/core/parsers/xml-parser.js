/**
 * NF-e XML Parser — NF-e modelo 55 v4.00
 * Extrai dados fiscais por item, incluindo detecção de IBS/CBS (2026, ignorado no cálculo)
 * e origem do produto (para exclusão de importados: orig 1,2,6,7)
 */

/**
 * Extrai o texto de uma tag XML com segurança.
 * Reutilizável para qualquer tag no XML.
 */
function getTag(xml, tag) {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
    return match ? match[1].trim() : '';
}

/**
 * Faz o parse de um único arquivo XML de NF-e.
 * @param {string} xmlContent - Conteúdo do arquivo XML
 * @returns {NFeDoc} Documento estruturado
 */
export function parseNfe(xmlContent) {
    // Chave da NF-e (ID do elemento infNFe, sem o prefixo "NFe")
    const idMatch = xmlContent.match(/Id="NFe(\d{44})"/);
    const chaveNfe = idMatch ? idMatch[1] : '';

    const numDoc = getTag(xmlContent, 'nNF');
    const serie = getTag(xmlContent, 'serie');
    const dhEmi = getTag(xmlContent, 'dhEmi');
    const tpNF = getTag(xmlContent, 'tpNF'); // 0=entrada, 1=saída
    const natOp = getTag(xmlContent, 'natOp');

    // Detectar nota de devolução pela natureza da operação ou finNFe
    const finNFe = getTag(xmlContent, 'finNFe'); // 4 = NF-e de devolução
    const isDevolucao = finNFe === '4' || /devolucao/i.test(natOp);

    // Nota referenciada (para devoluções)
    const nfRefMatch = xmlContent.match(/<refNFe>(\d{44})<\/refNFe>/);
    const refNFe = nfRefMatch ? nfRefMatch[1] : null;

    // Totais da nota
    const vProdTotal = parseFloat(getTag(xmlContent, 'vProd') || '0');
    const vFreteTotal = parseFloat(getTag(xmlContent, 'vFrete') || '0');
    const vDescTotal = parseFloat(getTag(xmlContent, 'vDesc') || '0');
    const vNF = parseFloat(getTag(xmlContent, 'vNF') || '0');

    // Emitente e Destinatário
    const emitUf = getTag(xmlContent.match(/<emit>[\s\S]*?<\/emit>/)?.[0] || '', 'UF');
    const destUf = getTag(xmlContent.match(/<dest>[\s\S]*?<\/dest>/)?.[0] || '', 'UF');
    const emitCnpj = getTag(xmlContent.match(/<emit>[\s\S]*?<\/emit>/)?.[0] || '', 'CNPJ');

    // === ITENS ===
    const itensRaw = xmlContent.match(/<det nItem="\d+">([\s\S]*?)<\/det>/g) || [];
    const itens = itensRaw.map((detXml) => {
        const nItem = (detXml.match(/nItem="(\d+)"/) || [])[1] || '';
        const prodXml = detXml.match(/<prod>([\s\S]*?)<\/prod>/)?.[1] || '';
        const icmsXml = detXml.match(/<ICMS>([\s\S]*?)<\/ICMS>/)?.[1] || '';

        // Campos do produto
        const cProd = getTag(prodXml, 'cProd');
        const xProd = getTag(prodXml, 'xProd');
        const ncm = getTag(prodXml, 'NCM');
        const cfop = getTag(prodXml, 'CFOP');
        const uCom = getTag(prodXml, 'uCom');
        const qCom = parseFloat(getTag(prodXml, 'qCom') || '0');
        const vProd = parseFloat(getTag(prodXml, 'vProd') || '0');
        const vFrete = parseFloat(getTag(prodXml, 'vFrete') || '0');
        const vSeg = parseFloat(getTag(prodXml, 'vSeg') || '0');
        const vDesc = parseFloat(getTag(prodXml, 'vDesc') || '0');
        const vOutro = parseFloat(getTag(prodXml, 'vOutro') || '0');

        // Origem e CST (do bloco ICMS)
        // O campo <orig> é o 1º campo dentro de qualquer ICMSxx
        const origMatch = icmsXml.match(/<orig>(\d)<\/orig>/);
        const orig = origMatch ? origMatch[1] : '0';
        const cstMatch = icmsXml.match(/<CST>(\d+)<\/CST>/);
        const cst = cstMatch ? cstMatch[1] : '';
        const vBcIcms = parseFloat((icmsXml.match(/<vBC>([\d.]+)<\/vBC>/) || [])[1] || '0');
        const pIcms = parseFloat((icmsXml.match(/<pICMS>([\d.]+)<\/pICMS>/) || [])[1] || '0');
        const vIcms = parseFloat((icmsXml.match(/<vICMS>([\d.]+)<\/vICMS>/) || [])[1] || '0');
        // Valor do ICMS desonerado declarado pelo fornecedor — critério do Convênio 65/88
        const vICMSDeson = parseFloat((icmsXml.match(/<vICMSDeson>([\d.]+)<\/vICMSDeson>/) || [])[1] || '0');

        // IBS/CBS — Captura os campos mas os marcamos como "ignorar no cálculo SUV"
        const hasIbsCbs = /<IBSCBS>/.test(detXml);

        return {
            nItem, cProd, xProd, ncm, cfop, uCom, qCom,
            vProd, vFrete, vSeg, vDesc, vOutro,
            orig,       // '0'=nacional, '1'/'2'=importado, '6'/'7'=importado
            cst,        // CST ICMS (2 dígitos da situação tributária)
            vBcIcms, pIcms, vIcms,
            vICMSDeson, // ICMS desonerado declarado pelo fornecedor (Convênio 65/88)
            hasIbsCbs,  // true se nota de 2026 com IBS/CBS (não usar no cálculo)
        };
    });

    return {
        chaveNfe, numDoc, serie, dhEmi, tpNF, natOp,
        isDevolucao, refNFe,
        emitUf, destUf, emitCnpj,
        totais: { vProdTotal, vFreteTotal, vDescTotal, vNF },
        itens,
    };
}

/**
 * Faz o parse de múltiplos XMLs a partir de conteúdo de um ZIP.
 * @param {File[]} xmlFiles - Array de Files com conteúdo de XML
 * @returns {Promise<NFeDoc[]>}
 */
export async function parseNfeBatch(xmlFiles) {
    const results = [];
    for (const file of xmlFiles) {
        const text = await file.text();
        try {
            results.push(parseNfe(text));
        } catch (e) {
            console.warn(`Erro ao parsear XML ${file.name}:`, e.message);
        }
    }
    return results;
}
