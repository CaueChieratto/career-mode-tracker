import React, { useMemo } from "react";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import Load from "../../../../../../../../../components/Load";
import { buildSaleClausesSections } from "../../../../../SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import { mergeFormValues } from "../../../../../../../../../common/hooks/UseForm";
import { useProposalClubClausesContext } from "../../contexts/context";
import { ClubClausesEditorView } from "../../../../components/ClubClausesEditorView";

export const ProposalClubClausesScreen: React.FC = () => {
  const {
    career,
    season,
    proposal,
    isLoading,
    isSaving,
    clubColor,
    formValues,
    booleanValues,
    bonuses,
    editingBonusIndex,
    activeDrawerKey,
    openDrawer,
    commitDrawer,
    cancelDrawer,
    handleInputChange,
    handleBooleanChange,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
    handleSaveClubClauses,
    onClose,
  } = useProposalClubClausesContext();

  const isExit =
    proposal?.type === "venda" || proposal?.type === "emprestimo_saida";

  const clubPlayerOptions = useMemo(() => {
    return (season.players || [])
      .filter((p) => !p.sell && !p.incomingLoan)
      .map((p) => p.name);
  }, [season.players]);

  const mergedFormValues = useMemo(
    () =>
      mergeFormValues(
        formValues,
        booleanValues as unknown as Record<string, boolean>,
      ),
    [formValues, booleanValues],
  );

  const clausesSections = useMemo(
    () =>
      buildSaleClausesSections(
        booleanValues,
        mergedFormValues,
        career.customBonusObjectives,
        bonuses,
        editingBonusIndex,
        !isExit,
        clubPlayerOptions,
        true,
        career.nation,
      ),
    [
      booleanValues,
      mergedFormValues,
      career.customBonusObjectives,
      bonuses,
      editingBonusIndex,
      isExit,
      clubPlayerOptions,
      career.nation,
    ],
  );

  if (isLoading || !proposal) {
    return <Load isTransfers />;
  }

  const playerAdapter: Partial<Players> = {
    name: proposal.playerName,
    shirtNumber: proposal.shirtNumber,
  };

  return (
    <ClubClausesEditorView
      career={career}
      player={playerAdapter as Players}
      isExit={isExit}
      isSaving={isSaving}
      clubColor={clubColor}
      formValues={formValues}
      mergedFormValues={mergedFormValues}
      booleanValues={booleanValues}
      bonuses={bonuses}
      editingBonusIndex={editingBonusIndex}
      activeDrawerKey={activeDrawerKey}
      clausesSections={clausesSections}
      openDrawer={openDrawer}
      commitDrawer={commitDrawer}
      cancelDrawer={cancelDrawer}
      handleInputChange={handleInputChange}
      handleBooleanChange={handleBooleanChange}
      handleAddOrEditBonus={handleAddOrEditBonus}
      handleEditBonus={handleEditBonus}
      handleDeleteBonus={handleDeleteBonus}
      onSave={handleSaveClubClauses}
      onBack={onClose}
    />
  );
};

export default ProposalClubClausesScreen;
