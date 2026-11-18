import { calculateTotalStats } from "../../../../../../../common/stats/helpers/calculateTotalStats";

type Player = Parameters<typeof calculateTotalStats>[0];

export const buildPlayersCopyText = (players: Player[]): string => {
  return players
    .map((player) => {
      const leaguesText = (player.statsLeagues || [])
        .map((league) => {
          const stats = league.stats;
          const participations = stats.goals + stats.assists;

          if (player.position === "GOL") {
            return `${league.leagueName}: ${stats.games} Jogos, ${stats.minutesPlayed || 0} Minutos jogados, ${stats.cleanSheets || 0} CleanSheets, ${stats.defenses || 0} Defesas, ${stats.assists} Assistências, ${stats.rating} ⭐`;
          }

          return `${league.leagueName}: ${stats.games} Jogos, ${stats.minutesPlayed || 0} Minutos jogados, ${participations} G/A, ${stats.goals} Gols, ${stats.assists} Assistências, ${stats.rating} ⭐`;
        })
        .join(",\n");

      return `${player.name} {\n${leaguesText}\n}`;
    })
    .join("\n\n");
};
