/**
 * Utilitário de parsing e normalização de duração de empréstimo.
 * Aceita frações e números inteiros: 0.6 (6 meses), 1 (1 ano), 1.6 (18 meses), 2 (2 anos).
 * Suporta separadores com vírgula ou ponto (ex: "1,6", "1.6", "0,6", "0.6").
 */
export const parseLoanDuration = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const str = String(value).trim().toLowerCase().replace(",", ".");
  if (!str) return null;
  if (str === "curto prazo" || str === "curto-prazo") return 0.6;
  if (str === "1 ano" || str === "1ano") return 1;
  if (str === "2 anos" || str === "2anos") return 2;
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  if (num === 0.5 || num === 0.6) return 0.6;
  if (num === 1) return 1;
  if (num === 1.5 || num === 1.6) return 1.6;
  if (num === 2) return 2;
  return null;
};
