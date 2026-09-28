/**
 * Totais por tipo de folha no formato do "Resumo Geral do Mês/Período" do
 * Fortes, para o contador conferir o lote com o relatório que já usa.
 */
const formatCurrency = (cents) =>
   (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FolhaDealerResumoPorTipo({ resumo }) {
   if (!resumo?.length) return null;

   return (
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-[1.5rem] p-6 flex flex-col gap-4">
         <h3 className="font-bold text-slate-900 text-sm">Conferência com o Resumo Geral</h3>
         <div className="flex flex-col gap-3">
            {resumo.map((tipo) => (
               <div key={tipo.payrollType} className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-semibold text-slate-700">{tipo.label}</span>
                     <span className="text-[10px] text-slate-400">{tipo.empregados} empregado(s)</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-500">
                     <span>Proventos</span>
                     <span>{formatCurrency(tipo.proventosCents)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-500">
                     <span>Descontos</span>
                     <span>{formatCurrency(tipo.descontosCents)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-800 font-semibold">
                     <span>Líquido</span>
                     <span>{formatCurrency(tipo.liquidoCents)}</span>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}
