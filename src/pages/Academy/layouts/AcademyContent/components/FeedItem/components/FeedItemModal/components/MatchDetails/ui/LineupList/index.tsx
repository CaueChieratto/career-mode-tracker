import { GiSoccerBall } from "react-icons/gi";
import { FeedEvent } from "../../../../../../types/FeedEvent";
import Styles from "./LineupList.module.css";
import { UseRatingColor } from "../../../../../../../../../../../../common/hooks/Colors/GetOverallColor";
import { MdSportsHandball } from "react-icons/md";
import { RatingBackground } from "../../../../../../../../ui/PlayerItem/components/RatingBackground";
import { PlayerItem } from "../../../../../../../../ui/PlayerItem";
import { PlayerName } from "../../../../../../../../ui/PlayerItem/components/PlayerName";
import { StatsGroup } from "../../../../../../../../ui/PlayerItem/components/StatsGroup";
import { PlayerStats } from "../../../../../../../../ui/PlayerItem/components/PlayerStats";
import { Boot } from "../../../../../../../../../../../../ui/IconsSVG/Boot";
import { useTheme } from "../../../../../../../../../../../../contexts/LightThemeContext";
import { AcademyPlayers } from "../../../../../../../../interfaces/AcademyPlayers/AcademyPlayers";

type LineupListProps = {
  details: NonNullable<FeedEvent["details"]>;
  allPlayersAcademy: AcademyPlayers[];
};

export const LineupList = ({ details, allPlayersAcademy }: LineupListProps) => {
  const { theme } = useTheme();

  const playersWithStats = (details.lineup || []).filter(
    (p) => p.rating !== null || (p.goals && p.goals > 0),
  );

  const BootIcon = () => <Boot isWhite={theme === "dark"} />;

  return (
    <>
      {playersWithStats.length > 0 && (
        <div className={Styles.lineupList}>
          <strong>Destaques da Partida:</strong>
          {playersWithStats.map((player, i) => {
            const goals = player.goals ?? 0;
            const assists = player.assists ?? 0;
            const defesas = player.defesas ?? 0;
            const rating = player.rating !== null ? player.rating : 0;
            const isGoalkeeper = allPlayersAcademy.find(
              (academyPlayer) => academyPlayer.id === player.playerId,
            )?.position === "GOL";

            const colorRating = UseRatingColor(rating);

            return (
              <PlayerItem key={i}>
                <PlayerName playerName={player.playerName} />

                <StatsGroup>
                  <PlayerStats>
                    <RatingBackground
                      colorRating={colorRating}
                      rating={rating}
                    />
                  </PlayerStats>

                  {isGoalkeeper ? (
                    <PlayerStats icon={MdSportsHandball} stat={defesas} />
                  ) : (
                    <PlayerStats icon={GiSoccerBall} stat={goals} />
                  )}

                  <PlayerStats icon={BootIcon} stat={assists} />
                </StatsGroup>
              </PlayerItem>
            );
          })}
        </div>
      )}
    </>
  );
};
