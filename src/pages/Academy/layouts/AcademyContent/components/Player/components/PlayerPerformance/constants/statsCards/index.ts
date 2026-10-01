import { IconType } from "react-icons";
import { FaStar, FaTshirt } from "react-icons/fa";
import { TournamentStats, TotalStats } from "../../types";
import { GiSoccerBall } from "react-icons/gi";
import { TbTargetArrow } from "react-icons/tb";

type StringOrNumberKeys<T> = {
  [K in keyof T]: T[K] extends string | number ? K : never;
}[keyof T];

interface StatConfig<T> {
  id: string;
  icon: IconType;
  dataKey: StringOrNumberKeys<T>;
  label: string;
  useColor?: boolean;
}

export const TOURNAMENT_STATS_CARDS: StatConfig<TournamentStats>[] = [
  {
    id: "matches",
    icon: FaTshirt,
    dataKey: "matchesPlayed",
    label: "Partidas",
  },
  { id: "goals", icon: GiSoccerBall, dataKey: "goals", label: "Gols" },
  {
    id: "assists",
    icon: TbTargetArrow,
    dataKey: "assists",
    label: "Assistências",
  },
  {
    id: "rating",
    icon: FaStar,
    dataKey: "averageRating",
    label: "Média",
    useColor: true,
  },
];

export const GENERAL_STATS_CARDS: StatConfig<TotalStats>[] = [
  {
    id: "total-matches",
    icon: FaTshirt,
    dataKey: "matchesPlayed",
    label: "Partidas Totais",
  },
  {
    id: "total-goals",
    icon: GiSoccerBall,
    dataKey: "totalGoals",
    label: "Gols Totais",
  },
  {
    id: "total-assists",
    icon: TbTargetArrow,
    dataKey: "totalAssists",
    label: "Assistências Totais",
  },
  {
    id: "total-rating",
    icon: FaStar,
    dataKey: "averageRating",
    label: "Média Geral",
    useColor: true,
  },
];
