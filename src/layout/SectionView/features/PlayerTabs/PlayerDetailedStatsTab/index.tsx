import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { ContainerClubContent } from "../../../../../components/ContainerClubContent";
import NoStatsMessage from "../../../../../components/NoStatsMessage";
import { statConfigs } from "../../ClubTabs/BestPlayersTab/constants/statConfigs";
import { UseRatingColor } from "../../../../../common/hooks/Colors/GetOverallColor";
import Card from "../../../../../ui/Card";
import { PlayerSeasonSkeleton } from "../ui/PlayerSeasonSkeleton";
import { usePlayerStats } from "./hooks/usePlayerStats";

import Styles from "./PlayerDetailedStatsTab.module.css";

type PlayerDetailedStatsTabProps = {
  season: ClubData;
  career: Career;
  player?: Players;
};

const PlayerDetailedStatsTab = ({
  season,
  career,
  player,
}: PlayerDetailedStatsTabProps) => {
  const { playerStats, isLoadingGroup, isGeralPage } = usePlayerStats({
    season,
    career,
    player,
  });

  if (isLoadingGroup) {
    return (
      <ContainerClubContent>
        <PlayerSeasonSkeleton count={1} />
      </ContainerClubContent>
    );
  }

  if (!playerStats || playerStats.games === 0) {
    return (
      <ContainerClubContent>
        <NoStatsMessage
          textOne="Nenhuma estatística detalhada"
          textTwo={
            isGeralPage
              ? "Este jogador não possui estatísticas detalhadas de partidas registradas no geral."
              : "Este jogador não possui estatísticas detalhadas de partidas registradas nesta temporada."
          }
        />
      </ContainerClubContent>
    );
  }

  return (
    <ContainerClubContent>
      <Card className={Styles.card}>
        <h2 className={Styles.title}>Estatísticas Detalhadas</h2>
        <div className={Styles.grid}>
          {statConfigs.map((config) => {
            const rawValue = playerStats[config.key] as number;

            if (
              rawValue === 0 ||
              rawValue === null ||
              rawValue === undefined ||
              Number.isNaN(rawValue)
            ) {
              return null;
            }

            const displayValue = config.format
              ? config.format(rawValue)
              : Number.isInteger(rawValue)
                ? rawValue
                : rawValue.toFixed(1);

            return (
              <div key={config.key} className={Styles.statItem}>
                <span className={Styles.statTitle}>{config.title}</span>
                {config.isRating ? (
                  <span
                    className={Styles.ratingBadge}
                    style={{ backgroundColor: UseRatingColor(+rawValue) }}
                  >
                    {Number(rawValue) % 1 === 0
                      ? Number(rawValue).toString()
                      : displayValue}
                  </span>
                ) : (
                  <span className={Styles.statValue}>{displayValue}</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </ContainerClubContent>
  );
};

export default PlayerDetailedStatsTab;
