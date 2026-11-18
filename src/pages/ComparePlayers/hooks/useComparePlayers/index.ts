import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getAvailablePlayers } from "../../helpers/getAvailablePlayers";
import { getAggregatedStats } from "../../helpers/getAggregatedStats";
import { useCompareCareerData } from "./useCompareCareerData";
import { usePlayerSlotSelection } from "./usePlayerSlotSelection";

export const useComparePlayers = () => {
  const { careerId, seasonId, playerId } = useParams();
  const location = useLocation();

  const isGeralMode = location.pathname.includes("/Geral");
  const isGeralPlayerCompare = isGeralMode && !!playerId;

  const { augmentedCareer, latestSeasonPlayerIds, isLoading } =
    useCompareCareerData(careerId);

  const [compareMode, setCompareMode] = useState<"season" | "total" | "none">(
    isGeralPlayerCompare ? "none" : isGeralMode ? "total" : "season",
  );

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(
    seasonId,
  );
  const [selectedSeasonId2, setSelectedSeasonId2] = useState<
    string | undefined
  >();

  const availableSeasonsP1 = useMemo(() => {
    if (!augmentedCareer?.clubData || !playerId) return [];
    return augmentedCareer.clubData
      .filter((season) =>
        season.players.some((p) => String(p.id) === String(playerId)),
      )
      .map((s) => ({
        id: String(s.id),
        label: `Temporada ${s.seasonNumber}`,
      }));
  }, [augmentedCareer, playerId]);

  useEffect(() => {
    if (!selectedSeasonId && availableSeasonsP1.length > 0) {
      setSelectedSeasonId(availableSeasonsP1[0].id);
    }
  }, [availableSeasonsP1, selectedSeasonId]);

  const availablePlayers = useMemo(() => {
    if (isGeralPlayerCompare) {
      return getAvailablePlayers(augmentedCareer, undefined, "total");
    }
    return getAvailablePlayers(augmentedCareer, selectedSeasonId, compareMode);
  }, [augmentedCareer, selectedSeasonId, compareMode, isGeralPlayerCompare]);

  const {
    player1,
    player2,
    activeSlot,
    searchValue,
    filteredOptions,
    isSamePlayerSelected,
    openSelection,
    handleSearchChange,
  } = usePlayerSlotSelection({
    augmentedCareer,
    availablePlayers,
    latestSeasonPlayerIds,
    isGeralPlayerCompare,
    compareMode,
    playerId,
  });

  const availableSeasonsP2 = useMemo(() => {
    if (!augmentedCareer?.clubData || !player2) return [];

    const normalizedName = player2.name.trim().toLowerCase();
    const normalizedNation = player2.nation.trim().toLowerCase();

    let filtered = augmentedCareer.clubData.filter((season) =>
      season.players.some(
        (p) =>
          p.name.trim().toLowerCase() === normalizedName &&
          p.nation.trim().toLowerCase() === normalizedNation,
      ),
    );

    if (isSamePlayerSelected) {
      filtered = filtered.filter(
        (s) => String(s.id) !== String(selectedSeasonId),
      );
    }

    return filtered.map((s) => ({
      id: String(s.id),
      label: `Temporada ${s.seasonNumber}`,
    }));
  }, [augmentedCareer, player2, isSamePlayerSelected, selectedSeasonId]);

  useEffect(() => {
    if (availableSeasonsP2.length > 0) {
      const exists = availableSeasonsP2.some(
        (s) => s.id === String(selectedSeasonId2),
      );
      if (!exists) {
        setSelectedSeasonId2(availableSeasonsP2[0].id);
      }
    } else {
      setSelectedSeasonId2(undefined);
    }
  }, [availableSeasonsP2, selectedSeasonId2]);

  const handleSeasonChange = (e: {
    target: { name: string; value: string };
  }) => {
    const found = availableSeasonsP1.find((s) => s.label === e.target.value);
    if (found) {
      setSelectedSeasonId(found.id);
    }
  };

  const handleSeasonChange2 = (e: {
    target: { name: string; value: string };
  }) => {
    const found = availableSeasonsP2.find((s) => s.label === e.target.value);
    if (found) {
      setSelectedSeasonId2(found.id);
    }
  };

  const player1Effective = useMemo(() => {
    if (!player1 || !augmentedCareer) return null;

    if (compareMode === "total") return player1;

    const season = augmentedCareer.clubData.find(
      (s) => String(s.id) === String(selectedSeasonId),
    );
    if (!season) return player1;
    return (
      season.players.find(
        (p) =>
          p.name.trim().toLowerCase() === player1.name.trim().toLowerCase(),
      ) || player1
    );
  }, [player1, augmentedCareer, selectedSeasonId, compareMode]);

  const player2Effective = useMemo(() => {
    if (!player2 || !augmentedCareer) return null;
    if (compareMode === "total") return player2;

    const targetSeasonId =
      isGeralPlayerCompare && compareMode === "season"
        ? selectedSeasonId2
        : selectedSeasonId;
    const season = augmentedCareer.clubData.find(
      (s) => String(s.id) === String(targetSeasonId),
    );
    if (!season) return player2;
    return (
      season.players.find(
        (p) =>
          p.name.trim().toLowerCase() === player2.name.trim().toLowerCase(),
      ) || player2
    );
  }, [
    player2,
    augmentedCareer,
    selectedSeasonId2,
    selectedSeasonId,
    isGeralPlayerCompare,
    compareMode,
  ]);

  const p1Stats = useMemo(
    () =>
      getAggregatedStats(
        player1Effective,
        augmentedCareer,
        selectedSeasonId,
        compareMode,
      ),
    [player1Effective, augmentedCareer, selectedSeasonId, compareMode],
  );

  const p2Stats = useMemo(() => {
    const targetSeasonId =
      isGeralPlayerCompare && compareMode === "season"
        ? selectedSeasonId2
        : selectedSeasonId;
    return getAggregatedStats(
      player2Effective,
      augmentedCareer,
      targetSeasonId,
      compareMode,
    );
  }, [
    player2Effective,
    augmentedCareer,
    selectedSeasonId2,
    selectedSeasonId,
    isGeralPlayerCompare,
    compareMode,
  ]);

  return {
    state: {
      isLoading,
      playerId,
      player1: player1Effective,
      player2: player2Effective,
      activeSlot,
      searchValue,
      filteredOptions,
      compareMode,
      p1Stats,
      p2Stats,
      seasonOptions: availableSeasonsP1.map((s) => s.label),
      selectedSeasonLabel:
        availableSeasonsP1.find((s) => s.id === String(selectedSeasonId))
          ?.label || "",
      isGeralMode,
      selectedSeasonId,
      isSamePlayerSelected,
      seasonOptions2: availableSeasonsP2.map((s) => s.label),
      selectedSeasonLabel2:
        availableSeasonsP2.find((s) => s.id === String(selectedSeasonId2))
          ?.label || "",
    },
    actions: {
      setCompareMode,
      openSelection,
      handleSearchChange,
      handleSeasonChange,
      handleSeasonChange2,
    },
  };
};
