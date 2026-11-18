export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
  BRL: "R$",
  eur: "€",
  gbp: "£",
  usd: "$",
  brl: "R$",
  "€": "€",
  "£": "£",
  $: "$",
  "R$": "R$",
};

export const getCurrencySymbol = (currency?: string): string => {
  if (!currency) return "€";
  const trimmed = currency.trim();
  const upper = trimmed.toUpperCase();
  if (CURRENCY_SYMBOLS[upper]) return CURRENCY_SYMBOLS[upper];
  if (CURRENCY_SYMBOLS[trimmed]) return CURRENCY_SYMBOLS[trimmed];
  return trimmed;
};

export const parseValue = (value: string): number => {
  if (!value || typeof value !== "string") return 0;

  const raw = value.toLowerCase().replace(/[^0-9kmb.,]/g, "");

  const multipliers: { [key: string]: number } = {
    k: 1000,
    m: 1000000,
    b: 1000000000,
  };

  const lastChar = raw.slice(-1);
  const multiplier = multipliers[lastChar];

  if (multiplier) {
    const numPart = parseFloat(raw.slice(0, -1).replace(",", "."));
    return isNaN(numPart) ? 0 : numPart * multiplier;
  }

  let withoutSuffix = raw;
  if ((withoutSuffix.match(/\./g) || []).length > 1) {
    withoutSuffix = withoutSuffix.replace(/\./g, "");
  } else if (/\.\d{3}$/.test(withoutSuffix)) {
    withoutSuffix = withoutSuffix.replace(".", "");
  }

  const finalNumber = parseFloat(withoutSuffix.replace(",", "."));
  return isNaN(finalNumber) ? 0 : finalNumber;
};

export const formatCompactNumber = (value: number): string => {
  if (value === 0 || isNaN(value)) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    const formatted = parseFloat(billions.toFixed(2));
    return `${formatted}B`;
  }
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted = parseFloat(millions.toFixed(2));
    return `${formatted}M`;
  }
  if (abs >= 1_000) {
    const thousands = value / 1_000;
    const formatted = parseFloat(thousands.toFixed(2));
    return `${formatted}k`;
  }
  return value.toString();
};

export const formatDisplayValue = (
  value: number,
  currencyCode: string = "EUR",
): string => {
  if (isNaN(value) || value === null) {
    return "";
  }

  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${formatCompactNumber(value)}`;
};

export const formatTransferValue = (value: number): string => {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    const val = value / 1_000_000_000;
    const formatted =
      val % 1 === 0 ? val.toString() : val.toFixed(2).replace(".", ",");
    return `${formatted}B`;
  }
  if (abs >= 1_000_000) {
    const val = value / 1_000_000;
    const formatted =
      val % 1 === 0 ? val.toString() : val.toFixed(2).replace(".", ",");
    return `${formatted}M`;
  }
  if (abs >= 1_000) {
    const val = value / 1_000;
    const formatted =
      val % 1 === 0 ? val.toString() : val.toFixed(2).replace(".", ",");
    return `${formatted}k`;
  }
  return value.toString();
};
