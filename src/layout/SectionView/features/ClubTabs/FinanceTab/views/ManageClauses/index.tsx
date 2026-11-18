import React from "react";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { SectionScreen } from "../../../../../config/screens";
import { ManageClausesProvider } from "./contexts/ManageClausesContext";
import { ManageClausesScreen } from "./screens/ManageClausesScreen";

export interface ManageClausesProps {
  career: Career;
  season: ClubData;
  onClose: () => void;
  readOnly?: boolean;
  onOpenScreen?: (screen: SectionScreen) => void;
  initialTab?: "renewals" | "arrivals" | "exit";
  selectedPlayerName?: string;
  selectedProposalId?: string;
}

export const ManageClauses: React.FC<ManageClausesProps> = (props) => (
  <ManageClausesProvider {...props}>
    <ManageClausesScreen />
  </ManageClausesProvider>
);

export default ManageClauses;
