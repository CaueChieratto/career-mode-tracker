import React from "react";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Navbar from "../../../../../../../../../ui/Navbar";
import Load from "../../../../../../../../../components/Load";
import { useManageClausesContext } from "../../contexts/context";
import { ClauseOperationalManageView } from "../ClauseOperationalManageView";
import Styles from "../../ManageClauses.module.css";

export const ClauseDedicatedManageView: React.FC = () => {
  const {
    career,
    readOnly,
    isLoading,
    activeTransferItem,
    cancelInline,
    sellOnActiveCardKey,
    setSellOnActiveCardKey,
    sellOnTotalInput,
    setSellOnTotalInput,
    sellOnDateInput,
    setSellOnDateInput,
    loanBuyOptionDateInput,
    setLoanBuyOptionDateInput,
    handleApplyWageAdjustment,
    handleSettleInstallment,
    handleUnsettleInstallment,
    handleSettleBonus,
    handleExerciseBuyback,
    handleExerciseFirstRefusal,
    handleTriggerReleaseClause,
    handleConfirmSellOn,
    handleExerciseLoanBuyOption,
    handleExerciseArrivalLoanBuyOption,
    currentProposals,
    onOpenScreen,
    activeSectionDrawer,
    setActiveSectionDrawer,
  } = useManageClausesContext();

  if (!activeTransferItem) {
    return null;
  }

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        isPlayer={true}
        player={activeTransferItem.player}
        titleText="Gerenciar Cláusulas"
        backSeasons={cancelInline}
      />

      <Navbar
        save={() => {}}
        options={["", "Gerenciar Cláusulas", ""]}
        activeOption={1}
        onOptionClick={() => {}}
      />

      <div
        className={Styles.dedicatedScreenContainer}
        id="mainClauseHubContainer"
      >
        <ClauseOperationalManageView
          career={career}
          activeTransferItem={activeTransferItem}
          isLoading={isLoading}
          cancelInline={cancelInline}
          sellOnActiveCardKey={sellOnActiveCardKey}
          setSellOnActiveCardKey={setSellOnActiveCardKey}
          sellOnTotalInput={sellOnTotalInput}
          setSellOnTotalInput={setSellOnTotalInput}
          sellOnDateInput={sellOnDateInput}
          setSellOnDateInput={setSellOnDateInput}
          loanBuyOptionDateInput={loanBuyOptionDateInput}
          setLoanBuyOptionDateInput={setLoanBuyOptionDateInput}
          handleApplyWageAdjustment={handleApplyWageAdjustment}
          handleSettleInstallment={handleSettleInstallment}
          handleUnsettleInstallment={handleUnsettleInstallment}
          handleSettleBonus={handleSettleBonus}
          handleExerciseBuyback={async (item) => handleExerciseBuyback(item)}
          handleExerciseFirstRefusal={async (item) =>
            handleExerciseFirstRefusal(item)
          }
          handleTriggerReleaseClause={async (item) =>
            handleTriggerReleaseClause(item)
          }
          handleConfirmSellOn={handleConfirmSellOn}
          handleExerciseLoanBuyOption={handleExerciseLoanBuyOption}
          handleExerciseArrivalLoanBuyOption={handleExerciseArrivalLoanBuyOption}
          proposals={currentProposals}
          readOnly={readOnly}
          onOpenScreen={onOpenScreen}
          activeSectionDrawer={activeSectionDrawer}
          setActiveSectionDrawer={setActiveSectionDrawer}
        />
      </div>

      {isLoading && <Load isTransfers />}
    </>
  );
};

export default ClauseDedicatedManageView;
