import { useState, useCallback } from 'react';
import { parseAlterdata, parseEAuditoria } from '../lib/parser/excel-parser';
import { runAudit } from '../lib/auditor/icms-auditor';

// Perfil padrão espelhando os defaults do e-Auditoria (da screenshot: AM, GERAL, GERAL)
const PERFIL_PADRAO = {
    uf: 'AM',
    atividade: 'GERAL',
    regime: 'GERAL',
    regimeEspecial: ''
};

export function useIcmsAuditor() {
    const [alterdataBase, setAlterdataBase] = useState(null);
    const [eAuditoriaBase, setEAuditoriaBase] = useState(null);
    const [eAuditoriaMetadata, setEAuditoriaMetadata] = useState(null);
    const [alterdataName, setAlterdataName] = useState(null);
    const [eAuditoriaName, setEAuditoriaName] = useState(null);
    const [alterdataHasSeguro, setAlterdataHasSeguro] = useState(false);

    // Perfil manual da empresa — analista preenche na UI do Rayo
    const [perfilEmpresa, setPerfilEmpresa] = useState(PERFIL_PADRAO);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [auditResults, setAuditResults] = useState(null);
    const [ncmSemCobertura, setNcmSemCobertura] = useState([]);
    const [correctedAlterdata, setCorrectedAlterdata] = useState(null);
    const [modifiedCells, setModifiedCells] = useState(null);
    const [disambiguationQueue, setDisambiguationQueue] = useState([]);

    const handleUploadAlterdata = useCallback(async (file) => {
        try {
            setLoading(true);
            setError(null);
            const data = await parseAlterdata(file);
            const temSeguro = data.length > 0 && (
                'Valor Seguro' in data[0] || 'Seguro' in data[0] || 'VL_SEG' in data[0]
            );
            setAlterdataHasSeguro(temSeguro);
            setAlterdataBase(data);
            setAlterdataName(file.name);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleUploadEAuditoria = useCallback(async (file) => {
        try {
            setLoading(true);
            setError(null);
            const data = await parseEAuditoria(file);
            setEAuditoriaBase(data.rules);
            // Metadados do e-Auditoria ainda são lidos da planilha (para exibição informativa)
            // mas o perfil que manda no motor é o perfilEmpresa do analista
            setEAuditoriaMetadata(data.metadata);
            setEAuditoriaName(file.name);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const setEAuditoriaBaseSilently = useCallback((rules, sourceName) => {
        setEAuditoriaBase(rules);
        setEAuditoriaName(sourceName);
        setError(null);
    }, []);

    const updatePerfil = useCallback((campo, valor) => {
        setPerfilEmpresa(prev => ({ ...prev, [campo]: valor }));
    }, []);

    const executeAudit = useCallback(() => {
        // e-Auditoria é OPCIONAL — motor roda apenas com bases legais locais se não carregada
        if (!alterdataBase) {
            setError('O arquivo Livrão (Alterdata) precisa estar carregado.');
            return;
        }

        try {
            setLoading(true);
            const natureza = ['INDUSTRIA', 'INDUSTRIA_ALIMENTICIA'].includes(perfilEmpresa.atividade)
                ? 'industria'
                : 'comercio';

            const {
                report,
                correctedData,
                modifiedCells: modified,
                ncmSemCobertura: semCobertura,
                pendingDisambiguation: pending,
            } = runAudit(
                alterdataBase,
                eAuditoriaBase || null, // null aceitável — motor usa bases locais
                { natureza, regime: perfilEmpresa.regime.toLowerCase() }
            );
            setAuditResults(report);
            setNcmSemCobertura(semCobertura);
            setCorrectedAlterdata(correctedData);
            setModifiedCells(modified);
            setDisambiguationQueue(pending || []);
            setError(null);
        } catch (err) {
            setError('Erro ao cruzar as bases: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [alterdataBase, eAuditoriaBase, perfilEmpresa]);

    /**
     * Resolve manualmente um NCM ambíguo da fila de desambiguação.
     * Re-processa o resultado para aquela linha e mescla ao auditResults.
     */
    const resolveDisambiguation = useCallback((rowIndex, regraEscolhida) => {
        setDisambiguationQueue(prev => prev.filter(p => p.rowIndex !== rowIndex));
        // Nota: re-processamento completo da linha pode ser implementado em v3.1
        // Por ora remove da fila — o card da linha ficará como 'análise manual'
    }, []);

    const resetFiles = useCallback(() => {
        setAlterdataBase(null);
        setEAuditoriaBase(null);
        setEAuditoriaMetadata(null);
        setAlterdataName(null);
        setEAuditoriaName(null);
        setAlterdataHasSeguro(false);
        setAuditResults(null);
        setNcmSemCobertura([]);
        setCorrectedAlterdata(null);
        setModifiedCells(null);
        setDisambiguationQueue([]);
        setError(null);
    }, []);

    return {
        alterdataBase, eAuditoriaBase, eAuditoriaMetadata,
        alterdataName, eAuditoriaName, alterdataHasSeguro,
        perfilEmpresa, updatePerfil,
        loading, error, auditResults, ncmSemCobertura, correctedAlterdata, modifiedCells,
        disambiguationQueue, resolveDisambiguation,
        handleUploadAlterdata, handleUploadEAuditoria, executeAudit, resetFiles,
        setEAuditoriaBaseSilently
    };
}
