import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { belongsToSeason } from "../../../AcademyPlayerTab/helpers/belongsToSeason";
import { getAcademyConsolidatedStats } from "../../helpers/getAcademyConsolidatedStats";
import { buildPlayerTabCopyText } from "../../../helpers/buildPlayerTabCopyText";
import { formatSeasonString } from "../../helpers/formatSeasonString";
import { findPlayerInList } from "../../helpers/findPlayerInList";
import { buildAcademyTrophies } from "../../helpers/buildAcademyTrophies";
import { useGroupAggregatedPlayers } from "../../../../../../../common/hooks/Players/useGroupAggregatedPlayers";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { getContinentByCountry } from "../../../../../../../common/services/GetContinentByCountry";
import { Copy } from "../../../../../../../common/utils/Copy";
import { useTotalPlayerTab } from "../useTotalPlayerTab";

type UseTotalPlayerDataArgs = {
  career: Career;
  propPlayer?: Players;
  season?: ClubData;
};

export const useTotalPlayerData = ({
  career,
  propPlayer,
  season,
}: UseTotalPlayerDataArgs) => {
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
    return findPlayerInList(groupPlayers, propPlayer) || propPlayer;
  }, [isNotSeason, isFromGroup, propPlayer, groupPlayers]);

  const { allTrophiesWon, seasonsCount } = useTotalPlayerTab(
    career,
    player,
    isNotSeason,
    isFromGroup,
  );

  const [expand, setExpand] = useState<Record<string, boolean>>({});

  const toggleExpand = (leagueName: string) => {
    setExpand((prev) => ({
      ...prev,
      [leagueName]: !prev[leagueName],
    }));
  };

  const { displayTrophies, displayIdentifier, playerForTotalCalc } =
    useMemo(() => {
      let trophies = allTrophiesWon;
      let identifier: string | number = seasonsCount;
      let calcPlayer = player;

      if (!isNotSeason && season && player) {
        const seasonString = formatSeasonString(
          career.createdAt,
          season.seasonNumber,
          career.nation,
        );

        trophies = career.trophies.filter((t) =>
          t.seasons.includes(seasonString),
        );
        identifier = seasonString;

        const playerInThisSeason = findPlayerInList(season.players, player);
        if (playerInThisSeason) {
          calcPlayer = playerInThisSeason;
        }
      }

      return {
        displayTrophies: trophies,
        displayIdentifier: identifier,
        playerForTotalCalc: calcPlayer,
      };
    }, [allTrophiesWon, seasonsCount, player, isNotSeason, season, career]);

  const filteredAcademyTournaments = useMemo(() => {
    if (!playerForTotalCalc?.academyTournaments) return [];

    // Se NÃO for no contexto de grupo (carreira individual):
    // Só exibe torneios da base se o jogador pertenceu à base DESTA carreira específica
    if (!isFromGroup) {
      const normalizedName = playerForTotalCalc.name?.trim().toLowerCase();
      const wasInThisCareerAcademy =
        career.clubData?.some((s) =>
          s.academyPlayers?.some(
            (ap) => ap.name?.trim().toLowerCase() === normalizedName,
          ),
        ) ||
        career.clubData?.some((s) =>
          s.players?.some(
            (p) =>
              p.name?.trim().toLowerCase() === normalizedName &&
              p.contract?.some((c) => c.fromClub === "Base"),
          ),
        );

      if (!wasInThisCareerAcademy) {
        return [];
      }
    }

    if (isNotSeason || !season) return playerForTotalCalc.academyTournaments;

    const careerStartYear = new Date(career.createdAt).getFullYear();
    const isEurope = getContinentByCountry(career.nation) === "Europa";

    return playerForTotalCalc.academyTournaments.filter((t) =>
      belongsToSeason(t.date, season.seasonNumber, careerStartYear, isEurope),
    );
  }, [playerForTotalCalc, isNotSeason, career, season, isFromGroup]);

  const academyStats = useMemo(() => {
    if (!playerForTotalCalc) return null;
    return getAcademyConsolidatedStats({
      ...playerForTotalCalc,
      academyTournaments: filteredAcademyTournaments,
    });
  }, [playerForTotalCalc, filteredAcademyTournaments]);

  const hasAcademyStats = academyStats ? academyStats.games > 0 : false;

  const playerWithAcademyTotal = useMemo(() => {
    if (!playerForTotalCalc) return undefined;
    if (!hasAcademyStats || !academyStats) return playerForTotalCalc;

    return {
      ...playerForTotalCalc,
      statsLeagues: [
        ...(playerForTotalCalc.statsLeagues || []),
        {
          leagueName: "Base",
          leagueImage: "/images/leagues/default.png",
          stats: {
            games: academyStats.games,
            goals: academyStats.goals,
            assists: academyStats.assists,
            defenses: academyStats.defenses,
            cleanSheets: academyStats.cleanSheets,
            rating:
              academyStats.games > 0
                ? academyStats.ratingSum / academyStats.games
                : 0,
          },
        },
      ],
    };
  }, [playerForTotalCalc, academyStats, hasAcademyStats]);

  const displayTrophiesWithBase = useMemo(() => {
    if (!playerForTotalCalc) return displayTrophies;
    const academyTrophies = buildAcademyTrophies(filteredAcademyTournaments);
    return [...displayTrophies, ...academyTrophies];
  }, [displayTrophies, playerForTotalCalc, filteredAcademyTournaments]);

  const handleCopyTotalLeague = async () => {
    if (!player) return;
    const text = buildPlayerTabCopyText(
      "TOTAL_LEAGUE",
      player,
      displayTrophies,
      displayIdentifier,
    );
    await Copy(text, "Estatísticas por liga copiadas com sucesso!");
  };

  const handleCopyTotal = async () => {
    if (!playerForTotalCalc) return;
    const text = buildPlayerTabCopyText(
      "TOTAL",
      playerForTotalCalc,
      displayTrophies,
      displayIdentifier,
    );
    await Copy(text, "Estatísticas totais copiadas com sucesso!");
  };

  const handleCopyTotalBase = async () => {
    if (!playerWithAcademyTotal) return;
    const text = buildPlayerTabCopyText(
      "TOTAL",
      playerWithAcademyTotal,
      displayTrophiesWithBase,
      displayIdentifier,
    );
    await Copy(text, "Estatísticas totais (com a base) copiadas com sucesso!");
  };

  return {
    isLoadingGroup,
    isNotSeason,
    player,
    playerForTotalCalc,
    playerWithAcademyTotal,
    displayTrophies,
    displayTrophiesWithBase,
    hasAcademyStats,
    expand,
    toggleExpand,
    handleCopyTotalLeague,
    handleCopyTotal,
    handleCopyTotalBase,
  };
};
