import Button from "../../../../../../../../../../components/Button";
import { AcademyMatches } from "../../../../../../interfaces/AcademyTournaments/AcademyMatches/AcademyMatches";
import { useManageMatch } from "./hooks/useManageMatch";
import { ScoreRow } from "./components/ScoreRow";
import { LineupSection } from "./components/LineupSection";
import { StatsCard } from "./components/StatsCard";
import { useScrollToStatsCard } from "./hooks/useScrollToStatsCard";
import Styles from "./ManageMatchView.module.css";

type ManageMatchViewProps = {
  match: AcademyMatches;
  onBack: () => void;
};

export const ManageMatchView = ({ match, onBack }: ManageMatchViewProps) => {
  const {
    userGoals,
    setUserGoals,
    opponentGoals,
    setOpponentGoals,
    userPenalties,
    setUserPenalties,
    opponentPenalties,
    setOpponentPenalties,
    lineupStats,
    selectedSearchValue,
    setSelectedSearchValue,
    isSaving,
    isSavingStats,
    selectedPlayerIdForStats,
    setSelectedPlayerIdForStats,
    availablePlayerNames,
    handleAddPlayer,
    handleRemovePlayer,
    handleStatChange,
    handleSavePlayerStats,
    handleSave,
    selectedStats,
    playersAcademy,
    allPlayersAcademy,
  } = useManageMatch(match, onBack);
  const statsCardRef = useScrollToStatsCard(selectedPlayerIdForStats);

  return (
    <div className={Styles.container}>
      <ScoreRow
        userGoals={userGoals}
        setUserGoals={setUserGoals}
        opponentGoals={opponentGoals}
        setOpponentGoals={setOpponentGoals}
        userPenalties={userPenalties}
        setUserPenalties={setUserPenalties}
        opponentPenalties={opponentPenalties}
        setOpponentPenalties={setOpponentPenalties}
        opponentTeam={match.opponentTeam}
      />
      <LineupSection
        availablePlayerNames={availablePlayerNames}
        selectedSearchValue={selectedSearchValue}
        setSelectedSearchValue={setSelectedSearchValue}
        handleAddPlayer={handleAddPlayer}
        isSaving={isSaving}
        lineupStats={lineupStats}
        playersAcademy={allPlayersAcademy}
        selectedPlayerIdForStats={selectedPlayerIdForStats}
        setSelectedPlayerIdForStats={setSelectedPlayerIdForStats}
        handleRemovePlayer={handleRemovePlayer}
      />
      {selectedPlayerIdForStats && selectedStats && (
        <div ref={statsCardRef}>
          <StatsCard
            selectedStats={selectedStats}
            selectedPlayerIdForStats={selectedPlayerIdForStats}
            handleStatChange={handleStatChange}
            handleSavePlayerStats={handleSavePlayerStats}
            isSavingStats={isSavingStats}
            playerPosition={
              playersAcademy.find((p) => p.id === selectedPlayerIdForStats)
                ?.position
            }
          />
        </div>
      )}
      <Button
        className={Styles.saveBtn}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? "Salvando Partida..." : "Salvar Partida"}
      </Button>
    </div>
  );
};
