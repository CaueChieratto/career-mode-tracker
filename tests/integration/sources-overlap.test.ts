import { expect, it } from 'vitest';
import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { getAllCareers, getCareerById } from '../../src/common/helpers/Getters';
import { ServicePlayers } from '../../src/common/services/ServicePlayers';
import { augmentCareerWithMatchStats, getAggregatedPlayersForCareer, toRawPlayer } from '../../src/layout/SectionView/helpers/mergeMatchStats';
import type { Career } from '../../src/common/interfaces/Career';
import type { Players } from '../../src/common/interfaces/playersInfo/players';
import { career, leagueStats, match, player, season, stat } from '../../src/test/factories/domain';
import { auth, db } from './firebaseClient';
import { boundary } from './firestoreBoundary';
import { careerPath, put, read, seedCareer, seasonPath } from './helpers';

const cutoff = new Date('2025-01-01');
it('fronteira rejeita consultas sem escopo de fixture antes de executar o SDK', async () => {
  const before = boundary.calls.length;
  for (const ref of [query(collection(db, 'users'), where('groupId', '==', 'g1')),
    query(collection(db, 'users/non-fixture/careers'), where('groupId', '==', 'g1')),
    query(collectionGroup(db, 'careers'), where('groupId', '==', 'g1'))]) {
    await expect(getDocs(ref)).rejects.toThrow('UNSCOPED_TEST_QUERY');
  }
  expect(boundary.calls).toHaveLength(before);
});
const loadList = async () => {
  let unsubscribe: (() => void) | undefined;
  try {
    return await new Promise<Career[]>(resolve => { unsubscribe = getAllCareers(auth.currentUser!.uid, resolve); });
  } finally { unsubscribe?.(); }
};
const date = (value: unknown) => value instanceof Date ? value.toISOString()
  : value && typeof value === 'object' && 'toDate' in value ? (value as { toDate: () => Date }).toDate().toISOString() : value ?? null;
const semanticPlayers = (players: Players[]) => players.map(p => ({
  id: p.id, name: p.name, overall: p.overall, sell: p.sell, loan: p.loan, incomingLoan: p.incomingLoan,
  contractTime: p.contractTime, salary: p.salary, stats: p.statsLeagues.map(l => ({ league: l.leagueName, stats: l.stats })),
  contract: p.contract.map(c => ({ ...c, dataArrival: date(c.dataArrival), dataExit: date(c.dataExit) })),
})).sort((a, b) => a.id.localeCompare(b.id));

it.each(['legacy', 'modern', 'identical', 'divergent', 'legacy-exclusive', 'modern-exclusive', 'modern-empty'] as const)(
  '[B05] jogadores: %s concordam na lista, detalhe e agregação de grupo', async mode => {
    const old = player({ statsLeagues: [leagueStats({ games: 2, goals: 3 })] });
    const modern = mode === 'identical' ? old : player({ overall: 90, sell: true, loan: true, incomingLoan: true, salary: 2000,
      contractTime: 4, contract: [{ ...old.contract[0], sellValue: 500, leftClub: 'Destino', dataExit: new Date('2024-12-01') }],
      statsLeagues: [leagueStats({ games: 1, goals: 0 })] });
    if (mode === 'modern-empty') {
      modern.statsLeagues = [];
      modern.contract = [];
      modern.sell = false;
      modern.loan = false;
      modern.incomingLoan = false;
      modern.salary = 0;
      old.sell = true;
    }
    const legacy = mode === 'modern' ? [] : [old];
    const current = mode === 'legacy' ? [] : [modern];
    if (mode === 'legacy-exclusive') legacy.push(player({ id: 'legacy-only', name: 'Outra', statsLeagues: [leagueStats({ games: 1, goals: 7 })] }));
    if (mode === 'modern-exclusive') current.push(player({ id: 'current-only', name: 'Outra', statsLeagues: [] }));
    const expected = [...current, ...legacy.filter(p => !current.some(m => m.id === p.id))];
    await seedCareer(career({ groupId: 'g1', clubData: [season({ players: legacy })] }));
    for (const p of current) await put(`${seasonPath()}/players/${p.id}`, p);
    const storedBefore = await read(careerPath());
    const detail = await getCareerById(auth.currentUser!.uid, 'c1');
    const list = (await loadList())[0];
    expect(semanticPlayers(detail.clubData[0].players)).toEqual(semanticPlayers(expected));
    expect.soft(semanticPlayers(list.clubData[0].players)).toEqual(semanticPlayers(expected));
    const detailTotals = getAggregatedPlayersForCareer(augmentCareerWithMatchStats(detail));
    const listTotals = getAggregatedPlayersForCareer(augmentCareerWithMatchStats(list));
    const groupTotals = await ServicePlayers.getAggregatedGroupStats('g1', cutoff);
    expect.soft(semanticPlayers(listTotals)).toEqual(semanticPlayers(detailTotals));
    expect.soft(semanticPlayers(groupTotals)).toEqual(semanticPlayers(detailTotals));
    const groupSeasons = await ServicePlayers.getGroupSeasonsData('g1', cutoff);
    expect(semanticPlayers(groupSeasons[0].season.players)).toEqual(semanticPlayers(detailTotals));
    expect(semanticPlayers(await ServicePlayers.getPastGroupPlayers('g1', cutoff, 'other-career'))).toEqual(semanticPlayers(expected));
    expect(await read(careerPath())).toEqual(storedBefore);
  },
);

it('[B05] homônimos com IDs diferentes continuam separados em lista, detalhe e agregadores', async () => {
  const legacy = player({ id: 'legacy', statsLeagues: [leagueStats({ games: 2, goals: 3 })] });
  const modern = player({ id: 'modern', statsLeagues: [leagueStats({ games: 1, goals: 8 })] });
  await seedCareer(career({ groupId: 'g1', clubData: [season({ players: [legacy] })] }));
  await put(`${seasonPath()}/players/modern`, modern);
  const detail = await getCareerById(auth.currentUser!.uid, 'c1');
  const list = (await loadList())[0];
  for (const players of [detail.clubData[0].players, list.clubData[0].players,
    getAggregatedPlayersForCareer(augmentCareerWithMatchStats(detail)),
    getAggregatedPlayersForCareer(augmentCareerWithMatchStats(list)),
    await ServicePlayers.getAggregatedGroupStats('g1', cutoff),
    await ServicePlayers.getPastGroupPlayers('g1', cutoff, 'other-career')]) {
    expect.soft(players.map(p => p.id).sort()).toEqual(['legacy', 'modern']);
    expect.soft(Object.fromEntries(players.map(p => [p.id, p.statsLeagues[0].stats.goals]))).toEqual({ legacy: 3, modern: 8 });
  }
});

it('[B05] múltiplas temporadas escolhem uma fonte por ID em cada temporada antes de agregar', async () => {
  const old = player({ statsLeagues: [leagueStats({ games: 1, goals: 9 })] });
  const fallback = player({ id: 'legacy-only', name: 'Bia', statsLeagues: [leagueStats({ games: 1, goals: 2 })] });
  await seedCareer(career({ groupId: 'g1', clubData: [
    season({ players: [old, fallback] }),
    season({ id: 's2', seasonNumber: 2, players: [old] }),
  ] }));
  for (const [id, goals] of [['s1', 1], ['s2', 4]] as const) {
    await put(`${seasonPath(id)}/players/p1`, player({ name: id === 's2' ? 'Nome atualizado' : 'Ana', statsLeagues: [leagueStats({ games: 1, goals })] }));
  }
  const detail = await getCareerById(auth.currentUser!.uid, 'c1');
  const listed = (await loadList())[0];
  for (const [index, s] of detail.clubData.entries()) {
    expect.soft(semanticPlayers(listed.clubData[index].players)).toEqual(semanticPlayers(s.players));
  }
  for (const totals of [getAggregatedPlayersForCareer(augmentCareerWithMatchStats(detail)),
    getAggregatedPlayersForCareer(augmentCareerWithMatchStats(listed)), await ServicePlayers.getAggregatedGroupStats('g1', cutoff)]) {
    expect.soft(totals.map(p => p.id).sort()).toEqual(['legacy-only', 'p1']);
    expect.soft(totals.find(p => p.id === 'p1')!.statsLeagues[0].stats).toMatchObject({ games: 2, goals: 5 });
    expect.soft(totals.find(p => p.id === 'legacy-only')?.statsLeagues[0].stats).toMatchObject({ games: 1, goals: 2 });
  }
});

it('[B05] partidas sobrepostas usam versão moderna hidratada uma vez e conservam exclusivas legadas', async () => {
  await seedCareer(career({ groupId: 'g1', clubData: [season({ players: [player()], matches: [
    match({ status: 'FINISHED', homeScore: 9, playerStats: [stat({ goals: 9 })] }),
    match({ matchesId: 'legacy-only', status: 'FINISHED', playerStats: [stat({ goals: 3 })] }),
  ] })] }));
  await put(`${seasonPath()}/matches/m1`, match({ status: 'FINISHED', homeScore: 2, playerStats: [stat({ goals: 7 })] }));
  await put(`${seasonPath()}/matches/m1/playerStats/p1`, stat({ goals: 2 }));
  await put(`${seasonPath()}/matches/modern-only`, match({ matchesId: 'modern-only', status: 'SCHEDULED' }));
  const detail = await getCareerById(auth.currentUser!.uid, 'c1');
  const list = (await loadList())[0];
  expect(list.clubData[0].matches).toEqual(detail.clubData[0].matches);
  expect(detail.clubData[0].matches!.map(m => m.matchesId).sort()).toEqual(['legacy-only', 'm1', 'modern-only']);
  for (const players of [getAggregatedPlayersForCareer(augmentCareerWithMatchStats(detail)),
    getAggregatedPlayersForCareer(augmentCareerWithMatchStats(list)), await ServicePlayers.getAggregatedGroupStats('g1', cutoff)]) {
    expect(players[0].statsLeagues[0].stats).toMatchObject({ games: 2, goals: 5 });
  }
});

it('[B02+B05] fontes mistas → precedência → agregação → raw persistido → releitura permanece estável', async () => {
  const manual = [leagueStats({ games: 2, goals: 3 })];
  await seedCareer(career({ groupId: 'g1', clubData: [season({
    players: [player({ statsLeagues: [leagueStats({ games: 9, goals: 90 })] }),
      player({ id: 'legacy-only', statsLeagues: [leagueStats({ games: 1, goals: 4 })] })],
    matches: [match({ status: 'FINISHED', playerStats: [stat({ goals: 90 })] }),
      match({ matchesId: 'legacy-match', status: 'FINISHED', playerStats: [stat({ goals: 1 })] })],
  })] }));
  await put(`${seasonPath()}/players/p1`, player({ statsLeagues: manual }));
  await put(`${seasonPath()}/players/modern-only`, player({ id: 'modern-only' }));
  await put(`${seasonPath()}/matches/m1`, match({ status: 'FINISHED', playerStats: [stat({ goals: 7 })] }));
  await put(`${seasonPath()}/matches/m1/playerStats/p1`, stat({ goals: 2 }));
  const embeddedBefore = (await read(careerPath()))!.clubData;
  let first: ReturnType<typeof semanticPlayers> | undefined;
  for (let pass = 0; pass < 3; pass++) {
    const loaded = await getCareerById(auth.currentUser!.uid, 'c1');
    const displayed = augmentCareerWithMatchStats(loaded);
    const totals = getAggregatedPlayersForCareer(displayed);
    expect(totals.map(p => p.id).sort()).toEqual(['legacy-only', 'modern-only', 'p1']);
    expect(totals.find(p => p.id === 'p1')!.statsLeagues[0].stats).toMatchObject({ games: 4, goals: 6 });
    expect(totals.find(p => p.id === 'legacy-only')!.statsLeagues[0].stats.goals).toBe(4);
    expect(totals.find(p => p.id === 'modern-only')!.statsLeagues).toEqual([]);
    first ??= semanticPlayers(totals);
    expect(semanticPlayers(totals)).toEqual(first);
    expect(semanticPlayers(await ServicePlayers.getAggregatedGroupStats('g1', cutoff))).toEqual(first);
    const raw = toRawPlayer(displayed.clubData[0].players.find(p => p.id === 'p1')!);
    await ServicePlayers.updatePlayerStatsLeagues(loaded, 's1', raw.id, raw.statsLeagues);
    const persisted = await read(`${seasonPath()}/players/p1`);
    expect(persisted!.statsLeagues).toEqual(manual);
    expect(persisted).not.toHaveProperty('manualStatsLeagues');
    expect(persisted).not.toHaveProperty('_isAugmented');
    expect(semanticPlayers(getAggregatedPlayersForCareer(augmentCareerWithMatchStats((await loadList())[0])))).toEqual(first);
    expect(semanticPlayers(getAggregatedPlayersForCareer(augmentCareerWithMatchStats(await getCareerById(auth.currentUser!.uid, 'c1'))))).toEqual(first);
    expect((await read(careerPath()))!.clubData).toEqual(embeddedBefore);
    expect(await read(`${seasonPath()}/players/legacy-only`)).toBeUndefined();
  }
});
