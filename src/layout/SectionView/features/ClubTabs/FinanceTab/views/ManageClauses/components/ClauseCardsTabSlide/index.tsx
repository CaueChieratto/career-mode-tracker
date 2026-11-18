import React from "react";
import { TransferItem } from "../../types";
import { TransferProposal } from "../../../../../../../../../common/interfaces/proposals/transferProposal";
import { PendingTransferDraftCard } from "../PendingTransferDraftCard";
import { ProposalClauseCard } from "../ProposalClauseCard";
import { TransferClauseCard } from "../TransferClauseCard";
import { useManageClausesContext } from "../../contexts/context";
import Styles from "../../ManageClauses.module.css";

export interface ClauseCardsTabSlideProps {
  tabKey: "renewals" | "arrivals" | "exit";
  isVisited: boolean;
  transfers: TransferItem[];
  proposals: TransferProposal[];
  emptyMessage: string;
  onEditProposalPlayer: (proposal: TransferProposal) => void;
  onFinalizeProposal: (proposal: TransferProposal) => void;
  onDeleteProposal: (proposal: TransferProposal) => void;
  onOpenDiscardDraftModal: () => void;
}

export const ClauseCardsTabSlide: React.FC<ClauseCardsTabSlideProps> = ({
  tabKey,
  isVisited,
  transfers,
  proposals,
  emptyMessage,
  onEditProposalPlayer,
  onFinalizeProposal,
  onDeleteProposal,
  onOpenDiscardDraftModal,
}) => {
  const {
    career,
    season,
    clubColor,
    readOnly,
    highlightedCardKey,
    getClubBadgeUrl,
    onOpenScreen,
    startManageProposalLoan,
    activeInline,
    startEditCard,
    startManageCard,
    cancelInline,
    handleDeleteRenewal,
    pendingDraft,
    handleResumeDraft,
  } = useManageClausesContext();

  if (!isVisited) {
    return (
      <div
        className={Styles.container}
        data-testid={`clauses-tab-${tabKey}`}
      />
    );
  }

  return (
    <div className={Styles.container} data-testid={`clauses-tab-${tabKey}`}>
      {tabKey === "arrivals" && pendingDraft && (
        <PendingTransferDraftCard
          draft={pendingDraft}
          currency={career.currency}
          onResume={handleResumeDraft}
          onCancel={onOpenDiscardDraftModal}
        />
      )}

      {proposals.length > 0 && (
        <div
          className={Styles.proposalsList}
          data-testid="manage-clauses-proposals"
        >
          {proposals.map((proposal) => (
            <ProposalClauseCard
              key={proposal.id}
              proposal={proposal}
              career={career}
              season={season}
              clubColor={clubColor}
              isHighlighted={highlightedCardKey === proposal.id}
              getClubBadgeUrl={getClubBadgeUrl}
              onOpenScreen={onOpenScreen}
              onEditClub={() =>
                onOpenScreen?.({
                  key: "proposalClubClauses",
                  proposalId: proposal.id,
                  seasonId: season.id,
                })
              }
              onEditPlayer={() => onEditProposalPlayer(proposal)}
              onFinalize={() => onFinalizeProposal(proposal)}
              onDelete={() => onDeleteProposal(proposal)}
              onManageLoan={() => startManageProposalLoan(proposal)}
            />
          ))}
        </div>
      )}

      {transfers.length === 0 && proposals.length === 0 ? (
        <div className={Styles.emptyState}>{emptyMessage}</div>
      ) : transfers.length > 0 ? (
        <div className={Styles.transfersList}>
          {transfers.map((item) => (
            <TransferClauseCard
              key={`${item.player.id}_${item.contractIndex}_${item.direction}`}
              item={item}
              isDetailView={false}
              career={career}
              season={season}
              clubColor={clubColor}
              readOnly={readOnly}
              activeInline={activeInline}
              highlightedCardKey={highlightedCardKey}
              getClubBadgeUrl={getClubBadgeUrl}
              startEditCard={startEditCard}
              startManageCard={startManageCard}
              cancelInline={cancelInline}
              handleDeleteRenewal={handleDeleteRenewal}
              handleRevertTransfer={() => {}}
              onOpenScreen={onOpenScreen}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ClauseCardsTabSlide;
