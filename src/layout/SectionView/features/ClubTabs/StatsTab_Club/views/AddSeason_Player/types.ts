import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { OptimisticUpdateData } from "../../../../../helpers/updateSectionCareer";

export interface AddSeasonPlayerProps {
  career: Career;
  season: ClubData;
  playerId?: string;
  player?: Players;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
}
