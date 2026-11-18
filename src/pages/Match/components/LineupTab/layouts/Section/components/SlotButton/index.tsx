import { UseMatchRatingColor } from "../../../../../../../../common/hooks/Colors/GetOverallColor";
import { PlayerMatchStat } from "../../../../../../../../common/interfaces/PlayerMatchStat";
import { LineupSlot } from "../../../../types";
import { PlayerDetails } from "./components/PlayerDetails";
import { useSlotDrag } from "./hooks/useSlotDrag";
import { useLineupTabContext } from "../../../../contexts/context";
import Styles from "./SlotButton.module.css";

type SlotButtonProps = {
  slot: LineupSlot;
  isSelecting?: boolean;
  onOpen?: () => void;
  onRemove?: () => void;
  onSwap?: (targetId: string) => void;
  onPlayerClick?: (playerId: string) => void;
  playerStats?: PlayerMatchStat[];
  mvpId?: string | null;
  isFromGeral?: boolean;
};

export const SlotButton = ({
  slot,
  isSelecting: propIsSelecting,
  onOpen: propOnOpen,
  onRemove: propOnRemove,
  onSwap: propOnSwap,
  onPlayerClick: propOnPlayerClick,
  mvpId: propMvpId,
  playerStats: propPlayerStats,
  isFromGeral: propIsFromGeral,
}: SlotButtonProps) => {
  const ctx = useLineupTabContext();

  const isSelecting = propIsSelecting ?? (ctx.selectingSlotId === slot.slotId);
  const onOpen = propOnOpen ?? (() => ctx.openPlayerPicker(slot.slotId));
  const onRemove = propOnRemove ?? (() => ctx.removePlayer(slot.slotId));
  const onSwap =
    propOnSwap ?? ((targetId: string) => ctx.swapPlayers(slot.slotId, targetId));
  const isFromGeral = propIsFromGeral ?? ctx.isFromGeral;
  const onPlayerClick =
    propOnPlayerClick ??
    (isFromGeral && ctx.onOpenModal ? ctx.onOpenModal : ctx.onPlayerClick);
  const mvpId = propMvpId ?? ctx.mvpId;

  const stats = slot.player
    ? propPlayerStats
      ? propPlayerStats.find((s) => s.playerId === slot.player!.id)
      : ctx.playerStatsById.get(slot.player.id)
    : undefined;
  const ratingValue = stats?.rating;
  const backgroundColor = UseMatchRatingColor(ratingValue!);
  const isMVP = slot.player ? mvpId === slot.player!.id : false;

  const clickAction = slot.player
    ? () => onPlayerClick(slot.player!.id)
    : onOpen;

  const {
    isDragging,
    dragPos,
    handlePointerDown,
    handlePointerMove,
    clearTimer,
    handleClick,
  } = useSlotDrag({
    slotId: slot.slotId,
    onSwap,
    onOpen: clickAction,
    disabled: isFromGeral,
  });

  if (slot.player) {
    return (
      <>
        <div
          data-slot-id={slot.slotId}
          className={`${Styles.slot_filled} swiper-no-swiping`}
          style={{ opacity: isDragging ? 0.3 : 1 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={clearTimer}
          onPointerLeave={clearTimer}
          onClick={(e) => {
            if (isFromGeral) {
              clickAction();
            } else {
              handleClick(e);
            }
          }}
        >
          <PlayerDetails
            isFromGeral={isFromGeral}
            player={slot.player}
            backgroundColor={backgroundColor}
            stats={stats}
            isMVP={isMVP}
            onRemove={onRemove}
          />
        </div>

        {isDragging && (
          <div
            className={Styles.slot_filled}
            style={{
              position: "fixed",
              left: dragPos.x,
              top: dragPos.y,
              transform: "translate(-50%, -50%) scale(1.1)",
              pointerEvents: "none",
              zIndex: 9999,
              opacity: 0.9,
            }}
          >
            <PlayerDetails
              isFromGeral={isFromGeral}
              player={slot.player}
              backgroundColor={backgroundColor}
              stats={stats}
              isMVP={isMVP}
            />
          </div>
        )}
      </>
    );
  }

  if (isFromGeral && !slot.player) {
    return null;
  }

  return (
    <button
      data-slot-id={slot.slotId}
      className={`${Styles.slot_empty} ${isSelecting ? Styles.slot_active : ""} swiper-no-swiping`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onClick={handleClick}
      type="button"
    >
      <span className={Styles.slot_plus}>+</span>
    </button>
  );
};
