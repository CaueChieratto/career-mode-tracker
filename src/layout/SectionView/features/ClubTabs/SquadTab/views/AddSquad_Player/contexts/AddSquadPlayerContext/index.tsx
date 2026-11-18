import React, { useMemo } from "react";
import { AddSquadPlayerProps } from "../../types";
import { AddSquadPlayerContext, AddSquadPlayerContextValue } from "../context";

export interface AddSquadPlayerProviderProps extends AddSquadPlayerProps {
  children: React.ReactNode;
}

export const AddSquadPlayerProvider: React.FC<AddSquadPlayerProviderProps> = ({
  career,
  season,
  playerId,
  onClose,
  children,
}) => {
  const player = useMemo(
    () =>
      playerId ? season.players.find((p) => p.id === playerId) : undefined,
    [season.players, playerId],
  );

  const value: AddSquadPlayerContextValue = useMemo(
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
    <AddSquadPlayerContext.Provider value={value}>
      {children}
    </AddSquadPlayerContext.Provider>
  );
};

export default AddSquadPlayerProvider;
