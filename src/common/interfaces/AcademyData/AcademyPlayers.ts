export type AcademyPlayersStatus = "academy" | "promoted" | "released";

export interface AcademyPlayersHistory {
  id: string;
  date: string;
  description: string;
  changedAttribute: string;
  oldValue: string | number;
  newValue: string | number;
}

export interface AcademyPlayers {
  id: string;
  name: string;
  nationality: string;
  age: number;
  birthDate?: string;
  shirtNumber?: number;
  height: number;
  weight: number;
  sector: string;
  position: string;
  overall: number;
  potential: string;
  annotations: string;
  arrivalDate: string;
  exitDate?: string;
  status: AcademyPlayersStatus;
  evolutionHistory: AcademyPlayersHistory[];
  seasonId?: string;
}

