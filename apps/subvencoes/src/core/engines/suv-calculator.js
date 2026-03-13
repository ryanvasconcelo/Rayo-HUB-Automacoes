/**
 * Calculadora SUV — Subvenção para Investimento (ICMS Desonerado)
 * Base legal: Convênio ICMS 65/88 (ZFM) + Lei 14.789/2023
 *
 * Fórmulas confirmadas com Wilson (kickoff 05/03/2026):
 *   Base = vProd + vFrete + vSeg - vDesc   (por item de nota)
 *   SUV  = Base × Alíquota
 *
 * Alíquota determinada em duas etapas (dupla validação):
 *   1. Primários: 2 primeiros dígitos da Chave NF-e → código IBGE do estado emitente
 *      Sul/Sudeste → AM = 7% | demais estados → AM = 12%
 *   2. Sobrescrição por origem do produto (CST ICMS, 1º dígito):
 *      Origem '3' (nacional com conteúdo de importação entre 40% e 70%)
 *      → alíquota fixa de 4% conforme RSF nº 13/2012
 *      (produtos nacionais com alto conteúdo importado seguem a regra de importados)
 *
 * O Convênio 65/88 é sempre o fundamento: qualquer item processado aqui
 * já passou pela elegibilidade (vICMSDeson > 0 obrigatório).
 */

/**
 * Origens de produto que, por RSF 13/2012, recebem alíquota interestadual fixa de 4%
 * mesmo que o produto seja de fabricação nacional.
 * Origem 3 = nacional com conteúdo de importação entre 40% e 70%.
 */
const ORIGENS_ALIQUOTA_4PCT = new Set(['3']);

/**
 * Tabela de alíquotas ICMS interestadual (origem → destino AM)
 * Fonte: tabela pública CONFAZ - regra geral
 * Código de estado: primeiros 2 dígitos da chave NF-e
 */
const ALIQUOTA_TABLE = {
    // Amazonas → Amazonas
    '13': 0.12,
    // Sudeste
    '35': 0.07, // SP
    '31': 0.07, // MG
    '33': 0.07, // RJ
    '32': 0.07, // ES
    // Sul
    '41': 0.07, // PR
    '42': 0.07, // SC
    '43': 0.07, // RS
    // Centro-Oeste
    '50': 0.12, // MS
    '51': 0.12, // MT
    '52': 0.12, // GO
    '53': 0.12, // DF
    // Norte
    '11': 0.12, // RO
    '12': 0.12, // AC
    '14': 0.12, // RR
    '15': 0.12, // PA
    '16': 0.12, // AP
    '17': 0.12, // TO
    // Nordeste
    '21': 0.12, // MA
    '22': 0.12, // PI
    '23': 0.12, // CE
    '24': 0.12, // RN
    '25': 0.12, // PB
    '26': 0.12, // PE
    '27': 0.12, // AL
    '28': 0.12, // SE
    '29': 0.12, // BA
};

/**
 * Determina a alíquota base a partir dos 2 primeiros dígitos da chave NF-e (código IBGE UF).
 * @param {string} chaveNfe - Chave de 44 dígitos
 * @returns {number} alíquota decimal (ex: 0.07)
 */
export function getAliquota(chaveNfe) {
    const ufCode = String(chaveNfe || '').substring(0, 2);
    return ALIQUOTA_TABLE[ufCode] ?? 0.12; // default 12% para UFs não mapeadas
}

/**
 * Dupla validação de alíquota por item:
 *   1. Alíquota base → 2 primeiros dígitos da chave NF-e (UF emitente)
 *   2. Sobrescrição por origem (CST SPED, 1º dígito):
 *      '3' = nacional com conteúdo de importação 40-70% → RSF 13/2012 → 4% fixo
 *
 * @param {string} chaveNfe - Chave de 44 dígitos
 * @param {string} cstSped  - CST ICMS do SPED (3 dígitos, ex: '060', '390', '000')
 * @returns {number} alíquota decimal
 */
export function getAliquotaItem(chaveNfe, cstSped) {
    const origemDigito = String(cstSped || '').charAt(0);
    if (ORIGENS_ALIQUOTA_4PCT.has(origemDigito)) return 0.04;
    return getAliquota(chaveNfe);
}

/**
 * Calcula a Base de Cálculo SUV de um item.
 * Fórmula confirmada no briefing (Convênio 65/88):
 *   Base = Valor Item XML + Frete XML + Seguro XML - Desconto XML
 *
 * @param {{ vProd: number, vFrete: number, vSeg: number, vDesc: number }} item
 * @returns {number}
 */
export function calcBase(item) {
    return (item.vProd || 0) + (item.vFrete || 0) + (item.vSeg || 0) - (item.vDesc || 0);
}

/**
 * Calcula o valor de subvenção de um único item elegível.
 * @param {number} base
 * @param {number} aliquota
 * @returns {number}
 */
export function calcSuv(base, aliquota) {
    return base * aliquota;
}

/**
 * Processa todos os documentos reconciliados e elegíveis,
 * calculando Base e SUV por item e o total por empresa/período.
 *
 * @param {ReconciledDoc[]} docs - Após aplicarElegibilidade()
 * @returns {{ docsCalculados, totalSuv, totalBase, creditoFiscal }}
 */
export function calcularTotalSuv(docs) {
    let totalBase = 0;
    let totalSuv = 0;

    const docsCalculados = docs.map((doc) => {
        if (!doc.elegivel || !doc.emXml) return doc;

        // Alíquota base do documento (UF emitente — usada no resumo e XLSX)
        const aliquotaDoc = getAliquota(doc.chaveNfe);

        const itensCalculados = doc.itensReconciliados.map((item) => {
            if (!item.elegivel || !item.xml) return { ...item, base: 0, suv: 0, aliquota: 0 };

            // Dupla validação: UF base + sobrescrição por origem do produto (CST SPED)
            const aliquotaItem = getAliquotaItem(doc.chaveNfe, item.sped?.cstIcms);
            const base = calcBase(item.xml);
            const suv = calcSuv(base, aliquotaItem);
            totalBase += base;
            totalSuv += suv;

            return { ...item, base, suv, aliquota: aliquotaItem };
        });

        return { ...doc, itensReconciliados: itensCalculados, aliquota: aliquotaDoc };
    });

    // Economia Tributária = 34% do total SUV (IRPJ 25% + CSLL 9%)
    // Alinhado com a metodologia do time fiscal (IRPJ/CSLL sobre subvenção reconhecida)
    const creditoFiscal = totalSuv * 0.34;

    return { docsCalculados, totalSuv, totalBase, creditoFiscal };
}
