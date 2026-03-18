/**
 * relatorio-notas-parser.js — Parser do Relatório de Clientes a Receber (Sankhya)
 *
 * Layout confirmado (13 colunas, dados começam na row 3, header na row 2):
 *   Row 0: Metadata (arquivo, data emissão)
 *   Row 1: Metadata (total registros, usuário)
 *   Row 2: Header das colunas
 *   Row 3+: Dados
 *
 *   col[0]  CODPARC         → código do parceiro
 *   col[1]  razaosocial     → nome do cliente
 *   col[2]  VLRFIN          → valor da parcela/financeiro
 *   col[3]  vlrbaixa        → valor já baixado
 *   col[4]  dhbaixa         → data da baixa (vazio = em aberto)
 *   col[5]  NUFIN           → número financeiro único (por parcela)
 *   col[6]  numnota         → NÚMERO DA NOTA ← chave de conciliação
 *   col[7]  CODNAT          → código da natureza
 *   col[8]  DESCRNAT        → descrição natureza
 *   col[9]  DTENTSAI        → data de entrada/saída (serial Excel)
 *   col[10] DTNEG           → data da negociação (serial Excel)
 *   col[11] DTVENC          → data de vencimento (serial Excel)
 *   col[12] CODTIPOPERBAIXA → tipo de período de baixa
 *
 * Normalização chave:
 *   numnota "682.0" → parseInt → "682"  (sem zeros à esquerda)
 *
 * Parcelas:
 *   Uma mesma nota pode ter N linhas (N parcelas), cada uma com seu NUFIN e DTVENC.
 *   O valor total da nota = sum(VLRFIN) de todas as parcelas.
 */

import * as XLSX from 'xlsx';

const EXCEL_EPOCH_OFFSET_DAYS = 25569;

function excelSerialToDate(serial) {
    if (typeof serial !== 'number' || isNaN(serial) || serial < 1) return null;
    const ms = (serial - EXCEL_EPOCH_OFFSET_DAYS) * 86400 * 1000;
    return new Date(ms);
}

function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Normaliza o número da nota: remove zeros à esquerda e descarta ".0" de valores numéricos.
 * "000682" → "682"   |   682 → "682"   |   "682.0" → "682"
 */
export function normalizeNumNota(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = parseInt(String(raw), 10);
    if (isNaN(n) || n <= 0) return null;
    return String(n);
}

/**
 * Parse do Relatório Sankhya (Clientes a Receber XLS)
 * @param {ArrayBuffer} buffer
 * @returns {NotaGroup[]}  → Array de grupos por nota, cada um com suas parcelas
 */
export function parseRelatorioNotas(buffer) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    // Lê como array bruto (sem header automático) para controlar offset
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Encontra a linha de header (contém "numnota" ou "NUFIN")
    let headerIdx = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
        const rowStr = rows[i].map(v => String(v).toLowerCase()).join('|');
        if (rowStr.includes('numnota') || rowStr.includes('nufin')) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) {
        throw new Error('Arquivo de Relatório inválido: coluna "numnota" não encontrada nas primeiras 10 linhas.');
    }

    // Detecta índices das colunas dinamicamente pelo header
    const header = rows[headerIdx].map(v => String(v).toLowerCase().trim());
    const COL = {
        CODPARC:  header.indexOf('codparc'),
        NOME:     header.indexOf('razaosocial'),
        VLRFIN:   header.indexOf('vlrfin'),
        VLRBAIXA: header.indexOf('vlrbaixa'),
        DHBAIXA:  header.indexOf('dhbaixa'),
        NUFIN:    header.indexOf('nufin'),
        NUMNOTA:  header.indexOf('numnota'),
        CODNAT:   header.indexOf('codnat'),
        DESCRNAT: header.indexOf('descrnat'),
        DTENTSAI: header.indexOf('dtentsai'),
        DTNEG:    header.indexOf('dtneg'),
        DTVENC:   header.indexOf('dtvenc'),
    };

    if (COL.NUMNOTA === -1) throw new Error('Coluna "numnota" não encontrada.');
    if (COL.VLRFIN === -1) throw new Error('Coluna "vlrfin" não encontrada.');

    // Agrupa por numeroNota
    const mapaNotas = new Map(); // numeroNota → NotaGroup

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(v => v === '' || v === null || v === undefined)) continue;

        const numNotaRaw = row[COL.NUMNOTA];
        const numeroNota = normalizeNumNota(numNotaRaw);
        if (!numeroNota) continue;

        const vlrfin = typeof row[COL.VLRFIN] === 'number' ? row[COL.VLRFIN] : parseFloat(row[COL.VLRFIN]) || 0;
        const vlrbaixa = typeof row[COL.VLRBAIXA] === 'number' ? row[COL.VLRBAIXA] : parseFloat(row[COL.VLRBAIXA]) || 0;
        const nufin = COL.NUFIN >= 0 ? String(parseInt(row[COL.NUFIN]) || '').trim() : '';
        const dhbaixa = COL.DHBAIXA >= 0 ? String(row[COL.DHBAIXA] || '').trim() : '';
        const dtVencDate = COL.DTVENC >= 0 ? excelSerialToDate(row[COL.DTVENC]) : null;

        const parcela = {
            nufin,
            vlrfin,
            vlrbaixa,
            dhbaixa,
            quitado: vlrbaixa >= vlrfin && vlrfin > 0,
            dtVencStr: formatDate(dtVencDate),
        };

        if (!mapaNotas.has(numeroNota)) {
            const nome = COL.NOME >= 0 ? String(row[COL.NOME] || '').trim() : '';
            const codparc = COL.CODPARC >= 0 ? String(parseInt(row[COL.CODPARC]) || '').trim() : '';
            const descrnat = COL.DESCRNAT >= 0 ? String(row[COL.DESCRNAT] || '').trim() : '';
            mapaNotas.set(numeroNota, {
                numeroNota,
                nome,
                codparc,
                descrnat,
                parcelas: [],
                totalVlrFin: 0,
                totalVlrBaixa: 0,
            });
        }

        const grupo = mapaNotas.get(numeroNota);
        grupo.parcelas.push(parcela);
        grupo.totalVlrFin += vlrfin;
        grupo.totalVlrBaixa += vlrbaixa;
    }

    return Array.from(mapaNotas.values());
}
