import { TableRowData } from "../../../../../../../../../common/interfaces/Table";

export type TableTeamStatField =
  | "played"
  | "won"
  | "drawn"
  | "lost"
  | "goalsFor"
  | "goalsAgainst";

type TableTeamStatValues = Record<TableTeamStatField, number> & {
  points: number;
  goalDiff: number;
};

export const getEmptyTableTeamStatFormValues = (): Record<
  TableTeamStatField,
  string
> => ({
  played: "",
  won: "",
  drawn: "",
  lost: "",
  goalsFor: "",
  goalsAgainst: "",
});

export const getTableTeamStatPlaceholders = (
  team?: TableRowData,
): Partial<Record<TableTeamStatField, string>> => {
  if (!team) return {};

  return {
    played: String(team.played),
    won: String(team.won),
    drawn: String(team.drawn),
    lost: String(team.lost),
    goalsFor: String(team.goalsFor),
    goalsAgainst: String(team.goalsAgainst),
  };
};

export const resolveTableTeamStatValues = (
  formValues: Record<string, string>,
  existingTeam?: TableRowData,
): TableTeamStatValues => {
  const resolve = (field: TableTeamStatField) => {
    const enteredValue = formValues[field];
    if (enteredValue !== undefined && enteredValue.trim() !== "") {
      return Number(enteredValue);
    }

    return existingTeam?.[field] ?? 0;
  };

  const played = resolve("played");
  const won = resolve("won");
  const drawn = resolve("drawn");
  const lost = resolve("lost");
  const goalsFor = resolve("goalsFor");
  const goalsAgainst = resolve("goalsAgainst");

  return {
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    points: won * 3 + drawn,
    goalDiff: goalsFor - goalsAgainst,
  };
};
