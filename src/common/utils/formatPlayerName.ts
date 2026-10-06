const SUFFIXES = new Set(["junior", "júnior", "jr", "jr."]);

/**
 * Formata nomes de jogadores no padrão visual "X. Xxxxx".
 * - Idempotente: se já estiver abreviado (ex: "L. Messi", "V. Jr"), mantém.
 * - Monônimos: "Neymar", "Pelé", "Casemiro" são mantidos sem alteração.
 * - Casos com sufixo (ex: "Vinicius Junior", "Vini Junior", "Neymar Jr"):
 *   mantém o primeiro nome e padroniza para "Jr." (ex: "Vinicius Jr.", "Vini Jr.", "Neymar Jr.").
 * - Casos com 3+ palavras e sufixo (ex: "Lucas Silva Junior"):
 *   abrevia o primeiro nome e padroniza o final (ex: "L. Silva Jr.").
 * - Caso padrão: "Lionel Messi" -> "L. Messi", "Kevin De Bruyne" -> "K. De Bruyne".
 */
export const formatPlayerName = (name?: string | null): string => {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";

  // Se já está no formato de abreviação (ex: "L. Messi", "l. messi", "J. Jogador", "V. Jr", "V. Jr.")
  if (/^[A-Za-zÀ-ÖØ-öø-ÿ]\.\s*/.test(trimmed)) {
    return trimmed.replace(
      /^([A-Za-zÀ-ÖØ-öø-ÿ])\.\s*/,
      (_, letter) => `${letter.toUpperCase()}. `,
    );
  }

  // Dividir por espaços em branco
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }

  const lastWordLower = parts[parts.length - 1].toLowerCase();
  const isSuffix = SUFFIXES.has(lastWordLower);

  // Caso especial: Nome + Júnior/Jr (ex: "Vinicius Junior", "Vini Junior", "Neymar Jr")
  if (isSuffix && parts.length === 2 && parts[0].length > 1) {
    return `${parts[0]} Jr.`;
  }

  // Caso com 3+ palavras terminando em sufixo (ex: "Lucas Silva Junior" -> "L. Silva Jr.")
  if (isSuffix && parts.length > 2) {
    const firstInitial = `${parts[0][0].toUpperCase()}.`;
    const middle = parts.slice(1, -1).join(" ");
    return `${firstInitial} ${middle} Jr.`;
  }

  // Caso geral: abrevia o primeiro nome e mantém o restante
  const firstInitial = `${parts[0][0].toUpperCase()}.`;
  const rest = parts.slice(1).join(" ");
  return `${firstInitial} ${rest}`;
};
