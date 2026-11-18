import { useState, useMemo, useEffect, useRef } from "react";
import { Players } from "../../../../common/interfaces/playersInfo/players";
import { AugmentedCareer } from "../../../../common/interfaces/ComparePlayers";
import { getPositionRank } from "../../../../common/utils/Sorts";

export interface UsePlayerSlotSelectionParams {
  augmentedCareer: AugmentedCareer | null;
  availablePlayers: Players[];
  latestSeasonPlayerIds: Set<string>;
  isGeralPlayerCompare: boolean;
  compareMode: "season" | "total" | "none";
  playerId?: string;
}

export const usePlayerSlotSelection = ({
  augmentedCareer,
  availablePlayers,
  latestSeasonPlayerIds,
  isGeralPlayerCompare,
  compareMode,
  playerId,
}: UsePlayerSlotSelectionParams) => {
  const [player1, setPlayer1] = useState<Players | null>(null);
  const [player2, setPlayer2] = useState<Players | null>(null);
  const [activeSlot, setActiveSlot] = useState<1 | 2 | null>(null);
  const [searchValue, setSearchValue] = useState("");

  const player1Ref = useRef(player1);
  const player2Ref = useRef(player2);
  player1Ref.current = player1;
  player2Ref.current = player2;

  // Seleção inicial do atleta via rota
  useEffect(() => {
    if (playerId && augmentedCareer?.clubData) {
      for (const season of augmentedCareer.clubData) {
        const found = season.players.find(
          (p) => String(p.id) === String(playerId),
        );
        if (found) {
          setPlayer1(found);
          break;
        }
      }
    }
  }, [playerId, augmentedCareer]);

  // Sincronização dos atletas selecionados com base na lista de atletas disponíveis
  useEffect(() => {
    if (availablePlayers.length === 0) {
      if (!isGeralPlayerCompare) setPlayer1(null);
      setPlayer2(null);
      return;
    }

    const currentP1 = player1Ref.current;
    if (currentP1) {
      const matchingP1 = availablePlayers.find(
        (p) =>
          p.name.trim().toLowerCase() === currentP1.name.trim().toLowerCase(),
      );
      if (matchingP1) setPlayer1(matchingP1);
    }

    const currentP2 = player2Ref.current;
    if (currentP2) {
      const matchingP2 = availablePlayers.find(
        (p) =>
          p.name.trim().toLowerCase() === currentP2.name.trim().toLowerCase(),
      );
      setPlayer2(matchingP2 || null);
    } else {
      setPlayer2(null);
    }
  }, [availablePlayers, isGeralPlayerCompare]);

  const isSamePlayerSelected = useMemo(() => {
    if (!player1 || !player2) return false;
    return (
      player1.name.trim().toLowerCase() === player2.name.trim().toLowerCase()
    );
  }, [player1, player2]);

  useEffect(() => {
    if (compareMode === "total" && isSamePlayerSelected) {
      setPlayer2(null);
    }
  }, [compareMode, isSamePlayerSelected]);

  const getPlayerLabel = (p: Players) => `${p.name} - ${p.position}`;

  const filteredOptions = useMemo(() => {
    let options = availablePlayers;

    if (!isGeralPlayerCompare || compareMode === "total") {
      if (activeSlot === 1 && player2) {
        options = options.filter((p) =>
          compareMode === "total"
            ? p.name.trim().toLowerCase() !== player2.name.trim().toLowerCase()
            : String(p.id) !== String(player2.id),
        );
      } else if (activeSlot === 2 && player1) {
        options = options.filter((p) =>
          compareMode === "total"
            ? p.name.trim().toLowerCase() !== player1.name.trim().toLowerCase()
            : String(p.id) !== String(player1.id),
        );
      }
    }

    if (searchValue) {
      const lower = searchValue.toLowerCase();
      options = options.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.position.toLowerCase().includes(lower),
      );
    }

    return options
      .sort((a, b) => {
        const rankA = getPositionRank(a.position);
        const rankB = getPositionRank(b.position);

        if (rankA !== rankB) {
          return rankA - rankB;
        }

        const isLatestA = latestSeasonPlayerIds.has(String(a.id)) ? 1 : 0;
        const isLatestB = latestSeasonPlayerIds.has(String(b.id)) ? 1 : 0;

        if (isLatestA !== isLatestB) {
          return isLatestB - isLatestA;
        }

        return a.name.localeCompare(b.name);
      })
      .map(getPlayerLabel);
  }, [
    availablePlayers,
    searchValue,
    latestSeasonPlayerIds,
    activeSlot,
    player1,
    player2,
    isGeralPlayerCompare,
    compareMode,
  ]);

  const openSelection = (slot: 1 | 2) => {
    setActiveSlot(activeSlot === slot ? null : slot);
    setSearchValue("");
  };

  const handleSearchChange = (e: {
    target: { name: string; value: string };
  }) => {
    const val = e.target.value;
    setSearchValue(val);

    const exactMatch = availablePlayers.find((p) => getPlayerLabel(p) === val);
    if (exactMatch) {
      if (activeSlot === 1) {
        setPlayer1(exactMatch);
      } else if (activeSlot === 2) {
        setPlayer2(exactMatch);
      }

      setActiveSlot(null);
      setSearchValue("");
    }
  };

  return {
    player1,
    setPlayer1,
    player2,
    setPlayer2,
    activeSlot,
    searchValue,
    filteredOptions,
    isSamePlayerSelected,
    openSelection,
    handleSearchChange,
  };
};

