import { AcademyMatches } from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { PlayerMatchesStats } from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { AcademyPlayers } from "../../../../../../../../../../../../common/interfaces/AcademyData";

const parseStat = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return Number(value);
};

export const buildUpdatedMatch = (
  match: AcademyMatches,
  currentLineup: PlayerMatchesStats[],
  currentUGoals: number | string,
  currentOGoals: number | string,
  currentUPenalties: number | string,
  currentOPenalties: number | string,
  isFinishing: boolean,
  playersAcademy: AcademyPlayers[],
): AcademyMatches => {
  const userGoalsNum = Number(currentUGoals) || 0;
  const oppGoalsNum = Number(currentOGoals) || 0;

  let finalUPen: number | undefined =
    currentUPenalties === "" ? undefined : Number(currentUPenalties);
  let finalOPen: number | undefined =
    currentOPenalties === "" ? undefined : Number(currentOPenalties);

  if (userGoalsNum !== oppGoalsNum) {
    finalUPen = undefined;
    finalOPen = undefined;
  }

  const updatedMatch: AcademyMatches = {
    ...match,
    userGoals: userGoalsNum,
    opponentGoals: oppGoalsNum,
    lineup: currentLineup.map((p) => {
      const player = playersAcademy.find((acad) => acad.id === p.playerId);
      const isGol = player?.position === "GOL";

      return {
        ...p,
        goals: parseStat(p.goals),
        assists: parseStat(p.assists),
        rating: parseStat(p.rating),
        defesas: isGol ? parseStat(p.defesas) : null,
        cleanSheets: isGol ? (oppGoalsNum === 0 ? 1 : 0) : null,
      };
    }),
    ...(isFinishing ? { result: "FINISHED" } : {}),
  };

  if (finalUPen !== undefined) {
    updatedMatch.userPenalties = finalUPen;
  } else {
    delete updatedMatch.userPenalties;
  }

  if (finalOPen !== undefined) {
    updatedMatch.opponentPenalties = finalOPen;
  } else {
    delete updatedMatch.opponentPenalties;
  }

  return updatedMatch;
};
