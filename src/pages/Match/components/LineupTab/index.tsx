import { useEffect } from "react";
import { Bottom } from "./layouts/Bottom";
import { Header } from "./layouts/Header";
import { Section } from "./layouts/Section";
import { PlayerPicker } from "./components/PlayerPicker";
import { useLineupTabController } from "./hooks/useLineupTabController";
import type { LineupTabProps } from "./types";
import Styles from "./LineupTab.module.css";

export const LineupTab = ({
  season,
  career,
  match,
  isFromGeral,
  onRegisterSave,
  onOpenPlayerModal,
  onOpenScreen,
  onSaved,
  onPickerOpenChange,
}: LineupTabProps) => {
  const {
    selectedFormation,
    lineup,
    selectingSlotId,
    assignedPlayerIds,
    activePlayers,
    playerStats,
    mvpId,
    handleFormationChange,
    openPlayerPicker,
    closePlayerPicker,
    assignPlayer,
    removePlayer,
    swapPlayers,
    handlePlayerClick,
  } = useLineupTabController({
    season,
    match,
    onRegisterSave,
    onOpenScreen,
    onSaved,
  });

  useEffect(() => {
    onPickerOpenChange?.(Boolean(selectingSlotId));
  }, [selectingSlotId, onPickerOpenChange]);

  useEffect(() => {
    return () => {
      onPickerOpenChange?.(false);
    };
  }, [onPickerOpenChange]);

  return (
    <div
      className={Styles.wrapper}
      style={isFromGeral ? { gap: "0" } : undefined}
    >
      <div>
        <Header
          isFromGeral={isFromGeral}
          career={career}
          selectedFormation={selectedFormation}
          handleFormationChange={handleFormationChange}
        />

        <Section
          isFromGeral={isFromGeral}
          lineup={lineup}
          selectingSlotId={selectingSlotId}
          openPlayerPicker={openPlayerPicker}
          removePlayer={removePlayer}
          swapPlayers={swapPlayers}
          onPlayerClick={handlePlayerClick}
          onOpenModal={onOpenPlayerModal}
          playerStats={playerStats}
          mvpId={mvpId}
        />

        {selectingSlotId && !isFromGeral && (
          <PlayerPicker
            players={activePlayers}
            assignedIds={assignedPlayerIds}
            activeSlotId={selectingSlotId}
            onSelect={assignPlayer}
            onClose={closePlayerPicker}
          />
        )}
      </div>

      <Bottom
        isFromGeral={isFromGeral}
        lineup={lineup}
        selectingSlotId={selectingSlotId}
        openPlayerPicker={openPlayerPicker}
        removePlayer={removePlayer}
        onPlayerClick={handlePlayerClick}
        onOpenModal={onOpenPlayerModal}
        playerStats={playerStats}
        mvpId={mvpId}
        allPlayers={season.players}
      />
    </div>
  );
};
