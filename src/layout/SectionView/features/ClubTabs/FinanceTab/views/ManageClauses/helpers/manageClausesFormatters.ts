import { Contract } from "../../../../../../../../common/interfaces/playersInfo/contract";
import { brasilDatePlaceholderShort } from "../../../../../../../../common/utils/Date";

export const isValidShortDate = (str?: string | null): boolean => {
  if (!str || typeof str !== "string") return false;
  const parts = str.split("/");
  if (parts.length !== 2) return false;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return !isNaN(d) && !isNaN(m) && d >= 1 && d <= 31 && m >= 1 && m <= 12;
};

export const getContractFormattedDate = (c?: Contract | null): string => {
  const dateVal = c?.dataExit || c?.dataArrival;
  if (dateVal) {
    try {
      return brasilDatePlaceholderShort(new Date(dateVal));
    } catch {
      return "01/07";
    }
  }
  return "01/07";
};

export const safeScrollToTop = () => {
  try {
    if (
      typeof window !== "undefined" &&
      typeof window.scrollTo === "function"
    ) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (typeof document !== "undefined") {
      if (document.documentElement && document.documentElement.scrollTop > 0) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body && document.body.scrollTop > 0) {
        document.body.scrollTop = 0;
      }
    }
  } catch {
    // ignore in environments without scrollTo support
  }
};

