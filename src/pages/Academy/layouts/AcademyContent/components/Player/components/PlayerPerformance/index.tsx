import Styles from "./PlayerPerformance.module.css";
import { usePlayerPerformance } from "./hooks/usePlayerPerformance";
import { TournamentStatItem } from "./components/TournamentStatItem";
import { GeneralStatsFooter } from "./components/GeneralStatsFooter";
import { ActiveStatCardProvider } from "./contexts/ActiveStatCardContext";
import { useAcademyContext } from "../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { isEuropeanSeason } from "../../../../utils/isEuropeanSeason";
import { compareAcademyDates } from "../../../FeedItem/helpers/extractDateInfo";
import { TournamentStats } from "./types";

export const PlayerPerformance: React.FC = () => {
  const { selectedPlayer, tournamentStats, totalStats, isGeral } =
    usePlayerPerformance();
  const { career, tournamentsAcademy } = useAcademyContext();

  if (!selectedPlayer) return null;

  const isEurope = isEuropeanSeason(career);

  const getTournamentDate = (id: string) => {
    return tournamentsAcademy.find((t) => t.id === id)?.date || "01/01/2000";
  };

  const sortStatsByDate = (a: TournamentStats, b: TournamentStats) => {
    const dateA = getTournamentDate(a.tournamentId);
    const dateB = getTournamentDate(b.tournamentId);
    return compareAcademyDates(dateA, dateB, isEurope, 0);
  };

  const tournamentsBySeason = tournamentStats.reduce(
    (acc, stat) => {
      const season = stat.season || "Geral";
      if (!acc[season]) {
        acc[season] = [];
      }
      acc[season].push(stat);
      return acc;
    },
    {} as Record<string, typeof tournamentStats>,
  );

  return (
    <div className={Styles.container}>
      <ActiveStatCardProvider>
        {tournamentStats.length === 0 ? (
          <p className={Styles.noData}>
            Nenhuma estatística disponível para este jogador.
          </p>
        ) : (
          <>
            <GeneralStatsFooter totalStats={totalStats} isGeral={isGeral} />

            {isGeral ? (
              Object.entries(tournamentsBySeason)
                .sort(([seasonA], [seasonB]) => {
                  if (seasonA.toLowerCase() === "geral") return -1;
                  if (seasonB.toLowerCase() === "geral") return 1;
                  return Number(seasonA) - Number(seasonB);
                })
                .map(([season, stats]) => (
                  <div key={season} className={Styles.seasonSection}>
                    <div className={Styles.seasonHeader}>
                      <h2 className={Styles.seasonTitle}>
                        <span className={Styles.seasonLabel}>Temporada</span>
                        <span className={Styles.seasonNumber}>{season}</span>
                      </h2>
                    </div>
                    <div className={Styles.tournamentsContainer}>
                      {[...stats].sort(sortStatsByDate).map((stat) => (
                        <TournamentStatItem
                          key={stat.tournamentId}
                          stat={stat}
                        />
                      ))}
                    </div>
                  </div>
                ))
            ) : (
              <div className={Styles.tournamentsContainer}>
                {[...tournamentStats].sort(sortStatsByDate).map((stat) => (
                  <TournamentStatItem key={stat.tournamentId} stat={stat} />
                ))}
              </div>
            )}
          </>
        )}
      </ActiveStatCardProvider>
    </div>
  );
};
