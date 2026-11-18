import FormSection from "../../../../../../../../components/FormSection";
import { useAddStatsMatch } from "../../hooks/useAddStatsMatch";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Match } from "../../../../../../../../common/interfaces/Match";
import { toast } from "../../../../../../../../common/services/ToastService";
import { MatchFormSubScreen } from "../../../../../MatchFormSubScreen";

type AddStatsMatchScreenProps = {
  career: Career;
  season: ClubData;
  match: Match;
  onClose: () => void;
  onSaved?: (match: Partial<Match>) => void;
};

export const AddStatsMatchScreen = ({
  career,
  season,
  match,
  onClose,
  onSaved,
}: AddStatsMatchScreenProps) => {
  const { isSaving, fields, formValues, handleInputChange, saveStats } =
    useAddStatsMatch({ career, season, match, onClose, onSaved });

  const handleSave = () => {
    void saveStats().catch((error) => {
      console.error("Erro ao salvar estatísticas da partida:", error);
      toast.error("Não foi possível salvar as estatísticas da partida.");
    });
  };

  return (
    <MatchFormSubScreen
      career={career}
      match={match}
      titleText="Estatísticas da Partida"
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
        />
      ))}
    </MatchFormSubScreen>
  );
};
