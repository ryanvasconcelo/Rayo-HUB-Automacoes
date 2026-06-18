export function parseFortesCsv(csvContent, targetCompanyId, targetCompetence) {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { metadata: {}, rawRows: [] };

  const headers = lines[0].split(';');
  const targetCompStr = targetCompetence.replace('-', '');
  
  const rawRows = [];
  
  let totalProventos = 0;
  let totalDescontos = 0;
  let totalInformativos = 0;
  const uniqueEmployees = new Set();
  
  let folhaSeq = null;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ? values[j].trim() : '';
    }
    
    // Filtrar apenas a empresa e competência solicitada
    if (String(row.companyId) === String(targetCompanyId) && String(row.competence).replace('-', '') === targetCompStr) {
      
      if (!row.eventCode) {
        continue; // Ignorar possiveis artefatos do CSV
      }

      let provDesc = 0;
      if (row.TipoRegistro === 'PROVENTO') provDesc = 1;
      else if (row.TipoRegistro === 'DESCONTO') provDesc = 2;
      
      const amountCents = parseInt(row.amountCents || '0', 10);
      
      if (provDesc === 1) totalProventos += amountCents;
      else if (provDesc === 2) totalDescontos += amountCents;
      else totalInformativos += amountCents;
      
      if (row.employeeId) uniqueEmployees.add(row.employeeId);
      if (!folhaSeq && row.sourcePayrollId) folhaSeq = row.sourcePayrollId;
      
      rawRows.push({
        companyId: row.companyId,
        companyName: row.companyName,
        competence: row.competence,
        lotacaoCode: row.lotacaoCode,
        lotacaoName: row.lotacaoName,
        eventCode: row.eventCode,
        eventName: row.eventName,
        amountCents: amountCents,
        ProvDesc: provDesc,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        sourcePayrollId: row.sourcePayrollId,
        sourceReference: row.sourceReference
      });
    }
  }
  
  const totalLiquido = totalProventos - totalDescontos;
  
  const metadata = {
    empresa: targetCompanyId,
    competencia: targetCompetence,
    folhaSeq: folhaSeq,
    quantidadeLinhas: rawRows.length,
    quantidadeFuncionarios: uniqueEmployees.size,
    totalProventos: totalProventos,
    totalDescontos: totalDescontos,
    totalLiquido: totalLiquido,
    totalInformativos: totalInformativos,
    dataHoraExtracao: new Date().toISOString()
  };
  
  return { metadata, rawRows };
}
