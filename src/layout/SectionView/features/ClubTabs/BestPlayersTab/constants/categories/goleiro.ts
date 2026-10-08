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

export const goleiroCards: UnifiedCardConfig[] = [
  {
    id: "defenses",
    title: "Defesas (GOL)",
    category: "goleiro",
    filter: (stat) => stat.player.position === "GOL",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "defenses",
        format: (v) => formatTotal(v, "defesa", "defesas"),
        formatParts: (v) => formatTotalParts(v, "defesa", "defesas"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "defensesPerGame",
        format: (v) => formatPerGame(v, "defesa", "defesas"),
        formatParts: (v) => formatPerGameParts(v, "defesa", "defesas"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "defensesPer90",
        format: (v) => formatPer90(v, "defesa", "defesas"),
        formatParts: (v) => formatPer90Parts(v, "defesa", "defesas"),
      },
    ],
  },
  {
    id: "cleanSheets",
    title: "Jogos Sem Sofrer Gols (GOL)",
    category: "goleiro",
    filter: (stat) => stat.player.position === "GOL",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "cleanSheets",
        format: (v) =>
          `${v} ${pluralize(v, "jogo sem sofrer gol", "jogos sem sofrer gols")}`,
        formatParts: (v) => ({
          value: `${v} ${pluralize(v, "jogo", "jogos")}`,
          description: pluralize(v, "sem sofrer gol", "sem sofrer gols"),
        }),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "cleanSheetsPerGame",
        format: (v) =>
          `${formatDec(v)} ${pluralize(v, "clean sheet", "clean sheets")} por partida`,
        formatParts: (v) => ({
          value: `${formatDec(v)} ${pluralize(v, "clean sheet", "clean sheets")}`,
          description: "por partida",
        }),
      },
    ],
  },
];
