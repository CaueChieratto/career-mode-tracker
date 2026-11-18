import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllCareers, getCareerById } from '../common/helpers/Getters';
import { ServiceMatches } from '../common/services/ServiceMatches';
import { PlayersCrudService } from '../common/services/ServicePlayers/PlayersCrudService';
import { ServiceTable } from '../common/services/ServiceTable';
import { documentSnapshot, getDoc, getDocs, onSnapshot, querySnapshot } from './mocks/firestore';
import { career, deepFreeze, season } from './factories/domain';
import { sourceOverlap } from './fixtures/scenarios';
import type { Career } from '../common/interfaces/Career';

vi.mock('../common/services/ServiceMatches', () => ({ ServiceMatches: { getMatchesBySeason: vi.fn() } }));
vi.mock('../common/services/ServicePlayers/PlayersCrudService', () => ({ PlayersCrudService: { getPlayersBySeason: vi.fn() } }));
vi.mock('../common/services/ServiceTable', () => ({ ServiceTable: { getTableBySeason: vi.fn() } }));

beforeEach(() => {
  vi.mocked(ServiceMatches.getMatchesBySeason).mockReset().mockResolvedValue([]);
  vi.mocked(PlayersCrudService.getPlayersBySeason).mockReset().mockResolvedValue([]);
  vi.mocked(ServiceTable.getTableBySeason).mockReset().mockResolvedValue([]);
  getDoc.mockReset();
  getDocs.mockReset().mockResolvedValue(querySnapshot([]));
  onSnapshot.mockReset();
});

const loadList = async (input: Career) => {
  let deliver: ((snapshot: ReturnType<typeof querySnapshot>) => Promise<void>) | undefined;
  const unsubscribe = vi.fn();
  onSnapshot.mockImplementation((_ref, callback) => { deliver = callback as typeof deliver; return unsubscribe; });
  const callback = vi.fn();
  expect(getAllCareers('test-user', callback)).toBe(unsubscribe);
  await deliver!(querySnapshot([{ id: input.id, data: input }]));
  return callback.mock.calls[0][0] as Career[];
};

describe('precedência legado/subcoleções com fronteiras simuladas', () => {
  it('getCareerById mescla fontes, prioriza IDs atuais e preserva exclusivos legados', async () => {
    const f = sourceOverlap();
    const input = deepFreeze(career({ clubData: [season({ players: f.legacyPlayers, matches: f.legacyMatches })] }));
    getDoc.mockResolvedValue(documentSnapshot('c1', input));
    vi.mocked(ServiceMatches.getMatchesBySeason).mockResolvedValue(f.currentMatches);
    vi.mocked(PlayersCrudService.getPlayersBySeason).mockResolvedValue(f.currentPlayers);
    const result = (await getCareerById('test-user', 'c1')).clubData[0];
    expect(result.players.map(p => p.id)).toEqual(['p1', 'current-only', 'legacy-only']);
    expect(result.players[0].overall).toBe(80);
    expect(result.matches!.map(m => m.matchesId)).toEqual(['m1', 'current-match', 'legacy-match']);
    expect(result.matches![0].homeScore).toBe(3);
  });
  it('[B05]: lista conserva exclusivos legados quando subcoleção tem dados', async () => {
    const f = sourceOverlap();
    vi.mocked(ServiceMatches.getMatchesBySeason).mockResolvedValue(f.currentMatches);
    vi.mocked(PlayersCrudService.getPlayersBySeason).mockResolvedValue(f.currentPlayers);
    const result = (await loadList(career({ clubData: [season({ players: f.legacyPlayers, matches: f.legacyMatches })] })))[0].clubData[0];
    expect(result.players.map(p => p.id)).toEqual(['p1', 'current-only', 'legacy-only']);
    expect(result.matches!.map(m => m.matchesId)).toEqual(['m1', 'current-match', 'legacy-match']);
  });
  it('[B05] legado p1/legacy-only e atual p1/current-only: lista e detalhe devem retornar os três IDs, com p1 atual; mesma regra para partidas', async () => {
    const f = sourceOverlap();
    const input = deepFreeze(career({ clubData: [season({ players: f.legacyPlayers, matches: f.legacyMatches })] }));
    getDoc.mockResolvedValue(documentSnapshot('c1', input));
    vi.mocked(ServiceMatches.getMatchesBySeason).mockResolvedValue(f.currentMatches);
    vi.mocked(PlayersCrudService.getPlayersBySeason).mockResolvedValue(f.currentPlayers);
    const detail = (await getCareerById('test-user', 'c1')).clubData[0];
    const listed = (await loadList(input))[0].clubData[0];
    const { academyPlayers, ...listedWithoutAcademy } = listed;
    expect(academyPlayers).toEqual([]);
    expect(listedWithoutAcademy).toEqual(detail);
    expect(listed.players).toEqual([...f.currentPlayers, f.legacyPlayers[1]]);
    expect(listed.matches).toEqual([...f.currentMatches, f.legacyMatches[1]]);
  });
  it('subcoleções vazias preservam legado na lista e no detalhe', async () => {
    const f = sourceOverlap();
    const input = career({ clubData: [season({ players: f.legacyPlayers, matches: f.legacyMatches })] });
    getDoc.mockResolvedValue(documentSnapshot('c1', input));
    expect((await getCareerById('test-user', 'c1')).clubData[0].players).toEqual(f.legacyPlayers);
    expect((await loadList(input))[0].clubData[0].matches).toEqual(f.legacyMatches);
  });
  it('falha de hidratação preserva fontes legadas e registra erro', async () => {
    const input = career({ clubData: [season({ players: sourceOverlap().legacyPlayers })] });
    getDoc.mockResolvedValue(documentSnapshot('c1', input));
    vi.mocked(ServiceMatches.getMatchesBySeason).mockRejectedValue(new Error('offline'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await getCareerById('test-user', 'c1')).clubData).toEqual(input.clubData);
    expect((await loadList(input))[0].clubData).toEqual(input.clubData);
    expect(log).toHaveBeenCalledTimes(2);
  });
  it('carreira inexistente rejeita sem hidratar', async () => {
    getDoc.mockResolvedValue(documentSnapshot('c1', {}, false));
    await expect(getCareerById('test-user', 'c1')).rejects.toThrow('Carreira não encontrada');
    expect(PlayersCrudService.getPlayersBySeason).not.toHaveBeenCalled();
  });
  it('carreira vazia aceita Timestamp e não abre consultas de temporadas', async () => {
    getDoc.mockResolvedValue(documentSnapshot('c1', { ...career(), createdAt: { toDate: () => new Date('2024-07-01T00:00:00Z') } }));
    expect((await getCareerById('test-user', 'c1')).createdAt).toEqual(career().createdAt);
    expect(ServiceMatches.getMatchesBySeason).not.toHaveBeenCalled();
  });
  it('deduplica temporadas repetidas no clubData tanto na listagem quanto no detalhe (Padrão FC Barcelona)', async () => {
    const input = career({
      clubName: 'FC Barcelona',
      clubData: [
        season({ id: 'season-1', seasonNumber: 1 }),
        season({ id: 'season-2', seasonNumber: 2 }),
        season({ id: 'season-3', seasonNumber: 3 }),
        season({ id: 'season-3', seasonNumber: 3 }),
      ],
    });
    getDoc.mockResolvedValue(documentSnapshot('c1', input));
    const detail = await getCareerById('test-user', 'c1');
    expect(detail.clubData).toHaveLength(3);
    expect(detail.clubData.map((s) => s.id)).toEqual(['season-1', 'season-2', 'season-3']);

    const list = await loadList(input);
    expect(list[0].clubData).toHaveLength(3);
    expect(list[0].clubData.map((s) => s.id)).toEqual(['season-1', 'season-2', 'season-3']);
  });
});

it.each([{ fromCache: false, hasPendingWrites: false }, { fromCache: true, hasPendingWrites: false }, { fromCache: false, hasPendingWrites: true }])('[B09] inexistência com metadados %j recebe classificação adequada', async metadata => {
  getDoc.mockResolvedValue({ ...documentSnapshot('missing', {}, false), metadata });
  await expect(getCareerById('test-user', 'missing')).rejects.toMatchObject({ code: metadata.fromCache || metadata.hasPendingWrites ? 'career/unavailable' : 'career/not-found' });
  expect(PlayersCrudService.getPlayersBySeason).not.toHaveBeenCalled();
});

it('[B13] expõe snapshot embutido da mesma leitura sem mudar a hidratação', async () => {
  const f = sourceOverlap();
  const input = deepFreeze(career({ clubData: [season({ players: f.legacyPlayers, matches: f.legacyMatches })] }));
  getDoc.mockResolvedValue(documentSnapshot('c1', input));
  vi.mocked(ServiceMatches.getMatchesBySeason).mockResolvedValue(f.currentMatches);
  vi.mocked(PlayersCrudService.getPlayersBySeason).mockResolvedValue(f.currentPlayers);
  const capture = vi.fn();
  const result = await getCareerById('test-user', 'c1', capture);
  expect(capture).toHaveBeenCalledExactlyOnceWith(input.clubData);
  expect(result.clubData[0].players.map(p => p.id)).toEqual(['p1', 'current-only', 'legacy-only']);
  expect(capture.mock.calls[0][0][0].players).toEqual(f.legacyPlayers);
  expect(getDoc).toHaveBeenCalledTimes(1);
  expect(ServiceMatches.getMatchesBySeason).toHaveBeenCalledTimes(1);
  expect(PlayersCrudService.getPlayersBySeason).toHaveBeenCalledTimes(1);
});
