import FormSection from "../../../../../../../../components/FormSection";
import { useAddDetails } from "../../hooks/useAddDetails";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Match } from "../../../../../../../../common/interfaces/Match";
import { toast } from "../../../../../../../../common/services/ToastService";
import { MatchFormSubScreen } from "../../../../../MatchFormSubScreen";

type AddDetailsScreenProps = {
  career: Career;
  season: ClubData;
  match: Match;
  onClose: () => void;
  onSaved?: (match: Partial<Match>) => void;
};

export const AddDetailsScreen = ({
  career,
  season,
  match,
  onClose,
  onSaved,
}: AddDetailsScreenProps) => {
  const {
    isSaving,
    fields,
    formValues,
    handleInputChange,
    handleBooleanChange,
    handleSelectOption,
    saveDetails,
  } = useAddDetails({ career, season, match, onClose, onSaved });

  const handleSave = () => {
    void saveDetails().catch((error) => {
      console.error("Erro ao salvar detalhes da partida:", error);
      toast.error("Não foi possível salvar os detalhes da partida.");
    });
  };

  return (
    <MatchFormSubScreen
      career={career}
      match={match}
      titleText={`${match.homeTeam} x ${match.awayTeam}`}
      onClose={onClose}
      onSave={handleSave}
      isLoading={isSaving}
    >
      {fields.map((section, index) => (
        <FormSection
          isMatch
          key={index}
          title={section.title}
          rows={section.fields}
          formValues={formValues}
          isEditing={true}
          onInputChange={handleInputChange}
          onBooleanChange={handleBooleanChange}
          onSelectOption={handleSelectOption}
        />
      ))}
    </MatchFormSubScreen>
  );
};
