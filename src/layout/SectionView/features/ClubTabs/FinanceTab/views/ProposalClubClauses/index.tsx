import React from "react";
import { ProposalClubClausesProps } from "./types";
import { ProposalClubClausesProvider } from "./contexts/ProposalClubClausesContext";
import ProposalClubClausesScreen from "./screens/ProposalClubClausesScreen";

export const ProposalClubClauses: React.FC<ProposalClubClausesProps> = (props) => {
  return (
    <ProposalClubClausesProvider {...props}>
      <ProposalClubClausesScreen />
    </ProposalClubClausesProvider>
  );
};

export default ProposalClubClauses;

