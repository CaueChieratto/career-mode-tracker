import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { calculateTotalStats } from "../../../../../../../../../common/stats/helpers/calculateTotalStats";

export const sortedPlayers = (players: Players[]) => {
  return [...players].sort((a, b) => {
    if (b.ballonDor !== a.ballonDor) {
      return b.ballonDor - a.ballonDor;
    }

    const statsA = calculateTotalStats(a);
    const statsB = calculateTotalStats(b);

    if (statsB.goals !== statsA.goals) {
      return statsB.goals - statsA.goals;
    }
    if (statsB.assists !== statsA.assists) {
      return statsB.assists - statsA.assists;
    }
    if (statsB.cleanSheets !== statsA.cleanSheets) {
      return statsB.cleanSheets - statsA.cleanSheets;
    }

    return statsB.games - statsA.games;
  });
};
