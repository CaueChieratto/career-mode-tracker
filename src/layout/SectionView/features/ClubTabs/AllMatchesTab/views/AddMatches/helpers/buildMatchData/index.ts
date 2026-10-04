import { v4 as uuidv4 } from "uuid";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { getSeasonDateRange } from "../../../../../../../../../common/utils/GetSeasonDateRange";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Match } from "../../../../../../../../../common/interfaces/Match";

interface BuildMatchDataParams {
  date: string;
  league: string;
  opponentTeam: string;
  isHomeMatch?: boolean;
  matchVenue?: string;
  neutralHost?: string;
  stadium?: string;
  isKnockout?: boolean;
  stage?: string;
  isReturnMatch?: boolean;
  career: Career;
  season: ClubData;
  matchesId?: string;
}

export function buildMatchData({
  date,
  league,
  opponentTeam,
  isHomeMatch,
  matchVenue,
  neutralHost,
  stadium,
  isKnockout,
  stage,
  isReturnMatch,
  career,
  season,
  matchesId,
}: BuildMatchDataParams): Match {
  const { startDate, endDate } = getSeasonDateRange(
    season.seasonNumber,
    career.createdAt,
    career.nation,
  );

  const [dayStr, monthStr] = date.split("/");
  const day = Number(dayStr);
  const month = Number(monthStr);

  const matchMonthIndex = month - 1;
  const matchYear =
    matchMonthIndex < startDate.getMonth()
      ? endDate.getFullYear()
      : startDate.getFullYear();

  const formattedDate = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(matchYear).slice(-2)}`;

  const venue = matchVenue || (isHomeMatch === false ? "Fora" : "Casa");
  const isNeutral = venue === "Neutro";

  let homeTeam = career.clubName;
  let awayTeam = opponentTeam;

  if (venue === "Fora") {
    homeTeam = opponentTeam;
    awayTeam = career.clubName;
  } else if (venue === "Neutro") {
    if (neutralHost === "Adversário") {
      homeTeam = opponentTeam;
      awayTeam = career.clubName;
    } else {
      homeTeam = career.clubName;
      awayTeam = opponentTeam;
    }
  } else {
    // "Casa"
    homeTeam = career.clubName;
    awayTeam = opponentTeam;
  }

  const existingMatch = matchesId
    ? season.matches?.find((m) => m.matchesId === matchesId)
    : null;

  let firstLegScore: { userScore: number; opponentScore: number } | undefined;
  if (isKnockout && isReturnMatch && season.matches) {
    const oppLower = opponentTeam.trim().toLowerCase();
    const legLower = league.trim().toLowerCase();
    const stageLower = stage?.trim().toLowerCase();

    const leg1 = season.matches.find((m) => {
      if (m.matchesId === matchesId) return false;
      if (m.league?.trim().toLowerCase() !== legLower) return false;
      const mIsHome = m.homeTeam === career.clubName;
      const mOpponent = (mIsHome ? m.awayTeam : m.homeTeam).trim().toLowerCase();
      if (mOpponent !== oppLower) return false;
      if (stageLower && m.stage && m.stage.trim().toLowerCase() !== stageLower) return false;
      if (m.status !== "FINISHED" || m.homeScore === undefined || m.awayScore === undefined) return false;
      if (m.isReturnMatch) return false;
      return true;
    });

    if (leg1 && leg1.homeScore !== undefined && leg1.awayScore !== undefined) {
      const leg1IsHome = leg1.homeTeam === career.clubName;
      firstLegScore = {
        userScore: leg1IsHome ? leg1.homeScore : leg1.awayScore,
        opponentScore: leg1IsHome ? leg1.awayScore : leg1.homeScore,
      };
    }
  }

  const matchResult: Match = {
    ...existingMatch,
    matchesId: existingMatch?.matchesId ?? uuidv4(),
    date: formattedDate,
    league,
    homeTeam,
    awayTeam,
    isNeutral,
    isKnockout: !!isKnockout,
    status: existingMatch?.status ?? "SCHEDULED",
    result: existingMatch?.result ?? "?",
  };

  if (isNeutral && stadium?.trim()) {
    matchResult.stadium = stadium.trim();
  } else {
    delete matchResult.stadium;
  }

  if (isKnockout && stage?.trim()) {
    matchResult.stage = stage.trim();
  } else {
    delete matchResult.stage;
  }

  if (isKnockout && isReturnMatch) {
    matchResult.isReturnMatch = true;
  } else {
    delete matchResult.isReturnMatch;
  }

  const effectiveFirstLegScore = existingMatch?.firstLegScore ?? firstLegScore;
  if (isKnockout && isReturnMatch && effectiveFirstLegScore) {
    matchResult.firstLegScore = effectiveFirstLegScore;
  } else {
    delete matchResult.firstLegScore;
  }

  return matchResult;
}
