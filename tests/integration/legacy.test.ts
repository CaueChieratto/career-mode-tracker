import { expect, it } from 'vitest';
import { ServiceSeasons } from '../../src/common/services/ServiceSeasons';
import { getCareerById } from '../../src/common/helpers/Getters';
import type { ClubData } from '../../src/common/interfaces/club/clubData';
import { career, lineup, match, season, stat } from '../../src/test/factories/domain';
import { sourceOverlap } from '../../src/test/fixtures/scenarios';
import { auth } from './firebaseClient';
import { boundary } from './firestoreBoundary';
import { careerPath, list, put, read, seasonPath, seedCareer } from './helpers';

const formats = ['modern-empty', 'embedded', 'subcollection', 'mixed'] as const;
const operations = ['create', 'delete-other', 'metadata'] as const;

it.each(operations.flatMap(operation => formats.map(format => ({ operation, format }))))(
  '[B13] $operation preserva dados recuperáveis em $format sem migrar a fonte',
  async ({ operation, format }) => {
    const f = sourceOverlap();
    const embedded = format === 'embedded' || format === 'mixed';
    const modern = format === 'subcollection' || format === 'mixed';
    f.legacyMatches[1] = match({ matchesId: 'legacy-match', playerStats: [stat({ goals: 7 })], lineup: lineup() });
    const source: ClubData = { id: 's2', seasonNumber: 2, players: embedded ? f.legacyPlayers : [] };
    if (embedded) source.matches = f.legacyMatches;
    const careerSnapshot = career({ clubData: [season(), source] });
    await seedCareer(careerSnapshot);
    if (modern) {
      for (const p of f.currentPlayers) await put(seasonPath('s2') + '/players/' + p.id, p);
      for (const m of f.currentMatches) await put(seasonPath('s2') + '/matches/' + m.matchesId, m);
      await put(seasonPath('s2') + '/matches/m1/playerStats/p1', stat({ goals: 3 }));
    }
    const stored = (await read(careerPath()))!.clubData[1] as ClubData;
    const originalPlayers = await list(seasonPath('s2') + '/players');
    const originalMatches = await list(seasonPath('s2') + '/matches');
    const originalStats = await read(seasonPath('s2') + '/matches/m1/playerStats/p1');
    const leagues = [{ name: 'Nova Liga', trophy: '', logo: '', league: true }];
    boundary.calls = [];

    if (operation === 'create') await ServiceSeasons.addSeason(careerSnapshot);
    else if (operation === 'delete-other') await ServiceSeasons.deleteSeason('c1', 's1');
    else await ServiceSeasons.updateSeasonLeagues('c1', 's2', leagues);

    // No extra reads to discover provenance, and no writes to surviving subcollections.
    expect(boundary.calls.filter(c => c.operation === 'getDoc' && c.phase === 'before' && c.path === careerPath())).toHaveLength(operation === 'create' ? 0 : 1);
    expect(boundary.calls.filter(c => ['setDoc', 'updateDoc', 'deleteDoc'].includes(c.operation) && c.path.startsWith(seasonPath('s2')))).toEqual([]);
    const persisted = (await read(careerPath()))!.clubData.find((s: ClubData) => s.id === 's2');
    expect(persisted).toEqual(operation === 'metadata' ? { ...stored, leagues } : stored);
    expect(await list(seasonPath('s2') + '/players')).toEqual(originalPlayers);
    expect(await list(seasonPath('s2') + '/matches')).toEqual(originalMatches);
    expect(await read(seasonPath('s2') + '/matches/m1/playerStats/p1')).toEqual(originalStats);

    const reloaded = (await getCareerById(auth.currentUser!.uid, 'c1')).clubData.find(s => s.id === 's2')!;
    const playerIds = new Set([...(embedded ? f.legacyPlayers : []), ...(modern ? f.currentPlayers : [])].map(p => p.id));
    const matchIds = new Set([...(embedded ? f.legacyMatches : []), ...(modern ? f.currentMatches : [])].map(m => m.matchesId));
    expect(reloaded.players.map(p => p.id).sort()).toEqual([...playerIds].sort());
    expect(reloaded.matches!.map(m => m.matchesId).sort()).toEqual([...matchIds].sort());
    if (embedded) expect(reloaded.matches!.find(m => m.matchesId === 'legacy-match')).toMatchObject({ playerStats: [stat({ goals: 7 })], lineup: lineup() });
    if (modern) expect(reloaded.players.find(p => p.id === 'p1')!.overall).toBe(80);
    if (!embedded) {
      expect(persisted.players).toEqual([]);
      expect(persisted).not.toHaveProperty('matches');
    }
  },
);
