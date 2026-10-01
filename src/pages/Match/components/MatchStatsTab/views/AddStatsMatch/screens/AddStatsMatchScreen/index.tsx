import Form from "../../../../../../../../components/Form";
import FormSection from "../../../../../../../../components/FormSection";
import Load from "../../../../../../../../components/Load";
import HeaderSeason from "../../../../../../../../components/HeaderSeason";
import Navbar from "../../../../../../../../ui/Navbar";
import Styles from "./AddStatsMatchScreen.module.css";
import { useAddStatsMatch } from "../../hooks/useAddStatsMatch";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Match } from "../../../../../../../../common/interfaces/Match";

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
      console.error("Erro ao salvar estatÃ­sticas da partida:", error);
      window.alert("NÃ£o foi possÃ­vel salvar as estatÃ­sticas da partida.");
    });
  };

  if (isSaving) return <Load />;

  return (
    <>
      <HeaderSeason
        match={match}
        careerId={career.id}
        career={career}
        backSeasons={onClose}
        titleText="Estatísticas da Partida"
      />
      <Navbar
        save={handleSave}
        options={["", "Salvar", ""]}
        activeOption={1}
        onOptionClick={() => {}}
      />
      <div className={Styles.container}>
        <Form className={Styles.form}>
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
        </Form>
      </div>
    </>
  );
};
