import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { ServicePlayers } from "../../../../../../../../../common/services/ServicePlayers";
import {
  parseBrasilDate,
  parseFullBrasilDate,
  brasilDatePlaceholderShort,
} from "../../../../../../../../../common/utils/Date";
import { parseValue } from "../../../../../../../../../common/utils/FormatValue";
import { calculateContractYears } from "../../../../../../../../../common/utils/calculateContractYears";
import { parseLoanDuration } from "../../../../../../../../../common/utils/parseLoanDuration";
import { getSeasonDateRange } from "../../../../../../../../../common/utils/GetSeasonDateRange";
import { notifyCareersUpdated } from "../../../../../../../../../common/hooks/Career/UseCareer";
import { updateCachedCareer } from "../../../../../../../../../common/helpers/Getters";
import {
  checkIsSpecialTransfer,
  checkIsIncomingLoanExit,
} from "../../constants/buildEditTransferFormSections";
import {
  TransferBonus,
  LoanTerms,
  TransferTiming,
} from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { BooleanValues, FormValues } from "../../types";
import { validateTransfer } from "../../validators/transferValidator";
import { validateLoan } from "../../validators/loanValidator";
import {
  applyEditToCareer,
  applyRevertToCareer,
} from "../../helpers/transferCareerStateReducers";
import { toast } from "../../../../../../../../../common/services/ToastService";

export interface UseEditTransferActionsParams {
  career: Career;
  season: ClubData;
  player: Players;
  contract: NonNullable<Players["contract"]>[number];
  contractIndex: number;
  direction: "arrivals" | "exit";
  onClose: () => void;
  formValues: FormValues;
  booleanValues: BooleanValues;
  bonuses: TransferBonus[];
  setIsLoading: (loading: boolean) => void;
}

export const commitEditedCareerState = (
  career: Career,
  season: ClubData,
  player: Players,
  updatedCareer: Career,
  onClose: () => void,
) => {
  const updatedSeason = updatedCareer.clubData.find((s) => s.id === season.id);
  if (updatedSeason) {
    season.players = updatedSeason.players;
  }
  career.clubData = updatedCareer.clubData;
  career.updatedAt = updatedCareer.updatedAt;

  const updatedPlayer = updatedSeason?.players.find((p) => p.id === player.id);
  if (updatedPlayer) {
    Object.assign(player, updatedPlayer);
  }

  updateCachedCareer(updatedCareer);
  notifyCareersUpdated((prev) =>
    prev.map((c) => (c.id === career.id ? updatedCareer : c)),
  );
  onClose();
};

export const useEditTransferActions = ({
  career,
  season,
  player,
  contract,
  contractIndex,
  direction,
  onClose,
  formValues,
  booleanValues,
  bonuses,
  setIsLoading,
}: UseEditTransferActionsParams) => {
  const handleSave = async () => {
    const isArrival = direction === "arrivals";
    const isSpecial = checkIsSpecialTransfer(contract, direction);
    const isLoanDetected =
      formValues.transferType === "Emprestar" ||
      formValues.transferType === "Empréstimo" ||
      Boolean(contract.isLoan);

    let date = isArrival ? formValues.dateArrival : formValues.dateExit;

    if (!date || date.length < 5) {
      if (isLoanDetected) {
        const fallbackRaw = isArrival ? contract.dataArrival : contract.dataExit;
        if (fallbackRaw) {
          try {
            date = brasilDatePlaceholderShort(new Date(fallbackRaw));
          } catch {
            date = "01/07";
          }
        } else {
          date = "01/07";
        }
      } else {
        toast.warning("Por favor, preencha a data corretamente (DD/MM).");
        return;
      }
    }

    const { startDate, endDate } = getSeasonDateRange(
      season.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const [, month] = date.split("/").map(Number);
    const m = (month || 1) - 1;
    const year =
      m < startDate.getMonth()
        ? endDate.getFullYear()
        : startDate.getFullYear();
    const parsedDate = parseBrasilDate(date, year) || new Date();

    const isIncomingLoanReturnExit = checkIsIncomingLoanExit(
      player,
      contract,
      direction,
    );

    if (isIncomingLoanReturnExit) {
      const clubName =
        formValues.toClub || contract.leftClub || contract.fromClub;

      if (!clubName || !clubName.trim()) {
        toast.warning("Por favor, informe o clube.");
        return;
      }

      setIsLoading(true);
      try {
        await ServicePlayers.editTransferInSeason({
          careerId: career.id,
          seasonId: season.id,
          playerId: player.id,
          contractIndex,
          direction,
          transferType: "Fim de Empréstimo",
          clubName: clubName.trim(),
          transferValue: "0",
          date,
        });

        const updatedCareer = applyEditToCareer(
          career,
          season.id,
          player.id,
          contractIndex,
          direction,
          {
            clubName: clubName.trim(),
            transferValue: 0,
            transferType: "Fim de Empréstimo",
            date: parsedDate,
          },
        );

        commitEditedCareerState(career, season, player, updatedCareer, onClose);
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao salvar a transferência.",
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (isSpecial) {
      setIsLoading(true);
      try {
        await ServicePlayers.editTransferInSeason({
          careerId: career.id,
          seasonId: season.id,
          playerId: player.id,
          contractIndex,
          direction,
          transferType: formValues.transferType,
          clubName: isArrival ? contract.fromClub : contract.leftClub,
          transferValue: "0",
          date,
        });

        const updatedCareer = applyEditToCareer(
          career,
          season.id,
          player.id,
          contractIndex,
          direction,
          {
            clubName:
              (isArrival ? contract.fromClub : contract.leftClub) || "",
            transferValue: 0,
            transferType: formValues.transferType,
            date: parsedDate,
          },
        );

        commitEditedCareerState(career, season, player, updatedCareer, onClose);
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao salvar a transferência.",
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const rawTransferType = formValues.transferType;
    const transferType =
      rawTransferType === "Venda" || rawTransferType === "Compra"
        ? rawTransferType
        : !isArrival &&
            (rawTransferType === "Empréstimo" ||
              rawTransferType === "Emprestar" ||
              Boolean(contract.isLoan))
          ? "Emprestar"
          : isArrival &&
              (rawTransferType === "Empréstimo" ||
                rawTransferType === "Emprestar" ||
                Boolean(contract.isLoan))
            ? "Empréstimo"
            : rawTransferType;
    const isLoan =
      transferType === "Emprestar" || transferType === "Empréstimo";

    if (!isArrival && transferType === "Venda") {
      const { isValid, error, data } = validateTransfer(
        formValues as FormValues,
        booleanValues,
        season.seasonNumber,
        bonuses,
      );

      if (!isValid || !data) {
        toast.warning(error || "Dados da transferência inválidos.");
        return;
      }

      setIsLoading(true);
      try {
        await ServicePlayers.editTransferInSeason({
          careerId: career.id,
          seasonId: season.id,
          playerId: player.id,
          contractIndex,
          direction,
          transferType: "Venda",
          clubName: data.toClub.trim(),
          transferValue: data.sellValue,
          date: data.dateExit,
          timing: data.timing,
          salary: formValues.salary,
          contractTime: formValues.contractTime,
          installments: data.installments,
          swapPlayer: data.swapPlayer,
          bonuses: data.bonuses,
          transferClauses: data.transferClauses,
        });

        const updatedCareer = applyEditToCareer(
          career,
          season.id,
          player.id,
          contractIndex,
          direction,
          {
            clubName: data.toClub.trim(),
            transferValue: parseValue(data.sellValue || "0"),
            transferType: "Venda",
            date: parsedDate,
            timing: data.timing,
            salary: formValues.salary ? parseValue(formValues.salary) : undefined,
            contractTime: formValues.contractTime
              ? Number(formValues.contractTime)
              : undefined,
            installments: data.installments,
            swapPlayer: data.swapPlayer,
            bonuses: data.bonuses,
            transferClauses: data.transferClauses,
          },
        );

        commitEditedCareerState(career, season, player, updatedCareer, onClose);
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao salvar a transferência.",
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const clubName = isArrival ? formValues.fromClub : formValues.toClub;
    const rawTransferValue = isArrival
      ? formValues.buyValue
      : formValues.sellValue;
    const transferValue =
      rawTransferValue !== undefined &&
      rawTransferValue !== null &&
      rawTransferValue.trim() !== ""
        ? rawTransferValue.trim()
        : "0";

    if (!clubName || !clubName.trim()) {
      toast.warning("Por favor, informe o clube.");
      return;
    }

    if (isArrival && transferType === "Compra") {
      if (formValues.contractUntil && formValues.contractUntil.trim()) {
        const until = formValues.contractUntil.trim();
        const parsedUntil = parseFullBrasilDate(until);
        if (until.length !== 10 || !parsedUntil || isNaN(parsedUntil.getTime())) {
          toast.warning("Por favor, informe uma data de contrato válida no formato DD/MM/AAAA.");
          return;
        }
        const calculatedYears = calculateContractYears(
          until,
          career.createdAt,
          season.seasonNumber,
          career.nation,
        );
        if (calculatedYears < 1 || calculatedYears > 7) {
          toast.warning("A data de contrato deve resultar em uma duração entre 1 e 7 temporadas.");
          return;
        }
      }
    }

    let loanTerms: LoanTerms | undefined;
    let buyOptionValue: string | undefined;

    if (isLoan) {
      if (!isArrival) {
        const { isValid, error, data } = validateLoan(
          formValues as FormValues,
          booleanValues,
        );
        if (!isValid || !data) {
          toast.warning(error || "Dados do empréstimo inválidos.");
          return;
        }
        loanTerms = data.loanTerms || {
          durationYears:
            parseLoanDuration(formValues.loanDuration) ??
            (Number(formValues.loanDuration) || 1),
          ourWagePercentage: Math.max(
            0,
            100 - (Number(formValues.wagePercentage) || 0),
          ),
          theirWagePercentage: Math.min(
            100,
            Math.max(0, Number(formValues.wagePercentage) || 0),
          ),
          hasBuyOption: false,
          partnerClub: clubName.trim(),
        };
        if (loanTerms?.buyOptionFee) {
          buyOptionValue = String(loanTerms.buyOptionFee);
        }
      } else {
        const parsedDuration = parseLoanDuration(formValues.loanDuration);
        if (parsedDuration === null) {
          toast.warning("A duração do empréstimo deve ser de 0.6 (6 meses), 1 ano, 1.6 (18 meses) ou 2 anos.");
          return;
        }
        const rawWage = formValues.wagePercentage;
        const wage =
          rawWage !== undefined && rawWage !== "" && !isNaN(Number(rawWage))
            ? Number(rawWage)
            : contract.wagePercentage !== undefined && contract.wagePercentage !== null
              ? Number(contract.wagePercentage)
              : 100;
        if (wage < 0 || wage > 100) {
          toast.warning("Por favor, informe a porcentagem de salário paga (0 a 100).");
          return;
        }
        const wagePct = wage;
        const hasBuyOpt = Boolean(booleanValues.hasBuyOption);
        const buyOptRaw = (formValues.buyOption || "").trim();
        const sellOnRaw = (formValues.sellOnPercentage || "").trim();

        let buyOptNum: number | undefined;
        let parsedSellOn: number | undefined;

        if (hasBuyOpt) {
          if (!buyOptRaw) {
            toast.warning("Por favor, preencha a taxa de transferência da opção de compra.");
            return;
          }
          if (!/[kmb]$/i.test(buyOptRaw) || parseValue(buyOptRaw) <= 0) {
            toast.warning("A taxa de transferência deve terminar com 'k', 'm' ou 'b'. Ex: 150k, 50M, 1.2B");
            return;
          }
          buyOptNum = parseValue(buyOptRaw);

          if (sellOnRaw !== "") {
            parsedSellOn = Number(sellOnRaw.replace("%", "").trim());
            if (isNaN(parsedSellOn) || parsedSellOn <= 0 || parsedSellOn > 100) {
              toast.warning("A cláusula de futura venda deve ser uma porcentagem válida entre 1 e 100.");
              return;
            }
          }
        }

        loanTerms = {
          durationYears: parsedDuration,
          ourWagePercentage: wagePct,
          theirWagePercentage: 100 - wagePct,
          hasBuyOption: hasBuyOpt,
          buyOptionFee: hasBuyOpt && buyOptNum ? buyOptNum : undefined,
          ...(hasBuyOpt && parsedSellOn !== undefined ? { sellOnPercentage: parsedSellOn } : {}),
          partnerClub: clubName.trim(),
        };
        if (hasBuyOpt && buyOptNum) {
          buyOptionValue = String(buyOptNum);
        }
      }
    }

    setIsLoading(true);
    try {
      await ServicePlayers.editTransferInSeason({
        careerId: career.id,
        seasonId: season.id,
        playerId: player.id,
        contractIndex,
        direction,
        transferType,
        clubName: clubName.trim(),
        transferValue: transferValue || "0",
        date,
        timing: formValues.timing,
        loanDuration: formValues.loanDuration,
        wagePercentage: formValues.wagePercentage,
        buyOptionValue,
        buyOption: formValues.buyOption,
        salary: formValues.salary,
        contractTime: formValues.contractTime,
        contractUntil: formValues.contractUntil,
        signingBonus: formValues.signingBonus,
        agentFee: formValues.agentFee,
        loanTerms,
      });

      const updatedCareer = applyEditToCareer(
        career,
        season.id,
        player.id,
        contractIndex,
        direction,
        {
          clubName: clubName.trim(),
          transferValue: parseValue(transferValue || "0"),
          transferType,
          date: parsedDate,
          timing: formValues.timing as TransferTiming,
          loanDuration: formValues.loanDuration
            ? (parseLoanDuration(formValues.loanDuration) ?? Number(formValues.loanDuration))
            : undefined,
          wagePercentage: formValues.wagePercentage
            ? Number(formValues.wagePercentage)
            : undefined,
          buyOptionValue: buyOptionValue
            ? parseValue(buyOptionValue)
            : formValues.buyOption
              ? parseValue(formValues.buyOption)
              : undefined,
          salary: formValues.salary ? parseValue(formValues.salary) : undefined,
          contractTime: formValues.contractTime
            ? Number(formValues.contractTime)
            : undefined,
          contractUntil: formValues.contractUntil,
          signingBonus: formValues.signingBonus,
          agentFee: formValues.agentFee,
          buyOption: formValues.buyOption,
          loanTerms,
        },
      );

      toast.success(
        isLoan
          ? "Empréstimo atualizado com sucesso!"
          : "Transferência atualizada com sucesso!",
      );
      commitEditedCareerState(career, season, player, updatedCareer, onClose);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : isLoan
            ? "Erro ao salvar o empréstimo."
            : "Erro ao salvar a transferência.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertTransfer = async () => {
    setIsLoading(true);
    const isLoanContract = Boolean(contract.isLoan);
    try {
      await ServicePlayers.revertTransferInSeason({
        careerId: career.id,
        seasonId: season.id,
        playerId: player.id,
        contractIndex,
        direction,
      });

      const updatedCareer = applyRevertToCareer(
        career,
        season.id,
        player.id,
        contractIndex,
        direction,
      );

      toast.success(
        isLoanContract
          ? "Empréstimo revertido com sucesso!"
          : "Transferência revertida com sucesso!",
      );
      commitEditedCareerState(career, season, player, updatedCareer, onClose);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : isLoanContract
            ? "Erro ao reverter o empréstimo."
            : "Erro ao reverter a transferência.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSave,
    handleRevertTransfer,
  };
};

export default useEditTransferActions;
