import type { ChangeEvent } from "react";
import type { Career } from "../../../../../../../common/interfaces/Career";
import type { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import type { Match } from "../../../../../../../common/interfaces/Match";
import type { useForm } from "../../../../../../../common/hooks/UseForm";

type FormApi = ReturnType<typeof useForm>;

export type PlayerStatsFormValues = FormApi["formValues"];

export type PlayerStatsBooleanValues = FormApi["booleanValues"];

export type PlayerStatsInputEvent = ChangeEvent<
  HTMLInputElement | HTMLSelectElement
>;

export interface UseAddMatchStatsPlayerProps {
  career: Career;
  season: ClubData;
  match: Match;
  playerId: string;
  onClose: () => void;
  onSaved?: (match: Partial<Match>) => void;
}

export interface PlayerStatsFormProps {
  match: Match;
  season: ClubData;
  playerId: string;
  playerIsInLineup: boolean;
  substitutionData: {
    isStarter: boolean;
    options: string[];
  };
  availableGoalsForAssist: string[];
}
