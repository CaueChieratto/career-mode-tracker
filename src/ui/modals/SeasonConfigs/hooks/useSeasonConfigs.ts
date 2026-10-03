import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useClubColors } from "../../../../common/hooks/Colors/UseClubColors";
import { Career } from "../../../../common/interfaces/Career";
import { ColorsService } from "../../../../common/services/ColorsService";
import { League } from "../../../../common/interfaces/League";
import { ClubData } from "../../../../common/interfaces/club/clubData";
import { SeasonView } from "../types/SeasonView";

type UseSeasonConfigsParams = {
  career: Career;
  season?: ClubData;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
};

type UseSeasonConfigsReturn = {
  view: SeasonView;
  setView: (view: SeasonView) => void;
  currentSeasonId: string;
  country: string;
  selectedLeagues: League[];
  setSelectedLeagues: Dispatch<SetStateAction<League[]>>;
  clubColor: string;
  darkClubColor: string;
  canProceed: boolean;
};

export const useSeasonConfigs = ({
  career,
  season,
}: UseSeasonConfigsParams): UseSeasonConfigsReturn => {
  const targetSeason =
    (season?.id && career.clubData.find((s) => s.id === season.id)) ||
    season ||
    career.clubData[career.clubData.length - 1];
  const currentSeasonId = targetSeason?.id || "";
  const country = career.nation;

  const [view, setView] = useState<SeasonView>("menu");
  const [selectedLeagues, setSelectedLeagues] = useState<League[]>(
    targetSeason?.leagues || [],
  );

  useEffect(() => {
    if (targetSeason?.leagues) {
      setSelectedLeagues(targetSeason.leagues);
    }
  }, [targetSeason?.id, targetSeason?.leagues]);

  const { clubColor, darkClubColor } = useClubColors(
    ColorsService.getColorSaved(career.id) || "#ffffff",
  );

  const isFirstSeason =
    targetSeason?.seasonNumber === 1 || (career.clubData?.length ?? 0) <= 1;
  const canProceed = !isFirstSeason || selectedLeagues.length > 0;

  return {
    view,
    setView,
    currentSeasonId,
    country,
    selectedLeagues,
    setSelectedLeagues,
    clubColor,
    darkClubColor,
    canProceed,
  };
};
