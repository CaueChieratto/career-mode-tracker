import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { Trophy } from "../../../../../common/interfaces/club/trophy";
import { calculateTotalStats } from "../../../../../common/stats/helpers/calculateTotalStats";
import { Stats } from "../../../../../common/interfaces/playersStats/stats";

export const buildPlayerTabCopyText = (
  type: "SEASON" | "TOTAL_LEAGUE" | "TOTAL",
  player: Players,
  trophies: Trophy[],
  identifier: string | number,
): string => {
  const isGoalkeeper = player.position === "GOL";

  const formatLeagueStats = (stats: Stats, leagueName: string) => {
    const rating = stats.rating || 0;
    if (isGoalkeeper) {
      return `${leagueName}: ${stats.games} Jogos, ${stats.minutesPlayed || 0} Minutos jogados, ${stats.cleanSheets || 0} CleanSheets, ${stats.defenses || 0} Defesas, ${stats.assists || 0} Assistências, ${rating}`;
    }
    const participations = (stats.goals || 0) + (stats.assists || 0);
    return `${leagueName}: ${stats.games} Jogos, ${stats.minutesPlayed || 0} Minutos jogados, ${participations} G/A, ${stats.goals || 0} Gols, ${stats.assists || 0} Assistências, ${rating}`;
  };

  const getTrophiesText = () => {
    const trophyStrings = trophies.map((t) => {
      const count = t.seasons.length;
      return count > 1 ? `${count}x ${t.leagueName}` : t.leagueName;
    });

    let text = "";
    if (trophyStrings.length === 1) {
      text = `Campeão de ${trophyStrings[0]}`;
    } else if (trophyStrings.length > 1) {
      const last = trophyStrings.pop();
      text = `Campeão de ${trophyStrings.join(", ")} e ${last}`;
    }

    const ballonDors = player.ballonDor || 0;
    if (typeof identifier === "number" && ballonDors > 0) {
      const ballonText = `${ballonDors}x Bola de Ouro`;
      if (text) {
        text += ` e ${ballonText}`;
      } else {
        text = ballonText;
      }
    }

    return text;
  };

  const trophiesText = getTrophiesText();

  const getHeader = () => {
    if (typeof identifier === "number") {
      return `${player.name} (Jogou por ${identifier} temporada${identifier !== 1 ? "s" : ""}) {`;
    }
    return `${player.name} (Temporada ${identifier}) {`;
  };

  if (type === "SEASON" || type === "TOTAL_LEAGUE") {
    const leaguesText = (player.statsLeagues || [])
      .map((league) => formatLeagueStats(league.stats, league.leagueName))
      .join("\n");
    const header = getHeader();
    return `${header}\n${leaguesText}\n${trophiesText}\n}`;
  }

  if (type === "TOTAL") {
    const totalStats = calculateTotalStats(player);
    const rating = totalStats.averageRating || 0;
    let statsStr = "";

    if (isGoalkeeper) {
      statsStr = `${totalStats.games} Jogos, ${totalStats.minutesPlayed || 0} Minutos jogados, ${totalStats.cleanSheets || 0} CleanSheets, ${totalStats.defenses || 0} Defesas, ${totalStats.assists || 0} Assistências, ${rating}`;
    } else {
      const participations =
        (totalStats.goals || 0) + (totalStats.assists || 0);
      statsStr = `${totalStats.games} Jogos, ${totalStats.minutesPlayed || 0} Minutos jogados, ${participations} G/A, ${totalStats.goals || 0} Gols, ${totalStats.assists || 0} Assistências, ${rating}`;
    }

    const header = getHeader();
    const footerText = trophiesText ? `\n${trophiesText}` : "";

    return `${header}\n${statsStr}${footerText}\n}`;
  }

  return "";
};
