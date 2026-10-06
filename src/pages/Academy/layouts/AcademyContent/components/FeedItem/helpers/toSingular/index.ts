import { EXCEPTIONS } from "./constants/EXCEPTIONS";
import { SINGULAR_MAP } from "./constants/SINGULAR_MAP";

const capitalizeLike = (original: string, result: string): string => {
  if (!result) return result;

  return original[0] === original[0].toUpperCase()
    ? result.charAt(0).toUpperCase() + result.slice(1)
    : result;
};

export const toSingular = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const phrase = SINGULAR_MAP[trimmed.toLowerCase()];
  if (phrase !== undefined) return phrase;

  return trimmed
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();

      if (EXCEPTIONS.has(lower)) return word;

      const singular = SINGULAR_MAP[lower];

      if (singular === undefined) return word;

      if (singular === "") return "";

      return capitalizeLike(word, singular);
    })
    .filter(Boolean)
    .join(" ");
};
