import { useState } from 'react';
import './index.css';
import { useSubvencoes } from './hooks/useSubvencoes.js';
import { FileUpload } from './components/FileUpload.jsx';
import { SummaryPanel } from './components/SummaryPanel.jsx';
import { ReconciliationTable } from './components/ReconciliationTable.jsx';
import { RpaPanel } from './components/RpaPanel.jsx';


export default function App() {
    const { processing, progress, result, error, spedFilesRef, xmlFilesRef, processFiles } = useSubvencoes();
    const [activeTab, setActiveTab] = useState('processar');

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <span style={{ fontSize: 22 }}>⚡</span>
                <span className="header-title">Subvenções Fiscais</span>
                <span className="header-badge">AM · MVP</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Automação SPED EFD × NF-e XML · Lei 14.789/2023
                </span>
            </header>

            {/* Processing overlay */}
            {processing && (
                <div className="progress-overlay">
                    <div className="progress-box">
                        <div className="spinner" />
                        <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>Processando...</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{progress}</div>
                    </div>
                </div>
            )}

            <main className="main">
                {/* Tabs */}
                <div className="tabs">
                    <div className={`tab ${activeTab === 'download' ? 'active' : ''}`} onClick={() => setActiveTab('download')}>
                        🤖 Download SEFAZ (M0)
                    </div>
                    <div className={`tab ${activeTab === 'processar' ? 'active' : ''}`} onClick={() => setActiveTab('processar')}>
                        ⚡ Processar Subvenção (M1-M5)
                    </div>
                </div>

                {/* Tab: Download SEFAZ */}
                {activeTab === 'download' && <RpaPanel />}

                {/* Tab: Processar */}
                {activeTab === 'processar' && (
                    <>
                        {/* Upload + Trigger */}
                        <FileUpload spedFilesRef={spedFilesRef} xmlFilesRef={xmlFilesRef} />

                        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                            <button
                                className="btn btn-primary"
                                onClick={processFiles}
                                disabled={processing}
                            >
                                ▶ Processar Subvenção
                            </button>
                            {result && (
                                <button className="btn btn-secondary" onClick={() => window.print()}>
                                    🖨️ Imprimir Laudo
                                </button>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="alert alert-warning" style={{ marginTop: 16, borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                                ❌ {error}
                            </div>
                        )}

                        {/* Results */}
                        {result && (
                            <>
                                <div style={{ marginTop: 24 }}>
                                    <SummaryPanel result={result} />
                                </div>
                                <div style={{ marginTop: 16 }}>
                                    <ReconciliationTable docs={result.docs} />
                                </div>
                            </>
                        )}

                        {/* Empty state */}
                        {!result && !processing && !error && (
                            <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: 48 }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                                    Pronto para apurar
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                    Use a aba <strong>Download SEFAZ</strong> para baixar os XMLs das notas de entrada, depois carregue o SPED EFD e os XMLs aqui.
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

