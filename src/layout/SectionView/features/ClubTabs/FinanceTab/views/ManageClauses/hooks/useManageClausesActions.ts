import React, { useState, useRef, useEffect, useMemo } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Contract } from "../../../../../../../../common/interfaces/playersInfo/contract";
import { TransferItem, ActiveInlineState } from "../types";
import { TransferBonus } from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import {
  BooleanValues,
  FormValues,
} from "../../../../SquadTab/views/TransferPlayer/types";
import { SectionScreen } from "../../../../../../config/screens";
import { useToast } from "../../../../../../../../common/hooks/UseToast";
import { TransferProposal } from "../../../../../../../../common/interfaces/proposals/transferProposal";
import { useManageClausesSettlementActions } from "./useManageClausesSettlementActions";
import { useManageClausesLoanActions } from "./useManageClausesLoanActions";
import { useManageClausesInlineActions } from "./useManageClausesInlineActions";

export interface UseManageClausesActionsProps {
  career: Career;
  season: ClubData;
  onOpenScreen?: (screen: SectionScreen) => void;
  allTransfers: TransferItem[];
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalVersion: React.Dispatch<React.SetStateAction<number>>;
  setDeletedRenewalKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  readOnly?: boolean;
  activeTab?: "renewals" | "arrivals" | "exit";
}

export const useManageClausesActions = ({
  career,
  season,
  onOpenScreen,
  allTransfers,
  setIsLoading,
  setLocalVersion,
  setDeletedRenewalKeys,
  readOnly = false,
  activeTab = "renewals",
}: UseManageClausesActionsProps) => {
  const {
    confirm,
    error: showError,
    warning: showWarning,
    success: showSuccess,
  } = useToast();

  const [activeInline, setActiveInline] = useState<ActiveInlineState | null>(
    null,
  );
  const [activeProposal, setActiveProposal] =
    useState<TransferProposal | null>(null);

  const [highlightedCardKey, setHighlightedCardKey] = useState<string | null>(
    null,
  );
  const lastClickedCardKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const drawerSnapshotRef = useRef<{
    values: FormValues;
    booleans: BooleanValues;
    bonuses: TransferBonus[];
    bonusItemIndex: number | null;
  } | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Sub-hook de liquidação e reversões financeiras
  const settlementActions = useManageClausesSettlementActions({
    career,
    season,
    onOpenScreen,
    setIsLoading,
    setLocalVersion,
    setDeletedRenewalKeys,
    readOnly,
    activeInline,
    setActiveInline,
    confirm,
    showError,
    showWarning,
    showSuccess,
  });

  // 2. Sub-hook de gestão e opções de compra de empréstimo
  const loanActions = useManageClausesLoanActions({
    career,
    season,
    setIsLoading,
    setLocalVersion,
    readOnly,
    setActiveInline,
    setActiveProposal,
    setActiveSectionDrawer: () => {}, // Atualizado via composição
    lastClickedCardKeyRef,
    drawerSnapshotRef,
    showError,
    showWarning,
    showSuccess,
  });

  // 3. Sub-hook de edição inline e painéis de cláusulas
  const inlineActions = useManageClausesInlineActions({
    career,
    season,
    setIsLoading,
    setLocalVersion,
    readOnly,
    activeTab,
    activeInline,
    setActiveInline,
    activeProposal,
    setActiveProposal,
    setLoanBuyOptionDateInput: loanActions.setLoanBuyOptionDateInput,
    setHighlightedCardKey,
    lastClickedCardKeyRef,
    isMountedRef,
    drawerSnapshotRef,
    showError,
    showWarning,
    showSuccess,
  });

  // Conecta o setActiveSectionDrawer de inlineActions com loanActions
  const handleExerciseLoanBuyOption = async (item: TransferItem) => {
    const res = await loanActions.handleExerciseLoanBuyOption(item);
    inlineActions.setActiveSectionDrawer(null);
    return res;
  };

  const handleExerciseArrivalLoanBuyOption = async (item: TransferItem) => {
    const res = await loanActions.handleExerciseArrivalLoanBuyOption(item);
    inlineActions.setActiveSectionDrawer(null);
    return res;
  };

  const startManageProposalLoan = (proposal: TransferProposal) => {
    loanActions.startManageProposalLoan(proposal);
    inlineActions.setActiveSectionDrawer(null);
  };

  // Item ativo em foco para painel operacional ou edição inline
  const activeTransferItem = useMemo(() => {
    if (!activeInline) return null;
    if (activeProposal) {
      const isExit =
        activeProposal.type === "venda" ||
        activeProposal.type === "emprestimo_saida";
      const feeValue =
        activeProposal.clubNegotiation?.transferFee ??
        activeProposal.playerValue ??
        0;
      const partnerClub = activeProposal.clubNegotiation?.partnerClub || "";

      const contract: Contract = {
        isLoan:
          activeProposal.type === "emprestimo_entrada" ||
          activeProposal.type === "emprestimo_saida",
        fromClub: !isExit ? partnerClub : "",
        leftClub: isExit ? partnerClub : "",
        buyValue: !isExit && feeValue > 0 ? feeValue : 0,
        sellValue: isExit && feeValue > 0 ? feeValue : 0,
        dataArrival: null,
        dataExit: null,
        wagePercentage:
          activeProposal.type === "emprestimo_entrada"
            ? activeProposal.clubNegotiation?.loanTerms?.ourWagePercentage
            : activeProposal.clubNegotiation?.loanTerms?.theirWagePercentage,
        installments: activeProposal.clubNegotiation?.installments,
        swapPlayer: activeProposal.clubNegotiation?.swapPlayer,
        bonuses: activeProposal.clubNegotiation?.bonuses || [],
        transferClauses: {
          loanBackDuration: activeProposal.clubNegotiation?.loanBackDuration,
          buybackValue: activeProposal.clubNegotiation?.buybackValue,
          firstRefusal: activeProposal.clubNegotiation?.firstRefusal,
          sellOnPercentage: activeProposal.clubNegotiation?.sellOnPercentage,
        },
        loanTerms: activeProposal.clubNegotiation?.loanTerms,
        loanDuration: activeProposal.clubNegotiation?.loanTerms?.durationYears,
      };

      const player = {
        id: activeProposal.playerId,
        name: activeProposal.playerName,
        nation: activeProposal.playerNation || "BRA",
        sector: activeProposal.playerSector || "Meio-Campo",
        position: activeProposal.playerPosition || "MEI",
        overall: activeProposal.playerOverall || undefined,
        age: activeProposal.playerAge || undefined,
        contract: [contract],
      } as unknown as TransferItem["player"];

      return {
        player,
        contract,
        contractIndex: 0,
        direction:
          activeProposal.type === "renovacao"
            ? ("renewals" as const)
            : !isExit
              ? ("arrivals" as const)
              : ("exit" as const),
        cardKey: activeProposal.id,
      };
    }

    const foundInTransfers = allTransfers.find(
      (t) =>
        `${t.player.id}_${t.contractIndex}_${t.direction}` ===
        activeInline.cardKey,
    );
    if (foundInTransfers) return foundInTransfers;

    if (activeInline.mode === "manage") {
      for (const player of season.players || []) {
        const contracts = player.contract || [];
        for (let cIdx = 0; cIdx < contracts.length; cIdx++) {
          for (const dir of ["exit", "arrivals", "renewals"] as const) {
            if (`${player.id}_${cIdx}_${dir}` === activeInline.cardKey) {
              return {
                player,
                contract: contracts[cIdx],
                contractIndex: cIdx,
                direction: dir,
              };
            }
          }
        }
      }
    }

    return null;
  }, [activeInline, activeProposal, allTransfers, season.players]);

  return {
    activeInline,
    setActiveInline,
    activeProposal,
    activeTransferItem,
    highlightedCardKey,
    setHighlightedCardKey,
    ...settlementActions,
    ...loanActions,
    ...inlineActions,
    handleExerciseLoanBuyOption,
    handleExerciseArrivalLoanBuyOption,
    startManageProposalLoan,
  };
};

export default useManageClausesActions;
