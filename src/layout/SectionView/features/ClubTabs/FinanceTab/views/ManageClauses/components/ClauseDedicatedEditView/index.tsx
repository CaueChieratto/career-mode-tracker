import React from "react";
import { useManageClausesContext } from "../../contexts/context";
import {
  ClubClausesEditorView,
  ClubClausesDrawerKey,
} from "../../../../components/ClubClausesEditorView";
import {
  PlayerTermsEditorView,
  PlayerTermsDrawerKey,
} from "../../../../components/PlayerTermsEditorView";
import { checkIsFromLoanBuyOption } from "../../helpers/clauseEditHelpers";

export const ClauseDedicatedEditView: React.FC = () => {
  const {
    career,
    activeInline,
    activeTransferItem,
    activeProposal,
    isLoading,
    clubColor,
    editingValues,
    editingBooleans,
    editingBonuses,
    editingBonusItemIndex,
    activeSectionDrawer,
    mergedFormValues,
    clausesSections,
    renewalContractSection,
    renewalBonusSection,
    renewalSpecialClausesSection,
    handleOpenSectionDrawer,
    handleCommitSectionDrawer,
    handleCancelSectionDrawer,
    handleCustomInputChange,
    handleBooleanChangeWrapper,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
    handleSaveInline,
    handleBackFromEdit,
    handleRevertWageAdjustmentInDrawer,
  } = useManageClausesContext();

  if (!activeTransferItem || !activeInline || activeInline.mode !== "edit") {
    return null;
  }

  const isPlayerScope = activeInline.scope === "player";

  if (isPlayerScope) {
    const isRenewal = activeTransferItem.direction === "renewals";
    const isFromLoanBuyOption = checkIsFromLoanBuyOption(activeTransferItem);

    const wageAdj =
      activeTransferItem.contract.contractClauses?.wageAdjustment ||
      activeTransferItem.contract.contractDetails?.wageAdjustment;
    const currentWageType =
      mergedFormValues.wageAdjustmentType || wageAdj?.direction || "N/D";
    const hasWageType =
      currentWageType === "Aumentar" || currentWageType === "Diminuir";
    const isWageApplied =
      mergedFormValues.wageAdjustmentStatus === "Aplicado" ||
      (mergedFormValues.wageAdjustmentStatus !== "Pendente" &&
        Boolean(
          wageAdj?.applied ||
            wageAdj?.status === "applied" ||
            wageAdj?.status === "paid",
        ));

    const mappedDrawerKey: PlayerTermsDrawerKey =
      activeSectionDrawer === "contract"
        ? "contract"
        : activeSectionDrawer === "playerBonus" ||
            activeSectionDrawer === "bonus"
          ? "bonuses"
          : activeSectionDrawer === "playerOther" ||
              activeSectionDrawer === "other"
            ? "special"
            : null;

    return (
      <PlayerTermsEditorView
        career={career}
        player={activeTransferItem.player}
        isSaving={isLoading}
        clubColor={clubColor}
        formValues={mergedFormValues}
        bonuses={editingBonuses}
        editingBonusIndex={editingBonusItemIndex}
        activeDrawerKey={mappedDrawerKey}
        contractSection={renewalContractSection}
        bonusSection={renewalBonusSection}
        specialSection={renewalSpecialClausesSection}
        gridMode={isRenewal ? "renewal" : "transfer"}
        gridDirection={isRenewal ? "renewals" : "arrivals"}
        isFromLoanBuyOption={isFromLoanBuyOption}
        onlyPlayerCards={!isRenewal && !isFromLoanBuyOption}
        showRevertWageAdjustment={hasWageType && isWageApplied}
        onRevertWageAdjustment={() =>
          handleRevertWageAdjustmentInDrawer(activeTransferItem)
        }
        openDrawer={(key) => {
          if (key === "contract") handleOpenSectionDrawer("contract");
          else if (key === "bonuses") handleOpenSectionDrawer("playerBonus");
          else if (key === "special") handleOpenSectionDrawer("playerOther");
        }}
        onSaveContractDrawer={() => handleCommitSectionDrawer("contract")}
        onCancelContractDrawer={handleCancelSectionDrawer}
        onSaveBonusDrawer={() => handleCommitSectionDrawer("playerBonus")}
        onCancelBonusDrawer={handleCancelSectionDrawer}
        onSaveSpecialDrawer={() => handleCommitSectionDrawer("playerOther")}
        onCancelSpecialDrawer={handleCancelSectionDrawer}
        handleInputChange={handleCustomInputChange}
        handleBooleanChange={handleBooleanChangeWrapper}
        handleAddOrEditBonus={handleAddOrEditBonus}
        handleEditBonus={handleEditBonus}
        handleDeleteBonus={handleDeleteBonus}
        onSave={() => {
          void handleSaveInline(activeTransferItem);
        }}
        onBack={handleBackFromEdit}
      />
    );
  }

  const isExit = activeProposal
    ? activeProposal.type === "venda" ||
      activeProposal.type === "emprestimo_saida"
    : activeTransferItem.direction === "exit";

  const clubDrawerKey: ClubClausesDrawerKey =
    activeSectionDrawer === "transferDetails" ||
    activeSectionDrawer === "installments" ||
    activeSectionDrawer === "swap" ||
    activeSectionDrawer === "bonus" ||
    activeSectionDrawer === "other"
      ? activeSectionDrawer
      : null;

  return (
    <ClubClausesEditorView
      career={career}
      player={activeTransferItem.player}
      isExit={isExit}
      isSaving={isLoading}
      clubColor={clubColor}
      formValues={editingValues}
      mergedFormValues={mergedFormValues}
      booleanValues={editingBooleans}
      bonuses={editingBonuses}
      editingBonusIndex={editingBonusItemIndex}
      activeDrawerKey={clubDrawerKey}
      clausesSections={clausesSections}
      openDrawer={(key) => handleOpenSectionDrawer(key)}
      commitDrawer={(key) => handleCommitSectionDrawer(key ?? clubDrawerKey)}
      cancelDrawer={handleCancelSectionDrawer}
      handleInputChange={handleCustomInputChange}
      handleBooleanChange={handleBooleanChangeWrapper}
      handleAddOrEditBonus={handleAddOrEditBonus}
      handleEditBonus={handleEditBonus}
      handleDeleteBonus={handleDeleteBonus}
      onSave={() => {
        void handleSaveInline(activeTransferItem);
      }}
      onBack={handleBackFromEdit}
    />
  );
};

export default ClauseDedicatedEditView;
