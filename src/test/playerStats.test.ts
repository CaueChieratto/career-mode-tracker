import { beforeEach, describe, expect, it, vi } from 'vitest';
import { savePlayerMatchStats } from '../pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats';
import { buildPlayerStats } from '../pages/Match/components/LineupTab/views/AddMatchStatsPlayer/helpers/buildPlayerStats';
import { ServiceMatches } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches';
import { career, deepFreeze, match, player, season, stat } from './factories/domain';

vi.mock('../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches', () => ({ ServiceMatches: { savePlayerStatsToSubcollection: vi.fn() } }));
beforeEach(() => { vi.mocked(ServiceMatches.savePlayerStatsToSubcollection).mockReset().mockResolvedValue(undefined); });
describe('estatísticas individuais e contraparte de substituição', () => {
  it('converte números, filtra minutos e alvos inválidos e preserva cartões', () => {
    const result = buildPlayerStats('p1', { matchGoals: '2', goalMinute_0: '15', goalMinute_1: '', assists: '2', assistToGoal_0: 'p2:30', assistToGoal_1: 'Nenhum gol disponível', yellowCardMinute: '22', substituteIn: 'Bia' }, { yellowCard: true });
    expect(result).toMatchObject({ playerId: 'p1', goals: 2, goalMinutes: [15], assists: 2, assistTargets: ['p2:30'], yellowCard: true, yellowCardMinute: 22, minutesPlayed: 0, substituteIn: 'Bia' });
  });
  it('salva ficha no ID certo, substitui entrada e não altera partida original', async () => {
    const input = deepFreeze(match({ playerStats: [stat({ goals: 1 })] }));
    const result = await savePlayerMatchStats({ career: career(), season: season(), match: input, player: player(), formValues: { matchGoals: '2', minutesPlayed: '90' }, booleanValues: {} });
    expect(result.updatedPlayerStats).toHaveLength(1);
    expect(result.updatedPlayerStats[0].goals).toBe(2);
    expect(ServiceMatches.savePlayerStatsToSubcollection).toHaveBeenCalledWith('c1', 's1', 'm1', [expect.objectContaining({ playerId: 'p1', goals: 2 })], [expect.objectContaining({ playerId: 'p1', goals: 2 })]);
  });
  it('contraparte sem minutos recebe restante e mantém vínculo reverso', async () => {
    const result = await savePlayerMatchStats({ career: career(), season: season({ players: [player(), player({ id: 'p2', name: 'Bia' })] }), match: match(), player: player(), formValues: { minutesPlayed: '60', substituteIn: 'Bia' }, booleanValues: {} });
    expect(result.updatedPlayerStats).toEqual([expect.objectContaining({ playerId: 'p1', minutesPlayed: 60 }), expect.objectContaining({ playerId: 'p2', minutesPlayed: 30, substituteIn: 'Ana' })]);
    expect(ServiceMatches.savePlayerStatsToSubcollection).toHaveBeenCalledWith('c1', 's1', 'm1', [expect.objectContaining({ playerId: 'p1', minutesPlayed: 60 }), expect.objectContaining({ playerId: 'p2', minutesPlayed: 30, substituteIn: 'Ana' })], [expect.objectContaining({ playerId: 'p1', minutesPlayed: 60 }), expect.objectContaining({ playerId: 'p2', minutesPlayed: 30, substituteIn: 'Ana' })]);
  });
  it('contraparte com minutos informados não é sobrescrita', async () => {
    const counterpart = stat({ playerId: 'p2', minutesPlayed: 20, goals: 1 });
    const result = await savePlayerMatchStats({ career: career(), season: season({ players: [player(), player({ id: 'p2', name: 'Bia' })] }), match: match({ playerStats: [counterpart] }), player: player(), formValues: { minutesPlayed: '60', substituteIn: 'Bia' }, booleanValues: {} });
    expect(result.updatedPlayerStats[0]).toBe(counterpart);
    expect(ServiceMatches.savePlayerStatsToSubcollection).toHaveBeenCalledTimes(1);
  });
  it('erro na primeira gravação rejeita e não tenta contraparte', async () => {
    vi.mocked(ServiceMatches.savePlayerStatsToSubcollection).mockRejectedValue(new Error('offline'));
    await expect(savePlayerMatchStats({ career: career(), season: season(), match: match(), player: player(), formValues: {}, booleanValues: {} })).rejects.toThrow('offline');
    expect(ServiceMatches.savePlayerStatsToSubcollection).toHaveBeenCalledTimes(1);
  });
});

