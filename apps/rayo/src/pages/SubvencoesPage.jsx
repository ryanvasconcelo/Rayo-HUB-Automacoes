/**
 * SubvencoesPage — Módulo Subvenções ZFM dentro do Rayo Hub
 *
 * Arquitetura: iframe isolado apontando para o auditor rodando em localhost:5174
 * Independência total: não usa rayo-server, não importa nada de outros módulos Rayo.
 *
 * Processos necessários (independentes):
 *   Auditor:    cd subvencoes/app    && npm run dev   → porta 5174
 *   Robô SEFAZ: cd subvencoes/server && node index.js → porta 3002
 */
import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';

// Em produção: rayo-server serve o build do auditor em /subvencoes-app (mesma origem)
// Em dev:      auditor roda em vite dev server separado na porta 5174
// Detecta pelo path — se acessado de /subvencoes no Rayo em produção,
// a origem do rayo-server já serve o módulo em /subvencoes-app
const IS_DEV = window.location.hostname === 'localhost' && window.location.port === '5173';
const AUDITOR_URL   = IS_DEV
    ? `http://localhost:5174`
    : `${window.location.protocol}//${window.location.host}/subvencoes-app/`;
const SEFAZ_BOT_URL = `${window.location.protocol}//${window.location.hostname}:3002`;

// Verifica se uma porta está respondendo HTTP (retorna boolean)
async function portaResponde(url, timeout = 3000) {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        // Usa HEAD para minimizar tráfego; ignora erros CORS (só importa o TCP conectar)
        await fetch(url, { method: 'HEAD', signal: ctrl.signal });
        clearTimeout(timer);
        return true;
    } catch (e) {
        // AbortError = timeout, TypeError "Failed to fetch" = connection refused
        // Ambos significam offline — mas se chegou aqui com outro erro pode ser CORS (app rodando)
        if (e?.name === 'AbortError') return false;
        // "Failed to fetch" no Chrome = porta fechada; outros erros de rede também = false
        return false;
    }
}

function StatusPill({ online, label }) {
    const color = online === null ? '#6b7280' : online ? '#22c55e' : '#ef4444';
    const bg    = online === null ? 'rgba(107,114,128,0.15)' : online ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 999, background: bg,
            border: `1px solid ${color}44` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color,
                boxShadow: online ? `0 0 5px ${color}` : 'none',
                transition: 'all 0.3s' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color }}>
                {label}: {online === null ? 'verificando…' : online ? 'online' : 'offline'}
            </span>
        </div>
    );
}

export default function SubvencoesPage() {
    // null = ainda checando | true = online | false = offline
    const [auditorOnline, setAuditorOnline] = useState(null);
    const [botOnline, setBotOnline]         = useState(null);
    const iframeRef = useRef(null);

    async function verificar() {
        // Auditor:
        // - Produção: /subvencoes-app/ é mesma origem → fetch direto funciona
        // - Dev: porta 5174 → CORS bloqueia mas o erro de rede ≠ erro CORS (servidor respondeu)
        try {
            const r = await fetch(AUDITOR_URL, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
            setAuditorOnline(true); // produção: mesma origem, resposta real
        } catch (e) {
            const msg = e?.message?.toLowerCase() ?? '';
            // Em dev, CORS bloqueia mas o servidor RESPONDEU (não foi recusa de conexão)
            // "Failed to fetch" em chrome = porta fechada; em firefox pode ser "NetworkError"
            const portaAberta = msg.includes('cors') || msg.includes('blocked') || msg.includes('opaque');
            setAuditorOnline(portaAberta ? true : false);
        }
        // Bot SEFAZ: endpoint /api/health com CORS aberto — check confiável
        try {
            const r = await fetch(`${SEFAZ_BOT_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
            setBotOnline(r.ok);
        } catch {
            setBotOnline(false);
        }
    }

    useEffect(() => {
        verificar();
        const t = setInterval(verificar, 10000);
        return () => clearInterval(t);
    }, []);

    // Handler do iframe: quando carrega com sucesso confirma online
    function onIframeLoad() { setAuditorOnline(true); }

    const mostrarOffline = auditorOnline === false;

    return (
        <AppLayout breadcrumbs={[{ label: 'Subvenções ZFM' }]} flush>
            <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/30 px-6 md:px-8 py-4 border-b border-border shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-display font-bold">Convênio 65/88</h2>
                    <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full border border-green-500/30 font-bold">
                        Módulo Independente
                    </span>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    <StatusPill online={auditorOnline} label="Auditor" />
                    <StatusPill online={botOnline}     label="Robô SEFAZ" />
                    {mostrarOffline && (
                        <button
                            onClick={() => { setAuditorOnline(null); verificar(); }}
                            className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20 transition-colors font-bold"
                        >
                            ↺ Verificar
                        </button>
                    )}
                </div>
            </div>

            {/* ── Conteúdo ─────────────────────────────────────────────── */}
            {mostrarOffline ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 20,
                    padding: 32, textAlign: 'center' }}>

                    <div style={{ fontSize: 52 }}>🔌</div>

                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800,
                        color: 'var(--text-primary, #f9fafb)' }}>
                        Módulo Subvenções não está rodando
                    </h2>

                    <p style={{ margin: 0, fontSize: 14, maxWidth: 480, lineHeight: 1.6,
                        color: 'var(--text-secondary, #9ca3af)' }}>
                        Este módulo é <strong style={{ color: 'var(--text-primary, #f9fafb)' }}>independente</strong> do Rayo Hub.
                        Abra dois terminais e execute os comandos abaixo:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 500 }}>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginBottom: 4 }}>
                                1 — Auditor (interface + motor fiscal)
                            </div>
                            <code style={{ display: 'block', padding: '10px 16px', borderRadius: 8,
                                fontFamily: 'monospace', fontSize: 13,
                                color: 'var(--text-primary, #f9fafb)',
                                background: 'var(--bg-secondary, rgba(255,255,255,0.06))',
                                border: '1px solid rgba(34,197,94,0.2)' }}>
                                cd subvencoes/app &amp;&amp; npm run dev
                            </code>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>
                                2 — Robô SEFAZ (opcional — só para download automático de XMLs)
                            </div>
                            <code style={{ display: 'block', padding: '10px 16px', borderRadius: 8,
                                fontFamily: 'monospace', fontSize: 13,
                                color: 'var(--text-primary, #f9fafb)',
                                background: 'var(--bg-secondary, rgba(255,255,255,0.06))',
                                border: '1px solid rgba(255,255,255,0.08)' }}>
                                cd subvencoes/server &amp;&amp; node index.js
                            </code>
                        </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280', maxWidth: 420 }}>
                        Após iniciar, clique em <strong>↺ Verificar</strong> na barra acima ou aguarde a detecção automática.
                    </p>
                </div>
            ) : (
                <iframe
                    ref={iframeRef}
                    src={auditorOnline !== false ? AUDITOR_URL : 'about:blank'}
                    title="Auditor de Subvenções ZFM — Convênio 65/88"
                    onLoad={onIframeLoad}
                    style={{ flex: 1, width: '100%', border: 'none',
                        background: 'var(--bg-primary, #0a0a0a)',
                        display: auditorOnline === null ? 'none' : 'block' }}
                    allow="downloads"
                />
            )}

            {/* Loading skeleton enquanto verifica */}
            {auditorOnline === null && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary, #9ca3af)', gap: 10, fontSize: 14 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid #22c55e', borderTopColor: 'transparent',
                        animation: 'spin 0.8s linear infinite' }} />
                    Conectando ao módulo Subvenções…
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
        </AppLayout>
    );
}
