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

export const ataqueCards: UnifiedCardConfig[] = [
  {
    id: "goals",
    title: "Gols",
    category: "ataque",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "goals",
        format: (v) => formatTotal(v, "gol", "gols"),
        formatParts: (v) => formatTotalParts(v, "gol", "gols"),
      },
      {
        id: "frequency",
        label: "Frequência",
        key: "goalFrequency",
        isAscending: true,
        format: (v) => formatFrequency(v, "gol"),
        formatParts: (v) => formatFrequencyParts(v, "gol"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "goalsPerGame",
        format: (v) => formatPerGame(v, "gol", "gols"),
        formatParts: (v) => formatPerGameParts(v, "gol", "gols"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "goalsPer90",
        format: (v) => formatPer90(v, "gol", "gols"),
        formatParts: (v) => formatPer90Parts(v, "gol", "gols"),
      },
    ],
  },
  {
    id: "goalParticipations",
    title: "Participações em Gols",
    category: "ataque",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "goalParticipations",
        format: (v) => formatTotal(v, "participação", "participações"),
        formatParts: (v) =>
          formatTotalParts(v, "participação", "participações"),
      },
      {
        id: "frequency",
        label: "Frequência",
        key: "participationFrequency",
        isAscending: true,
        format: (v) => formatFrequency(v, "participação"),
        formatParts: (v) => formatFrequencyParts(v, "participação"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "goalParticipationsPerGame",
        format: (v) => formatPerGame(v, "participação", "participações"),
        formatParts: (v) =>
          formatPerGameParts(v, "participação", "participações"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "goalParticipationsPer90",
        format: (v) => formatPer90(v, "participação", "participações"),
        formatParts: (v) =>
          formatPer90Parts(v, "participação", "participações"),
      },
    ],
  },
  {
    id: "totalFinishings",
    title: "Chutes",
    category: "ataque",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "totalFinishings",
        format: (v) => formatTotal(v, "chute", "chutes"),
        formatParts: (v) => formatTotalParts(v, "chute", "chutes"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "finishingsPerGame",
        format: (v) => formatPerGame(v, "chute", "chutes"),
        formatParts: (v) => formatPerGameParts(v, "chute", "chutes"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "finishingsPer90",
        format: (v) => formatPer90(v, "chute", "chutes"),
        formatParts: (v) => formatPer90Parts(v, "chute", "chutes"),
      },
    ],
  },
  {
    id: "finishingsOnTarget",
    title: "Chutes no Alvo",
    category: "ataque",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "finishingsOnTarget",
        format: (v) => formatTotal(v, "chute no alvo", "chutes no alvo"),
        formatParts: (v) => formatTotalParts(v, "chute no alvo", "chutes no alvo"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "finishingsOnTargetPerGame",
        format: (v) => formatPerGame(v, "chute no alvo", "chutes no alvo"),
        formatParts: (v) =>
          formatPerGameParts(v, "chute no alvo", "chutes no alvo"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "finishingsOnTargetPer90",
        format: (v) => formatPer90(v, "chute no alvo", "chutes no alvo"),
        formatParts: (v) =>
          formatPer90Parts(v, "chute no alvo", "chutes no alvo"),
      },
    ],
  },
  {
    id: "finishingsMissed",
    title: "Chutes para Fora",
    category: "ataque",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "finishingsMissed",
        format: (v) => formatTotal(v, "chute para fora", "chutes para fora"),
        formatParts: (v) =>
          formatTotalParts(v, "chute para fora", "chutes para fora"),
      },
      {
        id: "perGame",
        label: "Por Jogo",
        key: "finishingsMissedPerGame",
        format: (v) => formatPerGame(v, "chute para fora", "chutes para fora"),
        formatParts: (v) =>
          formatPerGameParts(v, "chute para fora", "chutes para fora"),
      },
      {
        id: "per90",
        label: "Por 90 min",
        key: "finishingsMissedPer90",
        format: (v) => formatPer90(v, "chute para fora", "chutes para fora"),
        formatParts: (v) =>
          formatPer90Parts(v, "chute para fora", "chutes para fora"),
      },
    ],
  },
];

