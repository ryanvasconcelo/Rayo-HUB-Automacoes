/**
 * RAYO HUB — Base de Conhecimento Legislativa — Auditor ICMS
 *
 * ── Fontes Permanentes de Consulta ──────────────────────────────────────────
 * [1] Lei Nº 6.108/22 (SEFAZ-AM): Mercadorias sujeitas ao ICMS por Substituição
 *     Tributária no Amazonas — Anexos I a XXVI (585 NCMs mapeados).
 *     https://sistemas.sefaz.am.gov.br/get/Normas.do?metodo=viewDoc&uuidDoc=84be7172-451e-4ca0-802e-1a0303e5f0b2
 *
 * [2] Lei Nº 6.215/23 (SEFAZ-AM): Isenção do ICMS para produtos da Cesta Básica
 *     destinados ao consumo popular no Amazonas (23 categorias).
 *     https://sistemas.sefaz.am.gov.br/get/Normas.do?metodo=viewDoc&uuidDoc=711873af-84a9-4f5a-93d9-e50ee7f947c3
 *
 * [3] Tabela CFOP (Federal/SEFAZ-PE):
 *     https://www.sefaz.pe.gov.br/legislacao/tributaria/documents/legislacao/tabelas/cfop.htm
 *     Regra do 1º dígito:
 *       1 = Entrada estadual (mesmo estado)
 *       2 = Entrada interestadual (outro estado)
 *       3 = Entrada do exterior (importação)
 *       5 = Saída estadual
 *       6 = Saída interestadual
 *       7 = Saída para o exterior (exportação)
 *
 * [4] Tabela de Alíquotas ICMS 2026 (TaxGroup / Econet Editora):
 *     Amazonas: regra geral 20% (LC 19/97, art. 12, I, "b").
 *     Com alíquotas específicas para produtos como armas (25-29%), perfumaria (29%), etc.
 *     https://www.taxgroup.com.br/intelligence/tabela-icms-2026-fique-por-dentro-das-aliquotas-estaduais-atualizadas/
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GUARDRAIL SOP-IA: Arquivo CORE puro — sem imports de UI/React.
 */

// ─── 1. NCMs sob Substituição Tributária no AM (Lei 6.108/22) ────────────────
// Extraídos dos Anexos I-XXVI via pypdf. 585 NCMs oficiais.
// Segmentos cobertos: autopeças, bebidas, cigarros, cimento, combustíveis,
// energia, ferramentas, lâmpadas, materiais de construção/limpeza/elétricos,
// medicamentos, papéis/plásticos/cerâmica/vidros, pneumáticos, alimentos,
// papelaria, perfumaria/higiene, eletrônicos/eletrodomésticos, rações, sorvetes.
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
// 23 categorias isentas de ICMS para consumo popular no AM.
// Importante: quando esses produtos entrarem com CST que indica tributação,
// emitir ALERTA para revisão humana (podem ser isentos de ST).
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

// Prefixos NCM dos produtos da cesta básica (para lookup rápido)
// Ref: categorias da Lei 6.215/23 cruzadas com NCM da tabela TIPI
export const NCM_CESTA_BASICA_PREFIXOS = new Set([
    '0401', '0402', '0403',   // Leite e derivados
    '1006',                 // Arroz
    '1101',                 // Farinha de trigo
    '1102',                 // Farinha de mandioca / fécula
    '1101', '1108',          // Fécula de mandioca
    '1509', '1512',          // Óleos vegetais (soja)
    '1601', '1602',          // Embutidos / conservas de carne
    '1604',                 // Sardinha em conserva
    '1701', '1702',          // Açúcar de cana
    '1902', '1905',          // Massas alimentícias / biscoitos
    '1507', '1512', '2009',   // Óleos e margarinas adjacentes
    '1517',                 // Margarina
    '0713',                 // Feijão
    '2501',                 // Sal de cozinha
    '2309',                 // Composto lácteo
    '2828',                 // Água sanitária (hipoclorito)
    '3401',                 // Sabão em barra / sabonete
    '3402',                 // Detergente líquido
    '3405',                 // Palha de aço
    '3306',                 // Creme dental
    '4818',                 // Papel higiênico
    '9619',                 // Absorventes higiênicos
]);

// ─── 3. Alíquotas Específicas AM (Lei Complementar 19/97 + Convênios) ────────
// Extraído da Tabela ICMS 2026 (TaxGroup/Econet). Regra geral: 20%.
// Alíquotas elevadas para produtos supérfluos/luxo:
export const ALIQUOTA_ESPECIFICA_AM = {
    // Armas e munições: 25% + FPS 2% = 27% efetivo
    '9301': 0.25, '9302': 0.25, '9303': 0.25, '9304': 0.25,
    '9305': 0.25, '9306': 0.25, '9307': 0.25,
    // Joias e joalheria: 25%
    // Embarcações de recreação e lazer: 25%
    '8903': 0.25,
    // Perfumaria e cosméticos: 29% (conforme tabela AM)
    '3301': 0.29, '3302': 0.29, '3303': 0.29, '3304': 0.29,
    '3305': 0.29, '3307': 0.29,
};

// ─── 4. Classificação de UF por Região (Resolução do Senado 22/89) ────────────
// Destino sempre AM (Amazonas). Usado para resolver alíquota interestadual.
export const REGIAO_POR_UF = {
    // Sul/Sudeste → AM: 7%
    SP: 'sul_sudeste', RJ: 'sul_sudeste', MG: 'sul_sudeste', ES: 'sul_sudeste',
    PR: 'sul_sudeste', SC: 'sul_sudeste', RS: 'sul_sudeste', MS: 'sul_sudeste',
    // Norte (exceto AM) → AM: 12%
    AC: 'norte_nordeste', AP: 'norte_nordeste', PA: 'norte_nordeste',
    RO: 'norte_nordeste', RR: 'norte_nordeste', TO: 'norte_nordeste',
    // Nordeste → AM: 12%
    AL: 'norte_nordeste', BA: 'norte_nordeste', CE: 'norte_nordeste',
    MA: 'norte_nordeste', PB: 'norte_nordeste', PE: 'norte_nordeste',
    PI: 'norte_nordeste', RN: 'norte_nordeste', SE: 'norte_nordeste',
    // Centro-Oeste → AM: 12%
    DF: 'norte_nordeste', GO: 'norte_nordeste', MT: 'norte_nordeste',
    // Próprio AM → operação interna
    AM: 'interna',
};

export const ALIQUOTA_POR_REGIAO = {
    interna: 0.20,   // AM→AM: 20% (LC 19/97, art. 12, I, "b")
    norte_nordeste: 0.12,   // Norte/NE/CO → AM: 12%
    sul_sudeste: 0.07,   // Sul/SE → AM: 7%
    importacao: 0.04,   // Importação (CFOP 3xxx): 4%
};

// ─── 5. Tabela Interestadual Completa → Destino AM ────────────────────────────
export const MATRIZ_ALIQUOTA_PARA_AM = {
    SP: 0.07, RJ: 0.07, MG: 0.07, ES: 0.07,
    PR: 0.07, SC: 0.07, RS: 0.07, MS: 0.07,
    AC: 0.12, AP: 0.12, PA: 0.12, RO: 0.12, RR: 0.12, TO: 0.12,
    AL: 0.12, BA: 0.12, CE: 0.12, MA: 0.12, PB: 0.12,
    PE: 0.12, PI: 0.12, RN: 0.12, SE: 0.12,
    DF: 0.12, GO: 0.12, MT: 0.12,
    AM: 0.20,
};

/**
 * Lookup direto por UF de origem para destino AM.
 */
export const getAliquotaInterestadualParaAM = (ufOrigem) => {
    if (!ufOrigem) return null;
    return MATRIZ_ALIQUOTA_PARA_AM[String(ufOrigem).toUpperCase()] ?? null;
};

// ─── 6. Lógica de Alíquota por CFOP (Regra do 1º Dígito) ────────────────────
// Fonte: [3] Tabela CFOP + regras CONFAZ
// 1xxx = Entrada estadual (mesmo estado) → operação interna → 20%
// 2xxx = Entrada interestadual (outro estado) → consulta MATRIZ por UF origem
// 3xxx = Entrada do exterior (importação) → 4%
// 5xxx = Saída estadual → não gera crédito de entrada (não aplicar alíquota)
// 6xxx = Saída interestadual → não gera crédito de entrada
// 7xxx = Saída para exterior → não gera crédito de entrada
/**
 * @param {string|number} cfop - CFOP da linha (ex: '1102', '2102', '3102')
 * @param {string} [ufOrigem]  - UF do emitente. Necessário para CFOP 2xxx.
 * @returns {{ aliquota: number|null, origem: string }} alíquota e descrição da origem
 */
export const resolverAliquota = (cfop, ufOrigem) => {
    const cfopStr = String(cfop).replace(/\D/g, '');
    if (!cfopStr) return { aliquota: null, origem: 'indeterminado' };

    const d1 = cfopStr[0];

    if (d1 === '1') {
        return { aliquota: ALIQUOTA_POR_REGIAO.interna, origem: 'estadual_AM' };
    }

    if (d1 === '2') {
        if (ufOrigem) {
            const aliq = getAliquotaInterestadualParaAM(ufOrigem);
            if (aliq !== null) {
                return { aliquota: aliq, origem: `interestadual_${ufOrigem.toUpperCase()}` };
            }
        }
        // Sem UF → padrão conservador 12% (Norte/Nordeste)
        return { aliquota: ALIQUOTA_POR_REGIAO.norte_nordeste, origem: 'interestadual_UF_desconhecida' };
    }

    if (d1 === '3') {
        return { aliquota: ALIQUOTA_POR_REGIAO.importacao, origem: 'importacao_exterior' };
    }

    // 5xxx, 6xxx, 7xxx = saídas — não aplicar alíquota de crédito de entrada
    if (['5', '6', '7'].includes(d1)) {
        return { aliquota: null, origem: 'saida_nao_gera_credito' };
    }

    return { aliquota: null, origem: 'cfop_nao_reconhecido' };
};

// ─── 7. CFOPs de Operações Especiais (CST → 90, zerar base/alíquota/ICMS) ────
// Fonte: [3] Tabela CFOP + Reunião de Alinhamento
// Exceções que NÃO devem ser zeradas: 1152 (transferência tributável), 1409 (ST creditável)
export const CFOP_OPERACOES_ESPECIAIS = new Set([
    // Uso e Consumo
    '1556', '2556',
    // Comodato (remessa e retorno)
    '1908', '2908', '1909', '2909',
    // Amostra Grátis / Brinde
    '1911', '2911', '5901', '6901', '1901', '2901',
    // Bonificação / Brinde interestadual
    '1910', '2910', '5910', '6910',
    // Outras entradas sem débito
    '1949', '2949',
    // Transferências p/ uso/consumo (não pra revenda)
    '5908', '6908', '5909', '6909',
]);

// CFOPs que definitivamente NÃO devem ser zerados (geram crédito legítimo)
export const CFOP_EXCECOES_CREDITO = new Set([
    '1102', // Compra pra comercialização — compra normal tributável
    '1152', // Transferência tributável (creditável na entrada)
    '1409', // Compra para uso/consumo em regime ST (creditável)
    '2102', // Compra interestadual pra comercialização
    '2152', // Transferência interestadual tributável
    '2409', // Compra interestadual ST
]);

// ─── 8. CFOPs de Exceção Amarela (alerta, não erro crítico) ──────────────────
export const CFOP_EXCECAO_AMARELA = new Set([
    '1556', '2556',  // Uso e consumo
    '1908', '2908',  // Comodato
    '1949', '2949',  // Outras entradas
]);

// ─── 9. CFOPs de Devolução (Erro Vermelho) ────────────────────────────────────
export const CFOP_DEVOLUCAO = new Set([
    '1201', '2201',  // Devolução de venda de produção
    '1202', '2202',  // Devolução de venda de mercadoria para revenda
    '1410', '2410',  // Devolução de compra p/ prestação de serviço
    '1503', '2503',  // Devolução de mercadoria p/ industrialização
]);
