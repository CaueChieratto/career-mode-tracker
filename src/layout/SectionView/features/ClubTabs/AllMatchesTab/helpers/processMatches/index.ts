import { MatchStatus } from "../../../../../../../common/interfaces/MatchStatus";
import { MONTH_TO_NUM } from "../../constants/MONTH_OPTIONS";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Match } from "../../../../../../../common/interfaces/Match";

type Params = {
  season: ClubData;
  career: Career;
  isGeralPage: boolean;
  activeTab: MatchStatus | string;
  selectedMonth: string;
  selectedSeasonId?: string;
  playerId?: string;
  matchingPlayerIds?: Set<string>;
};

const parseDate = (date: string): number => {
  const [day, month, year] = date.split("/").map(Number);
  return new Date(2000 + year, month - 1, day).getTime();
};

const getAllMatches = (
  season: ClubData,
  career: Career,
  isGeralPage: boolean,
  selectedSeasonId?: string,
): Match[] => {
  if (isGeralPage && career.clubData) {
    const seasonsToUse =
      selectedSeasonId && selectedSeasonId !== "Todas"
        ? career.clubData.filter((s) => s.id === selectedSeasonId)
        : career.clubData;

    return seasonsToUse.flatMap((s) => s.matches || []);
  }

  return season.matches || [];
};

const sortMatches = (matches: Match[], isFinished: boolean): Match[] => {
  return matches.slice().sort((a, b) => {
    const diff = parseDate(a.date) - parseDate(b.date);
    return isFinished ? -diff : diff;
  });
};

const filterMatches = (
  matches: Match[],
  status: MatchStatus | string,
  selectedMonth: string,
  playerId?: string,
  matchingPlayerIds?: Set<string>,
): Match[] => {
  return matches.filter((match) => {
    if (matchingPlayerIds && matchingPlayerIds.size > 0) {
      const playerStat = match.playerStats?.find((p) =>
        matchingPlayerIds.has(p.playerId),
      );
      if (
        !playerStat ||
        !playerStat.minutesPlayed ||
        playerStat.minutesPlayed <= 0
      ) {
        return false;
      }
    } else if (playerId) {
      const playerStat = match.playerStats?.find(
        (p) => p.playerId === playerId,
      );
      if (
        !playerStat ||
        !playerStat.minutesPlayed ||
        playerStat.minutesPlayed <= 0
      ) {
        return false;
      }
    }

    const statusMatch = match.status === status;

    let monthMatch = true;

    if (selectedMonth !== "Tudo") {
      const matchMonthNum = Number(match.date.split("/")[1]);
      monthMatch = matchMonthNum === MONTH_TO_NUM[selectedMonth];
    }

    return statusMatch && monthMatch;
  });
};

export const processMatches = ({
  season,
  career,
  isGeralPage,
  activeTab,
  selectedMonth,
  selectedSeasonId,
  playerId,
  matchingPlayerIds,
}: Params): Match[] => {
  const baseMatches = getAllMatches(
    season,
    career,
    isGeralPage,
    selectedSeasonId,
  );

  const status = isGeralPage ? "FINISHED" : activeTab;
  const isFinished = status === "FINISHED";

  const sorted = sortMatches(baseMatches, isFinished);

  return filterMatches(
    sorted,
    status,
    selectedMonth,
    playerId,
    matchingPlayerIds,
  );
};

export const getMatchSeason = (
  matchId: string | number | undefined,
  career: Career,
  season: ClubData,
  isGeralPage: boolean,
): ClubData => {
  if (!isGeralPage || !career.clubData || !matchId) {
    return season;
  }

  return (
    career.clubData.find((s) =>
      s.matches?.some((m) => m.matchesId === matchId),
    ) || season
  );
};
