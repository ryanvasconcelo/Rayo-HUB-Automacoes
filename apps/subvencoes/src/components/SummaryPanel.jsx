import { useState } from 'react';
import { formatCurrency } from '../core/utils.js';
import { exportarXlsx } from '../core/exporters/xlsx-exporter.js';

export function SummaryPanel({ result }) {
    if (!result) return null;
    const { totalSuv, totalBase, creditoFiscal, descontoTotalSuv, stats, meta, estabelecimentos } = result;
    const [exportando, setExportando] = useState(false);
    const zeradoComXmls = totalSuv === 0 && stats.totalXml > 0 && stats.totalReconciliados === 0;

    function exportChavesSemXml() {
        const semXml = result.docs.filter(d => d.status === 'SPED_SIM_XML_NAO');
        const lines = ['Chave NF-e,Nº Nota,Dt Entrada', ...semXml.map(d => `${d.chaveNfe},${d.numDoc},${d.dtEntrada}`)];
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'chaves-sem-xml.csv'; a.click();
    }

    function handleExportXlsx() {
        setExportando(true);
        try {
            exportarXlsx(result);
        } finally {
            setExportando(false);
        }
    }

    return (
        <div className="card">
            <div className="card-title">Resultado da Apuração — {meta.companyName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Período: {meta.periodoIni} a {meta.periodoFin} | UF: {meta.uf}
            </div>
            {estabelecimentos?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    {estabelecimentos.map((est, i) => (
                        <span key={i} style={{
                            display: 'inline-block', fontSize: 11, marginRight: 8, marginBottom: 4,
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 4, padding: '2px 8px', color: 'var(--text-muted)',
                        }}>
                            {i === 0 ? 'Matriz' : `Filial ${i}`} — IE {est.ie} · {est.cnpj}
                        </span>
                    ))}
                </div>
            )}

            <div className="stats-bar">
                <div className="stat-item">
                    <div className="stat-value accent">{formatCurrency(totalSuv)}</div>
                    <div className="stat-label">Total SUV</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{formatCurrency(totalBase)}</div>
                    <div className="stat-label">Base de Cálculo</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value success">{formatCurrency(creditoFiscal)}</div>
                    <div className="stat-label">Economia Tributária (34% IRPJ/CSLL)</div>
                </div>
                {descontoTotalSuv > 0 && (
                    <div className="stat-item">
                        <div className="stat-value warning">- {formatCurrency(descontoTotalSuv)}</div>
                        <div className="stat-label">Desconto Devoluções</div>
                    </div>
                )}
                {stats.totalEstabelecimentos > 1 && (
                    <div className="stat-item">
                        <div className="stat-value">{stats.totalEstabelecimentos}</div>
                        <div className="stat-label">Estabelecimentos</div>
                    </div>
                )}
                <div className="stat-item">
                    <div className="stat-value">{stats.totalC100}</div>
                    <div className="stat-label">Notas SPED</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.totalXml}</div>
                    <div className="stat-label">XMLs Carregados</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value success">{stats.totalReconciliados}</div>
                    <div className="stat-label">Cruzados OK</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value warning">{stats.totalSoSped + stats.totalSoXml}</div>
                    <div className="stat-label">Atenção</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value" style={{ color: stats.totalDivergencias > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {stats.totalDivergencias}
                    </div>
                    <div className="stat-label">Divergências</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value accent">{stats.totalElegiveis}</div>
                    <div className="stat-label">Notas Elegíveis</div>
                </div>
            </div>

            {zeradoComXmls && (
                <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                    ⚠️ Nenhuma nota foi reconciliada. Verifique se os XMLs correspondem ao mesmo período do SPED e se os CFOPs do SPED iniciam com "2".
                </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleExportXlsx}
                    disabled={exportando}
                    title="Exporta relatório C0059 equivalente com detalhamento por item e resumo por nota"
                >
                    {exportando ? '⏳ Gerando...' : '⬇ Exportar XLSX (C0059)'}
                </button>
                {stats.totalSoSped > 0 && (
                    <button className="btn btn-secondary" onClick={exportChavesSemXml}>
                        📋 Exportar chaves sem XML ({stats.totalSoSped})
                    </button>
                )}
            </div>

            <div className="alert alert-warning" style={{ marginTop: 12 }}>
                ⚠️ Laudo gerado automaticamente. Requer validação do contador antes do aproveitamento fiscal.
                Lei 14.789/2023 — Convênio 65/88 — Economia Tributária = 34% da Subvenção (IRPJ 25% + CSLL 9%).
            </div>
        </div>
    );
}
