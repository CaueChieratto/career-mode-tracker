export function formatKnockoutStage(
  stage?: string,
  isReturnMatch?: boolean,
): string {
  if (!stage || !stage.trim()) return "";
  const trimmed = stage.trim();
  if (!isReturnMatch) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("volta")) return trimmed;

  if (
    lower.startsWith("oitavas") ||
    lower.startsWith("quartas") ||
    lower.startsWith("semifinais") ||
    lower.startsWith("finais")
  ) {
    return `Volta das ${trimmed}`;
  }

  if (
    lower.startsWith("playoffs") ||
    lower.startsWith("dezesseis-avos") ||
    lower.startsWith("dezesseis avos")
  ) {
    return `Volta dos ${trimmed}`;
  }

  if (lower.startsWith("playoff")) {
    return `Volta do ${trimmed}`;
  }

  return `Volta da ${trimmed}`;
}
