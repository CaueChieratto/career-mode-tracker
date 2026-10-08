import { UnifiedCardConfig } from "../types";
import {
  formatDec,
  pluralize,
  formatTotal,
  formatTotalParts,
  formatPerGame,
  formatPerGameParts,
  formatPer90,
  formatPer90Parts,
} from "../helpers";

export const defesaCards: UnifiedCardConfig[] = [
  {
    id: "ballsRecovered",
    title: "Bolas Recuperadas",
    category: "defesa",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "ballsRecovered",
        format: (v) => formatTotal(v, "bola recuperada", "bolas recuperadas"),
        formatParts: (v) =>
          formatTotalParts(v, "bola recuperada", "bolas recuperadas"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "ballsRecoveredPerGame",
        format: (v) =>
          `${formatDec(v)} ${pluralize(v, "recuperação", "recuperações")} de bola por partida`,
        formatParts: (v) => ({
          value: `${formatDec(v)} ${pluralize(v, "recuperação", "recuperações")}`,
          description: "de bola por partida",
        }),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "ballsRecoveredPer90",
        format: (v) =>
          `${formatDec(v)} ${pluralize(v, "recuperação", "recuperações")} de bola a cada 90 minutos`,
        formatParts: (v) => ({
          value: `${formatDec(v)} ${pluralize(v, "recuperação", "recuperações")}`,
          description: "de bola a cada 90 min",
        }),
      },
    ],
  },
  {
    id: "ballsLost",
    title: "Bolas Perdidas",
    category: "defesa",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "ballsLost",
        format: (v) => formatTotal(v, "bola perdida", "bolas perdidas"),
        formatParts: (v) =>
          formatTotalParts(v, "bola perdida", "bolas perdidas"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "ballsLostPerGame",
        format: (v) => formatPerGame(v, "bola perdida", "bolas perdidas"),
        formatParts: (v) =>
          formatPerGameParts(v, "bola perdida", "bolas perdidas"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "ballsLostPer90",
        format: (v) => formatPer90(v, "bola perdida", "bolas perdidas"),
        formatParts: (v) =>
          formatPer90Parts(v, "bola perdida", "bolas perdidas"),
      },
    ],
  },
];
