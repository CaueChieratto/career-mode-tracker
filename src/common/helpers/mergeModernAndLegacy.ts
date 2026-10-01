// The modern item is authoritative; embedded items remain fallback by identity.
export function mergeModernAndLegacy<T>(
  modern: T[],
  legacy: T[],
  getId: (item: T) => string,
): T[] {
  const modernIds = new Set(modern.map(getId));
  return [...modern, ...legacy.filter((item) => !modernIds.has(getId(item)))];
}
