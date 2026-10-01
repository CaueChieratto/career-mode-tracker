import { career, leagueStats, match, player, season, stat } from '../factories/domain';

// Functions always allocate fresh arrays/objects: cases cannot contaminate each other.
export const loanPlayer = (incoming = false, duration = 1) => {
  const p = player({ id: incoming ? 'incoming' : 'loan', loan: true, incomingLoan: incoming });
  p.contract[0] = { ...p.contract[0], isLoan: true, loanDuration: duration, leftClub: 'Destino', wagePercentage: 50 };
  return p;
};
export const careerScenarios = () => ({
  empty: career(),
  single: career({ clubData: [season({ players: [player()] })] }),
  multiple: career({ clubData: [season({ players: [player()] }), season({ id: 's2', seasonNumber: 2, players: [player({ age: 21 })] })] }),
});
export const rosterScenarios = () => [player(), player({ id: 'sold', sell: true }), loanPlayer(), loanPlayer(true), player({ id: 'promoted', isAcademy: true })];
export const matchScenarios = () => ({
  scheduled: match(),
  finished: match({ status: 'FINISHED', homeScore: 2, awayScore: 0, result: 'V', playerStats: [stat({ goals: 2, rating: 8 })] }),
  extraTime: match({ hasExtraTime: true, stoppage1T: 2, stoppage2T: 3, stoppageET1: 1, stoppageET2: 2 }),
  penalties: match({ status: 'FINISHED', homeScore: 1, awayScore: 1, homePenScore: 4, awayPenScore: 3, result: 'V' }),
});
export const mixedStatsSeason = () => season({
  players: [player({ statsLeagues: [leagueStats({ games: 2, goals: 3, rating: 6 })] })],
  matches: [matchScenarios().finished],
});
export const sourceOverlap = () => ({
  legacyPlayers: [player({ overall: 60 }), player({ id: 'legacy-only', name: 'Legado' })],
  currentPlayers: [player({ overall: 80 }), player({ id: 'current-only', name: 'Atual' })],
  legacyMatches: [match({ homeScore: 0 }), match({ matchesId: 'legacy-match' })],
  currentMatches: [match({ homeScore: 3 }), match({ matchesId: 'current-match' })],
});
export const substitutionChain = () => ({
  players: [player(), player({ id: 'p2', name: 'Bia' }), player({ id: 'p3', name: 'Caio' })],
  playerStats: [stat({ minutesPlayed: 45, substituteIn: 'Bia' }), stat({ playerId: 'p2', minutesPlayed: 30, substituteIn: 'Caio' }), stat({ playerId: 'p3', minutesPlayed: 15 })],
});
export const homonyms = () => [player(), player({ id: 'p2', name: ' ana ', nation: ' brasil ' }), player({ id: 'p3', nation: 'Portugal' })];
