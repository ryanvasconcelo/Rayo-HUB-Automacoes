/**
 * useConciliacaoBancaria.js — Hook Universal Corrigido
 *
 * Quando os arquivos são invertidos (SAP no campo "Razão", Simplificado no campo "Saldo"),
 * o hook normaliza ambas as listas para o schema esperado pelo reconcileBanco:
 *   - Razão → cada item deve ter: { doc, valor, debito, credito, ... }
 *   - Saldo → cada item deve ter: { nrOrigem, nrTransacao, cdML, ... }
 */

import { useState, useCallback, useMemo } from 'react';
import { parseRazaoBanco } from '../lib/banco-razao/razao-banco-parser';
import { parseSaldoConta } from '../lib/banco-razao/saldo-conta-parser';
import { applyNettingRazao, applyNettingSaldoConta } from '../lib/banco-razao/netting-engine';
import { reconcileBanco, STATUS_BANCO } from '../lib/banco-razao/banco-reconciler';

/**
 * Converte lançamento do Saldo (nrOrigem, cdML) para schema do Razão (doc, valor).
 * Usado quando a inversão é detectada e o arquivo Simplificado está em parsedB.
 */
function saldoToRazaoSchema(lancamentos) {
    return lancamentos.map(l => ({
        ...l,
        doc: l.nrOrigem,
        transacao: l.nrTransacao,
        nome: l.detalhes,
        dataPgtoStr: l.dataStr,
        debito: l.debito,
        credito: l.credito,
        valor: l.cdML,
    }));
}

/**
 * Converte lançamento do Razão (doc, valor) para schema do Saldo (nrOrigem, cdML).
 * Usado quando a inversão é detectada e o arquivo SAP está em parsedA.
 */
function razaoToSaldoSchema(lancamentos) {
    return lancamentos.map(l => ({
        ...l,
        nrOrigem: l.doc,
        nrTransacao: l.transacao,
        cdML: l.valor,
        dataStr: l.dataPgtoStr,
    }));
}

export function useConciliacaoBancaria() {
    const [arquivoRazao, setArquivoRazaoState] = useState(null);
    const [arquivoSaldo, setArquivoSaldoState] = useState(null);
    const [status, setStatus] = useState('idle');
    const [erro, setErro] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');
    const [buscaTexto, setBuscaTexto] = useState('');

    const setArquivoRazao = useCallback((file) => { setArquivoRazaoState(file); setResultado(null); }, []);
    const setArquivoSaldo = useCallback((file) => { setArquivoSaldoState(file); setResultado(null); }, []);

    const processar = useCallback(async () => {
        if (!arquivoRazao || !arquivoSaldo) return;
        setStatus('processing');
        setErro(null);

        try {
            const [bufferA, bufferB] = await Promise.all([
                arquivoRazao.arrayBuffer(),
                arquivoSaldo.arrayBuffer(),
            ]);

            // === FASE 1: Parse com Auto-Detecção ===
            const parsedA = parseRazaoBanco(bufferA);
            const parsedB = parseSaldoConta(bufferB);

            // === FASE 2: Normalização de Schemas ===
            // O reconciliador espera:
            //   Razão → items com .doc e .valor
            //   Saldo → items com .nrOrigem e .cdML
            // Independente de em qual campo o usuário subiu o arquivo.

            let razaoLancamentos, saldoLancamentos;
            let arquivosInvertidos = false;
            let contaNome = parsedB.contaNome || parsedA.contaNome;

            if (parsedA.layoutDetectado === 'SIMPLIFICADO' && parsedB.layoutDetectado === 'SAP') {
                // Usuário subiu Simplificado no campo Razão e SAP no campo Saldo -> Invertido
                arquivosInvertidos = true;
                razaoLancamentos = saldoToRazaoSchema(parsedB.lancamentos); // SAP (B) -> Razão
                saldoLancamentos = razaoToSaldoSchema(parsedA.lancamentos); // Simplificado (A) -> Saldo
                contaNome = parsedB.contaNome || parsedA.contaNome;
            } else if (parsedA.layoutDetectado === 'SAP' && parsedB.layoutDetectado === 'SIMPLIFICADO') {
                // Usuário subiu SAP no campo Razão e Simplificado no campo Saldo — ordem correta
                razaoLancamentos = parsedA.lancamentos; // já tem .doc e .valor
                saldoLancamentos = parsedB.lancamentos; // já tem .nrOrigem e .cdML
            } else {
                // Mesmo layout nos dois — usa como enviado
                razaoLancamentos = parsedA.lancamentos;
                saldoLancamentos = parsedB.lancamentos;
            }

            // === FASE 3: Netting ===
            const nettingRazao = applyNettingRazao(razaoLancamentos);
            const nettingSaldo = applyNettingSaldoConta(saldoLancamentos);

            // === FASE 4: Reconciliação ===
            const conciliacao = reconcileBanco(nettingRazao.ativos, nettingSaldo.ativos);

            setResultado({
                contaNome,
                saldoInicial: parsedB.saldoInicial || parsedA.saldoInicial,
                nomeArquivoRazao: arquivoRazao.name,
                nomeArquivoSaldo: arquivoSaldo.name,
                arquivosInvertidos,
                layoutA: parsedA.layoutDetectado,
                layoutB: parsedB.layoutDetectado,

                nettingRazaoStats: nettingRazao.estatisticas,
                nettingSaldoStats: nettingSaldo.estatisticas,
                saldoAnulados: nettingSaldo.anulados,
                razaoAnulados: nettingRazao.anulados,

                ...conciliacao,
            });

            setStatus('done');
        } catch (err) {
            console.error('[useConciliacaoBancaria] Erro:', err);
            setErro(err.message || 'Erro ao processar arquivos.');
            setStatus('error');
        }
    }, [arquivoRazao, arquivoSaldo]);

    const limpar = useCallback(() => {
        setArquivoRazaoState(null);
        setArquivoSaldoState(null);
        setResultado(null);
        setStatus('idle');
        setErro(null);
    }, []);

    const resultadosFiltrados = useMemo(() => {
        if (!resultado) return [];
        let lista = resultado.resultados || [];
        if (filtroStatus !== 'TODOS') lista = lista.filter(r => r.status === filtroStatus);
        if (buscaTexto.trim()) {
            const q = buscaTexto.toLowerCase();
            lista = lista.filter(r =>
                (r.razaoDoc && String(r.razaoDoc).toLowerCase().includes(q)) ||
                (r.razaoNome && String(r.razaoNome).toLowerCase().includes(q)) ||
                (r.saldoNrOrigem && String(r.saldoNrOrigem).toLowerCase().includes(q)) ||
                (r.saldoDetalhes && String(r.saldoDetalhes).toLowerCase().includes(q))
            );
        }
        return lista;
    }, [resultado, filtroStatus, buscaTexto]);

    return {
        arquivoRazao, arquivoSaldo, setArquivoRazao, setArquivoSaldo,
        status, erro, resultado, resultadosFiltrados,
        filtroStatus, setFiltroStatus, buscaTexto, setBuscaTexto,
        processar, limpar,
        pronto: !!arquivoRazao && !!arquivoSaldo,
        processing: status === 'processing'
    };
}
