import { AggregatedPlayerStats } from "../../../../../../common/interfaces/AggregatedPlayerStats/AggregatedPlayerStats";

type StatConfig = {
  title: string;
  key: keyof AggregatedPlayerStats;
  isRating?: boolean;
  isAscending?: boolean;
  format?: (v: number) => string | number;
};

export const statConfigs: StatConfig[] = [
  {
    title: "Médias das notas",
    key: "avgRating",
    isRating: true,
    format: (v: number) => v.toFixed(2),
  },
  { title: "Gols", key: "goals" },
  {
    title: "Gols por minutos",
    key: "goalFrequency",
    isAscending: true,
    format: (v: number) => `${Math.round(v)}'`,
  },
  { title: "Assistências", key: "assists" },
  {
    title: "Assistências por minutos",
    key: "assistFrequency",
    isAscending: true,
    format: (v: number) => `${Math.round(v)}'`,
  },
  { title: "Participação em gols (G/A)", key: "goalParticipations" },
  {
    title: "G/A por minutos",
    key: "participationFrequency",
    isAscending: true,
    format: (v: number) => `${Math.round(v)}'`,
  },
  { title: "Jogos", key: "games" },
  {
    title: "Minutos jogados",
    key: "minutesPlayed",
    format: (v: number) => `${v}'`,
  },
  {
    title: "Minutos por jogo",
    key: "minutesPerGame",
    format: (v: number) => `${Math.round(v)}'`,
  },
  {
    title: "Maior distância em um jogo",
    key: "maxDistanceKmInGame",
    format: (v: number) => `${v.toFixed(1)}km`,
  },
  {
    title: "Distância por 90 min",
    key: "distanceKmPer90",
    format: (v: number) => `${v.toFixed(1)}km`,
  },
  {
    title: "Distância total",
    key: "distanceKm",
    format: (v: number) => `${v.toFixed(1)}km`,
  },
  { title: "Finalizações", key: "totalFinishings" },
  {
    title: "Finalizações por jogo",
    key: "finishingsPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Finalizações certas", key: "finishingsOnTarget" },
  {
    title: "Finalizações certas por jogo",
    key: "finishingsOnTargetPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Finalizações erradas", key: "finishingsMissed" },
  {
    title: "Finalizações erradas por jogo",
    key: "finishingsMissedPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Passes", key: "totalPasses" },
  {
    title: "Passes por jogo",
    key: "passesPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Passes certos", key: "passesCompleted" },
  {
    title: "Passes certos por jogo",
    key: "passesCompletedPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Passes errados", key: "passesMissed" },
  {
    title: "Passes errados por jogo",
    key: "passesMissedPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Passes decisivos", key: "keyPasses" },
  {
    title: "Passes decisivos por jogo",
    key: "keyPassesPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Conduções", key: "totalDribbles" },
  {
    title: "Conduções por jogo",
    key: "dribblesPer90",
    format: (v: number) => v.toFixed(1),
  },
  {
    title: "Conduções certas por jogo",
    key: "dribblesCompletedPer90",
    format: (v: number) => v.toFixed(1),
  },
  {
    title: "Conduções erradas por jogo",
    key: "dribblesMissedPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Bolas recuperadas", key: "ballsRecovered" },
  {
    title: "Bolas recuperadas por jogo",
    key: "ballsRecoveredPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Bolas perdidas", key: "ballsLost" },
  {
    title: "Bolas perdidas por jogo",
    key: "ballsLostPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Cartões amarelos", key: "yellowCards" },
  {
    title: "Cartões amarelos por jogo",
    key: "yellowCardsPer90",
    format: (v: number) => v.toFixed(1),
  },
  { title: "Cartões vermelhos", key: "redCards" },
  {
    title: "Cartões vermelhos por jogo",
    key: "redCardsPer90",
    format: (v: number) => v.toFixed(1),
  },
];
