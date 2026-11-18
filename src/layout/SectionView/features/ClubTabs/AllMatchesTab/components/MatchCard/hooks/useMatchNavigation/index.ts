import { useNavigate, useParams, useLocation } from "react-router-dom";
import { NavigationSessionStore } from "../../../../../../../../../common/services/NavigationSessionStore";

type UseMatchNavigationParams = {
  seasonId: string;
  matchId: string;
  isGeralPage: boolean;
  playerId?: string;
  careerId?: string;
};

export const useMatchNavigation = ({
  seasonId,
  matchId,
  isGeralPage,
  playerId,
  careerId: propCareerId,
}: UseMatchNavigationParams) => {
  const {
    careerId: paramCareerId,
    seasonId: paramSeasonId,
    groupId: paramGroupId,
  } = useParams<{
    careerId?: string;
    seasonId?: string;
    groupId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const effectiveCareerId = paramCareerId || propCareerId;
  const currentSeasonId = paramSeasonId || seasonId;

  const buildUrl = (path: string) => {
    const base = `/Career/${effectiveCareerId}/Season/${currentSeasonId}/${path}/${matchId}`;
    const params = new URLSearchParams();

    if (isGeralPage) params.append("fromGeral", "true");

    if (playerId) {
      params.append("playerId", playerId);
      if (!location.pathname.includes("/Geral")) {
        params.append("fromSeasonPlayer", "true");
      }
      if (location.pathname.includes("/CareerGroup") && paramGroupId) {
        params.append("fromGroup", "true");
        params.append("groupId", paramGroupId);
      }
    }

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const goToEdit = () => {
    NavigationSessionStore.saveClickAnchor("all_matches", {
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      anchorSelector: `#match-card-${matchId}`,
      updatedAt: Date.now(),
    });
    navigate(buildUrl("AddMatches"));
  };

  const goToMatch = () => {
    NavigationSessionStore.saveClickAnchor("all_matches", {
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      anchorSelector: `#match-card-${matchId}`,
      updatedAt: Date.now(),
    });
    navigate(buildUrl("Match"));
  };

  return {
    goToEdit,
    goToMatch,
  };
};
