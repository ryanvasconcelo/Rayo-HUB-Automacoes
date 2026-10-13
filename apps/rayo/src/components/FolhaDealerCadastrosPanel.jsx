import React, { useMemo, useState } from 'react';
import { Check, Plus, Save, Trash2, AlertTriangle, BookOpen } from 'lucide-react';
import { useFolhaDealerCenters } from '../hooks/useFolhaDealerCenters';
import { padCenterCode } from '../lib/folha-dealer/merge-center-config';

/**
 * Aba Cadastros — centros Dealer + de-para lotação + evento → conta.
 */
export default function FolhaDealerCadastrosPanel({ companyId = 'braga-veiculos' }) {
  const {
    stored,
    setStored,
    loading,
    saving,
    error,
    apiAvailable,
    accountsHydratedFromSeed,
    saveAll,
    removeLotacao,
  } = useFolhaDealerCenters(companyId);

  const [feedback, setFeedback] = useState(null);
  const [accountFilter, setAccountFilter] = useState('');
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(true);
  const [newCenter, setNewCenter] = useState({ code: '', name: '' });
  const [newMapping, setNewMapping] = useState({
    lotacaoCode: '',
    dealerCenterCode: '',
    allocationMode: 'direct',
  });
  const [newAccount, setNewAccount] = useState({
    eventCode: '',
    dealerAccountCode: '',
    dc: 'D',
    description: '',
  });
  const [newCenterAccount, setNewCenterAccount] = useState({
    dealerCenterCode: '',
    fromAccountCode: '',
    toAccountCode: '',
    dc: 'D',
  });

  const centers = stored?.centers || [];
  const lotacaoMappings = stored?.lotacaoMappings || [];
  const accountMappings = stored?.accountMappings || [];
  const centerAccountRules = stored?.centerAccountRules || [];
  const activeCenters = centers.filter((c) => c.active !== false);

  const visibleAccounts = useMemo(() => {
    const q = accountFilter.trim().toLowerCase();
    return accountMappings
      .map((m, idx) => ({ m, idx }))
      .filter(({ m }) => {
        if (!showInactiveAccounts && m.active === false) return false;
        if (!q) return true;
        return (
          String(m.eventCode).toLowerCase().includes(q) ||
          String(m.dealerAccountCode).toLowerCase().includes(q) ||
          String(m.description || '').toLowerCase().includes(q)
        );
      });
  }, [accountMappings, accountFilter, showInactiveAccounts]);

  const accountStats = useMemo(() => {
    const active = accountMappings.filter((m) => m.active !== false).length;
    return { total: accountMappings.length, active, inactive: accountMappings.length - active };
  }, [accountMappings]);

  const updateCenters = (updater) => {
    setStored((prev) => {
      const base = prev || { companyId, centers: [], lotacaoMappings: [], accountMappings: [], centerAccountRules: [] };
      const nextCenters = typeof updater === 'function' ? updater(base.centers) : updater;
      return { ...base, centers: nextCenters };
    });
  };

  const updateMappings = (updater) => {
    setStored((prev) => {
      const base = prev || { companyId, centers: [], lotacaoMappings: [], accountMappings: [], centerAccountRules: [] };
      const next = typeof updater === 'function' ? updater(base.lotacaoMappings) : updater;
      return { ...base, lotacaoMappings: next };
    });
  };

  const updateAccounts = (updater) => {
    setStored((prev) => {
      const base = prev || { companyId, centers: [], lotacaoMappings: [], accountMappings: [], centerAccountRules: [] };
      const next = typeof updater === 'function' ? updater(base.accountMappings || []) : updater;
      return { ...base, accountMappings: next };
    });
  };

  const updateCenterAccounts = (updater) => {
    setStored((prev) => {
      const base = prev || { companyId, centers: [], lotacaoMappings: [], accountMappings: [], centerAccountRules: [] };
      const next = typeof updater === 'function' ? updater(base.centerAccountRules || []) : updater;
      return { ...base, centerAccountRules: next };
    });
  };

  const handleSave = async () => {
    setFeedback(null);
    try {
      const saved = await saveAll({ centers, lotacaoMappings, accountMappings, centerAccountRules });
      const accN = saved?.accountMappings?.length ?? accountMappings.length;
      const ruleN = saved?.centerAccountRules?.length ?? centerAccountRules.length;
      setFeedback({
        type: 'ok',
        text: `Cadastros salvos nesta empresa (${centers.length} centros, ${lotacaoMappings.length} lotações, ${accN} contas, ${ruleN} contas por centro).`,
      });
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

  const addAccount = () => {
    const eventCode = newAccount.eventCode.trim();
    const dealerAccountCode = newAccount.dealerAccountCode.trim();
    const dc = (newAccount.dc || 'D').toUpperCase();
    const description = newAccount.description.trim();
    if (!eventCode || !dealerAccountCode) {
      setFeedback({ type: 'err', text: 'Informe código do evento e conta contábil.' });
      return;
    }
    if (!/^[DC]$/.test(dc)) {
      setFeedback({ type: 'err', text: 'Natureza deve ser D (Débito) ou C (Crédito).' });
      return;
    }
    const dup = accountMappings.some(
      (m) => String(m.eventCode) === eventCode && String(m.dc).toUpperCase() === dc
    );
    if (dup) {
      setFeedback({
        type: 'err',
        text: `Já existe mapeamento ${eventCode} / ${dc}. Edite a linha ou desative-a.`,
      });
      return;
    }
    updateAccounts((prev) => [
      ...prev,
      { eventCode, dealerAccountCode, dealerLotAccountCode: null, dc, description, active: true },
    ]);
    setNewAccount({ eventCode: '', dealerAccountCode: '', dc: 'D', description: '' });
    setFeedback({ type: 'ok', text: 'Conta adicionada — clique em Salvar para persistir.' });
  };

  const addCenterAccount = () => {
    const dealerCenterCode = padCenterCode(newCenterAccount.dealerCenterCode);
    const toAccountCode = newCenterAccount.toAccountCode.trim();
    const fromAccountCode = newCenterAccount.fromAccountCode.trim();
    const dc = (newCenterAccount.dc || 'D').toUpperCase() === 'C' ? 'C' : 'D';
    if (!dealerCenterCode || !toAccountCode) {
      setFeedback({ type: 'err', text: 'Informe o centro e a conta destino.' });
      return;
    }
    const dup = centerAccountRules.some(
      (r) =>
        r.dealerCenterCode === dealerCenterCode &&
        r.dc === dc &&
        String(r.fromAccountCode || '') === fromAccountCode
    );
    if (dup) {
      setFeedback({ type: 'err', text: 'Já existe essa regra para o centro. Edite a linha.' });
      return;
    }
    updateCenterAccounts((prev) => [
      ...prev,
      { dealerCenterCode, fromAccountCode, toAccountCode, dc, active: true },
    ]);
    setNewCenterAccount({ dealerCenterCode: '', fromAccountCode: '', toAccountCode: '', dc: 'D' });
    setFeedback({ type: 'ok', text: 'Regra de conta por centro adicionada — clique em Salvar.' });
  };

  /** Soft-delete: desativa. Hard-delete só se já estiver inativo (e remove da lista). */
  const deleteAccount = (idx) => {
    updateAccounts((prev) => {
      const row = prev[idx];
      if (!row) return prev;
      if (row.active === false) {
        return prev.filter((_, i) => i !== idx);
      }
      return prev.map((r, i) => (i === idx ? { ...r, active: false } : r));
    });
    setFeedback({
      type: 'ok',
      text: 'Conta desativada (o seed não “ressuscita” enquanto active=false). Salve para persistir. Clique de novo no lixo para remover da lista.',
    });
  };

  const handleDeleteMapping = async (lotacaoCode) => {
    // Soft-delete na UI: desativa para o merge do seed não reativar no motor
    const row = lotacaoMappings.find((m) => m.lotacaoCode === lotacaoCode);
    if (row && row.active !== false) {
      updateMappings((prev) =>
        prev.map((m) => (m.lotacaoCode === lotacaoCode ? { ...m, active: false } : m))
      );
      setFeedback({
        type: 'ok',
        text: `De-para "${lotacaoCode}" desativado — Salve para persistir.`,
      });
      return;
    }
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
              Centros, lotação→centro, conta por centro e evento→conta. O que você salvar vale só para a empresa selecionada.
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

        {apiAvailable && accountsHydratedFromSeed && (
          <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>
              De-para evento→conta foi recarregado do seed (o arquivo no servidor estava vazio).
              Clique em <strong>Salvar</strong> para gravar de forma permanente.
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

        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Conta por centro de custo</h3>
            <p className="text-sm text-slate-500 mt-1">
              Quando o lançamento cair neste centro, a conta do evento é trocada.
              Origem vazia vale para todas as contas da natureza (D ou C) nesse centro — por exemplo 000300 Mecânica indo para a conta de custo.
              Só afeta a empresa aberta nesta tela.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-semibold">Centro</th>
                  <th className="px-6 py-3 font-semibold">Conta origem</th>
                  <th className="px-6 py-3 font-semibold">Conta destino</th>
                  <th className="px-6 py-3 font-semibold w-20">D/C</th>
                  <th className="px-6 py-3 font-semibold w-20">Ativo</th>
                  <th className="px-6 py-3 font-semibold w-16" />
                </tr>
              </thead>
              <tbody>
                {centerAccountRules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-sm text-slate-400">
                      Nenhuma regra. Sem isso, a conta continua sendo só a do evento.
                    </td>
                  </tr>
                )}
                {centerAccountRules.map((r, idx) => (
                  <tr key={`${r.dealerCenterCode}-${r.dc}-${r.fromAccountCode}-${idx}`} className={`border-t border-slate-100 ${r.active === false ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-2.5 font-mono text-slate-800">{r.dealerCenterCode}</td>
                    <td className="px-6 py-2.5">
                      <input
                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-400 rounded-lg px-2 py-1.5 font-mono focus:outline-none"
                        placeholder="todas"
                        value={r.fromAccountCode || ''}
                        onChange={(e) => {
                          const fromAccountCode = e.target.value;
                          updateCenterAccounts((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, fromAccountCode } : row))
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-2.5">
                      <input
                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-400 rounded-lg px-2 py-1.5 font-mono focus:outline-none"
                        value={r.toAccountCode}
                        onChange={(e) => {
                          const toAccountCode = e.target.value;
                          updateCenterAccounts((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, toAccountCode } : row))
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-2.5">
                      <select
                        className="bg-transparent border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-400"
                        value={r.dc}
                        onChange={(e) => {
                          const dc = e.target.value;
                          updateCenterAccounts((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, dc } : row))
                          );
                        }}
                      >
                        <option value="D">D</option>
                        <option value="C">C</option>
                      </select>
                    </td>
                    <td className="px-6 py-2.5">
                      <input
                        type="checkbox"
                        checked={r.active !== false}
                        onChange={(e) => {
                          const active = e.target.checked;
                          updateCenterAccounts((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, active } : row))
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-2.5">
                      <button
                        type="button"
                        title="Remover"
                        onClick={() => {
                          updateCenterAccounts((prev) => {
                            const row = prev[idx];
                            if (!row) return prev;
                            if (row.active === false) return prev.filter((_, i) => i !== idx);
                            return prev.map((item, i) => (i === idx ? { ...item, active: false } : item));
                          });
                        }}
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
            <div className="min-w-[200px]">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Centro</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                value={newCenterAccount.dealerCenterCode}
                onChange={(e) => setNewCenterAccount((p) => ({ ...p, dealerCenterCode: e.target.value }))}
              >
                <option value="">Selecione…</option>
                {activeCenters.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Origem (opcional)</label>
              <input
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-400"
                placeholder="6.1.1.01.002"
                value={newCenterAccount.fromAccountCode}
                onChange={(e) => setNewCenterAccount((p) => ({ ...p, fromAccountCode: e.target.value }))}
              />
            </div>
            <div className="w-40">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Destino</label>
              <input
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-400"
                placeholder="4.1.1.01.001"
                value={newCenterAccount.toAccountCode}
                onChange={(e) => setNewCenterAccount((p) => ({ ...p, toAccountCode: e.target.value }))}
              />
            </div>
            <div className="w-20">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">D/C</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                value={newCenterAccount.dc}
                onChange={(e) => setNewCenterAccount((p) => ({ ...p, dc: e.target.value }))}
              >
                <option value="D">D</option>
                <option value="C">C</option>
              </select>
            </div>
            <button
              type="button"
              onClick={addCenterAccount}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </section>

        {/* ── Seção 3: De-para Evento → Conta Contábil ── */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-slate-500" />
              <h3 className="font-semibold text-slate-900">De-para Evento → Conta Contábil</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
              <span>{accountStats.active} ativos</span>
              <span>{accountStats.inactive} inativos</span>
              <span>{accountStats.total} total</span>
            </div>
          </div>
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center gap-3">
            <input
              className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
              placeholder="Filtrar por evento, conta ou descrição…"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactiveAccounts}
                onChange={(e) => setShowInactiveAccounts(e.target.checked)}
              />
              Mostrar inativos
            </label>
          </div>
          {accountMappings.length === 0 && (
            <div className="px-6 py-4 text-sm text-amber-800 bg-amber-50 border-b border-amber-100">
              Nenhum de-para de conta carregado. Verifique a empresa selecionada e se o seed da config existe.
            </div>
          )}
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-semibold">Evento</th>
                  <th className="px-6 py-3 font-semibold">Conta Dealer</th>
                  <th className="px-6 py-3 font-semibold w-20">D/C</th>
                  <th className="px-6 py-3 font-semibold">Descrição</th>
                  <th className="px-6 py-3 font-semibold w-20">Ativo</th>
                  <th className="px-6 py-3 font-semibold w-16" />
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.map(({ m, idx }) => (
                  <tr
                    key={`${m.eventCode}-${m.dc}-${idx}`}
                    className={`border-t border-slate-100 ${m.active === false ? 'opacity-50 bg-slate-50/80' : ''}`}
                  >
                    <td className="px-6 py-2.5 font-mono text-slate-800">{m.eventCode}</td>
                    <td className="px-6 py-2.5">
                      <input
                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-400 rounded-lg px-2 py-1.5 font-mono focus:outline-none"
                        value={m.dealerAccountCode}
                        onChange={(e) => {
                          const dealerAccountCode = e.target.value;
                          updateAccounts((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, dealerAccountCode } : row))
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-2.5">
                      <select
                        className="bg-transparent border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-400"
                        value={m.dc}
                        onChange={(e) => {
                          const dc = e.target.value;
                          updateAccounts((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, dc } : row))
                          );
                        }}
                      >
                        <option value="D">D</option>
                        <option value="C">C</option>
                      </select>
                    </td>
                    <td className="px-6 py-2.5">
                      <input
                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-400 rounded-lg px-2 py-1.5 focus:outline-none"
                        value={m.description}
                        onChange={(e) => {
                          const description = e.target.value;
                          updateAccounts((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, description } : row))
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-2.5">
                      <input
                        type="checkbox"
                        checked={m.active !== false}
                        onChange={(e) => {
                          const active = e.target.checked;
                          updateAccounts((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, active } : row))
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-2.5">
                      <button
                        type="button"
                        title={m.active === false ? 'Remover da lista' : 'Desativar'}
                        onClick={() => deleteAccount(idx)}
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
            <div className="w-24">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Evento</label>
              <input
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-400"
                placeholder="011"
                value={newAccount.eventCode}
                onChange={(e) => setNewAccount((p) => ({ ...p, eventCode: e.target.value }))}
              />
            </div>
            <div className="w-40">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Conta Dealer</label>
              <input
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-400"
                placeholder="6.1.1.01.002"
                value={newAccount.dealerAccountCode}
                onChange={(e) => setNewAccount((p) => ({ ...p, dealerAccountCode: e.target.value }))}
              />
            </div>
            <div className="w-20">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">D/C</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                value={newAccount.dc}
                onChange={(e) => setNewAccount((p) => ({ ...p, dc: e.target.value }))}
              >
                <option value="D">D</option>
                <option value="C">C</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Descrição</label>
              <input
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                placeholder="Salário-Base"
                value={newAccount.description}
                onChange={(e) => setNewAccount((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={addAccount}
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
