/**
 * useContasRazao.js — Hook de orquestração do Auditor de Contas e Razão
 *
 * Estados gerenciados:
 *   - arquivosRazao: até 3 arquivos (anterior, atual, posterior)
 *   - arquivoRelatorio: 1 arquivo do relatório financeiro
 *   - resultado: ConciliacaoResultado
 *   - status: 'idle' | 'processing' | 'done' | 'error'
 *   - erro: string
 */

import { useState, useCallback } from 'react';
import { mergeRazaoFiles } from '../lib/contas-razao/razao-parser';
import { parseAndMergeRelatorios } from '../lib/contas-razao/relatorio-parser';
import { reconcile } from '../lib/contas-razao/reconciler';

const MES_OPTIONS = ['anterior', 'atual', 'posterior'];

function readFileBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Erro ao ler o arquivo: ${file.name}`));
        reader.readAsArrayBuffer(file);
    });
}

export function useContasRazao() {
    // Cada entrada: { file: File, mesFonte: 'anterior'|'atual'|'posterior' }
    const [arquivosRazao, setArquivosRazao] = useState([]);
    const [arquivosRelatorio, setArquivosRelatorio] = useState({ saidas: null, saldo: null });
    const [resultado, setResultado] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | processing | done | error
    const [erro, setErro] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');

    // Adicionar / substituir um arquivo de razão
    const addArquivoRazao = useCallback((file, mesFonte) => {
        setArquivosRazao(prev => {
            const filtered = prev.filter(a => a.mesFonte !== mesFonte);
            return [...filtered, { file, mesFonte }];
        });
        setResultado(null);
    }, []);

    const removeArquivoRazao = useCallback((mesFonte) => {
        setArquivosRazao(prev => prev.filter(a => a.mesFonte !== mesFonte));
        setResultado(null);
    }, []);

    const setArquivoSaidas = useCallback((file) => {
        setArquivosRelatorio(prev => ({ ...prev, saidas: file }));
        setResultado(null);
    }, []);

    const setArquivoSaldo = useCallback((file) => {
        setArquivosRelatorio(prev => ({ ...prev, saldo: file }));
        setResultado(null);
    }, []);

    const processar = useCallback(async () => {
        if (arquivosRazao.length === 0) {
            setErro('Adicione pelo menos um arquivo de Razão Contábil.');
            return;
        }
        if (!arquivosRelatorio.saidas && !arquivosRelatorio.saldo) {
            setErro('Adicione pelo menos um arquivo do Relatório Financeiro Sifin (Saídas ou Saldo Acumulado).');
            return;
        }

        setStatus('processing');
        setErro(null);

        try {
            // 1. Ler todos os arquivos em paralelo
            const razaoBuffers = await Promise.all(
                arquivosRazao.map(async ({ file, mesFonte }) => ({
                    buffer: await readFileBuffer(file),
                    mesFonte,
                }))
            );

            const relatorioBuffers = [];
            if (arquivosRelatorio.saidas) {
                relatorioBuffers.push(await readFileBuffer(arquivosRelatorio.saidas));
            }
            if (arquivosRelatorio.saldo) {
                relatorioBuffers.push(await readFileBuffer(arquivosRelatorio.saldo));
            }

            // 2. Parse
            const { lancamentos: _lancamentos, byRecibo, contaNome, saldoFinal } =
                mergeRazaoFiles(razaoBuffers);

            const relatorio = parseAndMergeRelatorios(relatorioBuffers);

            if (relatorio.length === 0) {
                throw new Error('Nenhum lançamento encontrado nos Relatórios Financeiros. Verifique os arquivos.');
            }

            // 3. Conciliar
            const conciliacao = reconcile(relatorio, byRecibo);

            const relatoriosNomes = [
                arquivosRelatorio.saidas?.name,
                arquivosRelatorio.saldo?.name
            ].filter(Boolean).join(' + ');

            setResultado({
                ...conciliacao,
                contaNome,
                saldoFinalRazao: saldoFinal,
                nomeRelatorio: relatoriosNomes,
                mesesCarregados: arquivosRazao.map(a => a.mesFonte),
            });
            setStatus('done');
        } catch (e) {
            setErro(e.message || 'Erro desconhecido ao processar os arquivos.');
            setStatus('error');
        }
    }, [arquivosRazao, arquivosRelatorio]);

    const limpar = useCallback(() => {
        setArquivosRazao([]);
        setArquivosRelatorio({ saidas: null, saldo: null });
        setResultado(null);
        setStatus('idle');
        setErro(null);
        setFiltroStatus('TODOS');
    }, []);

    // Resultados filtrados
    const resultadosFiltrados = resultado
        ? (filtroStatus === 'TODOS'
            ? resultado.resultados
            : resultado.resultados.filter(r => r.status === filtroStatus))
        : [];

    return {
        arquivosRazao,
        arquivosRelatorio,
        resultado,
        resultadosFiltrados,
        status,
        erro,
        filtroStatus,
        addArquivoRazao,
        removeArquivoRazao,
        setArquivoSaidas,
        setArquivoSaldo,
        processar,
        limpar,
        setFiltroStatus,
        MES_OPTIONS,
    };
}
