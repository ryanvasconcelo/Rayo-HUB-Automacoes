import React, { useState, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { useFolhaDealer } from '../hooks/useFolhaDealer';
import { getLastDayOfCompetence } from '../lib/folha-dealer/date-helpers';
import { 
  FileSpreadsheet, Check, Download, AlertTriangle, XCircle, 
  FileText, Upload, Filter, List, AlertCircle, Info
} from 'lucide-react';

export default function FolhaDealerPage() {
  const { 
    run, error, metadata, summary, 
    processRun, processCsvFortes, approveRun, downloadExcel, downloadTxt 
  } = useFolhaDealer();
  
  const [origin, setOrigin] = useState('FIXTURE'); 
  const [csvFile, setCsvFile] = useState(null);

  const [companyId, setCompanyId] = useState('BRAGA_VEICULOS');
  const [competence, setCompetence] = useState('2023-10');

  const [fortesCompanyId, setFortesCompanyId] = useState('9274');
  const [fortesCompetence, setFortesCompetence] = useState('2026-04');
  
  const [dealerCompany, setDealerCompany] = useState('02');
  const [dealerBranch, setDealerBranch] = useState('001');
  const [accountingDate, setAccountingDate] = useState(getLastDayOfCompetence('2023-10'));
  const [approver, setApprover] = useState('Analista Contábil');

  const [activeTab, setActiveTab] = useState('lancamentos');
  const [filterMode, setFilterMode] = useState('TODOS'); // TODOS, ERROS, AVISOS, PRONTOS, SEM_CENTRO, SEM_CONTA

  const handleCompetenceChange = (e) => {
    const newVal = e.target.value;
    setCompetence(newVal);
    setAccountingDate(getLastDayOfCompetence(newVal));
  };

  const handleProcess = (e) => {
    e.preventDefault();
    if (origin === 'FIXTURE') {
      processRun(companyId, competence);
    } else {
      if (!csvFile) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        processCsvFortes(evt.target.result, fortesCompanyId, fortesCompetence);
      };
      reader.readAsText(csvFile);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);
  };

  // Real engine totals based on entries
  const engineTotals = useMemo(() => {
    if (!run || !run.entries) return { debit: 0, credit: 0, difference: 0 };
    let debit = 0;
    let credit = 0;
    run.entries.forEach(e => {
      if (e.dc === 'D') debit += e.amountCents;
      if (e.dc === 'C') credit += e.amountCents;
    });
    return { debit, credit, difference: Math.abs(debit - credit) };
  }, [run]);

  // Build grid rows for the spreadsheet view
  const gridRows = useMemo(() => {
    if (!run || !run.consolidatedItems) return [];
    let rows = [];
    
    run.consolidatedItems.forEach((item, index) => {
      const itemIssues = run.issues.filter(i => 
         (i.context?.lotacaoCode === item.lotacaoCode && i.context?.eventCode === item.eventCode) ||
         (i.code === 'MISSING_ACCOUNT_MAPPING' && i.context?.eventCode === item.eventCode) ||
         (i.code === 'MISSING_CENTER_MAPPING' && i.context?.lotacaoCode === item.lotacaoCode) ||
         (i.code === 'MISSING_REQUIRED_CENTER' && i.context?.lotacaoCode === item.lotacaoCode && i.context?.eventCode === item.eventCode) ||
         (i.code === 'CENTER_REMOVED_FROM_BALANCE_ACCOUNT' && i.context?.lotacaoCode === item.lotacaoCode && i.context?.eventCode === item.eventCode)
      );
      
      const itemEntries = run.entries.filter(e => e.lotacaoCode === item.lotacaoCode && e.eventCode === item.eventCode);
      
      const hasBlocker = itemIssues.some(i => i.severity === 'blocker');
      const hasWarning = itemIssues.some(i => i.severity === 'warning');
      
      let status = 'OK';
      if (hasBlocker) status = 'ERRO';
      else if (hasWarning) status = 'AVISO';
      else if (item.amountCents === 0 || ['600','601','602','603','604','605'].includes(item.eventCode)) status = 'IGNORADO';
      
      const message = itemIssues.map(i => i.message).join(' | ');

      if (itemEntries.length > 0) {
         itemEntries.forEach((entry, eIdx) => {
            rows.push({
               id: `${item.lotacaoCode}-${item.eventCode}-${entry.dc}-${entry.accountCode}-${index}-${eIdx}`,
               status,
               lancar: !hasBlocker && status !== 'IGNORADO',
               lotacaoFortes: `${item.lotacaoCode} - ${item.lotacaoName || ''}`,
               centroDealer: entry.centerCode || '',
               evento: item.eventCode,
               descricaoEvento: item.eventName,
               dc: entry.dc,
               conta: entry.accountCode,
               valor: item.amountCents, 
               historico: entry.history,
               dataContabil: accountingDate,
               mensagem: message,
               issues: itemIssues
            });
         });
      } else {
         rows.push({
            id: `${item.lotacaoCode}-${item.eventCode}-failed-${index}`,
            status,
            lancar: false,
            lotacaoFortes: `${item.lotacaoCode} - ${item.lotacaoName || ''}`,
            centroDealer: '',
            evento: item.eventCode,
            descricaoEvento: item.eventName,
            dc: '',
            conta: '',
            valor: item.amountCents,
            historico: '',
            dataContabil: '',
            mensagem: message,
            issues: itemIssues
         });
      }
    });
    return rows;
  }, [run, accountingDate]);

  const filteredRows = useMemo(() => {
    switch (filterMode) {
      case 'ERROS': return gridRows.filter(r => r.status === 'ERRO');
      case 'AVISOS': return gridRows.filter(r => r.status === 'AVISO');
      case 'PRONTOS': return gridRows.filter(r => r.status === 'OK' && r.lancar);
      case 'SEM_CENTRO': return gridRows.filter(r => r.issues.some(i => i.code === 'MISSING_CENTER_MAPPING' || i.code === 'MISSING_REQUIRED_CENTER'));
      case 'SEM_CONTA': return gridRows.filter(r => r.issues.some(i => i.code === 'MISSING_ACCOUNT_MAPPING'));
      case 'TODOS': 
      default: return gridRows;
    }
  }, [gridRows, filterMode]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col font-sans">
       {/* HEADER FIXO - Estilo Planilha/ERP */}
       <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <FileSpreadsheet className="text-blue-600" />
              Conferência Folha → Dealer
            </h1>
            <p className="text-xs text-slate-500 mt-1">Importação de competência e geração de lotes contábeis</p>
          </div>
          
          {run && (
            <div className="flex items-center gap-6">
              <div className="flex gap-4 text-sm">
                <div className="flex flex-col"><span className="text-[10px] uppercase text-slate-400 font-bold">Empresa</span><span className="font-semibold">{metadata?.empresa || companyId}</span></div>
                <div className="flex flex-col"><span className="text-[10px] uppercase text-slate-400 font-bold">Competência</span><span className="font-semibold">{metadata?.competencia || competence}</span></div>
                <div className="flex flex-col"><span className="text-[10px] uppercase text-slate-400 font-bold">Status</span>
                  <span className={`font-bold ${run.status === 'ready' ? 'text-green-600' : 'text-red-600'}`}>
                    {run.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="flex gap-4 text-sm">
                <div className="flex flex-col items-end"><span className="text-[10px] uppercase text-slate-400 font-bold">Líquido Folha</span><span className="font-semibold">{formatCurrency(metadata?.totalLiquido || 0)}</span></div>
                <div className="flex flex-col items-end"><span className="text-[10px] uppercase text-slate-400 font-bold">Total Débito</span><span className="font-semibold text-red-600">{formatCurrency(engineTotals.debit)}</span></div>
                <div className="flex flex-col items-end"><span className="text-[10px] uppercase text-slate-400 font-bold">Total Crédito</span><span className="font-semibold text-green-600">{formatCurrency(engineTotals.credit)}</span></div>
                <div className="flex flex-col items-end"><span className="text-[10px] uppercase text-slate-400 font-bold">Diferença</span>
                  <span className={`font-bold ${engineTotals.difference === 0 ? 'text-slate-600' : 'text-orange-500'}`}>
                    {formatCurrency(engineTotals.difference)}
                  </span>
                </div>
              </div>
            </div>
          )}
       </header>

       <div className="flex-1 p-6 flex gap-6 max-w-[1600px] mx-auto w-full">
          
          {/* SIDEBAR DE CONFIGURAÇÃO */}
          <div className="w-80 shrink-0 flex flex-col gap-6">
             <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase text-slate-500 tracking-wider mb-4">1. Origem de Dados</h2>
                <form onSubmit={handleProcess} className="flex flex-col gap-4">
                   <div>
                     <label className="block text-xs font-semibold mb-1 text-slate-600">Formato</label>
                     <select 
                       className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       value={origin}
                       onChange={e => setOrigin(e.target.value)}
                     >
                        <option value="FIXTURE">Fixture Braga (Teste)</option>
                        <option value="CSV">CSV Fortes (Real)</option>
                     </select>
                   </div>

                   {origin === 'FIXTURE' && (
                     <>
                       <div>
                         <label className="block text-xs font-semibold mb-1 text-slate-600">Empresa</label>
                         <select className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm" value={companyId} onChange={e => setCompanyId(e.target.value)}>
                            <option value="BRAGA_VEICULOS">Braga Veículos</option>
                         </select>
                       </div>
                       <div>
                         <label className="block text-xs font-semibold mb-1 text-slate-600">Competência</label>
                         <input type="month" className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm" value={competence} onChange={handleCompetenceChange} />
                       </div>
                     </>
                   )}

                   {origin === 'CSV' && (
                     <>
                       <div className="grid grid-cols-2 gap-2">
                         <div>
                           <label className="block text-xs font-semibold mb-1 text-slate-600">Empresa</label>
                           <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm" value={fortesCompanyId} onChange={e => setFortesCompanyId(e.target.value)} />
                         </div>
                         <div>
                           <label className="block text-xs font-semibold mb-1 text-slate-600">Competência</label>
                           <input type="month" className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm" value={fortesCompetence} onChange={e => setFortesCompetence(e.target.value)} />
                         </div>
                       </div>
                       <div>
                         <label className="block text-xs font-semibold mb-1 text-slate-600">Arquivo de Extração (.csv)</label>
                         <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                               <Upload className="w-6 h-6 mb-2 text-slate-400" />
                               <p className="text-xs text-slate-500">
                                 <span className="font-semibold">Clique para anexar</span>
                               </p>
                               {csvFile && <p className="text-[10px] text-blue-500 mt-1 truncate max-w-[200px]">{csvFile.name}</p>}
                            </div>
                            <input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
                         </label>
                       </div>
                     </>
                   )}

                   <button 
                     type="submit"
                     disabled={origin === 'CSV' && !csvFile}
                     className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Importar e Validar
                   </button>
                </form>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-start gap-2 text-sm">
                     <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                     <p>{error}</p>
                  </div>
                )}
             </div>

             {run && (
               <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                  <h2 className="text-sm font-bold uppercase text-slate-500 tracking-wider mb-4">2. Exportação Dealer</h2>
                  <div className="flex flex-col gap-4">
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="block text-xs font-semibold mb-1 text-slate-600">Empresa</label>
                         <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-sm" value={dealerCompany} onChange={e => setDealerCompany(e.target.value)} />
                       </div>
                       <div>
                         <label className="block text-xs font-semibold mb-1 text-slate-600">Filial</label>
                         <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-sm" value={dealerBranch} onChange={e => setDealerBranch(e.target.value)} />
                       </div>
                     </div>
                     <div>
                       <label className="block text-xs font-semibold mb-1 text-slate-600">Data Contábil (YYYY-MM-DD)</label>
                       <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-sm" value={accountingDate} onChange={e => setAccountingDate(e.target.value)} />
                     </div>
                     
                     <div className="pt-2 flex flex-col gap-2">
                        <button 
                          onClick={downloadExcel}
                          className="w-full bg-white text-slate-700 border border-slate-300 font-semibold py-2 px-4 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <FileSpreadsheet size={16} /> Planilha de Conferência
                        </button>
                        
                        {run.status === 'ready' ? (
                          <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-slate-100">
                             <input type="text" placeholder="Nome do Analista" className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-md text-sm" value={approver} onChange={e => setApprover(e.target.value)} />
                             <button 
                               onClick={() => approveRun(approver, 'Aprovado na Nova UI')}
                               className="w-full bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm"
                             >
                               Aprovar Lote
                             </button>
                          </div>
                        ) : run.status === 'approved' || run.status === 'exported' ? (
                          <button 
                             onClick={() => downloadTxt(dealerCompany, dealerBranch, accountingDate)}
                             className="w-full bg-slate-800 text-white font-semibold py-2 px-4 rounded-md hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm mt-2"
                           >
                             <Download size={16} /> Gerar TXT Dealer
                           </button>
                        ) : (
                          <div className="mt-2 text-center text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                             Resolva as pendências para liberar o TXT.
                          </div>
                        )}
                     </div>
                  </div>
               </div>
             )}
          </div>

          {/* ÁREA PRINCIPAL - SPREADSHEET */}
          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden min-w-0">
             
             {!run && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                      <FileSpreadsheet size={32} className="text-slate-300" />
                   </div>
                   <h3 className="text-lg font-semibold text-slate-600">Nenhum dado carregado</h3>
                   <p className="max-w-sm mt-2 text-sm">Selecione as opções ao lado e clique em Importar para visualizar a planilha de conferência contábil.</p>
                </div>
             )}

             {run && (
                <>
                  {/* Abas */}
                  <div className="flex border-b border-slate-200 bg-slate-50/50 px-2 pt-2">
                     <button onClick={() => setActiveTab('lancamentos')} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'lancamentos' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Grade de Lançamentos</button>
                     <button onClick={() => setActiveTab('pendencias')} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pendencias' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        Visão de Pendências
                        {(summary?.missingCenters?.length > 0 || summary?.missingAccounts?.length > 0) && (
                           <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full">{summary.missingCenters.length + summary.missingAccounts.length}</span>
                        )}
                     </button>
                  </div>

                  {/* Conteúdo Aba Lançamentos */}
                  {activeTab === 'lancamentos' && (
                     <div className="flex-1 flex flex-col min-h-0">
                        
                        {/* Filtros da Tabela */}
                        <div className="p-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
                           <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1"><Filter size={14}/> Filtros</span>
                           {[
                              { id: 'TODOS', label: 'Todos' },
                              { id: 'ERROS', label: 'Com Erro', color: 'text-red-600 bg-red-50 border-red-200' },
                              { id: 'SEM_CENTRO', label: 'Sem Centro' },
                              { id: 'SEM_CONTA', label: 'Sem Conta' },
                              { id: 'AVISOS', label: 'Avisos/Ignorados', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
                              { id: 'PRONTOS', label: 'Prontos p/ Lançar', color: 'text-green-700 bg-green-50 border-green-200' },
                           ].map(f => (
                              <button 
                                key={f.id}
                                onClick={() => setFilterMode(f.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterMode === f.id ? (f.color || 'bg-slate-800 text-white border-slate-800') : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                              >
                                 {f.label}
                              </button>
                           ))}
                           <div className="ml-auto text-xs text-slate-500 font-medium px-2">
                              Exibindo {filteredRows.length} de {gridRows.length}
                           </div>
                        </div>

                        {/* Tabela Excel-like (Virtualizada) */}
                        <div className="flex-1 bg-slate-50 relative">
                           {filteredRows.length > 0 ? (
                              <TableVirtuoso
                                 data={filteredRows}
                                 className="h-full w-full"
                                 components={{
                                    Table: (props) => <table {...props} className="w-full text-xs text-left border-collapse whitespace-nowrap" />,
                                    TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref} className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b border-slate-300" />),
                                    TableRow: (props) => {
                                       const row = props.item;
                                       return <tr {...props} className={`border-b border-slate-200 hover:bg-slate-50/80 transition-colors ${row?.status === 'ERRO' ? 'bg-red-50/30' : row?.status === 'AVISO' ? 'bg-yellow-50/30' : 'bg-white'}`} />
                                    },
                                    TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="bg-white" />),
                                 }}
                                 fixedHeaderContent={() => (
                                    <tr>
                                       <th className="p-2.5 font-bold text-slate-600 border-r border-slate-200 w-8 text-center bg-slate-100">Status</th>
                                       <th className="p-2.5 font-bold text-slate-600 border-r border-slate-200 bg-slate-100">Lotação Fortes</th>
                                       <th className="p-2.5 font-bold text-slate-600 border-r border-slate-200 bg-slate-100">Centro Dealer</th>
                                       <th className="p-2.5 font-bold text-slate-600 border-r border-slate-200 bg-slate-100">Evento</th>
                                       <th className="p-2.5 font-bold text-slate-600 border-r border-slate-200 bg-slate-100">Descrição Evento</th>
                                       <th className="p-2.5 font-bold text-slate-600 border-r border-slate-200 text-center bg-slate-100">D/C</th>
                                       <th className="p-2.5 font-bold text-slate-600 border-r border-slate-200 bg-slate-100">Conta Contábil</th>
                                       <th className="p-2.5 font-bold text-slate-600 border-r border-slate-200 text-right bg-slate-100">Valor</th>
                                       <th className="p-2.5 font-bold text-slate-600 border-r border-slate-200 min-w-[200px] bg-slate-100">Mensagem / Validação</th>
                                    </tr>
                                 )}
                                 itemContent={(_index, row) => (
                                    <>
                                       <td className="p-2 border-r border-slate-200 text-center bg-inherit">
                                          {row.status === 'ERRO' && <XCircle size={14} className="text-red-500 mx-auto" title="Erro" />}
                                          {row.status === 'AVISO' && <AlertTriangle size={14} className="text-yellow-500 mx-auto" title="Aviso" />}
                                          {row.status === 'OK' && <Check size={14} className="text-green-500 mx-auto" title="Pronto" />}
                                          {row.status === 'IGNORADO' && <Info size={14} className="text-slate-300 mx-auto" title="Ignorado" />}
                                       </td>
                                       <td className={`p-2 border-r border-slate-200 truncate max-w-[200px] bg-inherit ${!row.centroDealer && row.status === 'ERRO' && row.issues.some(i => i.code.includes('CENTER')) ? 'text-red-600 font-semibold bg-red-50/50' : 'text-slate-700'}`} title={row.lotacaoFortes}>
                                          {row.lotacaoFortes}
                                       </td>
                                       <td className={`p-2 border-r border-slate-200 font-mono bg-inherit ${!row.centroDealer && row.status === 'ERRO' && row.issues.some(i => i.code.includes('CENTER')) ? 'text-red-500 italic' : 'text-blue-700 font-semibold'}`}>
                                          {row.centroDealer || (row.status === 'ERRO' && row.issues.some(i => i.code.includes('CENTER')) ? 'FALTA DE-PARA' : '-')}
                                       </td>
                                       <td className="p-2 border-r border-slate-200 text-slate-700 font-mono text-center bg-inherit">
                                          {row.evento}
                                       </td>
                                       <td className={`p-2 border-r border-slate-200 truncate max-w-[200px] bg-inherit ${!row.conta && row.status === 'ERRO' && row.issues.some(i => i.code === 'MISSING_ACCOUNT_MAPPING') ? 'text-red-600 font-semibold bg-red-50/50' : 'text-slate-700'}`} title={row.descricaoEvento}>
                                          {row.descricaoEvento}
                                       </td>
                                       <td className="p-2 border-r border-slate-200 text-center font-bold bg-inherit">
                                          {row.dc === 'D' ? <span className="text-red-600">D</span> : row.dc === 'C' ? <span className="text-green-600">C</span> : '-'}
                                       </td>
                                       <td className={`p-2 border-r border-slate-200 font-mono bg-inherit ${!row.conta && row.status === 'ERRO' && row.issues.some(i => i.code === 'MISSING_ACCOUNT_MAPPING') ? 'text-red-500 italic' : 'text-slate-800'}`}>
                                          {row.conta || (row.status === 'ERRO' && row.issues.some(i => i.code === 'MISSING_ACCOUNT_MAPPING') ? 'FALTA DE-PARA' : '-')}
                                       </td>
                                       <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700 bg-inherit">
                                          {formatCurrency(row.valor)}
                                       </td>
                                       <td className={`p-2 border-r border-slate-200 truncate max-w-[300px] bg-inherit ${row.status === 'ERRO' ? 'text-red-600 font-medium' : row.status === 'AVISO' ? 'text-yellow-700' : 'text-slate-500'}`} title={row.mensagem}>
                                          {row.mensagem || (row.status === 'OK' ? 'Pronto para integração' : '')}
                                       </td>
                                    </>
                                 )}
                              />
                           ) : (
                              <div className="absolute inset-0 flex items-center justify-center p-8 text-slate-400">
                                 Nenhuma linha corresponde ao filtro atual.
                              </div>
                           )}
                        </div>
                     </div>
                  )}

                  {/* Conteúdo Aba Pendências (Visão Resumida Acionável) */}
                  {activeTab === 'pendencias' && (
                     <div className="flex-1 overflow-auto p-6 bg-slate-50">
                        <div className="max-w-4xl mx-auto flex flex-col gap-8">
                           
                           {/* Unbalanced Journal */}
                           {summary?.unbalancedJournal && summary.unbalancedJournal.differenceCents !== 0 && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                                 <div className="flex items-center gap-3 mb-3">
                                    <AlertCircle className="text-orange-500" size={24} />
                                    <h3 className="text-lg font-bold text-orange-800">Diferença de Balancete Encontrada</h3>
                                 </div>
                                 <p className="text-orange-700 text-sm mb-4">{summary.unbalancedJournal.probableCause}</p>
                                 <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-md border border-orange-100 font-mono">
                                    <div>
                                       <span className="block text-[10px] uppercase text-slate-400 font-sans">Total Débitos</span>
                                       <span className="text-lg text-red-600 font-bold">{formatCurrency(summary.unbalancedJournal.totalDebitCents)}</span>
                                    </div>
                                    <div>
                                       <span className="block text-[10px] uppercase text-slate-400 font-sans">Total Créditos</span>
                                       <span className="text-lg text-green-600 font-bold">{formatCurrency(summary.unbalancedJournal.totalCreditCents)}</span>
                                    </div>
                                    <div className="bg-orange-100 p-2 -m-2 rounded">
                                       <span className="block text-[10px] uppercase text-orange-600 font-sans font-bold">Diferença a ajustar</span>
                                       <span className="text-lg text-orange-700 font-bold">{formatCurrency(summary.unbalancedJournal.differenceCents)}</span>
                                    </div>
                                 </div>
                              </div>
                           )}

                           {/* Missing Centers */}
                           <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                              <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                                 <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs">{summary?.missingCenters?.length || 0}</span>
                                    Lotações sem De-Para de Centro
                                 </h3>
                                 <button className="text-blue-600 text-sm font-semibold hover:underline">Mapear Centros →</button>
                              </div>
                              <div className="p-0">
                                 <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                       <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                          <th className="p-3 font-semibold w-24">Código</th>
                                          <th className="p-3 font-semibold">Nome da Lotação no Fortes</th>
                                          <th className="p-3 font-semibold text-center w-24">Ocorrências</th>
                                          <th className="p-3 font-semibold text-right w-40">Valor Afetado</th>
                                       </tr>
                                    </thead>
                                    <tbody>
                                       {summary?.missingCenters?.length > 0 ? summary.missingCenters.map((c, i) => (
                                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                             <td className="p-3 font-mono font-bold text-slate-700">{c.lotacaoCode}</td>
                                             <td className="p-3 text-slate-600">{c.lotacaoName}</td>
                                             <td className="p-3 text-center text-slate-500">{c.count}</td>
                                             <td className="p-3 text-right font-mono text-slate-700">{formatCurrency(c.totalCents)}</td>
                                          </tr>
                                       )) : (
                                          <tr><td colSpan="4" className="p-5 text-center text-slate-400">Nenhuma pendência de lotação.</td></tr>
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           </div>

                           {/* Missing Accounts */}
                           <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-8">
                              <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                                 <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs">{summary?.missingAccounts?.length || 0}</span>
                                    Eventos sem De-Para de Conta
                                 </h3>
                                 <button className="text-blue-600 text-sm font-semibold hover:underline">Mapear Contas →</button>
                              </div>
                              <div className="p-0">
                                 <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                       <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                          <th className="p-3 font-semibold w-24">Evento</th>
                                          <th className="p-3 font-semibold">Nome do Evento no Fortes</th>
                                          <th className="p-3 font-semibold text-center w-24">Ocorrências</th>
                                          <th className="p-3 font-semibold text-right w-40">Valor Afetado</th>
                                       </tr>
                                    </thead>
                                    <tbody>
                                       {summary?.missingAccounts?.length > 0 ? summary.missingAccounts.map((a, i) => (
                                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                             <td className="p-3 font-mono font-bold text-slate-700">{a.eventCode}</td>
                                             <td className="p-3 text-slate-600">
                                                {a.eventName}
                                                <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{a.tipo}</span>
                                             </td>
                                             <td className="p-3 text-center text-slate-500">{a.count}</td>
                                             <td className="p-3 text-right font-mono text-slate-700">{formatCurrency(a.totalCents)}</td>
                                          </tr>
                                       )) : (
                                          <tr><td colSpan="4" className="p-5 text-center text-slate-400">Nenhuma pendência de conta.</td></tr>
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           </div>

                        </div>
                     </div>
                  )}
                </>
             )}
          </div>
       </div>
    </div>
  );
}
