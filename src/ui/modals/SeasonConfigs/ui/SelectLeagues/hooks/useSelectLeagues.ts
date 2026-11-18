import { Dispatch, SetStateAction, useState } from "react";
import { League } from "../../../../../../common/interfaces/League";
import { Career } from "../../../../../../common/interfaces/Career";
import { ServiceSeasons } from "../../../../../../common/services/ServiceSeasons";
import { getAvailableLeagues } from "../helpers/getAvailableLeagues";
import { toast } from "../../../../../../common/services/ToastService";

type UseSelectLeaguesParams = {
  nation: string;
  career: Career;
  seasonId: string;
  selectedLeagues: League[];
  setSelectedLeagues: (leagues: League[]) => void;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
  onClose: () => void;
};

type UseSelectLeaguesReturn = {
  isSaving: boolean;
  selectValue: string;
  availableLeagues: League[];
  leaguesOptions: string[];
  handleSelectChange: (event: {
    target: { name: string; value: string };
  }) => void;
  handleConfirm: () => Promise<void>;
  addLeague: (leagueName: string) => void;
  removeLeague: (leagueName: string) => void;
};

export const useSelectLeagues = ({
  nation,
  career,
  seasonId,
  selectedLeagues,
  setSelectedLeagues,
  setSelectedCareer,
  onClose,
}: UseSelectLeaguesParams): UseSelectLeaguesReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectValue, setSelectValue] = useState("");

  const availableLeagues = getAvailableLeagues(nation);

  const unselectedLeagues = availableLeagues.filter(
    (league) => !selectedLeagues.some((l) => l.name === league.name),
  );

  const leaguesOptions = unselectedLeagues.map((l) => l.name);

  const addLeague = (leagueName: string): void => {
    const leagueToAdd = availableLeagues.find((l) => l.name === leagueName);
    if (
      leagueToAdd &&
      !selectedLeagues.some((l) => l.name === leagueToAdd.name)
    ) {
      setSelectedLeagues([...selectedLeagues, leagueToAdd]);
    }
  };

  const removeLeague = (leagueName: string): void => {
    setSelectedLeagues(selectedLeagues.filter((l) => l.name !== leagueName));
  };

  const handleSelectChange = (event: {
    target: { name: string; value: string };
  }): void => {
    addLeague(event.target.value);
    setSelectValue("");
  };

  const handleConfirm = async (): Promise<void> => {
    try {
      setIsSaving(true);

      await ServiceSeasons.updateSeasonLeagues(
        career.id,
        seasonId,
        selectedLeagues,
      );

      const updatedClubData = career.clubData.map((season) =>
        season.id === seasonId
          ? { ...season, leagues: selectedLeagues }
          : season,
      );

      setSelectedCareer({ ...career, clubData: updatedClubData });
      toast.success("Ligas da temporada salvas com sucesso!");
      onClose();
    } catch (error) {
      console.error("Erro ao salvar ligas:", error);
      toast.error("Ocorreu um erro ao salvar as ligas selecionadas.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    selectValue,
    availableLeagues,
    leaguesOptions,
    handleSelectChange,
    handleConfirm,
    addLeague,
    removeLeague,
  };
};
