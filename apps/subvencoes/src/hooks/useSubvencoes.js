import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { parseSpedEfd, mergeSpedResults } from '../core/parsers/sped-parser.js';
import { parseNfe } from '../core/parsers/xml-parser.js';
import { reconciliar } from '../core/engines/reconciliation-engine.js';
import { aplicarElegibilidade } from '../core/engines/eligibility-engine.js';
import { calcularTotalSuv } from '../core/engines/suv-calculator.js';
import { aplicarDevolucoes } from '../core/engines/devolucao-handler.js';

export function useSubvencoes() {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Aceita N arquivos SPED (matriz + filiais do mesmo grupo econômico)
    const spedFilesRef = useRef([]);
    const xmlFilesRef = useRef([]);

    const processFiles = useCallback(async () => {
        if (!spedFilesRef.current?.length) return;
        setProcessing(true);
        setError(null);
        setResult(null);

        try {
            // 1. Parse de todos os SPEDs e merge consolidado
            setProgress(`Lendo ${spedFilesRef.current.length} arquivo(s) SPED EFD...`);
            const spedResultados = [];
            for (const file of spedFilesRef.current) {
                const text = await file.text();
                spedResultados.push(parseSpedEfd(text));
            }
            const { meta, documentos: spedDocs, stats: spedStats, estabelecimentos } = mergeSpedResults(spedResultados);

            // 2. Parse XMLs (aceita Files diretos e ZIPs)
            setProgress('Lendo XMLs das notas fiscais...');
            const xmlDocs = [];
            for (const file of xmlFilesRef.current) {
                if (file.name.toLowerCase().endsWith('.zip')) {
                    const zip = await JSZip.loadAsync(file);
                    const xmlEntries = Object.values(zip.files).filter(
                        (f) => !f.dir && f.name.toLowerCase().endsWith('.xml')
                    );
                    for (const entry of xmlEntries) {
                        const text = await entry.async('string');
                        try { xmlDocs.push(parseNfe(text)); } catch { /* ignora XML inválido */ }
                    }
                } else if (file.name.toLowerCase().endsWith('.xml')) {
                    const text = await file.text();
                    try { xmlDocs.push(parseNfe(text)); } catch { /* ignora */ }
                }
            }

            // 3. Reconciliação consolidada (todos os SPEDs × todos os XMLs)
            setProgress(`Cruzando ${spedStats.totalC100} notas (${estabelecimentos.length} estabelecimento(s)) com ${xmlDocs.length} XMLs...`);
            const reconciliados = reconciliar(spedDocs, xmlDocs);

            // 4. Elegibilidade
            setProgress('Aplicando regras de elegibilidade (CFOP × Origem × vICMSDeson)...');
            const comElegibilidade = aplicarElegibilidade(reconciliados);

            // 5. Cálculo SUV
            setProgress('Calculando Subvenção para Investimento...');
            const { docsCalculados, totalSuv, totalBase, creditoFiscal } = calcularTotalSuv(comElegibilidade);

            // 6. Devoluções
            setProgress('Processando devoluções...');
            const { docsAjustados, descontoTotalSuv } = aplicarDevolucoes(docsCalculados);

            const finalSuv = totalSuv - descontoTotalSuv;

            setResult({
                meta,
                estabelecimentos,
                docs: docsAjustados,
                totalSuv: finalSuv,
                totalBase,
                creditoFiscal,
                descontoTotalSuv,
                stats: {
                    ...spedStats,
                    totalXml: xmlDocs.length,
                    totalEstabelecimentos: estabelecimentos.length,
                    totalReconciliados: reconciliados.filter((d) => d.status === 'SPED_SIM_XML_SIM').length,
                    totalSoSped: reconciliados.filter((d) => d.status === 'SPED_SIM_XML_NAO').length,
                    totalSoXml: reconciliados.filter((d) => d.status === 'SPED_NAO_XML_SIM').length,
                    totalDivergencias: docsAjustados.reduce((s, d) => s + (d.divergencias?.length || 0), 0),
                    totalElegiveis: docsAjustados.filter((d) => d.elegivel).length,
                },
            });
        } catch (err) {
            setError(err.message || 'Erro inesperado durante o processamento.');
            console.error(err);
        } finally {
            setProcessing(false);
            setProgress('');
        }
    }, []);

    return { processing, progress, result, error, spedFilesRef, xmlFilesRef, processFiles };
}
