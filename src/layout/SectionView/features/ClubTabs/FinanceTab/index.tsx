import React from "react";
import { ContainerClubContent } from "../../../../../components/ContainerClubContent";
import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { SectionScreen } from "../../../config/screens";
import BudgetOverviewCard from "./components/BudgetOverviewCard";
import TransfersCardSummary from "./components/TransfersCardSummary";

export type FinanceTabProps = {
  season: ClubData;
  career: Career;
  notSeason?: boolean;
  onOpenTransfers?: (type: "arrivals" | "exit") => void;
  onOpenScreen?: (screen: SectionScreen) => void;
};

export const FinanceTab: React.FC<FinanceTabProps> = ({
  season,
  career,
  notSeason,
  onOpenTransfers,
  onOpenScreen,
}) => {
  return (
    <ContainerClubContent>
      <TransfersCardSummary
        season={season}
        career={career}
        onOpenTransfers={onOpenTransfers}
      />

      <BudgetOverviewCard
        season={season}
        career={career}
        notSeason={notSeason}
        onOpenScreen={onOpenScreen}
      />
    </ContainerClubContent>
  );
};

export default FinanceTab;
