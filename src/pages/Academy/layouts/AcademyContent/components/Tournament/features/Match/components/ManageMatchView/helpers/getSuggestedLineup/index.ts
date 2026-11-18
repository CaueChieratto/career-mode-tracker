import {
  AcademyPlayers,
  AcademyMatches,
  PlayerMatchesStats,
  AcademyTournaments,
} from "../../../../../../../../../../../../common/interfaces/AcademyData";

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

const mapLineupToActivePlayers = (
  lineup: PlayerMatchesStats[],
  players: AcademyPlayers[],
  destinationDate: number,
): PlayerMatchesStats[] => {
  const seen = new Set<string>();
  return lineup.flatMap((stat) => {
    const rawId = String(stat.playerId || "").trim();
    if (!rawId || seen.has(rawId)) return [];
    seen.add(rawId);

    const player = players.find(
      (candidate) =>
        String(candidate.id).trim() === rawId ||
        (Boolean(candidate.name) &&
          Boolean(stat.playerName) &&
          candidate.name.trim().toLowerCase() ===
            stat.playerName.trim().toLowerCase()),
    );

    if (!player) return [];

    const isExited =
      player.status === "promoted" || player.status === "released";
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
        if (
          !Number.isNaN(destinationDate) &&
          !Number.isNaN(exitDate) &&
          destinationDate > exitDate
        ) {
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

export const getSuggestedLineup = (
  matches: AcademyMatches[],
  destination: AcademyMatches,
  players: AcademyPlayers[],
  tournaments?: AcademyTournaments[],
  currentTournamentId?: string,
): PlayerMatchesStats[] => {
  if (destination.result === "FINISHED" || destination.lineup.length) return [];
  const destinationIndex = matches.findIndex(
    (match) => match.id === destination.id,
  );
  const destinationDate = parseDateValue(destination.date);

  const localSource = matches
    .map((match, index) => ({
      match,
      index,
      date: parseDateValue(match.date),
    }))
    .filter(
      ({ match, index, date }) =>
        match.lineup.length > 0 &&
        (!Number.isNaN(destinationDate) && !Number.isNaN(date)
          ? date < destinationDate ||
            (date === destinationDate && index < destinationIndex)
          : index < destinationIndex),
    )
    .sort((a, b) => {
      if (!Number.isNaN(a.date) && !Number.isNaN(b.date)) {
        return b.date - a.date || b.index - a.index;
      }
      return b.index - a.index;
    })[0]?.match;

  if (localSource) {
    return mapLineupToActivePlayers(localSource.lineup, players, destinationDate);
  }

  // Se não houver partida prévia com escalação no torneio atual, busca nos torneios anteriores
  if (!tournaments || tournaments.length === 0) return [];

  const currentTourn = tournaments.find((t) => t.id === currentTournamentId);
  const effectiveDestinationDate = !Number.isNaN(destinationDate)
    ? destinationDate
    : parseDateValue(currentTourn?.date);

  const currentTournIndex = tournaments.findIndex(
    (t) => t.id === currentTournamentId,
  );

  const previousTournaments = tournaments
    .map((t, index) => ({
      tournament: t,
      index,
      date: parseDateValue(t.date),
    }))
    .filter(({ tournament, index, date }) => {
      if (tournament.id === currentTournamentId) return false;
      if (!Number.isNaN(effectiveDestinationDate) && !Number.isNaN(date)) {
        return date <= effectiveDestinationDate;
      }
      if (currentTournIndex !== -1) {
        return index < currentTournIndex;
      }
      return true;
    })
    .sort((a, b) => {
      if (!Number.isNaN(a.date) && !Number.isNaN(b.date)) {
        return b.date - a.date || b.index - a.index;
      }
      return b.index - a.index;
    });

  for (const { tournament } of previousTournaments) {
    const matchesWithLineup = (tournament.matches || [])
      .map((m, mIdx) => ({
        match: m,
        mIdx,
        date: parseDateValue(m.date),
      }))
      .filter(({ match }) => match.lineup && match.lineup.length > 0)
      .sort((a, b) => {
        if (!Number.isNaN(a.date) && !Number.isNaN(b.date)) {
          return b.date - a.date || b.mIdx - a.mIdx;
        }
        return b.mIdx - a.mIdx;
      });

    if (matchesWithLineup.length > 0) {
      const lastMatch = matchesWithLineup[0].match;
      const result = mapLineupToActivePlayers(
        lastMatch.lineup,
        players,
        effectiveDestinationDate,
      );
      if (result.length > 0) {
        return result;
      }
    }
  }

  return [];
};
