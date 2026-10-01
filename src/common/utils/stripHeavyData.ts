import { ClubData } from "../interfaces/club/clubData";

export const stripHeavyData = (
  clubData: ClubData[],
  storedClubData: ClubData[] = [],
): ClubData[] => {
  return clubData.map((season) => {
    // Only discard hydrated copies; retain the original embedded data unchanged.
    // Without a stored snapshot, there is no evidence that removal is safe.
    const stored = storedClubData.find((s) => s.id === season.id) ?? season;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { matches, players, table, academyPlayers, ...cleanSeason } = season;
    return {
      ...cleanSeason,
      players: stored.players || [],
      ...(stored.matches?.length ? { matches: stored.matches } : {}),
      ...(Object.prototype.hasOwnProperty.call(stored, "table")
        ? { table: stored.table }
        : {}),
    } as ClubData;
  });
};
