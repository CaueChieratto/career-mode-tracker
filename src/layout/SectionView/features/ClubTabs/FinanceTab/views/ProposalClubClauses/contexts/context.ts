import { createContext, useContext } from "react";
import { ProposalClubClausesContextType } from "../types";

export const ProposalClubClausesContext =
  createContext<ProposalClubClausesContextType | null>(null);

export const useProposalClubClausesContext = (): ProposalClubClausesContextType => {
  const ctx = useContext(ProposalClubClausesContext);
  if (!ctx) {
    throw new Error(
      "useProposalClubClausesContext must be used within a ProposalClubClausesProvider",
    );
  }
  return ctx;
};

