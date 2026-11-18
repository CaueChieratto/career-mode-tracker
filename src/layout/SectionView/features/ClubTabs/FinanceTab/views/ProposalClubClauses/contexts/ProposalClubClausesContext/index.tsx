import React, { useState, useEffect } from "react";
import { ProposalClubClausesProps } from "../../types";
import { ProposalClubClausesContext } from "../context";
import { TransferProposal } from "../../../../../../../../../common/interfaces/proposals/transferProposal";
import { ServiceProposals } from "../../../../../../../../../common/services/ServiceProposals";
import { useClubColors } from "../../../../../../../../../common/hooks/Colors/UseClubColors";
import { useProposalClubClausesForm } from "../../hooks/useProposalClubClausesForm";
import { useProposalClubClausesActions } from "../../hooks/useProposalClubClausesActions";
import { toast } from "../../../../../../../../../common/services/ToastService";

export const ProposalClubClausesProvider: React.FC<
  React.PropsWithChildren<ProposalClubClausesProps>
> = ({ children, career, season, proposalId, onClose }) => {
  const { clubColor } = useClubColors(career.colorsTeams?.[0] || "#000000");

  const [proposal, setProposal] = useState<TransferProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    ServiceProposals.getProposalById(career.id, season.id, proposalId)
      .then((data: TransferProposal | null) => {
        if (!isMounted) return;
        if (!data) {
          toast.error("Proposta não encontrada.");
          onClose();
          return;
        }
        setProposal(data);
      })
      .catch((err: unknown) => {
        console.error("Erro ao carregar proposta:", err);
        toast.error("Erro ao carregar proposta.");
        onClose();
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [career.id, season.id, proposalId, onClose]);

  const form = useProposalClubClausesForm({
    career,
    season,
    proposal,
  });

  const actions = useProposalClubClausesActions({
    career,
    season,
    proposal,
    formValues: form.formValues,
    booleanValues: form.booleanValues,
    bonuses: form.bonuses,
    setIsSaving,
    onClose,
  });

  const contextValue = {
    career,
    season,
    proposal,
    isLoading,
    isSaving,
    clubColor,
    formValues: form.formValues,
    booleanValues: form.booleanValues,
    bonuses: form.bonuses,
    editingBonusIndex: form.editingBonusIndex,
    activeDrawerKey: form.activeDrawerKey,
    openDrawer: form.openDrawer,
    closeDrawer: form.closeDrawer,
    commitDrawer: form.commitDrawer,
    cancelDrawer: form.cancelDrawer,
    handleInputChange: form.handleInputChange,
    handleBooleanChange: form.handleBooleanChange,
    handleAddOrEditBonus: form.handleAddOrEditBonus,
    handleEditBonus: form.handleEditBonus,
    handleDeleteBonus: form.handleDeleteBonus,
    handleSaveClubClauses: actions.handleSaveClubClauses,
    onClose,
  };

  return (
    <ProposalClubClausesContext.Provider value={contextValue}>
      {children}
    </ProposalClubClausesContext.Provider>
  );
};
