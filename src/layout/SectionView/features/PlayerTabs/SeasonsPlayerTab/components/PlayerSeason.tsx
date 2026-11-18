import SeasonRow from "../../components/SeasonRow";
import TrophyRow from "./TrophyRow";
import SeasonTotalStats from "../../components/SeasonTotalStats";
import Styles from "../../PlayerTabs.module.css";
import { ClubData } from "../../../../../../common/interfaces/club/clubData";
import { Trophy } from "../../../../../../common/interfaces/club/trophy";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { sortLeaguesByLevel } from "../../../../../../common/utils/Sorts";
import Card from "../../../../../../ui/Card";
import { Copy } from "../../../../../../common/utils/Copy";
import { buildPlayerTabCopyText } from "../../helpers/buildPlayerTabCopyText";
import { findPlayerInList } from "../../../../../../common/utils/playerIdentity";

type PlayerSeasonProps = {
  season: ClubData;
  player?: Players;
  seasonString: string;
  trophiesWonInSeason: Trophy[];
  isExpanded: (key: string) => boolean;
  toggleExpand: (key: string) => void;
  teamBadge?: string;
};

const PlayerSeason = ({
  season,
  player,
  seasonString,
  trophiesWonInSeason,
  isExpanded,
  toggleExpand,
  teamBadge,
}: PlayerSeasonProps) => {
  const playerInSeason = findPlayerInList(season.players, player);

  if (!playerInSeason) return null;

  const sortedLeagues = sortLeaguesByLevel(playerInSeason.statsLeagues || []);

  const copySeason = async () => {
    if (!playerInSeason) return;
    const text = buildPlayerTabCopyText(
      "SEASON",
      playerInSeason,
      trophiesWonInSeason,
      seasonString,
    );
    await Copy(text, "Estatísticas da temporada copiadas com sucesso!");
  };

  return (
    <Card className={Styles.card} key={season.id}>
      <SeasonRow
        seasonString={seasonString}
        player={player}
        onClickCopy={copySeason}
        teamBadge={teamBadge}
      />
      {sortedLeagues.map((leagueStats) => {
        const trophy = trophiesWonInSeason.find(
          (t) => t.leagueName === leagueStats.leagueName,
        );
        const leagueKey = `${season.id}-${leagueStats.leagueName}`;

        return (
          <div key={leagueKey}>
            <TrophyRow
              trophy={trophy}
              playerInSeason={playerInSeason}
              seasonId={season.id}
              isExpanded={isExpanded(leagueKey)}
              toggleExpand={toggleExpand}
              leagueStats={leagueStats}
            />
          </div>
        );
      })}

      <SeasonTotalStats
        playerInSeason={playerInSeason}
        trophiesWonInSeason={trophiesWonInSeason}
      />
    </Card>
  );
};

export default PlayerSeason;
