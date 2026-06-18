export function summarizeValidationIssues(runData) {
  const summary = {
    missingCenters: [],
    missingAccounts: [],
    unbalancedJournal: null
  };

  if (!runData || !runData.issues || !runData.consolidatedItems) return summary;

  const { issues, consolidatedItems } = runData;

  const lotacaoMap = {};
  const eventMap = {};

  for (const item of consolidatedItems) {
    if (!lotacaoMap[item.lotacaoCode]) {
      lotacaoMap[item.lotacaoCode] = { 
        name: item.lotacaoName || 'Desconhecida',
        totalCents: 0
      };
    }
    lotacaoMap[item.lotacaoCode].totalCents += item.amountCents;

    if (!eventMap[item.eventCode]) {
      eventMap[item.eventCode] = { 
        name: item.eventName || 'Desconhecido', 
        tipo: item.sourceRecordType || 'Desconhecido',
        totalCents: 0
      };
    }
    eventMap[item.eventCode].totalCents += item.amountCents;
  }

  const centerGroups = {}; 
  const accountGroups = {};

  for (const issue of issues) {
    if (issue.code === 'MISSING_CENTER_MAPPING') {
      const code = issue.context?.lotacaoCode;
      if (!centerGroups[code]) {
        centerGroups[code] = {
          lotacaoCode: code,
          lotacaoName: lotacaoMap[code]?.name || 'Desconhecida',
          count: 0,
          totalCents: lotacaoMap[code]?.totalCents || 0
        };
      }
      centerGroups[code].count++;
    } 
    else if (issue.code === 'MISSING_ACCOUNT_MAPPING') {
      const code = issue.context?.eventCode;
      if (!accountGroups[code]) {
        accountGroups[code] = {
          eventCode: code,
          eventName: eventMap[code]?.name || 'Desconhecido',
          tipo: eventMap[code]?.tipo || 'Desconhecido',
          count: 0,
          totalCents: eventMap[code]?.totalCents || 0
        };
      }
      accountGroups[code].count++;
    }
    else if (issue.code === 'UNBALANCED_JOURNAL') {
      summary.unbalancedJournal = {
        totalDebitCents: issue.context?.totalDebit || 0,
        totalCreditCents: issue.context?.totalCredit || 0,
        differenceCents: Math.abs(issue.context?.difference || 0),
        probableCause: 'Falta crédito explícito do líquido da folha a pagar'
      };
    }
  }

  summary.missingCenters = Object.values(centerGroups).sort((a, b) => b.totalCents - a.totalCents);
  summary.missingAccounts = Object.values(accountGroups).sort((a, b) => b.totalCents - a.totalCents);

  return summary;
}
