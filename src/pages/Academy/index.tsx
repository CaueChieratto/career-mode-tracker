import { useLocation, useParams } from "react-router-dom";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import Load from "../../components/Load";
import { SeasonThemeProvider } from "../../contexts/SeasonThemeContext";
import { AcademyContent } from "./layouts/AcademyContent";
import { Career } from "../../common/interfaces/Career";
import { useCareers } from "../../common/hooks/Career/UseCareer";

export const Academy = () => {
  const { careerId } = useParams<{ careerId: string }>();
  const location = useLocation();
  const state = location.state as { career?: Career; seasonId?: string } | null;

  const hasStateCareer = Boolean(state?.career);
  const { careers, loading } = useCareers(!hasStateCareer);

  const career = state?.career || careers.find((c) => c.id === careerId);
  const seasonId = state?.seasonId || "geral";

  if (loading && !career) {
    return <Load />;
  }

  if (!career) {
    return <NotFoundDisplay />;
  }

  return (
    <SeasonThemeProvider careerId={career.id} career={career}>
      <AcademyContent career={career} seasonId={seasonId} />
    </SeasonThemeProvider>
  );
};
