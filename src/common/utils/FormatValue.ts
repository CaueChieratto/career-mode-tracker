const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
  BRL: "R$",
};

export const parseValue = (value: string): number => {
  if (!value || typeof value !== "string") return 0;

  const cleaned = value
    .toLowerCase()
    .replace(/[^0-9kmb.,]/g, "")
    .replace(",", ".");

  const multipliers: { [key: string]: number } = {
    k: 1000,
    m: 1000000,
    b: 1000000000,
  };

  const lastChar = cleaned.slice(-1);
  const multiplier = multipliers[lastChar];

  if (multiplier) {
    const numPart = parseFloat(cleaned.slice(0, -1));
    return isNaN(numPart) ? 0 : numPart * multiplier;
  }

  const finalNumber = parseFloat(cleaned);
  return isNaN(finalNumber) ? 0 : finalNumber;
};

export const formatDisplayValue = (
  value: number,
  currencyCode: string = "EUR",
): string => {
  if (isNaN(value) || value === null) {
    return "";
  }

  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

  if (Math.abs(value) >= 1000000000) {
    const billions = value / 1000000000;
    return `${symbol}${billions % 1 === 0 ? billions : billions.toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1000000) {
    const millions = value / 1000000;
    return `${symbol}${millions % 1 === 0 ? millions : millions.toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000;
    return `${symbol}${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}k`;
  }

  return `${symbol}${value}`;
};
