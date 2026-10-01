import type { Career } from "../../../../common/interfaces/Career";
import type { ClubData } from "../../../../common/interfaces/club/clubData";
import { Players } from "../../../../common/interfaces/playersInfo/players";
import { TableRowData } from "../../../../common/interfaces/Table";
import { TableTeamData } from "../../../../common/interfaces/TableTeamData";
import type { OptimisticMatchData } from "../../features/ClubTabs/AllMatchesTab/views/AddMatches";
import { OptimisticTableData } from "../../features/ClubTabs/TableTab/views/AddTeamsToTable";

type OptimisticPlayerData = {
  type: "UPDATE_PLAYER";
  player: Players;
};

export type OptimisticUpdateData =
  | OptimisticMatchData
  | OptimisticTableData
  | OptimisticPlayerData;
interface RefreshedSeasonData {
  matches: ClubData["matches"];
  players: ClubData["players"];
  table?: TableRowData[];
}

type SeasonMatches = NonNullable<ClubData["matches"]>;
type SeasonTeams = NonNullable<ClubData["teams"]>;

const updatePlayers = (
  players: ClubData["players"],
  optimisticData: OptimisticPlayerData,
): ClubData["players"] => {
  const exists = players.some((p) => p.id === optimisticData.player.id);
  return exists
    ? players.map((p) =>
        p.id === optimisticData.player.id ? optimisticData.player : p,
      )
    : [...players, optimisticData.player];
};

const updateTable = (
  table: TableTeamData[],
  optimisticData: OptimisticTableData,
): TableTeamData[] => {
  switch (optimisticData.type) {
    case "ADD_TABLE_TEAM": {
      const exists = table.some((t) => t.id === optimisticData.team.id);
      if (exists) {
        return table.map((t) =>
          t.id === optimisticData.team.id ? optimisticData.team : t,
        );
      }
      return [...table, optimisticData.team];
    }
    case "UPDATE_TABLE_TEAM":
      return table.map((t) =>
        t.id === optimisticData.team.id ? optimisticData.team : t,
      );
    case "DELETE_TABLE_TEAM":
      return table.filter((t) => t.id !== optimisticData.teamId);
    default:
      return table;
  }
};

const updateMatches = (
  matches: SeasonMatches,
  optimisticData: OptimisticMatchData,
): SeasonMatches => {
  switch (optimisticData.type) {
    case "ADD":
      return [...matches, optimisticData.match];
    case "UPDATE":
      return matches.map((match) =>
        match.matchesId === optimisticData.match.matchesId
          ? optimisticData.match
          : match,
      );
    case "DELETE":
      return matches.filter(
        (match) => match.matchesId !== optimisticData.matchId,
      );
    default:
      return matches;
  }
};

const updateTeams = (
  teams: SeasonTeams,
  optimisticData: OptimisticMatchData,
): SeasonTeams => {
  if (optimisticData.type === "DELETE" || !optimisticData.team) {
    return teams;
  }

  const newTeams = [...teams];
  const tIndex = newTeams.findIndex(
    (t) => t.name.toLowerCase() === optimisticData.team!.name.toLowerCase(),
  );

  if (tIndex !== -1) {
    newTeams[tIndex] = {
      ...newTeams[tIndex],
      badge: optimisticData.team.badge,
      leagueName: optimisticData.team.leagueName || newTeams[tIndex].leagueName,
    };
  } else {
    newTeams.push(optimisticData.team);
  }

  return newTeams;
};

export function replaceSeasonData(
  career: Career,
  seasonId: string,
  seasonData: RefreshedSeasonData,
  updatedAt: number,
): Career {
  return {
    ...career,
    updatedAt,
    clubData: career.clubData.map((season) =>
      season.id === seasonId ? { ...season, ...seasonData } : season,
    ),
  };
}

export function applyOptimisticUpdate(
  career: Career,
  seasonId: string,
  optimisticData: OptimisticUpdateData,
): Career {
  return {
    ...career,
    clubData: career.clubData.map((season) => {
      if (season.id !== seasonId) {
        return season;
      }

      if (
        optimisticData.type === "ADD_TABLE_TEAM" ||
        optimisticData.type === "UPDATE_TABLE_TEAM" ||
        optimisticData.type === "DELETE_TABLE_TEAM"
      ) {
        const currentTable =
          (season.table as unknown as TableTeamData[] | undefined) ?? [];

        const updatedTable = updateTable(currentTable, optimisticData);

        return {
          ...season,
          table: updatedTable as unknown as TableRowData[],
        };
      }

      if (optimisticData.type === "UPDATE_PLAYER") {
        return {
          ...season,
          players: updatePlayers(season.players, optimisticData),
        };
      }

      return {
        ...season,
        matches: updateMatches(season.matches ?? [], optimisticData),
        teams: updateTeams(season.teams ?? [], optimisticData),
      };
    }),
  };
}
