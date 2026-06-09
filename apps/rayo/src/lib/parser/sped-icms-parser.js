/**
 * Parser focado na extração de dados do SPED ICMS/IPI para o Auditor ICMS.
 * 
 * Foco nos registros:
 * 0000: Abertura (dados da empresa)
 * 0150: Cadastro de Participantes (para UF do emitente quando possível)
 * 0200: Tabela de Identificação do Item
 * C100: Nota Fiscal (somente entradas, IND_OPER === '0')
 * C170: Itens do Documento (entradas)
 */

export function parseSpedIcms(spedLines) {
  // Inicializamos os dicionários para cruzar dados
  const participantes = new Map(); // COD_PART -> { NOME, COD_MUN, ... }
  const produtos = new Map(); // COD_ITEM -> { DESCR_ITEM, NCM, UNID, ... }
  
  // Notas e Itens
  const notas = new Map(); // CHV_NFE -> { NUM_DOC, DT_DOC, COD_PART, UF_EMITENTE, CHV_NFE, itens: [] }
  const todosItens = [];

  // Mapear COD_MUN para UF seria o ideal, mas inicialmente podemos extrair da chave da NFe.
  // A CHV_NFE (44 dígitos) contém no início (2 primeiros dígitos) o código da UF do IBGE.
  const mapIbgeUf = {
    '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
    '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
    '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
    '41': 'PR', '42': 'SC', '43': 'RS',
    '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
  };

  function getUfFromChave(chave) {
    if (!chave || chave.length !== 44) return null;
    const codIbge = chave.substring(0, 2);
    return mapIbgeUf[codIbge] || null;
  }

  let notaAtual = null;
  let dadosEmpresa = {};

  for (let i = 0; i < spedLines.length; i++) {
    const line = spedLines[i].trim();
    if (!line || !line.startsWith('|')) continue;
    
    const parts = line.split('|');
    const reg = parts[1];

    if (reg === '0000') {
      dadosEmpresa = {
        nome: parts[6],
        cnpj: parts[7],
        cpf: parts[8],
        uf: parts[9],
        ie: parts[10],
        codMun: parts[11]
      };
    }
    else if (reg === '0150') {
      const codPart = parts[2];
      const nome = parts[3];
      const codPais = parts[4];
      const cnpj = parts[5];
      const cpf = parts[6];
      const ie = parts[7];
      const codMun = parts[8];
      const suframa = parts[9];
      const end = parts[10];
      const num = parts[11];
      const compl = parts[12];
      const bairro = parts[13];
      
      participantes.set(codPart, { codPart, nome, cnpj, codMun });
    } 
    else if (reg === '0200') {
      const codItem = parts[2];
      const descrItem = parts[3];
      const codBarra = parts[4];
      const codAntItem = parts[5];
      const unidInv = parts[6];
      const tipoItem = parts[7];
      const codNcm = parts[8];
      const exIpi = parts[9];
      const codGen = parts[10];
      const codLst = parts[11];
      const aliqIcms = parts[12];
      
      produtos.set(codItem, { codItem, descrItem, codBarra, codNcm, unidInv, tipoItem });
    }
    else if (reg === 'C100') {
      const indOper = parts[2];
      const indEmit = parts[3];
      const codPart = parts[4];
      const codMod = parts[5];
      const codSit = parts[6];
      const ser = parts[7];
      const numDoc = parts[8];
      const chvNfe = parts[9];
      const dtDoc = parts[10];
      const dtE_S = parts[11];
      const vlDoc = parts[12];
      
      // Somente ENTRADAS e situação regular/cancelada (normalmente regular para itens)
      if (indOper === '0') {
        const ufEmitente = getUfFromChave(chvNfe);
        
        notaAtual = {
          chvNfe,
          numDoc,
          dtDoc,
          codPart,
          ufEmitente,
          itens: []
        };
        if (chvNfe) {
          notas.set(chvNfe, notaAtual);
        }
      } else {
        notaAtual = null; // ignora as linhas C170 subsequentes
      }
    }
    else if (reg === 'C170' && notaAtual) {
      const numItem = parts[2];
      const codItem = parts[3];
      const descrCompl = parts[4];
      const qtd = parts[5];
      const unid = parts[6];
      const vlItem = parts[7];
      const vlDesc = parts[8];
      const indMov = parts[9];
      const cstIcms = parts[10];
      const cfop = parts[11];
      const codNat = parts[12];
      const vlBcIcms = parseFloat((parts[13] || '0').replace(',', '.'));
      const aliqIcms = parseFloat((parts[14] || '0').replace(',', '.'));
      const vlIcms = parseFloat((parts[15] || '0').replace(',', '.'));
      const vlBcIcmsSt = parseFloat((parts[16] || '0').replace(',', '.'));
      const aliqSt = parseFloat((parts[17] || '0').replace(',', '.'));
      const vlIcmsSt = parseFloat((parts[18] || '0').replace(',', '.'));
      const vlRedBc = parseFloat((parts[19] || '0').replace(',', '.'));
      const vlIpi = parseFloat((parts[20] || '0').replace(',', '.'));
      const vlPis = parseFloat((parts[21] || '0').replace(',', '.'));
      const vlCofins = parseFloat((parts[22] || '0').replace(',', '.'));

      const prod = produtos.get(codItem) || {};

      const itemParsed = {
        // Dados da Nota
        chv_nfe: notaAtual.chvNfe,
        num_doc: notaAtual.numDoc,
        dt_doc: notaAtual.dtDoc,
        uf_emitente: notaAtual.ufEmitente,
        
        // Dados do Item
        num_item: numItem,
        cod_item: codItem,
        descricao_item: prod.descrItem || '',
        ncm: prod.codNcm || '',
        cfop: cfop,
        cst_icms: cstIcms,
        
        // Valores Financeiros
        valor_item: parseFloat((vlItem || '0').replace(',', '.')),
        base_calculo: vlBcIcms,
        aliquota: aliqIcms,
        valor_icms: vlIcms,
        
        // Diagnóstico (será preenchido pelo Auditor)
        diagnostico: []
      };

      notaAtual.itens.push(itemParsed);
      todosItens.push(itemParsed);
    }
  }

  return todosItens;
}
