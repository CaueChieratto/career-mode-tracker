import { useLocation, useNavigate, useParams } from "react-router-dom";

type UseHeaderNavigationProps = {
  careerId: string;
  backSeasons?: () => void;
  isPlayer?: boolean;
};

export const useHeaderNavigation = ({
  careerId,
  backSeasons,
  isPlayer,
}: UseHeaderNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { seasonId } = useParams<{ seasonId?: string }>();

  const handleGoBack = () => {
    const searchParams = new URLSearchParams(location.search);
    const fromPlayerId = searchParams.get("playerId");
    const isFromGeral = searchParams.get("fromGeral") === "true";
    const isFromSeasonPlayer = searchParams.get("fromSeasonPlayer") === "true";
    const fromGroup = searchParams.get("fromGroup") === "true";
    const groupIdFromSearch = searchParams.get("groupId");

    if (fromPlayerId) {
      if (fromGroup && groupIdFromSearch) {
        navigate(`/CareerGroup/${groupIdFromSearch}/Geral`, {
          state: {
            reopenScreen: {
              key: "player",
              playerId: fromPlayerId,
              careerId,
              isNotSeason: true,
              isFromGroup: true,
              groupId: groupIdFromSearch,
            },
          },
        });
        return;
      }
      if (isFromSeasonPlayer && seasonId) {
        navigate(`/Career/${careerId}/Season/${seasonId}`, {
          state: {
            reopenScreen: {
              key: "player",
              playerId: fromPlayerId,
              careerId,
              seasonId,
              isNotSeason: false,
            },
          },
        });
        return;
      }
      if (isFromGeral) {
        navigate(`/Career/${careerId}/Geral`, {
          state: {
            reopenScreen: {
              key: "player",
              playerId: fromPlayerId,
              careerId,
              isNotSeason: true,
            },
          },
        });
        return;
      }
      if (seasonId) {
        navigate(`/Career/${careerId}/Season/${seasonId}`, {
          state: {
            reopenScreen: {
              key: "addSquadPlayer",
              playerId: fromPlayerId,
              seasonId,
            },
          },
        });
        return;
      }
      navigate("/CareersPage", { state: { addSeasonsCareerId: careerId } });
      return;
    }

    if (backSeasons) {
      backSeasons();
      return;
    }

    if (isPlayer) {
      if (fromGroup && groupIdFromSearch) {
        navigate(`/CareerGroup/${groupIdFromSearch}/Geral`);
        return;
      }
      if (location.pathname.includes("/Geral")) {
        navigate(`/Career/${careerId}/Geral`);
      } else if (seasonId) {
        navigate(`/Career/${careerId}/Season/${seasonId}`);
      } else {
        navigate("/CareersPage", { state: { addSeasonsCareerId: careerId } });
      }
      return;
    }

    if (
      location.pathname.includes("/CareerGroup") &&
      location.pathname.includes("/Geral")
    ) {
      navigate("/CareersPage");
      return;
    }

    navigate("/CareersPage", { state: { addSeasonsCareerId: careerId } });
  };

  return { handleGoBack };
};
