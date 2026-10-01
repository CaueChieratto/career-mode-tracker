import { useState, useCallback, useEffect } from "react";
import { AcademyService } from "../../services/AcademyService";
import { AcademyTournaments } from "../../interfaces/AcademyTournaments/AcademyTournaments";
import { Career } from "../../../../../../common/interfaces/Career";

export const useAcademyTournaments = (
  career: Career,
  seasonId: string,
  isGeral?: boolean,
) => {
  const [tournamentsAcademy, setTournamentsAcademy] = useState<
    AcademyTournaments[]
  >([]);
  const [allTournamentsAcademy, setAllTournamentsAcademy] = useState<
    AcademyTournaments[]
  >([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [hasLoadedAllTournaments, setHasLoadedAllTournaments] = useState(false);

  const fetchTournaments = useCallback(
    async (isSilentUpdate = false) => {
      if (!isSilentUpdate) {
        setIsLoadingTournaments(true);
      }
      setHasLoadedAllTournaments(false);
      try {
        const results = await Promise.all(
          career.clubData.map(async (season) => ({
            seasonId: season.id,
            tournaments: await AcademyService.getTournamentsAcademy(
              career.id,
              season.id,
            ),
          })),
        );
        const allTournaments = results.flatMap((result) => result.tournaments);
        setAllTournamentsAcademy(allTournaments);
        setHasLoadedAllTournaments(true);
        setTournamentsAcademy(
          isGeral
            ? allTournaments
            : results.find((result) => result.seasonId === seasonId)
                ?.tournaments || [],
        );
      } catch (error) {
        console.error("Erro ao carregar torneios da academia:", error);
      } finally {
        setIsLoadingTournaments(false);
      }
    },
    [career, seasonId, isGeral],
  );

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return {
    tournamentsAcademy,
    allTournamentsAcademy,
    hasLoadedAllTournaments,
    isLoadingTournaments,
    setTournamentsAcademy,
    refetchTournaments: fetchTournaments,
  };
};
