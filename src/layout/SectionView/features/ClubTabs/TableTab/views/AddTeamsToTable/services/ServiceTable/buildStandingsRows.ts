import type { Career } from "../../../../../../../../../common/interfaces/Career";
import type { Match } from "../../../../../../../../../common/interfaces/Match";
import type { TableTeamData } from "../../../../../../../../../common/interfaces/TableTeamData";
import type { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { leaguesByContinent } from "../../../../../../../../../common/utils/league";
import { calculateMatchResult } from "../../../../../../../../../pages/Match/components/MatchDetailsTab/views/AddDetails/helpers/calculateMatchResult";
import { getUpdatedTableTeamData } from "../../../../../../../../../pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/calculateTableStats";
import { hasStandingsImpact } from "./hasStandingsImpact";

type StandingsSnapshot = {
  career: Pick<Career, "clubName" | "teamBadge">;
  season: Pick<ClubData, "leagues" | "teams">;
  previous?: Match;
  next?: Match;
  matches: Match[];
  table: TableTeamData[];
  createRowId: (teamName: string) => string;
};

export const contributesToStandings = (
  match: Match | undefined,
  season: Pick<ClubData, "leagues">,
): match is Match => {
  if (!match || match.status !== "FINISHED") return false;
  const name = match.league.trim().toLowerCase();
  return (
    season.leagues?.some(
      (league) => league.name.trim().toLowerCase() === name && league.league,
    ) === true ||
    Object.values(leaguesByContinent)
      .flatMap((continent) => Object.values(continent).flat())
      .some(
        (league) => league.name.trim().toLowerCase() === name && league.league,
      )
  );
};

export const getAffectedStandingsTeams = (
  previous: Match | undefined,
  next: Match | undefined,
  season: Pick<ClubData, "leagues">,
): string[] => {
  if (!hasStandingsImpact(previous, next)) return [];
  return Array.from(
    new Set(
      [previous, next]
        .filter((match): match is Match => contributesToStandings(match, season))
        .flatMap((match) => [match.homeTeam, match.awayTeam]),
    ),
  );
};

export const buildStandingsRows = ({
  career,
  season,
  previous,
  next,
  matches,
  table,
  createRowId,
}: StandingsSnapshot): TableTeamData[] => {
  const affected = getAffectedStandingsTeams(previous, next, season);
  if (affected.length === 0) return [];

  const normalized = (name: string) => name.trim().toLowerCase();
  const findRow = (name: string) => {
    const exact = table.filter((row) => row.name === name);
    const candidates = exact.length
      ? exact
      : table.filter((row) => normalized(row.name) === normalized(name));
    if (candidates.length > 1) {
      throw new Error("Identidade da equipe ambígua na classificação");
    }
    return candidates[0];
  };

  const rows = new Map<string, TableTeamData>();
  for (const name of affected) {
    const old = findRow(name);
    const id = old?.id || createRowId(name);
    rows.set(id, {
      ...old,
      id,
      name: old?.name || name,
      badge:
        old?.badge ||
        season.teams?.find((team) => team.name === name)?.badge ||
        (name === career.clubName ? career.teamBadge : "") ||
        "",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  const resultingMatches = new Map(
    matches.map((match) => [match.matchesId, match]),
  );
  if (next) resultingMatches.set(next.matchesId, next);
  else if (previous) resultingMatches.delete(previous.matchesId);

  for (const match of resultingMatches.values()) {
    if (!contributesToStandings(match, season)) continue;
    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const result = calculateMatchResult(
      homeScore,
      awayScore,
      true,
      match.homePenScore !== undefined && match.awayPenScore !== undefined,
      match.homePenScore ?? 0,
      match.awayPenScore ?? 0,
    );
    const counted = new Set<string>();

    for (const [name, goalsFor, goalsAgainst, outcome] of [
      [match.homeTeam, homeScore, awayScore, result],
      [
        match.awayTeam,
        awayScore,
        homeScore,
        result === "V" ? "D" : result === "D" ? "V" : "E",
      ],
    ] as const) {
      const old = findRow(name);
      const row = old
        ? rows.get(old.id)
        : [...rows.values()].find((candidate) => candidate.name === name);
      if (!row) continue;
      if (counted.has(row.id)) {
        throw new Error("A partida associa os dois lados à mesma equipe");
      }
      counted.add(row.id);
      Object.assign(
        row,
        getUpdatedTableTeamData(row, goalsFor, goalsAgainst, outcome),
      );
    }
  }

  return Array.from(rows.values());
};
