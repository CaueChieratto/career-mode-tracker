import { AcademyPlayers } from "../../../../../../../../interfaces/AcademyPlayers/AcademyPlayers";
import { AcademyMatches } from "../../../../../../../../interfaces/AcademyTournaments/AcademyMatches/AcademyMatches";
import { PlayerMatchesStats } from "../../../../../../../../interfaces/AcademyTournaments/AcademyMatches/PlayerMatchesStats";

export const parseDateValue = (date?: string): number => {
  if (!date || typeof date !== "string") return Number.NaN;
  const clean = date.trim().split(" ")[0];
  if (clean.includes("-")) {
    const parts = clean.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return Date.UTC(parts[0], parts[1] - 1, parts[2]);
    }
  }
  const parts = clean.split("/").map(Number);
  if (parts.length >= 2) {
    const day = parts[0];
    const month = parts[1];
    let year = parts.length >= 3 ? parts[2] : NaN;
    if (Number.isNaN(year)) {
      year = 2000;
    } else if (year < 100) {
      year += 2000;
    }
    return day && month && year ? Date.UTC(year, month - 1, day) : Number.NaN;
  }
  return Number.NaN;
};

export const getSuggestedLineup = (
  matches: AcademyMatches[],
  destination: AcademyMatches,
  players: AcademyPlayers[],
): PlayerMatchesStats[] => {
  if (destination.result === "FINISHED" || destination.lineup.length) return [];
  const destinationIndex = matches.findIndex((match) => match.id === destination.id);
  const destinationDate = parseDateValue(destination.date);

  const source = matches
    .map((match, index) => ({
      match,
      index,
      date: parseDateValue(match.date),
    }))
    .filter(
      ({ match, index, date }) =>
        match.lineup.length > 0 &&
        (!Number.isNaN(destinationDate) && !Number.isNaN(date)
          ? date < destinationDate || (date === destinationDate && index < destinationIndex)
          : index < destinationIndex),
    )
    .sort((a, b) => {
      if (!Number.isNaN(a.date) && !Number.isNaN(b.date)) {
        return b.date - a.date || b.index - a.index;
      }
      return b.index - a.index;
    })[0]?.match;

  if (!source) return [];

  const seen = new Set<string>();
  return source.lineup.flatMap((stat) => {
    const rawId = String(stat.playerId || "").trim();
    if (!rawId || seen.has(rawId)) return [];
    seen.add(rawId);

    const player = players.find(
      (candidate) =>
        String(candidate.id).trim() === rawId ||
        (Boolean(candidate.name) &&
          Boolean(stat.playerName) &&
          candidate.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase()),
    );

    if (!player) return [];

    const isExited = player.status === "promoted" || player.status === "released";
    if (isExited) {
      const exitDateStr =
        player.exitDate ||
        player.evolutionHistory?.find(
          (h) =>
            h.changedAttribute === "status" &&
            (h.newValue === "promoted" || h.newValue === "released"),
        )?.date;

      if (exitDateStr) {
        const exitDate = parseDateValue(exitDateStr);
        if (!Number.isNaN(destinationDate) && !Number.isNaN(exitDate) && destinationDate > exitDate) {
          return [];
        }
      }
    }

    return [
      {
        playerId: player.id,
        playerName: player.name,
        goals: null,
        assists: null,
        rating: null,
        defesas: null,
        cleanSheets: null,
      },
    ];
  });
};
