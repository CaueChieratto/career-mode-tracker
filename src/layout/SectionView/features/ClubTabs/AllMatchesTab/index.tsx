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
  const isGeralPage = isGeralUrl || !!player;
  const storageKeySuffix = isGeralUrl ? "geral" : season.id;

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

  const [activeTab, setActiveTab] = useState<MatchStatus | string>(() => {
    return (
      localStorage.getItem(`matchActiveTab_${storageKeySuffix}`) || "SCHEDULED"
    );
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return (
      localStorage.getItem(`matchSelectedMonth_${storageKeySuffix}`) || "Tudo"
    );
  });
  const [selectedSeasonLabel, setSelectedSeasonLabel] = useState<string>(() => {
    return (
      localStorage.getItem(`matchSelectedSeason_${storageKeySuffix}`) || "Todas"
    );
  });

  useEffect(() => {
    localStorage.setItem(`matchActiveTab_${storageKeySuffix}`, activeTab);
    localStorage.setItem(
      `matchSelectedMonth_${storageKeySuffix}`,
      selectedMonth,
    );
    localStorage.setItem(
      `matchSelectedSeason_${storageKeySuffix}`,
      selectedSeasonLabel,
    );
  }, [activeTab, selectedMonth, selectedSeasonLabel, storageKeySuffix]);

  const seasonOptions = useMemo(() => {
    const availableSeasons =
      career.clubData?.filter((s) => {
        if (!player) return true;

        return s.matches?.some((m) =>
          m.playerStats?.some(
            (ps) => ps.playerId === player.id && (ps.minutesPlayed ?? 0) > 0,
          ),
        );
      }) || [];

    return [
      "Todas",
      ...availableSeasons.map((s) => `Temporada ${s.seasonNumber}`),
    ];
  }, [career.clubData, player]);

  const selectedSeasonId =
    selectedSeasonLabel === "Todas"
      ? undefined
      : career.clubData?.find(
          (s) => `Temporada ${s.seasonNumber}` === selectedSeasonLabel,
        )?.id;

  const effectiveSeasonId = isGeralUrl ? selectedSeasonId : season.id;

  const matches = processMatches({
    season,
    career,
    isGeralPage,
    activeTab,
    selectedMonth,
    selectedSeasonId: effectiveSeasonId,
    playerId: player?.id,
  });

  return (
    <MatchesContext.Provider
      value={{ career, isGeralPage, onAddBadge, onOpenScreen }}
    >
      <ContainerClubContent isMatch>
        <ButtonsSwitch
          isMatches
          isGeralPage={isGeralPage}
          selectOptions={monthOptions}
          selectValue={selectedMonth}
          onSelectChange={setSelectedMonth}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          seasonOptions={isGeralUrl ? seasonOptions : undefined}
          seasonValue={isGeralUrl ? selectedSeasonLabel : undefined}
          onSeasonChange={isGeralUrl ? setSelectedSeasonLabel : undefined}
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
            const playerStat = player?.id
              ? match.playerStats?.find((p) => p.playerId === player.id)
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
