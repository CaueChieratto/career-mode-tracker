import { createContext, useContext } from "react";
import { CareerGroup } from "../../../../common/interfaces/CareerGroup";
import { Players } from "../../../../common/interfaces/playersInfo/players";
import { SeasonByCareer } from "../../hooks/useGroupSeasonView";

type GroupCareerContextType = {
  save: CareerGroup;
  seasonsByCareer: SeasonByCareer[];
  groupPlayers?: Players[];
};

export const GroupCareerContext = createContext<
  GroupCareerContextType | undefined
>(undefined);

export const useGroupCareerContext = () => {
  const ctx = useContext(GroupCareerContext);
  if (!ctx) throw new Error("useGroupCareerContext fora do Provider");
  return ctx;
};
