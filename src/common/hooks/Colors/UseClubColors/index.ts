import { useMemo } from "react";
import { useTheme } from "../../../../contexts/LightThemeContext";

const hexToRgba = (hex: string, alpha: number = 1): string => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getLuminance = (hex?: string): number => {
  if (!hex) return 0;
  let color = hex.replace("#", "");
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (color.length !== 6) return 0;

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

export const getContrastTextColor = (bgHex: string): string => {
  if (!bgHex) return "#FFFFFF";
  return getLuminance(bgHex) >= 128 ? "#000000" : "#FFFFFF";
};

export function useClubColors(colors: string[] | string) {
  const { theme } = useTheme();

  const colorInfo = useMemo(() => {
    const colorsArray = Array.isArray(colors) ? colors : [colors];
    const hexColor1 = colorsArray[0];

    const luminance1 = getLuminance(hexColor1);

    const defaultLightColor = "#52a383";
    const defaultDarkColor = "#256648";

    const maxLuminance = theme === "dark" ? 240 : 180;

    const clubColor =
      luminance1 > maxLuminance
        ? defaultLightColor
        : hexColor1 || defaultLightColor;
    const darkClubColor =
      luminance1 > maxLuminance
        ? defaultDarkColor
        : hexColor1 || defaultDarkColor;

    return {
      clubColor: hexToRgba(clubColor, 0.9),
      darkClubColor: darkClubColor,
    };
  }, [colors, theme]);

  return colorInfo;
}
