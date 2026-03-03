import XLSXStyle from 'xlsx-js-style';

/**
 * Gera o xlsx corrigido pelo Motor Auditor.
 *
 * v3 — Mudanças:
 *   - Adicionada coluna "Descrição e-Auditoria" ao lado do Nome do Produto
 *
 * @param {Array}  correctedData   - Array de dados corrigido pelo Motor Auditor.
 * @param {string} filename        - Nome do arquivo.
 * @param {Map<number, Set<string>>} modifiedCells - rowIndex → campos modificados.
 */
export const downloadCorrectedAlterdata = (
    correctedData,
    filename = 'Livrão_Auditado_Rayo.xlsx',
    modifiedCells = new Map()
) => {
    if (!correctedData || correctedData.length === 0) return;

    let headersOriginal = Object.keys(correctedData[0]);

    // 1. Achar "Descrição" original para botar a do e-Auditoria depois dela
    // O Livrão Alterdata usa "Nome Produto" (sem "do"). Adicionado como primeira opção.
    const idxDescricaoLivrao = headersOriginal.findIndex(k =>
        ['Nome Produto', 'Descrição', 'Nome do Produto', 'Produto'].includes(k)
    );

    // 2. Achar "CST ICMS" para botar "CST Antigo" antes (ou depois) dela
    const idxCstIcms = headersOriginal.findIndex(k => k === 'CST ICMS');

    const finalHeaders = [];
    headersOriginal.forEach((col, i) => {
        if (col === 'Desc_eAuditoria' || col === 'CST Antigo') return; // Filtramos para reinjetar nos lugares corretos

        // Se este for o CST ICMS, a gente bota o CST Antigo logo ANTES (ou depois, decidi colocar na frente)
        if (i === idxCstIcms) {
            finalHeaders.push('CST Antigo');
        }

        finalHeaders.push(col);

        // Se for a Descrição do Produto, bota a do e-Auditoria logo DEPOIS
        if (i === idxDescricaoLivrao) {
            finalHeaders.push('Desc_eAuditoria');
        }
    });

    // Se por acaso não encontrou onde inserir, bota no fim (não deve acontecer)
    if (!finalHeaders.includes('Desc_eAuditoria') && headersOriginal.includes('Desc_eAuditoria')) {
        finalHeaders.push('Desc_eAuditoria');
    }

    const estiloModificado = {
        fill: { patternType: 'solid', fgColor: { rgb: 'D7F8CD' } }, // Verde muito claro (fundo)
        font: { bold: true, color: { rgb: '006100' } }, // Verde escuro (texto)
        border: {
            top: { style: 'thin', color: { rgb: 'B2D2A4' } },
            bottom: { style: 'thin', color: { rgb: 'B2D2A4' } },
            left: { style: 'thin', color: { rgb: 'B2D2A4' } },
            right: { style: 'thin', color: { rgb: 'B2D2A4' } },
        },
    };

    const wsData = [
        // Cabeçalho modificado (exibindo nome amigável para a nova coluna)
        finalHeaders.map(h => ({
            v: h === 'Desc_eAuditoria' ? 'Descrição e-Auditoria' : h,
            s: {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } },
                alignment: { horizontal: 'center', vertical: 'center' },
            },
        })),
        // Dados garantindo a ordem nova
        ...correctedData.map((row, rowIdx) =>
            finalHeaders.map((col) => {
                const isModified = modifiedCells.has(rowIdx) && modifiedCells.get(rowIdx).has(col);
                const isCstAntigoModificado = col === 'CST Antigo' && row['CST Antigo'] && row['CST Antigo'] !== row['CST ICMS'];
                const cellValue = row[col] ?? '';

                let v = cellValue;
                const isNumericCol = typeof cellValue === 'number' && (col.includes('Base') || col.includes('ICMS') || col.includes('Valor'));

                // Formatação forçada de casas decimais para Base de Cálculo / ICMS / Total
                if (isNumericCol) {
                    v = parseFloat(cellValue.toFixed(2));
                }

                return {
                    v,
                    t: typeof v === 'number' ? 'n' : 's',
                    z: isNumericCol ? '#,##0.00' : undefined, // Garante que traga casas decimais
                    s: (isModified || isCstAntigoModificado) ? estiloModificado : {},
                };
            })
        ),
    ];

    const ws = XLSXStyle.utils.aoa_to_sheet(wsData);

    // Ajuste de largura das colunas
    ws['!cols'] = finalHeaders.map(col => {
        if (col === 'Desc_eAuditoria' || ['Nome Produto', 'Descrição', 'Nome do Produto'].includes(col)) return { wch: 45 };
        return { wch: 22 };
    });

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Entradas Auditadas');
    XLSXStyle.writeFile(wb, filename);
};
