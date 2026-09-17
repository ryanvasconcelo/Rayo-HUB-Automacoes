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
  
  const folhaSeqs = new Set();

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
      if (row.sourcePayrollId) folhaSeqs.add(String(row.sourcePayrollId));
      
      rawRows.push({
        companyId: row.companyId,
        companyName: row.companyName,
        competence: row.competence,
        // de-para Braga usa o nome da lotação (mesma regra do extract do banco)
        lotacaoCode: row.lotacaoName || row.lotacaoCode,
        lotacaoName: row.lotacaoName,
        eventCode: row.eventCode,
        eventName: row.eventName,
        amountCents: amountCents,
        ProvDesc: provDesc,
        TipoRegistro: row.TipoRegistro,
        IncideFGTS: row.IncideFGTS,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        sourcePayrollId: row.sourcePayrollId,
        sourceReference: row.sourceReference
      });
    }
  }
  
  const totalLiquido = totalProventos - totalDescontos;
  const folhaSeqList = Array.from(folhaSeqs).sort((a, b) => Number(a) - Number(b));
  
  const metadata = {
    empresa: targetCompanyId,
    competencia: targetCompetence,
    // Compat: primeira sequência; preferir folhaSeqs para competências segmentadas
    folhaSeq: folhaSeqList[0] || null,
    folhaSeqs: folhaSeqList,
    quantidadeFolhas: folhaSeqList.length,
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
