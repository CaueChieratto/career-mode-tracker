import { Dispatch, SetStateAction } from "react";
import CustomSelect from "../../../../../components/CustomSelect";
import { Career } from "../../../../../common/interfaces/Career";
import { useClubColors } from "../../../../../common/hooks/Colors/UseClubColors";
import { useAddTrophies } from "../../../../../common/hooks/Career/UseAddTrophies";
import { ColorsService } from "../../../../../common/services/ColorsService";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import {
  SeasonConfigLeagueCard,
  SeasonConfigSubScreen,
  SeasonConfigSubScreenStyles as Styles,
} from "../../components/SeasonConfigSubScreen";

type AddTrophiesProps = {
  setView: Dispatch<SetStateAction<"titles" | "add" | "menu">>;
  careerId: string;
  selectedCareer: Career;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
  seasonName: string;
  season: ClubData;
};

const AddTrophies = ({
  setView,
  careerId,
  selectedCareer,
  setSelectedCareer,
  seasonName,
  season,
}: AddTrophiesProps) => {
  const { clubColor, darkClubColor } = useClubColors(
    ColorsService.getColorSaved(selectedCareer.id) || "#ffffff",
  );

  const {
    selectedTrophies,
    selectValue,
    addTrophy,
    removeTrophy,
    leaguesOptions,
    saveTrophies,
    isSaving,
  } = useAddTrophies({
    setView,
    careerId,
    selectedCareer,
    setSelectedCareer,
    season,
    seasonName,
  });

  return (
    <SeasonConfigSubScreen
      title="Adicionar Títulos"
      subtitle="Escolha os torneios conquistados"
      clubColor={clubColor}
      darkClubColor={darkClubColor}
      confirmLabel={
        isSaving
          ? "Salvando..."
          : `Confirmar títulos: (${selectedTrophies.length})`
      }
      isSaving={isSaving}
      onBack={() => setView("menu")}
      onSubmit={(event) =>
        saveTrophies(
          event,
          careerId,
          selectedTrophies,
          seasonName,
          season?.leagues,
        )
      }
    >
      <div className={Styles.select_wrapper}>
        <CustomSelect
          name="trophiesQuickSelect"
          options={leaguesOptions}
          value={selectValue}
          placeholder={
            leaguesOptions.length > 0
              ? "Buscar e adicionar título..."
              : "Todos os títulos adicionados"
          }
          onChange={(e) => addTrophy(e.target.value)}
          disabled={leaguesOptions.length === 0}
        />
      </div>

      <div className={Styles.grid_scroll}>
        <div className={Styles.leagues_grid}>
          {selectedTrophies.length > 0 ? (
            selectedTrophies.map((trophyName) => {
              const leagueObj = season.leagues?.find(
                (l) => l.name === trophyName,
              );

              return (
                <SeasonConfigLeagueCard
                  key={trophyName}
                  name={trophyName}
                  imageSrc={leagueObj?.trophy}
                  onRemove={() => removeTrophy(trophyName)}
                />
              );
            })
          ) : (
            <p className={Styles.empty}>Nenhum título selecionado ainda.</p>
          )}
        </div>
      </div>
    </SeasonConfigSubScreen>
  );
};

export default AddTrophies;
