import type { Career } from "../../../../../common/interfaces/Career";
import type { ClubData } from "../../../../../common/interfaces/club/clubData";
import type { Match } from "../../../../../common/interfaces/Match";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import type { MatchScreen } from "../../../config/screens";

type LineupSaveHandler = () => Promise<void> | void;

export type RegisterLineupSave = (saveHandler: LineupSaveHandler) => void;

export type OpenMatchScreen = (screen: MatchScreen) => void;

export type MatchSavedCallback = (match: Partial<Match>) => void;

export interface LineupTabProps {
  season: ClubData;
  career: Career;
  match: Match;
  isFromGeral?: boolean;
  onRegisterSave?: RegisterLineupSave;
  onOpenPlayerModal?: (playerId: string) => void;
  onOpenScreen?: OpenMatchScreen;
  onSaved?: MatchSavedCallback;
  onPickerOpenChange?: (isOpen: boolean) => void;
}

export type LineupSlot = {
  slotId: string;
  player: Players | null;
};

export type LineupState = {
  goalkeeper: LineupSlot;
  lines: LineupSlot[][];
  bench: LineupSlot[];
};
