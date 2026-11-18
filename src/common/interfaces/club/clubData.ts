import { Match } from "../Match";
import { Teams } from "../Teams";
import { League } from "../League";
import { Players } from "../playersInfo/players";
import { TableRowData } from "../Table";
import { AcademyPlayers } from "../AcademyData";
import { SeasonFinancialReport } from "../finance";

export interface ClubData {
  players: Players[];
  seasonNumber: number;
  id: string;
  leagues?: League[];
  matches?: Match[];
  teams?: Teams[];
  table?: TableRowData[];
  academyPlayers?: AcademyPlayers[];
  financialReport?: SeasonFinancialReport;
  captains?: string[];
}
