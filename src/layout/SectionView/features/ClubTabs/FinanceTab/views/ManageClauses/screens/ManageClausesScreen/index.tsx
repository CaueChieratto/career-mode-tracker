import React, { useState, useRef, useEffect } from "react";
import type { Swiper as SwiperInstance } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Navbar from "../../../../../../../../../ui/Navbar";
import SearchableSelect from "../../../../../../../../../components/SearchableSelect";
import Load from "../../../../../../../../../components/Load";
import Modal from "../../../../../../../../../components/Modal";
import DeleteConfirmModal from "../../../../../../../../../ui/modals/DeleteConfirmModal";
import { useManageClausesContext } from "../../contexts/context";
import { TransferClauseCard } from "../../components/TransferClauseCard";
import { ClauseDedicatedEditView } from "../../components/ClauseDedicatedEditView";
import { ClauseDedicatedManageView } from "../../components/ClauseDedicatedManageView";
import { ClauseCardsTabSlide } from "../../components/ClauseCardsTabSlide";
import { ProposalConfirmationModal } from "../../../../../../../../../ui/modals/ProposalConfirmationModal";
import { ProposalFinalizationService } from "../../../../../../../../../common/services/ServiceProposals/proposalFinalizationService";
import { ServiceProposals } from "../../../../../../../../../common/services/ServiceProposals";
import { toast } from "../../../../../../../../../common/services/ToastService";
import { useToast } from "../../../../../../../../../common/hooks/UseToast";
import { TransferProposal } from "../../../../../../../../../common/interfaces/proposals/transferProposal";
import Styles from "../../ManageClauses.module.css";

export const ManageClausesScreen: React.FC = () => {
  const {
    career,
    season,
    onClose,
    readOnly,
    clubColor,
    isLoading,
    activeTab,
    setActiveTab,
    renewalTransfers,
    arrivalTransfers,
    exitTransfers,
    activeInline,
    activeTransferItem,
    cancelInline,
    setSearchPlayerQuery,
    playerSearchOptions,
    searchPlayerQuery,
    handlePlayerSearchChange,
    highlightedCardKey,
    getClubBadgeUrl,
    startEditCard,
    startEditCardWithScope,
    startManageCard,
    handleDeleteRenewal,
    onOpenScreen,
    handleCancelDraft,
    renewalProposals,
    arrivalProposals,
    exitProposals,
    setProposals,
    setLocalVersion,
    resetScrollState,
  } = useManageClausesContext();

  const { confirm } = useToast();
  const [isDiscardDraftModalOpen, setIsDiscardDraftModalOpen] = useState(false);
  const [proposalToFinalize, setProposalToFinalize] =
    useState<TransferProposal | null>(null);
  const [isFinalizingProposal, setIsFinalizingProposal] = useState(false);

  const handleEditProposalPlayer = (proposal: TransferProposal) => {
    if (!onOpenScreen) return;
    onOpenScreen({
      key: "proposalPlayerTerms",
      proposalId: proposal.id,
      seasonId: season.id,
    });
  };

  const handleDeleteProposal = async (proposal: TransferProposal) => {
    const isConfirmed = await confirm(
      "Deseja realmente excluir esta proposta?",
    );
    if (!isConfirmed) return;

    try {
      await ServiceProposals.deleteProposal(career.id, season.id, proposal.id);
      setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      setLocalVersion((v) => v + 1);

      if (proposal.originLoanBuyOption && proposal.playerId) {
        const playerInSeason = season.players?.find(
          (p) => p.id === proposal.playerId,
        );
        const loanContract = playerInSeason?.contract?.find(
          (c) => c.isLoan && c.loanTerms,
        );
        if (loanContract?.loanTerms) {
          loanContract.loanTerms.buyOptionExercised = false;
          loanContract.loanTerms.buyOptionFinalized = false;
          loanContract.buyOptionFinalized = false;
          delete loanContract.loanTerms.exercisedDate;
        }
      }

      toast.success("Proposta excluída com sucesso.");
    } catch (err) {
      console.error("Erro ao excluir proposta:", err);
      toast.error("Erro ao excluir proposta.");
    }
  };

  const handleConfirmFinalize = async (proposal: TransferProposal) => {
    setIsFinalizingProposal(true);
    try {
      if (proposal.playerNegotiation) {
        await ServiceProposals.updateProposal(
          career.id,
          season.id,
          proposal.id,
          {
            agreementDate: proposal.agreementDate,
            playerNegotiation: proposal.playerNegotiation,
          },
        );
      }
      await ProposalFinalizationService.finalizeProposal({
        careerId: career.id,
        seasonId: season.id,
        proposalId: proposal.id,
        agreementDate: proposal.agreementDate,
      });

      if (proposal.originLoanBuyOption && proposal.playerId) {
        const playerInSeason = season.players?.find(
          (p) => p.id === proposal.playerId,
        );
        if (playerInSeason?.contract) {
          playerInSeason.contract.forEach((c) => {
            if (c.isLoan) {
              c.buyOptionFinalized = true;
              if (c.loanTerms) {
                c.loanTerms.buyOptionExercised = true;
                c.loanTerms.buyOptionFinalized = true;
              }
            }
          });
        }
        if (playerInSeason) {
          playerInSeason.incomingLoan = false;
          playerInSeason.buy = true;
        }
      }
      setLocalVersion((v) => v + 1);
      setProposalToFinalize(null);
    } catch (err) {
      console.error("Erro ao finalizar proposta:", err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao finalizar proposta.",
      );
    } finally {
      setIsFinalizingProposal(false);
    }
  };

  const swiperRef = useRef<SwiperInstance | null>(null);
  const activeIndex =
    activeTab === "renewals" ? 0 : activeTab === "arrivals" ? 1 : 2;

  const contextKey = `${career.id}-${season.id}`;

  const [visitedState, setVisitedState] = useState<{
    contextKey: string;
    visited: Record<string, boolean>;
  }>(() => ({
    contextKey,
    visited: { [activeTab]: true },
  }));

  let currentVisited = visitedState.visited;
  if (visitedState.contextKey !== contextKey) {
    currentVisited = { [activeTab]: true };
    setVisitedState({
      contextKey,
      visited: currentVisited,
    });
  }

  useEffect(() => {
    if (!currentVisited[activeTab]) {
      setVisitedState((prev) => ({
        ...prev,
        visited: { ...prev.visited, [activeTab]: true },
      }));
    }
  }, [activeTab, currentVisited]);

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== activeIndex) {
      swiperRef.current.slideTo(activeIndex);
    }
  }, [activeIndex]);

  const handleTabChange = (index: number) => {
    cancelInline({ restoreScroll: false });
    resetScrollState?.();
    setSearchPlayerQuery("");
    const targetTab =
      index === 0 ? "renewals" : index === 1 ? "arrivals" : "exit";
    setActiveTab(targetTab);
    swiperRef.current?.slideTo(index);
  };

  const handleSlideChange = (swiper: SwiperInstance) => {
    const index = swiper.activeIndex;
    const targetTab =
      index === 0 ? "renewals" : index === 1 ? "arrivals" : "exit";
    if (activeTab !== targetTab) {
      cancelInline({ restoreScroll: false });
      resetScrollState?.({ scrollToTop: false });
      setSearchPlayerQuery("");
      setActiveTab(targetTab);
    }
  };

  // Tela dedicada de Edição (Cláusulas do Clube ou Termos do Atleta)
  if (activeInline && activeTransferItem && activeInline.mode === "edit") {
    return <ClauseDedicatedEditView />;
  }

  // Tela dedicada de Gerenciamento Operacional
  if (activeInline && activeTransferItem && activeInline.mode === "manage") {
    return <ClauseDedicatedManageView />;
  }

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        titleText="Cláusulas Contratuais"
        backSeasons={activeInline ? cancelInline : onClose}
      />
      <Navbar
        options={[
          `Renovações (${renewalTransfers.length})`,
          `Chegadas (${arrivalTransfers.length})`,
          `Saídas (${exitTransfers.length})`,
        ]}
        activeOption={
          activeTab === "renewals" ? 0 : activeTab === "arrivals" ? 1 : 2
        }
        onOptionClick={handleTabChange}
      />

      {activeInline &&
      activeTransferItem &&
      activeInline.mode === "chooseScope" ? (
        <div className={Styles.hubContainer} id="mainClauseHubContainer">
          <TransferClauseCard
            item={activeTransferItem}
            isDetailView={true}
            isChooseScopeView={true}
            career={career}
            season={season}
            clubColor={clubColor}
            readOnly={readOnly}
            activeInline={activeInline}
            highlightedCardKey={highlightedCardKey}
            getClubBadgeUrl={getClubBadgeUrl}
            startEditCard={startEditCard}
            startManageCard={startManageCard}
            onSelectClubClauses={(item) =>
              startEditCardWithScope(item, "club", true)
            }
            onSelectPlayerTerms={(item) =>
              startEditCardWithScope(item, "player", true)
            }
            cancelInline={cancelInline}
            handleDeleteRenewal={handleDeleteRenewal}
            handleRevertTransfer={() => {}}
            onOpenScreen={onOpenScreen}
          />
        </div>
      ) : (
        <>
          <div className={Styles.searchContainer}>
            <SearchableSelect
              name="quickPlayerSearch"
              placeholder={
                activeTab === "arrivals"
                  ? "Pesquisar jogador em chegadas..."
                  : activeTab === "exit"
                    ? "Pesquisar jogador em saídas..."
                    : "Pesquisar jogador em renovações..."
              }
              options={playerSearchOptions}
              value={searchPlayerQuery}
              onChange={handlePlayerSearchChange}
              useAlternateStyle
            />
          </div>
          <Swiper
            initialSlide={activeIndex}
            onSwiper={(swiper: SwiperInstance) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={handleSlideChange}
          >
            <SwiperSlide key="renewals">
              <ClauseCardsTabSlide
                tabKey="renewals"
                isVisited={!!currentVisited["renewals"] || activeIndex === 0}
                transfers={renewalTransfers}
                proposals={renewalProposals}
                emptyMessage="Nenhuma renovação registrada nesta temporada."
                onEditProposalPlayer={handleEditProposalPlayer}
                onFinalizeProposal={(p) => setProposalToFinalize(p)}
                onDeleteProposal={handleDeleteProposal}
                onOpenDiscardDraftModal={() => setIsDiscardDraftModalOpen(true)}
              />
            </SwiperSlide>

            <SwiperSlide key="arrivals">
              <ClauseCardsTabSlide
                tabKey="arrivals"
                isVisited={!!currentVisited["arrivals"] || activeIndex === 1}
                transfers={arrivalTransfers}
                proposals={arrivalProposals}
                emptyMessage="Nenhuma transferência de chegada registrada nesta temporada."
                onEditProposalPlayer={handleEditProposalPlayer}
                onFinalizeProposal={(p) => setProposalToFinalize(p)}
                onDeleteProposal={handleDeleteProposal}
                onOpenDiscardDraftModal={() => setIsDiscardDraftModalOpen(true)}
              />
            </SwiperSlide>

            <SwiperSlide key="exit">
              <ClauseCardsTabSlide
                tabKey="exit"
                isVisited={!!currentVisited["exit"] || activeIndex === 2}
                transfers={exitTransfers}
                proposals={exitProposals}
                emptyMessage="Nenhuma transferência de saída registrada nesta temporada."
                onEditProposalPlayer={handleEditProposalPlayer}
                onFinalizeProposal={(p) => setProposalToFinalize(p)}
                onDeleteProposal={handleDeleteProposal}
                onOpenDiscardDraftModal={() => setIsDiscardDraftModalOpen(true)}
              />
            </SwiperSlide>
          </Swiper>
        </>
      )}

      {isLoading && <Load isTransfers />}

      <Modal
        isOpen={isDiscardDraftModalOpen}
        closeModal={() => setIsDiscardDraftModalOpen(false)}
        animationContainer="grow"
        text="Descartar transferência pendente?"
        clubColor={clubColor}
      >
        <DeleteConfirmModal
          onConfirm={() => {
            handleCancelDraft();
            setIsDiscardDraftModalOpen(false);
          }}
          closeModal={() => setIsDiscardDraftModalOpen(false)}
        />
      </Modal>

      {proposalToFinalize && (
        <ProposalConfirmationModal
          isOpen={Boolean(proposalToFinalize)}
          proposal={proposalToFinalize}
          career={career}
          season={season}
          onClose={() => setProposalToFinalize(null)}
          onConfirm={handleConfirmFinalize}
          isSubmitting={isFinalizingProposal}
          currency={career.currency}
        />
      )}
    </>
  );
};

export default ManageClausesScreen;
