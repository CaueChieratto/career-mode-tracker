import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { usePlayerSearch } from "./hooks/usePlayerSearch";
import Styles from "./PlayerPicker.module.css";

type PlayerPickerProps = {
  players: Players[];
  assignedIds: Set<string>;
  activeSlotId: string;
  onSelect: (player: Players) => void;
};

export const PlayerPicker = ({
  players,
  assignedIds,
  activeSlotId,
  onSelect,
}: PlayerPickerProps) => {
  const { search, setSearch, searchRef, availablePlayers } = usePlayerSearch(
    players,
    assignedIds,
    activeSlotId,
  );

  return (
    <div className={Styles.picker_container}>
      <input
        ref={searchRef}
        className={Styles.picker_search}
        placeholder="Buscar jogador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={Styles.picker_list}>
        {availablePlayers.length === 0 && (
          <p className={Styles.picker_empty}>Nenhum jogador disponível</p>
        )}
        {availablePlayers.map((player) => (
          <button
            key={player.id}
            className={Styles.picker_item}
            onClick={() => onSelect(player)}
            type="button"
          >
            <span className={Styles.picker_name}>{player.name}</span>
            <div className={Styles.picker_meta}>
              <span className={Styles.picker_pos}>{player.position}</span>
              <span className={Styles.picker_shirt_number}>
                {player.shirtNumber}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
