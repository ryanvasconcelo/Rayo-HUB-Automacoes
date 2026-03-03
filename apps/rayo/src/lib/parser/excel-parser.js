import * as XLSX from 'xlsx';

// ─── Colunas obrigatórias do Livrão Alterdata ─────────────────────────────────
// Se o arquivo não contiver TODAS essas colunas, o upload é rejeitado com aviso claro.
const COLUNAS_OBRIGATORIAS_ALTERDATA = [
    'Classificação',   // NCM
    'CST ICMS',
    'CFOP',
    'ICMS Base item',
    'Valor Total Item',
];

/**
 * Lê o Livrão Alterdata e valida a estrutura.
 * Lança erro descritivo se colunas obrigatórias estiverem ausentes.
 * @param {File} file Arquivo .xlsx ou .csv
 * @returns {Promise<Array>} Array de objetos com as colunas mapeadas.
 */
export const parseAlterdata = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: null });

                if (jsonData.length === 0) {
                    reject(new Error('A planilha está vazia. Verifique se exportou o relatório correto do Alterdata.'));
                    return;
                }

                // Validação de colunas obrigatórias
                const colunasPresentes = Object.keys(jsonData[0]);
                const colunasFaltando = COLUNAS_OBRIGATORIAS_ALTERDATA.filter(
                    col => !colunasPresentes.includes(col)
                );

                if (colunasFaltando.length > 0) {
                    reject(new Error(
                        `Planilha inválida — colunas obrigatórias não encontradas:\n• ${colunasFaltando.join('\n• ')}\n\nVerifique se você enviou o Livrão Bruto (Alterdata) completo e tente novamente.`
                    ));
                    return;
                }

                resolve(jsonData);
            } catch (error) {
                reject(new Error('Erro ao ler arquivo Alterdata: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo Alterdata. Verifique se o arquivo não está corrompido.'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Lê o Relatório do e-Auditoria, extrai metadados do Perfil e as Regras.
 * @param {File} file Arquivo .xlsx ou .csv
 * @returns {Promise<Object>} { metadata: { atividade, regime, uf }, rules: Array }
 */
export const parseEAuditoria = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

                // Extrair as primeiras linhas para pegar o Perfil da Empresa
                const headerRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, range: 0, defval: null });

                let atividade = 'GERAL';
                let regime = 'LUCRO REAL';
                let uf = '';

                for (let i = 0; i < 5; i++) {
                    const row = headerRows[i];
                    if (!row) continue;
                    const labelCell = String(row[0] || '');
                    const valueCell = String(row[1] || '').trim();
                    if (labelCell.includes('Atividade Selecionada')) atividade = valueCell;
                    if (labelCell.includes('Regime Tributário')) regime = valueCell;
                    if (labelCell.includes('UF')) uf = valueCell;
                }

                const natureza = atividade.toUpperCase().includes('INDÚSTRIA') ? 'industria' : 'comercio';
                const rules = XLSX.utils.sheet_to_json(firstSheet, { range: 5, defval: null });

                resolve({
                    metadata: { atividade, regime, uf, natureza },
                    rules,
                });
            } catch (error) {
                reject(new Error('Erro ao ler arquivo e-Auditoria: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo e-Auditoria. Verifique se o arquivo não está corrompido.'));
        reader.readAsArrayBuffer(file);
    });
};
