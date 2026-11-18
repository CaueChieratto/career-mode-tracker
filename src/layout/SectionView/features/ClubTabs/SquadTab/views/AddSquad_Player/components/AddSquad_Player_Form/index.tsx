import Styles from "../../screens/AddSquad_PlayerScreen/AddSquad_PlayerScreen.module.css";
import { forwardRef } from "react";
import { getSquadFormFields } from "../../constants/SquadFormFields";
import { useSquadPlayerForm } from "../../hooks/useSquadPlayerForm";
import {
  filterFormSections,
  SquadFormField,
  SquadFormSection,
} from "../../helpers/filterFormFields";
import { Form } from "react-router-dom";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";
import FormSection from "../../../../../../../../../components/FormSection";
import { useGlobalTeamsOptions } from "../../../shared/useGlobalTeamsOptions";

export interface AddSquadPlayerFormProps {
  player?: Players;
  openModal: (modal: ModalType, career?: Career) => void;
  season: ClubData;
  career: Career;
}

export const AddSquad_Player_Form = forwardRef<
  HTMLFormElement,
  AddSquadPlayerFormProps
>(({ player, season, career, openModal }, ref) => {
  const {
    formValues,
    mergedFormValues,
    handleBooleanChange,
    handleInputChange,
    handleKeyDown,
    handleKeyUp,
    filteredPastPlayerOptions,
    isEditing,
    isLoaned,
    isIncomingLoanPlayer,
    isKnownPlayer,
    isSigning,
    isIncomingLoan,
    hasInitialPlayedWithUs,
  } = useSquadPlayerForm(player, career, season);

  const { filteredTeamOptions } = useGlobalTeamsOptions({
    career,
    season,
    searchQuery: formValues.fromClub || "",
  });

  const dynamicFields = getSquadFormFields(
    formValues.nation || "",
    filteredPastPlayerOptions,
    filteredTeamOptions,
    formValues.sector || "",
  ) as SquadFormSection<SquadFormField>[];

  const activeSections = filterFormSections(dynamicFields, {
    isEditing,
    isLoaned,
    isIncomingLoanPlayer,
    isSigning,
    isIncomingLoan,
    isKnownPlayer,
    hasGroupId: !!career?.groupId,
    hasInitialPlayedWithUs,
  });

  return (
    <Form className={Styles.form} ref={ref}>
      {isKnownPlayer && formValues.globalId && (
        <input type="hidden" name="globalId" value={formValues.globalId} />
      )}

      <input
        type="hidden"
        name="playedWithUs"
        value={isKnownPlayer ? formValues.playedWithUs || "" : ""}
      />

      {formValues.isAcademy === "true" && (
        <>
          <input type="hidden" name="isAcademy" value="true" />
          <input
            type="hidden"
            name="academyNickname"
            value={formValues.academyNickname}
          />
          <input
            type="hidden"
            name="academyData"
            value={formValues.academyData}
          />
          <input
            type="hidden"
            name="academyHistory"
            value={formValues.academyHistory}
          />
          <input
            type="hidden"
            name="academyTournaments"
            value={formValues.academyTournaments}
          />
        </>
      )}

      <input
        type="hidden"
        name="contractDuration"
        value={formValues.contractDuration || ""}
      />

      <input
        type="hidden"
        name="contractTime"
        value={formValues.contractTime || ""}
      />

      {activeSections.map((item, index) => (
        <div key={index}>
          <FormSection
            onActionClick={(modal) => openModal(modal as ModalType)}
            title={item.title}
            rows={item.fields}
            formValues={mergedFormValues}
            isEditing={isEditing}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onBooleanChange={handleBooleanChange}
          />
        </div>
      ))}
    </Form>
  );
});

AddSquad_Player_Form.displayName = "AddSquad_Player_Form";

export default AddSquad_Player_Form;
