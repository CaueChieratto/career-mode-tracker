import { mapFormDataToPlayerData } from "../../../../../../../../../common/helpers/Mappers";
import {
  validateCaptainLimit,
  validateMonetaryInput,
  validateRequiredFields,
} from "../../../../../../../../../common/helpers/Validators";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { ServicePlayers } from "../../../../../../../../../common/services/ServicePlayers";
import { SellPlayerOptions } from "../../../../../../../../../common/services/ServicePlayers/PlayersContractService";
import { LoanTerms } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";

type UseEditSquadPlayerProps = {
  careerId: string;
  seasonId: string;
  playerId: string;
  onPlayerEdited: () => void;
  currentPlayers?: Players[];
  career: Career;
  season: ClubData;
};

export const useEditSquadPlayer = ({
  careerId,
  seasonId,
  playerId,
  currentPlayers,
  onPlayerEdited,
  career,
  season,
}: UseEditSquadPlayerProps) => {
  const editPlayer = async (formData: FormData) => {
    validateMonetaryInput(
      formData.get("playerValue") as string,
      "Valor de mercado",
    );
    validateMonetaryInput(
      formData.get("salary") as string,
      "Salário semanal",
    );
    validateRequiredFields(formData);

    const isBecomingCaptain = (formData.get("isCaptain") as string) === "true";
    const playerBeingEdited = currentPlayers?.find((p) => p.id === playerId);
    validateCaptainLimit(isBecomingCaptain, playerBeingEdited, currentPlayers);

    const updatedPlayerData = mapFormDataToPlayerData(
      formData,
      career,
      season,
      playerBeingEdited,
    );

    if (playerBeingEdited) {
      updatedPlayerData.loan = playerBeingEdited.loan ?? false;
      updatedPlayerData.sell = playerBeingEdited.sell ?? false;
      updatedPlayerData.incomingLoan = playerBeingEdited.incomingLoan ?? false;
    }

    const isAcademy = formData.get("isAcademy") === "true";
    if (isAcademy) {
      updatedPlayerData.isAcademy = true;
      const nick = (formData.get("academyNickname") as string)?.trim();
      if (nick) {
        updatedPlayerData.academyNickname = nick;
      } else {
        delete updatedPlayerData.academyNickname;
      }

      const academyDataStr = formData.get("academyData") as string;
      if (academyDataStr)
        updatedPlayerData.academyData = JSON.parse(academyDataStr);

      const academyHistoryStr = formData.get("academyHistory") as string;
      if (academyHistoryStr)
        updatedPlayerData.academyHistory = JSON.parse(academyHistoryStr);

      const academyTournamentsStr = formData.get(
        "academyTournaments",
      ) as string;
      if (academyTournamentsStr)
        updatedPlayerData.academyTournaments = JSON.parse(
          academyTournamentsStr,
        );
    }

    delete updatedPlayerData.buy;
    delete updatedPlayerData.statsLeagues;
    delete updatedPlayerData.ballonDor;

    const optionalKeys = [
      "playerValue",
      "salary",
      "contractTime",
      "contractUntil",
    ] as const;
    for (const key of optionalKeys) {
      if (formData.has(key) && !(key in updatedPlayerData)) {
        (updatedPlayerData as Record<string, unknown>)[key] = undefined;
      }
    }

    try {
      await ServicePlayers.editPlayerInSeason(
        careerId,
        seasonId,
        playerId,
        updatedPlayerData,
      );
      onPlayerEdited();
    } catch (error) {
      console.error("Erro ao editar jogador:", error);
      throw new Error("Falha ao editar jogador.");
    }
  };

  const sellPlayer = async (
    sellValue: string,
    toClub: string,
    dateExit: string,
    options?: SellPlayerOptions,
  ) => {
    try {
      await ServicePlayers.sellPlayerFromSeason(
        careerId,
        seasonId,
        playerId,
        sellValue,
        toClub,
        dateExit,
        options,
      );
      onPlayerEdited();
    } catch (error) {
      console.error("Erro ao vender jogador:", error);
      throw new Error("Falha ao vender jogador.");
    }
  };

  const loanPlayer = async (
    buyOption: string,
    toClub: string,
    dateLoan: string,
    loanDuration: string,
    wagePercentage: string,
    loanTerms?: LoanTerms,
  ) => {
    try {
      await ServicePlayers.loanPlayerFromSeason(
        careerId,
        seasonId,
        playerId,
        buyOption,
        toClub,
        dateLoan,
        loanDuration,
        wagePercentage,
        loanTerms,
      );
      onPlayerEdited();
    } catch (error) {
      console.error("Erro ao emprestar jogador:", error);
      throw new Error("Falha ao emprestar jogador.");
    }
  };

  const returnLoanPlayer = async (returnDate: string) => {
    try {
      await ServicePlayers.returnPlayerFromLoan(
        careerId,
        seasonId,
        playerId,
        returnDate,
      );
      onPlayerEdited();
    } catch (error) {
      console.error("Erro ao retornar jogador:", error);
      throw new Error("Falha ao retornar jogador do empréstimo.");
    }
  };

  const deletePlayer = async () => {
    try {
      await ServicePlayers.deletePlayerFromSeason(careerId, seasonId, playerId);
      onPlayerEdited();
    } catch (error) {
      console.error("Erro ao deletar jogador:", error);
      throw new Error("Falha ao deletar jogador.");
    }
  };

  return { editPlayer, deletePlayer, sellPlayer, loanPlayer, returnLoanPlayer };
};
