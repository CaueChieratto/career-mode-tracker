export const getContractInMonths = (savedValue: number): number => {
  if (savedValue <= 0) return 0;
  if (savedValue > 10) return Math.round(savedValue);

  const normalized = Math.round(savedValue * 10) / 10;
  const years = Math.floor(normalized);
  const months = Math.round((normalized - years) * 10);

  return years * 12 + months;
};

export const formatContractDisplay = (savedValue: number): string => {
  const totalMonths = getContractInMonths(savedValue);
  if (totalMonths <= 0) return "Expirado";

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) {
    return months === 1 ? `${months} Mês` : `${months} Meses`;
  }

  if (months === 0) {
    return years === 1 ? `${years} Ano` : `${years} Anos`;
  }

  return `${years}A. ${months}M.`;
};
