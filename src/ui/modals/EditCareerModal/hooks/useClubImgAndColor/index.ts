import { useState, useEffect } from "react";
import { Career } from "../../../../../common/interfaces/Career";
import { useFilePicker } from "../useFilePicker";

export type CareerModalMode = "create" | "edit" | "style";

export function normalizeHex(color: string | undefined, defaultColor: string): string {
  if (!color || typeof color !== "string") return defaultColor;
  let trimmed = color.trim();
  if (!trimmed.startsWith("#")) {
    trimmed = `#${trimmed}`;
  }
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return defaultColor;
}

export const useClubImgAndColor = (
  mode: CareerModalMode,
  selectedCareer?: Career,
) => {
  const { file, pickFile, onFileChange, inputRef } = useFilePicker();

  const [primaryColor, setPrimaryColor] = useState(() =>
    mode !== "create" && selectedCareer?.colorsTeams?.[0]
      ? normalizeHex(selectedCareer.colorsTeams[0], "#52a383")
      : "#52a383",
  );

  const [secondaryColor, setSecondaryColor] = useState(() =>
    mode !== "create" && selectedCareer?.colorsTeams?.[1]
      ? normalizeHex(selectedCareer.colorsTeams[1], "#ffffff")
      : "#ffffff",
  );

  useEffect(() => {
    if (mode === "create") {
      setPrimaryColor("#52a383");
      setSecondaryColor("#ffffff");
    } else if (
      selectedCareer?.colorsTeams &&
      selectedCareer.colorsTeams.length >= 2
    ) {
      setPrimaryColor(normalizeHex(selectedCareer.colorsTeams[0], "#52a383"));
      setSecondaryColor(normalizeHex(selectedCareer.colorsTeams[1], "#ffffff"));
    }
  }, [mode, selectedCareer]);

  return {
    file,
    pickFile,
    onFileChange,
    inputRef,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
  };
};
