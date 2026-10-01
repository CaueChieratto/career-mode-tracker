import { describe, expect, it } from 'vitest';
import { buildMatchPayload } from '../pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/buildMatchPayload';
import { getNewTableTeamData, getUpdatedTableTeamData } from '../pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/calculateTableStats';
import { validateMatchForm } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/validators/validateMatchForm';
import { deepFreeze, match } from './factories/domain';

describe('resultado e classificação', () => {
  it.each([
    ['2', '1', true, 'V'], ['2', '1', false, 'D'], ['0', '1', true, 'D'], ['0', '1', false, 'V'], ['0', '0', true, 'E'],
  ] as const)('placar %s×%s mandante=%s retorna %s', (homeScore, awayScore, home, expected) => {
    expect(buildMatchPayload(deepFreeze(match()), { homeScore, awayScore }, {}, home).userResult).toBe(expected);
  });
  it.each([[4, 3, true, 'V'], [4, 3, false, 'D'], [3, 4, true, 'D'], [3, 4, false, 'V'], [0, 0, true, 'E']] as const)('pênaltis %i×%i mandante=%s retorna %s', (h, a, home, expected) => {
    const { updatedMatch, userResult } = buildMatchPayload(match(), { homeScore: '1', awayScore: '1', homePenScore: String(h), awayPenScore: String(a) }, { hasPenalties: true }, home);
    expect(userResult).toBe(expected);
    expect(updatedMatch).toMatchObject({ homePenScore: h, awayPenScore: a, status: 'FINISHED' });
  });
  it('placar não empatado tem prioridade sobre pênaltis', () => {
    expect(buildMatchPayload(match(), { homeScore: '2', awayScore: '1', homePenScore: '0', awayPenScore: '5' }, { hasPenalties: true }, true).userResult).toBe('V');
  });
  it('remove pênaltis do objeto retornado sem alterar o original', () => {
    const input = deepFreeze(match({ homePenScore: 4, awayPenScore: 3 }));
    const { updatedMatch } = buildMatchPayload(input, {}, {}, true);
    expect(updatedMatch).not.toHaveProperty('homePenScore');
    expect(updatedMatch).not.toHaveProperty('awayPenScore');
    expect(input.homePenScore).toBe(4);
  });
  it('normaliza vazios, prorrogação e melhor adversário', () => {
    const { updatedMatch } = buildMatchPayload(match(), { homeScore: '', awayScore: 'NaN', stoppage1T: '2', stoppageET2: '1', opponentMvpName: '  Rival  ', opponentMvpRating: '8.5' }, { hasExtraTime: true }, true);
    expect(updatedMatch).toMatchObject({ homeScore: 0, awayScore: 0, hasExtraTime: true, stoppage1T: 2, stoppage2T: 0, stoppageET2: 1, opponentMvpName: 'Rival', opponentMvpRating: 8.5 });
  });
  it.each([['V', 3, 1, 0, 0], ['E', 1, 0, 1, 0], ['D', 0, 0, 0, 1]] as const)('tabela contabiliza %s', (result, points, won, drawn, lost) => {
    const row = getNewTableTeamData('Clube', 2, 1, result, 'badge');
    expect(row).toMatchObject({ played: 1, points, won, drawn, lost, goalsFor: 2, goalsAgainst: 1, goalDiff: 1 });
    const updated = getUpdatedTableTeamData(deepFreeze({ ...row, id: 't1' }), 0, 0, result);
    expect(updated).toMatchObject({ played: 2, points: points * 2, won: won * 2, drawn: drawn * 2, lost: lost * 2, goalsFor: 2, goalsAgainst: 1, goalDiff: 1 });
  });
  it('edição precisa de coordenação externa: helper soma um novo jogo em toda chamada', () => {
    const row = { ...getNewTableTeamData('Clube', 2, 0, 'V', ''), id: 't1' };
    expect(getUpdatedTableTeamData(row, 2, 0, 'V')).toMatchObject({ played: 2, points: 6, goalsFor: 4 });
  });
  it.each([{ date: '', league: 'Liga', opponentTeam: 'Rival' }, { date: '01/08', league: '', opponentTeam: 'Rival' }, { date: '01/08', league: 'Liga', opponentTeam: '' }, { date: 'xx/yy', league: 'Liga', opponentTeam: 'Rival' }])('validação rejeita campo ausente ou não numérico (%#)', values => {
    expect(validateMatchForm(values).valid).toBe(false);
  });
  it('aceita uma data válida DD/MM', () => {
    expect(validateMatchForm({ date: '31/08', league: 'Liga', opponentTeam: 'Rival' })).toEqual({ valid: true });
  });
  it('[B03] rejeita 99/99 com mensagem de data inválida', () => {
    expect(validateMatchForm({ date: '99/99', league: 'Liga', opponentTeam: 'Rival' })).toEqual({ valid: false, message: 'Data inválida. Use o formato DD/MM.' });
  });
  it.each(['32/01', '31/04', '30/02', '01/13', '00/01', '01/00', '01', '01/', '/08', '1.5/08', 'xx/yy'])('[B03] rejeita dia, mês ou formato inválido: %s', date => {
    expect(validateMatchForm({ date, league: 'Liga', opponentTeam: 'Rival' }).valid).toBe(false);
  });
  it.each(['31/08', '29/02', '1/8'])('[B03] preserva data legítima sem ano: %s', date => {
    expect(validateMatchForm({ date, league: 'Liga', opponentTeam: 'Rival' })).toEqual({ valid: true });
  });
  it('[B03] vazio continua obrigatório', () => {
    expect(validateMatchForm({ date: '', league: 'Liga', opponentTeam: 'Rival' }).message).toContain('obrigatórios');
  });
});
