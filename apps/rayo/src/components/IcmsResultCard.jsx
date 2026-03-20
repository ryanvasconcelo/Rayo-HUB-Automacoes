import React, { useState } from 'react';
import { IconWarning, IconX, IconCheck } from './Icons';

function IconFileText({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    );
}

function IconChevronDown({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function FonteBadge({ fonte }) {
    if (!fonte || fonte === 'e-auditoria') return null;
    const isLocal = fonte === 'base_legal_local';
    return (
        <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px',
            borderRadius: '4px',
            background: isLocal ? 'rgba(16,185,129,0.12)' : 'rgba(100,100,100,0.1)',
            color: isLocal ? '#10b981' : 'var(--text-tertiary)',
            border: `1px solid ${isLocal ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
        }}>
            {isLocal ? '⚖️ Base Legal' : '🔗 e-Auditoria'}
        </span>
    );
}

export default function IcmsResultCard({ result }) {
    const [showLegal, setShowLegal] = useState(false);

    const isError = result.severidade === 'erro';
    const isAlerta = result.severidade === 'alerta';
    const borderColor = isError ? 'var(--danger)' : isAlerta ? '#eab308' : 'var(--border)';
    const bgBadge = isError ? '#fee2e2' : '#fef9c3';
    const textBadge = isError ? 'var(--danger)' : '#92400e';

    const hasStBlock = result.creditoVedadoST;
    const hasLegal = !!(result.baseLegalRef && result.baseLegalDesc);
    const hasAliquotaComparativo = result.aliquotaNF !== undefined && result.aliquotaCorreta !== undefined;

    return (
        <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            borderLeft: `5px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: hasStBlock ? 'rgba(239,68,68,0.03)' : 'var(--card-bg)',
            transition: 'background-color 0.2s ease',
        }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Linha {result.linha}</span>

                    <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.73rem', background: bgBadge, color: textBadge, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isError ? <IconX size={11} /> : <IconWarning size={11} />}
                        {result.motivo}
                    </span>

                    {/* Badge ST Crítico */}
                    {hasStBlock && (
                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.73rem', background: '#fef3c7', color: '#92400e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #f59e0b' }}>
                            ⚠️ ST (Dec. 6.108) — Crédito VEDADO
                        </span>
                    )}

                    {result.correcaoAplicada && (
                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.73rem', background: '#dbeafe', color: '#1d4ed8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ✏️ {result.correcaoAplicada.campo} corrigido
                        </span>
                    )}

                    <FonteBadge fonte={result.fonte} />
                </div>

                <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)', background: 'var(--bg)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    NCM: <strong style={{ color: 'var(--text)' }}>{result.ncm}</strong>
                    {result.cfop && <> | CFOP: <strong>{result.cfop}</strong></>}
                    {result.aliquotaAplicada !== undefined && <> | Alíq: <strong style={{ color: '#2563eb' }}>{(result.aliquotaAplicada * 100).toFixed(0)}%</strong></>}
                    {result.icmsEsperado !== undefined && <> | ICMS: <strong style={{ color: '#2563eb' }}>R$ {result.icmsEsperado.toFixed(2)}</strong></>}
                </div>
            </div>

            {/* ── Linha de valores / CST ── */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg)', padding: '9px 14px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.86rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '1px' }}>Recebido (Livrão)</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{result.cst || '—'}</span>
                </div>

                {result.esperado && (
                    <>
                        <div style={{ color: 'var(--text-muted)' }}>→</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '1px' }}>Esperado (Regra)</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{result.esperado}</span>
                        </div>
                    </>
                )}

                {/* Comparativo de alíquotas (R06) */}
                {hasAliquotaComparativo && (
                    <>
                        <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--danger)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '1px' }}>Alíq. NF</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--danger)' }}>{(result.aliquotaNF * 100).toFixed(0)}%</span>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>→</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: '#10b981', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '1px' }}>Alíq. Correta</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>{(result.aliquotaCorreta * 100).toFixed(0)}%</span>
                            </div>
                            {result.diferencaAliquota !== undefined && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger)', background: '#fee2e2', padding: '1px 8px', borderRadius: '4px' }}>
                                    Δ R$ {result.diferencaAliquota.toFixed(2)}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── Detalhe ── */}
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.45' }}>
                {result.detalhe}
            </p>

            {/* ── Base Legal Expansível (Épico 5) ── */}
            {hasLegal && (
                <div>
                    <button
                        onClick={() => setShowLegal(v => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
                            padding: '4px 12px', cursor: 'pointer', fontSize: '0.75rem',
                            fontWeight: 600, color: 'var(--text-secondary)',
                            transition: 'border-color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        <IconFileText size={13} />
                        📄 {showLegal ? 'Ocultar Base Legal' : 'Ver Base Legal'}
                        <span style={{ marginLeft: '2px', transition: 'transform 0.2s', display: 'inline-block', transform: showLegal ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <IconChevronDown size={12} />
                        </span>
                    </button>

                    {showLegal && (
                        <div style={{
                            marginTop: '8px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '14px 16px',
                            animation: 'fadeIn 0.2s ease-out',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.7rem', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                    📑 {result.baseLegalNome}
                                </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.55', fontStyle: 'italic' }}>
                                "{result.baseLegalDesc}"
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
