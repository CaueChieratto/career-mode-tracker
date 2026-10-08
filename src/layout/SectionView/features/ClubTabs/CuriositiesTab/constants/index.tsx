import {
  MdAccessTime,
  MdPeopleOutline,
  MdOutlineWarning,
  MdOutlineStarBorder,
  MdSportsSoccer,
  MdTimer,
} from "react-icons/md";
import {
  CuriositiesRankings,
  RankingType,
} from "../../../../../../common/interfaces/Curiosities";
import { isCuriosityGroupEnabled } from "../../../../../../common/stats";

export interface RankingCardConfig {
  key: keyof CuriositiesRankings;
  title: string;
  icon: React.ReactNode;
  type: RankingType;
  accentColor: string;
  isMinuteLabel?: boolean;
  group?: "goals" | "assists" | "general" | "defense" | string;
}

export const allRankingCards: RankingCardConfig[] = [
  {
    key: "topDecisivePlayers",
    title: "Jogadores Decisivos (Gols da Vitória)",
    icon: <MdOutlineStarBorder />,
    type: "goals",
    accentColor: "#eab308",
    group: "goals",
  },
  {
    key: "topOpeners",
    title: "Especialistas em Abrir o Placar",
    icon: <MdSportsSoccer />,
    type: "goals",
    accentColor: "#f97316",
    group: "goals",
  },
  {
    key: "topWinAssistants",
    title: "Reis da Assistência (Em Vitórias)",
    icon: <MdPeopleOutline />,
    type: "assists",
    accentColor: "#3b82f6",
    group: "assists",
  },
  {
    key: "topStoppageTimeExperts",
    title: "Especialistas dos Acréscimos (90'+)",
    icon: <MdTimer />,
    type: "goals",
    accentColor: "#8b5cf6",
    group: "goals",
  },
  {
    key: "topTeamDuos",
    title: "Conexões Diretas (Gol & Passe)",
    icon: <MdPeopleOutline />,
    type: "goals",
    accentColor: "#8b5cf6",
    group: "goals",
  },
  {
    key: "topBestDuos",
    title: "Melhores Duplas",
    icon: <MdPeopleOutline />,
    type: "participations",
    accentColor: "#6366f1",
    group: "goals",
  },
  {
    key: "topPlayerGoalMinutes",
    title: "Jogador & Minuto Letal",
    icon: <MdOutlineStarBorder />,
    type: "goals",
    accentColor: "#10b981",
    group: "goals",
  },
  {
    key: "topPlayerAssistMinutes",
    title: "Assistente & Minuto Letal",
    icon: <MdPeopleOutline />,
    type: "assists",
    accentColor: "#3b82f6",
    group: "assists",
  },
  {
    key: "topScoringMinutes",
    title: "Minutos Letais (Gols Pró)",
    icon: <MdAccessTime />,
    type: "goals",
    isMinuteLabel: true,
    accentColor: "#10b981",
    group: "goals",
  },
  {
    key: "dangerousIntervals",
    title: "Intervalos Mais Perigosos",
    icon: <MdOutlineWarning />,
    type: "goals",
    accentColor: "#f43f5e",
    group: "goals",
  },
  {
    key: "topConcedingMinutes",
    title: "Minutos de Tensão (Gols Sofridos)",
    icon: <MdAccessTime />,
    type: "goals",
    isMinuteLabel: true,
    accentColor: "#ef4444",
    group: "goals",
  },
  {
    key: "topOpponents",
    title: "Rivais Mais Frequentes",
    icon: <MdPeopleOutline />,
    type: "times",
    accentColor: "#eab308",
    group: "general",
  },
  {
    key: "topVictims",
    title: "Maiores Vítimas (Gols Marcados)",
    icon: <MdOutlineStarBorder />,
    type: "goals",
    accentColor: "#22c55e",
    group: "goals",
  },
  {
    key: "topPunchingBags",
    title: "Sacos de Pancada (Saldo de Gols)",
    icon: <MdOutlineStarBorder />,
    type: "goals",
    accentColor: "#14b8a6",
    group: "goals",
  },
  {
    key: "topOpponentTeamsScorers",
    title: "Times Pedras no Sapato (Gols Sofridos)",
    icon: <MdOutlineWarning />,
    type: "goals",
    accentColor: "#ef4444",
    group: "goals",
  },
  {
    key: "topOpponentParticipations",
    title: "Maiores Carrascos (Gols + Assistências)",
    icon: <MdOutlineWarning />,
    type: "participations",
    accentColor: "#ef4444",
    group: "goals",
  },
  {
    key: "topOpponentScorers",
    title: "Pesadelos da Defesa",
    icon: <MdOutlineWarning />,
    type: "goals",
    accentColor: "#f59e0b",
    group: "goals",
  },
  {
    key: "topReincidents",
    title: "Carrascos Reincidentes",
    icon: <MdOutlineWarning />,
    type: "times",
    accentColor: "#f97316",
    group: "general",
  },
  {
    key: "topOpponentDuos",
    title: "Duplas Letais (Rivais)",
    icon: <MdPeopleOutline />,
    type: "goals",
    accentColor: "#ef4444",
    group: "goals",
  },
  {
    key: "topScores",
    title: "Placares Repetidos",
    icon: <MdOutlineStarBorder />,
    type: "times",
    accentColor: "#3b82f6",
    group: "general",
  },
];

export const rankingCards: RankingCardConfig[] = allRankingCards.filter(
  (card) => isCuriosityGroupEnabled(card.group),
);
