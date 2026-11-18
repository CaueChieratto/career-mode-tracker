import { useCallback, useMemo } from "react";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { League } from "../../../../../../../common/interfaces/League";
import { ServiceSeasons } from "../../../../../../../common/services/ServiceSeasons";
import { toast } from "../../../../../../../common/services/ToastService";
import { SortableVerticalList } from "../../../../../../../components/SortableVerticalList";
import Styles from "./CompetitionsCard.module.css";
import { getSortedLeagues } from "./helpers/getSortedLeagues";
import { reorderLeagues } from "./helpers/reorderLeagues";

type CompetitionsCardProps = {
  season: ClubData;
  careerId: string;
  readOnly?: boolean;
  onReorderLeagues?: (updatedLeagues: League[]) => void;
};

const CompetitionsCard = ({
  season,
  careerId,
  readOnly = false,
  onReorderLeagues,
}: CompetitionsCardProps) => {
  const leagues = useMemo(
    () => getSortedLeagues(season?.leagues || []),
    [season?.leagues],
  );

  const handlePersist = useCallback(
    async (updatedLeagues: League[]) => {
      try {
        await ServiceSeasons.updateSeasonLeagues(
          careerId,
          season.id,
          updatedLeagues,
        );
      } catch (error) {
        console.error("Erro ao salvar a ordem das ligas no Firebase:", error);
        toast.error("Erro ao salvar ordem das competições no banco de dados.");
      }
    },
    [careerId, season?.id],
  );

  return (
    <SortableVerticalList
      title="Competições"
      items={leagues}
      getItemId={(league) => league.name}
      reorderItems={reorderLeagues}
      onReorderOptimistic={onReorderLeagues}
      onReorderPersist={handlePersist}
      readOnly={readOnly}
      listClassName={Styles.container_leagues}
      itemClassName={Styles.league_item}
      dragHandleSize={25}
      renderItemContent={(league) => (
        <div className={Styles.wrapper}>
          <div className={Styles.background_img}>
            <img
              src={league.logo}
              alt={`Logo da competição ${league.name}`}
              className={Styles.logo}
            />
          </div>

          <span className={Styles.name}>{league.name}</span>
        </div>
      )}
    />
  );
};

export default CompetitionsCard;
