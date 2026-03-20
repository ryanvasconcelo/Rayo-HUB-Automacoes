import React, { useState, useMemo } from 'react';
import { IconX, IconCheck, IconWarning } from './Icons';

const UFS_BRASIL = ['', 'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const FINALIDADES = ['', 'Revenda', 'Uso e Consumo', 'Ativo Imobilizado', 'Industrialização'];

/**
 * Modal Human-in-the-Loop para desambiguação de NCMs com múltiplas regras.
 * Épico 4 — Documento Técnico Projecont v1.0.
 *
 * @param {Object} item           - Item da disambiguationQueue: { rowIndex, ncm, descricaoLivrao, opcoes[] }
 * @param {number} total          - Total de itens na fila
 * @param {number} current        - Índice atual (1-based)
 * @param {Function} onSelect     - Callback (rowIndex, regraEscolhida)
 * @param {Function} onSkip       - Callback (rowIndex) — pular, manter como análise manual
 */
export default function NcmDisambiguationModal({ item, total, current, onSelect, onSkip }) {
    const [filtroUF, setFiltroUF] = useState('');
    const [filtroFinalidade, setFiltroFinalidade] = useState('');

    const opcoesFiltradas = useMemo(() => {
        if (!item?.opcoes) return [];
        return item.opcoes.filter(op => {
            if (filtroUF && op['UF'] && !String(op['UF']).toUpperCase().includes(filtroUF)) return false;
            if (filtroFinalidade) {
                const desc = String(op['DESCRIÇÃO'] || op['Descrição'] || '').toLowerCase();
                const fin = filtroFinalidade.toLowerCase();
                if (!desc.includes(fin.split(' ')[0])) return false;
            }
            return true;
        });
    }, [item, filtroUF, filtroFinalidade]);

    if (!item) return null;

    const cstFormatado = (regra) => String(regra['CST/CSOSN'] || '').padStart(3, '0');

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '20px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
                padding: '32px',
                maxWidth: '720px',
                width: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ background: 'var(--warning-soft)', color: 'var(--warning)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                {current} de {total} — Seleção Necessária
                            </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                            NCM Ambíguo — Selecione a Regra Correta
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            NCM: <strong style={{ fontFamily: 'monospace' }}>{item.ncm}</strong>
                            {item.descricaoLivrao && (
                                <> — <span style={{ color: 'var(--text-tertiary)' }}>{item.descricaoLivrao}</span></>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => onSkip(item.rowIndex)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                        <IconX size={16} />
                    </button>
                </div>

                {/* Aviso informativo */}
                <div style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.82rem', color: 'var(--warning-text)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <IconWarning size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>Este NCM retornou <strong>{item.opcoes.length} regras</strong> diferentes na base do e-Auditoria. O sistema não conseguiu resolver automaticamente. Selecione a descrição que melhor representa o produto desta operação.</span>
                </div>

                {/* Filtros */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Filtrar por UF</label>
                        <select value={filtroUF} onChange={e => setFiltroUF(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.85rem' }}>
                            {UFS_BRASIL.map(uf => <option key={uf} value={uf}>{uf || 'Todas as UFs'}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Filtrar por Finalidade</label>
                        <select value={filtroFinalidade} onChange={e => setFiltroFinalidade(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.85rem' }}>
                            {FINALIDADES.map(f => <option key={f} value={f}>{f || 'Todas as finalidades'}</option>)}
                        </select>
                    </div>
                </div>

                {/* Lista de opções */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {opcoesFiltradas.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px 0', fontSize: '0.85rem' }}>
                            Nenhuma opção encontrada com os filtros aplicados.
                        </p>
                    ) : opcoesFiltradas.map((regra, idx) => {
                        const descricao = regra['DESCRIÇÃO'] || regra['Descrição do Produto'] || regra['Descrição'] || 'Sem descrição';
                        const cst = cstFormatado(regra);

                        return (
                            <div key={idx} style={{
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '12px',
                                background: 'var(--bg)',
                                transition: 'border-color 0.15s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                                        {descricao}
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.72rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 8px', fontFamily: 'monospace', fontWeight: 700 }}>
                                            CST {cst}
                                        </span>
                                        {regra['UF'] && (
                                            <span style={{ fontSize: '0.72rem', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '4px', padding: '1px 8px', fontWeight: 700 }}>
                                                {regra['UF']}
                                            </span>
                                        )}
                                        {regra['% RED. BASE DE CÁLCULO ICMS'] && (
                                            <span style={{ fontSize: '0.72rem', background: 'var(--warning-soft)', color: 'var(--warning-text)', borderRadius: '4px', padding: '1px 8px', fontWeight: 600 }}>
                                                Redução {regra['% RED. BASE DE CÁLCULO ICMS']}%
                                            </span>
                                        )}
                                        {regra['BASE LEGAL ICMS'] && (
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                                📑 {regra['BASE LEGAL ICMS']}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onSelect(item.rowIndex, regra)}
                                    style={{
                                        flexShrink: 0,
                                        padding: '8px 18px',
                                        background: 'var(--accent)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'opacity 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                >
                                    <IconCheck size={14} /> Usar esta
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Rodapé */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={() => onSkip(item.rowIndex)}
                        style={{ padding: '8px 20px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}
                    >
                        Pular — Marcar para Análise Manual
                    </button>
                </div>
            </div>
        </div>
    );
}
