import { describe, expect, it } from 'vitest';
import { buildLineupStatsUpdate } from '../pages/Match/components/LineupTab/helpers/buildLineupStatsUpdate';
import { calculateSubstitutionChainMinutes, calculateSubstituteMinutes, getMaximumMatchMinutes } from '../pages/Match/components/LineupTab/views/AddMatchStatsPlayer/helpers/calculateSubstitutionMinutes';
import { deepFreeze, lineup, match, stat } from './factories/domain';
import { matchScenarios, substitutionChain } from './fixtures/scenarios';

describe('escalação e estatísticas individuais', () => {
  it('mantém titulares, goleiro e banco; remove somente IDs fora da escalação', () => {
    const stats = deepFreeze([stat(), stat({ playerId: 'p2' }), stat({ playerId: 'g1' }), stat({ playerId: 'removed' })]);
    expect(buildLineupStatsUpdate(deepFreeze(lineup()), stats)).toEqual({ updatedPlayerStats: stats.slice(0, 3), removedPlayerIds: ['removed'] });
  });
  it('sem estatísticas retorna alterações vazias', () => {
    expect(buildLineupStatsUpdate(lineup(), undefined)).toEqual({ updatedPlayerStats: [], removedPlayerIds: [] });
  });
  it('slots vazios e repetidos não duplicam fichas', () => {
    const l = lineup({ goalkeeper: { slotId: 'gk', playerId: null, playerName: null }, bench: undefined });
    l.lines.push(l.lines[0]);
    expect(buildLineupStatsUpdate(l, [stat(), stat({ playerId: 'p2' })])).toEqual({ updatedPlayerStats: [stat()], removedPlayerIds: ['p2'] });
  });
  it.each([[match(), 90], [match({ stoppage1T: 2, stoppage2T: 4 }), 96], [matchScenarios().extraTime, 128]])('duração total inclui acréscimos relevantes (%#)', (m, total) => {
    expect(getMaximumMatchMinutes(m)).toBe(total);
  });
  it('cadeia A→B→C funciona nos dois sentidos sem mutação', () => {
    const fixture = deepFreeze(substitutionChain());
    for (const id of ['p1', 'p2', 'p3']) expect(calculateSubstitutionChainMinutes({ ...fixture, startPlayerIds: [id] })).toBe(90);
  });
  it('ciclo e múltiplas raízes não contam jogadores duas vezes', () => {
    const fixture = substitutionChain();
    fixture.playerStats[2].substituteIn = 'Ana';
    expect(calculateSubstitutionChainMinutes({ ...fixture, startPlayerIds: ['p1', 'p3'] })).toBe(90);
  });
  it('exclui minutos do jogador atual mas atravessa sua ligação', () => {
    expect(calculateSubstitutionChainMinutes({ ...substitutionChain(), startPlayerIds: ['p1'], excludedPlayerIds: new Set(['p2']) })).toBe(60);
  });
  it('IDs e estatísticas ausentes não interrompem a cadeia', () => {
    expect(calculateSubstitutionChainMinutes({ players: [], playerStats: [], startPlayerIds: ['missing'] })).toBe(0);
    expect(calculateSubstitutionChainMinutes({ ...substitutionChain(), startPlayerIds: [] })).toBe(0);
  });
  it('permite fonte de estatística em edição por getStat', () => {
    const fixture = substitutionChain();
    expect(calculateSubstitutionChainMinutes({ ...fixture, startPlayerIds: ['p1'], getStat: id => ({ ...fixture.playerStats.find(s => s.playerId === id)!, minutesPlayed: 10 }) })).toBe(30);
  });
  it('preenche apenas minutos vazios com o restante da cadeia', () => {
    const args = { ...substitutionChain(), value: 'Bia', currentMinutes: '', playerId: 'p3', match: match() };
    expect(calculateSubstituteMinutes(args)).toBe('15');
    expect(calculateSubstituteMinutes({ ...args, match: matchScenarios().extraTime })).toBe('53');
    expect(calculateSubstituteMinutes({ ...args, currentMinutes: '12' })).toBeUndefined();
  });
  it('não produz minutos negativos quando cadeia excede a duração', () => {
    const fixture = substitutionChain();
    fixture.playerStats[0].minutesPlayed = 100;
    expect(calculateSubstituteMinutes({ ...fixture, value: 'Ana', playerId: 'p3', currentMinutes: 0, match: match() })).toBe('0');
  });
  it.each(['Nenhum', 'Desconhecido'])('seleção %s não inventa minutos', value => {
    expect(calculateSubstituteMinutes({ ...substitutionChain(), value, currentMinutes: 0, playerId: 'p3', match: match() })).toBeUndefined();
  });
  it('arrays ausentes e cadeia sem minutos deixam valor indefinido', () => {
    const args = { value: 'Ana', currentMinutes: undefined, playerId: 'p3', match: match() };
    expect(calculateSubstituteMinutes(args)).toBeUndefined();
    expect(calculateSubstituteMinutes({ ...args, players: substitutionChain().players, playerStats: [] })).toBeUndefined();
  });
});
