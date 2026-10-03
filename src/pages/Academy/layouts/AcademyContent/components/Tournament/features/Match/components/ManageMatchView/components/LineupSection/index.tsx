import Button from "../../../../../../../../../../../../components/Button";
import SearchableSelect from "../../../../../../../../../../../../components/SearchableSelect";
import { AcademyPlayers } from "../../../../../../../../interfaces/AcademyPlayers/AcademyPlayers";
import { PlayerMatchesStats } from "../../../../../../../../interfaces/AcademyTournaments/AcademyMatches/PlayerMatchesStats";
import { PlayerItem } from "../../../../../../../Player/components/PlayerItem";
import Styles from "./LineupSection.module.css";

type LineupSectionProps = {
  availablePlayerNames: string[];
  selectedSearchValue: string;
  setSelectedSearchValue: (val: string) => void;
  handleAddPlayer: () => void;
  isSaving: boolean;
  lineupStats: PlayerMatchesStats[];
  playersAcademy: AcademyPlayers[];
  selectedPlayerIdForStats: string | null;
  setSelectedPlayerIdForStats: (id: string | null) => void;
  handleRemovePlayer: (id: string) => void;
};

export const LineupSection = ({
  availablePlayerNames,
  selectedSearchValue,
  setSelectedSearchValue,
  handleAddPlayer,
  isSaving,
  lineupStats,
  playersAcademy,
  selectedPlayerIdForStats,
  setSelectedPlayerIdForStats,
  handleRemovePlayer,
}: LineupSectionProps) => {
  return (
    <div>
      <h3 className={Styles.sectionTitle}>Escalação (Quem jogou?)</h3>
      <div className={Styles.addPlayerRow}>
        <div style={{ flex: 1 }}>
          <SearchableSelect
            name="addPlayerSelect"
            options={availablePlayerNames.filter((name) =>
              name.toLowerCase().includes(selectedSearchValue.toLowerCase()),
            )}
            value={selectedSearchValue}
            placeholder="Buscar jogador..."
            onChange={(e) => setSelectedSearchValue(e.target.value)}
          />
        </div>
        <Button
          className={Styles.addBtn}
          onClick={handleAddPlayer}
          disabled={isSaving}
        >
          {isSaving ? "..." : "Adicionar"}
        </Button>
      </div>

      {lineupStats.length === 0 ? (
        <p className={Styles.emptyText}>Nenhum jogador na escalação.</p>
      ) : (
        <div className={Styles.playerList}>
          {lineupStats.map((stat) => {
            const player = playersAcademy.find(
              (p) =>
                String(p.id).trim() === String(stat.playerId).trim() ||
                (Boolean(p.name) &&
                  Boolean(stat.playerName) &&
                  p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase()),
            );
            if (!player) return null;

            return (
              <PlayerItem
                key={player.id}
                playersAcademy={player}
                isSelected={selectedPlayerIdForStats === player.id}
                onClick={() =>
                  setSelectedPlayerIdForStats(
                    selectedPlayerIdForStats === player.id ? null : player.id,
                  )
                }
                onDelete={() => handleRemovePlayer(player.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
