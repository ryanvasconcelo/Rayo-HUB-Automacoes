/**
 * parser.js — Parser do Estoque de Motos Novas (.xls)
 *
 * O arquivo de Estoque contém 12 abas (Jan–Dez de 2025).
 * Cada aba lista as motos em estoque naquele mês.
 *
 * Mapeamento de colunas (0-based, pode variar — detectado dinamicamente):
 *   Col D (índice 3) → Chassi completo (ex: "95V6N1G2STM004316")
 *   A última coluna com valor numérico relevante → Valor da moto (R$)
 *
 * Chave de cruzamento: últimos 7 caracteres do chassi.
 */

import * as XLSX from 'xlsx';

/**
 * Nomes canônicos dos meses em português para mapear abas.
 * Aceita variações: jan, janeiro, JAN, JANEIRO, Jan, 1, 01...
 */
const MES_MAP = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
    janeiro: '01', fevereiro: '02', março: '03', abril: '04', maio: '05', junho: '06',
    julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
    '1': '01', '2': '02', '3': '03', '4': '04', '5': '05', '6': '06',
    '7': '07', '8': '08', '9': '09', '10': '10', '11': '11', '12': '12',
    '01': '01', '02': '02', '03': '03', '04': '04', '05': '05', '06': '06',
    '07': '07', '08': '08', '09': '09',
};

const MES_NOMES = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

/**
 * Tenta mapear o nome de uma aba para um mês (MM).
 * @param {string} nomAba
 * @returns {string|null}  '01'...'12' ou null
 */
function abaParaMes(nomAba) {
    const key = nomAba.trim().toLowerCase();
    if (MES_MAP[key]) return MES_MAP[key];
    // Tenta extrair números: "Mês 7", "Sheet7", "Jul/25"
    const numMatch = key.match(/\d+/);
    if (numMatch) {
        const n = String(parseInt(numMatch[0]));
        if (MES_MAP[n]) return MES_MAP[n];
    }
    // Primeiras 3 letras
    const prefix = key.slice(0, 3);
    if (MES_MAP[prefix]) return MES_MAP[prefix];
    return null;
}

/**
 * Tenta encontrar o mês de referência do Inventário BV.
 *
 * Estratégia 1: procura a célula "Estoque Existentes em:" e lê a data na mesma
 * linha (célula vizinha ou próxima). Isso evita falsos positivos com datas de
 * entrada de mercadoria que aparecem nas linhas de dados.
 *
 * Estratégia 2 (fallback): procura DD/MM/YYYY APENAS nas primeiras 8 linhas,
 * antes do início dos dados.
 */
function tentarExtrairMesDaAba(ws) {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Estratégia 1: âncora "Estoque Existentes em:"
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i];
        for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || '').trim().toLowerCase();
            if (cell.includes('estoque existentes em') || cell.includes('posi\u00e7\u00e3o em')) {
                // Lê a data nas células à direita (até 6 colunas)
                for (let dc = 1; dc <= 6; dc++) {
                    const adjacent = String(row[c + dc] || '').trim();
                    const match = adjacent.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/);
                    if (match) {
                        const mesNum = match[2];
                        if (MES_MAP[mesNum]) return MES_MAP[mesNum];
                    }
                }
            }
        }
    }

    // Estratégia 2: scan DD/MM/YYYY apenas nas primeiras 8 linhas (cabeçalho)
    for (let i = 0; i < Math.min(rows.length, 8); i++) {
        const row = rows[i];
        for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || '').trim();
            const match = cell.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
            if (match) {
                const mesNum = match[2];
                if (MES_MAP[mesNum]) return MES_MAP[mesNum];
            }
        }
    }

    return null;
}

/**
 * Extrai os últimos 7 caracteres de um chassi, removendo espaços.
 * @param {string} chassi
 * @returns {string}
 */
export function extrairChave7(chassi) {
    if (!chassi || typeof chassi !== 'string') return '';
    const clean = chassi.replace(/\s/g, '');
    return clean.slice(-7).toUpperCase();
}

/**
 * Detecta a linha de cabeçalho: procura a linha que contém "chassi" ou similar na col D.
 * Retorna o índice da linha de cabeçalho e os índices das colunas relevantes.
 */
function detectarColunas(rows) {
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || '').toLowerCase();
            if (cell.includes('chassi') || cell.includes('chassis')) {
                // Encontrou a coluna de chassi: c
                // Procura coluna de valor: busca "valor", "preço", "custo" ou última coluna numérica
                let colValor = -1;
                for (let cv = c + 1; cv < row.length; cv++) {
                    const h = String(row[cv] || '').toLowerCase();
                    if (h.includes('valor') || h.includes('preço') || h.includes('preco') || h.includes('custo') || h.includes('venda')) {
                        colValor = cv;
                        break;
                    }
                }
                return { headerRow: i, colChassi: c, colValor };
            }
        }
    }
    // Fallback: assume col 3 = chassi (col D)
    return { headerRow: 0, colChassi: 3, colValor: -1 };
}

function detectarColValorNasDados(rows, dataStartRow, colChassi) {
    const sample = rows.slice(dataStartRow, dataStartRow + 15);
    const candidatas = new Map(); // colIdx → count de valores numéricos > 1000

    for (const row of sample) {
        for (let c = colChassi + 1; c < row.length; c++) {
            let v;
            if (typeof row[c] === 'number') {
                v = row[c];
            } else {
                // Tenta parsear string formatada (ex: "21.991,20" ou "21991.20")
                const s = String(row[c] || '').trim();
                v = parseFloat(s.replace(/\./g, '').replace(',', '.'));
                if (isNaN(v)) v = parseFloat(s);
            }
            if (!isNaN(v) && v > 1000 && v < 9999999) {
                candidatas.set(c, (candidatas.get(c) || 0) + 1);
            }
        }
    }

    if (candidatas.size === 0) return -1;
    return [...candidatas.entries()].sort((a, b) => b[1] - a[1])[0][0];
}


/**
 * Parse de uma aba (worksheet) do estoque.
 * @param {object} ws - Worksheet XLSX
 * @param {string} mes - '01'...'12'
 * @returns {EstoqueMes}
 */
function parseAba(ws, mes) {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const { headerRow, colChassi } = detectarColunas(rows);
    const dataStartRow = headerRow + 1;

    // Detecta coluna de valor nos dados reais
    let colValor = detectarColValorNasDados(rows, dataStartRow, colChassi);
    if (colValor === -1) colValor = colChassi + 1; // fallback

    const motos = [];
    for (let i = dataStartRow; i < rows.length; i++) {
        const row = rows[i];
        const chassiRaw = String(row[colChassi] || '').trim();
        if (!chassiRaw || chassiRaw.toLowerCase().includes('total') || chassiRaw.toLowerCase().includes('chassi')) continue;

        // Ignora linhas de totalização (célula de chassi não parece um chassi)
        if (chassiRaw.length < 3) continue;

        const valorRaw = row[colValor];
        const valor = typeof valorRaw === 'number'
            ? valorRaw
            : parseFloat(String(valorRaw || '').replace(/\./g, '').replace(',', '.')) || 0;

        // Ignora linhas com valor 0 ou sem chassi reconhecível
        if (valor <= 0) continue;

        motos.push({
            chassiCompleto: chassiRaw,
            chassi7: extrairChave7(chassiRaw),
            valor,
            mes,
            mesNome: MES_NOMES[mes] || mes,
        });
    }

    return {
        mes,
        mesNome: MES_NOMES[mes] || mes,
        motos,
        totalEstoque: motos.reduce((s, m) => s + m.valor, 0),
        qtdMotos: motos.length,
    };
}

/**
 * Parse completo do arquivo de Estoque.
 * @param {ArrayBuffer} buffer
 * @returns {{ meses: EstoqueMes[], abasNaoMapeadas: string[] }}
 */
export function parseEstoque(buffer) {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
    const meses = [];
    const abasNaoMapeadas = [];

    for (const nomAba of wb.SheetNames) {
        const ws = wb.Sheets[nomAba];
        let mes = abaParaMes(nomAba);
        
        // Se falhou pelo nome da aba (ex: "Sheet1"), tenta procurar datas nas células
        if (!mes) {
            mes = tentarExtrairMesDaAba(ws);
        }

        if (!mes) {
            abasNaoMapeadas.push(nomAba);
            continue;
        }
        const dadosMes = parseAba(ws, mes);
        // Só inclui abas com motos
        if (dadosMes.motos.length > 0) {
            meses.push(dadosMes);
        }
    }

    // Ordena por mês
    meses.sort((a, b) => a.mes.localeCompare(b.mes));

    return { meses, abasNaoMapeadas };
}
