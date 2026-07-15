import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (valCents) => {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valCents / 100);
};

/**
 * Gera o relatório em PDF de provisões por empregado no formato Folha de Pagamento.
 * @param {object[]} provisionRows - Linhas de provisão geradas pelo provision-calculator.js
 * @param {object} metadata - Metadados da rodada (empresa, competência, etc)
 */
export function generateProvisionsReport(provisionRows, metadata) {
  // 1. Agrupar por empregado
  const employeesMap = new Map();

  for (const row of provisionRows) {
    if (!row.employeeId) continue;

    const empKey = row.employeeId;
    if (!employeesMap.has(empKey)) {
      employeesMap.set(empKey, {
        employeeId: row.employeeId,
        employeeName: row.employeeName || 'NOME NÃO INFORMADO',
        lotacaoCode: row.lotacaoCode,
        lotacaoName: row.lotacaoName,
        events: [],
        baseFgts: 0,
        totalProventos: 0
      });
    }

    const emp = employeesMap.get(empKey);
    emp.events.push(row);
    emp.totalProventos += row.amountCents;

    // Extrair a BC-FGTS da sourceReference ("BC-FGTS: 123456")
    if (row.sourceReference && row.sourceReference.startsWith('BC-FGTS:')) {
      const baseVal = parseInt(row.sourceReference.replace('BC-FGTS: ', '').trim(), 10);
      if (!isNaN(baseVal)) {
        emp.baseFgts = baseVal; // Will be the same for all events of this employee
      }
    }
  }

  const employees = Array.from(employeesMap.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  // 2. Criar Documento PDF
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const drawHeader = (doc, data) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Provisões (relatório Rayo)', 40, 40);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pág. ${doc.internal.getNumberOfPages()} de {totalPages}`, pageWidth - 100, 40);

    doc.text(`Licenciado para: PROJECONT CONTABILIDADE E SERVICOS ADMINISTRATIVO LTDA`, 40, 55);
    doc.text(`Empresa: ${metadata?.empresa || 'BRAGA VEÍCULOS'}`, 40, 68);

    const compRaw = metadata?.competencia || 'Mês Atual';
    let compFormatted = compRaw;
    if (compRaw.includes('-')) {
      const [y, m] = compRaw.split('-');
      compFormatted = `${m}/${y}`;
    }

    doc.text(`Mês/Ano: ${compFormatted}`, 40, 81);

    const today = new Date().toLocaleDateString('pt-BR');
    doc.text(`Emissão: ${today}`, 40, 94);
  };

  let firstPage = true;

  // 3. Agrupar por Lotação
  const employeesByLotacao = new Map();
  for (const emp of employees) {
    if (!employeesByLotacao.has(emp.lotacaoCode)) {
      employeesByLotacao.set(emp.lotacaoCode, {
        lotacaoCode: emp.lotacaoCode,
        lotacaoName: emp.lotacaoName,
        employees: []
      });
    }
    employeesByLotacao.get(emp.lotacaoCode).employees.push(emp);
  }
  const lotacoes = Array.from(employeesByLotacao.values()).sort((a, b) => a.lotacaoCode.localeCompare(b.lotacaoCode));

  // 4. Montar a tabela principal
  const tableBody = [];

  for (const lot of lotacoes) {
    tableBody.push([
      { content: `Lotação: ${lot.lotacaoCode} - ${lot.lotacaoName}`, colSpan: 7, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'left', textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4 } } }
    ]);

    for (const emp of lot.employees) {
      tableBody.push([
        { content: emp.employeeId, colSpan: 1, styles: { fontStyle: 'bold', halign: 'left' } },
        { content: emp.employeeName, colSpan: 6, styles: { fontStyle: 'bold', halign: 'left' } }
      ]);

      for (const evt of emp.events) {
        tableBody.push([
          '',
          '',
          evt.eventName,
          '',
          '',
          formatCurrency(evt.amountCents),
          ''
        ]);
      }

      tableBody.push([
        { content: '', colSpan: 4 },
        { content: `Totais:`, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(emp.totalProventos), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: '0,00', styles: { fontStyle: 'bold', halign: 'right' } }
      ]);

      tableBody.push([
        { content: `Base FGTS Calculada: ${formatCurrency(emp.baseFgts)}`, colSpan: 7, styles: { fontSize: 8, textColor: [80, 80, 80], cellPadding: { top: 2, bottom: 8 } } }
      ]);
    }
  }

  autoTable(doc, {
    startY: 110,
    head: [['Código', 'Empregado', 'Evento', 'Referência', 'Informação', 'Provento', 'Desconto']],
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fontStyle: 'bold',
      lineWidth: { top: 1, bottom: 1 },
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 100 },
      2: { cellWidth: 160 },
      3: { cellWidth: 50 },
      4: { cellWidth: 50, halign: 'right' },
      5: { cellWidth: 60, halign: 'right' },
      6: { cellWidth: 50, halign: 'right' },
    },
    didDrawPage: (data) => {
      drawHeader(doc, data);
    },
    margin: { top: 110, left: 40, right: 40, bottom: 40 }
  });

  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages('{totalPages}');
  }

  doc.save(`Relatorio_Provisoes_${metadata?.empresa}_${metadata?.competencia}.pdf`);
}
