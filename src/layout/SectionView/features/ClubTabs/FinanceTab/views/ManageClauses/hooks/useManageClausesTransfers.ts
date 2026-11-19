import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { SectionScreen } from "../../../../../../config/screens";
import { TransferItem } from "../types";
import { getSeasonDateRange } from "../../../../../../../../common/utils/GetSeasonDateRange";
import {
  hasTransferActiveClauses,
  hasRenewalActiveClauses,
  isNextSeasonTiming,
  isNextWindowTiming,
  isContractInSeasonRange,
} from "../../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";
import {
  checkIsIncomingLoanExit,
  checkIsLoanReturnArrival,
  hasDefinedLoanBuyOption,
} from "../../../../../../../../common/services/ServicePlayers/helpers/contractHelpers";
import { Contract } from "../../../../../../../../common/interfaces/playersInfo/contract";
import {
  isContractedArrivalTransfer,
  hasArrivalActiveClauses,
  hasIncomingLoanEnded,
  hasOutgoingLoanEnded,
  findOutgoingLoanForReturnArrival,
} from "../helpers/arrivalTransferFilter";
import {
  TransferDraftService,
  PendingTransferDraft,
} from "../../../../../../../../common/services/TransferDraftService";
import { TransferProposal } from "../../../../../../../../common/interfaces/proposals/transferProposal";
import { ServiceProposals } from "../../../../../../../../common/services/ServiceProposals";
import { NavigationSessionStore } from "../../../../../../../../common/services/NavigationSessionStore";

export interface UseManageClausesTransfersProps {
  career: Career;
  season: ClubData;
  initialTab?: "renewals" | "arrivals" | "exit";
  selectedPlayerName?: string;
  selectedProposalId?: string;
  onHighlightCard?: (cardKey: string) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
}

export const useManageClausesTransfers = ({
  career,
  season,
  initialTab,
  selectedPlayerName,
  selectedProposalId,
  onHighlightCard,
  onOpenScreen,
}: UseManageClausesTransfersProps) => {
  const [activeTab, setActiveTabState] = useState<
    "renewals" | "arrivals" | "exit"
  >(() => {
    if (initialTab) return initialTab;
    return (
      (NavigationSessionStore.getClausesTab("renewals") as
        | "renewals"
        | "arrivals"
        | "exit") || "renewals"
    );
  });

  const setActiveTab = (tab: "renewals" | "arrivals" | "exit") => {
    setActiveTabState(tab);
    NavigationSessionStore.setClausesTab(tab);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [localVersion, setLocalVersion] = useState(0);
  const [deletedRenewalKeys, setDeletedRenewalKeys] = useState<Set<string>>(
    new Set(),
  );
  const [searchPlayerQuery, setSearchPlayerQuery] = useState("");
  const [pendingDraft, setPendingDraft] = useState<PendingTransferDraft | null>(
    () => TransferDraftService.getDraft(career.id, season.id),
  );
  const [proposals, setProposals] = useState<TransferProposal[]>([]);

  useEffect(() => {
    if (!career?.id || !season?.id) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = ServiceProposals.listenProposals(
        career.id,
        season.id,
        (fetched) => {
          setProposals(fetched);
        },
        (err) => {
          console.warn("ManageClauses: aviso ao escutar propostas:", err);
        },
      );
    } catch (err) {
      console.warn("ManageClauses: fallback proposals listener:", err);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [career?.id, season?.id, localVersion]);

  useEffect(() => {
    setPendingDraft(TransferDraftService.getDraft(career.id, season.id));
  }, [career.id, season.id, localVersion]);

  const handleResumeDraft = () => {
    onOpenScreen?.({
      key: "addTransferPlayer",
      seasonId: season.id,
      restoreDraft: true,
    });
  };

  const handleCancelDraft = () => {
    TransferDraftService.clearDraft(career.id, season.id);
    setPendingDraft(null);
  };

  const seasonRange = useMemo(() => {
    if (!career?.createdAt || !career?.nation || !season?.seasonNumber) {
      return null;
    }
    return getSeasonDateRange(
      season.seasonNumber,
      career.createdAt,
      career.nation,
    );
  }, [career?.createdAt, career?.nation, season?.seasonNumber]);

  const hasHadSettledExitClauses = (contract: Contract): boolean => {
    const hadInstallments = Boolean(contract.installments);
    const hadBonuses = Boolean(contract.bonuses && contract.bonuses.length > 0);
    const clauses = contract.transferClauses;
    const hadBuyback = Boolean(clauses?.buybackValue);
    const hadSellOn = Boolean(
      clauses?.sellOnPercentage || contract.loanTerms?.sellOnPercentage,
    );
    const hadLoanBack = Boolean(
      clauses?.loanBackDuration && clauses.loanBackDuration > 0,
    );

    if (
      !hadInstallments &&
      !hadBonuses &&
      !hadBuyback &&
      !hadSellOn &&
      !hadLoanBack
    ) {
      return false;
    }

    if (hadInstallments) {
      const inst = contract.installments!;
      const isPaid =
        inst.status === "paid" ||
        inst.remainingInstallments === 0 ||
        (Array.isArray(inst.installmentsList) &&
          inst.installmentsList.length > 0 &&
          inst.installmentsList.every((i) => i.paid));
      if (!isPaid) return false;
    }

    if (hadBonuses) {
      const allBonusesSettled = contract.bonuses!.every(
        (b) =>
          b.status === "paid" ||
          b.status === "expired" ||
          (b.status as string) === "Liquidado" ||
          (b.status as string) === "Liquidada" ||
          (b.status as string) === "Expirada" ||
          b.paid,
      );
      if (!allBonusesSettled) return false;
    }

    if (hadBuyback) {
      if (!clauses?.buybackExercised && !clauses?.buybackExpired) return false;
    }

    if (hadSellOn) {
      const isReceived = Boolean(
        clauses?.sellOnReceived ||
        clauses?.sellOnExercised ||
        contract.loanTerms?.sellOnReceived,
      );
      if (!isReceived) return false;
    }

    return true;
  };

  const isContractCurrentSeason = useCallback(
    (contract: Contract, direction: "arrivals" | "exit"): boolean => {
      if (contract.seasonId) {
        return contract.seasonId === season.id;
      }
      return isContractInSeasonRange(contract, direction, seasonRange);
    },
    [season.id, seasonRange],
  );

  const exitTransfers = useMemo(() => {
    void localVersion;
    const list: TransferItem[] = [];
    (season.players || []).forEach((p) => {
      (p.contract || []).forEach((c, idx) => {
        if (c.isRenewal || c.contractDetails?.isRenewal) return;

        if (
          c.leftClub &&
          c.leftClub !== "Aposentadoria" &&
          c.leftClub !== "Fim de Contrato" &&
          c.leftClub !== "Aposentou"
        ) {
          if (c.swapPlayer?.isCounterpart) return;
          if (c.isLoanBackReturn) return;

          if (checkIsIncomingLoanExit(p, c, "exit")) {
            if (
              hasIncomingLoanEnded(p, c) &&
              isContractCurrentSeason(c, "exit")
            ) {
              const hasIncomingLoanContent =
                hasDefinedLoanBuyOption(c) ||
                hasArrivalActiveClauses(c) ||
                hasTransferActiveClauses(c) ||
                isContractCurrentSeason(c, "exit");
              if (hasIncomingLoanContent) {
                list.push({
                  player: p,
                  contract: c,
                  contractIndex: idx,
                  direction: "exit",
                  loanOriginDirection: "arrivals",
                });
              }
            }
            return;
          }

          if (
            c.fromLoanBuyOption &&
            c.sourceLoanContractIndex !== undefined &&
            p.contract?.[c.sourceLoanContractIndex]?.isLoan
          ) {
            return;
          }

          const isNextSeasonAgreement = isNextSeasonTiming(c.timing);
          const isNextWindowAgreement = isNextWindowTiming(c.timing);
          const hasClauses = hasTransferActiveClauses(c);
          const isExplicitlyNotLoan =
            Boolean(c.fromLoanBuyOption) ||
            c.isLoan === false ||
            Number(c.sellValue) > 0;
          const isOutgoingLoan = Boolean(
            c.isLoan || (p.loan && !isExplicitlyNotLoan),
          );

          if (
            isOutgoingLoan &&
            hasOutgoingLoanEnded(p, c, idx, career, season.seasonNumber)
          ) {
            return;
          }

          // Um card de saída só é exibido se tiver algo a ser feito:
          // 1. Cláusulas pendentes (parcelas a receber, metas/bônus a receber, recompra, sell-on ativo, loan-back)
          // 2. Empréstimo ativo para fora
          // 3. Acordo agendado futuro pendente (isNextSeason ou isNextWindow ainda não concretizado)
          const hasPendingAction =
            hasClauses ||
            isOutgoingLoan ||
            isNextSeasonAgreement ||
            (isNextWindowAgreement && !p.sell);

          const isCurrentSeason = isContractCurrentSeason(c, "exit");
          const hasSettledClauses = hasHadSettledExitClauses(c);

          // Se tem pendências ativas: sempre exibe.
          // Se não tem pendências ativas:
          //   - Se teve cláusulas e foram totalmente esgotadas/liquidadas: NÃO exibe!
          //   - Se pertence a temporada passada: NÃO exibe!
          //   - Se pertence à temporada atual e nunca teve cláusulas: exibe (para permitir "Adicionar Cláusulas")
          const shouldInclude =
            hasPendingAction || (isCurrentSeason && !hasSettledClauses);

          if (shouldInclude) {
            list.push({
              player: p,
              contract: c,
              contractIndex: idx,
              direction: "exit",
            });
          }
        }
      });
    });
    return list;
  }, [
    career,
    season.players,
    season.seasonNumber,
    isContractCurrentSeason,
    localVersion,
  ]);

  const arrivalTransfers = useMemo(() => {
    void localVersion;
    const list: TransferItem[] = [];
    const emittedOutgoingLoanReturnKeys = new Set<string>();

    (season.players || []).forEach((p) => {
      (p.contract || []).forEach((c, idx) => {
        if (checkIsLoanReturnArrival(p, c, idx, career, season.seasonNumber)) {
          const foundLoan = findOutgoingLoanForReturnArrival(p, c, idx);
          if (foundLoan) {
            const { loanContract, loanContractIndex } = foundLoan;
            const dedupeKey = `${p.id}_${loanContractIndex}`;
            const isReturnCurrentSeason = isContractCurrentSeason(
              c,
              "arrivals",
            );
            const hasPendingLoanContent =
              hasDefinedLoanBuyOption(loanContract) ||
              hasTransferActiveClauses(loanContract);

            if (
              (isReturnCurrentSeason || hasPendingLoanContent) &&
              !emittedOutgoingLoanReturnKeys.has(dedupeKey)
            ) {
              emittedOutgoingLoanReturnKeys.add(dedupeKey);
              list.push({
                player: p,
                contract: {
                  ...loanContract,
                  isLoan: true,
                  fromClub: c.fromClub || loanContract.leftClub || "",
                  leftClub: loanContract.leftClub,
                  dataArrival: c.dataArrival || loanContract.dataArrival,
                  dataExit: c.dataArrival || loanContract.dataExit,
                },
                contractIndex: loanContractIndex,
                direction: "arrivals",
                loanOriginDirection: "exit",
              });
            }
          }
          return;
        }

        const hasReturnAfter = (p.contract || [])
          .slice(idx + 1)
          .some((nextC, offset) =>
            checkIsLoanReturnArrival(
              p,
              nextC,
              idx + 1 + offset,
              career,
              season.seasonNumber,
            ),
          );

        if (
          !hasReturnAfter &&
          hasOutgoingLoanEnded(p, c, idx, career, season.seasonNumber)
        ) {
          const dedupeKey = `${p.id}_${idx}`;
          const isLoanCurrentSeason = isContractCurrentSeason(c, "exit");
          const hasPendingLoanContent =
            hasDefinedLoanBuyOption(c) || hasTransferActiveClauses(c);

          if (
            (isLoanCurrentSeason || hasPendingLoanContent) &&
            !emittedOutgoingLoanReturnKeys.has(dedupeKey)
          ) {
            emittedOutgoingLoanReturnKeys.add(dedupeKey);
            list.push({
              player: p,
              contract: c,
              contractIndex: idx,
              direction: "arrivals",
              loanOriginDirection: "exit",
            });
          }
          return;
        }

        if (
          !isContractedArrivalTransfer(p, c, idx, career, season.seasonNumber)
        ) {
          return;
        }

        const isNextSeasonAgreement = isNextSeasonTiming(c.timing);
        const isNextWindowAgreement = isNextWindowTiming(c.timing);
        const hasClauses = hasArrivalActiveClauses(c);
        const isIncomingLoan = Boolean(
          (c.isLoan || p.incomingLoan) && !c.fromLoanBuyOption,
        );

        // Um card de chegada só é exibido se tiver algo a ser feito:
        // 1. Cláusulas pendentes (parcelas a pagar, bônus a pagar, opção de compra, reajuste salarial pendente)
        // 2. Empréstimo ativo recebido
        // 3. Acordo agendado futuro pendente (isNextSeason ou isNextWindow ainda não concretizado)
        const hasPendingAction =
          hasClauses ||
          isIncomingLoan ||
          isNextSeasonAgreement ||
          (isNextWindowAgreement && !p.buy);

        const isCurrentSeason = isContractCurrentSeason(c, "arrivals");

        // Se tem pendências ativas: sempre exibe.
        // Se pertence à temporada atual: exibe contratações da temporada vigente (para gerenciar/editar ou adicionar cláusulas).
        // Se pertence a temporada passada e não tem pendências: NÃO exibe!
        const shouldInclude = hasPendingAction || isCurrentSeason;

        if (shouldInclude) {
          list.push({
            player: p,
            contract: c,
            contractIndex: idx,
            direction: "arrivals",
          });
        }
      });
    });
    return list;
  }, [
    career,
    season.players,
    season.seasonNumber,
    isContractCurrentSeason,
    localVersion,
  ]);

  const renewalTransfers = useMemo(() => {
    void localVersion;
    const list: TransferItem[] = [];
    (season.players || []).forEach((p) => {
      (p.contract || []).forEach((c, idx) => {
        if (c.isRenewal || c.contractDetails?.isRenewal) {
          const cardKey = `${p.id}_${idx}_renewals`;
          if (deletedRenewalKeys.has(cardKey)) return;

          const hasPendingClauses = hasRenewalActiveClauses(c);
          const isCurrentSeason = isContractCurrentSeason(c, "arrivals");

          // Verifica se houve algum bônus pago especificamente nesta temporada
          const hasBonusPaidThisSeason = (c.bonuses || []).some(
            (b) =>
              (b.status === "paid" || b.paid) &&
              (b.paidSeasonId === season.id ||
                b.paidSeasonNumber === season.seasonNumber),
          );

          // Uma renovação entra na aba se:
          // 1. Tem bônus ou reajuste pendente a ser gerenciado
          // 2. OU foi renovado na temporada atual
          // 3. OU teve bônus quitado nesta temporada (para compor a projeção da temporada)
          if (hasPendingClauses || isCurrentSeason || hasBonusPaidThisSeason) {
            list.push({
              player: p,
              contract: c,
              contractIndex: idx,
              direction: "renewals",
            });
          }
        }
      });
    });
    return list;
  }, [
    season.players,
    season.id,
    season.seasonNumber,
    localVersion,
    deletedRenewalKeys,
    isContractCurrentSeason,
  ]);

  const activeProposals = useMemo(() => {
    return proposals.filter(
      (p) =>
        p.overallStatus !== "concluida" &&
        p.overallStatus !== "cancelada" &&
        p.overallStatus !== "rejeitada",
    );
  }, [proposals]);

  const arrivalProposals = useMemo(
    () =>
      activeProposals.filter(
        (p) => p.type === "compra" || p.type === "emprestimo_entrada",
      ),
    [activeProposals],
  );

  const exitProposals = useMemo(
    () =>
      activeProposals.filter(
        (p) => p.type === "venda" || p.type === "emprestimo_saida",
      ),
    [activeProposals],
  );

  const renewalProposals = useMemo(
    () => activeProposals.filter((p) => p.type === "renovacao"),
    [activeProposals],
  );

  const currentProposals =
    activeTab === "arrivals"
      ? arrivalProposals
      : activeTab === "renewals"
        ? renewalProposals
        : exitProposals;

  const currentList =
    activeTab === "arrivals"
      ? arrivalTransfers
      : activeTab === "renewals"
        ? renewalTransfers
        : exitTransfers;

  const allTransfers = useMemo(
    () => [...exitTransfers, ...arrivalTransfers, ...renewalTransfers],
    [exitTransfers, arrivalTransfers, renewalTransfers],
  );

  const playerSearchOptions = useMemo(() => {
    const transferNames = currentList.map((item) => item.player.name);
    const proposalNames = currentProposals.map((p) => p.playerName);
    return Array.from(new Set([...transferNames, ...proposalNames])).filter(
      Boolean,
    );
  }, [currentList, currentProposals]);

  const handlePlayerSearchChange = (event: {
    target: { name: string; value: string };
  }) => {
    const selectedName = event.target.value;
    setSearchPlayerQuery(selectedName);

    const matchTransfer = currentList.find(
      (item) =>
        item.player.name.trim().toLowerCase() ===
        selectedName.trim().toLowerCase(),
    );

    if (matchTransfer) {
      const cardKey = `${matchTransfer.player.id}_${matchTransfer.contractIndex}_${matchTransfer.direction}`;
      const element = document.getElementById(`transfer-card-${cardKey}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        if (onHighlightCard) {
          onHighlightCard(cardKey);
        }
      }
      return;
    }

    const matchProposal = currentProposals.find(
      (p) =>
        p.playerName.trim().toLowerCase() === selectedName.trim().toLowerCase(),
    );

    if (matchProposal) {
      const element = document.getElementById(
        `proposal-card-${matchProposal.id}`,
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        if (onHighlightCard) {
          onHighlightCard(matchProposal.id);
        }
      }
    }
  };

  // Seleção automática ao entrar com selectedPlayerName ou selectedProposalId
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!selectedPlayerName && !selectedProposalId) return;

    if (selectedPlayerName && !searchPlayerQuery) {
      setSearchPlayerQuery(selectedPlayerName);
    }

    if (hasScrolledRef.current) return;

    const findAndScroll = () => {
      let targetEl: HTMLElement | null = null;
      let targetKey: string | null = null;

      if (selectedProposalId) {
        targetEl = document.getElementById(
          `proposal-card-${selectedProposalId}`,
        );
        targetKey = selectedProposalId;
      }

      if (!targetEl && selectedPlayerName) {
        const matchProposal = currentProposals.find(
          (p) =>
            p.playerName.trim().toLowerCase() ===
            selectedPlayerName.trim().toLowerCase(),
        );
        if (matchProposal) {
          targetEl = document.getElementById(
            `proposal-card-${matchProposal.id}`,
          );
          targetKey = matchProposal.id;
        } else {
          const matchTransfer = currentList.find(
            (t) =>
              t.player.name.trim().toLowerCase() ===
              selectedPlayerName.trim().toLowerCase(),
          );
          if (matchTransfer) {
            targetKey = `${matchTransfer.player.id}_${matchTransfer.contractIndex}_${matchTransfer.direction}`;
            targetEl = document.getElementById(`transfer-card-${targetKey}`);
          }
        }
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        if (onHighlightCard && targetKey) {
          onHighlightCard(targetKey);
        }
        hasScrolledRef.current = true;
        return true;
      }
      return false;
    };

    if (!findAndScroll()) {
      const timer = setTimeout(findAndScroll, 350);
      return () => clearTimeout(timer);
    }
  }, [
    selectedPlayerName,
    selectedProposalId,
    currentProposals,
    currentList,
    onHighlightCard,
    searchPlayerQuery,
  ]);

  return {
    activeTab,
    setActiveTab,
    localVersion,
    setLocalVersion,
    deletedRenewalKeys,
    setDeletedRenewalKeys,
    searchPlayerQuery,
    setSearchPlayerQuery,
    seasonRange,
    exitTransfers,
    arrivalTransfers,
    renewalTransfers,
    currentList,
    allTransfers,
    proposals,
    setProposals,
    activeProposals,
    arrivalProposals,
    exitProposals,
    renewalProposals,
    currentProposals,
    playerSearchOptions,
    handlePlayerSearchChange,
    pendingDraft,
    setPendingDraft,
    handleResumeDraft,
    handleCancelDraft,
  };
};

export default useManageClausesTransfers;
