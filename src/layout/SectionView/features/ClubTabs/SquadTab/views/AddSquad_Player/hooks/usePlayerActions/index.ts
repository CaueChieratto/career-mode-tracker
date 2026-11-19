import { useState } from "react";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { useAddSquadPlayer } from "../../../../../../../../../common/hooks/Players/UseAddSquadPlayer";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { useEditSquadPlayer } from "../../../TransferPlayer/hooks/useEditSquadPlayer";
import { ServiceSeasons } from "../../../../../../../../../common/services/ServiceSeasons";
import { ensureTeamSavedInSeason } from "../../../shared/useGlobalTeamsOptions";
import { mapFormDataToPlayerData } from "../../../../../../../../../common/helpers/Mappers";
import { toast } from "../../../../../../../../../common/services/ToastService";
import { NavigationSessionStore } from "../../../../../../../../../common/services/NavigationSessionStore";
import { OptimisticUpdateData } from "../../../../../../../helpers/updateSectionCareer";
import { getSortedCaptains } from "../../../../../GeneralTab/components/CaptainsHierarchyCard/helpers/getSortedCaptains";
import { buildReturnContractHistory } from "../../../../../../../../../common/services/ServicePlayers/helpers/contractHelpers";
import { getSeasonDateRange } from "../../../../../../../../../common/utils/GetSeasonDateRange";

type usePlayerActionsProps = {
  careerId: string;
  seasonId: string;
  player?: Players;
  currentPlayers?: Players[];
  onSuccess: (optimisticData?: OptimisticUpdateData) => void;
  career: Career;
  season: ClubData;
};

export const usePlayerActions = ({
  careerId,
  seasonId,
  player,
  currentPlayers,
  onSuccess,
  career,
  season,
}: usePlayerActionsProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const { addPlayer } = useAddSquadPlayer({
    careerId,
    seasonId,
    onPlayerAdded: () => {},
    currentPlayers,
    career,
    season,
  });

  const { editPlayer, deletePlayer, sellPlayer, loanPlayer, returnLoanPlayer } =
    useEditSquadPlayer({
      careerId,
      seasonId,
      playerId: player?.id ?? "",
      onPlayerEdited: () => {},
      currentPlayers,
      career,
      season,
    });

  const handleAddOrEditPlayer = async (formData: FormData) => {
    let newPlayerData;
    try {
      newPlayerData = mapFormDataToPlayerData(
        formData,
        career,
        season,
        player,
      );
    } catch (validationError: unknown) {
      toast.warning(
        validationError instanceof Error
          ? validationError.message
          : "Preencha todos os campos obrigatórios.",
      );
      return;
    }

    setIsLoading(true);
    try {
      let createdPlayer: Players | undefined;
      let updatedPlayer: Players | undefined;

      if (player) {
        newPlayerData.loan = player.loan ?? false;
        newPlayerData.sell = player.sell ?? false;
        newPlayerData.incomingLoan = player.incomingLoan ?? false;
        newPlayerData.statsLeagues = player.statsLeagues ?? [];
        if (player.manualStatsLeagues) {
          newPlayerData.manualStatsLeagues = player.manualStatsLeagues;
        }
        newPlayerData.ballonDor = player.ballonDor ?? 0;

        if (!newPlayerData.playedWithUs) {
          delete player.playedWithUs;
        }

        const optionalKeys = [
          "playerValue",
          "salary",
          "contractTime",
          "contractUntil",
        ] as const;
        for (const key of optionalKeys) {
          if (formData.has(key) && !(key in newPlayerData)) {
            delete player[key];
          }
        }

        Object.assign(player, newPlayerData);
        updatedPlayer = { ...player, ...newPlayerData };
      } else {
        const globalId = (formData.get("globalId") as string) || null;
        const candidateId = globalId || Math.random().toString();
        createdPlayer = {
          id: candidateId,
          ...newPlayerData,
          ...(globalId
            ? { playedWithUs: newPlayerData.playedWithUs || globalId }
            : {}),
        } as Players;
      }

      const fromClubName = (formData.get("fromClub") as string)?.trim();

      if (!player && fromClubName) {
        await ensureTeamSavedInSeason(careerId, seasonId, season, fromClubName);
      }

      let savedPlayer: Players | undefined;
      if (player) {
        await editPlayer(formData);
        savedPlayer = updatedPlayer || player;
      } else {
        savedPlayer = await addPlayer(formData);
        if (savedPlayer) {
          createdPlayer = savedPlayer;
        }
      }

      const isCaptain = formData.get("isCaptain") === "true";
      const actualPlayerId =
        player?.id || savedPlayer?.id || createdPlayer?.id;

      if (isCaptain && actualPlayerId) {
        try {
          const currentSorted = getSortedCaptains(season);
          const otherCaptainIds = currentSorted
            .filter((c) => c.id !== actualPlayerId && !c.sell)
            .map((c) => c.id);

          let updatedCaptains: string[];
          const alreadyInCaptains = season.captains?.includes(actualPlayerId);

          if (alreadyInCaptains && season.captains) {
            updatedCaptains = season.captains.filter(
              (id) => id === actualPlayerId || otherCaptainIds.includes(id),
            );
          } else {
            updatedCaptains = [...otherCaptainIds, actualPlayerId].slice(0, 5);
          }

          await ServiceSeasons.updateSeasonCaptains(
            careerId,
            seasonId,
            updatedCaptains,
          );
        } catch (e) {
          console.error("Erro ao sincronizar ordem dos capitães:", e);
        }
      } else if (
        !isCaptain &&
        (player?.captain || season.captains?.includes(actualPlayerId || ""))
      ) {
        const idToRemove = actualPlayerId || player?.id;
        if (idToRemove && season.captains && season.captains.includes(idToRemove)) {
          const remaining = season.captains.filter((id) => id !== idToRemove);
          await ServiceSeasons.updateSeasonCaptains(
            careerId,
            seasonId,
            remaining,
          );
        }
      }

      toast.success(
        player
          ? "Jogador atualizado com sucesso!"
          : "Jogador adicionado com sucesso!",
      );

      const targetPlayerId = player?.id || createdPlayer?.id;
      const targetPlayerName = player?.name || (newPlayerData?.name as string);
      if (targetPlayerId || targetPlayerName) {
        const selector = targetPlayerId
          ? `#player-row-${targetPlayerId}, [data-player-id="${targetPlayerId}"]`
          : `[data-player-name="${targetPlayerName}"]`;
        NavigationSessionStore.saveClickAnchor("squad", {
          scrollY: 0,
          anchorSelector: selector,
          updatedAt: Date.now(),
        });
      }

      if (player && updatedPlayer) {
        onSuccess({
          type: "UPDATE_PLAYER",
          player: updatedPlayer,
        });
      } else if (createdPlayer) {
        onSuccess({
          type: "ADD_PLAYER",
          player: createdPlayer,
        });
      } else {
        onSuccess();
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlayer = async () => {
    setIsLoading(true);
    try {
      const deletedPlayerId = player?.id;
      await deletePlayer();
      toast.success("Jogador excluído do elenco com sucesso!");
      if (deletedPlayerId) {
        onSuccess({
          type: "DELETE_PLAYER",
          playerId: deletedPlayerId,
        });
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error("Falha ao deletar o jogador:", error);
      toast.error("Erro ao excluir jogador do elenco. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSellPlayer = async (
    sellValue: string,
    toClub: string,
    dateExit: string,
    loanDuration?: string,
    wagePercentage?: string,
  ) => {
    setIsLoading(true);
    try {
      if (loanDuration && wagePercentage) {
        await loanPlayer(
          sellValue,
          toClub,
          dateExit,
          loanDuration,
          wagePercentage,
        );
      } else {
        await sellPlayer(sellValue, toClub, dateExit);
      }
    } catch (error) {
      console.error("Falha ao registrar saída do jogador:", error);
      toast.error("Falha ao registrar saída do jogador. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnLoanPlayer = async (returnDate: string) => {
    setIsLoading(true);
    try {
      await returnLoanPlayer(returnDate);
      if (player) {
        const { startDate, endDate } = getSeasonDateRange(
          season.seasonNumber,
          career.createdAt,
          career.nation,
        );
        const { contractHistory } = buildReturnContractHistory(
          player,
          returnDate,
          startDate,
          endDate,
        );
        const updated = {
          ...player,
          ...(player.incomingLoan
            ? { sell: true, incomingLoan: false }
            : { loan: false, sell: false }),
          contract: contractHistory,
        };
        onSuccess({
          type: "UPDATE_PLAYER",
          player: updated,
        });
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error("Falha ao retornar o jogador:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleAddOrEditPlayer,
    handleDeletePlayer,
    handleSellPlayer,
    handleReturnLoanPlayer,
  };
};
