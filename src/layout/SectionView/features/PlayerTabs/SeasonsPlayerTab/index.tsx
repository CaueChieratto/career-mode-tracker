import { useSeasonsPlayerTab } from "./hooks/useSeasonsPlayerTab";
import PlayerSeason from "./components/PlayerSeason";
import { useRenderableSeasons } from "./hooks/useRenderableSeasons";
import { Career } from "../../../../../common/interfaces/Career";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import NoStatsMessage from "../../../../../components/NoStatsMessage";
import { useLocation } from "react-router-dom";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { useMemo } from "react";
import { useGroupAggregatedPlayers } from "../../../../../common/hooks/Players/useGroupAggregatedPlayers";
import { PlayerSeasonSkeleton } from "../ui/PlayerSeasonSkeleton";

type SeasonsPlayerTabProps = {
  career: Career;
  player?: Players;
  season?: ClubData;
};

const SeasonsPlayerTab = ({
  player: propPlayer,
  career,
  season,
}: SeasonsPlayerTabProps) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isFromGroup =
    searchParams.get("fromGroup") === "true" ||
    location.pathname.includes("/CareerGroup");
  const isNotSeason = location.pathname.includes("/Geral");

  const { groupPlayers, isLoadingGroup } = useGroupAggregatedPlayers(
    career,
    isNotSeason && isFromGroup,
  );

  const player = useMemo(() => {
    if (!isNotSeason || !isFromGroup || !propPlayer) return propPlayer;
    const normalizedName = propPlayer.name.trim().toLowerCase();
    const normalizedNation = propPlayer.nation.trim().toLowerCase();

    return (
      groupPlayers.find(
        (p) =>
          p.name.trim().toLowerCase() === normalizedName &&
          p.nation.trim().toLowerCase() === normalizedNation,
      ) || propPlayer
    );
  }, [isNotSeason, isFromGroup, propPlayer, groupPlayers]);

  const {
    expand,
    toggleExpand,
    seasonsPlayerPlayed,
    getSeasonString,
    getTrophiesWonInSeason,
    isLoadingSeasons,
  } = useSeasonsPlayerTab(career, player, isNotSeason, isFromGroup);

  let renderableSeasons = useRenderableSeasons(seasonsPlayerPlayed, player);

  if (!isNotSeason && season) {
    renderableSeasons = renderableSeasons.filter(
      (s) => s.season.id === season.id,
    );
  }

  const uniqueSeasonsCount = useMemo(() => {
    if (!career?.clubData) return 1;
    const ids = new Set(career.clubData.map((c) => c.id));
    return ids.size;
  }, [career]);

  if (isLoadingGroup || isLoadingSeasons) {
    return <PlayerSeasonSkeleton count={uniqueSeasonsCount} />;
  }

  if (renderableSeasons.length === 0) {
    return (
      <NoStatsMessage
        textOne="Nenhuma estatística encontrada"
        textTwo="Este jogador não possui nenhuma estatística registrada ou temporada válida para ser exibida."
      />
    );
  }

  return (
    <>
      {renderableSeasons.map((renderableSeason) => {
        const seasonString = getSeasonString(
          renderableSeason.season.seasonNumber,
          renderableSeason.career,
        );
        const trophiesWonInSeason = getTrophiesWonInSeason(
          seasonString,
          renderableSeason.career,
        );

        return (
          <PlayerSeason
            key={`${renderableSeason.career.id}-${renderableSeason.season.id}`}
            season={renderableSeason.season}
            player={player}
            seasonString={seasonString}
            trophiesWonInSeason={trophiesWonInSeason}
            isExpanded={(key) => !!expand[key]}
            teamBadge={renderableSeason.career.teamBadge}
            toggleExpand={toggleExpand}
          />
        );
      })}
    </>
  );
};

export default SeasonsPlayerTab;
