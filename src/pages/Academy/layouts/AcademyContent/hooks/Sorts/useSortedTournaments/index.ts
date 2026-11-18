import { useMemo } from "react";
import { AcademyTournaments } from "../../../../../../../common/interfaces/AcademyData";
import { usePersistedSort } from "../usePersistedSort";
import { TOURNAMENT_SORT_OPTIONS } from "../../../constants/Sorts";
import { Career } from "../../../../../../../common/interfaces/Career";
import { isEuropeanSeason } from "../../../utils/isEuropeanSeason";
import { compareAcademyDates } from "../../../components/FeedItem/helpers/extractDateInfo";

export type TournamentSortOption = "default" | "date-asc" | "edition-asc";

export const useSortedTournaments = (
  tournaments: AcademyTournaments[],
  career: Career,
) => {
  const storageKey = `@academy_tournamentSort_${career.id}`;
  const {
    sortOption: tournamentSort,
    isReversed,
    handleSortChange: setTournamentSort,
  } = usePersistedSort<TournamentSortOption>(storageKey, "default");

  const sortedTournaments = useMemo(() => {
    const isEurope = isEuropeanSeason(career);

    return [...tournaments].sort((a, b) => {
      let result = 0;

      switch (tournamentSort) {
        case "edition-asc": {
          const getEdition = (name: string) => {
            if (!name) return 0;
            const parts = name.split("-");
            if (parts.length > 1) {
              const editionStr = parts[1].replace(/\D/g, "");
              return parseInt(editionStr, 10) || 0;
            }
            return 0;
          };

          result = getEdition(a.name) - getEdition(b.name);
          break;
        }

        case "date-asc": {
          result = compareAcademyDates(
            a.date || "01/01/2000",
            b.date || "01/01/2000",
            isEurope,
            0,
          );
          break;
        }

        case "default":
        default:
          result = 0;
          break;
      }

      return isReversed ? -result : result;
    });
  }, [tournaments, tournamentSort, isReversed, career]);

  return {
    sortedTournaments,
    tournamentSort,
    setTournamentSort,
    isReversed,
    tournamentSortOptions: TOURNAMENT_SORT_OPTIONS,
  };
};
