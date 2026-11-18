import { GiSoccerBall } from "react-icons/gi";
import { MdSportsHandball } from "react-icons/md";
import { UseRatingColor } from "../../../../../../common/hooks/Colors/GetOverallColor";
import { AcademyPlayers } from "../../../../../../common/interfaces/AcademyData";
import { useTheme } from "../../../../../../contexts/LightThemeContext";
import { Boot } from "../../../../../../ui/IconsSVG/Boot";
import { PlayerItem } from "../PlayerItem";
import { PlayerName } from "../PlayerItem/components/PlayerName";
import { PlayerStats } from "../PlayerItem/components/PlayerStats";
import { RatingBackground } from "../PlayerItem/components/RatingBackground";
import { StatsGroup } from "../PlayerItem/components/StatsGroup";

export type AcademyLineupPlayerEntry = {
  playerId: string;
  playerName: string;
  rating: number | null;
  goals?: number | null;
  assists?: number | null;
  defesas?: number | null;
};

export type AcademyMatchLineupListProps = {
  players: AcademyLineupPlayerEntry[];
  allPlayersAcademy: AcademyPlayers[];
};

export const AcademyMatchLineupList = ({
  players,
  allPlayersAcademy,
}: AcademyMatchLineupListProps) => {
  const { theme } = useTheme();
  const BootIcon = () => <Boot isWhite={theme === "dark"} />;

  return (
    <>
      {players.map((player, index) => {
        const rating = player.rating !== null ? player.rating : 0;
        const ratingColor = UseRatingColor(rating);
        const goals = player.goals ?? 0;
        const assists = player.assists ?? 0;
        const defesas = player.defesas ?? 0;

        const isGoalkeeper =
          allPlayersAcademy.find(
            (academyPlayer) =>
              String(academyPlayer.id).trim() ===
                String(player.playerId).trim() ||
              (Boolean(academyPlayer.name) &&
                Boolean(player.playerName) &&
                academyPlayer.name.trim().toLowerCase() ===
                  player.playerName.trim().toLowerCase()),
          )?.position === "GOL";

        return (
          <PlayerItem key={player.playerId || index}>
            <PlayerName playerName={player.playerName} />

            <StatsGroup>
              <PlayerStats>
                <RatingBackground colorRating={ratingColor} rating={rating} />
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
    </>
  );
};

export default AcademyMatchLineupList;
