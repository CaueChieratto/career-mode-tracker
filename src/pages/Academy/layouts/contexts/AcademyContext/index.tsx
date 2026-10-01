import { createContext } from "react";
import { Career } from "../../../../../common/interfaces/Career";
import { DashboardCardConfig } from "../../AcademyContent/config";
import { AcademyPlayers } from "../../AcademyContent/interfaces/AcademyPlayers/AcademyPlayers";
import { AcademyTournaments } from "../../AcademyContent/interfaces/AcademyTournaments/AcademyTournaments";

export type EditingEvolutionEvent = {
  historyId: string;
  playerId: string;
  attribute: string;
};

export type AcademyContextData = {
  isGeral: boolean;
  allCareers: Career[];
  career: Career;
  seasonId: string;
  playersAcademy: AcademyPlayers[];
  allPlayersAcademy: AcademyPlayers[];
  tournamentsAcademy: AcademyTournaments[];
  allTournamentsAcademy: AcademyTournaments[];
  hasLoadedAllTournaments: boolean;
  activeCardIndex: number | null;
  selectedPlayer?: AcademyPlayers;
  selectedTournament?: AcademyTournaments;
  dashboardCards: DashboardCardConfig[];
  selectedTournamentId: string | null;
  isLoading: boolean;
  isAddingPlayer: boolean;
  isAddingTournament: boolean;
  isPromotingPlayer: boolean;
  isFocusedViewActive: boolean;
  isAnimationDisabled: boolean;
  seasonNumber: number | undefined;
  playerListMode: "academy" | "promoted" | "released";
  editingEvolutionEvent: EditingEvolutionEvent | null;
  setEditingEvolutionEvent: (val: EditingEvolutionEvent | null) => void;
  togglePlayerListMode: () => void;
  setIsPromotingPlayer: (value: boolean) => void;
  setIsAddingPlayer: (value: boolean) => void;
  setSelectedTournamentId: (id: string | null) => void;
  setIsAddingTournament: (value: boolean) => void;
  setActiveCardIndex: (index: number | null) => void;
  onUpdatePlayer: (
    updatedPlayer: AcademyPlayers,
    isSilent?: boolean,
  ) => Promise<void>;
  onDeletePlayer: (playerId: string) => Promise<void>;
  onReleasePlayer: (
    player: AcademyPlayers,
    releaseDate: string,
  ) => Promise<void>;
  onUpdateTournament?: (
    updatedTournament: AcademyTournaments,
    isSilent?: boolean,
  ) => Promise<void>;
  onDeleteTournament?: (tournamentId: string) => Promise<void>;
  refetchPlayers: (isSilentUpdate?: boolean) => void;
  applyPromotedPlayer: (player: AcademyPlayers) => void;
  refetchTournaments?: (isSilentUpdate?: boolean) => void;
  playerClick: (id: string, forceOpen?: boolean) => void;
  back: () => void;
};

export const AcademyContext = createContext<AcademyContextData>(
  {} as AcademyContextData,
);
