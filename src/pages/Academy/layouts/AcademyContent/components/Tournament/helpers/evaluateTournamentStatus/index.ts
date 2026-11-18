import { AcademyMatches } from "../../../../../../../../common/interfaces/AcademyData";

export interface EvaluatedTournamentStatus {
  isFinished: boolean;
  isChampion: boolean;
  tournamentResult: string;
}

export const evaluateTournamentStatus = (
  matches: AcademyMatches[],
): EvaluatedTournamentStatus => {
  let isFinished = false;
  let isChampion = false;
  let tournamentResult = "Em andamento";

  if (matches.length === 0 || matches.every((m) => m.result !== "FINISHED")) {
    tournamentResult = "Torneio Marcado";
  }

  for (const m of matches) {
    if (m.result !== "FINISHED") continue;

    const mStatus = m.status?.trim().toLowerCase() || "";
    const isFinalMatch = mStatus === "final";
    const isGroupStageMatch = mStatus === "fase de grupos";
    const uG = Number(m.userGoals) || 0;
    const oG = Number(m.opponentGoals) || 0;

    let isDefeat = uG < oG;
    let isVictory = uG > oG;

    if (
      uG === oG &&
      m.userPenalties !== undefined &&
      m.opponentPenalties !== undefined
    ) {
      isDefeat = m.userPenalties < m.opponentPenalties;
      isVictory = m.userPenalties > m.opponentPenalties;
    }

    if (isDefeat && !isGroupStageMatch) {
      isFinished = true;
      isChampion = false;
      tournamentResult = isFinalMatch ? "Vice-Campeão" : "Eliminado";
      break;
    }

    if (isFinalMatch && isVictory) {
      isFinished = true;
      isChampion = true;
      tournamentResult = "Campeão";
      break;
    }
  }

  return { isFinished, isChampion, tournamentResult };
};
