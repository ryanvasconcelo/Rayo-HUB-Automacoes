import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Gera PDF de resumo da Auditoria ICMS
 *
 * @param {Array} report - Lista de objetos ({ linha, severidade, motivo, detalhe, cst, esperado, ncm, cfop, etc })
 * @param {Object} companyProfile - { cnpj, razaoSocial, uf, regime, atividade }
 */
export const downloadAuditPdf = (report, companyProfile) => {
    const doc = new jsPDF('landscape', 'pt', 'a4'); // Paisagem para caber colunas
    const pageWidth = doc.internal.pageSize.width;

    // Cabeçalho / Título
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Relatório de Auditoria ICMS - Rayo', 40, 40);

    // Dados da Empresa e Resumo
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    const summaryText = `Empresa UF: ${companyProfile?.uf || 'N/A'} | Regime: ${companyProfile?.regime || 'N/A'} | Atividade: ${companyProfile?.natureza || 'N/A'}
Total de apontamentos: ${report.length} divergências encontradas
Data da Auditoria: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    doc.text(summaryText, 40, 60);

    // Tabela de Apontamentos
    const columns = [
        { header: 'Linha', dataKey: 'linha' },
        { header: 'Severidade', dataKey: 'severidade' },
        { header: 'NCM', dataKey: 'ncm' },
        { header: 'CFOP', dataKey: 'cfop' },
        { header: 'CST Livrão', dataKey: 'cst' },
        { header: 'CST Regra', dataKey: 'esperado' },
        { header: 'Alíquota Aplicada', dataKey: 'aliquotaAplicada' },
        { header: 'ICMS Esperado', dataKey: 'icmsEsperado' },
        { header: 'Motivo', dataKey: 'motivo' },
        { header: 'Correção Aplicada', dataKey: 'correcaoAplicada' }
    ];

    const formatBRL = (num) => typeof num === 'number' ? `R$ ${num.toFixed(2).replace('.', ',')}` : '—';
    const formatPct = (num) => typeof num === 'number' ? `${(num * 100).toFixed(0)}%` : '—';

    const data = report.map(r => ({
        linha: r.linha,
        severidade: r.severidade === 'erro' ? 'Erro (Crítico)' : r.severidade === 'alerta' ? 'Alerta' : 'Aviso',
        ncm: r.ncm,
        cfop: r.cfop || '—',
        cst: r.cst || '—',
        esperado: r.esperado || '—',
        aliquotaAplicada: formatPct(r.aliquotaAplicada),
        icmsEsperado: formatBRL(r.icmsEsperado),
        motivo: r.motivo,
        correcaoAplicada: r.correcaoAplicada ? 'Sim' : 'Não'
    }));

    autoTable(doc, {
        startY: 90,
        columns: columns,
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255 }, // slate-900
        alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            motivo: { cellWidth: 160 },
            aliquotaAplicada: { halign: 'center' },
            icmsEsperado: { halign: 'right' },
            linha: { halign: 'center', cellWidth: 40 },
            severidade: { halign: 'center' },
            correcaoAplicada: { halign: 'center' }
        },
        willDrawCell: function (data) {
            // Pintar células de severidade
            if (data.column.dataKey === 'severidade' && data.section === 'body') {
                if (data.cell.raw === 'Erro (Crítico)') {
                    doc.setTextColor(220, 38, 38);   // red-600
                    doc.setFont(undefined, 'bold');
                } else if (data.cell.raw === 'Alerta') {
                    doc.setTextColor(217, 119, 6);   // amber-600
                    doc.setFont(undefined, 'bold');
                } else {
                    doc.setTextColor(37, 99, 235);   // blue-600
                }
            } else if (data.section === 'body') {
                doc.setTextColor(51, 65, 85); // reset color to slate-700
                doc.setFont(undefined, 'normal');
            }
        },
    });

    const finalY = doc.lastAutoTable.finalY || 90;

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Rayo Hub - Gerado automaticamente', 40, finalY + 30);
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 80, doc.internal.pageSize.height - 30);
    }

    // Salvar arquivo
    doc.save(`Auditoria_ICMS_${new Date().getTime()}.pdf`);
};
