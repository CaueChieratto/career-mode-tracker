import { getTopN } from "..";
import { CuriositiesData } from "../../../../../../../../../common/interfaces/Curiosities";
import { isCuriosityGroupEnabled } from "../../../../../../../../../common/stats";
import { CuriositiesState } from "../../helpers/createCuriositiesState";
import { HighlightItem } from "../../types";

export const buildRankings = (
  state: CuriositiesState,
): CuriositiesData["rankings"] => {
  const reincidents = Object.entries(state.opponentMatchGoals)
    .map(([player, matches]) => ({ label: player, count: matches.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    topScoringMinutes: getTopN(state.teamGoalsMinute),
    topConcedingMinutes: getTopN(state.concededGoalsMinute),
    topPlayerGoalMinutes: getTopN(state.playerGoalMinutes),
    topPlayerAssistMinutes: getTopN(state.playerAssistMinutes),
    topOpponentScorers: getTopN(state.opponentScorers),
    topTeamDuos: getTopN(state.teamDuos),
    topBestDuos: getTopN(state.bestDuos),
    topOpponentDuos: getTopN(state.opponentDuos),
    topReincidents: reincidents,
    topScores: getTopN(state.scoreFrequency),
    topOpponents: Object.entries(state.opponentStats)
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 5)
      .map(([label, v]) => ({ label, count: v.games })),
    topVictims: getTopN(state.opponentGoalsScored),
    topPunchingBags: getTopN(state.punchingBagDiffs),
    topOpponentTeamsScorers: getTopN(state.opponentTeamsScorers),
    topDecisivePlayers: getTopN(state.decisivePlayers),
    topOpeners: getTopN(state.openerPlayers),
    topWinAssistants: getTopN(state.winAssistants),
    topStoppageTimeExperts: getTopN(state.stoppageTimeExperts),
    dangerousIntervals: getTopN(state.dangerousIntervals),
    topOpponentParticipations: getTopN(state.opponentGoalParticipations),
  };
};

export const buildHighlights = (state: CuriositiesState): HighlightItem[] => {
  const mostDrawnOpponent = Object.entries(state.drawsByOpponent).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const favoriteOpponent = Object.entries(state.opponentStats).sort(
    (a, b) => b[1].wins - a[1].wins,
  )[0];
  const worstOpponent = Object.entries(state.opponentStats).sort(
    (a, b) => b[1].losses - a[1].losses,
  )[0];

  const highlights: HighlightItem[] = [
    {
      label: "🏆 Maior Sequência de Vitórias",
      value: `${state.maxWinStreak} jogos`,
      group: "general",
    },
    {
      label: "🛡️ Maior Série Invicta",
      value: `${state.maxUnbeaten} jogos`,
      group: "general",
    },
    {
      label: "⚽ Maior Sequência Marcando",
      value: `${state.maxScoringStreak} jogos`,
      group: "goals",
    },
    {
      label: "🥅 Sequência Sem Sofrer Gols",
      value: `${state.maxCleanSheetStreak} jogos`,
      group: "defense",
    },
    {
      label: "⚠️ Sequência Sofrendo Gols",
      value: `${state.maxConcedingStreak} jogos`,
      group: "defense",
    },

    ...(state.fastestGoal.min !== 999
      ? [{ label: "⚡ Gol Relâmpago", value: state.fastestGoal.text, group: "goals" }]
      : []),
    ...(state.latestWinGoal.min !== 0
      ? [{ label: "🏆 Vitória Mais Tardia", value: state.latestWinGoal.text, group: "goals" }]
      : []),
    ...(state.latestDrawGoal.min !== 0
      ? [{ label: "🤝 Empate Salvo no Fim", value: state.latestDrawGoal.text, group: "goals" }]
      : []),
    ...(state.biggestComebackWin.deficit > 0
      ? [
          {
            label: "🔄 Maior Virada Conquistada",
            value: state.biggestComebackWin.text,
            group: "general",
          },
        ]
      : []),
    ...(state.biggestComebackLoss.lead > 0
      ? [
          {
            label: "💔 Maior Virada Sofrida",
            value: state.biggestComebackLoss.text,
            group: "general",
          },
        ]
      : []),

    {
      label: "⏱️ Faro de Gol (Tempos)",
      value:
        state.goalsExtraTime > 0
          ? `${state.goalsFirstHalf} no 1ºT | ${state.goalsSecondHalf} no 2ºT | ${state.goalsExtraTime} na Prorrogação`
          : `${state.goalsFirstHalf} no 1ºT | ${state.goalsSecondHalf} no 2ºT`,
      group: "goals",
    },
    {
      label: "💚 Adversário Favorito",
      value: favoriteOpponent
        ? `${favoriteOpponent[0]} (${favoriteOpponent[1].wins} vitórias)`
        : "-",
      group: "general",
    },
    {
      label: "👟 Pedra no Sapato",
      value: worstOpponent
        ? `${worstOpponent[0]} (${worstOpponent[1].losses} derrotas)`
        : "-",
      group: "general",
    },
    {
      label: "🤝 Rei do Empate",
      value:
        mostDrawnOpponent && mostDrawnOpponent[1] > 0
          ? `${mostDrawnOpponent[0]} (${mostDrawnOpponent[1]} empates)`
          : "-",
      group: "general",
    },
    {
      label: "🔥 Invicto Quando Marca Primeiro",
      value:
        state.scoredFirstGamesCount > 0
          ? `${state.unbeatenWhenScoringFirstCount} jogos sem perder (${state.scoredFirstGamesCount} abrindo placar)`
          : "-",
      group: "goals",
    },
    {
      label: "⚡ Virador Oficial",
      value:
        state.comebackWinsCount > 0
          ? `${state.comebackWinsCount} vitórias após sair perdendo`
          : "-",
      group: "general",
    },
    {
      label: "🎯 Precisão",
      value:
        state.precisionMatchesCount > 0
          ? `Marcou nos 2 tempos em ${state.precisionMatchesCount} partidas`
          : "-",
      group: "goals",
    },
    {
      label: "💥 Explosão Ofensiva",
      value:
        state.explosiveMatchesCount > 0
          ? `${state.explosiveMatchesCount} jogos com 3+ gols`
          : "-",
      group: "goals",
    },
    {
      label: "🚫 Dia Sem Inspiração",
      value:
        state.blankMatchesCount > 0
          ? `Passou em branco em ${state.blankMatchesCount} jogos`
          : "-",
      group: "goals",
    },
    {
      label: "🚀 Começo Avassalador",
      value:
        state.overwhelmingStartsCount > 0
          ? `Gol nos primeiros 15' em ${state.overwhelmingStartsCount} jogos`
          : "-",
      group: "goals",
    },
    {
      label: "😱 Final Dramático",
      value:
        state.dramaticEndsCount > 0
          ? `Sofreu gols após 75' em ${state.dramaticEndsCount} jogos`
          : "-",
      group: "goals",
    },

    {
      label: "💪 Massacre Histórico",
      value: state.biggestWin.text,
      group: "general",
    },
    {
      label: "🎢 Jogo Mais Maluco",
      value: state.craziestMatch.text,
      group: "general",
    },
    {
      label: "📊 Maior Posse de Bola",
      value: state.highestPossession.text,
      group: "general",
    },
  ].filter(
    (h) =>
      h.value !== "-" &&
      h.value !== "0 jogos" &&
      h.value !== "0 no 1ºT | 0 no 2ºT" &&
      h.value !== "0 no 1ºT | 0 no 2ºT | 0 na Prorrogação" &&
      isCuriosityGroupEnabled(h.group),
  );

  return highlights;
};
