import { useState, useMemo, useEffect, FormEvent } from "react";
import { Career } from "../../../interfaces/Career";
import { useSave } from "../UseSave";
import { ClubData } from "../../../interfaces/club/clubData";
import { League } from "../../../interfaces/League";

type useAddTrophiesProps = {
  setView: React.Dispatch<React.SetStateAction<"titles" | "add" | "menu">>;
  careerId: string;
  selectedCareer: Career;
  setSelectedCareer: React.Dispatch<React.SetStateAction<Career>>;
  season: ClubData;
  seasonName: string;
};

export const useAddTrophies = ({
  setView,
  careerId,
  selectedCareer,
  setSelectedCareer,
  season,
  seasonName,
}: useAddTrophiesProps) => {
  const [selectedTrophies, setSelectedTrophies] = useState<string[]>([]);
  const [selectValue, setSelectValue] = useState<string>("");

  useEffect(() => {
    const alreadySaved =
      selectedCareer.trophies
        ?.filter((t) => t.seasons?.includes(seasonName))
        .map((t) => t.leagueName) || [];

    setSelectedTrophies(alreadySaved);
  }, [selectedCareer.trophies, seasonName]);

  const leaguesOptions = useMemo(() => {
    const allLeagues = season?.leagues?.map((l) => l.name) || [];
    return allLeagues.filter((name) => !selectedTrophies.includes(name));
  }, [season, selectedTrophies]);

  const addTrophy = (trophyName: string) => {
    if (trophyName && !selectedTrophies.includes(trophyName)) {
      setSelectedTrophies([...selectedTrophies, trophyName]);
    }
    setSelectValue("");
  };

  const removeTrophy = (trophyName: string) => {
    setSelectedTrophies(selectedTrophies.filter((t) => t !== trophyName));
  };

  const { saveTrophies: rawSaveTrophies, isSaving } = useSave({
    setView,
    selectedCareer,
    setSelectedCareer,
  });

  const saveTrophies = (
    event: FormEvent<HTMLFormElement>,
    targetCareerId?: string,
    targetSelectedTrophies?: string[],
    targetSeasonName?: string,
    availableLeagues?: League[],
  ) => {
    return rawSaveTrophies(
      event,
      targetCareerId ?? careerId,
      targetSelectedTrophies ?? selectedTrophies,
      targetSeasonName ?? seasonName,
      availableLeagues ?? season?.leagues,
    );
  };

  return {
    selectedTrophies,
    selectValue,
    addTrophy,
    removeTrophy,
    leaguesOptions,
    saveTrophies,
    careerId,
    isSaving,
  };
};
