import { AcademyPlayers } from "../../../pages/Academy/layouts/AcademyContent/interfaces/AcademyPlayers/AcademyPlayers";
import { AcademyPlayersHistory } from "../../../pages/Academy/layouts/AcademyContent/interfaces/AcademyPlayers/AcademyPlayersHistory";
import { AcademyTournaments } from "../../../pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyTournaments";
import { Positions } from "../../types/Positions";
import { LeagueStats } from "../playersStats/leagueStats";
import { Contract } from "./contract";

export interface Players {
  ballonDor: number;
  overall: number;
  id: string;
  name: string;
  position: keyof Positions | string;
  sector: string;
  age: number;
  salary: number;
  nation: string;
  shirtNumber: string;
  playerValue: number;
  buy: boolean;
  captain: boolean;
  sell: boolean;
  loan?: boolean;
  incomingLoan?: boolean;
  contractTime: number;
  contract: Contract[];
  statsLeagues: LeagueStats[];
  manualStatsLeagues?: LeagueStats[];
  isAcademy?: boolean;
  academyData?: AcademyPlayers;
  academyHistory?: AcademyPlayersHistory[];
  academyTournaments?: AcademyTournaments[];
  academyNickname?: string;
}
