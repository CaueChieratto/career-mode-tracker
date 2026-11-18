import { useCallback, useMemo } from "react";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { ServiceSeasons } from "../../../../../../../common/services/ServiceSeasons";
import { toast } from "../../../../../../../common/services/ToastService";
import { SortableVerticalList } from "../../../../../../../components/SortableVerticalList";
import { PlayerInfo } from "../../../../../../../components/PlayerInfo";
import Styles from "./CaptainsHierarchyCard.module.css";
import { getSortedCaptains } from "./helpers/getSortedCaptains";
import { reorderCaptains } from "./helpers/reorderCaptains";

export type CaptainsHierarchyCardProps = {
  season: ClubData;
  careerId: string;
  readOnly?: boolean;
  onReorderCaptains?: (updatedCaptains: Players[]) => void;
};

export const CaptainsHierarchyCard = ({
  season,
  careerId,
  readOnly = false,
  onReorderCaptains,
}: CaptainsHierarchyCardProps) => {
  const captains = useMemo(() => getSortedCaptains(season), [season]);

  const handlePersist = useCallback(
    async (updatedCaptains: Players[]) => {
      try {
        const captainIds = updatedCaptains.map((c) => c.id);
        await ServiceSeasons.updateSeasonCaptains(
          careerId,
          season.id,
          captainIds,
        );
      } catch (error) {
        console.error("Erro ao salvar a ordem dos capitães no Firebase:", error);
        toast.error("Erro ao salvar ordem dos capitães no banco de dados.");
      }
    },
    [careerId, season?.id],
  );

  if (captains.length === 0) {
    return null;
  }

  return (
    <SortableVerticalList
      title="Capitães"
      items={captains}
      getItemId={(player) => player.id}
      reorderItems={reorderCaptains}
      onReorderOptimistic={onReorderCaptains}
      onReorderPersist={handlePersist}
      readOnly={readOnly}
      listClassName={Styles.container_captains}
      itemClassName={Styles.captain_item}
      dragHandleSize={25}
      getDragHandleAriaLabel={(player) => `Reordenar capitão ${player.name}`}
      renderItemContent={(player, index) => {
        const rank = index + 1;
        return (
          <PlayerInfo
            name={player.name}
            position={player.position}
            shirtNumber={player.shirtNumber}
            age={player.age}
            nation={player.nation}
            captain={player.captain}
            isAcademy={player.isAcademy}
            nickname={player.academyNickname}
            showOverall={false}
            leftElement={<div className={Styles.rank_badge}>#{rank}</div>}
          />
        );
      }}
    />
  );
};

export default CaptainsHierarchyCard;
