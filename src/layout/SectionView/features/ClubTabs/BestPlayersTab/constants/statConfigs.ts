import { UnifiedCardConfig, StatConfig, StatModality } from "./types";
import { geralCards } from "./categories/geral";
import { ataqueCards } from "./categories/ataque";
import { criacaoCards } from "./categories/criacao";
import { conducoesCards } from "./categories/conducoes";
import { defesaCards } from "./categories/defesa";
import { disciplinaCards } from "./categories/disciplina";
import { goleiroCards } from "./categories/goleiro";
import { fisicoCards } from "./categories/fisico";

export type {
  TabModality,
  StatDisplayParts,
  UnifiedTabConfig,
  UnifiedCardConfig,
  CardCategory,
  StatModality,
  StatConfig,
} from "./types";

export {
  formatDec,
  pluralize,
  formatTotal,
  formatTotalParts,
  formatPerGame,
  formatPerGameParts,
  formatPer90,
  formatPer90Parts,
  formatFrequency,
  formatFrequencyParts,
  formatPhraseTotal,
  formatPhraseTotalParts,
  formatPhrasePerGame,
  formatPhrasePerGameParts,
  formatPhrasePer90,
  formatPhrasePer90Parts,
} from "./helpers";

export const UNIFIED_CARDS_CONFIG: UnifiedCardConfig[] = [
  ...geralCards,
  ...ataqueCards,
  ...criacaoCards,
  ...conducoesCards,
  ...defesaCards,
  ...disciplinaCards,
  ...goleiroCards,
  ...fisicoCards,
];

export const statConfigs: StatConfig[] = UNIFIED_CARDS_CONFIG.flatMap((card) =>
  card.tabs.map((tab) => ({
    title: card.tabs.length > 1 ? `${card.title} (${tab.label})` : card.title,
    key: tab.key,
    modality: (tab.id as StatModality) || "totals",
    isRating: tab.isRating,
    isAscending: tab.isAscending,
    format: tab.format,
    formatParts: tab.formatParts,
    filter: tab.filter || card.filter,
  })),
);
