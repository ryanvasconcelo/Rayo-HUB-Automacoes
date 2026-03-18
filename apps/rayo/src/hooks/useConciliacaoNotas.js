/**
 * useConciliacaoNotas.js — Hook de orquestração do módulo Conciliação de Notas
 *
 * Estados:
 *   arquivoRazao     : File | null  (único arquivo do Razão NBS)
 *   arquivoRelatorio : File | null  (único arquivo do Relatório Sankhya)
 *   resultado        : ConciliacaoNotasResultado | null
 *   status           : 'idle' | 'processing' | 'done' | 'error'
 *   erro             : string | null
 *   filtroStatus     : string
 */

import { useState, useCallback } from 'react';
import { parseRazaoNotas } from '../lib/conciliacao-notas/notas-razao-parser';
import { parseRelatorioNotas } from '../lib/conciliacao-notas/relatorio-notas-parser';
import { reconcileNotas } from '../lib/conciliacao-notas/notas-reconciler';

function readFileBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Erro ao ler o arquivo: ${file.name}`));
        reader.readAsArrayBuffer(file);
    });
}

export function useConciliacaoNotas() {
    const [arquivoRazao, setArquivoRazaoState] = useState(null);
    const [arquivoRelatorio, setArquivoRelatorioState] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [status, setStatus] = useState('idle');
    const [erro, setErro] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');

    const setArquivoRazao = useCallback((file) => {
        setArquivoRazaoState(file);
        setResultado(null);
        setErro(null);
    }, []);

    const setArquivoRelatorio = useCallback((file) => {
        setArquivoRelatorioState(file);
        setResultado(null);
        setErro(null);
    }, []);

    const processar = useCallback(async () => {
        if (!arquivoRazao) {
            setErro('Adicione o arquivo do Razão Contábil (NBS).');
            return;
        }
        if (!arquivoRelatorio) {
            setErro('Adicione o arquivo do Relatório de Clientes a Receber (Sankhya).');
            return;
        }

        setStatus('processing');
        setErro(null);

        try {
            // 1. Ler buffers em paralelo
            const [razaoBuffer, relatorioBuffer] = await Promise.all([
                readFileBuffer(arquivoRazao),
                readFileBuffer(arquivoRelatorio),
            ]);

            // 2. Parsear
            const { byNumNota, contaNome, saldoFinal } = parseRazaoNotas(razaoBuffer);
            const relatorio = parseRelatorioNotas(relatorioBuffer);

            if (relatorio.length === 0) {
                throw new Error('Nenhuma nota encontrada no Relatório. Verifique o arquivo.');
            }
            if (byNumNota.size === 0) {
                throw new Error('Nenhum lançamento com Número de Nota encontrado no Razão. Verifique o arquivo.');
            }

            // 3. Conciliar
            const conciliacao = reconcileNotas(relatorio, byNumNota);

            setResultado({
                ...conciliacao,
                contaNome,
                saldoFinalRazao: saldoFinal,
                nomeRazao: arquivoRazao.name,
                nomeRelatorio: arquivoRelatorio.name,
            });
            setStatus('done');
        } catch (e) {
            setErro(e.message || 'Erro desconhecido ao processar os arquivos.');
            setStatus('error');
        }
    }, [arquivoRazao, arquivoRelatorio]);

    const limpar = useCallback(() => {
        setArquivoRazaoState(null);
        setArquivoRelatorioState(null);
        setResultado(null);
        setStatus('idle');
        setErro(null);
        setFiltroStatus('TODOS');
    }, []);

    const resultadosFiltrados = resultado
        ? (filtroStatus === 'TODOS'
            ? resultado.resultados
            : resultado.resultados.filter(r => r.status === filtroStatus))
        : [];

    return {
        arquivoRazao,
        arquivoRelatorio,
        resultado,
        resultadosFiltrados,
        status,
        erro,
        filtroStatus,
        setArquivoRazao,
        setArquivoRelatorio,
        processar,
        limpar,
        setFiltroStatus,
    };
}
