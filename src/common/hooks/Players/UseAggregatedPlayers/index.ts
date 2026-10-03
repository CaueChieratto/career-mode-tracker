import { useMemo } from "react";
import { Career } from "../../../interfaces/Career";
import { Players } from "../../../interfaces/playersInfo/players";
import { getAggregatedPlayersForCareer } from "../../../../layout/SectionView/helpers/mergeMatchStats";

export const useAggregatedPlayers = (career: Career | undefined): Players[] => {
  return useMemo(() => {
    if (!career?.clubData) {
      return [];
    }

    return getAggregatedPlayersForCareer(career);
  }, [career]);
};

