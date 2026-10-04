import { Career } from "../../../../../../../../../../common/interfaces/Career";
import { AcademyPlayers } from "../../../../../../interfaces/AcademyPlayers/AcademyPlayers";
import { PlayerMatchesStats } from "../../../../../../interfaces/AcademyTournaments/AcademyMatches/PlayerMatchesStats";
import { AcademyTournaments } from "../../../../../../interfaces/AcademyTournaments/AcademyTournaments";

export const formatTournamentHeaderName = (name: string): string => {
  if (!name) return "";
  const match = name.match(/^(.+?)\s*-\s*(\d+)ª\s*Edi[çc][ãa]o$/i);
  if (match) {
    const tournamentBase = match[1].trim();
    const ed = match[2];
    const prefix = /^(torneio|campeonato)/i.test(tournamentBase) ? "do" : "da";
    return `${ed}ª edição ${prefix} ${tournamentBase}`;
  }
  return name.trim();
};

export const formatPlayerLine = (
  stat: PlayerMatchesStats,
  allPlayers: AcademyPlayers[],
): string => {
  const player = allPlayers.find(
    (p) =>
      String(p.id).trim() === String(stat.playerId).trim() ||
      (Boolean(p.name) &&
        Boolean(stat.playerName) &&
        p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase()),
  );

  const name = stat.playerName || player?.name || "Jogador";
  const ratingNum = typeof stat.rating === "number" ? stat.rating : 0;
  const ratingFormatted = ratingNum.toFixed(1).replace(".", ",");

  const isGoalkeeper =
    player?.position === "GOL" ||
    (stat.defesas !== null && stat.defesas !== undefined && stat.defesas > 0);

  const goals = Number(stat.goals) || 0;
  const assists = Number(stat.assists) || 0;
  const defesas = Number(stat.defesas) || 0;

  let statsDescription = "";

  if (isGoalkeeper) {
    if (defesas === 0 && assists === 0) {
      statsDescription = "sem defesas ou assistências.";
    } else if (defesas > 0 && assists === 0) {
      statsDescription = `${defesas} ${defesas === 1 ? "defesa" : "defesas"}, sem assistências.`;
    } else if (defesas === 0 && assists > 0) {
      statsDescription = `sem defesas, ${assists} ${assists === 1 ? "assistência" : "assistências"}.`;
    } else {
      statsDescription = `${defesas} ${defesas === 1 ? "defesa" : "defesas"} e ${assists} ${assists === 1 ? "assistência" : "assistências"}.`;
    }
  } else {
    if (goals === 0 && assists === 0) {
      statsDescription = "sem gols ou assistências.";
    } else if (goals > 0 && assists === 0) {
      statsDescription = `${goals} ${goals === 1 ? "gol" : "gols"}.`;
    } else if (goals === 0 && assists > 0) {
      statsDescription = `${assists} ${assists === 1 ? "assistência" : "assistências"}.`;
    } else {
      statsDescription = `${goals} ${goals === 1 ? "gol" : "gols"} e ${assists} ${assists === 1 ? "assistência" : "assistências"}.`;
    }
  }

  return `• ${name} — nota ${ratingFormatted}; ${statsDescription}`;
};

export const buildTournamentCopyText = (
  tournament: AcademyTournaments,
  career: Career,
  allPlayers: AcademyPlayers[],
): string => {
  const headerName = formatTournamentHeaderName(tournament.name);
  const matches = tournament.matches || [];

  if (matches.length === 0) {
    return `${headerName} {\n}`;
  }

  const formattedMatches = matches.map((match) => {
    const phase = (match.status || "PARTIDA").toUpperCase().trim();
    const userTeam = career.clubName || "Seu Time";
    const userGoals = match.userGoals ?? 0;
    const oppGoals = match.opponentGoals ?? 0;
    const oppTeam = match.opponentTeam || "Adversário";
    const hasPenalties =
      match.userPenalties !== undefined &&
      match.userPenalties !== null &&
      match.opponentPenalties !== undefined &&
      match.opponentPenalties !== null;
    const penaltiesText = hasPenalties
      ? ` — PEN (${match.userPenalties} x ${match.opponentPenalties})`
      : "";
    const scoreLine = `${userTeam} ${userGoals} x ${oppGoals} ${oppTeam}${penaltiesText}`;

    const playerLines = (match.lineup || []).map((stat) =>
      formatPlayerLine(stat, allPlayers),
    );

    if (playerLines.length === 0) {
      return `${phase} {\n${scoreLine}\n}`;
    }

    return `${phase} {\n${scoreLine}\n\n${playerLines.join("\n")}\n}`;
  });

  return `${headerName} {\n\n${formattedMatches.join("\n\n")}\n}`;
};

export const formatTournamentText = buildTournamentCopyText;
