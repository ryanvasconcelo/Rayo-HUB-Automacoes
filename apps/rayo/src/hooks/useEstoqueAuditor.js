/**
 * useEstoqueAuditor.js — Hook de orquestração do Auditor de Estoque
 *
 * Estados:
 *   arquivoEstoque: File | null  — o .xls do Estoque de Motos
 *   arquivoRazao: File | null    — o .xlsx do Razão Contábil
 *   resultado: ComparacaoResult | null
 *   status: 'idle' | 'processing' | 'done' | 'error'
 *   erro: string | null
 *   mesSelecionado: string | null  — '01'...'12' para drilldown
 */

import { useState, useCallback, useMemo } from 'react';
import { parseEstoque } from '../lib/estoque/parser';
import { parseRazaoEstoque } from '../lib/estoque/razaoParser';
import { compararEstoqueRazao } from '../lib/estoque/comparador';

function readFileBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Erro ao ler o arquivo: ${file.name}`));
        reader.readAsArrayBuffer(file);
    });
}

export function useEstoqueAuditor() {
    const [arquivoEstoque, setArquivoEstoqueFile] = useState(null);
    const [arquivoRazao, setArquivoRazaoFile] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [status, setStatus] = useState('idle');
    const [erro, setErro] = useState(null);
    const [mesSelecionado, setMesSelecionado] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');

    const setArquivoEstoque = useCallback((file) => {
        setArquivoEstoqueFile(file);
        setResultado(null);
        setMesSelecionado(null);
        setErro(null);
    }, []);

    const setArquivoRazao = useCallback((file) => {
        setArquivoRazaoFile(file);
        setResultado(null);
        setMesSelecionado(null);
        setErro(null);
    }, []);

    const processar = useCallback(async () => {
        if (!arquivoEstoque) {
            setErro('Adicione o arquivo de Estoque de Motos Novas (.xls).');
            return;
        }
        if (!arquivoRazao) {
            setErro('Adicione o arquivo do Razão Contábil de Estoque (.xlsx).');
            return;
        }

        setStatus('processing');
        setErro(null);

        try {
            // Lê ambos os arquivos em paralelo
            const [bufferEstoque, bufferRazao] = await Promise.all([
                readFileBuffer(arquivoEstoque),
                readFileBuffer(arquivoRazao),
            ]);

            // Parse
            const estoque = parseEstoque(bufferEstoque);
            if (estoque.meses.length === 0) {
                throw new Error('Nenhuma aba de mês reconhecida no arquivo de Estoque. Verifique se as abas estão nomeadas por mês (Ex: "Janeiro", "Jan", "01").');
            }

            const razao = parseRazaoEstoque(bufferRazao);
            if (razao.lancamentos.length === 0) {
                throw new Error('Nenhum lançamento encontrado no Razão Contábil. Verifique o arquivo.');
            }

            // Comparação
            const comparacao = compararEstoqueRazao(estoque, razao);

            setResultado({
                ...comparacao,
                nomeEstoque: arquivoEstoque.name,
                nomeRazao: arquivoRazao.name,
            });

            // Seleciona o último mês (= mês de referência do Razão) por padrão
            const mesDefault = comparacao.ultimoMes
                || comparacao.primeiraMesDivergencia
                || (comparacao.resumoMensal.length > 0 ? comparacao.resumoMensal[comparacao.resumoMensal.length - 1].mes : null);
            setMesSelecionado(mesDefault);

            setStatus('done');
        } catch (e) {
            setErro(e.message || 'Erro desconhecido ao processar os arquivos.');
            setStatus('error');
        }
    }, [arquivoEstoque, arquivoRazao]);

    const limpar = useCallback(() => {
        setArquivoEstoqueFile(null);
        setArquivoRazaoFile(null);
        setResultado(null);
        setStatus('idle');
        setErro(null);
        setMesSelecionado(null);
        setFiltroStatus('TODOS');
    }, []);

    // Detalhes do mês selecionado, filtrados por status
    const detalhesMesFiltrados = useMemo(() => {
        if (!resultado || !mesSelecionado) return [];
        const mes = resultado.resumoMensal.find(m => m.mes === mesSelecionado);
        if (!mes) return [];
        const detalhes = mes.detalhesChassi;
        if (filtroStatus === 'TODOS') return detalhes;
        if (filtroStatus === 'PENDENTES') return detalhes.filter(d => d.status !== 'CONCILIADO');
        return detalhes.filter(d => d.status === filtroStatus);
    }, [resultado, mesSelecionado, filtroStatus]);

    const mesSelecionadoDados = useMemo(() => {
        if (!resultado || !mesSelecionado) return null;
        return resultado.resumoMensal.find(m => m.mes === mesSelecionado) || null;
    }, [resultado, mesSelecionado]);

    return {
        arquivoEstoque,
        arquivoRazao,
        resultado,
        status,
        erro,
        mesSelecionado,
        mesSelecionadoDados,
        detalhesMesFiltrados,
        filtroStatus,
        setArquivoEstoque,
        setArquivoRazao,
        processar,
        limpar,
        setMesSelecionado,
        setFiltroStatus,
    };
}
