/**
 * SPED EFD ICMS/IPI Parser — Blocos C100/C170
 * Adaptado do projeto Rayo (parseur EFD-Contribuições) para ICMS/IPI SUV
 *
 * Estrutura dos registros:
 * |C100|IND_OPER|IND_EMIT|COD_PART|COD_MOD|COD_SIT|COD_FIN|NUM_DOC|CHV_NFE|DT_DOC|DT_E_S|VL_DOC|...
 * |C170|NUM_ITEM|COD_ITEM|DESCR_COMPL|QTD|UNID|VL_ITEM|VL_DESC|IND_MOV|CST_ICMS|CFOP|COD_NAT|VL_BC_ICMS|ALIQ_ICMS|VL_ICMS|...
 */

import { parseBRNumber } from '../utils.js';

// === MAPEAMENTO POSICIONAL DOS CAMPOS (índice no array após split('|')) ===

const FIELDS_0000 = { DT_INI: 4, DT_FIN: 5, NOME: 6, CNPJ: 7, UF: 8, IE: 9 };

const FIELDS_C100 = {
    REG: 1, IND_OPER: 2, IND_EMIT: 3, COD_PART: 4, COD_MOD: 5,
    COD_SIT: 6, COD_FIN: 7, NUM_DOC: 8, CHV_NFE: 9,
    DT_DOC: 10, DT_E_S: 11, VL_DOC: 12,
    VL_FRETE: 16, VL_IPI: 18, VL_ICMS_ST: 19, VL_ICMS_ST2: 20,
};

// IND_OPER=0 → entrada; IND_OPER=1 → saída. Para subvenção, só entradas importam.
const IND_OPER_ENTRADA = '0';
// COD_MOD=55 → NF-e eletrônica. Único modelo processado para subvenção.
const COD_MOD_NFE = '55';

const FIELDS_C170 = {
    REG: 1, NUM_ITEM: 2, COD_ITEM: 3, DESCR_COMPL: 4, QTD: 5, UNID: 6,
    VL_ITEM: 7, VL_DESC: 8, IND_MOV: 9,
    CST_ICMS: 10, CFOP: 11, COD_NAT: 12,
    VL_BC_ICMS: 13, ALIQ_ICMS: 14, VL_ICMS: 15,
    // VL_ABAT_NT = valor do ICMS desonerado escriturado no SPED (espelho de vICMSDeson do XML)
    // Posição 35 conforme leiaute EFD ICMS/IPI Bloco C
    VL_ABAT_NT: 35,
};

/**
 * Faz o parse de um arquivo SPED EFD ICMS/IPI completo.
 * @param {string} content - Conteúdo do arquivo TXT
 * @returns {{ meta, documentos, stats }}
 */
export function parseSpedEfd(content) {
    const lines = content.split(/\r?\n/);
    let meta = { companyName: '', cnpj: '', ie: '', uf: '', periodoIni: '', periodoFin: '' };
    const documentos = new Map(); // chave: CHV_NFE → { c100, itens: [] }
    let currentChave = null;
    let countC100 = 0, countC170 = 0;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const f = line.split('|');
        const reg = f[1];

        if (reg === '0000') {
            meta = {
                periodoIni: f[FIELDS_0000.DT_INI] || '',
                periodoFin: f[FIELDS_0000.DT_FIN] || '',
                companyName: f[FIELDS_0000.NOME] || '',
                cnpj: f[FIELDS_0000.CNPJ] || '',
                uf: f[FIELDS_0000.UF] || '',
                ie: f[FIELDS_0000.IE] || '',
            };
        }

        if (reg === 'C100') {
            // Ignorar saídas e modelos que não sejam NF-e 55
            if (f[FIELDS_C100.IND_OPER] !== IND_OPER_ENTRADA || f[FIELDS_C100.COD_MOD] !== COD_MOD_NFE) {
                currentChave = null;
                continue;
            }
            countC100++;
            const chave = (f[FIELDS_C100.CHV_NFE] || '').trim();
            // Sem chave não há como cruzar com XML
            if (!chave) { currentChave = null; continue; }
            // Chave iniciando com '13' = emitente do Amazonas = nota intraestadual
            // Não há subvenção para operações dentro do próprio estado — ignorar
            if (chave.startsWith('13')) { currentChave = null; continue; }

            currentChave = chave;
            const c100 = {
                chaveNfe: chave,
                numDoc: (f[FIELDS_C100.NUM_DOC] || '').trim(),
                codPart: (f[FIELDS_C100.COD_PART] || '').trim(),
                dtDoc: f[FIELDS_C100.DT_DOC] || '',
                dtEntrada: f[FIELDS_C100.DT_E_S] || '',
                vlDoc: parseBRNumber(f[FIELDS_C100.VL_DOC]),
                indOper: f[FIELDS_C100.IND_OPER] || '0', // 0=entrada, 1=saída
                codMod: f[FIELDS_C100.COD_MOD] || '',
                itens: [],
            };
            documentos.set(chave, c100);
        }

        if (reg === 'C170' && currentChave) {
            countC170++;
            const doc = documentos.get(currentChave);
            if (doc) {
                doc.itens.push({
                    numItem: f[FIELDS_C170.NUM_ITEM] || '',
                    codItem: (f[FIELDS_C170.COD_ITEM] || '').trim(),
                    descr: f[FIELDS_C170.DESCR_COMPL] || '',
                    qtd: parseBRNumber(f[FIELDS_C170.QTD]),
                    unid: f[FIELDS_C170.UNID] || '',
                    vlItem: parseBRNumber(f[FIELDS_C170.VL_ITEM]),
                    vlDesc: parseBRNumber(f[FIELDS_C170.VL_DESC]),
                    cstIcms: (f[FIELDS_C170.CST_ICMS] || '').trim(),
                    cfop: (f[FIELDS_C170.CFOP] || '').trim(),
                    vlBcIcms: parseBRNumber(f[FIELDS_C170.VL_BC_ICMS]),
                    aliqIcms: parseBRNumber(f[FIELDS_C170.ALIQ_ICMS]),
                    vlIcms: parseBRNumber(f[FIELDS_C170.VL_ICMS]),
                    // Valor desonerado no SPED — espelho do vICMSDeson do XML (Convênio 65/88)
                    vlAbatNt: parseBRNumber(f[FIELDS_C170.VL_ABAT_NT] || '0'),
                });
            }
        }
    }

    return {
        meta,
        documentos, // Map<chave, C100Doc>
        stats: { totalLines: lines.length, totalC100: countC100, totalC170: countC170 },
    };
}

/**
 * Mescla os resultados de N arquivos SPED (matriz + filiais) em um único consolidado.
 *
 * Regras de merge:
 * - `documentos`: Map unificado — chave NF-e é única, conflitos não ocorrem porque cada
 *   NF-e pertence a apenas um estabelecimento destinatário.
 * - `meta`: usa o nome da empresa do primeiro arquivo; lista todos os CNPJs/IEs envolvidos.
 * - `stats`: soma os contadores individuais.
 *
 * @param {Array<{ meta, documentos: Map, stats }>} resultados
 * @returns {{ meta, documentos: Map, stats, estabelecimentos: object[] }}
 */
export function mergeSpedResults(resultados) {
    if (resultados.length === 0) {
        return {
            meta: { companyName: '', cnpj: '', ie: '', uf: '', periodoIni: '', periodoFin: '' },
            documentos: new Map(),
            stats: { totalLines: 0, totalC100: 0, totalC170: 0 },
            estabelecimentos: [],
        };
    }

    const documentosMerged = new Map();
    let totalLines = 0, totalC100 = 0, totalC170 = 0;
    const estabelecimentos = [];

    for (const r of resultados) {
        for (const [chave, doc] of r.documentos.entries()) {
            documentosMerged.set(chave, doc);
        }
        totalLines += r.stats.totalLines;
        totalC100 += r.stats.totalC100;
        totalC170 += r.stats.totalC170;
        estabelecimentos.push({
            cnpj: r.meta.cnpj,
            ie: r.meta.ie,
            companyName: r.meta.companyName,
            periodoIni: r.meta.periodoIni,
            periodoFin: r.meta.periodoFin,
        });
    }

    const primeira = resultados[0].meta;
    return {
        meta: {
            companyName: primeira.companyName,
            cnpj: estabelecimentos.map((e) => e.cnpj).filter(Boolean).join(' / '),
            ie: estabelecimentos.map((e) => e.ie).filter(Boolean).join(' / '),
            uf: primeira.uf,
            periodoIni: primeira.periodoIni,
            periodoFin: primeira.periodoFin,
        },
        documentos: documentosMerged,
        stats: { totalLines, totalC100, totalC170 },
        estabelecimentos,
    };
}
