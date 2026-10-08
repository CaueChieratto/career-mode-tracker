import { AggregatedPlayerStats } from "../../../../../../common/interfaces/AggregatedPlayerStats/AggregatedPlayerStats";

export type TabModality = "totals" | "frequency" | "perGame" | "per90";

export type StatDisplayParts = {
  value: string | number;
  description?: string;
};

export type UnifiedTabConfig = {
  id: TabModality | string;
  label: string;
  key: keyof AggregatedPlayerStats;
  isRating?: boolean;
  isAscending?: boolean;
  format?: (val: number) => string | number;
  formatParts?: (val: number) => StatDisplayParts;
  filter?: (stat: AggregatedPlayerStats) => boolean;
};

export type CardCategory =
  | "geral"
  | "ataque"
  | "criacao"
  | "conducoes"
  | "defesa"
  | "disciplina"
  | "goleiro"
  | "fisico";

export type UnifiedCardConfig = {
  id: string;
  title: string;
  category: CardCategory;
  tabs: UnifiedTabConfig[];
  filter?: (stat: AggregatedPlayerStats) => boolean;
};

export type StatModality = TabModality;

export type StatConfig = {
  title: string;
  key: keyof AggregatedPlayerStats;
  modality: StatModality;
  isRating?: boolean;
  isAscending?: boolean;
  format?: (v: number) => string | number;
  formatParts?: (v: number) => StatDisplayParts;
  filter?: (stat: AggregatedPlayerStats) => boolean;
};
