import { TableTeamData } from "../../../../../../../common/interfaces/TableTeamData";

export type OptimisticTableData =
  | { type: "ADD_TABLE_TEAM"; team: TableTeamData }
  | { type: "UPDATE_TABLE_TEAM"; team: TableTeamData }
  | { type: "DELETE_TABLE_TEAM"; teamId: string };
