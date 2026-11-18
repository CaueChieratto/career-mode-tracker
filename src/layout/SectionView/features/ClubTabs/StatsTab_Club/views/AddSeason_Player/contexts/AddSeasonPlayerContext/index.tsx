import React, { useMemo } from "react";
import { AddSeasonPlayerProps } from "../../types";
import {
  AddSeasonPlayerContext,
  AddSeasonPlayerContextValue,
} from "../context";

export interface AddSeasonPlayerProviderProps extends AddSeasonPlayerProps {
  children: React.ReactNode;
}

export const AddSeasonPlayerProvider: React.FC<
  AddSeasonPlayerProviderProps
> = ({ career, season, playerId, player: propPlayer, onClose, children }) => {
  const player = useMemo(() => {
    if (propPlayer) return propPlayer;
    if (playerId) {
      return season.players?.find((p) => p.id === playerId);
    }
    return undefined;
  }, [propPlayer, playerId, season.players]);

  const value: AddSeasonPlayerContextValue = useMemo(
    () => ({
      career,
      season,
      playerId,
      player,
      onClose,
    }),
    [career, season, playerId, player, onClose],
  );

  return (
    <AddSeasonPlayerContext.Provider value={value}>
      {children}
    </AddSeasonPlayerContext.Provider>
  );
};

export default AddSeasonPlayerProvider;
