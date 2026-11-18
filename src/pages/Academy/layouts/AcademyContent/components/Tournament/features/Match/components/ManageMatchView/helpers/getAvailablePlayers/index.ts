import { AcademyPlayers } from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { PlayerMatchesStats } from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { isEuropeanSeason } from "../../../../../../../../utils/isEuropeanSeason";
import { Career } from "../../../../../../../../../../../../common/interfaces/Career";

const parseDate = (dateStr: string, isEurope: boolean) => {
  if (!dateStr) return new Date(2000, 0, 1);
  const parts = dateStr.split("/");
  if (parts.length >= 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    let year = Number(parts[2]);

    if (isEurope && month < 7) {
      year += 1;
    }

    return new Date(year, month - 1, day);
  }
  return new Date(2000, 0, 1);
};

export const getAvailablePlayers = (
  allPlayersAcademy: AcademyPlayers[],
  lineupStats: PlayerMatchesStats[],
  matchDateStr: string,
  career: Career,
): AcademyPlayers[] => {
  const isEurope = isEuropeanSeason(career);
  const matchDate = parseDate(matchDateStr, isEurope);

  return allPlayersAcademy.filter((p) => {
    if (lineupStats.some((l) => l.playerId === p.id)) {
      return false;
    }

    if (p.status === "promoted" || p.status === "released") {
      let exitDateStr = p.exitDate;

      if (!exitDateStr) {
        const exitEvent = p.evolutionHistory?.find(
          (h) =>
            h.changedAttribute === "status" &&
            (h.newValue === "promoted" || h.newValue === "released"),
        );
        if (exitEvent && exitEvent.date) {
          exitDateStr = exitEvent.date;
        }
      }

      if (exitDateStr) {
        const exitDate = parseDate(exitDateStr, isEurope);

        if (matchDate > exitDate) {
          return false;
        }
      }
    }

    return true;
  });
};
