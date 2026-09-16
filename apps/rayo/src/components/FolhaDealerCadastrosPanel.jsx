import React, { useState } from 'react';
import { Check, Plus, Save, Trash2, AlertTriangle } from 'lucide-react';
import { useFolhaDealerCenters } from '../hooks/useFolhaDealerCenters';
import { padCenterCode } from '../lib/folha-dealer/merge-center-config';

/**
 * Aba Cadastros — centros Dealer + de-para lotação Fortes → centro.
 */
export default function FolhaDealerCadastrosPanel({ companyId = 'braga-veiculos' }) {
  const {
    stored,
    setStored,
    loading,
    saving,
    error,
    apiAvailable,
    saveAll,
    removeLotacao,
  } = useFolhaDealerCenters(companyId);

  const [feedback, setFeedback] = useState(null);
  const [newCenter, setNewCenter] = useState({ code: '', name: '' });
  const [newMapping, setNewMapping] = useState({
    lotacaoCode: '',
    dealerCenterCode: '',
    allocationMode: 'direct',
  });

  const centers = stored?.centers || [];
  const lotacaoMappings = stored?.lotacaoMappings || [];
  const activeCenters = centers.filter((c) => c.active !== false);

  const updateCenters = (updater) => {
    setStored((prev) => {
      const base = prev || { companyId, centers: [], lotacaoMappings: [] };
      const nextCenters = typeof updater === 'function' ? updater(base.centers) : updater;
      return { ...base, centers: nextCenters };
    });
  };

  const updateMappings = (updater) => {
    setStored((prev) => {
      const base = prev || { companyId, centers: [], lotacaoMappings: [] };
      const next = typeof updater === 'function' ? updater(base.lotacaoMappings) : updater;
      return { ...base, lotacaoMappings: next };
    });
  };

  const handleSave = async () => {
    setFeedback(null);
    try {
      await saveAll({ centers, lotacaoMappings });
      setFeedback({ type: 'ok', text: 'Cadastros salvos no servidor.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err.message });
    }
  };

  const addCenter = () => {
    const code = padCenterCode(newCenter.code);
    const name = newCenter.name.trim();
    if (!code || !name) {
      setFeedback({ type: 'err', text: 'Informe código e nome do centro.' });
      return;
    }
    if (centers.some((c) => c.code === code)) {
      setFeedback({ type: 'err', text: `Centro ${code} já existe.` });
      return;
    }
    updateCenters((prev) => [...prev, { code, name, active: true }]);
    setNewCenter({ code: '', name: '' });
    setFeedback(null);
  };

  const addMapping = () => {
    const lotacaoCode = newMapping.lotacaoCode.trim();
    const dealerCenterCode = padCenterCode(newMapping.dealerCenterCode);
    if (!lotacaoCode || !dealerCenterCode) {
      setFeedback({ type: 'err', text: 'Informe lotação Fortes e centro Dealer.' });
      return;
    }
    updateMappings((prev) => {
      const next = prev.filter((m) => m.lotacaoCode !== lotacaoCode);
      next.push({
        lotacaoCode,
        dealerCenterCode,
        allocationMode: newMapping.allocationMode,
        active: true,
      });
      return next;
    });
    setNewMapping({ lotacaoCode: '', dealerCenterCode: '', allocationMode: 'direct' });
    setFeedback(null);
  };

  const handleDeleteMapping = async (lotacaoCode) => {
    updateMappings((prev) => prev.filter((m) => m.lotacaoCode !== lotacaoCode));
    try {
      await removeLotacao(lotacaoCode);
      setFeedback({ type: 'ok', text: `De-para "${lotacaoCode}" removido.` });
    } catch {
      setFeedback({ type: 'err', text: 'Removido na tela — salve para persistir no servidor.' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-10">
        Carregando cadastros…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8 bg-transparent">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cadastros — Centros e De-para</h2>
            <p className="text-sm text-slate-500 mt-1">
              Centros Dealer e mapeamento Lotação Fortes → Centro. Persistido no servidor (compartilhado).
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !apiAvailable}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save size={16} />
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        {!apiAvailable && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>
              API indisponível — exibindo seed local. Inicie o rayo-server (ou o Vite com plugin) para gravar.
              {error ? ` (${error})` : ''}
            </p>
          </div>
        )}

        {feedback && (
          <div
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {feedback.type === 'ok' ? <Check size={16} /> : <AlertTriangle size={16} />}
            {feedback.text}
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Centros Dealer</h3>
            <span className="text-xs text-slate-400 font-mono">{centers.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-semibold">Código</th>
                  <th className="px-6 py-3 font-semibold">Nome</th>
                  <th className="px-6 py-3 font-semibold w-28">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((c, idx) => (
                  <tr key={c.code} className="border-t border-slate-100">
                    <td className="px-6 py-2.5 font-mono text-slate-800">{c.code}</td>
                    <td className="px-6 py-2.5">
                      <input
                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-400 rounded-lg px-2 py-1.5 focus:outline-none"
                        value={c.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          updateCenters((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, name } : row))
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-2.5">
                      <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={c.active !== false}
                          onChange={(e) => {
                            const active = e.target.checked;
                            updateCenters((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, active } : row))
                            );
                          }}
                        />
                        Ativo
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Código</label>
              <input
                className="w-28 bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-400"
                placeholder="000999"
                value={newCenter.code}
                onChange={(e) => setNewCenter((p) => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Nome</label>
              <input
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                placeholder="Nome do centro"
                value={newCenter.name}
                onChange={(e) => setNewCenter((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={addCenter}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">De-para Lotação → Centro</h3>
            <span className="text-xs text-slate-400 font-mono">{lotacaoMappings.length}</span>
          </div>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-semibold">Lotação Fortes</th>
                  <th className="px-6 py-3 font-semibold">Centro</th>
                  <th className="px-6 py-3 font-semibold">Modo</th>
                  <th className="px-6 py-3 font-semibold w-24">Ativo</th>
                  <th className="px-6 py-3 font-semibold w-16" />
                </tr>
              </thead>
              <tbody>
                {lotacaoMappings.map((m, idx) => (
                  <tr key={`${m.lotacaoCode}-${idx}`} className="border-t border-slate-100">
                    <td className="px-6 py-2.5 font-medium text-slate-800">{m.lotacaoCode || '(vazio)'}</td>
                    <td className="px-6 py-2.5">
                      <select
                        className="w-full bg-transparent border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-400"
                        value={m.dealerCenterCode}
                        onChange={(e) => {
                          const dealerCenterCode = e.target.value;
                          updateMappings((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, dealerCenterCode } : row))
                          );
                        }}
                      >
                        {centers.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-2.5">
                      <select
                        className="bg-transparent border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-400"
                        value={m.allocationMode}
                        onChange={(e) => {
                          const allocationMode = e.target.value;
                          updateMappings((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, allocationMode } : row))
                          );
                        }}
                      >
                        <option value="direct">Direta</option>
                        <option value="activity">Por atividade</option>
                      </select>
                    </td>
                    <td className="px-6 py-2.5">
                      <input
                        type="checkbox"
                        checked={m.active !== false}
                        onChange={(e) => {
                          const active = e.target.checked;
                          updateMappings((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, active } : row))
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-2.5">
                      <button
                        type="button"
                        title="Remover"
                        onClick={() => handleDeleteMapping(m.lotacaoCode)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Lotação Fortes</label>
              <input
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                value={newMapping.lotacaoCode}
                onChange={(e) => setNewMapping((p) => ({ ...p, lotacaoCode: e.target.value }))}
              />
            </div>
            <div className="min-w-[200px]">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Centro</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                value={newMapping.dealerCenterCode}
                onChange={(e) => setNewMapping((p) => ({ ...p, dealerCenterCode: e.target.value }))}
              >
                <option value="">Selecione…</option>
                {activeCenters.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Modo</label>
              <select
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                value={newMapping.allocationMode}
                onChange={(e) => setNewMapping((p) => ({ ...p, allocationMode: e.target.value }))}
              >
                <option value="direct">Direta</option>
                <option value="activity">Por atividade</option>
              </select>
            </div>
            <button
              type="button"
              onClick={addMapping}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Modal rápido para cadastrar de-para a partir de pendência MISSING_CENTER_MAPPING.
 */
export function QuickLotacaoMappingModal({
  lotacaoCode,
  lotacaoName,
  centers,
  onClose,
  onSave,
}) {
  const [dealerCenterCode, setDealerCenterCode] = useState(centers[0]?.code || '');
  const [allocationMode, setAllocationMode] = useState('direct');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const activeCenters = centers.filter((c) => c.active !== false);

  const submit = async () => {
    if (!dealerCenterCode) {
      setErr('Selecione um centro.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSave({
        lotacaoCode,
        dealerCenterCode,
        allocationMode,
        active: true,
      });
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Cadastrar de-para</h3>
        <p className="text-sm text-slate-600">
          Lotação: <span className="font-semibold text-slate-900">{lotacaoCode || '(vazio)'}</span>
          {lotacaoName ? ` — ${lotacaoName}` : ''}
        </p>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Centro Dealer</label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400"
            value={dealerCenterCode}
            onChange={(e) => setDealerCenterCode(e.target.value)}
          >
            {activeCenters.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Modo</label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400"
            value={allocationMode}
            onChange={(e) => setAllocationMode(e.target.value)}
          >
            <option value="direct">Direta</option>
            <option value="activity">Por atividade</option>
          </select>
        </div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Salvando…' : 'Salvar e reprocessar'}
          </button>
        </div>
      </div>
    </div>
  );
}
