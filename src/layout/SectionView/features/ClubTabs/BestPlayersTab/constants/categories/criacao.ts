import { UnifiedCardConfig } from "../types";
import {
  formatTotal,
  formatTotalParts,
  formatFrequency,
  formatFrequencyParts,
  formatPerGame,
  formatPerGameParts,
  formatPer90,
  formatPer90Parts,
} from "../helpers";

export const criacaoCards: UnifiedCardConfig[] = [
  {
    id: "assists",
    title: "Assistências",
    category: "criacao",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "assists",
        format: (v) => formatTotal(v, "assistência", "assistências"),
        formatParts: (v) => formatTotalParts(v, "assistência", "assistências"),
      },
      {
        id: "frequency",
        label: "Frequência",
        key: "assistFrequency",
        isAscending: true,
        format: (v) => formatFrequency(v, "assistência"),
        formatParts: (v) => formatFrequencyParts(v, "assistência"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "assistsPerGame",
        format: (v) => formatPerGame(v, "assistência", "assistências"),
        formatParts: (v) =>
          formatPerGameParts(v, "assistência", "assistências"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "assistsPer90",
        format: (v) => formatPer90(v, "assistência", "assistências"),
        formatParts: (v) => formatPer90Parts(v, "assistência", "assistências"),
      },
    ],
  },
  {
    id: "totalPasses",
    title: "Passes",
    category: "criacao",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "totalPasses",
        format: (v) => formatTotal(v, "passe", "passes"),
        formatParts: (v) => formatTotalParts(v, "passe", "passes"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "passesPerGame",
        format: (v) => formatPerGame(v, "passe", "passes"),
        formatParts: (v) => formatPerGameParts(v, "passe", "passes"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "passesPer90",
        format: (v) => formatPer90(v, "passe", "passes"),
        formatParts: (v) => formatPer90Parts(v, "passe", "passes"),
      },
    ],
  },
  {
    id: "passesCompleted",
    title: "Passes Certos",
    category: "criacao",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "passesCompleted",
        format: (v) => formatTotal(v, "passe certo", "passes certos"),
        formatParts: (v) => formatTotalParts(v, "passe certo", "passes certos"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "passesCompletedPerGame",
        format: (v) => formatPerGame(v, "passe certo", "passes certos"),
        formatParts: (v) =>
          formatPerGameParts(v, "passe certo", "passes certos"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "passesCompletedPer90",
        format: (v) => formatPer90(v, "passe certo", "passes certos"),
        formatParts: (v) => formatPer90Parts(v, "passe certo", "passes certos"),
      },
    ],
  },
  {
    id: "passesMissed",
    title: "Passes Errados",
    category: "criacao",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "passesMissed",
        format: (v) => formatTotal(v, "passe errado", "passes errados"),
        formatParts: (v) =>
          formatTotalParts(v, "passe errado", "passes errados"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "passesMissedPerGame",
        format: (v) => formatPerGame(v, "passe errado", "passes errados"),
        formatParts: (v) =>
          formatPerGameParts(v, "passe errado", "passes errados"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "passesMissedPer90",
        format: (v) => formatPer90(v, "passe errado", "passes errados"),
        formatParts: (v) =>
          formatPer90Parts(v, "passe errado", "passes errados"),
      },
    ],
  },
  {
    id: "keyPasses",
    title: "Passes Decisivos",
    category: "criacao",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "keyPasses",
        format: (v) => formatTotal(v, "passe decisivo", "passes decisivos"),
        formatParts: (v) =>
          formatTotalParts(v, "passe decisivo", "passes decisivos"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "keyPassesPerGame",
        format: (v) => formatPerGame(v, "passe decisivo", "passes decisivos"),
        formatParts: (v) =>
          formatPerGameParts(v, "passe decisivo", "passes decisivos"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "keyPassesPer90",
        format: (v) => formatPer90(v, "passe decisivo", "passes decisivos"),
        formatParts: (v) =>
          formatPer90Parts(v, "passe decisivo", "passes decisivos"),
      },
    ],
  },
];

