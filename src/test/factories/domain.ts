import type { Career } from '../../common/interfaces/Career';
import type { ClubData } from '../../common/interfaces/club/clubData';
import type { Players } from '../../common/interfaces/playersInfo/players';
import type { LeagueStats } from '../../common/interfaces/playersStats/leagueStats';
import type { PlayerMatchStat } from '../../common/interfaces/PlayerMatchStat';
import type { Match } from '../../common/interfaces/Match';
import type { SavedLineup } from '../../common/interfaces/Lineup';
import type { AcademyPlayers } from '../../pages/Academy/layouts/AcademyContent/interfaces/AcademyPlayers/AcademyPlayers';

export const leagueStats = (stats: Partial<LeagueStats['stats']> = {}, leagueName = 'Liga'): LeagueStats => ({
  leagueName, leagueImage: 'liga.svg',
  stats: { games: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0, ...stats },
});
export const player = (overrides: Partial<Players> = {}): Players => ({
  id: 'p1', name: 'Ana', nation: 'Brasil', age: 20, overall: 75, position: 'ATA', sector: 'Ataque',
  salary: 1000, shirtNumber: '9', playerValue: 10000, buy: false, captain: false, sell: false,
  loan: false, incomingLoan: false, contractTime: 2, ballonDor: 0, statsLeagues: [],
  contract: [{ buyValue: 100, sellValue: 0, fromClub: 'Origem', leftClub: '', dataArrival: new Date('2024-07-01T00:00:00Z') }],
  ...overrides,
});
export const stat = (overrides: Partial<PlayerMatchStat> = {}): PlayerMatchStat => ({
  playerId: 'p1', minutesPlayed: 90, goals: 0, assists: 0, defenses: 0, distanceKm: 0,
  rating: 0, yellowCard: false, redCard: false, ...overrides,
});
export const match = (overrides: Partial<Match> = {}): Match => ({
  matchesId: 'm1', date: '01/08', league: 'Liga', homeTeam: 'Clube', awayTeam: 'Rival',
  result: '?', status: 'SCHEDULED', ...overrides,
});
export const season = (overrides: Partial<ClubData> = {}): ClubData => ({ id: 's1', seasonNumber: 1, players: [], matches: [], ...overrides });
export const career = (overrides: Partial<Career> = {}): Career => ({
  id: 'c1', clubName: 'Clube', managerName: 'Treinador', createdAt: new Date('2024-07-01T00:00:00Z'),
  nation: 'Brasil', teamBadge: '', colorsTeams: [], trophies: [], clubData: [], ...overrides,
});
export const lineup = (overrides: Partial<SavedLineup> = {}): SavedLineup => ({
  formation: '4-4-2', goalkeeper: { slotId: 'gk', playerId: 'g1', playerName: 'Goleiro' },
  lines: [{ slotId: 'st', playerId: 'p1', playerName: 'Ana' }],
  bench: [{ slotId: 'b1', playerId: 'p2', playerName: 'Bia' }], ...overrides,
});
export const academyPlayer = (overrides: Partial<AcademyPlayers> = {}): AcademyPlayers => ({
  id: 'a1', name: 'Junior', nationality: 'Brasil', age: 17, shirtNumber: 10, height: 175, weight: 65,
  sector: 'Ataque', position: 'ATA', overall: 65, potential: '80-90', annotations: '', arrivalDate: '01/07/2024',
  status: 'academy', evolutionHistory: [{ id: 'h1', date: '02/07/2024', description: 'Evolução', changedAttribute: 'overall', oldValue: 64, newValue: 65 }],
  ...overrides,
});
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(deepFreeze); }
  return value;
}
