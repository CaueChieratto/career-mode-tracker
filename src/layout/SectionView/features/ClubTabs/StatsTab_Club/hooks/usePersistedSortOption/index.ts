import { useEffect, useState } from "react";

const DEFAULT_OPTION = "Ordenar por padrão";

export type SortStoragePrefix = "playerSort" | "squadSort";

export const usePersistedSortOption = (
  seasonId: string,
  storagePrefix: SortStoragePrefix = "playerSort",
) => {
  const STORAGE_KEY = `${storagePrefix}Option_${seasonId}`;
  const STORAGE_KEY_REVERSED =
    storagePrefix === "squadSort"
      ? `squadSortAsc_${seasonId}`
      : `${storagePrefix}Reversed_${seasonId}`;

  const [sortOption, setSortOption] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "Padrão") return DEFAULT_OPTION;
    return saved || DEFAULT_OPTION;
  });

  const [isReversed, setIsReversed] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REVERSED);
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, sortOption);
  }, [sortOption, STORAGE_KEY]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REVERSED, String(isReversed));
  }, [isReversed, STORAGE_KEY_REVERSED]);

  const handleSetSortOption = (newOption: string) => {
    const normalizedOption =
      newOption === "Padrão" ? DEFAULT_OPTION : newOption;

    if (normalizedOption === sortOption) {
      setIsReversed((prev) => !prev);
    } else {
      setSortOption(normalizedOption);
      setIsReversed(false);
    }
  };

  return {
    sortOption,
    setSortOption: handleSetSortOption,
    isReversed,
  };
};
