import React, { useMemo } from "react";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Navbar from "../../../../../../../../../ui/Navbar";
import Form from "../../../../../../../../../components/Form";
import FormSection from "../../../../../../../../../components/FormSection";
import Load from "../../../../../../../../../components/Load";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { useRenewPlayerContext } from "../../contexts/context";
import { buildRenewalContractSection } from "../../constants/buildRenewalFormSections";
import Styles from "./RenewPlayerScreen.module.css";

interface RenewPlayerScreenProps {
  career: Career;
  season?: ClubData;
  onClose?: () => void;
}

export const RenewPlayerScreen: React.FC<RenewPlayerScreenProps> = ({
  career,
}) => {
  const {
    player,
    formValues,
    proposalId,
    isSaving,
    handleInputChange,
    handleSaveProposal,
    handleClose,
  } = useRenewPlayerContext();

  const contractSection = useMemo(() => buildRenewalContractSection(), []);

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        isPlayer={true}
        player={player}
        titleText={proposalId ? "Editar Proposta" : "Renovação de Contrato"}
        backSeasons={handleClose}
      />

      <Navbar
        save={() => void handleSaveProposal(true)}
        options={["", proposalId ? "Salvar Alterações" : "Enviar Proposta", ""]}
        activeOption={1}
        onOptionClick={(index) => {
          if (index === 1) void handleSaveProposal(true);
        }}
      />

      <div className={Styles.container}>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSaveProposal(true);
          }}
          className={Styles.form}
        >
          <FormSection
            title={contractSection.title}
            rows={contractSection.rows}
            formValues={formValues as Record<string, string>}
            onInputChange={handleInputChange}
          />
        </Form>
      </div>

      {isSaving && <Load isTransfers />}
    </>
  );
};

export default RenewPlayerScreen;
