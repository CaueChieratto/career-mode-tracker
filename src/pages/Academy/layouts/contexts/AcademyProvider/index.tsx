import { ReactNode, useState, useMemo, useCallback, useEffect } from "react";
import { Career } from "../../../../../common/interfaces/Career";
import { getConfig } from "../../AcademyContent/config";
import { useAcademyActions } from "../../AcademyContent/hooks/useAcademyActions";
import { useAcademyPlayers } from "../../AcademyContent/hooks/useAcademyPlayers";
import { useAcademyViewState } from "../../AcademyContent/hooks/useAcademyViewState";
import { AcademyContext, EditingEvolutionEvent } from "../AcademyContext";
import { useAcademyTournaments } from "../../AcademyContent/hooks/useAcademyTournaments";
import {
  PlayerSortOption,
  useSortedPlayers,
} from "../../AcademyContent/hooks/Sorts/useSortedPlayers";
import {
  TournamentSortOption,
  useSortedTournaments,
} from "../../AcademyContent/hooks/Sorts/useSortedTournaments";
import { useAcademyFeed } from "../../AcademyContent/components/FeedItem/hooks/useAcademyFeed";
import { ServiceCareer } from "../../../../../common/services/ServiceCareer";

type ProviderProps = {
  children: ReactNode;
  career: Career;
  seasonId: string;
};

export const AcademyProvider = ({
  children,
  career,
  seasonId,
}: ProviderProps) => {
  const [allCareers, setAllCareers] = useState<Career[]>([career]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = ServiceCareer.getAll((careers) => {
        if (careers && careers.length > 0) {
          setAllCareers(careers);
        }
      });
    } catch {
      // Fallback gracioso em ambientes de teste sem mocks de Firestore configurados
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  const [editingEvolutionEvent, setEditingEvolutionEvent] =
    useState<EditingEvolutionEvent | null>(null);

  const seasonNumber = career.clubData.find(
    (club) => club.id === seasonId,
  )?.seasonNumber;

  const isGeral = seasonId === "geral" || !seasonNumber;

  const [playerListMode, setPlayerListMode] = useState<
    "academy" | "promoted" | "released"
  >(() => {
    const saved = localStorage.getItem(`@academy_playerListMode_${career.id}`);
    if (saved === "promoted" || saved === "released") {
      return saved as "promoted" | "released";
    }
    return "academy";
  });

  const {
    playersAcademy: rawPlayers,
    allPlayersAcademy,
    setPlayersAcademy,
    applyPromotedPlayer,
    isLoading: isLoadingPlayers,
    refetchPlayers,
  } = useAcademyPlayers(career, seasonId, isGeral);

  const {
    tournamentsAcademy: rawTournaments,
    allTournamentsAcademy,
    hasLoadedAllTournaments,
    isLoadingTournaments,
    setTournamentsAcademy,
    refetchTournaments,
  } = useAcademyTournaments(career, seasonId, isGeral);

  const {
    sortedPlayers: playersAcademy,
    playerSort,
    setPlayerSort,
  } = useSortedPlayers(rawPlayers, career);

  const {
    sortedTournaments: tournamentsAcademy,
    tournamentSort,
    setTournamentSort,
  } = useSortedTournaments(rawTournaments, career);

  const {
    activeCardIndex,
    setActiveCardIndex,
    isAddingPlayer,
    setIsAddingPlayer,
    isAddingTournament,
    setIsAddingTournament,
    isPromotingPlayer,
    setIsPromotingPlayer,
    selectedPlayerId,
    setSelectedPlayerId,
    playerClick,
    tournamentClick,
    back,
    isFocusedViewActive,
    isAnimationDisabled,
    selectedTournamentId,
    setSelectedTournamentId,
  } = useAcademyViewState(career.id);

  const togglePlayerListMode = useCallback(() => {
    setPlayerListMode((prev) => {
      const next =
        prev === "academy"
          ? "promoted"
          : prev === "promoted"
            ? "released"
            : "academy";
      localStorage.setItem(`@academy_playerListMode_${career.id}`, next);
      return next;
    });

    setSelectedPlayerId(null);
  }, [career.id, setSelectedPlayerId]);

  const backWrapper = useCallback(() => {
    setEditingEvolutionEvent(null);
    back();
  }, [back]);

  const playerClickWrapper = (id: string, forceOpen?: boolean) => {
    if (!forceOpen) {
      setEditingEvolutionEvent(null);
    }
    playerClick(id, forceOpen);
  };

  const tournamentClickWrapper = (id: string, forceOpen?: boolean) => {
    setEditingEvolutionEvent(null);
    tournamentClick(id, forceOpen);
  };

  const {
    handlePlayerClick,
    handleTournamentClick,
    updatePlayer,
    deletePlayer,
    releasePlayer,
    updateTournament,
    deleteTournament,
  } = useAcademyActions({
    careerId: career.id,
    seasonId,
    selectedPlayerId,
    selectedTournamentId,
    refetchPlayers,
    refetchTournaments,
    setPlayersAcademy,
    setTournamentsAcademy,
    playerClick: playerClickWrapper,
    tournamentClick: tournamentClickWrapper,
    back: backWrapper,
  });

  const dynamicFeedData = useAcademyFeed(
    career,
    allPlayersAcademy,
    tournamentsAcademy,
  );

  const selectedPlayer = allPlayersAcademy.find(
    (p) => p.id === selectedPlayerId,
  );
  const selectedTournament = tournamentsAcademy.find(
    (t) => t.id === selectedTournamentId,
  );

  const dashboardCards = getConfig({
    career,
    playersAcademy,
    allPlayersAcademy,
    tournamentsAcademy,
    feedData: dynamicFeedData,
    activeCardIndex,
    selectedPlayerId,
    selectedTournamentId,
    playerSort,
    tournamentSort,
    onAddPlayerClick: () => setIsAddingPlayer(true),
    onAddTournamentClick: () => setIsAddingTournament(true),
    onPromotePlayerClick: () => setIsPromotingPlayer(true),
    onPlayerClick: handlePlayerClick,
    onTournamentClick: handleTournamentClick,
    setPlayerSort: (val: string) => setPlayerSort(val as PlayerSortOption),
    setTournamentSort: (val: string) =>
      setTournamentSort(val as TournamentSortOption),
    isGeral,
    playerListMode,
    togglePlayerListMode,
  });

  const contextValue = useMemo(
    () => ({
      isGeral,
      career,
      allCareers,
      seasonId,
      playersAcademy,
      allPlayersAcademy,
      tournamentsAcademy,
      allTournamentsAcademy,
      hasLoadedAllTournaments,
      isLoading: isLoadingPlayers || isLoadingTournaments,
      isAddingPlayer,
      isAddingTournament,
      isPromotingPlayer,
      activeCardIndex,
      selectedPlayer,
      selectedTournament,
      dashboardCards,
      isAnimationDisabled,
      seasonNumber,
      selectedTournamentId,
      isFocusedViewActive,
      playerListMode,
      editingEvolutionEvent,
      setEditingEvolutionEvent,
      togglePlayerListMode,
      setSelectedTournamentId,
      setIsAddingPlayer,
      setIsAddingTournament,
      setIsPromotingPlayer,
      setActiveCardIndex,
      onUpdatePlayer: updatePlayer,
      onDeletePlayer: deletePlayer,
      onReleasePlayer: releasePlayer,
      onUpdateTournament: updateTournament,
      onDeleteTournament: deleteTournament,
      refetchTournaments,
      refetchPlayers,
      applyPromotedPlayer,
      playerClick: handlePlayerClick,
      back: backWrapper,
    }),
    [
      isGeral,
      career,
      allCareers,
      seasonId,
      playersAcademy,
      allPlayersAcademy,
      tournamentsAcademy,
      allTournamentsAcademy,
      hasLoadedAllTournaments,
      isLoadingPlayers,
      isLoadingTournaments,
      isAddingPlayer,
      isAddingTournament,
      isPromotingPlayer,
      activeCardIndex,
      selectedPlayer,
      selectedTournament,
      dashboardCards,
      isAnimationDisabled,
      seasonNumber,
      selectedTournamentId,
      isFocusedViewActive,
      playerListMode,
      editingEvolutionEvent,
      setEditingEvolutionEvent,
      togglePlayerListMode,
      setSelectedTournamentId,
      setIsAddingPlayer,
      setIsAddingTournament,
      setIsPromotingPlayer,
      setActiveCardIndex,
      updatePlayer,
      deletePlayer,
      releasePlayer,
      updateTournament,
      deleteTournament,
      refetchTournaments,
      refetchPlayers,
      applyPromotedPlayer,
      handlePlayerClick,
      backWrapper,
    ],
  );

  return (
    <AcademyContext.Provider value={contextValue}>
      {children}
    </AcademyContext.Provider>
  );
};
