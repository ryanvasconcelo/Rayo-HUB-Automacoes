/**
 * RAYO HUB — Base de Conhecimento Legislativa — Auditor ICMS
 *
 * ── Fontes Legais (ver pasta data/) ─────────────────────────────────────────
 * [1] Decreto AM 6.108/1999 — NCMs sob ST no Amazonas (585 NCMs)
 *     https://sistemas.sefaz.am.gov.br/get/Normas.do?metodo=viewDoc&uuidDoc=84be7172-451e-4ca0-802e-1a0303e5f0b2
 *
 * [2] Lei AM 6.215/2023 — Isenção cesta básica AM
 *     https://sistemas.sefaz.am.gov.br/get/Normas.do?metodo=viewDoc&uuidDoc=711873af-84a9-4f5a-93d9-e50ee7f947c3
 *
 * [3] Lei AM 6.256/2023 — Incorporação de convênios CONFAZ
 *     https://sistemas.sefaz.am.gov.br/get/Normas.do?metodo=viewDoc&uuidDoc=4af262ac-9873-4fd6-a3b9-fa18e443e66e
 *
 * [4] Resolução Senado Nº 22/1989 — Alíquotas interestaduais ICMS
 *     IMPORTANTE: Sul/Sudeste → AM = 12% | Norte/NE/CO → AM = 7%
 *
 * [5] Resolução Senado Nº 13/2012 — Alíquota 4% para importados
 *     Detectado via 1º dígito CST: 1–8 = importado ou conteúdo importação >40%
 *
 * [6] Tabela CFOP — Receita Federal
 *     https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/facilitacao/anexo-ecf-cfop
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GUARDRAIL SOP-IA: Arquivo CORE puro — sem imports de UI/React.
 * Atualização semestral ou a cada alteração legislativa relevante.
 */

import cfopsStData from './data/cfops_st.json';
import aliquotasData from './data/aliquotas_interestaduais.json';
import baseLegalDescricoesData from './data/base_legal_descricoes.json';

// ─── Exportar textos das bases legais ────────────────────────────────────────
export const BASE_LEGAL_DESCRICOES = baseLegalDescricoesData;

// ─── 1. NCMs sob Substituição Tributária no AM (Decreto 6.108/99) ─────────────
// Extraídos dos Anexos I-XXVI. 585 NCMs oficiais.
export const NCM_ST_LEI_6108_22 = new Set([
    "040110", "040120", "04012010", "04012090", "040140", "040150", "04015010",
    "0402", "040210", "04022130", "04022920", "04022930", "0403", "0406", "040690",
    "0901", "0902", "090300", "1000", "11010010", "12119090",
    "1500", "1508", "1509", "1510", "1511", "1513", "1514", "1515", "1516", "151790", "1518",
    "1604", "1605",
    "1701", "170191", "17019900", "1702", "17049090",
    "1806", "18063120", "18063220", "18069000",
    "1901", "19011030", "19019090", "1902", "19042000", "19049000", "190520", "190590",
    "2101", "21011190", "21011200", "210120", "21039011", "21039091", "210500",
    "2106", "210690", "21069010", "21069090",
    "2201", "22011000", "2202", "22021000", "22029100", "22029900", "22030000",
    "2204", "2205", "2206", "2207", "22071010", "22071090", "2208",
    "2309", "2402", "2403",
    "2500", "2522", "2523",
    "271012", "271019", "27101911", "27111100", "27111910", "27112100",
    "2821", "28289011", "28289019", "2936",
    "3000", "3002", "3003", "3004", "3005", "30051010", "300630", "30066000",
    "3204", "32041700", "32050000", "3206", "32061110", "32064100",
    "3208", "3209", "321000", "3212", "32149000",
    "3301", "33030010", "33030020", "33041000", "33042010", "33042090", "33043000",
    "33049100", "33049910", "33049990", "33051000", "33052000", "33059000",
    "33071000", "33072010", "33072090", "33079000",
    "34011190", "34011900", "34012010", "34012090", "34013000", "3402", "34025000", "3403",
    "38089419", "38099190", "38151210", "38151290", "381600", "38245000", "38260000",
    "391000", "3916", "3917", "3918", "39181000", "3919", "391910", "391990",
    "3920", "3921", "3922", "3923", "39233000", "39233090", "39241000", "39249000",
    "39251000", "39252000", "39253000", "392590", "39262000", "39263000", "39264000",
    "392690", "39269040", "39269090",
    "40081100", "4009", "4010", "4011", "40111000", "40114000", "401290", "4013",
    "40141000", "40149090", "40151200", "40151900", "40161010", "40169300", "40169990",
    "4202", "42022210", "42022220", "42022900", "42023900", "42029200", "42029900",
    "45049000",
    "48022090", "480254", "48025499", "480256", "480257", "48025799", "480258",
    "48062000", "48081000", "4809", "48102290", "48119090", "48131000",
    "4814", "4816", "48162000", "4817", "48182000", "48192000", "48194000",
    "48201000", "48202000", "48203000", "48204000", "48205000", "48209000",
    "48211000", "4823", "482320", "48234000", "482390", "49090000", "49111090",
    "56012219", "57032900", "57033900", "57050000",
    "59039000", "59090000", "59100000", "59119000",
    "61159900", "62171000", "63026000", "6306", "63079090",
    "65061000", "65069900",
    "6804", "68101900", "6811", "68129910", "6813",
    "69039099", "6904", "6905", "69060000", "6907", "6910",
    "69111010", "69111090", "69120000",
    "7003", "7004", "7005", "70071100", "70071900", "70072100", "70072900",
    "7008", "7009", "70091000", "7013", "70133700", "70134290", "70140000", "7016",
    "7213", "72142000", "72171090", "72172010", "72172090",
    "7307", "73083000", "73084000", "730890", "73089010", "73089090",
    "7310", "73110000", "7312", "73130000", "7314", "73145000",
    "73151100", "73151210", "731700", "7318", "7320",
    "73211100", "73218100", "73219000", "73229010", "73231000", "7324", "7325", "73259100", "7326",
    "7407", "74111010", "7412", "7415", "74182000",
    "7605", "76071990", "7608", "76090000", "7610", "7614", "76152000", "7616",
    "780600", "80070090",
    "8203", "82032090", "8207", "820740", "820760", "820770",
    "821220", "82141000", "82142000", "821490",
    "8301", "830120", "830160", "830170", "83021000", "83023000", "83024100", "8307", "831000", "8311",
    "8407", "8408", "840820", "8409", "8412", "84123110", "84131900", "841330",
    "84135090", "84136019", "84137010", "84138100", "84139190",
    "8414", "84141000", "84145910", "84145990", "84146000", "841480", "841490", "84149010", "84149039",
    "8415", "841510", "84151011", "84151019", "84151090", "841520", "84159010", "84159020", "84159090",
    "84181000", "84182100", "84182900", "84183000", "84184000", "841850", "841869",
    "84186931", "84186999", "84189900", "841950",
    "8421", "842112", "84211990", "84212100", "84212300", "84212990",
    "84213100", "84213200", "84213990", "84221100", "84229010",
    "84231000", "84241000", "84249090", "84254200", "84254910",
    "84311010", "84314100", "843149", "84339090",
    "844331", "844332", "84501100", "84501200", "84501900", "845020",
    "84512100", "84512990", "84521000", "84672100",
    "8471", "847130", "8481", "84811000", "84818092", "8482", "8483", "8484",
    "85011019", "85013110", "85016100",
    "8504", "85041000", "85043300", "85043400", "85044010", "85044040", "85045000",
    "850520", "850710", "85071010", "850720", "850730",
    "8508", "8509", "85098010", "8510", "8511",
    "851220", "85123000", "851240", "85129000",
    "8516", "85161000", "85163100", "85163200", "85164000", "85165000", "85166000",
    "85167100", "85167200", "851679",
    "8517", "85171100", "85171300", "851714", "85171410", "85171431", "85171830", "85171890",
    "85176251", "85176252", "85176253",
    "8518", "85185000", "8519", "851981", "85219010", "85219090", "8522",
    "852550", "85256010", "852589", "8527", "85272100", "85272900",
    "8528", "85284990", "85285900", "85286200", "852869", "852910",
    "85311090", "853400", "8535", "853530", "8536", "85361000", "85362000", "853650", "8538", "8539",
    "853910", "85395200", "8540", "85437092", "8544", "85442000", "85443000", "8546", "8547",
    "8701", "87021000", "87022000", "87023000", "87024090", "87029000",
    "87032100", "87032210", "87032290", "87032310", "87032390", "87032410", "87032490",
    "87033210", "87033290", "87033310", "87033390",
    "87034000", "87035000", "87036000", "87037000", "87038000",
    "87042110", "87042120", "87042130", "87042190",
    "87043110", "87043120", "87043130", "87043190",
    "87044100", "87045100", "8705", "8707", "8708", "87082999", "8711", "8714", "871690", "87169090",
    "90064000", "900659", "90141000", "9015", "90172000", "901730", "901780", "90179090",
    "901831", "901832", "90189099", "90191000",
    "90251190", "902519", "90251990", "902590", "90259010",
    "902610", "902620", "902690", "90271000", "9029", "9030", "90303321", "903089",
    "90318040", "90321010", "90321090", "90322000", "903289", "90328911",
    "91040000", "910700",
    "94012000", "94019900", "9405", "9406",
    "950430", "95045000", "95059000",
    "9603", "96032900", "96033000", "96138000", "9615", "96161000", "96162000",
]);

// ─── 2. Produtos da Cesta Básica com Isenção (Lei 6.215/23) ──────────────────
export const CESTA_BASICA_ISENTA_AM = [
    'Leite longa vida e leite integral em pó',
    'Enchidos/embutidos de carne, salsicha, salsicha em lata e mortadela (consumo popular)',
    'Óleo de soja refinado',
    'Bolachas cream cracker e água e sal / biscoitos maisena e maria (não recheados)',
    'Conserva de carne bovina, apresuntado e sardinha em conserva (consumo popular)',
    'Arroz não parboilizado (consumo popular)',
    'Açúcar de cana cristal sem aromatizantes ou corantes',
    'Massas alimentícias tipo comum ou sêmola, não cozidas nem recheadas',
    'Margarina',
    'Sabonete em barra',
    'Creme dental',
    'Papel higiênico de folha simples',
    'Farinha de trigo',
    'Feijão comum',
    'Fécula de mandioca (goma de tapioca)',
    'Sal de cozinha, de mesa ou refinado, sem mistura com grãos ou temperos',
    'Composto lácteo',
    'Água Sanitária',
    'Sabão em pó para lavar roupa',
    'Detergente líquido (exceto para lavar roupa)',
    'Esponjas e palhas de aço de uso doméstico',
    'Sabão em barra para limpeza',
    'Absorventes higiênicos femininos',
];

// Prefixos NCM 4 dígitos para lookup rápido
export const NCM_CESTA_BASICA_PREFIXOS = new Set([
    '0401', '0402', '0403',
    '1006',
    '1101', '1102', '1108',
    '1509', '1512', '1517',
    '1601', '1602', '1604',
    '1701', '1702',
    '1902', '1905',
    '0713',
    '2501',
    '2309',
    '2828',
    '3401', '3402', '3405',
    '3306',
    '4818',
    '9619',
]);

// ─── 3. Alíquotas Específicas AM (LC 19/97 + Convênios) ────────────────────
// Produtos supérfluos/luxo com alíquotas elevadas no estado
export const ALIQUOTA_ESPECIFICA_AM = {
    // Armas e munições: 25%
    '9301': 0.25, '9302': 0.25, '9303': 0.25, '9304': 0.25,
    '9305': 0.25, '9306': 0.25, '9307': 0.25,
    // Embarcações de recreação: 25%
    '8903': 0.25,
    // Perfumaria e cosméticos: 29%
    '3301': 0.29, '3302': 0.29, '3303': 0.29, '3304': 0.29,
    '3305': 0.29, '3307': 0.29,
};

// ─── 4. CFOPs da Família ST ────────────────────────────────────────────────
// Fonte: Tabela CFOP Receita Federal / data/cfops_st.json
// R02 (Documento Técnico v1.0): NCM na 6108 → CFOP deve pertencer a esta família
export const CFOP_FAMILIA_ST = new Set(cfopsStData._todos_codigos_set);

// ─── 5. Tabela de Alíquotas Interestaduais (Res. 22/89 + Res. 13/2012) ──────
// CORRIGIDO: Sul/Sudeste → AM = 12%, Norte/NE/CO → AM = 7%
// Fonte: data/aliquotas_interestaduais.json
const _aliqPorUf = aliquotasData.por_uf_origem;

export const MATRIZ_ALIQUOTA_PARA_AM = {
    SP: _aliqPorUf.SP, RJ: _aliqPorUf.RJ, MG: _aliqPorUf.MG, ES: _aliqPorUf.ES,
    PR: _aliqPorUf.PR, SC: _aliqPorUf.SC, RS: _aliqPorUf.RS, MS: _aliqPorUf.MS,
    AC: _aliqPorUf.AC, AP: _aliqPorUf.AP, PA: _aliqPorUf.PA, RO: _aliqPorUf.RO,
    RR: _aliqPorUf.RR, TO: _aliqPorUf.TO,
    AL: _aliqPorUf.AL, BA: _aliqPorUf.BA, CE: _aliqPorUf.CE, MA: _aliqPorUf.MA,
    PB: _aliqPorUf.PB, PE: _aliqPorUf.PE, PI: _aliqPorUf.PI, RN: _aliqPorUf.RN,
    SE: _aliqPorUf.SE, DF: _aliqPorUf.DF, GO: _aliqPorUf.GO, MT: _aliqPorUf.MT,
    AM: _aliqPorUf.AM,
};

// ─── 6. Lookup direto UF → alíquota para AM ────────────────────────────────
export const getAliquotaInterestadualParaAM = (ufOrigem) => {
    if (!ufOrigem) return null;
    return MATRIZ_ALIQUOTA_PARA_AM[String(ufOrigem).toUpperCase()] ?? null;
};

// ─── 7. Resolução de Alíquota com Detecção de Importado ────────────────────
/**
 * Resolve a alíquota correta de ICMS na entrada, considerando:
 *   - CFOP (série 1/2/3 = estadual/interestadual/exterior)
 *   - UF de origem do emitente
 *   - Dígito de origem da mercadoria no CST (0=nacional, 1-8=importado)
 *
 * Regras (Documento Técnico Projecont v1.0, Regra R06):
 *   1. CFOP 1xxx → operação estadual AM → 20%
 *   2. CFOP 2xxx + dígito CST 1-8 (importado) → 4% (Res. 13/2012)
 *   3. CFOP 2xxx + dígito CST 0 (nacional) → tabela por UF (Res. 22/89)
 *   4. CFOP 3xxx → importação direta → 4% (Res. 13/2012)
 *   5. CFOP 5/6/7xxx → saída → null (não gera crédito de entrada)
 *
 * @param {string|number} cfop
 * @param {string} ufOrigem       - UF do emitente (ex: 'SP')
 * @param {string} digitoOrigemCST - 1º dígito do CST ICMS (ex: '0', '2', '8')
 */
export const resolverAliquota = (cfop, ufOrigem, digitoOrigemCST) => {
    const cfopStr = String(cfop).replace(/\D/g, '');
    if (!cfopStr) return { aliquota: null, origem: 'indeterminado', baseLegalRef: null };

    const d1 = cfopStr[0];
    const digitoOrigem = String(digitoOrigemCST || '0');
    const isMercadoriaImportada = ['1','2','3','4','5','6','7','8'].includes(digitoOrigem);

    if (d1 === '1') {
        return {
            aliquota: aliquotasData.interna_am.aliquota,
            origem: 'estadual_AM',
            baseLegalRef: null,
        };
    }

    if (d1 === '2') {
        // Mercadoria importada ou com conteúdo de importação > 40% → 4% (Res. 13/2012)
        if (isMercadoriaImportada) {
            return {
                aliquota: aliquotasData.importados.aliquota,
                origem: `interestadual_importado_${String(ufOrigem || '').toUpperCase()}`,
                baseLegalRef: 'ALIQ_IMPORTADO_4',
            };
        }
        // Mercadoria nacional → tabela Res. 22/89 por UF
        if (ufOrigem) {
            const aliq = getAliquotaInterestadualParaAM(ufOrigem);
            if (aliq !== null) {
                const ufUp = String(ufOrigem).toUpperCase();
                const ref = (aliq === 0.12) ? 'ALIQ_INTERST_12' : 'ALIQ_INTERST_7';
                return { aliquota: aliq, origem: `interestadual_${ufUp}`, baseLegalRef: ref };
            }
        }
        // Sem UF → conservador 12% (Sul/Sudeste mais comum para AM)
        return { aliquota: 0.12, origem: 'interestadual_UF_desconhecida', baseLegalRef: 'ALIQ_INTERST_12' };
    }

    if (d1 === '3') {
        return {
            aliquota: aliquotasData.exterior.aliquota,
            origem: 'importacao_exterior',
            baseLegalRef: 'ALIQ_IMPORTADO_4',
        };
    }

    // 5/6/7xxx = saídas — não aplicar alíquota de crédito de entrada
    if (['5', '6', '7'].includes(d1)) {
        return { aliquota: null, origem: 'saida_nao_gera_credito', baseLegalRef: null };
    }

    return { aliquota: null, origem: 'cfop_nao_reconhecido', baseLegalRef: null };
};

// ─── 8. CFOPs de Operações Especiais (CST → 90, zerar base/alíquota/ICMS) ──
// Fonte: Tabela CFOP + Documento Técnico Projecont v1.0, Regra R04
export const CFOP_OPERACOES_ESPECIAIS = new Set([
    '1556', '2556',  // Uso e consumo
    '1908', '2908', '1909', '2909',  // Comodato
    '1911', '2911', '5901', '6901', '1901', '2901',  // Amostra grátis / brinde
    '1910', '2910', '5910', '6910',  // Bonificação / brinde
    '1949', '2949',  // Outras entradas sem débito
    '5908', '6908', '5909', '6909',  // Transferências uso/consumo
]);

// CFOPs que geram crédito legítimo (NÃO devem ser zerados)
export const CFOP_EXCECOES_CREDITO = new Set([
    '1102', '1152', '1409',
    '2102', '2152', '2409',
]);

// CFOPs de Exceção Amarela (alerta, não erro crítico)
export const CFOP_EXCECAO_AMARELA = new Set([
    '1556', '2556',
    '1908', '2908',
    '1949', '2949',
]);

// CFOPs de Devolução (Erro Vermelho)
export const CFOP_DEVOLUCAO = new Set([
    '1201', '2201',
    '1202', '2202',
    '1410', '2410',
    '1503', '2503',
]);
