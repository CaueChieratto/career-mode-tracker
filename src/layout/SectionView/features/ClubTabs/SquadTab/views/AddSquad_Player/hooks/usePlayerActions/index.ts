import { useState } from "react";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { useAddSquadPlayer } from "../../../../../../../../../common/hooks/Players/UseAddSquadPlayer";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Teams } from "../../../../../../../../../common/interfaces/Teams";
import { useEditSquadPlayer } from "../../../TransferPlayer/hooks/useEditSquadPlayer";
import { ServiceMatches } from "../../../../../AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { mapFormDataToPlayerData } from "../../../../../../../../../common/helpers/Mappers";

type usePlayerActionsProps = {
  careerId: string;
  seasonId: string;
  player?: Players;
  currentPlayers?: Players[];
  onSuccess: () => void;
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
    setIsLoading(true);
    try {
      if (
        player?.incomingLoan &&
        formData.get("isReturnIncomingLoan") === "true"
      ) {
        const returnDate = (
          (formData.get("returnDate") as string) || ""
        ).trim();
        if (!returnDate)
          throw new Error("Por favor, preencha a data de retorno.");
        await returnLoanPlayer(returnDate);
        Object.assign(player, { sell: true, incomingLoan: false });
        onSuccess();
        return;
      }

      const newPlayerData = mapFormDataToPlayerData(
        formData,
        career,
        season,
        player,
      );
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

        Object.assign(player, newPlayerData);
      } else {
        const globalId = (formData.get("globalId") as string) || null;
        const candidateId = globalId || Math.random().toString();
        season.players = [
          ...season.players,
          {
            id: candidateId,
            ...newPlayerData,
            ...(globalId
              ? { playedWithUs: newPlayerData.playedWithUs || globalId }
              : {}),
          } as Players,
        ];
      }

      const fromClubName = (formData.get("fromClub") as string)?.trim();

      if (fromClubName) {
        const teamAlreadyExists = season.teams?.some(
          (t) => t.name.toLowerCase() === fromClubName.toLowerCase(),
        );

        if (!teamAlreadyExists) {
          const newTeam: Teams = {
            name: fromClubName,
            showMatch: false,
          };

          await ServiceMatches.addTeamToSeason(careerId, seasonId, newTeam);
        }
      }

      if (player) {
        await editPlayer(formData);
      } else {
        await addPlayer(formData);
      }

      onSuccess();
    } catch (error: unknown) {
      alert(
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlayer = async () => {
    setIsLoading(true);
    try {
      if (player) {
        season.players = season.players.filter((p) => p.id !== player.id);
      }
      await deletePlayer();
      onSuccess();
    } catch (error) {
      console.error("Falha ao deletar o jogador:", error);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnLoanPlayer = async (returnDate: string) => {
    setIsLoading(true);
    try {
      await returnLoanPlayer(returnDate);
      if (player) {
        Object.assign(
          player,
          player.incomingLoan
            ? { sell: true, incomingLoan: false }
            : { loan: false },
        );
      }
      onSuccess();
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
