/**
 * useFornecedoresNotas.js — Hook de orquestração do sub-módulo Fornecedores a Pagar
 */

import { useState, useCallback } from 'react';
import { parseFornecedoresRazao } from '../lib/conciliacao-notas/fornecedores-razao-parser';
import { parseTitulosEmAberto } from '../lib/conciliacao-notas/titulos-parser';
import { reconcileNotas } from '../lib/conciliacao-notas/notas-reconciler';

function readFileBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Erro ao ler: ${file.name}`));
        reader.readAsArrayBuffer(file);
    });
}

export function useFornecedoresNotas() {
    const [arquivoRazao, setArquivoRazaoState] = useState(null);
    const [arquivoTitulos, setArquivoTitulosState] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [status, setStatus] = useState('idle');
    const [erro, setErro] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');

    const setArquivoRazao = useCallback((file) => {
        setArquivoRazaoState(file);
        setResultado(null);
        setErro(null);
    }, []);

    const setArquivoTitulos = useCallback((file) => {
        setArquivoTitulosState(file);
        setResultado(null);
        setErro(null);
    }, []);

    const processar = useCallback(async () => {
        if (!arquivoRazao) { setErro('Adicione o arquivo do Razão de Fornecedores (NBS).'); return; }
        if (!arquivoTitulos) { setErro('Adicione o arquivo de Títulos em Aberto (Sankhya).'); return; }

        setStatus('processing');
        setErro(null);

        try {
            const [razaoBuffer, titulosBuffer] = await Promise.all([
                readFileBuffer(arquivoRazao),
                readFileBuffer(arquivoTitulos),
            ]);

            const { byNumNota, contaNome, saldoFinal } = parseFornecedoresRazao(razaoBuffer);
            const titulos = parseTitulosEmAberto(titulosBuffer);

            if (titulos.length === 0) throw new Error('Nenhum título encontrado. Verifique o arquivo.');
            if (byNumNota.size === 0) throw new Error('Nenhuma NF encontrada no Razão. Verifique o arquivo.');

            // Adapta o formato de titulos para o reconciler (espera { numeroNota, totalVlrFin, ... })
            const relatorioAdaptado = titulos.map(t => ({
                numeroNota: t.numeroNota,
                nome: t.nome,
                codparc: '',
                descrnat: t.origem || '',
                parcelas: t.parcelas.map(p => ({
                    nufin: p.nroFin,
                    vlrfin: p.vlr,
                    vlrbaixa: p.quitado ? p.vlr : 0,
                    quitado: p.quitado,
                    dtVencStr: p.dtVencStr,
                    tipoTit: p.tipoTit,
                    tipoOper: p.tipoOper,
                })),
                totalVlrFin: t.totalVlr,
            }));

            const conciliacao = reconcileNotas(relatorioAdaptado, byNumNota);

            setResultado({
                ...conciliacao,
                contaNome,
                saldoFinalRazao: saldoFinal,
                nomeRazao: arquivoRazao.name,
                nomeTitulos: arquivoTitulos.name,
            });
            setStatus('done');
        } catch (e) {
            setErro(e.message || 'Erro desconhecido.');
            setStatus('error');
        }
    }, [arquivoRazao, arquivoTitulos]);

    const limpar = useCallback(() => {
        setArquivoRazaoState(null);
        setArquivoTitulosState(null);
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
        arquivoRazao, arquivoTitulos, resultado, resultadosFiltrados,
        status, erro, filtroStatus,
        setArquivoRazao, setArquivoTitulos,
        processar, limpar, setFiltroStatus,
    };
}
