import { FiPlus } from "react-icons/fi";
import Styles from "./PlayerSelectionCard.module.css";
import { Players } from "../../../../common/interfaces/playersInfo/players";
import { PlayerCircle } from "../../../Match/components/LineupTab/layouts/Section/components/SlotButton/components/PlayerDetails/PlayerCircle";
import { formatPlayerName } from "../../../../common/utils/formatPlayerName";

interface PlayerSelectionCardProps {
  player: Players | null;
  isActive?: boolean;
  isLocked?: boolean;
  onClick: () => void;
}

export const PlayerSelectionCard = ({
  player,
  isActive,
  isLocked = false,
  onClick,
}: PlayerSelectionCardProps) => {
  return (
    <div
      className={`${Styles.playerCard} ${isActive ? Styles.activeCard : ""} ${
        isLocked ? Styles.lockedCard : ""
      }`}
      onClick={isLocked ? undefined : onClick}
    >
      {player ? (
        <div className={Styles.selectedPlayer}>
          <PlayerCircle shirtNumber={player.shirtNumber} />
          <span className={Styles.playerName}>
            {formatPlayerName(player.name)}
          </span>
          {!isLocked && (
            <span className={Styles.changeText}>Trocar jogador</span>
          )}
        </div>
      ) : (
        <>
          <div className={Styles.plusIcon}>
            <FiPlus size={24} />
          </div>
          <span className={Styles.selectText}>Selecione o jogador</span>
        </>
      )}
    </div>
  );
};
