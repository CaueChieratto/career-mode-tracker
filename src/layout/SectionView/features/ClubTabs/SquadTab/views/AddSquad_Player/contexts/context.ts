import { createContext, useContext } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { OptimisticUpdateData } from "../../../../../../helpers/updateSectionCareer";

export interface AddSquadPlayerContextValue {
  career: Career;
  season: ClubData;
  playerId?: string;
  player?: Players;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
}

export const AddSquadPlayerContext =
  createContext<AddSquadPlayerContextValue | null>(null);

export const useAddSquadPlayerContext = (): AddSquadPlayerContextValue => {
  const context = useContext(AddSquadPlayerContext);
  if (!context) {
    throw new Error(
      "useAddSquadPlayerContext must be used within an AddSquadPlayerProvider",
    );
  }
  return context;
};
