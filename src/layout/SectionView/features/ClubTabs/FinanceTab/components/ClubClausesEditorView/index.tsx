import React from "react";
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
import TransferBonusCardList from "../../../SquadTab/views/TransferPlayer/components/TransferBonusCardList";
import { buildSaleClausesSections } from "../../../SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import {
  BooleanValues,
  FormValues,
} from "../../../SquadTab/views/TransferPlayer/types";
import Styles from "./ClubClausesEditorView.module.css";

export type ClubClausesDrawerKey =
  | "transferDetails"
  | "installments"
  | "swap"
  | "bonus"
  | "other"
  | null;

export interface ClubClausesEditorViewProps {
  career: Career;
  player: Players;
  isExit: boolean;
  isSaving: boolean;
  clubColor: string;
  formValues: FormValues;
  mergedFormValues: FormValues;
  booleanValues: BooleanValues;
  bonuses: TransferBonus[];
  editingBonusIndex: number | null;
  activeDrawerKey: ClubClausesDrawerKey;
  clausesSections: ReturnType<typeof buildSaleClausesSections>;
  titleText?: string;
  saveButtonLabel?: string;
  openDrawer: (key: Exclude<ClubClausesDrawerKey, null>) => void;
  commitDrawer: (key?: ClubClausesDrawerKey) => void;
  cancelDrawer: () => void;
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
    field?: Field,
  ) => void;
  handleBooleanChange: (name: string, value: boolean) => void;
  handleAddOrEditBonus: () => void;
  handleEditBonus: (index: number) => void;
  handleDeleteBonus: (index: number) => void;
  onSave: () => void;
  onBack: () => void;
}

export const ClubClausesEditorView: React.FC<ClubClausesEditorViewProps> = ({
  career,
  player,
  isExit,
  isSaving,
  clubColor,
  formValues,
  mergedFormValues,
  booleanValues,
  bonuses,
  editingBonusIndex,
  activeDrawerKey,
  clausesSections,
  titleText = "Cláusulas do Clube",
  saveButtonLabel = "Salvar Cláusulas",
  openDrawer,
  commitDrawer,
  cancelDrawer,
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
            mode="transfer"
            direction={isExit ? "exit" : "arrivals"}
            hidePlayerCards={true}
            booleanValues={booleanValues}
            formValues={mergedFormValues}
            bonuses={bonuses}
            currency={career.currency}
            onOpenTransferDetails={() => openDrawer("transferDetails")}
            onOpenInstallments={() => openDrawer("installments")}
            onOpenPlayerSwap={() => openDrawer("swap")}
            onOpenBonus={() => openDrawer("bonus")}
            onOpenOtherClauses={() => openDrawer("other")}
          />
        </div>
      </div>

      {/* Drawer: Data de Saída / Momento & Taxa de Transferência */}
      <ClauseSectionDrawer
        isOpen={activeDrawerKey === "transferDetails"}
        onClose={cancelDrawer}
        title={
          isExit
            ? "Data de Saída & Taxa de Transferência"
            : "Momento & Taxa de Transferência"
        }
        saveLabel="Concluir"
        onSave={() => commitDrawer("transferDetails")}
        cancelLabel="Fechar"
        onCancel={cancelDrawer}
        isSaving={isSaving}
      >
        <div className={Styles.drawerContent}>
          <FormSection
            rows={clausesSections.transferDetailsSection.fields}
            formValues={mergedFormValues}
            onInputChange={handleInputChange}
            onBooleanChange={handleBooleanChange}
            hideTitle
          />
        </div>
      </ClauseSectionDrawer>

      {/* Drawer: Parcelamento Financeiro */}
      <ClauseSectionDrawer
        isOpen={activeDrawerKey === "installments"}
        onClose={cancelDrawer}
        title={
          isExit
            ? "Parcelamento Financeiro"
            : "Parcelamento Financeiro (Clube Vendedor)"
        }
        saveLabel="Concluir"
        onSave={() => commitDrawer("installments")}
        cancelLabel="Fechar"
        onCancel={cancelDrawer}
        isSaving={isSaving}
      >
        <div className={Styles.drawerContent}>
          <FormSection
            rows={clausesSections.installmentsSection.fields}
            formValues={mergedFormValues}
            onInputChange={handleInputChange}
            onBooleanChange={handleBooleanChange}
            hideTitle
          />
        </div>
      </ClauseSectionDrawer>

      {/* Drawer: Atleta Envolvido na Troca */}
      <ClauseSectionDrawer
        isOpen={activeDrawerKey === "swap"}
        onClose={cancelDrawer}
        title={
          isExit
            ? "Atleta Envolvido na Troca"
            : "Atleta de Troca (Do seu Clube)"
        }
        saveLabel="Concluir"
        onSave={() => commitDrawer("swap")}
        cancelLabel="Fechar"
        onCancel={cancelDrawer}
        isSaving={isSaving}
      >
        <div className={Styles.drawerContent}>
          <FormSection
            rows={clausesSections.playerSwapSection.fields}
            formValues={mergedFormValues}
            onInputChange={handleInputChange}
            onBooleanChange={handleBooleanChange}
            hideTitle
          />
          {!isExit && formValues.swapPlayerName && (
            <div className={Styles.selectedPlayerInfoCard}>
              <div className={Styles.selectedPlayerDetails}>
                <span className={Styles.selectedPlayerName}>
                  {formValues.swapPlayerName}
                </span>
                <span className={Styles.selectedPlayerMeta}>
                  {formValues.swapPlayerPosition || "Posição N/D"}
                  {formValues.swapPlayerSector
                    ? ` • ${formValues.swapPlayerSector}`
                    : ""}
                  {formValues.swapPlayerValue
                    ? ` • Avaliado em ${formValues.swapPlayerValue}`
                    : ""}
                </span>
              </div>
              <button
                type="button"
                className={Styles.removeSwapButton}
                onClick={() => {
                  handleInputChange(
                    {
                      target: { name: "swapPlayerName", value: "" },
                    },
                    { id: "swapPlayerName" } as Field,
                  );
                }}
              >
                Remover Atleta da Troca
              </button>
            </div>
          )}
        </div>
      </ClauseSectionDrawer>

      {/* Drawer: Bônus & Metas */}
      <ClauseSectionDrawer
        isOpen={activeDrawerKey === "bonus"}
        onClose={cancelDrawer}
        title={
          isExit
            ? "Bônus de Conquistas & Metas"
            : "Bônus & Metas (Clube Vendedor)"
        }
        saveLabel="Concluir"
        onSave={() => commitDrawer("bonus")}
        cancelLabel="Fechar"
        onCancel={cancelDrawer}
        isSaving={isSaving}
      >
        <div className={Styles.drawerContent}>
          <FormSection
            rows={clausesSections.bonusSection.fields}
            formValues={mergedFormValues}
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

      {/* Drawer: Outros Acordos Especiais */}
      <ClauseSectionDrawer
        isOpen={activeDrawerKey === "other"}
        onClose={cancelDrawer}
        title={
          isExit
            ? "Outros Acordos Especiais"
            : "Acordos Especiais com o Clube Vendedor"
        }
        saveLabel="Concluir"
        onSave={() => commitDrawer("other")}
        cancelLabel="Fechar"
        onCancel={cancelDrawer}
        isSaving={isSaving}
      >
        <div className={Styles.drawerContent}>
          <FormSection
            rows={clausesSections.otherClausesSection.fields}
            formValues={mergedFormValues}
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

export default ClubClausesEditorView;
