import { AcademyPlayers } from "../../../../../../../../interfaces/AcademyPlayers/AcademyPlayers";
import { AcademyMatches } from "../../../../../../../../interfaces/AcademyTournaments/AcademyMatches/AcademyMatches";
import { PlayerMatchesStats } from "../../../../../../../../interfaces/AcademyTournaments/AcademyMatches/PlayerMatchesStats";

const dateValue = (date: string) => {
  const [day, month, year] = date.split("/").map(Number);
  return year && month && day ? Date.UTC(year, month - 1, day) : Number.NaN;
};

export const getSuggestedLineup = (matches: AcademyMatches[], destination: AcademyMatches, players: AcademyPlayers[]): PlayerMatchesStats[] => {
  if (destination.result === "FINISHED" || destination.lineup.length) return [];
  const destinationIndex = matches.findIndex((match) => match.id === destination.id);
  const destinationDate = dateValue(destination.date);
  const source = matches.map((match, index) => ({ match, index, date: dateValue(match.date) }))
    .filter(({ match, index, date }) => match.lineup.length > 0 && (date < destinationDate || (date === destinationDate && index < destinationIndex)))
    .sort((a, b) => b.date - a.date || b.index - a.index)[0]?.match;
  if (!source) return [];
  const seen = new Set<string>();
  return source.lineup.flatMap((stat) => {
    if (seen.has(stat.playerId)) return [];
    seen.add(stat.playerId);
    const player = players.find((candidate) => candidate.id === stat.playerId);
    if (!player || (player.exitDate && destinationDate > dateValue(player.exitDate))) return [];
    return [{ playerId: player.id, playerName: player.name, goals: null, assists: null, rating: null, defesas: null, cleanSheets: null }];
  });
};
