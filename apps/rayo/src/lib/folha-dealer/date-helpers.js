/**
 * Retorna a data do último dia da competência fornecida no formato YYYY-MM-DD.
 * @param {string} competence - Formato YYYY-MM
 * @returns {string} - Formato YYYY-MM-DD
 */
export function getLastDayOfCompetence(competence) {
  if (!competence || !/^\d{4}-\d{2}$/.test(competence)) {
    return '';
  }
  const [yearStr, monthStr] = competence.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  
  // Date constructor com dia 0 retorna o último dia do mês anterior.
  // Como JS month é 0-indexed, passar 'month' exato cai no mês seguinte,
  // então o dia 0 desse mês nos dá o último dia do mês desejado.
  const lastDay = new Date(year, month, 0).getDate();
  
  return `${year}-${monthStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}
