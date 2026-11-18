import React from "react";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { OptimisticUpdateData } from "../../../../../helpers/updateSectionCareer";
import { SectionScreen } from "../../../../../config/screens";
import { AddFinancialEntryProvider } from "./contexts/AddFinancialEntryContext";
import { AddFinancialEntryScreen } from "./screens/AddFinancialEntryScreen";

export interface AddFinancialEntryProps {
  career: Career;
  season: ClubData;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  onOpenTransfers?: (type: "arrivals" | "exit") => void;
  notSeason?: boolean;
}

export const AddFinancialEntry: React.FC<AddFinancialEntryProps> = (props) => (
  <AddFinancialEntryProvider {...props}>
    <AddFinancialEntryScreen />
  </AddFinancialEntryProvider>
);

export default AddFinancialEntry;
