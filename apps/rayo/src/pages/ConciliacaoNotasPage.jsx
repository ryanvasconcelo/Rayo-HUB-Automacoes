import { useState, useRef, useCallback } from 'react';
import { useConciliacaoNotas } from '../hooks/useConciliacaoNotas';
import { useFornecedoresNotas } from '../hooks/useFornecedoresNotas';
import { useTheme } from '../hooks/useTheme';
import { STATUS } from '../lib/conciliacao-notas/notas-reconciler';
import { Virtuoso } from 'react-virtuoso';
import * as XLSX from 'xlsx';
import {
    IconUpload, IconRefresh, IconWarning, IconX,
    IconSearch, IconSun, IconMoon, IconDownload
} from '../components/Icons';
import { Link } from 'react-router-dom';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v) {
    if (typeof v !== 'number' || isNaN(v)) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function absFmt(v) { return fmt(Math.abs(v)); }

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    [STATUS.CONCILIADO]:     { label: 'Conciliado',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: '✓' },
    [STATUS.INVESTIGAR]:     { label: 'Investigar',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '△' },
    [STATUS.INCONSISTENCIA]: { label: 'Inconsistência',color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '✕' },
    [STATUS.SEM_RELATORIO]:  { label: 'Sem Relatório', color: '#6366f1', bg: 'rgba(99,102,241,0.12)',icon: '?' },
};

// ── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ label, sublabel, accept, onFile, arquivo, onRemove, accent }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const handleDrop = useCallback((e) => {
        e.preventDefault(); setDragging(false);
        const file = e.dataTransfer.files[0]; if (file) onFile(file);
    }, [onFile]);
    const handleChange = useCallback((e) => {
        const file = e.target.files[0]; if (file) onFile(file); e.target.value = '';
    }, [onFile]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
            <div onClick={() => !arquivo && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)} onDrop={handleDrop}
                style={{ border: `1.5px dashed ${dragging ? accent : arquivo ? 'var(--border)' : 'var(--glass-border)'}`, borderRadius: 'var(--radius-md)', padding: '14px 16px', cursor: arquivo ? 'default' : 'pointer', background: dragging ? `${accent}12` : arquivo ? 'var(--bg-secondary)' : 'transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '52px' }}>
                {arquivo ? (<>
                    <span style={{ color: accent, fontSize: '1.1rem', flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arquivo.name}</span>
                    <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', flexShrink: 0 }}><IconX size={14} /></button>
                </>) : (<>
                    <IconUpload size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>{sublabel}</span>
                </>)}
            </div>
            <input ref={inputRef} type="file" accept={accept} onChange={handleChange} style={{ display: 'none' }} />
        </div>
    );
}

// ── TotalCard ────────────────────────────────────────────────────────────────

function TotalCard({ label, value, highlight, small }) {
    return (
        <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: highlight ? `1.5px solid ${highlight}` : '1px solid var(--border)', flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: small ? '1rem' : '1.25rem', fontWeight: 800, color: highlight || 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status];
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>{cfg.icon} {cfg.label}</span>;
}

function FilterBar({ filtroStatus, setFiltroStatus, contadores }) {
    const filters = [
        { key: 'TODOS',               label: 'Todos',           count: Object.values(contadores).reduce((a, b) => a + b, 0) },
        { key: STATUS.INCONSISTENCIA, label: 'Inconsistências', count: contadores.inconsistencias },
        { key: STATUS.INVESTIGAR,     label: 'Investigar',      count: contadores.investigar },
        { key: STATUS.CONCILIADO,     label: 'Conciliados',     count: contadores.conciliados },
        { key: STATUS.SEM_RELATORIO,  label: 'Sem Relatório',   count: contadores.semRelatorio },
    ];
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {filters.map(f => {
                const active = filtroStatus === f.key;
                const cfg = STATUS_CONFIG[f.key];
                const activeColor = cfg ? cfg.color : '#0ea5e9';
                return (
                    <button key={f.key} onClick={() => setFiltroStatus(f.key)} style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, border: `1.5px solid ${active ? activeColor : 'var(--border)'}`, background: active ? (cfg ? cfg.bg : 'rgba(14,165,233,0.1)') : 'transparent', color: active ? activeColor : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {f.label}
                        <span style={{ background: active ? activeColor : 'var(--bg-tertiary)', color: active ? 'white' : 'var(--text-secondary)', borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>{f.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Result Table ─────────────────────────────────────────────────────────────

const gridLayout = '90px minmax(180px, 1fr) 130px 130px 120px 150px 80px';

function ResultCard({ item, index }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CONFIG[item.status];
    const hasDetails = item.lancamentosRazao.length > 0 || item.parcelas.length > 0;
    return (
        <div style={{ borderBottom: '1px solid var(--border)', width: '100%' }}>
            <div onClick={() => hasDetails && setExpanded(p => !p)}
                style={{ display: 'grid', gridTemplateColumns: gridLayout, alignItems: 'center', borderLeft: `3px solid ${cfg.color}`, cursor: hasDetails ? 'pointer' : 'default', background: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', transition: 'background 0.15s' }}>
                <div style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{item.numeroNota}</div>
                <div style={{ padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.nome || <span style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>{item.descrnat || '–'}</span>}
                </div>
                <div style={{ padding: '10px 14px', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)', textAlign: 'right' }}>
                    {item.totalVlrFin > 0 ? fmt(item.totalVlrFin) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                </div>
                <div style={{ padding: '10px 14px', fontSize: '0.82rem', fontFamily: 'monospace', textAlign: 'right', color: item.totalCreditoRazao > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {item.totalCreditoRazao > 0 ? fmt(item.totalCreditoRazao) : 'Não encontrado'}
                </div>
                <div style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.82rem', textAlign: 'right', fontWeight: 700, color: Math.abs(item.delta) < 0.05 ? '#22c55e' : cfg.color }}>
                    {Math.abs(item.delta) < 0.05 ? 'R$ 0,00' : (
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span>{absFmt(item.delta)}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: item.delta > 0 ? '#ef4444' : '#f59e0b' }}>
                                {item.delta > 0 ? 'Falta no Razão' : 'A mais no Razão'}
                            </span>
                        </span>
                    )}
                </div>
                <div style={{ padding: '10px 14px', textAlign: 'center' }}><StatusBadge status={item.status} /></div>
                <div style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    {item.parcelas.length > 0 ? `${item.parcelas.length}x` : '—'}
                </div>
            </div>
            {expanded && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px 14px 28px' }}>
                    {item.parcelas.length > 0 && (<>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PARCELAS — RELATÓRIO</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                            <thead><tr style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                                <th style={{ textAlign: 'left', padding: '2px 8px', fontWeight: 600 }}>Nro. Fin.</th>
                                <th style={{ textAlign: 'right', padding: '2px 8px', fontWeight: 600 }}>Valor</th>
                                <th style={{ textAlign: 'center', padding: '2px 8px', fontWeight: 600 }}>Vencimento</th>
                                <th style={{ textAlign: 'center', padding: '2px 8px', fontWeight: 600 }}>Situação</th>
                            </tr></thead>
                            <tbody>
                                {item.parcelas.map((p, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.nufin || '—'}</td>
                                        <td style={{ padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'right', color: 'var(--text-primary)' }}>{fmt(p.vlrfin)}</td>
                                        <td style={{ padding: '4px 8px', fontSize: '0.78rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{p.dtVencStr || '—'}</td>
                                        <td style={{ padding: '4px 8px', fontSize: '0.72rem', textAlign: 'center' }}>
                                            <span style={{ color: p.quitado ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>{p.quitado ? '✓ Quitado' : '● Em aberto'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>)}
                    {item.lancamentosRazao.length > 0 && (<>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LANÇAMENTOS — RAZÃO NBS</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                                <th style={{ textAlign: 'left', padding: '2px 8px', fontWeight: 600 }}>Data</th>
                                <th style={{ textAlign: 'left', padding: '2px 8px', fontWeight: 600 }}>Histórico</th>
                                <th style={{ textAlign: 'right', padding: '2px 8px', fontWeight: 600 }}>Débito</th>
                                <th style={{ textAlign: 'right', padding: '2px 8px', fontWeight: 600 }}>Crédito</th>
                            </tr></thead>
                            <tbody>
                                {item.lancamentosRazao.map((l, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{l.dataStr}</td>
                                        <td style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.historico}</td>
                                        <td style={{ padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'right', color: l.debito > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{l.debito > 0 ? fmt(l.debito) : '—'}</td>
                                        <td style={{ padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'right', color: l.credito > 0 ? '#22c55e' : 'var(--text-tertiary)' }}>{l.credito > 0 ? fmt(l.credito) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>)}
                </div>
            )}
        </div>
    );
}

// ── Panel de Resultado Compartilhado ─────────────────────────────────────────

function ResultPanel({ resultado, resultadosFiltrados, filtroStatus, setFiltroStatus, onExport }) {
    const diferencaColor = Math.abs(resultado.diferencaGeral) < 0.05 ? '#22c55e' : '#ef4444';
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <TotalCard label="Total Relatório" value={fmt(resultado.totalRelatorio)} />
                <TotalCard label="Total Créditos Razão" value={fmt(resultado.totalCreditoRazao)} />
                <TotalCard label="Diferença Geral" value={absFmt(resultado.diferencaGeral)} highlight={diferencaColor} />
                <TotalCard label="🔴 Inconsistências" value={resultado.contadores.inconsistencias} highlight={resultado.contadores.inconsistencias > 0 ? '#ef4444' : undefined} small />
                <TotalCard label="📋 Notas" value={resultado.resultados.length} small />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {resultado.contaNome && <span>📋 Conta: <strong style={{ color: 'var(--text-secondary)' }}>{resultado.contaNome}</strong></span>}
                <span>📁 Razão: <strong style={{ color: 'var(--text-secondary)' }}>{resultado.nomeRazao}</strong></span>
                <span>📁 Relatório: <strong style={{ color: 'var(--text-secondary)' }}>{resultado.nomeTitulos || resultado.nomeRelatorio}</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <FilterBar filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus} contadores={resultado.contadores} />
                <button onClick={onExport} style={{ padding: '8px 16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <IconDownload size={16} /> Exportar XLSX
                </button>
            </div>
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: '940px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: gridLayout, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                            {['Nº Nota', 'Fornecedor / Cliente', 'Vlr. Relat.', 'Crédito Razão', 'Delta', 'Status', 'Parcelas'].map(h => (
                                <div key={h} style={{ padding: '10px 14px', textAlign: h === 'Nº Nota' || h === 'Fornecedor / Cliente' ? 'left' : 'right', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {h === 'Status' || h === 'Parcelas' ? <span style={{ display: 'block', textAlign: 'center' }}>{h}</span> : h}
                                </div>
                            ))}
                        </div>
                        {resultadosFiltrados.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Nenhum resultado para este filtro</div>
                        ) : (
                            <Virtuoso style={{ height: '480px' }} data={resultadosFiltrados} itemContent={(index, item) => <ResultCard key={`${item.numeroNota}-${index}`} item={item} index={index} />} />
                        )}
                    </div>
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Clique em uma linha para ver parcelas e lançamentos</span>
                    <span>{resultadosFiltrados.length} notas</span>
                </div>
            </div>
        </div>
    );
}

// ── Sub-módulo: Upload + Processar ───────────────────────────────────────────

function UploadPanel({ config, hook }) {
    const { fileA, fileB, onSetA, onSetB, resultado, erro, status, processar, limpar, filtroStatus, setFiltroStatus, resultadosFiltrados } = hook;
    const pronto = !!fileA && !!fileB;
    const processing = status === 'processing';

    const handleExport = () => {
        if (!resultado) return;
        const data = resultadosFiltrados.map(item => ({
            'Nº Nota': item.numeroNota,
            'Parceiro': item.nome || '',
            'Vlr. Relatório': item.totalVlrFin,
            'Crédito Razão': item.totalCreditoRazao,
            'Delta': item.delta,
            'Status': STATUS_CONFIG[item.status]?.label || item.status,
            'Parcelas': item.parcelas.length,
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Conciliação');
        XLSX.writeFile(wb, `Conciliacao_${config.tag}_${Date.now()}.xlsx`);
    };

    if (resultado) {
        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-8px' }}>
                    <button onClick={limpar} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem' }}>
                        <IconRefresh size={14} /> Nova Análise
                    </button>
                </div>
                <ResultPanel resultado={resultado} resultadosFiltrados={resultadosFiltrados} filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus} onExport={handleExport} />
            </>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{config.descricao}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: config.accentA, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 800 }}>R</div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Razão Contábil (NBS)</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{config.subtitleA}</div>
                        </div>
                    </div>
                    <DropZone label="Arquivo do Razão" sublabel="Solte o arquivo XLS/XLSX aqui" accept=".xlsx,.xls" arquivo={fileA} onFile={onSetA} onRemove={() => onSetA(null)} accent={config.accentA} />
                    <div style={{ marginTop: '14px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.76rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                        {config.hintA}
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: config.accentB, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 800 }}>S</div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Relatório Sankhya</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{config.subtitleB}</div>
                        </div>
                    </div>
                    <DropZone label="Arquivo do Relatório" sublabel="Solte o arquivo XLS/XLSX aqui" accept=".xlsx,.xls" arquivo={fileB} onFile={onSetB} onRemove={() => onSetB(null)} accent={config.accentB} />
                    <div style={{ marginTop: '14px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.76rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                        {config.hintB}
                    </div>
                </div>
            </div>
            {erro && (
                <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <IconWarning size={16} /> {erro}
                </div>
            )}
            <button onClick={processar} disabled={!pronto || processing}
                style={{ alignSelf: 'flex-start', padding: '12px 32px', borderRadius: 'var(--radius-md)', background: pronto ? `linear-gradient(135deg, ${config.accentA}, ${config.accentB})` : 'var(--bg-secondary)', color: pronto ? 'white' : 'var(--text-tertiary)', border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: pronto ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: pronto ? `0 4px 14px ${config.accentA}55` : 'none', transition: 'all 0.2s' }}>
                {processing ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Processando...</> : <><IconSearch size={16} /> Iniciar Análise</>}
            </button>
        </div>
    );
}

// ── Tabs config ──────────────────────────────────────────────────────────────

const TABS = [
    { id: 'clientes',      label: '👥 Clientes a Receber',  color: '#0ea5e9' },
    { id: 'fornecedores',  label: '🏭 Fornecedores a Pagar', color: '#f97316' },
];

// ── Página Principal ─────────────────────────────────────────────────────────

export default function ConciliacaoNotasPage() {
    const { theme, toggle } = useTheme();
    const [activeTab, setActiveTab] = useState('clientes');

    // ── Sub-módulo Clientes ──
    const clientesHook = useConciliacaoNotas();
    // ── Sub-módulo Fornecedores ──
    const fornHook = useFornecedoresNotas();

    const clientesUIHook = {
        fileA: clientesHook.arquivoRazao, fileB: clientesHook.arquivoRelatorio,
        onSetA: clientesHook.setArquivoRazao, onSetB: clientesHook.setArquivoRelatorio,
        resultado: clientesHook.resultado, resultadosFiltrados: clientesHook.resultadosFiltrados,
        status: clientesHook.status, erro: clientesHook.erro,
        processar: clientesHook.processar, limpar: clientesHook.limpar,
        filtroStatus: clientesHook.filtroStatus, setFiltroStatus: clientesHook.setFiltroStatus,
    };

    const fornUIHook = {
        fileA: fornHook.arquivoRazao, fileB: fornHook.arquivoTitulos,
        onSetA: fornHook.setArquivoRazao, onSetB: fornHook.setArquivoTitulos,
        resultado: fornHook.resultado, resultadosFiltrados: fornHook.resultadosFiltrados,
        status: fornHook.status, erro: fornHook.erro,
        processar: fornHook.processar, limpar: fornHook.limpar,
        filtroStatus: fornHook.filtroStatus, setFiltroStatus: fornHook.setFiltroStatus,
    };

    const CONFIGS = {
        clientes: {
            tag: 'Clientes',
            accentA: '#0ea5e9', accentB: '#38bdf8',
            descricao: 'Cruzamento Razão NBS × Relatório Sankhya pelo Número da Nota. Identifica divergências em adiantamentos de clientes automaticamente.',
            subtitleA: 'Ex: "13 - CLIENTE A RECEBER.xls"',
            subtitleB: '"Clientes a Receber" exportado do Sankhya',
            hintA: <>Campo <strong>Histórico</strong> contém o número após <code>"Conf "</code> — ex: "Compensação Conf 000682..." → nota 682</>,
            hintB: <>Coluna <strong>numnota</strong> é a chave. Múltiplas linhas = parcelas (somadas).</>,
        },
        fornecedores: {
            tag: 'Fornecedores',
            accentA: '#f97316', accentB: '#fb923c',
            descricao: 'Cruzamento Razão NBS × Títulos em Aberto (Sankhya) pelo Número da NF. Identifica NFs sem baixa contábil ou com valor divergente.',
            subtitleA: 'Ex: "FORNECEDORES A PAGAR 2026.xls"',
            subtitleB: '"Títulos em Aberto" exportado do Sankhya',
            hintA: <>Campo <strong>Histórico</strong> contém o número após <code>NF</code> — ex: "COMPRA SERVIÇO NF000164..." → nota 164</>,
            hintB: <>Coluna <strong>Nro Nota</strong> é a chave. Múltiplas linhas = parcelas (somadas).</>,
        },
    };

    const accentTab = activeTab === 'clientes' ? '#0ea5e9' : '#f97316';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--glass-border)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: '0.82rem' }}>← Rayo Hub</Link>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${accentTab}, ${accentTab}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
                            <IconSearch size={14} style={{ color: 'white' }} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Conciliação de Notas</span>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 999, color: 'var(--text-tertiary)' }}>MVP</span>
                    </div>
                </div>
                <button onClick={toggle} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
                </button>
            </header>

            <main style={{ flex: 1, padding: '24px 32px', maxWidth: 1300, margin: '0 auto', width: '100%' }}>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
                    {TABS.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{ padding: '10px 20px', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s', background: active ? 'var(--bg-secondary)' : 'transparent', color: active ? tab.color : 'var(--text-tertiary)', borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent', marginBottom: '-1px' }}>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {activeTab === 'clientes' && (
                    <UploadPanel config={CONFIGS.clientes} hook={clientesUIHook} />
                )}
                {activeTab === 'fornecedores' && (
                    <UploadPanel config={CONFIGS.fornecedores} hook={fornUIHook} />
                )}
            </main>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
