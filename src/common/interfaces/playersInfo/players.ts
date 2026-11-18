import {
  AcademyPlayers,
  AcademyPlayersHistory,
  AcademyTournaments,
} from "../AcademyData";


import { Positions } from "../../types/Positions";
import { LeagueStats } from "../playersStats/leagueStats";
import { Contract } from "./contract";
import { SquadRole, ContractDetails } from "./contractClauses";

export interface Players {
  ballonDor: number;
  overall: number;
  id: string;
  name: string;
  position: keyof Positions | string;
  sector: string;
  age: number;
  salary?: number;
  nation: string;
  shirtNumber: string;
  playerValue?: number;
  buy: boolean;
  captain: boolean;
  sell: boolean;
  loan?: boolean;
  incomingLoan?: boolean;
  contractTime?: number;
  contractUntil?: string;
  contract: Contract[];
  fullContractHistory?: Contract[];
  statsLeagues: LeagueStats[];
  manualStatsLeagues?: LeagueStats[];
  isAcademy?: boolean;
  academyData?: AcademyPlayers;
  academyHistory?: AcademyPlayersHistory[];
  evolutionHistory?: AcademyPlayersHistory[];
  academyTournaments?: AcademyTournaments[];
  academyNickname?: string;
  playedWithUs?: string;
  originCareerId?: string;
  squadRole?: SquadRole;
  contractDetails?: ContractDetails;
  potential?: number;
  birthDate?: string;
  height?: string;
  weight?: string;
  captainRank?: number;
}

