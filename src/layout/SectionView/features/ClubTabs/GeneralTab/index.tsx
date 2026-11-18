import { useLocation } from "react-router-dom";
import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import CompetitionsCard from "./components/CompetitionsCard";
import MatchStatsCard from "./components/MatchStatsCard";
import SummaryCard from "./components/SummaryCard";
import CaptainsHierarchyCard from "./components/CaptainsHierarchyCard";

type GeneralTabProps = {
  season: ClubData;
  career: Career;
};

const GeneralTab = ({ season, career }: GeneralTabProps) => {
  const location = useLocation();
  const isGeralPage = location.pathname.includes("/Geral");

  const hasCaptains =
    (season.captains && season.captains.length > 0) ||
    (season.players && season.players.some((p) => p.captain));

  return (
    <>
      <SummaryCard season={season} career={career} />

      {(isGeralPage || (season.matches?.length ?? 0) > 0) && (
        <MatchStatsCard season={season} career={career} />
      )}

      {season.leagues && season.leagues?.length > 0 && (
        <CompetitionsCard
          careerId={career.id}
          season={season}
          readOnly={isGeralPage}
        />
      )}

      {hasCaptains && (
        <CaptainsHierarchyCard
          careerId={career.id}
          season={season}
          readOnly={isGeralPage}
        />
      )}
    </>
  );
};
export default GeneralTab;
