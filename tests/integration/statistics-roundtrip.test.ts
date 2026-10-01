import { expect, it } from 'vitest';
import { getCareerById } from '../../src/common/helpers/Getters';
import { ServicePlayers } from '../../src/common/services/ServicePlayers';
import { aggregatePlayerStats } from '../../src/common/services/ServicePlayers/helpers/statsHelpers';
import { augmentCareerWithMatchStats, getAggregatedPlayersForCareer, toRawPlayer } from '../../src/layout/SectionView/helpers/mergeMatchStats';
import { career, leagueStats, match, player, season, stat } from '../../src/test/factories/domain';
import { auth } from './firebaseClient';
import { put, read, seedCareer, seasonPath } from './helpers';

it.each([
  { label: 'sem estatísticas e sem partidas', manual: [], matches: [], games: 0, goals: 0 },
  { label: 'somente manual / zero partidas', manual: [leagueStats({ games: 2, goals: 3, rating: 6 })], matches: [], games: 2, goals: 3 },
  { label: 'somente partidas', manual: [], matches: [match({ status: 'FINISHED', playerStats: [stat({ goals: 2, rating: 8 })] })], games: 1, goals: 2 },
  { label: 'manual + partidas', manual: [leagueStats({ games: 2, goals: 3, rating: 6 })], matches: [match({ status: 'FINISHED', playerStats: [stat({ goals: 2, rating: 8 })] })], games: 3, goals: 5 },
  { label: 'zeros manuais legítimos', manual: [leagueStats()], matches: [], games: 0, goals: 0 },
  { label: 'campo manual ausente no legado + partida', manual: undefined, matches: [match({ status: 'FINISHED', playerStats: [stat({ goals: 2 })] })], games: 1, goals: 2 },
])('[B02] ciclo persistido e repetido: $label', async ({ manual, matches, games, goals }) => {
  await seedCareer();
  const path = `${seasonPath()}/players/p1`;
  const storedPlayer = player({ statsLeagues: manual });
  if (!manual) delete (storedPlayer as Partial<typeof storedPlayer>).statsLeagues;
  await put(path, storedPlayer);
  for (const m of matches) await put(`${seasonPath()}/matches/${m.matchesId}`, m);
  for (let pass = 0; pass < 3; pass++) {
    const loaded = await getCareerById(auth.currentUser!.uid, 'c1');
    const displayed = augmentCareerWithMatchStats(loaded);
    const total = getAggregatedPlayersForCareer(displayed)[0];
    expect(total.statsLeagues.reduce((sum, l) => sum + l.stats.games, 0)).toBe(games);
    expect(total.statsLeagues.reduce((sum, l) => sum + l.stats.goals, 0)).toBe(goals);
    const raw = toRawPlayer(displayed.clubData[0].players[0]);
    await ServicePlayers.updatePlayerStatsLeagues(loaded, 's1', raw.id, raw.statsLeagues);
    const stored = await read(path);
    expect(stored).not.toHaveProperty('_isAugmented');
    expect(stored).not.toHaveProperty('manualStatsLeagues');
    // Check the reread total before the payload assertion to expose X + Y + Y.
    const reread = augmentCareerWithMatchStats(await getCareerById(auth.currentUser!.uid, 'c1'));
    expect(reread.clubData[0].players[0].statsLeagues.reduce((sum, l) => sum + l.stats.goals, 0)).toBe(goals);
    expect(stored!.statsLeagues).toEqual(manual ?? []);
  }
});

it('[B02] múltiplas temporadas preservam cada base manual e os dois agregadores após releitura', async () => {
  await seedCareer(career({ clubData: [season(), season({ id: 's2', seasonNumber: 2 })] }));
  for (const [id, goals] of [['s1', 3], ['s2', 4]] as const) {
    await put(`${seasonPath(id)}/players/p1`, player({ statsLeagues: [leagueStats({ games: 2, goals, rating: 6 })] }));
    await put(`${seasonPath(id)}/matches/m1`, match({ status: 'FINISHED', playerStats: [stat({ goals: 2, rating: 9 })] }));
  }
  for (let pass = 0; pass < 3; pass++) {
    const loaded = await getCareerById(auth.currentUser!.uid, 'c1');
    const displayed = augmentCareerWithMatchStats(loaded);
    const history = displayed.clubData.map(s => s.players[0]);
    for (const total of [getAggregatedPlayersForCareer(displayed)[0], aggregatePlayerStats(new Map([['p1', history]]))[0]]) {
      expect(total.statsLeagues[0].stats).toMatchObject({ games: 6, goals: 11, rating: 7 });
    }
    for (const s of displayed.clubData) {
      await ServicePlayers.updatePlayerStatsLeagues(loaded, s.id, 'p1', toRawPlayer(s.players[0]).statsLeagues);
    }
    expect((await read(`${seasonPath()}/players/p1`))!.statsLeagues).toEqual([leagueStats({ games: 2, goals: 3, rating: 6 })]);
    expect((await read(`${seasonPath('s2')}/players/p1`))!.statsLeagues).toEqual([leagueStats({ games: 2, goals: 4, rating: 6 })]);
  }
});
