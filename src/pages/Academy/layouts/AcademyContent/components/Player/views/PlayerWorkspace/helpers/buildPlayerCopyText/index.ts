import { Career } from "../../../../../../../../../../common/interfaces/Career";
import { AcademyPlayers } from "../../../../../../interfaces/AcademyPlayers/AcademyPlayers";
import { AcademyTournaments } from "../../../../../../interfaces/AcademyTournaments/AcademyTournaments";

export const buildPlayerCopyText = (
  player: AcademyPlayers,
  tournamentsAcademy: AcademyTournaments[] | undefined,
  career?: Career,
): string => {
  let matchesPlayed = 0;
  let totalGoals = 0;
  let totalAssists = 0;
  let totalDefesas = 0;
  let totalRating = 0;
  let ratingCount = 0;
  let titlesWon = 0;

  tournamentsAcademy?.forEach((t) => {
    let playedInTournament = false;
    t.matches?.forEach((m) => {
      const stat = m.lineup?.find(
        (p) =>
          (p.playerId !== undefined &&
            p.playerId !== null &&
            player.id !== undefined &&
            player.id !== null &&
            String(p.playerId).trim() === String(player.id).trim()) ||
          (Boolean(p.playerName) &&
            Boolean(player.name) &&
            p.playerName.trim().toLowerCase() ===
              player.name.trim().toLowerCase()),
      );
      if (stat) {
        matchesPlayed++;
        playedInTournament = true;
        totalGoals += Number(stat.goals ?? 0);
        totalAssists += Number(stat.assists ?? 0);
        totalDefesas += Number(stat.defesas ?? 0);

        if (
          stat.rating !== null &&
          stat.rating !== undefined &&
          !isNaN(Number(stat.rating))
        ) {
          totalRating += Number(stat.rating);
          ratingCount++;
        }
      }
    });

    if (playedInTournament && t.isChampion) {
      titlesWon++;
    }
  });

  const avgRating =
    ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : "0.00";

  const name = player.name || "";
  const position = player.position || "";
  const age = `${player.age ?? 0} anos`;
  const nationality = (player.nationality || "").toUpperCase();
  const heightWeight = `${player.height ?? 0}cm e ${player.weight ?? 0}kg`;
  const matches = `${matchesPlayed} ${matchesPlayed === 1 ? "Jogo" : "Jogos"}`;

  const isGoalkeeper = player.position === "GOL";
  let statsPart = "";

  if (isGoalkeeper) {
    const defesas = `${totalDefesas} ${totalDefesas === 1 ? "Defesa" : "Defesas"}`;
    const assists = `${totalAssists} ${totalAssists === 1 ? "Assistência" : "Assistências"}`;
    statsPart = `${defesas}, ${assists}`;
  } else {
    const ga = `${totalGoals + totalAssists} G/A`;
    const goals = `${totalGoals} ${totalGoals === 1 ? "Gol" : "Gols"}`;
    const assists = `${totalAssists} ${totalAssists === 1 ? "Assistência" : "Assistências"}`;
    statsPart = `${ga}, ${goals}, ${assists}`;
  }

  const timesText = titlesWon === 1 ? "1 vez" : `${titlesWon} vezes`;
  let tournamentName = career?.academy?.tournament?.trim();
  if (!tournamentName && tournamentsAcademy && tournamentsAcademy.length > 0) {
    const rawName = tournamentsAcademy[0].name || "";
    const match = rawName.match(/^(.+?)\s*-\s*\d+ª\s*Edi[çc][ãa]o$/i);
    tournamentName = match ? match[1].trim() : rawName.trim();
  }
  if (!tournamentName) {
    tournamentName = "Copa Jorge Griffa";
  }

  const titlesPart = `Campeão ${timesText} de ${tournamentName}`;

  return `${name}, ${position}, ${age}, ${nationality}, ${heightWeight}, ${matches}, ${statsPart}, ${avgRating}, ${titlesPart}.`;
};

export const formatPlayerText = buildPlayerCopyText;
