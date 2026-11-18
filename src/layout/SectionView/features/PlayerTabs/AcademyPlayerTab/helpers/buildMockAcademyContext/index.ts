import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { AcademyPlayers } from "../../../../../../../common/interfaces/AcademyData";
import { AcademyContextData } from "../../../../../../../pages/Academy/layouts/contexts/AcademyContext";

interface BuildMockAcademyContextParams {
  isGeral: boolean;
  career: Career;
  season?: ClubData;
  academyPlayer: AcademyPlayers;
  tournamentsAcademy: unknown[];
}

export const buildMockAcademyContext = ({
  isGeral,
  career,
  season,
  academyPlayer,
  tournamentsAcademy,
}: BuildMockAcademyContextParams): AcademyContextData => {
  return {
    isGeral,
    career,
    seasonId: season?.id || "geral",
    seasonNumber: season?.seasonNumber,
    selectedPlayer: academyPlayer,
    tournamentsAcademy,
    allCareers: [career],
    playersAcademy: [],
    allPlayersAcademy: [academyPlayer],
    activeCardIndex: null,
    dashboardCards: [],
    selectedTournamentId: null,
    isLoading: false,
    isAddingPlayer: false,
    isAddingTournament: false,
    isPromotingPlayer: false,
    isFocusedViewActive: false,
    isAnimationDisabled: true,
    playerListMode: "promoted" as const,
    editingEvolutionEvent: null,

    setEditingEvolutionEvent: () => {},
    togglePlayerListMode: () => {},
    setIsPromotingPlayer: () => {},
    setIsAddingPlayer: () => {},
    setSelectedTournamentId: () => {},
    setIsAddingTournament: () => {},
    setActiveCardIndex: () => {},
    onUpdatePlayer: async () => {},
    onDeletePlayer: async () => {},
    onReleasePlayer: async () => {},
    refetchPlayers: () => {},
    playerClick: () => {},
    back: () => {},
  } as unknown as AcademyContextData;
};
