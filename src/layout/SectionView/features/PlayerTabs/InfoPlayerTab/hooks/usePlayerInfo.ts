import { useMemo } from "react";
import { Career } from "../../../../../../common/interfaces/Career";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { useLocation, useParams } from "react-router-dom";
import { calculatePlayerAge } from "../../../../../../common/utils/calculatePlayerAge";
import {
  getSeasonStartYear,
  getValidDate,
  isEuropeanSeason,
  parseFullBrasilDate,
} from "../../../../../../common/utils/Date";
import { findPlayerInList } from "../../../../../../common/utils/playerIdentity";

export const usePlayerInfo = (
  player?: Players,
  career?: Career,
  seasonIdParam?: string,
  isNotSeasonParam?: boolean,
) => {
  const location = useLocation();
  const { seasonId: routeSeasonId } = useParams<{ seasonId: string }>();
  const seasonId = seasonIdParam ?? routeSeasonId;
  const isNotSeason =
    isNotSeasonParam ?? (location.pathname.includes("/Geral") || !seasonId);

  const getSeasonYear = (
    dateValue: unknown,
    isEurope: boolean,
  ): number | null => {
    if (!dateValue) return null;

    let d: Date | null = null;

    if (typeof dateValue === "string" && dateValue.includes("/")) {
      d = parseFullBrasilDate(dateValue);
    } else {
      const valid = getValidDate(dateValue);
      d = valid.getTime() === 0 ? null : valid;
    }

    if (!d || isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = d.getMonth();

    if (isEurope) {
      return month <= 5 ? year - 1 : year;
    }

    return year;
  };

  const getPlayerAgeForTransaction = (transactionDate: unknown) => {
    if (!transactionDate || !career || !player) return player?.age;

    const isEurope = isEuropeanSeason(career.nation);
    const txSeasonYear = getSeasonYear(transactionDate, isEurope);

    const season = career.clubData.find((s) => {
      const sYear = getSeasonStartYear(career.createdAt, s.seasonNumber);
      return sYear === txSeasonYear;
    });

    if (season) {
      const playerInSeason = findPlayerInList(season.players, player);
      const targetPlayer = playerInSeason || player;
      if (targetPlayer?.birthDate) {
        const dynamicAge = calculatePlayerAge(
          targetPlayer.birthDate,
          career.createdAt,
          season.seasonNumber,
          career.nation,
          season.matches,
        );
        if (dynamicAge > 0) return dynamicAge;
      }
      return playerInSeason ? playerInSeason.age : player.age;
    }
    return player.age;
  };

  const transactions = useMemo(() => {
    if (!player?.contract?.length || !career) return [];

    const currentSeason = career.clubData.find((s) => s.id === seasonId);
    const currentSeasonYear = currentSeason
      ? getSeasonStartYear(career.createdAt, currentSeason.seasonNumber)
      : null;

    const isEurope = isEuropeanSeason(career.nation);

    const processedContracts = player.contract
      .map((contract) => {
        let showArrival = !!contract.fromClub;
        let showExit = !!contract.leftClub;

        if (!isNotSeason && currentSeasonYear !== null) {
          const arrivalYear = getSeasonYear(contract.dataArrival, isEurope);
          const exitYear = getSeasonYear(contract.dataExit, isEurope);

          const matchArrival =
            arrivalYear !== null ? arrivalYear === currentSeasonYear : true;
          const matchExit =
            exitYear !== null ? exitYear === currentSeasonYear : true;

          showArrival = showArrival && matchArrival;
          showExit = showExit && matchExit;
        }

        if (!showArrival && !showExit) return null;

        const numericBuyValue = Number(contract.buyValue) || 0;
        const numericSellValue = Number(contract.sellValue) || 0;

        let arrivalTitle = "Informações da compra";
        let arrivalValueLabel = "Valor da compra";
        let arrivalValueDisplay: string | number = numericBuyValue;

        if (numericBuyValue > 0) {
          arrivalTitle = "Informações da compra";
          arrivalValueLabel = "Valor da compra";
        } else if (contract.isLoan) {
          arrivalTitle = "Informações do empréstimo";
          arrivalValueLabel = "Tipo de transação";
          arrivalValueDisplay = "Empréstimo";
        } else if (contract.fromClub === "Passes Livres") {
          arrivalTitle = "Informações da contratação";
          arrivalValueLabel = "Tipo de transação";
          arrivalValueDisplay = "Custo Zero";
        } else if (contract.fromClub === "Base") {
          arrivalTitle = "Informações da promoção";
          arrivalValueLabel = "Tipo de transação";
          arrivalValueDisplay = "Promovido da Base";
        } else if (contract.fromClub) {
          arrivalTitle = "Informações do retorno";
          arrivalValueLabel = "Tipo de transação";
          arrivalValueDisplay = "Fim do Empréstimo";
        }

        let exitTitle = "Informações da venda";
        let exitValueLabel = "Valor da venda";
        let exitValueDisplay: string | number = numericSellValue;

        if (numericSellValue > 0) {
          exitTitle = "Informações da venda";
          exitValueLabel = "Valor da venda";
        } else if (contract.isLoan) {
          if (contract.fromClub && contract.leftClub) {
            exitTitle = "Informações do fim do empréstimo";
            exitValueLabel = "Tipo de transação";
            exitValueDisplay = "Fim do Empréstimo";
          } else {
            exitTitle = "Informações do empréstimo";
            exitValueLabel = "Tipo de transação";
            exitValueDisplay = "Empréstimo";
          }
        } else if (
          contract.leftClub === "Aposentou" ||
          contract.leftClub === "Aposentadoria"
        ) {
          exitTitle = "Informações da aposentadoria";
          exitValueLabel = "Tipo de transação";
          exitValueDisplay = "Aposentadoria";
        } else if (
          contract.leftClub === "Passes Livres" ||
          contract.leftClub === "Fim de Contrato"
        ) {
          exitTitle = "Informações do fim de contrato";
          exitValueLabel = "Tipo de transação";
          exitValueDisplay = "Fim de Contrato";
        } else if (contract.leftClub) {
          exitTitle = "Informações da saída";
          exitValueLabel = "Tipo de transação";
          exitValueDisplay = "Custo Zero";
        }

        return {
          ...contract,
          numericBuyValue: showArrival ? numericBuyValue : 0,
          numericSellValue: showExit ? numericSellValue : 0,
          hasBeenBought: showArrival,
          hasBeenSold: showExit,
          arrivalTitle,
          arrivalValueLabel,
          arrivalValueDisplay,
          exitTitle,
          exitValueLabel,
          exitValueDisplay,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    return processedContracts;
  }, [player, isNotSeason, seasonId, career]);

  return {
    player,
    career,
    transactions,
    getPlayerAgeForTransaction,
  };
};
