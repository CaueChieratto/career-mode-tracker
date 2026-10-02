import { useLocation } from "react-router-dom";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import { SeasonThemeProvider } from "../../contexts/SeasonThemeContext";
import { AcademyContent } from "./layouts/AcademyContent";
import { Career } from "../../common/interfaces/Career";

export const Academy = () => {
  const location = useLocation();
  const state = location.state as { career?: Career; seasonId?: string } | null;
  const career = state?.career;
  const seasonId = state?.seasonId || "geral";

  if (!career) {
    return <NotFoundDisplay />;
  }

  return (
    <SeasonThemeProvider careerId={career.id} career={career}>
      <AcademyContent career={career} seasonId={seasonId} />
    </SeasonThemeProvider>
  );
};
