interface EvolutionHistoryItem {
  id?: string;
  changedAttribute: string;
  date: string;
  description: string;
  oldValue: string | number;
  newValue: string | number;
}

export interface PlayerData {
  id?: string;
  arrivalDate: string;
  evolutionHistory?: EvolutionHistoryItem[];
}

export interface ChartDataPoint {
  label: string;
  value: string | number;
  title: string;
  desc: string;
}
