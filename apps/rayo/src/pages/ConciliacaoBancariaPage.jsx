import { useState, useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useConciliacaoBancaria } from '../hooks/useConciliacaoBancaria';
import { STATUS_BANCO } from '../lib/banco-razao/banco-reconciler';
import {
    IconUpload, IconRefresh, IconX, IconSearch,
    IconDownload, IconWarning, IconCheck,
} from '../components/Icons';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v) {
    if (typeof v !== 'number') return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function absFmt(v) { return fmt(Math.abs(v)); }
function sign(v) { return v > 0.05 ? '+' : v < -0.05 ? '-' : ''; }

// ── Status Config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
    [STATUS_BANCO.CONCILIADO]:    { label: 'Conciliado',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    icon: '✓' },
    [STATUS_BANCO.DIVERGENTE]:    { label: 'Divergente',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '△' },
    [STATUS_BANCO.PENDENTE_RAZAO]:{ label: 'Pend. Razão',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '✕' },
    [STATUS_BANCO.PENDENTE_BANCO]:{ label: 'Pend. Banco',    color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: '?' },
    ANULADO:     { label: 'Anulado',         color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '⊘' },
    ANULADO_INTERNO: { label: 'Int. Anulado', color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '⊘' },
    ESTORNO:     { label: 'Estorno',          color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '↩' },
};

// ── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ label, sublabel, accept, onFile, arquivo, onRemove, accent }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const onDrop = useCallback((e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0]; if (f) onFile(f);
    }, [onFile]);

    const onChange = useCallback((e) => {
        const f = e.target.files[0]; if (f) onFile(f);
        e.target.value = '';
    }, [onFile]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
            <div
                onClick={() => !arquivo && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                    border: `1.5px dashed ${dragging ? accent : arquivo ? 'var(--border)' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '14px 16px',
                    cursor: arquivo ? 'default' : 'pointer',
                    background: dragging ? `${accent}12` : arquivo ? 'var(--bg-secondary)' : 'transparent',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '52px',
                }}
            >
                {arquivo ? (
                    <>
                        <span style={{ color: accent, fontSize: '1.1rem', flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arquivo.name}</span>
                        <button onClick={e => { e.stopPropagation(); onRemove(); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', flexShrink: 0 }}>
                            <IconX size={14} />
                        </button>
                    </>
                ) : (
                    <>
                        <IconUpload size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>{sublabel}</span>
                    </>
                )}
            </div>
            <input ref={inputRef} type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
        </div>
    );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, highlight, sub }) {
    return (
        <div style={{
            padding: '16px 20px', background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: highlight ? `1.5px solid ${highlight}` : '1px solid var(--border)',
            flex: 1, minWidth: '150px',
        }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: highlight || 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
            {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '3px' }}>{sub}</div>}
        </div>
    );
}

// ── NettingPanel ─────────────────────────────────────────────────────────────

function NettingPanel({ resultado }) {
    const [open, setOpen] = useState(false);
    const ns = resultado.nettingSaldoStats;
    const nr = resultado.nettingRazaoStats;
    const totalAnulados = (ns.anulados || 0) + (nr.anulados || 0);

    return (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <button
                onClick={() => setOpen(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'rgba(100,116,139,0.15)', color: '#64748b', borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem' }}>⊘ {totalAnulados} lançamentos anulados internamente</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>por Netting antes do matching</span>
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{open ? '▾' : '▸'}</span>
            </button>

            {open && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Saldo Stats */}
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.06em' }}>
                            Fonte B — Saldo da Conta
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span>Total lido: <strong>{ns.total}</strong></span>
                            <span>Estornos explícitos ("Anular entrada..."): <strong style={{ color: '#ef4444' }}>{ns.estornosExplicitos || 0}</strong></span>
                            <span>Anulados internos (par Déb/Créd): <strong style={{ color: '#f59e0b' }}>{ns.anuladosInternos || 0}</strong></span>
                            <span>Disponíveis para matching: <strong style={{ color: '#22c55e' }}>{ns.ativos}</strong></span>
                        </div>
                        {/* Lista de anulados */}
                        {resultado.saldoAnulados.length > 0 && (
                            <div style={{ marginTop: '10px', maxHeight: '140px', overflowY: 'auto' }}>
                                {resultado.saldoAnulados.map((l, i) => {
                                    const cfg = STATUS_CFG[l.status] || STATUS_CFG.ANULADO;
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: '0.75rem' }}>
                                            <span style={{ color: cfg.color, fontWeight: 700, flexShrink: 0 }}>{cfg.icon}</span>
                                            <span style={{ color: 'var(--text-tertiary)', flexShrink: 0, fontFamily: 'monospace' }}>#{l.nrOrigem}</span>
                                            <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detalhes}</span>
                                            <span style={{ color: l.debito > 0 ? '#22c55e' : '#ef4444', fontFamily: 'monospace', flexShrink: 0 }}>{l.debito > 0 ? fmt(l.debito) : `-${fmt(l.credito)}`}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Razao Stats */}
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.06em' }}>
                            Fonte A — Razão Interno
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span>Total lido: <strong>{nr.total}</strong></span>
                            <span>Anulados internos (par Déb/Créd): <strong style={{ color: '#f59e0b' }}>{nr.anuladosInternos || 0}</strong></span>
                            <span>Disponíveis para matching: <strong style={{ color: '#22c55e' }}>{nr.ativos}</strong></span>
                        </div>
                        {resultado.razaoAnulados.length > 0 && (
                            <div style={{ marginTop: '10px', maxHeight: '140px', overflowY: 'auto' }}>
                                {resultado.razaoAnulados.map((l, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: '0.75rem' }}>
                                        <span style={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>⊘</span>
                                        <span style={{ color: 'var(--text-tertiary)', flexShrink: 0, fontFamily: 'monospace' }}>#{l.doc}</span>
                                        <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nome} {l.detalhes}</span>
                                        <span style={{ color: l.debito > 0 ? '#22c55e' : '#ef4444', fontFamily: 'monospace', flexShrink: 0 }}>{l.debito > 0 ? fmt(l.debito) : `-${fmt(l.credito)}`}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filtroStatus, setFiltroStatus, contadores }) {
    const filters = [
        { key: 'TODOS', label: 'Todos', count: contadores.total },
        { key: STATUS_BANCO.DIVERGENTE, label: 'Divergentes', count: contadores.divergentes },
        { key: STATUS_BANCO.PENDENTE_RAZAO, label: 'Pend. Razão', count: contadores.pendentesRazao },
        { key: STATUS_BANCO.PENDENTE_BANCO, label: 'Pend. Banco', count: contadores.pendentesBanco },
        { key: STATUS_BANCO.CONCILIADO, label: 'Conciliados', count: contadores.conciliados },
    ];

    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {filters.map(f => {
                const active = filtroStatus === f.key;
                const cfg = STATUS_CFG[f.key];
                const activeColor = cfg ? cfg.color : 'var(--accent)';
                return (
                    <button key={f.key} onClick={() => setFiltroStatus(f.key)}
                        style={{
                            padding: '6px 14px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                            border: `1.5px solid ${active ? activeColor : 'var(--border)'}`,
                            background: active ? (cfg ? cfg.bg : 'rgba(99,102,241,0.1)') : 'transparent',
                            color: active ? activeColor : 'var(--text-secondary)',
                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                        {f.label}
                        <span style={{
                            background: active ? activeColor : 'var(--bg-tertiary)',
                            color: active ? 'white' : 'var(--text-secondary)',
                            borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700,
                        }}>{f.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = STATUS_CFG[status] || STATUS_CFG[STATUS_BANCO.PENDENTE_BANCO];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700,
            color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
        }}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

// ── Result Row ───────────────────────────────────────────────────────────────

const gridLayout = '90px 90px minmax(160px, 1fr) 110px 110px 80px 120px';

function ResultRow({ item, index }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CFG[item.status] || STATUS_CFG[STATUS_BANCO.PENDENTE_BANCO];
    const hasDetail = item.lancamentosRazao.length > 0 || item.lancamentosSaldo.length > 0;

    const chaveDoc = item.razaoDoc || item.saldoNrOrigem || '—';
    const nomeDesc = item.razaoNome || item.saldoDetalhes || '—';
    const dataStr = item.razaoDataStr || item.saldoDataStr || '—';

    // Valor de referência: use saldo (Fonte B) como âncora, ou Razão se só tiver Razão
    const valorRef = item.lancamentosSaldo.length > 0 ? item.saldoCdML : item.razaoValor;
    const valorRazao = item.razaoValor;
    const contaContrapartida = item.saldoContaContrapartida || item.razaoDetalhes || '';

    return (
        <div style={{ borderBottom: '1px solid var(--border)', width: '100%' }}>
            <div
                onClick={() => hasDetail && setExpanded(p => !p)}
                style={{
                    display: 'grid', gridTemplateColumns: gridLayout, alignItems: 'center',
                    borderLeft: `3px solid ${cfg.color}`,
                    cursor: hasDetail ? 'pointer' : 'default',
                    background: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                    transition: 'background 0.15s',
                }}
            >
                {/* Doc/Nr Origem */}
                <div style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    #{chaveDoc}
                </div>
                {/* Data */}
                <div style={{ padding: '10px 10px', fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                    {dataStr}
                </div>
                {/* Nome/Descrição */}
                <div style={{ padding: '10px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div>{nomeDesc}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contaContrapartida}</div>
                </div>
                {/* Valor Saldo (Fonte B) */}
                <div style={{ padding: '10px 10px', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)', textAlign: 'right' }}>
                    {item.lancamentosSaldo.length > 0 ? fmt(Math.abs(valorRef)) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                </div>
                {/* Valor Razão (Fonte A) */}
                <div style={{ padding: '10px 10px', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)', textAlign: 'right' }}>
                    {item.lancamentosRazao.length > 0 ? fmt(Math.abs(valorRazao)) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                </div>
                {/* Delta */}
                <div style={{ padding: '10px 10px', fontFamily: 'monospace', fontSize: '0.82rem', textAlign: 'right', fontWeight: 700, color: item.status === STATUS_BANCO.CONCILIADO ? '#22c55e' : cfg.color }}>
                    {item.status === STATUS_BANCO.CONCILIADO ? 'OK' : absFmt(item.deltaAbs)}
                </div>
                {/* Status */}
                <div style={{ padding: '10px 10px', textAlign: 'center' }}>
                    <StatusBadge status={item.status} />
                </div>
            </div>

            {/* Detalhe expandido */}
            {expanded && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px 12px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Fonte A */}
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>Razão Interno (Fonte A)</div>
                        {item.lancamentosRazao.length === 0 ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Não encontrado</span>
                        ) : item.lancamentosRazao.map((l, i) => (
                            <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span><strong>Doc:</strong> {l.doc} &nbsp; <strong>Nome:</strong> {l.nome}</span>
                                <span><strong>Detalhes:</strong> {l.detalhes}</span>
                                <span><strong>Pag.:</strong> {l.dataPgtoStr} &nbsp;
                                    <strong style={{ color: '#22c55e' }}>Déb:</strong> {fmt(l.debito)} &nbsp;
                                    <strong style={{ color: '#ef4444' }}>Cré:</strong> {fmt(l.credito)}
                                </span>
                            </div>
                        ))}
                    </div>
                    {/* Fonte B */}
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>Saldo da Conta (Fonte B)</div>
                        {item.lancamentosSaldo.length === 0 ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Não encontrado</span>
                        ) : item.lancamentosSaldo.map((l, i) => (
                            <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span><strong>Nº Origem:</strong> {l.nrOrigem} &nbsp; <strong>Conta:</strong> {l.contaContrapartida}</span>
                                <span><strong>Detalhes:</strong> {l.detalhes}</span>
                                <span><strong>Data:</strong> {l.dataStr} &nbsp;
                                    <strong>C/D (ML):</strong> <span style={{ color: l.cdML > 0 ? '#22c55e' : '#ef4444', fontFamily: 'monospace' }}>{fmt(l.cdML)}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Legenda ──────────────────────────────────────────────────────────────────

const LEGENDA = [
    { status: STATUS_BANCO.DIVERGENTE, titulo: 'Divergente', desc: 'Lançamento encontrado nas duas fontes, mas com valores diferentes. Verificar se há erro de digitação, rateio ou data de competência errada.' },
    { status: STATUS_BANCO.PENDENTE_RAZAO, titulo: 'Pendente Razão', desc: 'Existe no Saldo Contábil (Fonte B) mas não tem par no Razão Interno (Fonte A). Possível falta de escrituração.' },
    { status: STATUS_BANCO.PENDENTE_BANCO, titulo: 'Pendente Banco', desc: 'Existe no Razão Interno (Fonte A) mas não tem par no Saldo Contábil (Fonte B). Possível lançamento digitado manualmente sem integração.' },
    { status: STATUS_BANCO.CONCILIADO, titulo: 'Conciliado', desc: 'Match perfeito entre as duas fontes. Diferença ≤ R$ 0,05. Nenhuma ação necessária.' },
];

function Legenda() {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ fontSize: '0.78rem' }}>
            <button onClick={() => setOpen(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
                {open ? '▾' : '▸'} {open ? 'Esconder legenda' : 'O que significa cada status?'}
            </button>
            {open && (
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                    {LEGENDA.map(item => {
                        const cfg = STATUS_CFG[item.status];
                        return (
                            <div key={item.status} style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
                                <div style={{ fontWeight: 800, color: cfg.color, fontSize: '0.82rem', marginBottom: '5px' }}>{cfg.icon} {item.titulo}</div>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55, fontSize: '0.75rem' }}>{item.desc}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ConciliacaoBancariaPage() {
    const {
        arquivoRazao, arquivoSaldo,
        setArquivoRazao, setArquivoSaldo,
        status, erro, resultado, resultadosFiltrados,
        filtroStatus, setFiltroStatus,
        buscaTexto, setBuscaTexto,
        processar, limpar, pronto, processing,
    } = useConciliacaoBancaria();

    const accentA = '#6366f1'; // Razão — índigo
    const accentB = '#0ea5e9'; // Saldo — azul

    const diferencaGeral = resultado?.diferencaGeral ?? 0;
    const diferencaColor = Math.abs(diferencaGeral) <= 0.05 ? '#22c55e' : '#ef4444';

    // ── Export ──────────────────────────────────────────────────────────────
    const handleExport = () => {
        if (!resultado) return;
        const data = resultadosFiltrados.map(r => ({
            'Doc / Nº Origem': r.razaoDoc || r.saldoNrOrigem || '',
            'Data': r.razaoDataStr || r.saldoDataStr || '',
            'Nome / Descrição': r.razaoNome || r.saldoDetalhes || '',
            'Conta Contrapartida': r.saldoContaContrapartida || r.razaoDetalhes || '',
            'Valor Saldo (B)': r.lancamentosSaldo.length > 0 ? r.saldoCdML : '',
            'Valor Razão (A)': r.lancamentosRazao.length > 0 ? r.razaoValor : '',
            'Delta': r.delta,
            'Status': STATUS_CFG[r.status]?.label || r.status,
        }));

        // Tab Netting
        const nettingData = [
            ...resultado.saldoAnulados.map(l => ({
                Fonte: 'Saldo (B)', Doc: l.nrOrigem, Detalhes: l.detalhes,
                Débito: l.debito, Crédito: l.credito, Status: STATUS_CFG[l.status]?.label || l.status,
            })),
            ...resultado.razaoAnulados.map(l => ({
                Fonte: 'Razão (A)', Doc: l.doc, Detalhes: l.detalhes || l.nome,
                Débito: l.debito, Crédito: l.credito, Status: STATUS_CFG[l.status]?.label || l.status,
            })),
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Conciliação');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nettingData), 'Lançamentos Anulados');
        XLSX.writeFile(wb, `ConciliacaoBancaria_${Date.now()}.xlsx`);
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Conciliação Bancária' }]}>

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-card/50 p-4 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                        <IconSearch size={16} className="text-sky-500" />
                    </div>
                    <h2 className="text-xl font-display font-bold">Conciliação Bancária</h2>
                    <span className="text-xs px-2 py-1 border border-border rounded-full text-muted-foreground">Netting</span>
                </div>
                <div className="flex items-center gap-2">
                    {resultado && (
                        <button onClick={limpar} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors text-sm font-medium">
                            <IconRefresh size={14} /> Nova Análise
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">

                {/* ── Upload Section ── */}
                {!resultado && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.03em' }}>
                                Conciliação Bancária com Netting
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                Carregue o <strong>Razão Interno</strong> e o <strong>Saldo da Conta Contábil</strong> para identificar divergências. O motor de Netting remove automaticamente os lançamentos anulados antes do cruzamento.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                            {/* Fonte A */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: accentA, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 800 }}>A</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Razão Interno (Fonte A)</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>razao-planilha.xlsx — movimentação com Doc, Débito e Crédito</div>
                                    </div>
                                </div>
                                <DropZone
                                    label="Arquivo Razão"
                                    sublabel="Solte razao-planilha.xlsx aqui"
                                    accept=".xlsx,.xls"
                                    arquivo={arquivoRazao}
                                    onFile={setArquivoRazao}
                                    onRemove={() => setArquivoRazao(null)}
                                    accent={accentA}
                                />
                                <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                    <div>Colunas esperadas: <strong>Doc · Nome · Detalhes · Data Vcto · Data Pag. · Débito · Crédito</strong></div>
                                    <div>A coluna <strong>Doc</strong> é a chave de cruzamento com o Nº Origem do Saldo.</div>
                                </div>
                            </div>

                            {/* Fonte B */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: accentB, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 800 }}>B</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Saldo da Conta (Fonte B)</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Exportação ERP — inclui lançamentos de anulação</div>
                                    </div>
                                </div>
                                <DropZone
                                    label="Arquivo Saldo"
                                    sublabel="Solte Saldo da conta...xlsx aqui"
                                    accept=".xlsx,.xls"
                                    arquivo={arquivoSaldo}
                                    onFile={setArquivoSaldo}
                                    onRemove={() => setArquivoSaldo(null)}
                                    accent={accentB}
                                />
                                <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                    <div>Colunas esperadas: <strong>#, Data, Nº transação, Origem, Nº origem, Conta Contrapartida, Detalhes, C/D (ML), Saldo Acumulado, Débito, Crédito</strong></div>
                                    <div>Lançamentos com <em>"Anular entrada para pagamento nº XXXXX"</em> são detectados como estornos.</div>
                                </div>
                            </div>
                        </div>

                        {/* Como funciona */}
                        <div style={{ padding: '18px 20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Como o Netting funciona</div>
                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>1.</span>
                                    <span><strong>Saneamento:</strong> detecta lançamentos com "Anular entrada para pagamento nº X" e pares Déb/Créd de mesmo valor → marcados como Anulados</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>2.</span>
                                    <span><strong>Matching:</strong> cruza os lançamentos líquidos usando <strong>Doc === Nº Origem</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>3.</span>
                                    <span><strong>Sobras:</strong> o que não casou vira Pendente Razão ou Pendente Banco</span>
                                </div>
                            </div>
                        </div>

                        {erro && (
                            <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <IconWarning size={16} /> {erro}
                            </div>
                        )}

                        <button
                            onClick={processar}
                            disabled={!pronto || processing}
                            style={{
                                alignSelf: 'flex-start', padding: '12px 32px', borderRadius: 'var(--radius-md)',
                                background: pronto ? `linear-gradient(135deg, ${accentA}, ${accentB})` : 'var(--bg-secondary)',
                                color: pronto ? 'white' : 'var(--text-tertiary)',
                                border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: pronto ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: pronto ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {processing
                                ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Processando...</>
                                : <><IconSearch size={16} /> Iniciar Análise com Netting</>
                            }
                        </button>
                    </div>
                )}

                {/* ── Results Section ── */}
                {resultado && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease-out' }}>

                        {/* Totais */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <StatCard label="Conta" value={resultado.contaNome || '—'} sub="identificada no Saldo" />
                            <StatCard label="Total Saldo (B)" value={fmt(resultado.totalSaldo)} />
                            <StatCard label="Total Razão (A)" value={fmt(resultado.totalRazao)} />
                            <StatCard label="Diferença Geral" value={absFmt(diferencaGeral)} highlight={diferencaColor}
                                sub={Math.abs(diferencaGeral) <= 0.05 ? 'OK — fontes batem' : diferencaGeral > 0 ? 'Falta no Saldo' : 'Falta no Razão'} />
                            <StatCard label="Divergentes" value={resultado.contadores.divergentes}
                                highlight={resultado.contadores.divergentes > 0 ? '#f59e0b' : undefined} />
                            <StatCard label="Pendências" value={resultado.contadores.pendentesRazao + resultado.contadores.pendentesBanco}
                                highlight={(resultado.contadores.pendentesRazao + resultado.contadores.pendentesBanco) > 0 ? '#ef4444' : undefined} />
                        </div>

                        {/* Info */}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span>Fonte A: <strong style={{ color: 'var(--text-secondary)' }}>{resultado.nomeArquivoRazao}</strong></span>
                            <span>Fonte B: <strong style={{ color: 'var(--text-secondary)' }}>{resultado.nomeArquivoSaldo}</strong></span>
                        </div>

                        {/* Netting Panel */}
                        <NettingPanel resultado={resultado} />

                        <Legenda />

                        {/* Filter + Busca + Export */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                                <FilterBar filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus} contadores={resultado.contadores} />
                                {/* Busca */}
                                <div style={{ position: 'relative', minWidth: '200px' }}>
                                    <IconSearch size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar doc, nome, conta..."
                                        value={buscaTexto}
                                        onChange={e => setBuscaTexto(e.target.value)}
                                        style={{
                                            paddingLeft: '30px', paddingRight: '10px', paddingTop: '6px', paddingBottom: '6px',
                                            borderRadius: '999px', border: '1.5px solid var(--border)',
                                            background: 'transparent', color: 'var(--text-primary)', fontSize: '0.78rem',
                                            outline: 'none', width: '100%',
                                        }}
                                    />
                                </div>
                            </div>
                            <button onClick={handleExport} style={{
                                padding: '8px 16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700,
                            }}>
                                <IconDownload size={16} /> Exportar XLSX
                            </button>
                        </div>

                        {/* Table */}
                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <div style={{ minWidth: '900px' }}>
                                    {/* Header */}
                                    <div style={{ display: 'grid', gridTemplateColumns: gridLayout, alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                        {['Doc/Origem', 'Data', 'Nome / Detalhes', 'Valor Saldo (B)', 'Valor Razão (A)', 'Delta', 'Status'].map(h => (
                                            <div key={h} style={{ padding: '10px 12px', textAlign: ['Valor Saldo (B)', 'Valor Razão (A)', 'Delta'].includes(h) ? 'right' : h === 'Status' ? 'center' : 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                {h}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Body */}
                                    {resultadosFiltrados.length === 0 ? (
                                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                            Nenhum resultado para este filtro
                                        </div>
                                    ) : (
                                        <Virtuoso
                                            style={{ height: '520px' }}
                                            data={resultadosFiltrados}
                                            itemContent={(index, item) => (
                                                <ResultRow key={`${item.razaoDoc || item.saldoNrOrigem}-${index}`} item={item} index={index} />
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Clique em uma linha para ver os detalhes de cada fonte</span>
                                <span>{resultadosFiltrados.length} de {resultado.contadores.total} registros</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </AppLayout>
    );
}
