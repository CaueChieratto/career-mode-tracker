import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { ContainerClubContent } from "../../../../../components/ContainerClubContent";
import NoStatsMessage from "../../../../../components/NoStatsMessage";
import { ButtonsSwitch } from "../../../../../components/ButtonsSwitch";
import { MatchCard } from "./components/MatchCard";
import { MatchStatus } from "../../../../../common/interfaces/MatchStatus";
import { MONTH_OPTIONS, MONTH_TO_NUM } from "./constants/MONTH_OPTIONS";
import { getSeasonDateRange } from "../../../../../common/utils/GetSeasonDateRange";
import { getMatchSeason, processMatches } from "./helpers/processMatches";
import { SectionScreen } from "../../../config/screens";
import { MatchesContext } from "./contexts/MatchesContext";
import {
  findPlayerInList,
  isSamePlayerId,
} from "../../../../../common/utils/playerIdentity";
import { NavigationSessionStore } from "../../../../../common/services/NavigationSessionStore";
import { useScrollAnchorRestore } from "../../../../../common/hooks/useScrollAnchorRestore";

type AllMatchesTabProps = {
  season: ClubData;
  career: Career;
  onAddBadge?: (teamName: string) => void;
  player?: Players;
  onOpenScreen?: (screen: SectionScreen) => void;
};

export const AllMatchesTab = ({
  season,
  career,
  onAddBadge,
  player,
  onOpenScreen,
}: AllMatchesTabProps) => {
  const location = useLocation();

  const isGeralUrl = location.pathname.includes("/Geral");
  const isGeralPage = isGeralUrl;
  const storageKeySuffix = isGeralUrl ? "geral" : season.id;
  const isPlayerView = Boolean(player);
  const filterScopeKey = isPlayerView
    ? `player:${player?.id}`
    : isGeralUrl
      ? "club:geral"
      : `club:${season.id}`;

  const monthOptions = useMemo(() => {
    const { startDate } = getSeasonDateRange(
      season.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const months = MONTH_OPTIONS.slice(1);
    const startIndex = months.findIndex(
      (month) => MONTH_TO_NUM[month] === startDate.getMonth() + 1,
    );

    return [
      MONTH_OPTIONS[0],
      ...months.slice(startIndex),
      ...months.slice(0, startIndex),
    ];
  }, [season.seasonNumber, career.createdAt, career.nation]);

  const savedFilters = useMemo(
    () => NavigationSessionStore.getAllMatchesFilters(filterScopeKey),
    [filterScopeKey],
  );

  const [activeTab, setActiveTab] = useState<MatchStatus | string>(() => {
    const fromLocal = localStorage.getItem(`matchActiveTab_${storageKeySuffix}`);
    return fromLocal || savedFilters?.activeTab || "SCHEDULED";
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const fromLocal = localStorage.getItem(
      `matchSelectedMonth_${storageKeySuffix}`,
    );
    return fromLocal || savedFilters?.selectedMonth || "Tudo";
  });
  const [selectedSeasonLabel, setSelectedSeasonLabel] = useState<string>(() => {
    const fromLocal = localStorage.getItem(
      `matchSelectedSeason_${storageKeySuffix}`,
    );
    return fromLocal || savedFilters?.selectedSeason || "Todas";
  });

  useEffect(() => {
    NavigationSessionStore.setAllMatchesFilters(filterScopeKey, {
      activeTab: String(activeTab),
      selectedMonth,
      selectedSeason: selectedSeasonLabel,
    });
    localStorage.setItem(
      `matchActiveTab_${storageKeySuffix}`,
      String(activeTab),
    );
    localStorage.setItem(
      `matchSelectedMonth_${storageKeySuffix}`,
      selectedMonth,
    );
    localStorage.setItem(
      `matchSelectedSeason_${storageKeySuffix}`,
      selectedSeasonLabel,
    );
  }, [
    activeTab,
    selectedMonth,
    selectedSeasonLabel,
    filterScopeKey,
    storageKeySuffix,
  ]);

  useEffect(() => {
    const pending = NavigationSessionStore.peekClickAnchor("all_matches");
    if (!pending?.anchorSelector?.startsWith("#match-card-")) return;

    const targetMatchId = pending.anchorSelector.replace("#match-card-", "");
    const allMatchesList = isGeralPage
      ? career.clubData?.flatMap((s) => s.matches || []) || []
      : season.matches || [];

    const targetMatch = allMatchesList.find(
      (m) => m.matchesId === targetMatchId,
    );
    if (!targetMatch) return;

    const expectedTab =
      targetMatch.status === "FINISHED" ? "FINISHED" : "SCHEDULED";
    if (activeTab !== expectedTab) {
      setActiveTab(expectedTab);
    }
    if (selectedMonth !== "Tudo") {
      setSelectedMonth("Tudo");
    }
  }, [career.clubData, season.matches, isGeralPage, activeTab, selectedMonth]);

  const playerMatchingIds = useMemo(() => {
    if (!player) return new Set<string>();
    const ids = new Set<string>();
    ids.add(player.id);
    if (player.playedWithUs) ids.add(player.playedWithUs);

    career.clubData?.forEach((s) => {
      s.players?.forEach((p) => {
        if (findPlayerInList([p], player)) {
          ids.add(p.id);
          if (p.playedWithUs) ids.add(p.playedWithUs);
        }
      });
    });

    return ids;
  }, [career.clubData, player]);

  const seasonOptions = useMemo(() => {
    const availableSeasons =
      career.clubData?.filter((s) => {
        if (!player) return true;

        return s.matches?.some((m) =>
          m.playerStats?.some(
            (ps) =>
              (playerMatchingIds.has(ps.playerId) ||
                isSamePlayerId(ps.playerId, player)) &&
              (ps.minutesPlayed ?? 0) > 0,
          ),
        );
      }) || [];

    return [
      "Todas",
      ...availableSeasons.map((s) => `Temporada ${s.seasonNumber}`),
    ];
  }, [career.clubData, player, playerMatchingIds]);

  const selectedSeasonId =
    selectedSeasonLabel === "Todas"
      ? undefined
      : career.clubData?.find(
          (s) => `Temporada ${s.seasonNumber}` === selectedSeasonLabel,
        )?.id;

  const effectiveSeasonId = isGeralPage ? selectedSeasonId : season.id;

  const matches = processMatches({
    season,
    career,
    isGeralPage,
    activeTab,
    selectedMonth,
    selectedSeasonId: effectiveSeasonId,
    playerId: player?.id,
    matchingPlayerIds: playerMatchingIds,
    forceFinished: isPlayerView,
  });

  useScrollAnchorRestore("all_matches", [matches]);

  return (
    <MatchesContext.Provider
      value={{ career, isGeralPage, onAddBadge, onOpenScreen }}
    >
      <ContainerClubContent isMatch>
        <ButtonsSwitch
          isMatches={!isPlayerView}
          isGeralPage={isGeralPage}
          selectOptions={monthOptions}
          selectValue={selectedMonth}
          onSelectChange={setSelectedMonth}
          activeTab={isPlayerView ? undefined : activeTab}
          setActiveTab={isPlayerView ? undefined : setActiveTab}
          seasonOptions={isGeralPage ? seasonOptions : undefined}
          seasonValue={isGeralPage ? selectedSeasonLabel : undefined}
          onSeasonChange={isGeralPage ? setSelectedSeasonLabel : undefined}
        />
        {!matches.length ? (
          <NoStatsMessage
            textOne="Nenhuma partida encontrada"
            textTwo={
              player
                ? "O jogador ainda não tem partidas com minutos jogados."
                : "Primeiro, adicione as partidas do time."
            }
          />
        ) : (
          matches.map((match) => {
            const matchSeason = getMatchSeason(
              match.matchesId,
              career,
              season,
              isGeralPage,
            );
            const playerStat = player
              ? match.playerStats?.find(
                  (p) =>
                    playerMatchingIds.has(p.playerId) ||
                    isSamePlayerId(p.playerId, player),
                )
              : undefined;

            return (
              <MatchCard
                key={`${match.date}-${match.homeTeam}-${match.awayTeam}`}
                match={match}
                season={matchSeason}
                playerStat={playerStat}
              />
            );
          })
        )}
      </ContainerClubContent>
    </MatchesContext.Provider>
  );
};
