import { Players } from "../../../../common/interfaces/playersInfo/players";
import { getAggregatedPlayersForCareer } from "../../../../common/stats/helpers/mergeMatchStats";
import { AugmentedCareer } from "../../../../common/interfaces/ComparePlayers";
import { Match } from "../../../../common/interfaces/Match";

export const getAvailablePlayers = (
  augmentedCareer: AugmentedCareer | null,
  seasonId: string | undefined,
  compareMode: "season" | "total" | "none",
): Players[] => {
  if (!augmentedCareer || compareMode === "none") return [];

  let players: Players[] = [];
  let matches: Match[] = [];

  if (compareMode === "total") {
    players = getAggregatedPlayersForCareer(augmentedCareer) || [];
    augmentedCareer.clubData.forEach((s) => {
      if (s.matches) matches.push(...s.matches);
    });
  } else {
    const season = augmentedCareer.clubData.find(
      (s) => String(s.id) === String(seasonId),
    );
    players = season?.players || [];
    matches = season?.matches || [];
  }

  const playedPlayerIds = new Set<string>();
  matches.forEach((m) => {
    if (m.status === "FINISHED" && m.playerStats) {
      m.playerStats.forEach((ps) => playedPlayerIds.add(String(ps.playerId)));
    }
  });

  return players.filter((p) => playedPlayerIds.has(String(p.id)));
};
