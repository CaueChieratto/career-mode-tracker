import { UnifiedCardConfig } from "../types";
import {
  formatTotal,
  formatTotalParts,
  formatPerGame,
  formatPerGameParts,
  formatPer90,
  formatPer90Parts,
} from "../helpers";

export const disciplinaCards: UnifiedCardConfig[] = [
  {
    id: "yellowCards",
    title: "Cartões Amarelos",
    category: "disciplina",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "yellowCards",
        format: (v) => formatTotal(v, "amarelo", "amarelos"),
        formatParts: (v) => formatTotalParts(v, "amarelo", "amarelos"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "yellowCardsPerGame",
        format: (v) => formatPerGame(v, "amarelo", "amarelos"),
        formatParts: (v) => formatPerGameParts(v, "amarelo", "amarelos"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "yellowCardsPer90",
        format: (v) => formatPer90(v, "amarelo", "amarelos"),
        formatParts: (v) => formatPer90Parts(v, "amarelo", "amarelos"),
      },
    ],
  },
  {
    id: "redCards",
    title: "Cartões Vermelhos",
    category: "disciplina",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "redCards",
        format: (v) => formatTotal(v, "vermelho", "vermelhos"),
        formatParts: (v) => formatTotalParts(v, "vermelho", "vermelhos"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "redCardsPerGame",
        format: (v) => formatPerGame(v, "vermelho", "vermelhos"),
        formatParts: (v) => formatPerGameParts(v, "vermelho", "vermelhos"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "redCardsPer90",
        format: (v) => formatPer90(v, "vermelho", "vermelhos"),
        formatParts: (v) => formatPer90Parts(v, "vermelho", "vermelhos"),
      },
    ],
  },
];
