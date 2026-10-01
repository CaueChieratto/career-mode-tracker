import { AcademyPlayersHistory } from "./AcademyPlayersHistory";
import { AcademyPlayersStatus } from "./AcademyPlayersStatus";

export interface AcademyPlayers {
  id: string;
  name: string;
  nationality: string;
  age: number;
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
