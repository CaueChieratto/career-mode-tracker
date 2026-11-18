import { FieldMarkings } from "./components/FieldMarkings";
import { SlotButton } from "./components/SlotButton";
import Styles from "./Section.module.css";
import { PlayerMatchStat } from "../../../../../../common/interfaces/PlayerMatchStat";
import { LineupState } from "../../types";

type SectionProps = {
  lineup: LineupState;
  selectingSlotId?: string | null;
  openPlayerPicker?: (slotId: string) => void;
  removePlayer?: (slotId: string) => void;
  swapPlayers?: (idA: string, idB: string) => void;
  onPlayerClick?: (playerId: string) => void;
  onOpenModal?: (playerId: string) => void;
  playerStats?: PlayerMatchStat[];
  mvpId?: string | null;
  isFromGeral?: boolean;
};

export const Section = ({
  lineup,
  selectingSlotId,
  openPlayerPicker,
  removePlayer,
  swapPlayers,
  onPlayerClick,
  onOpenModal,
  mvpId,
  playerStats,
  isFromGeral,
}: SectionProps) => {
  const getGapSize = (playersCount: number) => {
    if (playersCount >= 5) return "13px";
    if (playersCount === 4) return "30px";
    if (playersCount === 3) return "65px";
    return "60px";
  };

  const handleSlotClick =
    isFromGeral && onOpenModal ? onOpenModal : onPlayerClick;

  return (
    <div className={Styles.field_wrapper}>
      <div className={Styles.field}>
        <FieldMarkings />

        {[...lineup.lines].reverse().map((line, reversedIndex) => {
          const lineIndex = lineup.lines.length - 1 - reversedIndex;
          return (
            <div
              key={`line-${lineIndex}`}
              className={Styles.field_line}
              style={{ gap: getGapSize(line.length) }}
            >
              {line.map((slot) => (
                <div key={slot.slotId} className={Styles.field_slot}>
                  <SlotButton
                    slot={slot}
                    isFromGeral={isFromGeral}
                    isSelecting={
                      selectingSlotId !== undefined
                        ? selectingSlotId === slot.slotId
                        : undefined
                    }
                    onOpen={
                      openPlayerPicker
                        ? () => openPlayerPicker(slot.slotId)
                        : undefined
                    }
                    onRemove={
                      removePlayer
                        ? () => removePlayer(slot.slotId)
                        : undefined
                    }
                    onSwap={
                      swapPlayers
                        ? (targetId) => swapPlayers(slot.slotId, targetId)
                        : undefined
                    }
                    onPlayerClick={handleSlotClick}
                    playerStats={playerStats}
                    mvpId={mvpId}
                  />
                </div>
              ))}
            </div>
          );
        })}

        <div className={Styles.field_line}>
          <div className={Styles.field_slot}>
            <SlotButton
              slot={lineup.goalkeeper}
              isFromGeral={isFromGeral}
              isSelecting={
                selectingSlotId !== undefined
                  ? selectingSlotId === "gk-0"
                  : undefined
              }
              onOpen={
                openPlayerPicker
                  ? () => openPlayerPicker("gk-0")
                  : undefined
              }
              onRemove={
                removePlayer
                  ? () => removePlayer("gk-0")
                  : undefined
              }
              onSwap={
                swapPlayers
                  ? (targetId) => swapPlayers("gk-0", targetId)
                  : undefined
              }
              onPlayerClick={handleSlotClick}
              playerStats={playerStats}
              mvpId={mvpId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
