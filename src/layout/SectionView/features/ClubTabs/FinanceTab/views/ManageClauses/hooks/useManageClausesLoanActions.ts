import React, { useState } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Contract } from "../../../../../../../../common/interfaces/playersInfo/contract";
import { TransferItem, DrawerSection, ActiveInlineState } from "../types";
import { PlayersContractService } from "../../../../../../../../common/services/ServicePlayers/PlayersContractService";
import {
  getContractBuyOptionFee,
  hasDefinedLoanBuyOption,
} from "../../../../../../../../common/services/ServicePlayers/helpers/contractHelpers";
import { parseBrasilDate } from "../../../../../../../../common/utils/Date";
import { getSeasonDateRange } from "../../../../../../../../common/utils/GetSeasonDateRange";
import { SquadRole } from "../../../../../../../../common/interfaces/playersInfo/contractClauses";
import { isValidShortDate, safeScrollToTop } from "../helpers/manageClausesFormatters";
import { ServiceProposals } from "../../../../../../../../common/services/ServiceProposals";
import { TransferProposal } from "../../../../../../../../common/interfaces/proposals/transferProposal";

export interface UseManageClausesLoanActionsProps {
  career: Career;
  season: ClubData;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalVersion: React.Dispatch<React.SetStateAction<number>>;
  readOnly?: boolean;
  setActiveInline: React.Dispatch<
    React.SetStateAction<ActiveInlineState | null>
  >;
  setActiveProposal: React.Dispatch<
    React.SetStateAction<TransferProposal | null>
  >;
  setActiveSectionDrawer: React.Dispatch<React.SetStateAction<DrawerSection>>;
  lastClickedCardKeyRef: React.MutableRefObject<string | null>;
  drawerSnapshotRef: React.MutableRefObject<unknown>;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showSuccess: (message: string) => void;
}

export const useManageClausesLoanActions = ({
  career,
  season,
  setIsLoading,
  setLocalVersion,
  readOnly = false,
  setActiveInline,
  setActiveProposal,
  setActiveSectionDrawer,
  lastClickedCardKeyRef,
  drawerSnapshotRef,
  showError,
  showWarning,
  showSuccess,
}: UseManageClausesLoanActionsProps) => {
  const [loanBuyOptionDateInput, setLoanBuyOptionDateInput] =
    useState<string>("");

  const handleExerciseLoanBuyOption = async (item: TransferItem) => {
    if (readOnly) return;
    if (!hasDefinedLoanBuyOption(item.contract)) {
      showWarning("Este empréstimo não possui opção de compra definida.");
      return;
    }
    if (!isValidShortDate(loanBuyOptionDateInput)) {
      showWarning("Por favor, informe uma data válida no formato DD/MM.");
      return;
    }
    setIsLoading(true);
    try {
      await PlayersContractService.exerciseLoanBuyOption(
        career.id,
        season.id,
        item.player.id,
        item.contractIndex,
        loanBuyOptionDateInput,
      );

      const buyOptionFee =
        item.contract.buyOptionValue ||
        item.contract.loanTerms?.buyOptionFee ||
        0;
      const sellOnPct = item.contract.loanTerms?.sellOnPercentage;

      if (!item.contract.loanTerms) {
        item.contract.loanTerms = {
          durationYears: item.contract.loanDuration || 1,
          ourWagePercentage: Math.max(
            0,
            100 - (item.contract.wagePercentage || 0),
          ),
          theirWagePercentage: item.contract.wagePercentage || 0,
          hasBuyOption: true,
          buyOptionFee,
          ...(sellOnPct ? { sellOnPercentage: sellOnPct } : {}),
          partnerClub: item.contract.leftClub,
        };
      }
      item.contract.loanTerms.buyOptionExercised = true;
      item.contract.loanTerms.exercisedDate = loanBuyOptionDateInput;
      item.player.sell = true;
      item.player.loan = false;

      const derivedSale = item.player.contract?.find(
        (c: Contract) =>
          c.fromLoanBuyOption &&
          (c.sourceLoanContractIndex === item.contractIndex ||
            c.sourceLoanContractIndex === undefined),
      );
      if (derivedSale) {
        const { startDate, endDate } = getSeasonDateRange(
          season.seasonNumber,
          career.createdAt,
          career.nation,
        );
        const [, month] = loanBuyOptionDateInput.split("/").map(Number);
        const m = (month || 1) - 1;
        const year =
          m < startDate.getMonth()
            ? endDate.getFullYear()
            : startDate.getFullYear();
        const parsedDate = parseBrasilDate(loanBuyOptionDateInput, year);
        if (parsedDate) {
          derivedSale.dataExit = parsedDate;
        }
      }

      showSuccess("Opção de compra exercida com sucesso!");
      setActiveSectionDrawer(null);
      setLoanBuyOptionDateInput("");
    } catch (err) {
      console.error("Erro ao exercer opção de compra:", err);
      showError("Não foi possível exercer a opção de compra.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExerciseArrivalLoanBuyOption = async (item: TransferItem) => {
    if (readOnly) return;

    const isAlreadyFinalized = Boolean(
      item.contract.buyOptionFinalized ||
        item.contract.loanTerms?.buyOptionFinalized ||
        (item.contract.fromLoanBuyOption && !item.contract.isLoan) ||
        item.player.contract?.some(
          (c) =>
            c.buyOptionFinalized ||
            c.loanTerms?.buyOptionFinalized ||
            (c.fromLoanBuyOption && !c.isLoan),
        ),
    );
    if (isAlreadyFinalized) {
      showWarning("A opção de compra deste atleta já foi exercida e concluída.");
      return;
    }

    if (!hasDefinedLoanBuyOption(item.contract)) {
      showWarning("Este empréstimo não possui opção de compra definida.");
      return;
    }

    setIsLoading(true);
    try {
      const proposals =
        (await ServiceProposals.getProposalsBySeason(career.id, season.id)) ||
        [];
      const activePending = proposals.some(
        (p) =>
          p.playerId === item.player.id &&
          p.originLoanBuyOption &&
          p.overallStatus !== "cancelada" &&
          p.overallStatus !== "rejeitada" &&
          p.overallStatus !== "concluida",
      );
      if (activePending) {
        showWarning(
          "Já existe uma proposta de exercício da opção de compra em andamento.",
        );
        setIsLoading(false);
        return;
      }

      const buyOptionFee = getContractBuyOptionFee(item.contract);
      const fromClub =
        item.contract.fromClub ||
        item.contract.loanTerms?.partnerClub ||
        "";

      // Cria e envia proposta de compra sem queimar a opção prematuramente
      const proposalPayload: Omit<TransferProposal, "id"> = {
        careerId: career.id,
        seasonId: season.id,
        type: "compra",
        overallStatus: "em_andamento",
        timing: "Imediata",
        originLoanBuyOption: true,
        playerId: item.player.id,
        playerName: item.player.name,
        playerNation: item.player.nation || "BRA",
        playerPosition: item.player.position || "ATA",
        playerSector: item.player.sector || "Ataque",
        playerOverall: item.player.overall,
        playerAge: item.player.age,
        playerBirthDate: item.player.birthDate,
        shirtNumber: item.player.shirtNumber,
        playerValue: Number(item.player.playerValue || buyOptionFee),
        isKnownPlayer: true,
        clubNegotiation: {
          status: "aceita",
          partnerClub: fromClub,
          transferFee: buyOptionFee,
          ...(item.contract.loanTerms?.sellOnPercentage
            ? { sellOnPercentage: item.contract.loanTerms.sellOnPercentage }
            : item.contract.transferClauses?.sellOnPercentage
              ? {
                  sellOnPercentage:
                    item.contract.transferClauses.sellOnPercentage,
                }
              : {}),
        },
        playerNegotiation: {
          status: "em_negociacao",
          weeklyWage: Number(item.contract.salary || item.player.salary || 0),
          durationYears: 1,
          squadRole:
            (item.contract.contractDetails?.squadRole as SquadRole) ||
            "Rodízio",
        },
      };

      await ServiceProposals.createProposal(
        career.id,
        season.id,
        proposalPayload,
      );

      setLocalVersion((v) => v + 1);
      showSuccess("Proposta de compra criada com base na opção fixada!");
      setActiveInline(null);
      setActiveSectionDrawer(null);
    } catch (err) {
      console.error("Erro ao exercer opção de compra do empréstimo:", err);
      showError("Não foi possível exercer a opção de compra.");
    } finally {
      setIsLoading(false);
    }
  };

  const startManageProposalLoan = (proposal: TransferProposal) => {
    drawerSnapshotRef.current = null;
    lastClickedCardKeyRef.current = proposal.id;
    setActiveProposal(proposal);
    setActiveInline({ cardKey: proposal.id, mode: "manage" });
    setActiveSectionDrawer(null);
    setLoanBuyOptionDateInput("");
    safeScrollToTop();
  };

  return {
    loanBuyOptionDateInput,
    setLoanBuyOptionDateInput,
    handleExerciseLoanBuyOption,
    handleExerciseArrivalLoanBuyOption,
    startManageProposalLoan,
  };
};

export default useManageClausesLoanActions;
