/**
 * Parser focado na extração de dados do XML da NF-e para reconciliação com SPED.
 */

export function parseXmlIcms(xmlContent) {
  const itens = [];
  
  if (!xmlContent) return itens;

  // Extrair a chave de acesso
  // Pode estar no atributo Id da infNFe ou na tag chNFe (se for procNFe)
  let chaveNFe = null;
  const matchId = xmlContent.match(/<infNFe[^>]*Id="NFe(\d{44})"/);
  if (matchId) {
    chaveNFe = matchId[1];
  } else {
    const matchChNFe = xmlContent.match(/<chNFe>(\d{44})<\/chNFe>/);
    if (matchChNFe) chaveNFe = matchChNFe[1];
  }

  if (!chaveNFe) return itens; // Sem chave, não dá pra reconciliar

  // Extrair blocos <det nItem="...">
  // Usamos um regex mais permissivo caso tenha quebras de linha
  const detRegex = /<det nItem="(\d+)">([\s\S]*?)<\/det>/g;
  let detMatch;

  while ((detMatch = detRegex.exec(xmlContent)) !== null) {
    const numItem = detMatch[1];
    const detContent = detMatch[2];

    const extractTag = (tag, content = detContent) => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`);
      const m = content.match(regex);
      return m ? m[1].trim() : null;
    };

    const cProd = extractTag('cProd');
    const xProd = extractTag('xProd');
    const ncm = extractTag('NCM');
    const cfop = extractTag('CFOP');
    const vProdStr = extractTag('vProd');
    const vProd = vProdStr ? parseFloat(vProdStr) : 0;

    // Imposto ICMS
    const icmsContent = extractTag('ICMS');
    let origem = null;
    let cst = null;
    let vBC = 0;
    let pICMS = 0;
    let vICMS = 0;

    if (icmsContent) {
      origem = extractTag('orig', icmsContent);
      
      // Tentar pegar CST ou CSOSN
      cst = extractTag('CST', icmsContent) || extractTag('CSOSN', icmsContent);

      const vBCStr = extractTag('vBC', icmsContent);
      if (vBCStr) vBC = parseFloat(vBCStr);

      const pICMSStr = extractTag('pICMS', icmsContent);
      if (pICMSStr) pICMS = parseFloat(pICMSStr);

      const vICMSStr = extractTag('vICMS', icmsContent);
      if (vICMSStr) vICMS = parseFloat(vICMSStr);
      
      // Se tiver ICMS ST, extrair também para diagnóstico futuro?
      // Por enquanto focamos no ICMS próprio/CST
    }

    // Normalizar CST para sempre incluir a origem, similar ao SPED
    let cstOriginal = cst;
    if (cst && origem && cst.length === 2) {
      cstOriginal = origem + cst;
    } else if (cst && cst.length === 3) {
      cstOriginal = cst;
    } else if (cst && origem) { // Ex: CSOSN 102
      cstOriginal = origem + cst; // ex: 0102
    }

    itens.push({
      chave_nfe: chaveNFe,
      num_item: String(parseInt(numItem, 10)), // garantir número sem zeros à esquerda
      cod_item: cProd,
      descricao_item: xProd,
      ncm: ncm,
      cfop: cfop,
      origem: origem,
      cst_icms: cstOriginal,
      base_calculo: vBC,
      aliquota: pICMS,
      valor_icms: vICMS,
      valor_item: vProd
    });
  }

  return itens;
}
