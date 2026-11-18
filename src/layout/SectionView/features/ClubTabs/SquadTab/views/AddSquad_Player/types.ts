import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { OptimisticUpdateData } from "../../../../../helpers/updateSectionCareer";

export interface AddSquadPlayerProps {
  career: Career;
  season: ClubData;
  playerId?: string;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
}
