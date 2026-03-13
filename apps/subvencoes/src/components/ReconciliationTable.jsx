import { useState } from 'react';
import { formatCurrency } from '../core/utils.js';

const STATUS_LABELS = {
    'SPED_SIM_XML_SIM': { label: 'OK', cls: 'badge-ok' },
    'SPED_SIM_XML_NAO': { label: 'Sem XML', cls: 'badge-warn' },
    'SPED_NAO_XML_SIM': { label: 'Sem SPED', cls: 'badge-muted' },
};

const FILTERS = ['Todos', 'OK', 'Divergências', 'Elegíveis', 'Sem XML', 'Sem SPED'];

/** Retorna todos os CFOPs presentes em um documento (itens reconciliados + SPED + XML) */
function getCfopsDoc(doc) {
    const cfops = new Set();
    // itens reconciliados (SPED_SIM_XML_SIM)
    for (const item of doc.itensReconciliados || []) {
        if (item.sped?.cfop) cfops.add(item.sped.cfop);
        if (item.xml?.cfop) cfops.add(item.xml.cfop);
    }
    // apenas no SPED (SPED_SIM_XML_NAO)
    for (const item of doc.spedDoc?.itens || []) {
        if (item.cfop) cfops.add(item.cfop);
    }
    // apenas XML (SPED_NAO_XML_SIM)
    for (const item of doc.xmlDoc?.itens || []) {
        if (item.cfop) cfops.add(item.cfop);
    }
    return cfops;
}

export function ReconciliationTable({ docs }) {
    const [filter, setFilter] = useState('Todos');
    const [search, setSearch] = useState('');
    const [cfopFilter, setCfopFilter] = useState('');
    const [expanded, setExpanded] = useState(null);

    const filtered = docs.filter((d) => {
        const matchSearch = !search || d.numDoc.includes(search) || d.chaveNfe.includes(search);
        if (!matchSearch) return false;

        if (cfopFilter) {
            const cfops = getCfopsDoc(d);
            const match = [...cfops].some((c) => c.startsWith(cfopFilter));
            if (!match) return false;
        }

        if (filter === 'Todos') return true;
        if (filter === 'OK') return d.status === 'SPED_SIM_XML_SIM' && d.divergencias?.length === 0;
        if (filter === 'Divergências') return d.divergencias?.length > 0;
        if (filter === 'Elegíveis') return d.elegivel;
        if (filter === 'Sem XML') return d.status === 'SPED_SIM_XML_NAO';
        if (filter === 'Sem SPED') return d.status === 'SPED_NAO_XML_SIM';
        return true;
    });

    return (
        <div className="card">
            <div className="card-title">Cruzamento SPED × XML — {docs.length} documentos</div>

            <div className="filter-bar">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        className={`btn btn-secondary filter-btn ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f}
                    </button>
                ))}
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="CFOP (ex: 2403)"
                        value={cfopFilter}
                        onChange={(e) => setCfopFilter(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{
                            width: 120, background: 'var(--surface-2)', border: `1px solid ${cfopFilter ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius)', padding: '6px 12px', color: 'var(--text)', fontSize: 12,
                        }}
                        title="Filtrar por CFOP (prefixo — ex: '24' para todos os 24xx)"
                    />
                    <input
                        type="text"
                        placeholder="Buscar por nº nota ou chave..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: 220, background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)', padding: '6px 12px', color: 'var(--text)', fontSize: 12,
                        }}
                    />
                </div>
            </div>

            <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                Exibindo {filtered.length} de {docs.length} documentos
                {cfopFilter && <span style={{ marginLeft: 8, color: 'var(--accent)' }}>· CFOP: {cfopFilter}xx</span>}
            </div>

            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nº Nota</th>
                            <th>Dt. Entrada</th>
                            <th>Status</th>
                            <th>Divergências</th>
                            <th>Elegível</th>
                            <th>Base (R$)</th>
                            <th>Alíquota</th>
                            <th>SUV (R$)</th>
                            <th>UF Orig</th>
                            <th>Devolução</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.slice(0, 500).map((doc) => {
                            const totalBase = doc.itensReconciliados?.filter((i) => i.elegivel).reduce((s, i) => s + (i.base || 0), 0) || 0;
                            const totalSuv = doc.itensReconciliados?.filter((i) => i.elegivel).reduce((s, i) => s + (i.suv || 0), 0) || 0;
                            const { label, cls } = STATUS_LABELS[doc.status] || { label: doc.status, cls: 'badge-muted' };
                            const isExp = expanded === doc.chaveNfe;

                            return (
                                <>
                                    <tr key={doc.chaveNfe} style={doc.divergencias?.length > 0 ? { background: 'color-mix(in srgb, var(--danger) 5%, transparent)' } : {}}>
                                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{doc.numDoc}</td>
                                        <td>{doc.dtEntrada}</td>
                                        <td><span className={`badge ${cls}`}>{label}</span></td>
                                        <td>
                                            {doc.divergencias?.length > 0
                                                ? <span className="badge badge-error">{doc.divergencias.length}</span>
                                                : <span className="badge badge-ok">0</span>}
                                        </td>
                                        <td>
                                            {doc.elegivel
                                                ? <span className="badge badge-ok">Sim</span>
                                                : <span className="badge badge-muted">Não</span>}
                                        </td>
                                        <td style={{ color: 'var(--text)' }}>{doc.elegivel ? formatCurrency(totalBase) : '—'}</td>
                                        <td>{doc.aliquota ? `${(doc.aliquota * 100).toFixed(0)}%` : '—'}</td>
                                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                                            {doc.elegivel ? formatCurrency(totalSuv) : '—'}
                                        </td>
                                        <td>{doc.emitUf || '—'}</td>
                                        <td>
                                            {doc.isDevolucao ? <span className="badge badge-warn">Dev.</span> : '—'}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '3px 10px', fontSize: 11 }}
                                                onClick={() => setExpanded(isExp ? null : doc.chaveNfe)}
                                            >
                                                {isExp ? '▲' : '▼'}
                                            </button>
                                        </td>
                                    </tr>
                                    {isExp && (
                                        <tr key={`${doc.chaveNfe}-detail`}>
                                            <td colSpan={11} style={{ padding: 0 }}>
                                                <ItemsDetail items={doc.itensReconciliados} />
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {filtered.length > 500 && (
                <div className="alert alert-info" style={{ marginTop: 12 }}>
                    Exibindo os primeiros 500 resultados. Use os filtros para refinar.
                </div>
            )}
        </div>
    );
}

function ItemsDetail({ items }) {
    if (!items?.length) return <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>Sem itens disponíveis.</div>;
    return (
        <table className="data-table" style={{ background: 'var(--bg)' }}>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>CFOP</th>
                    <th>orig</th>
                    <th>CST</th>
                    <th>vProd XML</th>
                    <th>vFrete</th>
                    <th>vDesc</th>
                    <th>Base</th>
                    <th>SUV</th>
                    <th>Elegível</th>
                    <th>Motivo</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, i) => (
                    <tr key={i} style={item.divergente ? { background: 'color-mix(in srgb, var(--warning) 8%, transparent)' } : {}}>
                        <td>{item.numItem}</td>
                        <td style={{ fontFamily: 'monospace' }}>{item.xml?.cfop || item.sped?.cfop || '—'}</td>
                        <td>{item.xml?.orig ?? '—'}</td>
                        <td>{item.xml?.cst || item.sped?.cstIcms || '—'}</td>
                        <td>{item.xml?.vProd?.toFixed(2) || '—'}</td>
                        <td>{item.xml?.vFrete?.toFixed(2) ?? '0.00'}</td>
                        <td>{item.xml?.vDesc?.toFixed(2) ?? '0.00'}</td>
                        <td>{item.base?.toFixed(2) ?? '—'}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{item.suv ? formatCurrency(item.suv) : '—'}</td>
                        <td>
                            {item.elegivel
                                ? <span className="badge badge-ok">Sim</span>
                                : <span className="badge badge-muted">Não</span>}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.motivoInelegivel || '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
