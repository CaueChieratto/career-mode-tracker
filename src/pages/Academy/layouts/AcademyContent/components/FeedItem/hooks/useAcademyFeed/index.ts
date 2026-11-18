import { useMemo } from "react";
import { AcademyPlayers } from "../../../../../../../../common/interfaces/AcademyData";
import { AcademyTournaments } from "../../../../../../../../common/interfaces/AcademyData";
import { isEuropeanSeason } from "../../../../utils/isEuropeanSeason";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { extractDateInfo } from "../../helpers/extractDateInfo";
import { formatFeedText } from "../../helpers/formatFeedText";
import { FeedEvent } from "../../types/FeedEvent";

type ExtendedFeedEvent = FeedEvent & { _matchIndex?: number };

export const useAcademyFeed = (
  career: Career,
  players: AcademyPlayers[],
  tournaments: AcademyTournaments[],
) => {
  return useMemo(() => {
    const feed: ExtendedFeedEvent[] = [];
    const isEurope = isEuropeanSeason(career);
    const academyNickname = career.academy!.nickname;
    const academyName = career.academy!.name;
    const careerStartYear =
      career && career.createdAt
        ? new Date(career.createdAt).getFullYear()
        : new Date().getFullYear();

    const getSeasonString = (year: number, month: number) => {
      let eventBaseYear = year;
      if (isEurope && month < 7) {
        eventBaseYear = year - 1;
      }
      const seasonNum = eventBaseYear - careerStartYear + 1;
      return String(seasonNum < 1 ? 1 : seasonNum);
    };

    players.forEach((player) => {
      player.evolutionHistory?.forEach((history) => {
        const { day, month, monthWeight, formattedDate, year } =
          extractDateInfo(history.date, isEurope);
        const season = getSeasonString(year, month);
        const type = history.changedAttribute || "default";
        const { professional, social } = formatFeedText(
          type,
          history.description,
          academyNickname,
          academyName,
        );

        feed.push({
          id: history.id,
          type,
          title: player.name,
          subtitle: professional,
          socialSubtitle: social,
          time: formattedDate,
          monthWeight,
          day,
          season,
          details: {
            playerId: player.id,
            changedAttribute: history.changedAttribute,
            oldValue: history.oldValue,
            newValue: history.newValue,
          },
        });
      });
    });

    tournaments.forEach((tourn) => {
      const finishedMatches =
        tourn.matches?.filter((m) => m.result === "FINISHED") || [];
      const lastMatchId =
        finishedMatches.length > 0
          ? finishedMatches[finishedMatches.length - 1].id
          : null;

      if (tourn.isFinished && finishedMatches.length === 0) {
        const { day, month, monthWeight, formattedDate, year } =
          extractDateInfo(tourn.date, isEurope);
        const season = getSeasonString(year, month);
        const isChampion = tourn.isChampion;

        feed.push({
          id: `${tourn.id}-result`,
          type: "tournament",
          title: tourn.name,
          subtitle: isChampion
            ? "Conclusão de torneio: Campeão."
            : `Conclusão de torneio: ${tourn.tournamentResult}.`,
          socialSubtitle: isChampion
            ? "🏆 CAMPEÃO! Conquistou o título do torneio!"
            : `🔚 Fim de torneio: ${tourn.tournamentResult}.`,
          time: formattedDate,
          monthWeight,
          day,
          season,
          details: {
            tournamentResult: tourn.tournamentResult,
          },
        });
      }

      finishedMatches.forEach((match, index) => {
        const { day, month, monthWeight, formattedDate, year } =
          extractDateInfo(match.date, isEurope);
        const season = getSeasonString(year, month);
        const userG = Number(match.userGoals) || 0;
        const oppG = Number(match.opponentGoals) || 0;
        const userPen = match.userPenalties;
        const oppPen = match.opponentPenalties;
        let profResult = "Empate";
        let socialResult = "🤝 Empate";

        if (
          userG > oppG ||
          (userG === oppG &&
            userPen !== undefined &&
            oppPen !== undefined &&
            userPen > oppPen)
        ) {
          profResult = "Vitória";
          socialResult = "🔥 Vitória incrível!";
        } else if (
          userG < oppG ||
          (userG === oppG &&
            userPen !== undefined &&
            oppPen !== undefined &&
            userPen < oppPen)
        ) {
          profResult = "Derrota";
          socialResult = "💔 Derrota";
        }

        const isDecisiveMatch = tourn.isFinished && match.id === lastMatchId;
        const tournResult = tourn.isChampion
          ? "Campeão"
          : tourn.tournamentResult;
        let subtitle = `${profResult} | ${userG} x ${oppG}`;
        let socialSubtitle = `${socialResult} ${userG} x ${oppG}`;

        if (userPen !== undefined && oppPen !== undefined) {
          subtitle += ` PEN (${userPen} x ${oppPen})`;
          socialSubtitle += ` PEN (${userPen} x ${oppPen})`;
        }
        subtitle += ` vs ${match.opponentTeam}`;
        socialSubtitle += ` vs ${match.opponentTeam}!`;

        if (isDecisiveMatch) {
          subtitle += ` (${tournResult})`;
          socialSubtitle += ` 🏆 ${tournResult}!`;
        }

        feed.push({
          id: match.id,
          type: "match",
          title: tourn.name,
          subtitle: subtitle,
          socialSubtitle: socialSubtitle,
          time: formattedDate,
          monthWeight,
          day,
          season,
          _matchIndex: index,
          details: {
            opponentTeam: match.opponentTeam,
            userGoals: userG,
            opponentGoals: oppG,
            userPenalties: userPen,
            opponentPenalties: oppPen,
            lineup: match.lineup,
            tournamentResult: isDecisiveMatch ? tournResult : undefined,
            status: match.status,
          },
        });
      });
    });

    return feed.sort((a, b) => {
      if (a.monthWeight !== b.monthWeight) {
        return b.monthWeight - a.monthWeight;
      }
      if (a.day !== b.day) {
        return b.day - a.day;
      }
      if (a.type === "match" && b.type === "match" && a.title === b.title) {
        return (b._matchIndex || 0) - (a._matchIndex || 0);
      }
      return 0;
    }) as FeedEvent[];
  }, [career, players, tournaments]);
};
