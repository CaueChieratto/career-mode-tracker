import { TableTeamData } from "../../../interfaces/TableTeamData";

export const getUpdatedTableTeamData = (
  teamInTable: TableTeamData,
  goalsFor: number,
  goalsAgainst: number,
  result: "V" | "E" | "D" | "?",
): Partial<TableTeamData> => {
  const isWin = result === "V";
  const isDraw = result === "E";
  const isLoss = result === "D";

  return {
    played: teamInTable.played + 1,
    won: teamInTable.won + (isWin ? 1 : 0),
    drawn: teamInTable.drawn + (isDraw ? 1 : 0),
    lost: teamInTable.lost + (isLoss ? 1 : 0),
    goalsFor: teamInTable.goalsFor + goalsFor,
    goalsAgainst: teamInTable.goalsAgainst + goalsAgainst,
    goalDiff:
      teamInTable.goalsFor +
      goalsFor -
      (teamInTable.goalsAgainst + goalsAgainst),
    points: teamInTable.points + (isWin ? 3 : isDraw ? 1 : 0),
  };
};

export const getNewTableTeamData = (
  teamName: string,
  goalsFor: number,
  goalsAgainst: number,
  result: "V" | "E" | "D" | "?",
  badge: string,
): Omit<TableTeamData, "id"> => {
  const isWin = result === "V";
  const isDraw = result === "E";
  const isLoss = result === "D";

  return {
    name: teamName,
    badge,
    played: 1,
    won: isWin ? 1 : 0,
    drawn: isDraw ? 1 : 0,
    lost: isLoss ? 1 : 0,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    points: isWin ? 3 : isDraw ? 1 : 0,
  };
};
