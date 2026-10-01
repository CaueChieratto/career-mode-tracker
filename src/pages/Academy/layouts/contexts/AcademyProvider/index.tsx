import { ReactNode, useEffect, useState } from "react";
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
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../../../../common/services/Firebase";
import { getAsyncUser } from "../../AcademyContent/services/AcademyService/helpers";

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

  useEffect(() => {
    const fetchAllCareers = async () => {
      try {
        const user = await getAsyncUser();
        const querySnapshot = await getDocs(
          collection(db, `users/${user.uid}/careers`),
        );
        const careers = querySnapshot.docs.map((doc) => doc.data() as Career);
        setAllCareers(careers);
      } catch (error) {
        console.error("Erro ao carregar todas as carreiras:", error);
      }
    };
    fetchAllCareers();
  }, []);

  const {
    playersAcademy: rawPlayers,
    allPlayersAcademy,
    setPlayersAcademy,
    applyPromotedPlayer,
    isLoading,
    refetchPlayers,
  } = useAcademyPlayers(career, seasonId, isGeral);

  const {
    tournamentsAcademy: rawTournaments,
    allTournamentsAcademy,
    hasLoadedAllTournaments,
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

  const togglePlayerListMode = () => {
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
  };

  const backWrapper = () => {
    setEditingEvolutionEvent(null);
    back();
  };

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

  return (
    <AcademyContext.Provider
      value={{
        isGeral,
        career,
        allCareers,
        seasonId,
        playersAcademy,
        allPlayersAcademy,
        tournamentsAcademy,
        allTournamentsAcademy,
        hasLoadedAllTournaments,
        isLoading,
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
      }}
    >
      {children}
    </AcademyContext.Provider>
  );
};
