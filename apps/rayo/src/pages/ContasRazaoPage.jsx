import { useState, useRef, useCallback } from 'react';
import { useContasRazao } from '../hooks/useContasRazao';
import { useTheme } from '../hooks/useTheme';
import { STATUS } from '../lib/contas-razao/reconciler';
import { Virtuoso } from 'react-virtuoso';
import * as XLSX from 'xlsx';
import {
    IconUpload, IconRefresh, IconWarning, IconCheck, IconX,
    IconSearch, IconSun, IconMoon, IconTrash, IconDownload
} from '../components/Icons';
import { Link } from 'react-router-dom';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(v) {
    if (typeof v !== 'number') return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function absFmt(v) {
    return fmt(Math.abs(v));
}

const STATUS_CONFIG = {
    [STATUS.CONCILIADO]: { label: 'Conciliado', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: '✓' },
    [STATUS.INVESTIGAR]: { label: 'Investigar', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '△' },
    [STATUS.INCONSISTENCIA]: { label: 'Inconsistência', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '✕' },
    [STATUS.SEM_FINANCEIRO]: { label: 'Sem Financeiro', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: '?' },
};

const MES_LABELS = {
    anterior: 'Mês Anterior',
    atual: 'Mês Atual',
    posterior: 'Mês Posterior',
};

// ── Sub-componentes ────────────────────────────────────────────────────────

function DropZone({ label, sublabel, accept, onFile, arquivo, onRemove, accent }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
    }, [onFile]);

    const handleChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) onFile(file);
        e.target.value = '';
    }, [onFile]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
            <div
                onClick={() => !arquivo && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                    border: `1.5px dashed ${dragging ? accent : arquivo ? 'var(--border)' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    cursor: arquivo ? 'default' : 'pointer',
                    background: dragging ? `${accent}12` : arquivo ? 'var(--bg-secondary)' : 'transparent',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    minHeight: '52px',
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
            <input ref={inputRef} type="file" accept={accept} onChange={handleChange} style={{ display: 'none' }} />
        </div>
    );
}

function TotalCard({ label, value, highlight, small }) {
    return (
        <div style={{
            padding: '16px 20px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: highlight ? `1.5px solid ${highlight}` : '1px solid var(--border)',
            flex: 1,
            minWidth: '160px',
        }}>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: small ? '1rem' : '1.25rem', fontWeight: 800, color: highlight || 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
            color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
        }}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

function FilterBar({ filtroStatus, setFiltroStatus, contadores }) {
    const filters = [
        { key: 'TODOS', label: `Todos`, count: Object.values(contadores).reduce((a, b) => a + b, 0) },
        { key: STATUS.INCONSISTENCIA, label: 'Inconsistências', count: contadores.inconsistencias },
        { key: STATUS.INVESTIGAR, label: 'Investigar', count: contadores.investigar },
        { key: STATUS.CONCILIADO, label: 'Conciliados', count: contadores.conciliados },
        { key: STATUS.SEM_FINANCEIRO, label: 'Sem Financeiro', count: contadores.semFinanceiro },
    ];

    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {filters.map(f => {
                const active = filtroStatus === f.key;
                const cfg = STATUS_CONFIG[f.key];
                const activeColor = cfg ? cfg.color : 'var(--accent)';
                return (
                    <button key={f.key} onClick={() => setFiltroStatus(f.key)}
                        style={{
                            padding: '6px 14px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                            border: `1.5px solid ${active ? activeColor : 'var(--border)'}`,
                            background: active ? (cfg ? cfg.bg : 'rgba(99,102,241,0.1)') : 'transparent',
                            color: active ? activeColor : 'var(--text-secondary)',
                            cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '6px',
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

const gridLayout = "100px minmax(180px, 1fr) 120px 120px 120px 140px 140px";

function ResultCard({ item, index }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CONFIG[item.status];
    const isInconsistencia = item.status === STATUS.INCONSISTENCIA;

    return (
        <div style={{ borderBottom: '1px solid var(--border)', width: '100%' }}>
            <div
                onClick={() => item.lancamentosRazao.length > 0 && setExpanded(p => !p)}
                style={{
                    display: 'grid', gridTemplateColumns: gridLayout, alignItems: 'center',
                    borderLeft: `3px solid ${cfg.color}`,
                    cursor: item.lancamentosRazao.length > 0 ? 'pointer' : 'default',
                    background: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                    transition: 'background 0.15s',
                }}
            >
                <div style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    #{item.nrRecibo}
                </div>
                <div style={{ padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.nome || <span style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>–</span>}
                </div>
                <div style={{ padding: '10px 14px', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)', textAlign: 'right' }}>
                    {fmt(item.valorRelatorio)}
                </div>
                <div style={{ padding: '10px 14px', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)', textAlign: 'right' }}>
                    {fmt(item.totalDebitoRazao) === '—' ? <span style={{ color: 'var(--text-tertiary)' }}>Não encontrado</span> : fmt(item.totalDebitoRazao)}
                </div>
                <div style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.82rem', textAlign: 'right', fontWeight: 700, color: isInconsistencia ? cfg.color : Math.abs(item.delta) < 0.05 ? '#22c55e' : cfg.color }}>
                    {isInconsistencia ? absFmt(item.delta) : Math.abs(item.delta) < 0.05 ? 'R$ 0,00' : (
                        item.status === STATUS.INVESTIGAR
                            ? <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <span>{absFmt(item.delta)}</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: item.delta > 0 ? '#f59e0b' : '#ef4444' }}>
                                    {item.delta > 0 ? 'Faltam no Razão' : 'A mais no Razão'}
                                </span>
                            </span>
                            : absFmt(item.delta)
                    )}
                </div>
                <div style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <StatusBadge status={item.status} />
                </div>
                <div style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    {item.mesesEncontrados.length > 0
                        ? item.mesesEncontrados.map(m => MES_LABELS[m] || m).join(', ')
                        : <span style={{ color: cfg.color, fontWeight: 600 }}>Nenhum mês</span>
                    }
                </div>
            </div>
            {expanded && item.lancamentosRazao.length > 0 && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px 12px 28px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 600 }}>LANÇAMENTOS NO RAZÃO</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                                <th style={{ textAlign: 'left', padding: '2px 8px', fontWeight: 600 }}>Data</th>
                                <th style={{ textAlign: 'left', padding: '2px 8px', fontWeight: 600 }}>Histórico</th>
                                <th style={{ textAlign: 'right', padding: '2px 8px', fontWeight: 600 }}>Débito</th>
                                <th style={{ textAlign: 'right', padding: '2px 8px', fontWeight: 600 }}>Crédito</th>
                                <th style={{ textAlign: 'center', padding: '2px 8px', fontWeight: 600 }}>Mês</th>
                            </tr>
                        </thead>
                        <tbody>
                            {item.lancamentosRazao.map((l, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={{ padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{l.dataStr}</td>
                                    <td style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.historico}</td>
                                    <td style={{ padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'right', color: l.debito > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{l.debito > 0 ? fmt(l.debito) : '—'}</td>
                                    <td style={{ padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'right', color: l.credito > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{l.credito > 0 ? fmt(l.credito) : '—'}</td>
                                    <td style={{ padding: '4px 8px', fontSize: '0.72rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>{MES_LABELS[l.mesFonte]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Legenda de Status ────────────────────────────────────────────────────────

const LEGENDA_ITEMS = [
    {
        status: STATUS.INCONSISTENCIA,
        titulo: 'Inconsistência',
        descricao: 'Recibo presente no Relatório Financeiro mas não encontrado no Razão em nenhum dos meses carregados. Provável lote contábil não gerado.',
        acao: 'Verificar se o lote fói gerado no NBS.',
    },
    {
        status: STATUS.INVESTIGAR,
        titulo: 'Investigar',
        descricao: 'Recibo encontrado no Razão, mas o valor do débito diverge do Relatório Financeiro. Pode ser ratião parcial ou lançamento manual.',
        acao: 'Verificar se há rateio não capturado ou ajuste manual no NBS.',
    },
    {
        status: STATUS.CONCILIADO,
        titulo: 'Conciliado',
        descricao: 'Recibo encontrado no Razão e o valor do débito bate com o Relatório Financeiro (diferença ≤ R$0,05). Nenhuma ação necessária.',
        acao: null,
    },
    {
        status: STATUS.SEM_FINANCEIRO,
        titulo: 'Sem Financeiro',
        descricao: 'Débito presente no Razão mas sem par no Relatório Financeiro. Pode ser lançamento de meses anteriores já compensado, tarifa bancária ou conta contábil diferente.',
        acao: 'Ignorar se for de período anterior. Verificar se pertence à conta correta.',
    },
];

function LegendaStatus() {
    const [aberta, setAberta] = useState(false);
    return (
        <div style={{ fontSize: '0.78rem' }}>
            <button
                onClick={() => setAberta(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
            >
                {aberta ? '▾' : '▸'} {aberta ? 'Esconder legenda' : 'O que significa cada status?'}
            </button>
            {aberta && (
                <div style={{
                    marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px'
                }}>
                    {LEGENDA_ITEMS.map(item => {
                        const cfg = STATUS_CONFIG[item.status];
                        return (
                            <div key={item.status} style={{
                                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                                background: cfg.bg, border: `1px solid ${cfg.color}33`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: 800, color: cfg.color, fontSize: '0.82rem' }}>{cfg.icon} {item.titulo}</span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55, fontSize: '0.76rem' }}>{item.descricao}</p>
                                {item.acao && (
                                    <p style={{ color: cfg.color, margin: '6px 0 0', fontWeight: 700, fontSize: '0.73rem' }}>→ {item.acao}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Página Principal ───────────────────────────────────────────────────────

export default function ContasRazaoPage() {
    const { theme, toggle } = useTheme();
    const {
        arquivosRazao, arquivosRelatorio, resultado, resultadosFiltrados,
        status, erro, filtroStatus,
        addArquivoRazao, removeArquivoRazao, setArquivoSaidas, setArquivoSaldo,
        processar, limpar, setFiltroStatus, MES_OPTIONS,
    } = useContasRazao();

    const accentRazao = '#6366f1';
    const accentRelat = '#8b5cf6';

    const pronto = arquivosRazao.length > 0 && (arquivosRelatorio.saidas || arquivosRelatorio.saldo);
    const processing = status === 'processing';

    const diferecaPositiva = resultado && resultado.diferencaGeral > 0.05;
    const diferecaNegativa = resultado && resultado.diferencaGeral < -0.05;
    const diferencaColor = diferecaPositiva || diferecaNegativa ? '#ef4444' : '#22c55e';

    const handleExport = () => {
        if (!resultado) return;
        const data = resultadosFiltrados.map(item => ({
            'Nr. Recibo': item.nrRecibo,
            'Nome/Fornecedor': item.nome || '-',
            'Valor Relatório': item.valorRelatorio,
            'Débito Razão': item.totalDebitoRazao,
            'Diferença (Delta)': item.delta,
            'Status': STATUS_CONFIG[item.status]?.label || item.status,
            'Mês Encontrado': item.mesesEncontrados.map(m => MES_LABELS[m] || m).join(', ')
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Conciliação");
        XLSX.writeFile(wb, `Auditoria_AF_${new Date().getTime()}.xlsx`);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

            {/* Header */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 32px', background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--glass-border)', zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ← Rayo Hub
                    </Link>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: accentRazao, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconSearch size={14} style={{ color: 'white' }} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Auditor de Contas e Razão</span>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 999, color: 'var(--text-tertiary)' }}>MVP</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {resultado && (
                        <button onClick={limpar} style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem',
                        }}>
                            <IconRefresh size={14} /> Nova Análise
                        </button>
                    )}
                    <button onClick={toggle} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
                    </button>
                </div>
            </header>

            <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1300, margin: '0 auto', width: '100%' }}>

                {/* Upload Section */}
                {!resultado && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.03em' }}>
                                Apontador de Inconsistências
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                Carregue o Razão Contábil (até 3 meses) e o Relatório Financeiro (Sifin) para identificar divergências automaticamente.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                            {/* Razão — até 3 meses */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: accentRazao, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 800 }}>R</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Razão Contábil (NBS)</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>XLSX exportado do módulo Contábil</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {MES_OPTIONS.map(mes => {
                                        const arq = arquivosRazao.find(a => a.mesFonte === mes);
                                        return (
                                            <DropZone
                                                key={mes}
                                                label={MES_LABELS[mes]}
                                                sublabel={`Solte o arquivo ${MES_LABELS[mes].toLowerCase()} aqui`}
                                                accept=".xlsx,.xls"
                                                arquivo={arq?.file || null}
                                                onFile={file => addArquivoRazao(file, mes)}
                                                onRemove={() => removeArquivoRazao(mes)}
                                                accent={accentRazao}
                                            />
                                        );
                                    })}
                                </div>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '14px', lineHeight: 1.5 }}>
                                    💡 Para fechar competências entre meses, carregue também o mês anterior e posterior.
                                </p>
                            </div>

                            {/* Relatório Financeiro */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: accentRelat, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 800 }}>F</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Relatório Financeiro (Sifin)</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>XLS de Saídas ou Saldo Acumulado</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <DropZone
                                        label="Saídas do Mês"
                                        sublabel="Adiantamentos já quitados (.xls / .xlsx)"
                                        accept=".xlsx,.xls"
                                        arquivo={arquivosRelatorio.saidas}
                                        onFile={setArquivoSaidas}
                                        onRemove={() => setArquivoSaidas(null)}
                                        accent={accentRelat}
                                    />
                                    <DropZone
                                        label="Saldo Acumulado"
                                        sublabel="Adiantamentos em aberto (.xls / .xlsx)"
                                        accept=".xlsx,.xls"
                                        arquivo={arquivosRelatorio.saldo}
                                        onFile={setArquivoSaldo}
                                        onRemove={() => setArquivoSaldo(null)}
                                        accent={accentRelat}
                                    />
                                </div>
                                <div style={{ marginTop: '24px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Como o cruzamento funciona</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                        <div>1. Extrai <strong>Nr. Recibo</strong> do campo Histórico do Razão</div>
                                        <div>2. Cruza com o Nr. Recibo do Relatório Financeiro</div>
                                        <div>3. Consolida rateios (múltiplas baixas por recibo)</div>
                                        <div>4. Sinaliza o que não fecha em nenhum dos meses carregados</div>
                                    </div>
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
                                background: pronto ? `linear-gradient(135deg, ${accentRazao}, ${accentRelat})` : 'var(--bg-secondary)',
                                color: pronto ? 'white' : 'var(--text-tertiary)',
                                border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: pronto ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: pronto ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {processing ? (
                                <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Processando...</>
                            ) : (
                                <><IconSearch size={16} /> Iniciar Análise</>
                            )}
                        </button>
                    </div>
                )}

                {/* Results Section */}
                {resultado && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease-out' }}>

                        {/* Totais */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <TotalCard label="Total Relatório" value={fmt(resultado.totalRelatorio)} />
                            <TotalCard label="Total Débitos Razão" value={fmt(resultado.totalDebitoRazao)} />
                            <TotalCard
                                label="Diferença Geral"
                                value={absFmt(resultado.diferencaGeral)}
                                highlight={diferencaColor}
                            />
                            <TotalCard label="Saldo Final Razão" value={fmt(resultado.saldoFinalRazao)} small />
                            <TotalCard
                                label="🔴 Inconsistências"
                                value={resultado.contadores.inconsistencias}
                                highlight={resultado.contadores.inconsistencias > 0 ? '#ef4444' : undefined}
                                small
                            />
                        </div>

                        {/* Info da análise + Legenda */}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '-4px' }}>
                            {resultado.contaNome && <span>📋 Conta: <strong style={{ color: 'var(--text-secondary)' }}>{resultado.contaNome}</strong></span>}
                            <span>📁 Relatório: <strong style={{ color: 'var(--text-secondary)' }}>{resultado.nomeRelatorio}</strong></span>
                            <span>📅 Meses carregados: <strong style={{ color: 'var(--text-secondary)' }}>{resultado.mesesCarregados.map(m => MES_LABELS[m]).join(', ')}</strong></span>
                        </div>

                        <LegendaStatus />

                        {/* Status summary bar e Export */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <FilterBar
                                filtroStatus={filtroStatus}
                                setFiltroStatus={setFiltroStatus}
                                contadores={resultado.contadores}
                            />
                            <button onClick={handleExport} style={{
                                padding: '8px 16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700,
                            }}>
                                <IconDownload size={16} /> Exportar XLSX
                            </button>
                        </div>

                        {/* Results Table - Virtualized */}
                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <div style={{ minWidth: '920px' }}>
                                    {/* Table Header */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: gridLayout, alignItems: 'center',
                                        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)'
                                    }}>
                                        {['Nr. Recibo', 'Nome/Fornecedor', 'Valor Relat.', 'Débito Razão', 'Delta', 'Status', 'Mês Encontrado'].map(h => (
                                            <div key={h} style={{ padding: '10px 14px', textAlign: h === 'Nr. Recibo' || h === 'Nome/Fornecedor' || h === 'Mês Encontrado' ? 'left' : 'right', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                {h}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Virtualized Body */}
                                    {resultadosFiltrados.length === 0 ? (
                                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                            Nenhum resultado para este filtro
                                        </div>
                                    ) : (
                                        <Virtuoso
                                            style={{ height: '500px' }}
                                            data={resultadosFiltrados}
                                            itemContent={(index, item) => (
                                                <ResultCard key={`${item.nrRecibo}-${index}`} item={item} index={index} />
                                            )}
                                        />
                                    )}
                                </div>
                            </div>

                            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Clique em uma linha para ver os lançamentos detalhados do Razão</span>
                                <span>{resultadosFiltrados.length} registros</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                tr:hover td { background: rgba(99,102,241,0.04); }
            `}</style>
        </div>
    );
}
