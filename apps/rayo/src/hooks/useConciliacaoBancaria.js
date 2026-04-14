/**
 * useConciliacaoBancaria.js — Hook orquestrador do módulo Conciliação Bancária
 *
 * Fluxo:
 *   1. Usuário sobe Fonte A (razao-planilha.xlsx) e Fonte B (saldo-conta.xlsx)
 *   2. ao clicar "Processar":
 *      a. Parseia ambos os arquivos
 *      b. Aplica Netting em cada fonte separadamente
 *      c. Executa matching dos ativos
 *   3. Expõe resultados, filtros e funções de UI
 */

import { useState, useCallback, useMemo } from 'react';
import { parseRazaoBanco } from '../lib/banco-razao/razao-banco-parser';
import { parseSaldoConta } from '../lib/banco-razao/saldo-conta-parser';
import { applyNettingRazao, applyNettingSaldoConta } from '../lib/banco-razao/netting-engine';
import { reconcileBanco, STATUS_BANCO } from '../lib/banco-razao/banco-reconciler';

export function useConciliacaoBancaria() {
    // ── Arquivos ──────────────────────────────────────────────────────────
    const [arquivoRazao, setArquivoRazaoState] = useState(null);   // Fonte A
    const [arquivoSaldo, setArquivoSaldoState] = useState(null);   // Fonte B

    // ── Estado de processamento ──────────────────────────────────────────
    const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'done' | 'error'
    const [erro, setErro] = useState(null);

    // ── Resultado bruto ──────────────────────────────────────────────────
    const [resultado, setResultado] = useState(null);

    // ── Filtros ──────────────────────────────────────────────────────────
    const [filtroStatus, setFiltroStatus] = useState('TODOS');
    const [buscaTexto, setBuscaTexto] = useState('');

    // ── Handlers de arquivo ───────────────────────────────────────────────
    const setArquivoRazao = useCallback((file) => {
        setArquivoRazaoState(file);
        setResultado(null);
        setErro(null);
    }, []);

    const setArquivoSaldo = useCallback((file) => {
        setArquivoSaldoState(file);
        setResultado(null);
        setErro(null);
    }, []);

    // ── Processamento Principal ───────────────────────────────────────────
    const processar = useCallback(async () => {
        if (!arquivoRazao || !arquivoSaldo) return;

        setStatus('processing');
        setErro(null);

        try {
            // Lê ambos como ArrayBuffer
            const [bufferRazao, bufferSaldo] = await Promise.all([
                arquivoRazao.arrayBuffer(),
                arquivoSaldo.arrayBuffer(),
            ]);

            // === FASE 1: Parse ===
            const parsedRazao = parseRazaoBanco(bufferRazao);
            const parsedSaldo = parseSaldoConta(bufferSaldo);

            // === FASE 2: Netting ===
            const nettingRazao = applyNettingRazao(parsedRazao.lancamentos);
            const nettingSaldo = applyNettingSaldoConta(parsedSaldo.lancamentos);

            // === FASE 3: Reconciliação ===
            const conciliacao = reconcileBanco(nettingRazao.ativos, nettingSaldo.ativos);

            setResultado({
                // Dados de contexto
                contaNome: parsedSaldo.contaNome || parsedRazao.contaNome,
                saldoInicial: parsedSaldo.saldoInicial,
                saldoFinalRazao: parsedRazao.saldoFinal,
                nomeArquivoRazao: arquivoRazao.name,
                nomeArquivoSaldo: arquivoSaldo.name,

                // Netting stats
                nettingRazaoStats: nettingRazao.estatisticas,
                nettingSaldoStats: nettingSaldo.estatisticas,
                saldoAnulados: nettingSaldo.anulados,
                razaoAnulados: nettingRazao.anulados,

                // Conciliação
                ...conciliacao,
            });

            setStatus('done');
        } catch (err) {
            console.error('[useConciliacaoBancaria] Erro:', err);
            setErro(err.message || 'Erro inesperado ao processar arquivos.');
            setStatus('error');
        }
    }, [arquivoRazao, arquivoSaldo]);

    // ── Limpar ────────────────────────────────────────────────────────────
    const limpar = useCallback(() => {
        setArquivoRazaoState(null);
        setArquivoSaldoState(null);
        setResultado(null);
        setErro(null);
        setStatus('idle');
        setFiltroStatus('TODOS');
        setBuscaTexto('');
    }, []);

    // ── Resultados Filtrados ──────────────────────────────────────────────
    const resultadosFiltrados = useMemo(() => {
        if (!resultado) return [];
        let lista = resultado.resultados;

        if (filtroStatus !== 'TODOS') {
            lista = lista.filter(r => r.status === filtroStatus);
        }

        if (buscaTexto.trim()) {
            const q = buscaTexto.toLowerCase();
            lista = lista.filter(r =>
                (r.razaoDoc && r.razaoDoc.toLowerCase().includes(q)) ||
                (r.razaoNome && r.razaoNome.toLowerCase().includes(q)) ||
                (r.razaoDetalhes && r.razaoDetalhes.toLowerCase().includes(q)) ||
                (r.saldoNrOrigem && r.saldoNrOrigem.toLowerCase().includes(q)) ||
                (r.saldoDetalhes && r.saldoDetalhes.toLowerCase().includes(q)) ||
                (r.saldoContaContrapartida && r.saldoContaContrapartida.toLowerCase().includes(q))
            );
        }

        return lista;
    }, [resultado, filtroStatus, buscaTexto]);

    return {
        // Arquivos
        arquivoRazao,
        arquivoSaldo,
        setArquivoRazao,
        setArquivoSaldo,

        // Estado
        status,
        erro,
        resultado,
        resultadosFiltrados,

        // Filtros
        filtroStatus,
        setFiltroStatus,
        buscaTexto,
        setBuscaTexto,

        // Ações
        processar,
        limpar,

        // Helpers
        pronto: !!arquivoRazao && !!arquivoSaldo,
        processing: status === 'processing',
    };
}
