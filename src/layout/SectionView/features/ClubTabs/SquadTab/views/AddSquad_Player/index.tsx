import Styles from "./screens/AddSquad_PlayerScreen/AddSquad_PlayerScreen.module.css";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { getSquadFormFields } from "./constants/SquadFormFields";
import { useSquadPlayerForm } from "./hooks/useSquadPlayerForm";
import {
  filterFormSections,
  SquadFormField,
  SquadFormSection,
} from "./helpers/filterFormFields";
import { Form } from "react-router-dom";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { ModalType } from "../../../../../../../common/types/enums/ModalType";
import FormSection from "../../../../../../../components/FormSection";
import { ServiceMatches } from "../../../AllMatchesTab/views/AddMatches/services/ServiceMatches";

type AddSquad_PlayerProps = {
  player?: Players;
  openModal: (modal: ModalType, career?: Career) => void;
  season: ClubData;
  career: Career;
  onReturnIncomingLoanChange?: (value: boolean) => void;
};

const AddSquad_Player = forwardRef<HTMLFormElement, AddSquad_PlayerProps>(
  ({ player, season, career, openModal, onReturnIncomingLoanChange }, ref) => {
    const {
      formValues,
      booleanValues,
      handleBooleanChange,
      handleInputChange,
      handleKeyDown,
      handleKeyUp,
      pastPlayerOptions,
      isEditing,
      isLoaned,
      isIncomingLoanPlayer,
      isReturningIncomingLoan,
      isKnownPlayer,
      isSigning,
      isIncomingLoan,
    } = useSquadPlayerForm(player, career, season);

    useEffect(() => {
      onReturnIncomingLoanChange?.(isReturningIncomingLoan);
    }, [isReturningIncomingLoan, onReturnIncomingLoanChange]);

    const [globalTeams, setGlobalTeams] = useState<string[]>(() => {
      if (!career?.clubData) return [];
      const teams = new Set<string>();
      career.clubData.forEach((s) => {
        s.teams?.forEach((t) => {
          if (t.name) teams.add(t.name);
        });
      });
      return Array.from(teams).sort();
    });

    useEffect(() => {
      const fetchAllUserTeams = async () => {
        try {
          const allTeams = await ServiceMatches.getAllTeamsAcrossUserCareers();
          if (allTeams.length > 0) {
            setGlobalTeams(allTeams);
          }
        } catch (error) {
          console.error("Erro ao buscar times globais: ", error);
        }
      };
      fetchAllUserTeams();
    }, []);

    const filteredPastPlayerOptions = useMemo(() => {
      const searchValue = (formValues.selectedPastPlayer || "")
        .toLowerCase()
        .replace(/\s/g, "");

      if (searchValue) {
        return pastPlayerOptions.filter((playerName) =>
          playerName.toLowerCase().replace(/\s/g, "").includes(searchValue),
        );
      }
      return pastPlayerOptions;
    }, [pastPlayerOptions, formValues.selectedPastPlayer]);

    const filteredTeamOptions = useMemo(() => {
      const searchValue = (formValues.fromClub || "")
        .toLowerCase()
        .replace(/\s/g, "");

      if (searchValue) {
        return globalTeams.filter((teamName) =>
          teamName.toLowerCase().replace(/\s/g, "").includes(searchValue),
        );
      }

      return globalTeams;
    }, [globalTeams, formValues.fromClub]);

    const dynamicFields = getSquadFormFields(
      formValues.nation || "",
      filteredPastPlayerOptions,
      filteredTeamOptions,
    ) as SquadFormSection<SquadFormField>[];

    const activeSections = filterFormSections(dynamicFields, {
      isEditing,
      isLoaned,
      isIncomingLoanPlayer,
      isReturningIncomingLoan,
      isSigning,
      isIncomingLoan,
      isKnownPlayer,
      hasGroupId: !!career?.groupId,
    });

    const mergedFormValues = {
      ...formValues,
      ...Object.fromEntries(
        Object.entries(booleanValues).map(([k, v]) => [k, String(v)]),
      ),
    };

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

        {activeSections.map((item, index) => (
          <FormSection
            key={index}
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
        ))}
      </Form>
    );
  },
);

AddSquad_Player.displayName = "AddSquad_Player";

export default AddSquad_Player;
