import { useState, useEffect } from 'react';

// Usa o hostname da página atual para que funcione tanto em localhost
// quanto no servidor Windows acessado por PCs na rede
const SERVER_URL = `http://${window.location.hostname}:3002`;

export function RpaPanel() {
    const [ie, setIe] = useState('');
    const [senha, setSenha] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [dtIni, setDtIni] = useState('2026-01-01');
    const [dtFin, setDtFin] = useState('2026-01-31');
    const [cfop, setCfop] = useState('6109');
    const [status, setStatus] = useState(null);   // { processing, queueLength }
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);
    const [rodando, setRodando] = useState(false);
    const [serverOnline, setServerOnline] = useState(false);

    // Verificar saúde do servidor a cada 5s
    useEffect(() => {
        const check = async () => {
            try {
                const r = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
                setServerOnline(r.ok);
            } catch {
                setServerOnline(false);
            }
        };
        check();
        const interval = setInterval(check, 5000);
        return () => clearInterval(interval);
    }, []);

    // Polling de status quando está rodando
    useEffect(() => {
        if (!rodando) return;
        const interval = setInterval(async () => {
            try {
                const r = await fetch(`${SERVER_URL}/api/status`);
                const data = await r.json();
                setStatus(data);
                if (!data.processing && !data.queueLength) setRodando(false);
            } catch { /* ignore */ }
        }, 2000);
        return () => clearInterval(interval);
    }, [rodando]);

    async function iniciarDownload() {
        if (!ie || !senha) return;
        setRodando(true);
        setErro(null);
        setResultado(null);

        try {
            const r = await fetch(`${SERVER_URL}/api/download-xmls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ie, senha, cnpj, dtIni, dtFin, cfop }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Erro no servidor');
            setResultado(data);
        } catch (e) {
            setErro(e.message);
        } finally {
            setRodando(false);
        }
    }

    return (
        <div className="card">
            <div className="card-title">🤖 M0 — Download Automático SEFAZ-AM</div>

            {/* Status do servidor */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: serverOnline ? 'var(--success)' : 'var(--danger)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {serverOnline ? `Servidor RPA online (${window.location.hostname}:3002)` : 'Servidor offline — execute: cd server && node index.js'}
                </span>
            </div>

            {!serverOnline && (
                <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                    ⚠️ O servidor RPA não está rodando. Abra um terminal e execute:
                    <code style={{ display: 'block', marginTop: 6, padding: '6px 10px', background: 'var(--bg)', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>
                        cd /Users/ryanrichard/projecont/subvencoes/server && npm install && node index.js
                    </code>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>IE (Inscrição Estadual)</label>
                    <input type="text" value={ie} onChange={e => setIe(e.target.value)} placeholder="041504550"
                        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Senha SEFAZ</label>
                    <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••"
                        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Data Inicial</label>
                    <input type="date" value={dtIni} onChange={e => setDtIni(e.target.value)}
                        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Data Final</label>
                    <input type="date" value={dtFin} onChange={e => setDtFin(e.target.value)}
                        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        CFOP <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional — filtra diretamente no portal SEFAZ)</span>
                    </label>
                    <input
                        type="text"
                        value={cfop}
                        onChange={e => setCfop(e.target.value)}
                        placeholder="ex: 6109 ou 6110 — deixe vazio para baixar todos"
                        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}
                    />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        CFOPs elegíveis para subvenção: 6101, 6102, 6109, 6110, 6401 · Devoluções: 6201, 6202, 6411
                    </div>
                </div>
            </div>

            <button
                className="btn btn-primary"
                onClick={iniciarDownload}
                disabled={rodando || !serverOnline || !ie || !senha}
            >
                {rodando ? '⏳ Baixando XMLs do SEFAZ...' : '⬇ Iniciar Download SEFAZ'}
            </button>

            {rodando && status && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    🤖 Robô rodando... {status.queueLength > 0 ? `${status.queueLength} na fila` : 'processando'}
                </div>
            )}

            {erro && (
                <div className="alert" style={{ marginTop: 12, background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}>
                    ❌ {erro}
                </div>
            )}

            {resultado && (
                <div className="alert alert-info" style={{ marginTop: 12 }}>
                    ✅ {resultado.total} notas encontradas | {resultado.arquivosCount} XMLs baixados
                    <br />
                    <span style={{ fontSize: 11 }}>📁 {resultado.outputDir}</span>
                </div>
            )}

            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                ⚠️ O robô abrirá o Chrome do SEFAZ-AM automaticamente. Em caso de erro de seletor, screenshots de diagnóstico são salvos na pasta <code>server/</code>.
            </div>
        </div>
    );
}
