import { useRef } from "react";
import FormSection from "../../../../../../../../components/FormSection";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Match } from "../../../../../../../../common/interfaces/Match";
import { MatchFormSubScreen } from "../../../../../MatchFormSubScreen";
import { useAddMatchStatsPlayer } from "../../hooks/useAddMatchStatsPlayer";

type AddMatchStatsPlayerScreenProps = {
  career: Career;
  season: ClubData;
  match: Match;
  playerId: string;
  onClose: () => void;
  onSaved?: (match: Partial<Match>) => void;
};

export const AddMatchStatsPlayerScreen = ({
  career,
  season,
  match,
  playerId,
  onClose,
  onSaved,
}: AddMatchStatsPlayerScreenProps) => {
  const formRef = useRef<HTMLFormElement>(null);

  const {
    isSaving,
    player,
    isGoalkeeper,
    formFields,
    formValues,
    isPlayerInLineup,
    handleLocalBooleanChange,
    handleKeyDown,
    handleKeyUp,
    handleLocalInputChange,
    savePlayerStats,
  } = useAddMatchStatsPlayer({
    career,
    season,
    match,
    playerId,
    onClose,
    onSaved,
  });

  return (
    <MatchFormSubScreen
      career={career}
      titleText={player?.name || ""}
      onClose={onClose}
      onSave={savePlayerStats}
      isLoading={isSaving || !player || !isPlayerInLineup}
      containerStyle={{ paddingBottom: "350px" }}
      formRef={formRef}
    >
      {formFields.map((section, index) => (
        <FormSection
          key={index}
          title={section.title}
          rows={section.fields}
          formValues={formValues}
          isEditing={true}
          isGoalkeeper={isGoalkeeper}
          onBooleanChange={handleLocalBooleanChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onInputChange={handleLocalInputChange}
        />
      ))}
    </MatchFormSubScreen>
  );
};
