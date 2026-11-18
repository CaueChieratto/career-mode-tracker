import { POSITION_ORDER } from "../../../SquadTab/helpers/sortPlayers";
import { calculateTotalStats } from "../../../../../../../common/stats/helpers/calculateTotalStats";
import { sortedPlayers } from "../../components/PlayerStatsList/utils/sortedPlayers";
import { sortPlayersByContributions } from "../../components/PlayerStatsList/utils/sortPlayersByContributions";

type Player = Parameters<typeof calculateTotalStats>[0];

export const sortPlayersList = (
  players: Player[],
  sortOption: string,
  isGeralPage: boolean,
  isReversed: boolean = false,
): Player[] => {
  let result: Player[] = [];

  if (sortOption === "Ordenar por padrão") {
    result = isGeralPage
      ? sortPlayersByContributions(players)
      : sortedPlayers(players);
  } else {
    result = [...players].sort((a, b) => {
      const statsA = calculateTotalStats(a);
      const statsB = calculateTotalStats(b);

      switch (sortOption) {
        case "Ordenar por posições": {
          const indexA = POSITION_ORDER.indexOf(a.position);
          const indexB = POSITION_ORDER.indexOf(b.position);

          return (indexB === -1 ? 99 : indexB) - (indexA === -1 ? 99 : indexA);
        }
        case "Ordenar por jogos":
          return statsB.games - statsA.games;
        case "Ordenar por minutos":
          return statsB.minutesPlayed - statsA.minutesPlayed;
        case "Ordenar por participações em gols":
          return (
            statsB.goals + statsB.assists - (statsA.goals + statsA.assists)
          );
        case "Ordenar por gols":
          return statsB.goals - statsA.goals;
        case "Ordenar por assistencias":
          return statsB.assists - statsA.assists;
        case "Ordenar por nota média":
          return statsB.averageRating - statsA.averageRating;
        case "Ordenar por jogos sem sofrer gols": {
          const aIsGol = a.position === "GOL";
          const bIsGol = b.position === "GOL";
          if (aIsGol && !bIsGol) return -1;
          if (!aIsGol && bIsGol) return 1;
          return statsB.cleanSheets - statsA.cleanSheets;
        }
        case "Ordenar por defesas":
          return statsB.defenses - statsA.defenses;
        default:
          return 0;
      }
    });
  }

  return isReversed ? result.reverse() : result;
};
