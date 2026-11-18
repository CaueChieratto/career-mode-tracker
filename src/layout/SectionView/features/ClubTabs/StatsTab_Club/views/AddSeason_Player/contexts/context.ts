import { createContext, useContext } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { OptimisticUpdateData } from "../../../../../../helpers/updateSectionCareer";

export interface AddSeasonPlayerContextValue {
  career: Career;
  season: ClubData;
  playerId?: string;
  player?: Players;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
}

export const AddSeasonPlayerContext =
  createContext<AddSeasonPlayerContextValue | null>(null);

export const useAddSeasonPlayerContext = (): AddSeasonPlayerContextValue => {
  const context = useContext(AddSeasonPlayerContext);
  if (!context) {
    throw new Error(
      "useAddSeasonPlayerContext must be used within an AddSeasonPlayerProvider",
    );
  }
  return context;
};
