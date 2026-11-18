import React from "react";
import { FaUndo } from "react-icons/fa";
import { Career } from "../../../../../../../common/interfaces/Career";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { TransferBonus } from "../../../../../../../common/interfaces/playersInfo/transferTerms";
import HeaderSeason from "../../../../../../../components/HeaderSeason";
import Navbar from "../../../../../../../ui/Navbar";
import Load from "../../../../../../../components/Load";
import FormSection, { Field } from "../../../../../../../components/FormSection";
import { ClauseSectionDrawer } from "../../../../../../../components/ClauseSectionDrawer";
import { ModularClausesGrid } from "../../../SquadTab/views/TransferPlayer/components/ModularClausesGrid";
import AddOrEditLeagueButton from "../../../../../../../common/elements/Buttons/AddOrEditLeagueButton";
import { TransferBonusCardList } from "../../../SquadTab/views/TransferPlayer/components/TransferBonusCardList";
import { FormValues } from "../../../SquadTab/views/TransferPlayer/types";
import Styles from "./PlayerTermsEditorView.module.css";

export type PlayerTermsDrawerKey = "contract" | "bonuses" | "special" | null;

export interface PlayerTermsEditorViewProps {
  career: Career;
  player: Players;
  isSaving: boolean;
  clubColor: string;
  formValues: Record<string, string | undefined>;
  bonuses: TransferBonus[];
  editingBonusIndex: number | null;
  activeDrawerKey: PlayerTermsDrawerKey;
  contractSection: { title?: string; rows: readonly (readonly Field[])[] };
  bonusSection: { title?: string; rows: readonly (readonly Field[])[] };
  specialSection: { title?: string; rows: readonly (readonly Field[])[] };
  gridMode?: "renewal" | "transfer";
  gridDirection?: "renewals" | "arrivals";
  isFromLoanBuyOption?: boolean;
  onlyPlayerCards?: boolean;
  titleText?: string;
  saveButtonLabel?: string;
  showRevertWageAdjustment?: boolean;
  onRevertWageAdjustment?: () => void;
  openDrawer: (key: Exclude<PlayerTermsDrawerKey, null>) => void;
  onSaveContractDrawer: () => void;
  onCancelContractDrawer: () => void;
  onSaveBonusDrawer: () => void;
  onCancelBonusDrawer: () => void;
  onSaveSpecialDrawer: () => void;
  onCancelSpecialDrawer: () => void;
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
    field?: Field,
  ) => void;
  handleBooleanChange?: (name: string, value: boolean) => void;
  handleAddOrEditBonus: () => void;
  handleEditBonus: (index: number) => void;
  handleDeleteBonus: (index: number) => void;
  onSave: () => void;
  onBack: () => void;
}

export const PlayerTermsEditorView: React.FC<PlayerTermsEditorViewProps> = ({
  career,
  player,
  isSaving,
  clubColor,
  formValues,
  bonuses,
  editingBonusIndex,
  activeDrawerKey,
  contractSection,
  bonusSection,
  specialSection,
  gridMode = "renewal",
  gridDirection = "renewals",
  isFromLoanBuyOption = false,
  onlyPlayerCards = false,
  titleText = "Termos do Atleta",
  saveButtonLabel = "Salvar Termos",
  showRevertWageAdjustment = false,
  onRevertWageAdjustment,
  openDrawer,
  onSaveContractDrawer,
  onCancelContractDrawer,
  onSaveBonusDrawer,
  onCancelBonusDrawer,
  onSaveSpecialDrawer,
  onCancelSpecialDrawer,
  handleInputChange,
  handleBooleanChange,
  handleAddOrEditBonus,
  handleEditBonus,
  handleDeleteBonus,
  onSave,
  onBack,
}) => {
  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        isPlayer={true}
        player={player}
        titleText={titleText}
        backSeasons={onBack}
      />

      <Navbar
        save={onSave}
        options={["", saveButtonLabel, ""]}
        activeOption={1}
        onOptionClick={(index) => {
          if (index === 1) onSave();
        }}
      />

      <div className={Styles.container} id="mainClauseHubContainer">
        <div className={Styles.gridContainer}>
          <ModularClausesGrid
            mode={gridMode}
            direction={gridDirection}
            isFromLoanBuyOption={isFromLoanBuyOption}
            onlyPlayerCards={onlyPlayerCards}
            formValues={formValues as unknown as FormValues}
            bonuses={bonuses}
            currency={career.currency}
            onOpenContract={() => openDrawer("contract")}
            onOpenBonus={() => openDrawer("bonuses")}
            onOpenOtherClauses={() => openDrawer("special")}
            onOpenPlayerBonus={() => openDrawer("bonuses")}
            onOpenPlayerOtherClauses={() => openDrawer("special")}
          />
        </div>
      </div>

      {/* Drawer: Informações do Contrato */}
      <ClauseSectionDrawer
        isOpen={activeDrawerKey === "contract"}
        onClose={onCancelContractDrawer}
        title="Informações do Contrato"
        saveLabel="Concluir"
        onSave={onSaveContractDrawer}
        cancelLabel="Fechar"
        onCancel={onCancelContractDrawer}
        isSaving={isSaving}
      >
        <div className={Styles.drawerContent}>
          <FormSection
            rows={contractSection.rows}
            formValues={formValues as Record<string, string>}
            onInputChange={handleInputChange}
            onBooleanChange={handleBooleanChange}
            hideTitle
          />
          {showRevertWageAdjustment && onRevertWageAdjustment && (
            <div className={Styles.drawerActionButtonWrapper}>
              <button
                type="button"
                className={Styles.btnRevertWageAdjustment}
                onClick={onRevertWageAdjustment}
                disabled={isSaving}
                data-testid="btn-drawer-revert-wage-adjustment"
              >
                <FaUndo /> Reverter Ajuste Salarial Automático
              </button>
            </div>
          )}
        </div>
      </ClauseSectionDrawer>

      {/* Drawer: Bônus & Metas */}
      <ClauseSectionDrawer
        isOpen={activeDrawerKey === "bonuses"}
        onClose={onCancelBonusDrawer}
        title="Bônus & Metas"
        saveLabel="Concluir"
        onSave={onSaveBonusDrawer}
        cancelLabel="Fechar"
        onCancel={onCancelBonusDrawer}
        isSaving={isSaving}
      >
        <div className={Styles.drawerContent}>
          <FormSection
            rows={bonusSection.rows}
            formValues={formValues as Record<string, string>}
            onInputChange={handleInputChange}
            onBooleanChange={handleBooleanChange}
            hideTitle
          />
          <AddOrEditLeagueButton
            isEditing={editingBonusIndex !== null}
            onClick={handleAddOrEditBonus}
            addLabel="Salvar Bônus"
          />
          <TransferBonusCardList
            bonuses={bonuses}
            clubColor={clubColor}
            currency={career.currency}
            editingIndex={editingBonusIndex}
            onEditBonus={handleEditBonus}
            onDeleteBonus={handleDeleteBonus}
          />
        </div>
      </ClauseSectionDrawer>

      {/* Drawer: Cláusulas Especiais */}
      <ClauseSectionDrawer
        isOpen={activeDrawerKey === "special"}
        onClose={onCancelSpecialDrawer}
        title="Cláusulas Especiais"
        saveLabel="Concluir"
        onSave={onSaveSpecialDrawer}
        cancelLabel="Fechar"
        onCancel={onCancelSpecialDrawer}
        isSaving={isSaving}
      >
        <div className={Styles.drawerContent}>
          <FormSection
            isMatch
            rows={specialSection.rows}
            formValues={formValues as Record<string, string>}
            onInputChange={handleInputChange}
            onBooleanChange={handleBooleanChange}
            hideTitle
          />
        </div>
      </ClauseSectionDrawer>

      {isSaving && <Load isTransfers />}
    </>
  );
};

export default PlayerTermsEditorView;
