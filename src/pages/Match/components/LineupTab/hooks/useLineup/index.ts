import { useMemo, useState, useCallback } from "react";
import { ClubData } from "../../../../../../common/interfaces/club/clubData";
import { SavedLineup } from "../../../../../../common/interfaces/Lineup";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { Formation, FORMATIONS } from "../../../../constants/Formations";
import { assignPlayerToSlot } from "../../helpers/assignPlayerToSlot";
import { buildLineupAfterFormationChange } from "../../helpers/buildLineupAfterFormationChange";
import { buildSavedLineupSnapshot } from "../../helpers/buildSavedLineup";
import { getAssignedPlayerIds } from "../../helpers/getAssignedPlayerIds";
import {
  resolveInitialFormation,
  resolveInitialState,
} from "../../helpers/lineupInitializers";
import { removePlayerFromSlot } from "../../helpers/removePlayerFromSlot";
import { swapLineupPlayers } from "../../helpers/swapLineupPlayers";
import { scheduleLineupSlotScroll } from "../../services/scheduleLineupSlotScroll";
import { LineupState } from "../../types";

export const useLineup = (season: ClubData, initialLineup?: SavedLineup) => {
  const initialFormation = useMemo(
    () => resolveInitialFormation(initialLineup),
    [initialLineup],
  );

  const [selectedFormation, setSelectedFormation] =
    useState<Formation>(initialFormation);

  const [lineup, setLineup] = useState<LineupState>(() =>
    resolveInitialState(initialFormation, season, initialLineup),
  );

  const [selectingSlotId, setSelectingSlotId] = useState<string | null>(null);

  const swapPlayers = useCallback(
    (firstSlotId: string, secondSlotId: string) => {
      setLineup((currentLineup) =>
        swapLineupPlayers(currentLineup, firstSlotId, secondSlotId),
      );
    },
    [],
  );

  const handleFormationChange = useCallback((formationName: string) => {
    const formation = FORMATIONS.find(({ name }) => name === formationName);

    if (!formation) {
      return;
    }

    setSelectedFormation(formation);
    setSelectingSlotId(null);

    setLineup((currentLineup) =>
      buildLineupAfterFormationChange(currentLineup, formation),
    );
  }, []);

  const openPlayerPicker = useCallback((slotId: string) => {
    setSelectingSlotId((currentSlotId) =>
      currentSlotId === slotId ? null : slotId,
    );
  }, []);

  const closePlayerPicker = useCallback(() => {
    setSelectingSlotId(null);
  }, []);

  const assignPlayer = useCallback(
    (player: Players) => {
      if (!selectingSlotId) {
        return;
      }

      const targetSlotId = selectingSlotId;

      setLineup((currentLineup) =>
        assignPlayerToSlot(currentLineup, targetSlotId, player),
      );

      setSelectingSlotId(null);
      scheduleLineupSlotScroll(targetSlotId);
    },
    [selectingSlotId],
  );

  const removePlayer = useCallback((slotId: string) => {
    setLineup((currentLineup) => removePlayerFromSlot(currentLineup, slotId));

    setSelectingSlotId(null);
  }, []);

  const buildSavedLineup = useCallback(
    (): SavedLineup => buildSavedLineupSnapshot(lineup, selectedFormation),
    [lineup, selectedFormation],
  );

  const assignedPlayerIds = useMemo(
    () => getAssignedPlayerIds(lineup, selectingSlotId),
    [lineup, selectingSlotId],
  );

  const activePlayers = useMemo(
    () => season.players.filter((player) => !player.sell),
    [season.players],
  );

  return {
    selectedFormation,
    lineup,
    selectingSlotId,
    assignedPlayerIds,
    activePlayers,
    handleFormationChange,
    openPlayerPicker,
    closePlayerPicker,
    assignPlayer,
    removePlayer,
    buildSavedLineup,
    swapPlayers,
  };
};
