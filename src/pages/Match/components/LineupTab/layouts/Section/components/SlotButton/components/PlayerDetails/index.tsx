import { GiSoccerBall } from "react-icons/gi";
import { Players } from "../../../../../../../../../../common/interfaces/playersInfo/players";
import Styles from "./PlayerDetails.module.css";
import { Boot } from "../../../../../../../../../../ui/IconsSVG/Boot";
import { RefereeCard } from "../../../../../../../../../../ui/IconsSVG/RefereeCard";
import { Sub } from "../../../../../../../../../../ui/IconsSVG/Sub";
import { MVP } from "../../../../../../../../../../ui/IconsSVG/MVP";
import { PlayerMatchStat } from "../../../../../../../../../../common/interfaces/PlayerMatchStat";
import { NumberStats } from "../../../../../../../../ui/NumberStats";
import { OwnGoal } from "../../../../../../../../../../ui/IconsSVG/OwnGoal";
import { OverflowText } from "../../../../../../../../../../components/OverflowText";
import { PlayerCircle } from "./PlayerCircle";
import { formatPlayerName } from "../../../../../../../../../../common/utils/formatPlayerName";

type PlayerDetailsProps = {
  player: Players;
  backgroundColor: string;
  stats?: PlayerMatchStat;
  isMVP?: boolean;
  onRemove?: () => void;
  isFromGeral?: boolean;
};

export const PlayerDetails = ({
  player,
  backgroundColor,
  onRemove,
  isMVP,
  stats,
  isFromGeral,
}: PlayerDetailsProps) => (
  <div className={Styles.player_wrapper}>
    {!isFromGeral && (
      <button
        className={Styles.slot_remove}
        onClick={(e) => {
          e.stopPropagation();
          onRemove!();
        }}
        type="button"
        style={{
          top: stats?.rating != null && stats.rating > 0 ? "85px" : "65px",
        }}
      >
        ✕
      </button>
    )}

    <PlayerCircle shirtNumber={player.shirtNumber}>
      <div className={Styles.top_left_stats}>
        {stats?.secondYellowCard ? (
          <div className={Styles.stat_circle}>
            <RefereeCard type="second-yellow" />
          </div>
        ) : stats?.redCard ? (
          <div className={Styles.stat_circle}>
            <RefereeCard type="red" />
          </div>
        ) : stats?.yellowCard ? (
          <div className={Styles.stat_circle}>
            <RefereeCard type="yellow" />
          </div>
        ) : null}
      </div>

      <div className={Styles.mid_left_stats}>
        {stats?.substituteIn && stats.substituteIn !== "Nenhum" && (
          <div className={Styles.stat_circle}>
            <Sub />
          </div>
        )}
      </div>

      {isMVP && (
        <div className={Styles.bottom_left_stats}>
          <div className={Styles.container_mvp}>
            <div className={Styles.mvp}>
              <MVP />
            </div>
          </div>
        </div>
      )}

      <div className={Styles.top_right_stats}>
        {stats && stats.goals > 0 && (
          <div className={Styles.stat_circle}>
            <span className={Styles.stat_icon}>
              <GiSoccerBall />
            </span>
            {stats.goals > 1 && (
              <span className={Styles.stat_icon_number}>
                <NumberStats type="goals">{stats.goals}</NumberStats>
              </span>
            )}
          </div>
        )}
      </div>

      <div className={Styles.mid_right_stats}>
        {stats && stats.assists > 0 && (
          <div className={Styles.stat_circle}>
            <span className={Styles.stat_icon}>
              <Boot />
            </span>
            {stats.assists > 1 && (
              <span className={Styles.stat_icon_number}>
                <NumberStats type="goals">{stats.assists}</NumberStats>
              </span>
            )}
          </div>
        )}
      </div>

      <div className={Styles.bottom_right_stats}>
        {stats && stats.ownGoals && stats.ownGoals > 0 ? (
          <div className={Styles.stat_circle}>
            <span className={Styles.stat_icon}>
              <OwnGoal lineup />
            </span>
            {stats.ownGoals > 1 && (
              <span className={Styles.stat_icon_number}>
                <NumberStats type="goals">{stats.ownGoals}</NumberStats>
              </span>
            )}
          </div>
        ) : null}
      </div>

      {stats?.rating != null && stats.rating > 0 && (
        <span
          className={Styles.rating}
          style={{
            backgroundColor,
          }}
        >
          {stats.rating === 10 ? "10" : stats.rating.toFixed(1)}
        </span>
      )}
    </PlayerCircle>

    <div
      className={Styles.name_background}
      style={{
        marginTop: stats?.rating != null && stats.rating > 0 ? "20px" : "0",
      }}
    >
      {(() => {
        const displayName = formatPlayerName(player.name);
        return (
          <OverflowText
            disableDynamicMinWidth
            text={displayName}
            className={`${Styles.player_name_text} ${
              displayName.length > 8 ? Styles.long_name : ""
            }`}
            widthReference={40}
          />
        );
      })()}
    </div>
  </div>
);
