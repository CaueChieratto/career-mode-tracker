import { GiSoccerBall } from "react-icons/gi";
import { UseMatchRatingColor } from "../../../../../../../../common/hooks/Colors/GetOverallColor";
import { Boot } from "../../../../../../../../ui/IconsSVG/Boot";
import { MVP } from "../../../../../../../../ui/IconsSVG/MVP";
import { RefereeCard } from "../../../../../../../../ui/IconsSVG/RefereeCard";
import { Sub } from "../../../../../../../../ui/IconsSVG/Sub";
import { UI_TEXT } from "../../constants/uiText";
import { BenchSlot } from "../../helpers/getBenchSlots";
import Styles from "./PlayerRow.module.css";
import { Row } from "../Row";
import { PlayerMatchStat } from "../../../../../../../../common/interfaces/PlayerMatchStat";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { NumberStats } from "../../../../../../ui/NumberStats";
import { OwnGoal } from "../../../../../../../../ui/IconsSVG/OwnGoal";
import { formatPlayerName } from "../../../../../../../../common/utils/formatPlayerName";

type PlayerRowProps = {
  slot: BenchSlot;
  onRemove: (slotId: string) => void;
  onPlayerClick: (playerId: string) => void;
  onOpenModal?: (playerId: string) => void;
  stats?: PlayerMatchStat;
  isMVP?: boolean;
  allStats?: PlayerMatchStat[];
  allPlayers?: Players[];
  isFromGeral?: boolean;
  chainSubMinute?: number;
  chainSubOutName?: string;
};

export const PlayerRow = ({
  slot,
  onRemove,
  onPlayerClick,
  onOpenModal,
  isMVP,
  stats,
  allPlayers,
  allStats,
  isFromGeral,
  chainSubMinute,
  chainSubOutName,
}: PlayerRowProps) => {
  if (!slot.player) return null;

  const ratingValue = stats?.rating || 0;
  const backgroundColor = UseMatchRatingColor(ratingValue);

  const handleRemove = () => onRemove(slot.slotId);

  let subMinute = 0;
  let subOutName = stats?.substituteIn;
  let showSub = false;

  if (
    stats?.substituteIn &&
    stats.substituteIn !== "Nenhum" &&
    allPlayers &&
    allStats
  ) {
    showSub = true;
    if (chainSubMinute !== undefined && chainSubMinute !== Infinity) {
      subMinute = chainSubMinute;
      subOutName = chainSubOutName;
    } else {
      const outPlayer = allPlayers.find((p) => p.name === stats.substituteIn);
      if (outPlayer) {
        const outPlayerStats = allStats.find(
          (s) => s.playerId === outPlayer.id,
        );
        subMinute = outPlayerStats?.minutesPlayed || 0;
      }
    }
  }

  const enteredGame =
    showSub || Boolean(stats?.minutesPlayed && stats.minutesPlayed > 0);

  return (
    <Row data-slot-id={slot.slotId}>
      <div
        className={Styles.player_info}
        style={
          (isFromGeral && enteredGame) || !isFromGeral
            ? { cursor: "pointer" }
            : undefined
        }
        onClick={() => {
          if (isFromGeral) {
            if (enteredGame && onOpenModal) {
              onOpenModal(slot.player!.id);
            }
          } else {
            onPlayerClick(slot.player!.id);
          }
        }}
      >
        <div className={Styles.player_name_row}>
          <span className={Styles.shirt_number}>{slot.player.shirtNumber}</span>
          <span className={Styles.player_name}>{formatPlayerName(slot.player.name)}</span>

          {stats && stats.goals > 0 && (
            <div className={Styles.icons}>
              <span className={Styles.icon_wrapper}>
                <GiSoccerBall size={14} />
              </span>
              {stats.goals > 1 && (
                <NumberStats type="bench">{stats.goals}</NumberStats>
              )}
            </div>
          )}
          {stats && stats.assists > 0 && (
            <div className={Styles.icons}>
              <span className={Styles.icon_wrapper}>
                <Boot />
              </span>
              {stats.assists > 1 && (
                <NumberStats type="bench">{stats.assists}</NumberStats>
              )}
            </div>
          )}
          {stats && stats.ownGoals && stats.ownGoals > 0 ? (
            <div className={Styles.icons}>
              <span className={Styles.icon_wrapper}>
                <OwnGoal lineup />
              </span>
              {stats.ownGoals > 1 && (
                <NumberStats type="bench">{stats.ownGoals}</NumberStats>
              )}
            </div>
          ) : null}
          {stats?.secondYellowCard ? (
            <span className={Styles.icon_wrapper}>
              <RefereeCard
                type="second-yellow"
                className={Styles.referee_card}
              />
            </span>
          ) : stats?.redCard ? (
            <span className={Styles.icon_wrapper}>
              <RefereeCard type="red" className={Styles.referee_card} />
            </span>
          ) : stats?.yellowCard ? (
            <span className={Styles.icon_wrapper}>
              <RefereeCard type="yellow" className={Styles.referee_card} />
            </span>
          ) : null}

          {isMVP && (
            <span className={Styles.icon_wrapper}>
              <MVP />
            </span>
          )}
        </div>
        {showSub && (
          <div className={Styles.player_sub_row}>
            <span className={Styles.sub_icon_wrapper}>
              <Sub className={Styles.sub_icon} />
            </span>
            <span className={Styles.sub_minute}>{subMinute}'</span>
            <span className={Styles.sub_out}>Saiu: {formatPlayerName(subOutName)}</span>
          </div>
        )}
      </div>

      {ratingValue > 0 && (
        <div className={Styles.rating} style={{ backgroundColor }}>
          {ratingValue === 10 ? "10" : ratingValue.toFixed(1)}
        </div>
      )}

      {!isFromGeral && (
        <button
          className={Styles.remove_button}
          onClick={handleRemove}
          type="button"
          title={UI_TEXT.removePlayer}
        >
          ✕
        </button>
      )}
    </Row>
  );
};
