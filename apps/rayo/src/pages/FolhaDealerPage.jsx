import React, { useState, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { motion, AnimatePresence } from 'framer-motion';
import { useFolhaDealer } from '../hooks/useFolhaDealer';
import { getLastDayOfCompetence } from '../lib/folha-dealer/date-helpers';
import { generateProvisionsReport } from '../lib/folha-dealer/pdf-report-generator';
import { FileSpreadsheet, Check, Download, AlertTriangle, XCircle,
   Upload, Filter, AlertCircle, Info, Search, CornerDownRight,
   Database, RefreshCw, ChevronRight, ChevronDown, AlignJustify, List
} from 'lucide-react';

const VirtuosoTableComponents = {
   Table: React.forwardRef((props, ref) => <div {...props} ref={ref} role="table" className="w-full text-sm text-left flex flex-col min-w-[1000px]" />),
   TableHead: React.forwardRef((props, ref) => <div {...props} role="rowgroup" ref={ref} className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 shadow-sm" />),
   TableRow: (props) => <div {...props} role="rowgroup" className="group border-b border-slate-100 hover:bg-slate-50/30 transition-colors flex flex-col" />,
   TableBody: React.forwardRef((props, ref) => <div {...props} role="rowgroup" ref={ref} className="bg-white flex flex-col" />),
};

export default function FolhaDealerPage() {
   const {
      run, error, metadata, summary,
      extractFromDatabase, approveRun, downloadExcel, downloadTxt
   } = useFolhaDealer();

   const [fortesCompanyId, setFortesCompanyId] = useState('9274');
   const [fortesCompetence, setFortesCompetence] = useState('04-2026');

   const [dealerCompany, setDealerCompany] = useState('01');
   const [dealerBranch, setDealerBranch] = useState('001');

   const [initialDay, setInitialDay] = useState('01');
   const [finalDay, setFinalDay] = useState('30');

   const [activeTab, setActiveTab] = useState('lancamentos');
   const [filterMode, setFilterMode] = useState('TODOS');
   const [searchTerm, setSearchTerm] = useState('');
   const [isGroupedMode, setIsGroupedMode] = useState(true);

   const [expandedRows, setExpandedRows] = useState({});

   const toggleRow = (id) => {
      setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
   };

   const accountingDate = useMemo(() => {
      const parts = fortesCompetence.split('-');
      if (parts.length === 2 && parts[0].length === 2) {
         return `${parts[1]}-${parts[0]}-${finalDay.padStart(2, '0')}`;
      }
      return `${fortesCompetence}-${finalDay.padStart(2, '0')}`;
   }, [finalDay, fortesCompetence]);

   const displayCompetence = useMemo(() => {
      const parts = fortesCompetence.split('-');
      if (parts.length === 2 && parts[0].length === 4) return `${parts[1]}/${parts[0]}`; 
      if (parts.length === 2 && parts[0].length === 2) return `${parts[0]}/${parts[1]}`; 
      return fortesCompetence;
   }, [fortesCompetence]);

   const displayAccountingDate = useMemo(() => {
      const parts = accountingDate.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return accountingDate;
   }, [accountingDate]);

   const handleProcess = async (e) => {
      e.preventDefault();
      await extractFromDatabase(fortesCompanyId, fortesCompetence);

      const realLastDay = getLastDayOfCompetence(fortesCompetence).split('-')[2];
      setFinalDay(realLastDay);
      setExpandedRows({});
   };

   const formatCurrency = (val) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);
   };

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
         const isProvisao = item.eventCode.startsWith('PROV_');

         let status = 'OK';
         if (hasBlocker) status = 'ERRO';
         else if (isProvisao) status = 'PROVISAO';
         else if (hasWarning) status = 'AVISO';
         else if (item.amountCents === 0 || ['600', '601', '602', '603', '604', '605'].includes(item.eventCode)) status = 'IGNORADO';

         const message = itemIssues.map(i => i.message).join(' | ');

         // Agrupamento por partida dobrada (D e C do mesmo item)
         if (isProvisao && isGroupedMode && itemEntries.length > 0) {
            let sumD = 0;
            let sumC = 0;
            const mappedEntries = itemEntries.map((entry, eIdx) => {
               if (entry.dc === 'D') sumD += entry.amountCents;
               if (entry.dc === 'C') sumC += entry.amountCents;
               return {
                  id: `${item.lotacaoCode}-${item.eventCode}-${entry.dc}-${entry.accountCode}-${index}-${eIdx}`,
                  centroDealer: entry.centerCode || '',
                  dc: entry.dc,
                  conta: entry.accountCode,
                  valor: entry.amountCents,
                  historico: entry.history
               };
            });
            
            const isBalanced = sumD === sumC;
            
            rows.push({
               type: 'group',
               id: `group-${item.lotacaoCode}-${item.eventCode}-${index}`,
               status,
               lancar: !hasBlocker && status !== 'IGNORADO',
               lotacaoFortes: `${item.lotacaoCode} - ${item.lotacaoName || ''}`,
               evento: item.eventCode,
               descricaoEvento: (item.eventName || '').replace(/^\d+\s*-\s*/, ''),
               sumD,
               sumC,
               isBalanced,
               entries: mappedEntries,
               mensagem: message,
               issues: itemIssues
            });
         } else {
            // Lista Plana padrão
            if (itemEntries.length > 0) {
               itemEntries.forEach((entry, eIdx) => {
                  rows.push({
                     type: 'flat',
                     id: `${item.lotacaoCode}-${item.eventCode}-${entry.dc}-${entry.accountCode}-${index}-${eIdx}`,
                     status,
                     lancar: !hasBlocker && status !== 'IGNORADO',
                     lotacaoFortes: `${item.lotacaoCode} - ${item.lotacaoName || ''}`,
                     centroDealer: entry.centerCode || '',
                     evento: item.eventCode,
                     descricaoEvento: (item.eventName || '').replace(/^\d+\s*-\s*/, ''),
                     dc: entry.dc,
                     conta: entry.accountCode,
                     valor: entry.amountCents,
                     historico: entry.history,
                     mensagem: message,
                     issues: itemIssues
                  });
               });
            } else {
               rows.push({
                  type: 'flat',
                  id: `${item.lotacaoCode}-${item.eventCode}-failed-${index}`,
                  status,
                  lancar: false,
                  lotacaoFortes: `${item.lotacaoCode} - ${item.lotacaoName || ''}`,
                  centroDealer: '',
                  evento: item.eventCode,
                  descricaoEvento: (item.eventName || '').replace(/^\d+\s*-\s*/, ''),
                  dc: '',
                  conta: '',
                  valor: item.amountCents,
                  historico: '',
                  mensagem: message,
                  issues: itemIssues
               });
            }
         }
      });
      return rows;
   }, [run, isGroupedMode]);

   const filteredRows = useMemo(() => {
      let result = gridRows;
      switch (filterMode) {
         case 'ERROS': result = result.filter(r => r.status === 'ERRO'); break;
         case 'AVISOS': result = result.filter(r => r.status === 'AVISO'); break;
         case 'PRONTOS': result = result.filter(r => r.lancar || r.status === 'PROVISAO'); break;
         case 'SEM_CENTRO': result = result.filter(r => r.issues.some(i => i.code === 'MISSING_CENTER_MAPPING' || i.code === 'MISSING_REQUIRED_CENTER')); break;
         case 'SEM_CONTA': result = result.filter(r => r.issues.some(i => i.code === 'MISSING_ACCOUNT_MAPPING')); break;
         case 'TODOS':
         default: break;
      }

      if (searchTerm.trim()) {
         const term = searchTerm.toLowerCase();
         result = result.filter(r => {
            if (r.type === 'group') {
               const matchMain = (r.lotacaoFortes || '').toLowerCase().includes(term) ||
                                 (r.descricaoEvento || '').toLowerCase().includes(term) ||
                                 (r.evento || '').toLowerCase().includes(term);
               if (matchMain) return true;
               return r.entries.some(e => (e.conta || '').toLowerCase().includes(term) || (e.centroDealer || '').toLowerCase().includes(term));
            } else {
               return (r.lotacaoFortes || '').toLowerCase().includes(term) ||
                      (r.descricaoEvento || '').toLowerCase().includes(term) ||
                      (r.evento || '').toLowerCase().includes(term) ||
                      (r.conta || '').toLowerCase().includes(term);
            }
         });
      }

      // Compute group hierarchy for attenuation technique (only visually grouped by lotacao on flat rows)
      result.forEach((r, idx) => {
         if (idx === 0) {
            r.isFirstInGroup = true;
         } else {
            r.isFirstInGroup = r.lotacaoFortes !== result[idx - 1].lotacaoFortes;
         }
      });

      return result;
   }, [gridRows, filterMode, searchTerm]);

   const daysArray = Array.from({length: 31}, (_, i) => String(i + 1).padStart(2, '0'));
   const pendenciasCount = (summary?.missingCenters?.length || 0) + (summary?.missingAccounts?.length || 0) + (summary?.unbalancedJournal?.differenceCents ? 1 : 0);

   const GRID_COLS = "grid-cols-[110px_130px_60px_1fr_1.5fr]";

   const renderExpandedIssues = (row, isExpanded, hasIssues) => {
      return (
         <AnimatePresence>
            {isExpanded && hasIssues && (
               <motion.div
                  key={`expanded-${row.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
               >
                  <div className={`pl-[164px] pr-6 py-4 bg-slate-50/80 border-t ${row.status === 'ERRO' ? 'border-rose-100/50' : 'border-amber-100/50'} flex flex-col gap-2`}>
                     {row.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm">
                           <AlertCircle size={16} className={issue.severity === 'blocker' ? 'text-rose-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                           <p className={issue.severity === 'blocker' ? 'text-rose-800 font-medium' : 'text-amber-800 font-medium'}>
                              {issue.message}
                           </p>
                        </div>
                     ))}
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      );
   };

   return (
      <div className="min-h-[100dvh] bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 pb-16">

         {/* HEADER COCKPIT */}
         <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 backdrop-blur-md bg-white/90 shadow-sm">
            <div className="max-w-[1600px] mx-auto px-6 py-5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
                     <FileSpreadsheet className="text-white w-5 h-5" />
                  </div>
                  <div>
                     <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">Importação em lote - Dealer</h1>
                     <p className="text-sm text-slate-500 mt-1">Importe rapidamente dados em massa do ERP Fortes para o ERP Dealer</p>
                  </div>
               </div>

               {run && (
                  <motion.div
                     initial={{ opacity: 0, y: -10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="flex items-center gap-6"
                  >
                     <div className="flex gap-8">
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Líquido Folha</span>
                           <span className="font-mono text-sm font-medium text-slate-700">{formatCurrency(metadata?.totalLiquido || 0)}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200/60"></div>
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Débitos</span>
                           <span className="font-mono text-sm font-medium text-rose-600 tabular-nums">{formatCurrency(engineTotals.debit)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Créditos</span>
                           <span className="font-mono text-sm font-medium text-blue-600 tabular-nums">{formatCurrency(engineTotals.credit)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Diferença</span>
                           <span className={`font-mono text-sm font-bold tabular-nums ${engineTotals.difference === 0 ? 'text-emerald-600' : 'text-amber-500 animate-pulse'}`}>
                              {formatCurrency(engineTotals.difference)}
                           </span>
                        </div>
                     </div>
                  </motion.div>
               )}
            </div>
         </header>

         <main className="max-w-[1600px] mx-auto px-6 pt-8 flex gap-6 items-start">
            <div className="flex-1 min-w-0">
               <AnimatePresence mode="wait">
                  {!run ? (
                     <motion.div
                        key="setup"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="max-w-2xl mx-auto mt-12"
                     >
                        <div className="bg-white rounded-[2rem] p-10 border border-slate-200/50 shadow-md">
                           <div className="mb-8 flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                 <Database size={24} />
                              </div>
                              <div>
                                 <h2 className="text-2xl font-bold tracking-tight text-slate-900">Origem de Dados</h2>
                                 <p className="text-slate-500 text-sm mt-1">Conexão direta com o banco de dados do Fortes.</p>
                              </div>
                           </div>

                           <form onSubmit={handleProcess} className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cód. Empresa</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all" value={fortesCompanyId} onChange={e => setFortesCompanyId(e.target.value)}>
                                       <option value="9274">Braga Veículos - 9274</option>
                                    </select>
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Competência</label>
                                    <input type="month" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all" value={fortesCompetence} onChange={e => setFortesCompetence(e.target.value)} />
                                 </div>
                              </div>

                              <div className="pt-4">
                                 <button
                                    type="submit"
                                    className="w-full bg-slate-900 text-white font-semibold py-3.5 px-4 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                                 >
                                    Processar e Validar Lote <ChevronRight className="w-4 h-4" />
                                 </button>
                              </div>
                           </form>

                           {error && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl flex items-start gap-3 text-sm">
                                 <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                 <p className="leading-relaxed">{error}</p>
                              </motion.div>
                           )}
                        </div>
                     </motion.div>
                  ) : (
                     <motion.div
                        key="grid"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20, staggerChildren: 0.1 }}
                        className="flex flex-col gap-6 h-[calc(100dvh-140px)]"
                     >
                        {/* FILTER BAR */}
                        <motion.div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-2 shadow-sm">
                           <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
                              <button onClick={() => setActiveTab('lancamentos')} className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'lancamentos' ? 'bg-white shadow-sm border border-slate-200/80 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Lançamentos</button>
                              <button onClick={() => setActiveTab('pendencias')} className={`px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${activeTab === 'pendencias' ? 'bg-white shadow-sm border border-slate-200/80 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                                 Pendências
                                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none flex items-center justify-center ${pendenciasCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>{pendenciasCount}</span>
                              </button>
                           </div>

                           {activeTab === 'lancamentos' && (
                              <div className="flex items-center gap-4 px-2">
                                 {/* TOGGLE MODO AGRUPADO */}
                                 <button
                                    onClick={() => setIsGroupedMode(!isGroupedMode)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${isGroupedMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                    title="Agrupar provisões por partida dobrada"
                                 >
                                    {isGroupedMode ? <AlignJustify size={14}/> : <List size={14}/>}
                                    {isGroupedMode ? 'Agrupado' : 'Lista Plana'}
                                 </button>

                                 <div className="h-6 w-px bg-slate-200"></div>

                                 <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/50">
                                    {[
                                       { id: 'TODOS', label: 'Todos' },
                                       { id: 'ERROS', label: 'Erros', color: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
                                       { id: 'AVISOS', label: 'Avisos', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                                       { id: 'PRONTOS', label: 'Prontos', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                                    ].map(f => (
                                       <button
                                          key={f.id}
                                          onClick={() => setFilterMode(f.id)}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterMode === f.id ? (f.color || 'bg-white shadow-sm border border-slate-200/80 text-slate-900') : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                                       >
                                          {f.label}
                                       </button>
                                    ))}
                                 </div>

                                 <div className="h-6 w-px bg-slate-200"></div>

                                 <div className="relative group">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                       type="text"
                                       placeholder="Buscar lote, conta, valor..."
                                       className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-sm w-64 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all placeholder:text-slate-400 shadow-sm"
                                       value={searchTerm}
                                       onChange={e => setSearchTerm(e.target.value)}
                                    />
                                 </div>
                              </div>
                           )}
                        </motion.div>

                        {/* MAIN CONTENT AREA */}
                        <motion.div className="flex-1 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm overflow-hidden flex flex-col min-h-0">
                           {activeTab === 'lancamentos' ? (
                              <div className="flex-1 relative overflow-x-auto">
                                 {filteredRows.length > 0 ? (
                                    <TableVirtuoso
                                       data={filteredRows}
                                       className="h-full w-full min-w-[1000px]"
                                       components={VirtuosoTableComponents}
                                       fixedHeaderContent={() => (
                                          <div role="row" className={`grid ${GRID_COLS} gap-x-12 px-6 py-3 items-center`}>
                                             <div role="columnheader" className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Status</div>
                                             <div role="columnheader" className="text-right font-semibold text-xs text-slate-500 uppercase tracking-wider">Valor</div>
                                             <div role="columnheader" className="text-center font-semibold text-xs text-slate-500 uppercase tracking-wider">Tipo</div>
                                             <div role="columnheader" className="font-semibold text-xs text-slate-500 uppercase tracking-wider">De-Para Lotação</div>
                                             <div role="columnheader" className="font-semibold text-xs text-slate-500 uppercase tracking-wider">De-Para Evento</div>
                                          </div>
                                       )}
                                       itemContent={(_index, row) => {
                                          const isExpanded = expandedRows[row.id];
                                          const hasIssues = row.status === 'ERRO' || row.status === 'AVISO';
                                          
                                          let borderClass = 'border-slate-200';
                                          if (row.status === 'ERRO') borderClass = 'border-rose-500';
                                          if (row.status === 'AVISO') borderClass = 'border-amber-400';
                                          if (row.status === 'PROVISAO') borderClass = 'border-slate-400';
                                          if (row.status === 'OK') borderClass = 'border-emerald-500';

                                          // RENDERIZAÇÃO DE BLOCO AGRUPADO (PARTIDA DOBRADA)
                                          if (row.type === 'group') {
                                             return (
                                                <div role="rowgroup" className="flex flex-col my-1 bg-slate-50/60 border-y border-slate-200 transition-colors">
                                                   {/* CABEÇALHO DO BLOCO */}
                                                   <div role="row" className={`grid ${GRID_COLS} gap-x-12 px-6 py-3 items-center border-b border-slate-200/60 bg-slate-100/50 border-l-4 ${borderClass} ${hasIssues ? 'cursor-pointer hover:bg-slate-200/50' : ''}`} onClick={() => hasIssues && toggleRow(row.id)}>
                                                      <div role="cell" className="flex items-center gap-1.5">
                                                         {hasIssues ? (
                                                            <>
                                                               {row.status === 'ERRO' && <span className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 text-rose-700 text-xs font-semibold rounded-md border border-rose-100 shadow-sm"><XCircle size={12} /> Erro</span>}
                                                               {row.status === 'AVISO' && <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md border border-amber-100 shadow-sm"><AlertTriangle size={12} /> Aviso</span>}
                                                               <button className={`ml-auto text-slate-400 hover:text-slate-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                                  <ChevronDown size={14} />
                                                               </button>
                                                            </>
                                                         ) : (
                                                            <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 shadow-sm"><Info size={12} /> Provisão</span>
                                                         )}
                                                      </div>
                                                      <div role="cell" className="text-right">
                                                         {row.isBalanced ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200"><Check size={12}/> Balanceado</span>
                                                         ) : (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200"><AlertTriangle size={12}/> Não balanceado</span>
                                                         )}
                                                      </div>
                                                      <div role="cell">{/* Vazio */}</div>
                                                      <div role="cell" className="font-medium text-[13px] text-slate-800 truncate pr-2" title={row.lotacaoFortes}>{row.lotacaoFortes}</div>
                                                      <div role="cell" className="font-medium text-[13px] text-slate-800 truncate pr-2" title={row.descricaoEvento}>{row.descricaoEvento}</div>
                                                   </div>

                                                   {/* PERNAS D E C */}
                                                   {row.entries.map((entry, eIdx) => {
                                                      const isPassivo = entry.conta && (entry.conta.startsWith('1') || entry.conta.startsWith('2'));
                                                      return (
                                                         <div role="row" key={eIdx} className={`grid ${GRID_COLS} gap-x-12 px-6 py-2.5 items-center ${eIdx !== row.entries.length - 1 ? 'border-b border-slate-200/40' : ''} border-l-4 border-l-transparent`}>
                                                            <div role="cell" className="pl-6 text-slate-300">
                                                               <CornerDownRight size={14} />
                                                            </div>
                                                            
                                                            {/* VALOR PERNA */}
                                                            <div role="cell" className="flex flex-col items-end">
                                                               <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-800">{formatCurrency(entry.valor)}</span>
                                                            </div>

                                                            {/* TIPO */}
                                                            <div role="cell" className="text-center">
                                                               <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shadow-sm ${entry.dc === 'D' ? 'bg-rose-50 text-rose-600 border border-rose-200' : entry.dc === 'C' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                                                  {entry.dc || '-'}
                                                               </span>
                                                            </div>

                                                            {/* DE-PARA LOTAÇÃO PERNA */}
                                                            <div role="cell" className="flex flex-col gap-0.5 min-w-0 pr-2">
                                                               {entry.centroDealer ? (
                                                                  <span className="font-mono text-[13px] text-slate-900 font-medium truncate">{entry.centroDealer}</span>
                                                               ) : (
                                                                  <span className="text-slate-400 italic text-[11px] flex items-center gap-1.5 font-medium">Vide cabeçalho</span>
                                                               )}
                                                            </div>

                                                            {/* DE-PARA EVENTO PERNA */}
                                                            <div role="cell" className="flex flex-col gap-0.5 min-w-0 pr-4">
                                                               {entry.conta ? (
                                                                  <span className="font-mono text-[13px] text-slate-900 font-medium truncate">{entry.conta}</span>
                                                               ) : (
                                                                  <span className="text-slate-400 italic text-[11px] flex items-center gap-1.5 font-medium"><AlertCircle size={12}/> Sem correspondência</span>
                                                               )}
                                                            </div>
                                                         </div>
                                                      );
                                                   })}
                                                   
                                                   {renderExpandedIssues(row, isExpanded, hasIssues)}
                                                </div>
                                             );
                                          }

                                          // RENDERIZAÇÃO DE LINHA PLANA (PADRÃO)
                                          return (
                                             <>
                                                <div 
                                                   className={`grid ${GRID_COLS} gap-x-12 px-6 py-3.5 items-center transition-colors border-l-4 ${borderClass} ${hasIssues ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                                                   onClick={() => hasIssues && toggleRow(row.id)}
                                                >
                                                   {/* STATUS */}
                                                   <div role="cell" className="flex items-center gap-1.5">
                                                      {row.status === 'ERRO' && <span className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 text-rose-700 text-xs font-semibold rounded-md border border-rose-100 shadow-sm"><XCircle size={12} /> Erro</span>}
                                                      {row.status === 'AVISO' && <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md border border-amber-100 shadow-sm"><AlertTriangle size={12} /> Aviso</span>}
                                                      {row.status === 'PROVISAO' && <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 shadow-sm"><Info size={12} /> Provisão</span>}
                                                      {row.status === 'OK' && <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-100 shadow-sm"><Check size={12} /> Pronto</span>}
                                                      {row.status === 'IGNORADO' && <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-md shadow-sm"><Info size={12} /> Ignorado</span>}
                                                      
                                                      {hasIssues && (
                                                         <button className={`ml-auto text-slate-400 hover:text-slate-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                            <ChevronDown size={14} />
                                                         </button>
                                                      )}
                                                   </div>

                                                   {/* VALOR */}
                                                   <div role="cell" className="flex flex-col items-end gap-1">
                                                      <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-800">{formatCurrency(row.valor)}</span>
                                                      {row.status === 'IGNORADO' && (
                                                         <span className="text-[10px] text-slate-400">Informativo</span>
                                                      )}
                                                   </div>

                                                   {/* TIPO */}
                                                   <div role="cell" className="text-center">
                                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shadow-sm ${row.dc === 'D' ? 'bg-rose-50 text-rose-600 border border-rose-200' : row.dc === 'C' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                                         {row.dc || '-'}
                                                      </span>
                                                   </div>

                                                   {/* DE-PARA LOTAÇÃO */}
                                                   <div role="cell" className={`flex flex-col gap-0.5 min-w-0 pr-2 transition-opacity duration-300 ${row.isFirstInGroup ? 'opacity-100' : 'opacity-40'}`} title={row.lotacaoFortes}>
                                                      {row.centroDealer ? (
                                                         <>
                                                            <span className="font-mono text-[13px] text-slate-900 font-medium truncate">{row.centroDealer}</span>
                                                            <span className="text-[11px] text-slate-500 truncate">{row.lotacaoFortes}</span>
                                                         </>
                                                      ) : (
                                                         <>
                                                            {row.conta && (row.conta.startsWith('1') || row.conta.startsWith('2')) ? (
                                                               <span className="text-slate-400 italic text-[11px] font-medium">— Não se aplica</span>
                                                            ) : (
                                                               <span className="text-slate-400 italic text-[11px] flex items-center gap-1.5 font-medium"><AlertCircle size={12}/> Sem correspondência</span>
                                                            )}
                                                            <span className="text-[11px] text-slate-500 truncate mt-0.5">{row.lotacaoFortes}</span>
                                                         </>
                                                      )}
                                                   </div>

                                                   {/* DE-PARA EVENTO */}
                                                   <div role="cell" className="flex flex-col gap-0.5 min-w-0 pr-4" title={row.descricaoEvento}>
                                                      {row.conta ? (
                                                         <>
                                                            <span className="font-mono text-[13px] text-slate-900 font-medium truncate">{row.conta}</span>
                                                            <span className="text-[11px] text-slate-500 truncate">{row.descricaoEvento}</span>
                                                         </>
                                                      ) : (
                                                         <>
                                                            <span className="text-slate-400 italic text-[11px] flex items-center gap-1.5 font-medium"><AlertCircle size={12}/> Sem correspondência</span>
                                                            <span className="text-[11px] text-slate-500 truncate mt-0.5">{row.descricaoEvento}</span>
                                                         </>
                                                      )}
                                                   </div>
                                                </div>
                                                {renderExpandedIssues(row, isExpanded, hasIssues)}
                                             </>
                                          );
                                       }}
                                    />
                                 ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                       <Search size={32} className="text-slate-300 mb-4" />
                                       <p className="text-sm">Nenhum lançamento encontrado para o filtro.</p>
                                    </div>
                                 )}
                              </div>
                           ) : (
                              <div className="flex-1 overflow-auto p-10 bg-transparent">
                                 <div className="max-w-3xl mx-auto space-y-8">
                                    {pendenciasCount === 0 ? (
                                       <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-center justify-center text-emerald-700 font-medium shadow-sm">
                                          <Check size={20} className="mr-2" />
                                          Nenhuma pendência encontrada nesta competência
                                       </div>
                                    ) : (
                                       <>
                                          {summary?.unbalancedJournal && summary.unbalancedJournal.differenceCents !== 0 && (
                                             <div className="bg-white rounded-2xl p-6 border border-rose-100 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                                                <div className="flex items-center gap-3 mb-4">
                                                   <AlertCircle className="text-rose-500" size={20} />
                                                   <h3 className="text-lg font-bold text-slate-900">Diferença de Balancete</h3>
                                                </div>
                                                <p className="text-slate-600 text-sm mb-6 leading-relaxed">{summary.unbalancedJournal.probableCause}</p>
                                                <div className="grid grid-cols-3 gap-6">
                                                   <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Débitos</span>
                                                      <span className="text-xl font-mono text-slate-900 font-medium tabular-nums">{formatCurrency(summary.unbalancedJournal.totalDebitCents)}</span>
                                                   </div>
                                                   <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Créditos</span>
                                                      <span className="text-xl font-mono text-slate-900 font-medium tabular-nums">{formatCurrency(summary.unbalancedJournal.totalCreditCents)}</span>
                                                   </div>
                                                   <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                                                      <span className="block text-[10px] uppercase tracking-wider text-rose-600 font-bold mb-1">Diferença a ajustar</span>
                                                      <span className="text-xl font-mono text-rose-700 font-bold tabular-nums">{formatCurrency(summary.unbalancedJournal.differenceCents)}</span>
                                                   </div>
                                                </div>
                                             </div>
                                          )}
                                       </>
                                    )}
                                 </div>
                              </div>
                           )}
                        </motion.div>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>

            {/* VERTICAL OPERATIONS BAR */}
            <AnimatePresence>
               {run && (
                  <motion.div
                     initial={{ x: 50, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     exit={{ x: 50, opacity: 0 }}
                     transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
                     className="w-72 shrink-0 flex flex-col gap-4 sticky top-28"
                  >
                     <div className="bg-white border border-slate-200/80 shadow-sm rounded-[1.5rem] p-6 flex flex-col gap-5">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                           <Database size={16} className="text-slate-400" />
                           Exportação
                        </h3>

                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Período Contábil ({displayCompetence})</label>
                           <div className="grid grid-cols-2 gap-2">
                              <div>
                                 <label className="text-[10px] text-slate-400 block mb-1">Dia Inicial</label>
                                 <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-slate-400 transition-all"
                                    value={initialDay}
                                    onChange={e => setInitialDay(e.target.value)}
                                 >
                                    {daysArray.map(d => <option key={`start-${d}`} value={d}>{d}</option>)}
                                 </select>
                              </div>
                              <div>
                                 <label className="text-[10px] text-slate-400 block mb-1">Dia Final</label>
                                 <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-slate-400 transition-all"
                                    value={finalDay}
                                    onChange={e => setFinalDay(e.target.value)}
                                 >
                                    {daysArray.map(d => <option key={`end-${d}`} value={d}>{d}</option>)}
                                 </select>
                              </div>
                           </div>
                           <p className="text-[10px] text-slate-400 font-mono mt-1">Data do lançamento: {displayAccountingDate}</p>
                        </div>

                        <div className="h-px bg-slate-100 w-full my-1"></div>

                        <div className="space-y-3">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Relatórios de Conferência</label>

                           <button onClick={downloadExcel} className="flex justify-left items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/80 shadow-sm transition-colors group">
                              <Download size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" /> Planilha Excel
                           </button>

                           <button
                              onClick={() => {
                                 const provRows = run?.sourceRows?.filter(r => r.sourceEventNature === 'PROVISAO') || [];
                                 generateProvisionsReport(provRows, { empresa: metadata?.empresa || fortesCompanyId, competencia: metadata?.competencia || fortesCompetence });
                              }}
                              className="flex justify-left items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/80 shadow-sm transition-colors group"
                           >
                              <Download size={16} className="text-slate-400 group-hover:text-rose-600 transition-colors" /> PDF de Provisões
                           </button>
                        </div>

                        <div className="h-px bg-slate-100 w-full mt-2 mb-1"></div>

                        {run.status === 'ready' ? (
                           <div className="space-y-3 pt-2">
                              <p className="text-[10px] text-slate-500">Lote sem erros estruturais pendentes. Revise os relatórios e libere a exportação.</p>
                              <button
                                 onClick={() => approveRun('Contabilidade', 'Aprovado para exportação Sisdia')}
                                 className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 active:scale-[0.98] shadow-sm transition-all"
                              >
                                 <Check size={16} /> Aprovar Lote Contábil
                              </button>
                           </div>
                        ) : run.status === 'approved' || run.status === 'exported' ? (
                           <div className="space-y-4 pt-2">
                              <div className="grid grid-cols-2 gap-3">
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Empresa Sisdia</label>
                                    <input
                                       type="text"
                                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-center font-mono focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all"
                                       value={dealerCompany}
                                       onChange={e => setDealerCompany(e.target.value)}
                                    />
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filial Sisdia</label>
                                    <input
                                       type="text"
                                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-center font-mono focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all"
                                       value={dealerBranch}
                                       onChange={e => setDealerBranch(e.target.value)}
                                    />
                                 </div>
                              </div>
                              
                              <button
                                 onClick={() => downloadTxt(dealerCompany, dealerBranch, accountingDate)}
                                 className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 active:scale-[0.98] shadow-sm shadow-emerald-600/20 transition-all"
                              >
                                 <Download size={16} /> Exportar TXT Dealer
                              </button>
                           </div>
                        ) : (
                           <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex flex-col items-center justify-center text-center gap-2 mt-2">
                              <XCircle size={20} className="text-rose-500" />
                              <p className="text-xs font-semibold text-rose-700">Pendências bloqueantes. Resolva os erros na aba de pendências para liberar.</p>
                           </div>
                        )}
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

         </main>
      </div>
   );
}
