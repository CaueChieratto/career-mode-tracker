import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";

import { calculateTotalStats } from "../../../../../../../../../common/stats/helpers/calculateTotalStats";

export const sortPlayersByContributions = (players: Players[]) => {
  return [...players].sort((a, b) => {
    if (b.ballonDor !== a.ballonDor) {
      return b.ballonDor - a.ballonDor;
    }

    const statsA = calculateTotalStats(a);

    const statsB = calculateTotalStats(b);

    let scoreA = 0;

    let scoreB = 0;

    if (a.position === "GOL") {
      scoreA = (statsA.cleanSheets || 0) * 0.8 + (statsA.assists || 0);
    } else {
      scoreA = (statsA.goals || 0) + (statsA.assists || 0);
    }

    if (b.position === "GOL") {
      scoreB = (statsB.cleanSheets || 0) * 0.8 + (statsB.assists || 0);
    } else {
      scoreB = (statsB.goals || 0) + (statsB.assists || 0);
    }

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    return (statsB.games || 0) - (statsA.games || 0);
  });
};
