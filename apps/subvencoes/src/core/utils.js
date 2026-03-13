/**
 * Utils — Funções utilitárias compartilhadas
 * Portadas do projeto Rayo (parseBRNumber, formatBRNumber)
 */

/** Converte número no formato brasileiro (1.234,56) para float */
export function parseBRNumber(str) {
    if (!str || str.trim() === '') return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

/** Formata float para o formato brasileiro (1.234,56) */
export function formatBRNumber(num, decimals = 2) {
    if (num === 0 || num === null || num === undefined) return '0,00';
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/** Formata valor monetário em BRL */
export function formatCurrency(num) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(num);
}
