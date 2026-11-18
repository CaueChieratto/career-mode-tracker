import { Match } from "../../../../../../../common/interfaces/Match";
import { Teams } from "../../../../../../../common/interfaces/Teams";
import { Trophy } from "../../../../../../../common/interfaces/club/trophy";

export type OptimisticMatchData =
  | { type: "ADD"; match: Match; team?: Teams; trophies?: Trophy[] }
  | { type: "UPDATE"; match: Match; team?: Teams; trophies?: Trophy[] }
  | { type: "DELETE"; matchId: string };
