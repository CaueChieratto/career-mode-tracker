import React from "react";
import Styles from "../../../AcademyContent.module.css";
import { AcademyPlayers } from "../../../../../../../common/interfaces/AcademyData";
import { PlayerItem } from "../../Player/components/PlayerItem";
import { PlayerStatusList } from "../../Player/components/PlayerStatusList";

interface AcademyPlayersCardContentProps {
  playersAcademy: AcademyPlayers[];
  allPlayersAcademy: AcademyPlayers[];
  playerListMode: "academy" | "promoted" | "released";
  activeCardIndex: number | null;
  selectedPlayerId: string | null;
  onPlayerClick: (playerId: string) => void;
  playerSort: string;
}

export const AcademyPlayersCardContent: React.FC<
  AcademyPlayersCardContentProps
> = ({
  playersAcademy,
  allPlayersAcademy,
  playerListMode,
  activeCardIndex,
  selectedPlayerId,
  onPlayerClick,
  playerSort,
}) => {
  return (
    <div className={Styles.wrapper}>
      {playerListMode === "academy" ? (
        playersAcademy.length > 0 ? (
          (activeCardIndex === 0 || selectedPlayerId !== null
            ? playersAcademy
            : playersAcademy.slice(0, 3)
          ).map((player) => (
            <PlayerItem
              key={player.id}
              playersAcademy={player}
              onClick={() => onPlayerClick(player.id)}
              isSelected={player.id === selectedPlayerId}
            />
          ))
        ) : (
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-tertiary)",
              textAlign: "center",
              margin: "10px 0",
            }}
          >
            Nenhum jogador na base.
          </p>
        )
      ) : (
        <PlayerStatusList
          players={allPlayersAcademy}
          status={playerListMode}
          activeCardIndex={activeCardIndex}
          cardIndex={0}
          selectedPlayerId={selectedPlayerId}
          onPlayerClick={onPlayerClick}
          currentSort={playerSort}
        />
      )}
    </div>
  );
};
