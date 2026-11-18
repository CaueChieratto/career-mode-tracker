import { Career } from "../../../../../../../../../../common/interfaces/Career";
import { AcademyPlayers } from "../../../../../../../../../../common/interfaces/AcademyData";
import { AcademyTournaments } from "../../../../../../../../../../common/interfaces/AcademyData";
import { isEuropeanSeason } from "../../../../../../utils/isEuropeanSeason";
import { extractDateInfo } from "../../../../../FeedItem/helpers/extractDateInfo";
import { TotalStats, TournamentStats } from "../../types";

export const calculatePlayerStats = (
  selectedPlayer: AcademyPlayers | undefined,
  tournamentsAcademy: AcademyTournaments[] | undefined,
  career?: Career,
  currentSeasonNumber?: number,
  isGeral?: boolean,
): { tournamentStats: TournamentStats[]; totalStats: TotalStats } => {
  const tStats: TournamentStats[] = [];
  let globalMatches = 0;
  let globalGoals = 0;
  let globalAssists = 0;
  let globalTotalRating = 0;
  let globalRatingCount = 0;
  let globalTournamentsWon = 0;
  let globalDefesas = 0;

  const isGoleiro = selectedPlayer?.position === "GOL";

  if (!selectedPlayer || !tournamentsAcademy) {
    return {
      tournamentStats: tStats,
      totalStats: {
        matchesPlayed: 0,
        totalGoals: 0,
        totalAssists: 0,
        averageRating: "0.0",
        tournamentsWon: 0,
        ratingRawNumber: 0,
        totalDefesas: 0,
        isGoleiro: false,
      },
    };
  }

  const careerStartYear =
    career && career.createdAt
      ? new Date(career.createdAt).getFullYear()
      : new Date().getFullYear();

  const isEurope = career ? isEuropeanSeason(career) : false;

  tournamentsAcademy.forEach((tournament) => {
    let tMatches = 0;
    let tGoals = 0;
    let tAssists = 0;
    let tDefesas = 0;
    let tTotalRating = 0;
    let tRatingCount = 0;
    let playedInTournament = false;
    let calculatedSeasonNum = currentSeasonNumber || 1;

    if (isGeral && tournament.date) {
      const { month, year } = extractDateInfo(tournament.date, isEurope);
      let eventBaseYear = year;
      if (isEurope && month < 7) {
        eventBaseYear = year - 1;
      }
      calculatedSeasonNum = eventBaseYear - careerStartYear + 1;
      if (calculatedSeasonNum < 1) calculatedSeasonNum = 1;
    }

    tournament.matches?.forEach((match) => {
      const playerStat = match.lineup?.find(
        (p) => p.playerId === selectedPlayer.id,
      );

      if (playerStat) {
        tMatches++;
        playedInTournament = true;
        tGoals += playerStat.goals ?? 0;
        tAssists += playerStat.assists ?? 0;
        tDefesas += playerStat.defesas ?? 0;

        if (playerStat.rating !== null && playerStat.rating !== undefined) {
          tTotalRating += playerStat.rating;
          tRatingCount++;
        }
      }
    });

    if (playedInTournament) {
      if (tournament.isChampion) {
        globalTournamentsWon++;
      }
      globalMatches += tMatches;
      globalGoals += tGoals;
      globalAssists += tAssists;
      globalDefesas += tDefesas;
      globalTotalRating += tTotalRating;
      globalRatingCount += tRatingCount;

      const tAverageStr =
        tRatingCount > 0 ? (tTotalRating / tRatingCount).toFixed(1) : "0.0";

      tStats.push({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        season: String(calculatedSeasonNum),
        matchesPlayed: tMatches,
        goals: tGoals,
        assists: tAssists,
        averageRating: tAverageStr,
        ratingRawNumber: Number(tAverageStr),
        isChampion: tournament.isChampion ?? false,
        defesas: tDefesas,
        isGoleiro: isGoleiro,
      });
    }
  });

  const globalAverageStr =
    globalRatingCount > 0
      ? (globalTotalRating / globalRatingCount).toFixed(1)
      : "0.0";

  return {
    tournamentStats: tStats,
    totalStats: {
      matchesPlayed: globalMatches,
      totalGoals: globalGoals,
      totalAssists: globalAssists,
      averageRating: globalAverageStr,
      tournamentsWon: globalTournamentsWon,
      ratingRawNumber: Number(globalAverageStr),
      totalDefesas: globalDefesas,
      isGoleiro: isGoleiro,
    },
  };
};
