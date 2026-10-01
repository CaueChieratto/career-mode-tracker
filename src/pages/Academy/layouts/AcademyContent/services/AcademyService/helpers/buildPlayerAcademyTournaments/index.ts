import { AcademyTournaments } from "../../../../interfaces/AcademyTournaments/AcademyTournaments";
import { PlayerMatchesStats } from "../../../../interfaces/AcademyTournaments/AcademyMatches/PlayerMatchesStats";

export const buildPlayerAcademyTournaments = (
  tournaments: AcademyTournaments[],
  playerId: string,
): AcademyTournaments[] => {
  return tournaments.reduce<AcademyTournaments[]>((acc, t) => {
    const playerMatches =
      t.matches?.filter((m) =>
        m.lineup?.some((l) => l.playerId === playerId),
      ) || [];

    if (playerMatches.length > 0) {
      acc.push({
        id: t.id,
        name: t.name,
        date: t.date,
        totalMatches: playerMatches.length,
        isChampion: t.isChampion,
        tournamentResult: t.tournamentResult,
        matches: playerMatches.map((m) => {
          const pStat = m.lineup.find((l) => l.playerId === playerId);
          const cleanStats: Partial<PlayerMatchesStats> = {};

          if (pStat) {
            if (pStat.goals) cleanStats.goals = pStat.goals;
            if (pStat.assists) cleanStats.assists = pStat.assists;
            if (pStat.rating) cleanStats.rating = pStat.rating;
            if (pStat.defesas) cleanStats.defesas = pStat.defesas;
            if (pStat.cleanSheets) cleanStats.cleanSheets = pStat.cleanSheets;
          }

          const playerMatch = {
            id: m.id,
            date: m.date,
            opponentTeam: m.opponentTeam,
            status: m.status,
            result: m.result,
            userGoals: m.userGoals,
            opponentGoals: m.opponentGoals,
            ...(m.userPenalties !== undefined
              ? { userPenalties: m.userPenalties }
              : {}),
            ...(m.opponentPenalties !== undefined
              ? { opponentPenalties: m.opponentPenalties }
              : {}),
            lineup: [cleanStats as PlayerMatchesStats],
          };
          for (const field of ["status", "result", "userGoals", "opponentGoals"] as const) {
            if (playerMatch[field] === undefined) delete playerMatch[field];
          }
          return playerMatch;
        }),
      });
    }
    return acc;
  }, []);
};
