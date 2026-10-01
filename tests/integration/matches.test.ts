import { expect, it } from 'vitest';
import { ServiceMatches } from '../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches';
import { getCareerById, getAllCareers } from '../../src/common/helpers/Getters';
import { buildMatchPayload } from '../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/buildMatchPayload';
import { match, stat, career, season } from '../../src/test/factories/domain';
import type { Career } from '../../src/common/interfaces/Career';
import type { Match } from '../../src/common/interfaces/Match';
import { auth } from './firebaseClient';
import { careerPath, deferred, failOnce, list, matchPath, put, read, seedCareer } from './helpers';
import { boundary } from './firestoreBoundary';

it.each(['none', 'embedded', 'subcollection', 'both'] as const)('precedência de playerStats: %s', async source => {
  await seedCareer();
  await put(matchPath(), match(source === 'embedded' || source === 'both' ? { playerStats: [stat({ goals: 1 }), stat({ playerId: 'legacy', goals: 2 })] } : {}));
  if (source === 'subcollection' || source === 'both') await put(matchPath() + '/playerStats/p1', stat({ goals: 9 }));
  const [result] = await ServiceMatches.getMatchesBySeason('c1', 's1');
  if (source === 'none') expect(result.playerStats).toBeUndefined();
  else {
    expect(result.playerStats!.find(s => s.playerId === 'p1')!.goals).toBe(source === 'embedded' ? 1 : 9);
    expect(result.playerStats).toHaveLength(source === 'subcollection' ? 1 : 2);
  }
});
it('CRUD e salvamentos repetidos usam o mesmo ID e merge conserva campos', async () => {
  await seedCareer(); await ServiceMatches.addMatchToSeason('c1', 's1', match());
  await ServiceMatches.addMatchToSeason('c1', 's1', match());
  await ServiceMatches.updateMatchInSeason('c1', 's1', match({ status: 'FINISHED', homeScore: 3 }));
  await ServiceMatches.savePlayerStatsToSubcollection('c1', 's1', 'm1', [stat({ goals: 3 })], [stat({ goals: 3 })]);
  await ServiceMatches.savePlayerStatsToSubcollection('c1', 's1', 'm1', [stat({ goals: 4 })], [stat({ goals: 4 })]);
  expect(await list(matchPath().replace('/m1', ''))).toHaveLength(1);
  expect(await list(matchPath() + '/playerStats')).toHaveLength(1);
  expect((await ServiceMatches.getMatchesBySeason('c1', 's1'))[0]).toMatchObject({ homeScore: 3, playerStats: [{ goals: 4 }] });
});
it('falha no updatedAt ainda deixa nova partida gravada', async () => {
  await seedCareer(); failOnce('updateDoc', '/careers/c1');
  await expect(ServiceMatches.addMatchToSeason('c1', 's1', match())).rejects.toThrow('Injected');
  expect(await read(matchPath())).toMatchObject({ matchesId: 'm1' });
  expect(await read(careerPath())).not.toHaveProperty('updatedAt');
});
it('[B14] remover pênaltis exclui ambos os campos na releitura do servidor', async () => {
  await seedCareer(); const initial = match({ homeScore: 1, awayScore: 1, homePenScore: 4, awayPenScore: 3 });
  await put(matchPath(), { ...initial, preserved: 'metadata' });
  expect(await read(matchPath())).toMatchObject({ homePenScore: 4, awayPenScore: 3 });
  const payload = buildMatchPayload(initial, { homeScore: '0', awayScore: '0' }, { hasPenalties: false }, true).updatedMatch as Match;
  expect(payload).not.toHaveProperty('homePenScore');
  await ServiceMatches.updateMatchInSeason('c1', 's1', payload, true);
  const persisted = await read(matchPath());
  expect(persisted).not.toHaveProperty('homePenScore');
  expect(persisted).not.toHaveProperty('awayPenScore');
  expect(persisted).toMatchObject({ homeScore: 0, preserved: 'metadata' });
});
it('[B14] edição genérica conserva pênaltis; zero continua sendo placar', async () => {
  await seedCareer(); await put(matchPath(), match({ homePenScore: 4, awayPenScore: 3 }));
  await ServiceMatches.updateMatchInSeason('c1', 's1', match({ date: '02/08' }));
  expect(await read(matchPath())).toMatchObject({ homePenScore: 4, awayPenScore: 3, date: '02/08' });
  await ServiceMatches.updateMatchInSeason('c1', 's1', match({ homePenScore: 0, awayPenScore: 3 }));
  expect(await read(matchPath())).toMatchObject({ homePenScore: 0, awayPenScore: 3 });
});
it('[B05]: lista e detalhe preservam fontes persistidas simultaneamente', async () => {
  await seedCareer(career({ clubData: [season({ matches: [match({ matchesId: 'legacy-only' })] })] }));
  await put(matchPath(), match());
  expect((await getCareerById(auth.currentUser!.uid, 'c1')).clubData[0].matches).toHaveLength(2);
  let unsubscribe: (() => void) | undefined;
  const result = await new Promise<Career[]>(resolve => { unsubscribe = getAllCareers(auth.currentUser!.uid, resolve); });
  unsubscribe?.();
  expect(result[0].clubData[0].matches!.map(m => m.matchesId)).toEqual(['m1', 'legacy-only']);
});
it('[B05] dados reais no emulador com legacy-only + m1 atual: lista e detalhe devem preservar ambos', async () => {
  await seedCareer(career({ clubData: [season({ matches: [match({ matchesId: 'legacy-only' }), match({ homeScore: 9 })] })] }));
  await put(matchPath(), match({ homeScore: 1, status: 'FINISHED' }));
  const detail = await getCareerById(auth.currentUser!.uid, 'c1');
  let unsubscribe: (() => void) | undefined;
  const listed = await new Promise<Career[]>(resolve => { unsubscribe = getAllCareers(auth.currentUser!.uid, resolve); });
  unsubscribe?.();
  expect(listed[0].clubData[0].matches).toEqual(detail.clubData[0].matches);
  expect(detail.clubData[0].matches).toEqual([match({ homeScore: 1, status: 'FINISHED' }), match({ matchesId: 'legacy-only' })]);
});
it('duas gravações fora de ordem: a antiga, liberada por último, sobrescreve a nova', async () => {
  await seedCareer(); const entered = deferred(), release = deferred(); let first = true;
  boundary.hook = async c => { if (first && c.operation === 'setDoc' && c.phase === 'before' && c.path.endsWith('/matches/m1')) { first = false; entered.resolve(); await release.promise; } };
  const old = ServiceMatches.updateMatchInSeason('c1', 's1', match({ homeScore: 1 })); await entered.promise;
  await ServiceMatches.updateMatchInSeason('c1', 's1', match({ homeScore: 5 }));
  expect(await read(matchPath())).toMatchObject({ homeScore: 5 });
  release.resolve(); await old;
  expect(await read(matchPath())).toMatchObject({ homeScore: 1 });
});
