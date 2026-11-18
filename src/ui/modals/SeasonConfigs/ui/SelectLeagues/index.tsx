import { Dispatch, SetStateAction } from "react";
import { League } from "../../../../../common/interfaces/League";
import { Career } from "../../../../../common/interfaces/Career";
import CustomSelect from "../../../../../components/CustomSelect";
import { useSelectLeagues } from "./hooks/useSelectLeagues";
import { buildConfirmLabel } from "./helpers/buildConfirmLabel";
import {
  SeasonConfigLeagueCard,
  SeasonConfigSubScreen,
  SeasonConfigSubScreenStyles as Styles,
} from "../../components/SeasonConfigSubScreen";

type SelectLeaguesProps = {
  careerId: string;
  nation: string;
  selectedLeagues: League[];
  setSelectedLeagues: (leagues: League[]) => void;
  onClose: () => void;
  clubColor?: string;
  career: Career;
  seasonId: string;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
};

export const SelectLeagues = ({
  nation,
  selectedLeagues,
  setSelectedLeagues,
  onClose,
  clubColor,
  career,
  seasonId,
  setSelectedCareer,
}: SelectLeaguesProps) => {
  const {
    isSaving,
    selectValue,
    leaguesOptions,
    handleSelectChange,
    handleConfirm,
    removeLeague,
  } = useSelectLeagues({
    nation,
    career,
    seasonId,
    selectedLeagues,
    setSelectedLeagues,
    setSelectedCareer,
    onClose,
  });

  return (
    <SeasonConfigSubScreen
      title="Selecionar Ligas"
      subtitle="Escolha os torneios da temporada"
      clubColor={clubColor}
      confirmLabel={buildConfirmLabel(isSaving, selectedLeagues.length)}
      onConfirm={handleConfirm}
      onBack={onClose}
      isSaving={isSaving}
    >
      <div className={Styles.select_wrapper}>
        <CustomSelect
          name="leagueQuickSelect"
          options={leaguesOptions}
          value={selectValue}
          placeholder={
            leaguesOptions.length > 0
              ? "Buscar e adicionar liga..."
              : "Todas as ligas adicionadas"
          }
          onChange={handleSelectChange}
          disabled={leaguesOptions.length === 0}
        />
      </div>

      <div className={Styles.grid_scroll}>
        <div className={Styles.leagues_grid}>
          {selectedLeagues.length > 0 ? (
            selectedLeagues.map((league) => (
              <SeasonConfigLeagueCard
                key={league.name}
                name={league.name}
                imageSrc={league.logo}
                onRemove={() => removeLeague(league.name)}
              />
            ))
          ) : (
            <p className={Styles.empty}>Nenhuma liga selecionada ainda.</p>
          )}
        </div>
      </div>
    </SeasonConfigSubScreen>
  );
};
