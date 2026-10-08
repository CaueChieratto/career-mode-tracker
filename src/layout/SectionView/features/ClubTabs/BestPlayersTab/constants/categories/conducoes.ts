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

export const conducoesCards: UnifiedCardConfig[] = [
  {
    id: "totalDribbles",
    title: "Conduções",
    category: "conducoes",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "totalDribbles",
        format: (v) => formatTotal(v, "condução", "conduções"),
        formatParts: (v) => formatTotalParts(v, "condução", "conduções"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "dribblesPerGame",
        format: (v) => formatPerGame(v, "condução", "conduções"),
        formatParts: (v) => formatPerGameParts(v, "condução", "conduções"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "dribblesPer90",
        format: (v) => formatPer90(v, "condução", "conduções"),
        formatParts: (v) => formatPer90Parts(v, "condução", "conduções"),
      },
    ],
  },
  {
    id: "dribblesCompleted",
    title: "Conduções Certas",
    category: "conducoes",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "dribblesCompleted",
        format: (v) =>
          `${v} ${pluralize(v, "condução certa", "conduções certas")}`,
        formatParts: (v) => ({
          value: `${v} ${pluralize(v, "condução", "conduções")}`,
          description: pluralize(v, "certa", "certas"),
        }),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "dribblesCompletedPerGame",
        format: (v) =>
          `${formatDec(v)} ${pluralize(v, "condução certa", "conduções certas")} por partida`,
        formatParts: (v) => ({
          value: `${formatDec(v)} ${pluralize(v, "condução", "conduções")}`,
          description: `${pluralize(v, "certa", "certas")} por partida`,
        }),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "dribblesCompletedPer90",
        format: (v) =>
          `${formatDec(v)} ${pluralize(v, "condução certa", "conduções certas")} a cada 90 minutos`,
        formatParts: (v) => ({
          value: `${formatDec(v)} ${pluralize(v, "condução", "conduções")}`,
          description: `${pluralize(v, "certa", "certas")} a cada 90 min`,
        }),
      },
    ],
  },
  {
    id: "dribblesMissed",
    title: "Conduções Erradas",
    category: "conducoes",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "dribblesMissed",
        format: (v) =>
          `${v} ${pluralize(v, "condução errada", "conduções erradas")}`,
        formatParts: (v) => ({
          value: `${v} ${pluralize(v, "condução", "conduções")}`,
          description: pluralize(v, "errada", "erradas"),
        }),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "dribblesMissedPerGame",
        format: (v) =>
          `${formatDec(v)} ${pluralize(v, "condução errada", "conduções erradas")} por partida`,
        formatParts: (v) => ({
          value: `${formatDec(v)} ${pluralize(v, "condução", "conduções")}`,
          description: `${pluralize(v, "errada", "erradas")} por partida`,
        }),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "dribblesMissedPer90",
        format: (v) =>
          `${formatDec(v)} ${pluralize(v, "condução errada", "conduções erradas")} a cada 90 minutos`,
        formatParts: (v) => ({
          value: `${formatDec(v)} ${pluralize(v, "condução", "conduções")}`,
          description: `${pluralize(v, "errada", "erradas")} a cada 90 min`,
        }),
      },
    ],
  },
];
