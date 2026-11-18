import React from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { TransferItem, DrawerSection } from "../../types";
import {
  BooleanValues,
  FormValues,
} from "../../../../../SquadTab/views/TransferPlayer/types";
import { TransferBonus } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { ModularClausesGrid } from "../../../../../SquadTab/views/TransferPlayer/components/ModularClausesGrid";
import { ClauseSectionDrawer } from "../../../../../../../../../components/ClauseSectionDrawer";
import FormSection, { Field } from "../../../../../../../../../components/FormSection";
import AddOrEditLeagueButton from "../../../../../../../../../common/elements/Buttons/AddOrEditLeagueButton";
import TransferBonusCardList from "../../../../../SquadTab/views/TransferPlayer/components/TransferBonusCardList";
import { buildSaleClausesSections } from "../../../../../SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import { FaUndo } from "react-icons/fa";
import Styles from "../../ManageClauses.module.css";

export interface ClauseInlineEditViewProps {
  career: Career;
  activeTransferItem: TransferItem;
  editingBooleans: BooleanValues;
  editingValues: FormValues;
  editingBonuses: TransferBonus[];
  editingBonusItemIndex: number | null;
  activeSectionDrawer: DrawerSection;
  isLoading: boolean;
  clubColor: string;
  mergedFormValues: FormValues;
  renewalContractSection: { title?: string; rows: readonly (readonly Field[])[] };
  clausesSections: ReturnType<typeof buildSaleClausesSections>;
  renewalBonusSection: { title?: string; rows: readonly (readonly Field[])[] };
  renewalSpecialClausesSection: { title?: string; rows: readonly (readonly Field[])[] };
  handleOpenSectionDrawer: (
    drawer:
      | "contract"
      | "installments"
      | "swap"
      | "bonus"
      | "other"
      | "playerBonus"
      | "playerOther"
      | "loanBuyOption",
  ) => void;
  handleCancelSectionDrawer: () => void;
  handleSaveInline: (item: TransferItem) => Promise<void>;
  cancelInline: () => void;
  handleCustomInputChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: { id: string },
  ) => void;
  handleBooleanChangeWrapper: (name: string, value: boolean) => void;
  handleAddOrEditBonus: () => void;
  handleEditBonus: (index: number) => void;
  handleDeleteBonus: (index: number) => void;
  handleRevertWageAdjustmentInDrawer?: (item: TransferItem) => Promise<void> | void;
}

export const ClauseInlineEditView: React.FC<ClauseInlineEditViewProps> = ({
  career,
  activeTransferItem,
  editingBooleans,
  editingValues,
  editingBonuses,
  editingBonusItemIndex,
  activeSectionDrawer,
  isLoading,
  clubColor,
  mergedFormValues,
  renewalContractSection,
  clausesSections,
  renewalBonusSection,
  renewalSpecialClausesSection,
  handleOpenSectionDrawer,
  handleCancelSectionDrawer,
  handleSaveInline,
  cancelInline,
  handleCustomInputChange,
  handleBooleanChangeWrapper,
  handleAddOrEditBonus,
  handleEditBonus,
  handleDeleteBonus,
  handleRevertWageAdjustmentInDrawer = () => Promise.resolve(),
}) => {
  const isArrivals = activeTransferItem.direction === "arrivals";
  const isRenewals = activeTransferItem.direction === "renewals";
  const isFromLoanBuyOption = Boolean(
    activeTransferItem.contract.fromLoanBuyOption ||
      (!activeTransferItem.contract.isLoan &&
        activeTransferItem.direction === "arrivals" &&
        activeTransferItem.player.contract?.some(
          (c) =>
            c.isLoan &&
            (c.loanTerms?.buyOptionExercised ||
              c.loanTerms?.hasBuyOption ||
              Boolean(c.buyOptionValue)),
        )),
  );

  const otherDrawerRows = isRenewals || isFromLoanBuyOption
    ? renewalSpecialClausesSection.rows
    : clausesSections.otherClausesSection.fields;

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

  const clubBonuses = isArrivals
    ? editingBonuses.filter((b) => Boolean(b.partnerClub))
    : editingBonuses;

  const playerBonuses = isArrivals
    ? editingBonuses.filter((b) => !b.partnerClub)
    : editingBonuses;

  const handleEditFilteredBonus = (filteredIdx: number, isClub: boolean) => {
    const list = isClub ? clubBonuses : playerBonuses;
    const target = list[filteredIdx];
    if (!target) return;
    const realIdx = editingBonuses.findIndex((b) => b.id === target.id);
    if (realIdx !== -1) handleEditBonus(realIdx);
  };

  const handleDeleteFilteredBonus = (filteredIdx: number, isClub: boolean) => {
    const list = isClub ? clubBonuses : playerBonuses;
    const target = list[filteredIdx];
    if (!target) return;
    const realIdx = editingBonuses.findIndex((b) => b.id === target.id);
    if (realIdx !== -1) handleDeleteBonus(realIdx);
  };

  const isIncomingSwapArrival =
    activeTransferItem.direction === "arrivals" &&
    Boolean(activeTransferItem.contract.swapPlayer?.isCounterpart);

  return (
    <>
      {/* CENTRO: GRID MODULAR DE CLÁUSULAS */}
      <ModularClausesGrid
        mode={isRenewals ? "renewal" : "transfer"}
        direction={activeTransferItem.direction}
        isFromLoanBuyOption={isFromLoanBuyOption}
        onlyPlayerCards={isIncomingSwapArrival}
        booleanValues={editingBooleans}
        formValues={editingValues}
        bonuses={editingBonuses}
        currency={career.currency}
        onOpenContract={
          isRenewals || isFromLoanBuyOption
            ? () => handleOpenSectionDrawer("contract")
            : undefined
        }
        onOpenInstallments={() => handleOpenSectionDrawer("installments")}
        onOpenPlayerSwap={() => handleOpenSectionDrawer("swap")}
        onOpenBonus={() => handleOpenSectionDrawer("bonus")}
        onOpenOtherClauses={() => handleOpenSectionDrawer("other")}
        onOpenPlayerBonus={
          isArrivals
            ? () => handleOpenSectionDrawer("playerBonus")
            : () => handleOpenSectionDrawer("bonus")
        }
        onOpenPlayerOtherClauses={
          isArrivals
            ? () => handleOpenSectionDrawer("playerOther")
            : () => handleOpenSectionDrawer("other")
        }
        onBackToList={cancelInline}
      />

      {/* GAVETA 0: INFORMAÇÕES DO CONTRATO (RENOVAÇÕES) */}
      <ClauseSectionDrawer
        isOpen={activeSectionDrawer === "contract"}
        onClose={handleCancelSectionDrawer}
        onCancel={handleCancelSectionDrawer}
        onSave={() => handleSaveInline(activeTransferItem)}
        isSaving={isLoading}
        title="Informações do Contrato"
        saveLabel={isArrivals ? "Concluir" : "Salvar"}
        cancelLabel="Cancelar"
        hubContainerId="mainClauseHubContainer"
      >
        <div className={Styles.drawerContent}>
          <FormSection
            title={renewalContractSection.title}
            rows={renewalContractSection.rows}
            formValues={mergedFormValues}
            onInputChange={handleCustomInputChange}
            hideTitle
          />
          {hasWageType && isWageApplied && handleRevertWageAdjustmentInDrawer && (
            <div className={Styles.drawerActionButtonWrapper}>
              <button
                type="button"
                className={Styles.btnRevertWageAdjustment}
                onClick={() =>
                  handleRevertWageAdjustmentInDrawer(activeTransferItem)
                }
                disabled={isLoading}
                data-testid="btn-drawer-revert-wage-adjustment"
              >
                <FaUndo /> Reverter Ajuste Salarial Automático
              </button>
            </div>
          )}
        </div>
      </ClauseSectionDrawer>

      {/* GAVETA 1: PARCELAMENTO (CLUBE) */}
      <ClauseSectionDrawer
        isOpen={activeSectionDrawer === "installments"}
        onClose={handleCancelSectionDrawer}
        onCancel={handleCancelSectionDrawer}
        onSave={() => handleSaveInline(activeTransferItem)}
        isSaving={isLoading}
        title={
          isArrivals
            ? "Parcelamento Financeiro (Clube Vendedor)"
            : "Parcelamento Financeiro"
        }
        saveLabel={isArrivals ? "Concluir" : "Salvar"}
        cancelLabel="Cancelar"
        hubContainerId="mainClauseHubContainer"
      >
        <div className={Styles.drawerContent}>
          <FormSection
            title={clausesSections.installmentsSection.title}
            rows={clausesSections.installmentsSection.fields}
            formValues={mergedFormValues}
            onInputChange={handleCustomInputChange}
            onBooleanChange={handleBooleanChangeWrapper}
            hideTitle
          />
        </div>
      </ClauseSectionDrawer>

      {/* GAVETA 2: ATLETA DE TROCA (CLUBE) */}
      <ClauseSectionDrawer
        isOpen={activeSectionDrawer === "swap"}
        onClose={handleCancelSectionDrawer}
        onCancel={handleCancelSectionDrawer}
        onSave={() => handleSaveInline(activeTransferItem)}
        isSaving={isLoading}
        title={
          isArrivals
            ? "Atleta de Troca (Do seu Clube)"
            : "Atleta Envolvido na Troca"
        }
        saveLabel={isArrivals ? "Concluir" : "Salvar"}
        cancelLabel="Cancelar"
        hubContainerId="mainClauseHubContainer"
      >
        <div className={Styles.drawerContent}>
          <FormSection
            title={clausesSections.playerSwapSection.title}
            rows={clausesSections.playerSwapSection.fields}
            formValues={mergedFormValues}
            onInputChange={handleCustomInputChange}
            onBooleanChange={handleBooleanChangeWrapper}
            hideTitle
          />
          {isArrivals && mergedFormValues.swapPlayerName && (
            <div className={Styles.selectedPlayerInfoCard}>
              <div className={Styles.selectedPlayerDetails}>
                <span className={Styles.selectedPlayerName}>
                  {mergedFormValues.swapPlayerName}
                </span>
                <span className={Styles.selectedPlayerMeta}>
                  {mergedFormValues.swapPlayerPosition || "Posição N/D"}
                  {mergedFormValues.swapPlayerSector
                    ? ` • ${mergedFormValues.swapPlayerSector}`
                    : ""}
                  {mergedFormValues.swapPlayerValue
                    ? ` • Avaliado em ${mergedFormValues.swapPlayerValue}`
                    : ""}
                </span>
              </div>
              <button
                type="button"
                className={Styles.removeSwapButton}
                onClick={() => {
                  handleCustomInputChange(
                    {
                      target: { name: "swapPlayerName", value: "" },
                    } as React.ChangeEvent<HTMLInputElement>,
                    { id: "swapPlayerName" },
                  );
                }}
              >
                Remover Atleta da Troca
              </button>
            </div>
          )}
        </div>
      </ClauseSectionDrawer>

      {/* GAVETA 3: BÔNUS & METAS (CLUBE) */}
      <ClauseSectionDrawer
        isOpen={activeSectionDrawer === "bonus"}
        onClose={handleCancelSectionDrawer}
        onCancel={handleCancelSectionDrawer}
        onSave={() => handleSaveInline(activeTransferItem)}
        isSaving={isLoading}
        title={
          isArrivals && !isFromLoanBuyOption
            ? "Bônus & Metas (Clube Vendedor)"
            : isRenewals || isFromLoanBuyOption
              ? "Bônus & Metas"
              : "Bônus de Conquistas & Metas"
        }
        saveLabel={isArrivals ? "Concluir" : "Salvar"}
        cancelLabel="Cancelar"
        hubContainerId="mainClauseHubContainer"
      >
        <div className={Styles.drawerContent}>
          <FormSection
            title={
              isRenewals || isFromLoanBuyOption
                ? renewalBonusSection.title
                : clausesSections.bonusSection?.title || ""
            }
            rows={
              isRenewals || isFromLoanBuyOption
                ? renewalBonusSection.rows
                : clausesSections.bonusSection?.fields || []
            }
            formValues={mergedFormValues}
            onInputChange={handleCustomInputChange}
            onBooleanChange={handleBooleanChangeWrapper}
            hideTitle
          />
          <AddOrEditLeagueButton
            isEditing={editingBonusItemIndex !== null}
            onClick={handleAddOrEditBonus}
            addLabel="Salvar Bônus"
          />
          <TransferBonusCardList
            bonuses={clubBonuses}
            clubColor={clubColor}
            currency={career.currency}
            editingIndex={editingBonusItemIndex}
            onEditBonus={(filteredIdx) =>
              handleEditFilteredBonus(filteredIdx, true)
            }
            onDeleteBonus={(filteredIdx) =>
              handleDeleteFilteredBonus(filteredIdx, true)
            }
          />
        </div>
      </ClauseSectionDrawer>

      {/* GAVETA 4: OUTROS ACORDOS ESPECIAIS (CLUBE) */}
      <ClauseSectionDrawer
        isOpen={activeSectionDrawer === "other"}
        onClose={handleCancelSectionDrawer}
        onCancel={handleCancelSectionDrawer}
        onSave={() => handleSaveInline(activeTransferItem)}
        isSaving={isLoading}
        title={
          isArrivals && !isFromLoanBuyOption
            ? "Acordos Especiais com o Clube Vendedor"
            : isRenewals || isFromLoanBuyOption
              ? "Cláusulas Especiais"
              : "Outros Acordos Especiais"
        }
        saveLabel={isArrivals ? "Concluir" : "Salvar"}
        cancelLabel="Cancelar"
        hubContainerId="mainClauseHubContainer"
      >
        <div className={Styles.drawerContent}>
          <FormSection
            title={
              isRenewals || isFromLoanBuyOption
                ? renewalSpecialClausesSection.title
                : clausesSections.otherClausesSection?.title || ""
            }
            rows={otherDrawerRows}
            formValues={mergedFormValues}
            onInputChange={handleCustomInputChange}
            onBooleanChange={handleBooleanChangeWrapper}
            hideTitle
          />
        </div>
      </ClauseSectionDrawer>

      {/* GAVETA 5: BÔNUS & METAS (JOGADOR) */}
      <ClauseSectionDrawer
        isOpen={activeSectionDrawer === "playerBonus"}
        onClose={handleCancelSectionDrawer}
        onCancel={handleCancelSectionDrawer}
        onSave={() => handleSaveInline(activeTransferItem)}
        isSaving={isLoading}
        title="Bônus & Metas do Jogador"
        saveLabel={isArrivals ? "Concluir" : "Salvar"}
        cancelLabel="Cancelar"
        hubContainerId="mainClauseHubContainer"
      >
        <div className={Styles.drawerContent}>
          <FormSection
            title={renewalBonusSection.title}
            rows={renewalBonusSection.rows}
            formValues={mergedFormValues}
            onInputChange={handleCustomInputChange}
            onBooleanChange={handleBooleanChangeWrapper}
            hideTitle
          />
          <AddOrEditLeagueButton
            isEditing={editingBonusItemIndex !== null}
            onClick={handleAddOrEditBonus}
            addLabel="Salvar Bônus"
          />
          <TransferBonusCardList
            bonuses={playerBonuses}
            clubColor={clubColor}
            currency={career.currency}
            editingIndex={editingBonusItemIndex}
            onEditBonus={(filteredIdx) =>
              handleEditFilteredBonus(filteredIdx, false)
            }
            onDeleteBonus={(filteredIdx) =>
              handleDeleteFilteredBonus(filteredIdx, false)
            }
          />
        </div>
      </ClauseSectionDrawer>

      {/* GAVETA 6: CLÁUSULAS ESPECIAIS (JOGADOR) */}
      <ClauseSectionDrawer
        isOpen={activeSectionDrawer === "playerOther"}
        onClose={handleCancelSectionDrawer}
        onCancel={handleCancelSectionDrawer}
        onSave={() => handleSaveInline(activeTransferItem)}
        isSaving={isLoading}
        title="Cláusulas Especiais do Jogador"
        saveLabel={isArrivals ? "Concluir" : "Salvar"}
        cancelLabel="Cancelar"
        hubContainerId="mainClauseHubContainer"
      >
        <div className={Styles.drawerContent}>
          <FormSection
            title={renewalSpecialClausesSection.title}
            rows={renewalSpecialClausesSection.rows}
            formValues={mergedFormValues}
            onInputChange={handleCustomInputChange}
            onBooleanChange={handleBooleanChangeWrapper}
            hideTitle
          />
        </div>
      </ClauseSectionDrawer>
    </>
  );
};
