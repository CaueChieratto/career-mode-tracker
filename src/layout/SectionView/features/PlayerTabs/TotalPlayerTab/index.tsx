import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import NoStatsMessage from "../../../../../components/NoStatsMessage";
import Card from "../../../../../ui/Card";
import SeasonRow from "../components/SeasonRow";
import SeasonTotalStats from "../components/SeasonTotalStats";
import { PlayerSeasonSkeleton } from "../ui/PlayerSeasonSkeleton";
import LeagueStatsRowTotal from "./components/LeagueStatsRowTotal";
import { useTotalPlayerData } from "./hooks/useTotalPlayerData";
import Styles from "./TotalPlayerTab.module.css";

type TotalPlayerTabProps = {
  player?: Players;
  career: Career;
  season?: ClubData;
};

const TotalPlayerTab = ({
  player: propPlayer,
  career,
  season,
}: TotalPlayerTabProps) => {
  const {
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
  } = useTotalPlayerData({ career, propPlayer, season });

  if (isLoadingGroup) {
    return <PlayerSeasonSkeleton count={isNotSeason ? 2 : 1} />;
  }

  if (!player || !playerForTotalCalc) return null;

  if (player.statsLeagues.length === 0 && !hasAcademyStats) {
    return (
      <NoStatsMessage
        textOne="Nenhuma estatística encontrada"
        textTwo="Este jogador não possui nenhuma estatística registrada ou temporada válida para ser exibida."
      />
    );
  }

  return (
    <>
      {isNotSeason && player.statsLeagues.length > 0 && (
        <Card className={Styles.card}>
          <SeasonRow
            seasonString="Total por Liga"
            player={player}
            onClickCopy={handleCopyTotalLeague}
          />
          {player.statsLeagues.map((league) => {
            const trophy = displayTrophies.find(
              (t) => t.leagueName === league.leagueName,
            );
            return (
              <LeagueStatsRowTotal
                key={league.leagueName}
                leagueStats={league}
                isExpanded={!!expand[league.leagueName]}
                toggleExpand={toggleExpand}
                trophy={trophy}
                player={player}
              />
            );
          })}
        </Card>
      )}

      <Card className={Styles.card}>
        <SeasonRow
          seasonString="Total"
          player={playerForTotalCalc}
          onClickCopy={handleCopyTotal}
        />
        <SeasonTotalStats
          isTotal
          playerInSeason={playerForTotalCalc}
          trophiesWonInSeason={displayTrophies}
        />
      </Card>

      {hasAcademyStats && playerWithAcademyTotal && (
        <Card className={Styles.card}>
          <SeasonRow
            seasonString="Total (com a base)"
            player={playerWithAcademyTotal}
            onClickCopy={handleCopyTotalBase}
          />
          <SeasonTotalStats
            isTotal
            playerInSeason={playerWithAcademyTotal}
            trophiesWonInSeason={displayTrophiesWithBase}
          />
        </Card>
      )}
    </>
  );
};

export default TotalPlayerTab;
