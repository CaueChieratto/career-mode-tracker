import { useMemo } from "react";
import { AcademyPlayers } from "../../../../../../../../common/interfaces/AcademyData";
import { PlayerItem } from "../PlayerItem";
import Styles from "../../../../AcademyContent.module.css";

type PlayerStatusListProps = {
  players: AcademyPlayers[];
  status: "promoted" | "released";
  activeCardIndex: number | null;
  cardIndex: number;
  selectedPlayerId: string | null;
  onPlayerClick: (playerId: string) => void;
  currentSort: string;
};

export const PlayerStatusList = ({
  players,
  status,
  activeCardIndex,
  cardIndex,
  selectedPlayerId,
  onPlayerClick,
  currentSort,
}: PlayerStatusListProps) => {
  const filteredPlayers = useMemo(() => {
    return [...players]
      .filter((p) => p.status === status)
      .sort((a, b) => {
        switch (currentSort) {
          case "overall-desc":
            return b.overall - a.overall;
          case "potential-desc": {
            const potA = parseInt(a.potential.split("-")[1] || "0", 10);
            const potB = parseInt(b.potential.split("-")[1] || "0", 10);
            return potB - potA;
          }
          case "age-asc":
            return a.age - b.age;
          case "arrival-desc":
          default: {
            const parseDate = (dateStr?: string) => {
              if (!dateStr) return 0;
              const [day, month, year] = dateStr.split("/");
              if (!day || !month || !year) return 0;
              return new Date(
                Number(year),
                Number(month) - 1,
                Number(day),
              ).getTime();
            };
            return parseDate(b.exitDate) - parseDate(a.exitDate);
          }
        }
      });
  }, [players, status, currentSort]);

  const emptyMessage =
    status === "promoted"
      ? "Nenhum jogador promovido."
      : "Nenhum jogador dispensado.";

  return (
    <div className={Styles.wrapper}>
      {filteredPlayers.length > 0 ? (
        (activeCardIndex === cardIndex || selectedPlayerId !== null
          ? filteredPlayers
          : filteredPlayers.slice(0, 3)
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
          {emptyMessage}
        </p>
      )}
    </div>
  );
};
