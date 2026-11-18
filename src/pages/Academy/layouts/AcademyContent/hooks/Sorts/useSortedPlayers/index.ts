import { useMemo } from "react";
import { AcademyPlayers } from "../../../../../../../common/interfaces/AcademyData";
import { isEuropeanSeason } from "../../../utils/isEuropeanSeason";
import { Career } from "../../../../../../../common/interfaces/Career";
import { compareAcademyDates } from "../../../components/FeedItem/helpers/extractDateInfo";
import { getPositionRank } from "../../../../../../../common/utils/Sorts";
import { usePersistedSort } from "../usePersistedSort";
import { PLAYER_SORT_OPTIONS } from "../../../constants/Sorts";

export type PlayerSortOption =
  | "default"
  | "shirtNumber-asc"
  | "age-asc"
  | "name-asc"
  | "weight-desc"
  | "height-desc"
  | "position-asc"
  | "overall-desc";

export const useSortedPlayers = (players: AcademyPlayers[], career: Career) => {
  const storageKey = `@academy_playerSort_${career.id}`;

  const {
    sortOption: playerSort,
    isReversed,
    handleSortChange: setPlayerSort,
  } = usePersistedSort<PlayerSortOption>(storageKey, "default");

  const sortedPlayers = useMemo(() => {
    const isEurope = isEuropeanSeason(career);

    return [...players].sort((a, b) => {
      let result = 0;

      switch (playerSort) {
        case "shirtNumber-asc":
          result = (a.shirtNumber || 999) - (b.shirtNumber || 999);
          break;
        case "age-asc":
          result = a.age - b.age;
          break;
        case "name-asc":
          result = a.name.localeCompare(b.name);
          break;
        case "weight-desc":
          result = b.weight - a.weight;
          break;
        case "height-desc":
          result = b.height - a.height;
          break;
        case "position-asc":
          result = getPositionRank(a.position) - getPositionRank(b.position);
          break;
        case "overall-desc":
          result = b.overall - a.overall;
          break;
        case "default":
        default: {
          result = compareAcademyDates(b.arrivalDate, a.arrivalDate, isEurope, 0);
          break;
        }
      }

      return isReversed ? -result : result;
    });
  }, [players, playerSort, isReversed, career]);

  return {
    sortedPlayers,
    playerSort,
    setPlayerSort,
    isReversed,
    playerSortOptions: PLAYER_SORT_OPTIONS,
  };
};
