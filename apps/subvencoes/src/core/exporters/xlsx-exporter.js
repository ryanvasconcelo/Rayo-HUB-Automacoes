/**
 * XLSX Exporter — Relatório C0059 Equivalente (Subvenção AM)
 *
 * Gera duas abas:
 *   1. "Detalhamento" — uma linha por item de nota, espelhando o relatório C0059 do sistema MA
 *   2. "Resumo"       — consolidado por nota elegível (base, alíquota, SUV)
 *
 * Usa xlsx-js-style para aplicar formatação (cabeçalho colorido, moeda, etc.)
 */

import * as XLSX from 'xlsx-js-style';

// ── Helpers de formatação de célula ──────────────────────────────────────────

function headerCell(value) {
    return {
        v: value,
        t: 's',
        s: {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
            fill: { patternType: 'solid', fgColor: { rgb: '1F4E79' } },
            alignment: { horizontal: 'center', wrapText: true },
            border: {
                bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
                right:  { style: 'thin', color: { rgb: 'FFFFFF' } },
            },
        },
    };
}

function numCell(value, isHighlight = false) {
    return {
        v: value ?? 0,
        t: 'n',
        s: {
            numFmt: '#,##0.00',
            font: { sz: 9, color: isHighlight ? { rgb: '1F7A3C' } : { rgb: '000000' } },
            font2: { bold: isHighlight },
            alignment: { horizontal: 'right' },
        },
    };
}

function pctCell(value) {
    return {
        v: value ?? 0,
        t: 'n',
        s: {
            numFmt: '0%',
            font: { sz: 9 },
            alignment: { horizontal: 'center' },
        },
    };
}

function strCell(value, opts = {}) {
    return {
        v: String(value ?? ''),
        t: 's',
        s: {
            font: { sz: 9, ...opts.font },
            alignment: { horizontal: opts.align || 'left' },
            fill: opts.fill ? { patternType: 'solid', fgColor: { rgb: opts.fill } } : undefined,
        },
    };
}

function badgeCell(value, ok) {
    return strCell(value, {
        font: { bold: true, color: { rgb: ok ? '1F7A3C' : '9B1C1C' } },
        align: 'center',
    });
}

// ── Aba 1: Detalhamento por item ──────────────────────────────────────────────

const DETAIL_HEADERS = [
    'Chave NF-e', 'Nº Nota', 'Dt. Emissão', 'Dt. Entrada',
    'UF Origem', 'Nº Item', 'Código Item',
    'CFOP SPED', 'CFOP XML', 'CST SPED', 'CST XML', 'Orig SPED', 'Orig XML',
    'vProd XML', 'vFrete XML', 'vSeg XML', 'vDesc XML', 'vICMSDeson XML',
    'Base Calculada', 'Alíquota', 'SUV', 'SUV Acum. Nota',
    'Status Confronto', 'Elegível', 'Motivo Inelegível',
];

function buildDetailRows(docs) {
    const rows = [DETAIL_HEADERS.map(headerCell)];

    for (const doc of docs) {
        if (!doc.itensReconciliados?.length) continue;

        const suvDoc = doc.itensReconciliados
            .filter((i) => i.elegivel)
            .reduce((s, i) => s + (i.suv || 0), 0);

        for (const item of doc.itensReconciliados) {
            rows.push([
                strCell(doc.chaveNfe, { font: { sz: 8 } }),
                strCell(doc.numDoc, { align: 'center' }),
                strCell(doc.xmlDoc?.dhEmi?.substring(0, 10) || ''),
                strCell(doc.dtEntrada),
                strCell(doc.emitUf || '', { align: 'center' }),
                strCell(item.numItem, { align: 'center' }),
                strCell(item.xml?.cProd || item.sped?.codItem || ''),
                strCell(item.sped?.cfop || '', { align: 'center' }),
                strCell(item.xml?.cfop || '', { align: 'center' }),
                badgeCell(item.sped?.cstIcms || '', !(item.sped?.cstIcms && item.xml?.cst && item.sped.cstIcms.slice(-2) !== item.xml.cst)),
                badgeCell(item.xml?.cst || '', !(item.sped?.cstIcms && item.xml?.cst && item.sped.cstIcms.slice(-2) !== item.xml.cst)),
                badgeCell(item.sped?.cstIcms ? item.sped.cstIcms.charAt(0) : '', !(item.sped?.cstIcms && item.xml?.orig && item.sped.cstIcms.charAt(0) !== String(item.xml.orig))),
                badgeCell(item.xml?.orig ?? '', !(item.sped?.cstIcms && item.xml?.orig && item.sped.cstIcms.charAt(0) !== String(item.xml.orig))),
                numCell(item.xml?.vProd),
                numCell(item.xml?.vFrete),
                numCell(item.xml?.vSeg),
                numCell(item.xml?.vDesc),
                numCell(item.xml?.vICMSDeson),
                numCell(item.base),
                pctCell(item.aliquota),
                numCell(item.suv, item.elegivel),
                numCell(suvDoc, item.elegivel),
                strCell(doc.status === 'SPED_SIM_XML_SIM' ? 'SIM/SIM'
                    : doc.status === 'SPED_SIM_XML_NAO' ? 'SIM/NÃO' : 'NÃO/SIM',
                    { align: 'center' }),
                badgeCell(item.elegivel ? 'SIM' : 'NÃO', item.elegivel),
                strCell(item.motivoInelegivel || ''),
            ]);
        }
    }

    return rows;
}

// ── Aba 2: Resumo por nota ────────────────────────────────────────────────────

const SUMMARY_HEADERS = [
    'Chave NF-e', 'Nº Nota', 'Dt. Entrada', 'UF Origem',
    'Qtd Itens', 'Qtd Itens Elegíveis',
    'Base Total', 'Alíquota', 'SUV Nota', 'Devolução?', 'SUV Ajustado',
];

function buildSummaryRows(docs, totalSuv, totalBase, creditoFiscal) {
    const rows = [SUMMARY_HEADERS.map(headerCell)];

    for (const doc of docs) {
        if (!doc.elegivel) continue;

        const itensEl = doc.itensReconciliados?.filter((i) => i.elegivel) || [];
        const baseNota = itensEl.reduce((s, i) => s + (i.base || 0), 0);
        const suvNota  = itensEl.reduce((s, i) => s + (i.suv  || 0), 0);

        rows.push([
            strCell(doc.chaveNfe, { font: { sz: 8 } }),
            strCell(doc.numDoc, { align: 'center' }),
            strCell(doc.dtEntrada),
            strCell(doc.emitUf || '', { align: 'center' }),
            numCell(doc.itensReconciliados?.length || 0),
            numCell(itensEl.length),
            numCell(baseNota),
            pctCell(doc.aliquota),
            numCell(suvNota, true),
            badgeCell(doc.temDevolucao ? 'SIM' : 'NÃO', !doc.temDevolucao),
            numCell(doc.suvAjustado ?? suvNota, true),
        ]);
    }

    // Linha de totais
    rows.push(Array(SUMMARY_HEADERS.length).fill(strCell('')));
    rows.push([
        strCell('TOTAIS', { font: { bold: true }, align: 'right' }),
        ...Array(5).fill(strCell('')),
        numCell(totalBase),
        strCell(''),
        numCell(totalSuv, true),
        strCell(''),
        numCell(totalSuv, true),
    ]);
    rows.push([
        strCell('ECONOMIA TRIBUTÁRIA (34% IRPJ/CSLL)', { font: { bold: true }, align: 'right' }),
        ...Array(7).fill(strCell('')),
        numCell(creditoFiscal, true),
    ]);

    // Legenda de Auditoria
    rows.push(Array(SUMMARY_HEADERS.length).fill(strCell('')));
    rows.push([
        strCell('LEGENDA DA AUDITORIA DE CST (Aba Detalhamento):', { font: { bold: true } }),
    ]);
    rows.push([
        strCell('Fundo Verde: A origem/CST declarada no SPED bate com o XML da Sefaz.', { font: { color: { rgb: '1F7A3C' } } })
    ]);
    rows.push([
        strCell('Fundo Vermelho: O cliente escriturou a origem/CST incorretamente no SPED. O robô ignorou o SPED e utilizou a verdade do XML para o cálculo.', { font: { color: { rgb: '9B1C1C' } } })
    ]);

    return rows;
}

// ── Utilitário: ajusta largura das colunas ────────────────────────────────────

function colWidths(rows, headers) {
    return headers.map((h, ci) => {
        const maxLen = rows.reduce((max, row) => {
            const cell = row[ci];
            const len = cell?.v != null ? String(cell.v).length : 0;
            return Math.max(max, len);
        }, h.length);
        return { wch: Math.min(Math.max(maxLen + 2, 8), 50) };
    });
}

// ── Export principal ──────────────────────────────────────────────────────────

/**
 * Gera e dispara o download do arquivo XLSX do relatório C0059 equivalente.
 *
 * @param {{ docs: ReconciledDoc[], totalSuv: number, totalBase: number,
 *           creditoFiscal: number, meta: object }} result
 */
export function exportarXlsx(result) {
    const { docs, totalSuv, totalBase, creditoFiscal, meta } = result;
    const wb = XLSX.utils.book_new();

    // Aba 1 — Detalhamento
    const detailRows = buildDetailRows(docs);
    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetail['!cols'] = colWidths(detailRows, DETAIL_HEADERS);
    wsDetail['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalhamento');

    // Aba 2 — Resumo
    const summaryRows = buildSummaryRows(docs, totalSuv, totalBase, creditoFiscal);
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = colWidths(summaryRows, SUMMARY_HEADERS);
    wsSummary['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    // Nome do arquivo
    const empresa = (meta?.companyName || 'EMPRESA').replace(/\s+/g, '_').toUpperCase();
    const periodo = meta?.periodoIni
        ? `${meta.periodoIni.substring(4, 6)}-${meta.periodoIni.substring(0, 4)}`
        : 'PERIODO';
    const filename = `SUBVENCAO_${empresa}_${periodo}.xlsx`;

    XLSX.writeFile(wb, filename);
}
