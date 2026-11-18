import { PlayerMatchesStats } from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { FormInput } from "../../../../../../../FormInput";
import Button from "../../../../../../../../../../../../components/Button";
import Styles from "./StatsCard.module.css";
import { formatRating } from "../../../../../../../../../../../../common/utils/FormatRating";

type StatsCardProps = {
  selectedStats: PlayerMatchesStats;
  selectedPlayerIdForStats: string;
  handleStatChange: (
    playerId: string,
    field: keyof PlayerMatchesStats,
    value: number | string,
  ) => void;
  handleSavePlayerStats: (playerId: string) => Promise<void>;
  isSavingStats: boolean;
  playerPosition?: string;
};

export const StatsCard = ({
  selectedStats,
  selectedPlayerIdForStats,
  handleStatChange,
  handleSavePlayerStats,
  isSavingStats,
  playerPosition,
}: StatsCardProps) => {
  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatRating(e.target.value);
    handleStatChange(selectedPlayerIdForStats, "rating", formattedValue);
  };

  const isGol = playerPosition === "GOL";

  return (
    <div className={Styles.statsCard}>
      <h3 className={Styles.sectionTitle}>
        Estatísticas: {selectedStats.playerName}
      </h3>

      <div className={isGol ? Styles.statsGridGol : Styles.statsGrid}>
        {isGol ? (
          <>
            <FormInput
              label="Defesas"
              type="number"
              min={0}
              placeholder="Ex: 4"
              value={
                selectedStats.defesas === null ||
                selectedStats.defesas === undefined
                  ? ""
                  : selectedStats.defesas
              }
              onChange={(e) =>
                handleStatChange(
                  selectedPlayerIdForStats,
                  "defesas",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
            <FormInput
              label="Nota"
              type="number"
              min={0}
              max={10}
              step={0.01}
              placeholder="Ex: 8,5"
              value={selectedStats.rating === null ? "" : selectedStats.rating}
              onChange={handleRatingChange}
            />
            <FormInput
              label="Gols"
              type="number"
              min={0}
              placeholder="Ex: 0"
              value={selectedStats.goals === null ? "" : selectedStats.goals}
              onChange={(e) =>
                handleStatChange(
                  selectedPlayerIdForStats,
                  "goals",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
            <FormInput
              label="Assistências"
              type="number"
              min={0}
              placeholder="Ex: 0"
              value={
                selectedStats.assists === null ? "" : selectedStats.assists
              }
              onChange={(e) =>
                handleStatChange(
                  selectedPlayerIdForStats,
                  "assists",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </>
        ) : (
          <>
            <FormInput
              label="Gols"
              type="number"
              min={0}
              placeholder="Ex: 3"
              value={selectedStats.goals === null ? "" : selectedStats.goals}
              onChange={(e) =>
                handleStatChange(
                  selectedPlayerIdForStats,
                  "goals",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
            <FormInput
              label="Assistências"
              type="number"
              min={0}
              placeholder="Ex: 1"
              value={
                selectedStats.assists === null ? "" : selectedStats.assists
              }
              onChange={(e) =>
                handleStatChange(
                  selectedPlayerIdForStats,
                  "assists",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
            <FormInput
              label="Nota"
              type="number"
              min={0}
              max={10}
              step={0.01}
              placeholder="Ex: 8,5"
              value={selectedStats.rating === null ? "" : selectedStats.rating}
              onChange={handleRatingChange}
            />
          </>
        )}
      </div>

      <div className={Styles.wrapperBtn}>
        <Button
          className={Styles.saveStatsBtn}
          onClick={() => handleSavePlayerStats(selectedPlayerIdForStats)}
          disabled={isSavingStats}
        >
          {isSavingStats ? "Salvando..." : "Salvar Estatísticas"}
        </Button>
      </div>
    </div>
  );
};
