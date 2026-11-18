import React from "react";
import { RenewPlayerProps } from "../../types";
import { useRenewPlayerForm } from "../../hooks/useRenewPlayerForm";
import { RenewPlayerContext } from "../context";

export interface RenewPlayerProviderProps extends RenewPlayerProps {
  children: React.ReactNode;
}

export const RenewPlayerProvider: React.FC<RenewPlayerProviderProps> = ({
  career,
  season,
  playerId,
  onClose,
  onOpenScreen,
  proposalId,
  initialProposal,
  children,
}) => {
  const formMethods = useRenewPlayerForm({
    career,
    season,
    playerId,
    onClose,
    onOpenScreen,
    proposalId,
    initialProposal,
  });

  return (
    <RenewPlayerContext.Provider value={formMethods}>
      {children}
    </RenewPlayerContext.Provider>
  );
};

