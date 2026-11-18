export function normalizeClubName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Compara dois nomes de clubes de forma flexível (ignorando sufixos e prefixos comuns como FC, CF, etc.),
 * garantindo compatibilidade entre variações como "FC Barcelona" e "Barcelona", "Arsenal FC" e "Arsenal".
 */
export function isClubNameMatch(nameA?: string, nameB?: string): boolean {
  if (!nameA || !nameB) return false;
  const a = normalizeClubName(nameA);
  const b = normalizeClubName(nameB);
  if (a === b) return true;

  const cleanA = a
    .replace(/\b(fc|cf|sc|ac|afc|ec|f\.c\.|c\.f\.)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  const cleanB = b
    .replace(/\b(fc|cf|sc|ac|afc|ec|f\.c\.|c\.f\.)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (cleanA && cleanB && cleanA === cleanB) return true;
  if (
    cleanA.length >= 4 &&
    cleanB.length >= 4 &&
    (cleanA.includes(cleanB) || cleanB.includes(cleanA))
  ) {
    return true;
  }
  return false;
}
