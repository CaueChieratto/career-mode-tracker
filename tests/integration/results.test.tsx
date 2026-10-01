// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { ChangeEvent } from 'react';
import type { Field } from '../../src/components/FormSection';
import type { Match } from '../../src/common/interfaces/Match';
import type { TableTeamData } from '../../src/common/interfaces/TableTeamData';
import { useAddDetails } from '../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/useAddDetails';
import { ServiceMatches } from '../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches';
import { career, match, season, stat } from '../../src/test/factories/domain';
import { deferred, failOnce, list, matchPath, put, read, seasonPath, seedCareer } from './helpers';
import { boundary } from './firestoreBoundary';

afterEach(cleanup);
type ScreenOptions = { matches?: Match[]; table?: TableTeamData[] };
async function screen(input: Match = match(), options: ScreenOptions = {}) {
  const loadedRows = await table();
  const tableRows = options.table ?? loadedRows.map(row => {
    const tableRow = { ...row } as TableTeamData & { _documentId?: string };
    delete tableRow._documentId;
    return tableRow;
  });
  const matches = options.matches ?? [input];
  const s = season({
    leagues: [{ name: 'Liga', trophy: '', logo: '', league: true }],
    matches,
    table: tableRows as never,
  });
  const c = career({ clubData: [s] });
  await seedCareer(c);
  for (const current of matches) await put(matchPath(current.matchesId), current);
  for (const row of tableRows) await put(seasonPath() + '/table/' + row.id, row);
  return renderHook(() => useAddDetails({ career: c, season: s, match: input, onClose: () => {} }));
}
function scores(result: ReturnType<typeof renderHook<ReturnType<typeof useAddDetails>, unknown>>['result'], home: string, away: string) {
  act(() => {
    for (const [name, value] of [['homeScore', home], ['awayScore', away]]) result.current.handleInputChange({ target: { name, value } } as ChangeEvent<HTMLInputElement>, { id: name } as Field);
  });
}
async function table() { return list<TableTeamData>(seasonPath() + '/table'); }
async function deleteLoadedMatch(matchId = 'm1') {
  const matches = await list<Match>(seasonPath() + '/matches');
  const current = matches.find(item => item.matchesId === matchId);
  if (!current) return;
  const rows = await list<TableTeamData>(seasonPath() + '/table');
  const s = season({
    leagues: [{ name: 'Liga', trophy: '', logo: '', league: true }],
    matches,
    table: rows as never,
  });
  const c = career({ clubData: [s] });
  await ServiceMatches.deleteMatchFromSeason(c, s, current);
}

it.each([['2', '0', 'V', 3, 0], ['1', '1', 'E', 1, 1], ['0', '2', 'D', 0, 3]] as const)('partida→resultado→tabela: %s×%s', async (h, a, res, own, rival) => {
  const { result } = await screen(); scores(result, h, a); await act(async () => { await result.current.saveDetails(); });
  expect(await read(matchPath())).toMatchObject({ status: 'FINISHED', result: res, homeScore: Number(h), awayScore: Number(a) });
  const rows = await table(); expect(rows.find(r => r.name === 'Clube')).toMatchObject({ played: 1, points: own }); expect(rows.find(r => r.name === 'Rival')).toMatchObject({ played: 1, points: rival });
});
it('[B18] editar finalizada substitui a contribuicao antiga', async () => {
  const first = await screen(); scores(first.result, '2', '0'); await act(async () => { await first.result.current.saveDetails(); }); first.unmount();
  const finished = await read(matchPath()) as Match; const second = await screen(finished); scores(second.result, '0', '3'); await act(async () => { await second.result.current.saveDetails(); });
  expect(await read(matchPath())).toMatchObject({ result: 'D' });
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ points: 0, goalsFor: 0, goalsAgainst: 3 });
});
it('[B18] excluir finalizada reverte tabela', async () => {
  const { result } = await screen(); scores(result, '2', '0'); await act(async () => { await result.current.saveDetails(); });
  await deleteLoadedMatch();
  expect(await read(matchPath())).toBeUndefined(); expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ played: 0, points: 0 });
});
it('[B18] vencer, editar para derrota, excluir: remove a contribuicao anterior', async () => {
  const first = await screen(); scores(first.result, '2', '0');
  await act(async () => { await first.result.current.saveDetails(); }); first.unmount();
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ points: 3, played: 1 });
  const second = await screen(await read(matchPath()) as Match); scores(second.result, '0', '3');
  await act(async () => { await second.result.current.saveDetails(); });
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ points: 0, played: 1, goalsFor: 0, goalsAgainst: 3 });
  await deleteLoadedMatch();
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ points: 0, played: 0 });
});
it('[B19] repetir callback com snapshot SCHEDULED conserva uma contribuicao', async () => {
  const { result } = await screen(); scores(result, '2', '0');
  await act(async () => { await result.current.saveDetails(); await result.current.saveDetails(); });
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ played: 1, points: 3 });
  expect(await list(seasonPath() + '/matches')).toHaveLength(1);
});
it('reabrir com snapshot FINISHED e salvar sem editar não incrementa tabela', async () => {
  const first = await screen(); scores(first.result, '2', '0'); await act(async () => { await first.result.current.saveDetails(); }); first.unmount();
  const second = await screen(await read(matchPath()) as Match); await act(async () => { await second.result.current.saveDetails(); });
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ played: 1, points: 3 });
});
it('[B18] salvar detalhes usa a tabela local sem leitura remota', async () => {
  const { result } = await screen(); scores(result, '2', '0');
  boundary.calls = [];
  boundary.hook = call => {
    if (call.phase === 'before' && call.operation.startsWith('get')) {
      throw new Error('read proibida');
    }
  };
  await act(async () => { await result.current.saveDetails(); });
  expect(boundary.calls.filter(call => call.phase === 'before' && call.operation.startsWith('get'))).toEqual([]);
  boundary.hook = undefined;
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ played: 1, points: 3 });
});
it('[B18] falha na segunda equipe aborta todas as escritas da transacao', async () => {
  const row = { badge: '', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
  const own = { ...row, id: 'own', name: 'Clube' };
  const rival = { ...row, id: 'rival', name: 'Rival' };
  const { result } = await screen(match(), { table: [own, rival] }); scores(result, '2', '0');
  failOnce('setDoc', '/table/rival', 'before', 'permission-denied');
  let failure: unknown;
  await act(async () => { try { await result.current.saveDetails(); } catch (error) { failure = error; } });
  expect(failure).toMatchObject({ code: 'permission-denied' });
  expect(await read(seasonPath() + '/table/own')).toMatchObject({ played: 0, points: 0 });
  expect(await read(seasonPath() + '/table/rival')).toMatchObject({ played: 0 });
  expect(await read(matchPath())).toMatchObject({ status: 'SCHEDULED' });
  await act(async () => { await result.current.saveDetails(); });
  expect((await table()).map(r => r.played)).toEqual([1, 1]);
});
it('[B19] dois salvamentos concorrentes com tabela vazia conservam duas linhas', async () => {
  const { result } = await screen(); scores(result, '2', '0');
  boundary.calls = [];
  await act(async () => { await Promise.all([result.current.saveDetails(), result.current.saveDetails()]); });
  expect(boundary.calls.filter(c => c.operation.startsWith('get') && c.phase === 'before')).toEqual([]);
  const rows = await table(); expect(rows).toHaveLength(2); expect(rows.filter(r => r.name === 'Clube')).toHaveLength(1);
  expect(rows.find(r => r.name === 'Clube')).toMatchObject({ played: 1, points: 3, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, goalDiff: 2 });
});
it('[B19] tres saves do mesmo snapshot e repeticao concorrente mantem tabela identica', async () => {
  const { result } = await screen(); scores(result, '2', '0');
  await act(async () => { await result.current.saveDetails(); });
  const before = await table();
  for (let i = 0; i < 2; i++) {
    await act(async () => { await result.current.saveDetails(); });
    expect(await table()).toEqual(before);
  }
  await act(async () => { await Promise.all([result.current.saveDetails(), result.current.saveDetails()]); });
  expect(await table()).toEqual(before);
});

it('[B14] desmarcar pênaltis no formulário apaga os campos no servidor', async () => {
  const { result } = await screen(match({ status: 'FINISHED', homeScore: 1, awayScore: 1, homePenScore: 4, awayPenScore: 3 }));
  expect(await read(matchPath())).toMatchObject({ homePenScore: 4, awayPenScore: 3 });
  act(() => { result.current.handleBooleanChange('hasPenalties', false); });
  await act(async () => { await result.current.saveDetails(); });
  const persisted = await read(matchPath());
  expect(persisted).not.toHaveProperty('homePenScore');
  expect(persisted).not.toHaveProperty('awayPenScore');
  expect(persisted).toMatchObject({ homeScore: 1, awayScore: 1, result: 'E' });
});

it.each([
  ['2', '0', '1', '1', 1, 0, 1, 0],
  ['2', '0', '0', '3', 0, 0, 0, 1],
  ['1', '1', '3', '1', 3, 1, 0, 0],
  ['2', '0', '4', '2', 3, 1, 0, 0],
] as const)('[B18] editar %sx%s para %sx%s recalcula todos os contadores', async (oldH, oldA, h, a, points, won, drawn, lost) => {
  const first = await screen(); scores(first.result, oldH, oldA);
  await act(async () => { await first.result.current.saveDetails(); }); first.unmount();
  const before = await table();
  const second = await screen(await read(matchPath()) as Match); scores(second.result, h, a);
  await act(async () => { await second.result.current.saveDetails(); });
  const after = await table();
  expect(after.map(r => [r.id, r.name, r.badge])).toEqual(before.map(r => [r.id, r.name, r.badge]));
  expect(after.find(r => r.name === 'Clube')).toMatchObject({ played: 1, points, won, drawn, lost, goalsFor: +h, goalsAgainst: +a, goalDiff: +h - +a });
  expect(after.find(r => r.name === 'Rival')).toMatchObject({ played: 1, points: lost * 3 + drawn, won: lost, drawn, lost: won, goalsFor: +a, goalsAgainst: +h, goalDiff: +a - +h });
});

it.each([['2', '0'], ['1', '1'], ['0', '2']])('[B18] excluir resultado %sx%s remove stats, zera linhas e permite repetir', async (h, a) => {
  const view = await screen(match({ playerStats: [stat()] })); scores(view.result, h, a);
  await act(async () => { await view.result.current.saveDetails(); });
  await put(matchPath() + '/playerStats/p1', { playerId: 'p1', goals: 1 });
  const ids = (await table()).map(r => r.id);
  for (let attempt = 0; attempt < 2; attempt++) {
    await deleteLoadedMatch();
    expect(await read(matchPath())).toBeUndefined();
    expect(await list(matchPath() + '/playerStats')).toEqual([]);
    const rows = await table(); expect(rows.map(r => r.id)).toEqual(ids);
    for (const row of rows) expect(row).toMatchObject({ played: 0, points: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 });
  }
});

it('[B18] excluir uma partida preserva as outras contribuições e equipes semelhantes com IDs distintos', async () => {
  const input = match({ playerStats: [stat()] });
  const m2 = match({ matchesId: 'm2', homeTeam: 'Rival', awayTeam: 'Clube', status: 'FINISHED', homeScore: 3, awayScore: 1, result: 'D' });
  const cup = match({ matchesId: 'cup', league: 'Copa', status: 'FINISHED', homeScore: 9, awayScore: 0, result: 'V' });
  const unrelated = { id: 'other-club', name: 'Clube B', badge: 'badge', played: 8, points: 9, customZone: 'first' };
  const view = await screen(input, {
    matches: [input, m2, cup],
    table: [unrelated as TableTeamData],
  }); scores(view.result, '2', '0');
  await act(async () => { await view.result.current.saveDetails(); });
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ played: 2, points: 3, goalsFor: 3, goalsAgainst: 3 });
  await deleteLoadedMatch();
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ played: 1, won: 0, lost: 1, points: 0, goalsFor: 1, goalsAgainst: 3, goalDiff: -2 });
  expect((await table()).find(r => r.name === 'Rival')).toMatchObject({ played: 1, won: 1, points: 3, goalsFor: 3, goalsAgainst: 1 });
  expect(await read(seasonPath() + '/table/other-club')).toEqual(unrelated);
  expect(await read(seasonPath() + '/matches/m2')).toBeDefined();
});

it('[B18] falha ao excluir pai preserva resultado, tabela e stats e permite repetir', async () => {
  const view = await screen(match({ playerStats: [stat()] })); scores(view.result, '2', '0');
  await act(async () => { await view.result.current.saveDetails(); });
  await put(matchPath() + '/playerStats/p1', { playerId: 'p1' });
  const before = await table(); failOnce('deleteDoc', '/matches/m1', 'before', 'permission-denied');
  await expect(deleteLoadedMatch()).rejects.toThrow('Injected');
  expect(await table()).toEqual(before); expect(await read(matchPath())).toMatchObject({ status: 'FINISHED' });
  expect(await read(matchPath() + '/playerStats/p1')).toBeDefined();
  await deleteLoadedMatch();
  expect((await table()).every(r => r.played === 0)).toBe(true);
});

it('[B19] partidas distintas concorrentes compartilham linhas sem perder contribuições', async () => {
  await screen();
  const gate = deferred(); let arrivals = 0;
  boundary.hook = async c => {
    if (c.operation === 'getDocs' && c.path.endsWith('/table') && c.phase === 'after') {
      if (++arrivals === 2) gate.resolve(); await gate.promise;
    }
  };
  await Promise.all([
    ServiceMatches.updateMatchInSeason('c1', 's1', match({ status: 'FINISHED', homeScore: 2, awayScore: 0, result: 'V' })),
    ServiceMatches.addMatchToSeason('c1', 's1', match({ matchesId: 'm2', status: 'FINISHED', homeScore: 1, awayScore: 3, result: 'D' })),
  ]);
  expect(arrivals).toBeGreaterThanOrEqual(3);
  const rows = await table(); expect(rows).toHaveLength(2);
  for (const row of rows) expect(row).toMatchObject({ played: 2, points: 3, won: 1, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 3, goalDiff: 0 });
  expect(await list(seasonPath() + '/matches')).toHaveLength(2);
});

it('[B19] edições concorrentes convergem para o placar persistido, mantendo os IDs', async () => {
  const view = await screen(); scores(view.result, '2', '0');
  await act(async () => { await view.result.current.saveDetails(); });
  const ids = (await table()).map(r => r.id);
  await Promise.all([
    ServiceMatches.updateMatchInSeason('c1', 's1', match({ status: 'FINISHED', homeScore: 1, awayScore: 1, result: 'E' })),
    ServiceMatches.updateMatchInSeason('c1', 's1', match({ status: 'FINISHED', homeScore: 0, awayScore: 3, result: 'D' })),
  ]);
  const persisted = (await read(matchPath()))!;
  const rows = await table(); expect(rows.map(r => r.id)).toEqual(ids);
  const draw = persisted.homeScore === persisted.awayScore;
  expect(rows.find(r => r.name === 'Clube')).toMatchObject({ played: 1, points: draw ? 1 : 0, won: 0, drawn: draw ? 1 : 0, lost: draw ? 0 : 1, goalsFor: persisted.homeScore, goalsAgainst: persisted.awayScore, goalDiff: persisted.homeScore - persisted.awayScore });
  expect(rows.find(r => r.name === 'Rival')).toMatchObject({ played: 1, points: draw ? 1 : 3, goalsFor: persisted.awayScore, goalsAgainst: persisted.homeScore });
});

it('[B19] resposta perdida após commit propaga erro e repetição não duplica', async () => {
  const view = await screen(); scores(view.result, '2', '0');
  failOnce('updateDoc', '/matches/m1', 'after');
  let failure: unknown;
  await act(async () => { try { await view.result.current.saveDetails(); } catch (error) { failure = error; } });
  expect(failure).toMatchObject({ code: 'unavailable' });
  expect(await read(matchPath())).toMatchObject({ status: 'FINISHED' });
  const before = await table(); expect(before).toHaveLength(2);
  await act(async () => { await view.result.current.saveDetails(); });
  expect(await table()).toEqual(before);
});

it('[B19] falha no updatedAt aborta partida e ambas as linhas', async () => {
  const view = await screen(); scores(view.result, '2', '0');
  failOnce('updateDoc', '/careers/c1', 'before', 'permission-denied');
  let failure: unknown;
  await act(async () => { try { await view.result.current.saveDetails(); } catch (error) { failure = error; } });
  expect(failure).toMatchObject({ code: 'permission-denied' });
  expect(await read(matchPath())).toMatchObject({ status: 'SCHEDULED' });
  expect(await table()).toEqual([]);
  await act(async () => { await view.result.current.saveDetails(); });
  expect((await table()).find(r => r.name === 'Clube')).toMatchObject({ played: 1, points: 3 });
});

it('[B19] IDs distintos com nomes que diferem por caixa não são fundidos', async () => {
  const row = { badge: 'badge', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, customZone: 'first' as const };
  const exact = { ...row, id: 'exact', name: 'Rival' };
  const similar = { ...row, id: 'similar', name: 'RIVAL', played: 10, points: 20 };
  const view = await screen(match(), { table: [exact, similar] }); scores(view.result, '2', '0');
  await act(async () => { await view.result.current.saveDetails(); });
  expect(await read(seasonPath() + '/table/exact')).toMatchObject({ id: 'exact', played: 1, lost: 1, customZone: 'first', badge: 'badge' });
  expect(await read(seasonPath() + '/table/similar')).toEqual(similar);
});

it('[B19] nomes idênticos sem identidade na partida abortam sem escolher um ID arbitrário', async () => {
  const row = { badge: '', played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 10 };
  const duplicates = ['r1', 'r2'].map(id => ({ ...row, id, name: 'Rival' }));
  const view = await screen(match(), { table: duplicates }); scores(view.result, '2', '0');
  const before = await table(); let failure: unknown;
  await act(async () => { try { await view.result.current.saveDetails(); } catch (error) { failure = error; } });
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toContain('ambígua');
  expect(await table()).toEqual(before);
  expect(await read(matchPath())).toMatchObject({ status: 'SCHEDULED' });
});

it('[B19] falha de escrita propaga e nova tentativa não duplica contribuição', async () => {
  const view = await screen(); scores(view.result, '2', '0');
  failOnce('updateDoc', '/matches/m1');
  let failure: unknown;
  await act(async () => { try { await view.result.current.saveDetails(); } catch (error) { failure = error; } });
  expect(failure).toMatchObject({ code: 'unavailable' });
  expect(await read(matchPath())).toMatchObject({ status: 'SCHEDULED' });
  await act(async () => { await view.result.current.saveDetails(); });
  expect(await read(matchPath())).toMatchObject({ status: 'FINISHED' });
  const rows = await table(); expect(rows).toHaveLength(2);
  expect(rows.find(r => r.name === 'Clube')).toMatchObject({ played: 1, points: 3 });
  expect(rows.find(r => r.name === 'Rival')).toMatchObject({ played: 1, points: 0 });
});

it('[B19] uma identidade nos dois lados não pode receber duas contribuições', async () => {
  await screen();
  await expect(ServiceMatches.updateMatchInSeason('c1', 's1', match({ homeTeam: 'Clube', awayTeam: 'Clube', status: 'FINISHED', homeScore: 2, awayScore: 0 }))).rejects.toThrow('mesma equipe');
  expect(await read(matchPath())).toMatchObject({ status: 'SCHEDULED' });
  expect(await table()).toEqual([]);
});
