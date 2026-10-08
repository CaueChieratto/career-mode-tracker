import { UnifiedCardConfig } from "../types";
import { formatDec, pluralize } from "../helpers";

export const fisicoCards: UnifiedCardConfig[] = [
  {
    id: "distanceKm",
    title: "Distância Percorrida",
    category: "fisico",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "distanceKm",
        format: (v) => `${formatDec(v, 1)} km percorridos ao todo`,
        formatParts: (v) => ({
          value: `${formatDec(v, 1)} km`,
          description: "percorridos ao todo",
        }),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "distanceKmPerGame",
        format: (v) => `${formatDec(v, 1)} km por partida`,
        formatParts: (v) => ({
          value: `${formatDec(v, 1)} km`,
          description: "por partida",
        }),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "distanceKmPer90",
        format: (v) => `${formatDec(v, 1)} km a cada 90 minutos`,
        formatParts: (v) => ({
          value: `${formatDec(v, 1)} km`,
          description: "a cada 90 min",
        }),
      },
    ],
  },
  {
    id: "maxDistanceKmInGame",
    title: "Maior Distância em um Jogo",
    category: "fisico",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "maxDistanceKmInGame",
        format: (v) => `${formatDec(v, 1)} km em um jogo`,
        formatParts: (v) => ({
          value: `${formatDec(v, 1)} km`,
          description: "em um jogo",
        }),
      },
    ],
  },
  {
    id: "minutesPlayed",
    title: "Minutos Jogados",
    category: "fisico",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "minutesPlayed",
        format: (v) =>
          `${v.toLocaleString("pt-BR")} ${pluralize(v, "minuto jogado", "minutos jogados")}`,
        formatParts: (v) => ({
          value: `${v.toLocaleString("pt-BR")} ${pluralize(v, "minuto", "minutos")}`,
          description: pluralize(v, "jogado", "jogados"),
        }),
      },
    ],
  },
  {
    id: "minutesPerGame",
    title: "Minutos por Jogo",
    category: "fisico",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "minutesPerGame",
        format: (v) =>
          `${Math.round(Number(v))} ${pluralize(Math.round(Number(v)), "minuto", "minutos")} por partida`,
        formatParts: (v) => ({
          value: `${Math.round(Number(v))} ${pluralize(Math.round(Number(v)), "minuto", "minutos")}`,
          description: "por partida",
        }),
      },
    ],
  },
];
