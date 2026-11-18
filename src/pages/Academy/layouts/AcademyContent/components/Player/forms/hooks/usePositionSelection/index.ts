import { useMemo, useState, useEffect } from "react";
import {
  SECTOR_OPTIONS,
  positionOptionsBySector,
} from "../../../../../../../../../common/types/Positions";

const LEGACY_SECTOR_MAP: Record<string, string> = {
  Atacantes: "Ataque",
  Meias: "Meia",
  Defensores: "Defesa",
  Goleiros: "Goleiro",
};

const normalizeSector = (sec?: string): string => {
  if (!sec) return SECTOR_OPTIONS[0];
  return LEGACY_SECTOR_MAP[sec] || sec;
};

export const usePositionSelection = (
  initialSector?: string,
  initialPosition?: string,
) => {
  const sectorsList = useMemo(() => {
    return [...SECTOR_OPTIONS] as string[];
  }, []);

  const [sector, setSector] = useState<string>(() =>
    normalizeSector(initialSector),
  );

  const availablePositions = useMemo<string[]>(() => {
    const norm = normalizeSector(sector) as keyof typeof positionOptionsBySector;
    const positions = positionOptionsBySector[norm];
    return positions ? [...positions] : [];
  }, [sector]);

  const [position, setPosition] = useState<string>(initialPosition || "");

  useEffect(() => {
    if (availablePositions.length > 0) {
      setPosition((prevPosition) => {
        if (!prevPosition || !availablePositions.includes(prevPosition)) {
          return availablePositions[0];
        }
        return prevPosition;
      });
    } else {
      setPosition("");
    }
  }, [availablePositions]);

  const handleSetSector = (newSector: string) => {
    setSector(normalizeSector(newSector));
  };

  return {
    sectorsList,
    sector,
    setSector: handleSetSector,
    availablePositions,
    position,
    setPosition,
  };
};
