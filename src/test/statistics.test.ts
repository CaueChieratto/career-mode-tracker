import { describe, expect, it } from 'vitest';
import { augmentSeasonWithMatchStats, augmentCareerWithMatchStats, getAggregatedPlayersForCareer, toRawPlayer } from '../layout/SectionView/helpers/mergeMatchStats';
import { aggregatePlayerStats } from '../common/services/ServicePlayers/helpers/statsHelpers';
import { career, deepFreeze, leagueStats, match, player, season, stat } from './factories/domain';
import { careerScenarios, homonyms, mixedStatsSeason } from './fixtures/scenarios';

describe('estatísticas manuais e derivadas', () => {
  it('soma jogos/gols e pondera notas sem mutar a entrada', () => {
    const input = deepFreeze(mixedStatsSeason());
    const result = augmentSeasonWithMatchStats(input, 'Clube').players[0];
    expect(result.statsLeagues[0].stats).toMatchObject({ games: 3, goals: 5, rating: 6.67, minutesPlayed: 90, cleanSheets: 1 });
    expect(result.manualStatsLeagues).toEqual(input.players[0].statsLeagues);
    expect(input.players[0].statsLeagues[0].stats.games).toBe(2);
  });
  it('ignora partidas agendadas e estatísticas de outro ID', () => {
    const input = season({ players: [player()], matches: [match({ playerStats: [stat({ goals: 10 })] }), match({ matchesId: 'other', status: 'FINISHED', playerStats: [stat({ playerId: 'other', goals: 5 })] })] });
    expect(augmentSeasonWithMatchStats(input, 'Clube').players[0].statsLeagues).toEqual([]);
  });
  it('deduplica partida pelo ID usando a última versão', () => {
    const input = mixedStatsSeason();
    input.matches!.push({ ...input.matches![0], playerStats: [stat({ goals: 1, rating: 9 })] });
    expect(augmentSeasonWithMatchStats(input, 'Clube').players[0].statsLeagues[0].stats).toMatchObject({ games: 3, goals: 4, rating: 7 });
  });
  it('observação atual: ficha com zero minutos conta jogo e clean sheet pelo placar', () => {
    const input = season({ players: [player()], matches: [match({ status: 'FINISHED', playerStats: [stat({ minutesPlayed: 0, cleanSheet: false })] })] });
    expect(augmentSeasonWithMatchStats(input, 'Clube').players[0].statsLeagues[0].stats).toMatchObject({ games: 1, cleanSheets: 1, rating: 0, minutesPlayed: 0 });
  });
  it('calcula gols sofridos quando o clube é visitante', () => {
    const input = season({ players: [player()], matches: [match({ status: 'FINISHED', homeTeam: 'Rival', awayTeam: 'Clube', homeScore: 2, playerStats: [stat()] })] });
    expect(augmentSeasonWithMatchStats(input, 'Clube').players[0].statsLeagues[0].stats.cleanSheets).toBe(0);
  });
  it('mantém ligas independentes e zera média com zero jogos', () => {
    const input = mixedStatsSeason();
    input.players[0].statsLeagues.push(leagueStats({ games: 0, rating: 8 }, 'Copa'));
    const result = augmentSeasonWithMatchStats(input, 'Clube').players[0].statsLeagues;
    expect(result.map(l => [l.leagueName, l.stats.rating])).toEqual([['Liga', 6.67], ['Copa', 0]]);
  });
  it('processamento repetido conserva referências já marcadas', () => {
    const first = augmentSeasonWithMatchStats(mixedStatsSeason(), 'Clube');
    expect(augmentSeasonWithMatchStats(first, 'Clube')).toBe(first);
    expect(augmentSeasonWithMatchStats(season({ players: first.players }), 'Clube').players[0]).toBe(first.players[0]);
  });
  it.each(['empty', 'single', 'multiple'] as const)('carreira %s preserva quantidade de temporadas sem mutar', key => {
    const input = deepFreeze(careerScenarios()[key]);
    const result = augmentCareerWithMatchStats(input);
    expect(result.clubData).toHaveLength(input.clubData.length);
    expect(result).not.toBe(input);
  });
  it('toRawPlayer retira marcadores sem mutar o objeto', () => {
    const augmented = deepFreeze(augmentSeasonWithMatchStats(mixedStatsSeason(), 'Clube').players[0]);
    const raw = toRawPlayer(augmented);
    expect(raw).not.toHaveProperty('_isAugmented');
    expect(raw).not.toHaveProperty('manualStatsLeagues');
    expect(augmented).toHaveProperty('manualStatsLeagues');
  });
  it('[B02]: augment → toRaw → augment mantém a partida uma vez', () => {
    const input = mixedStatsSeason();
    const first = augmentSeasonWithMatchStats(input, 'Clube');
    const raw = toRawPlayer(first.players[0]);
    const next = augmentSeasonWithMatchStats({ ...input, players: [raw] }, 'Clube');
    expect(raw.statsLeagues[0].stats.games).toBe(2);
    expect(next.players[0].statsLeagues[0].stats).toMatchObject({ games: 3, goals: 5 });
  });
  it('[B02] 2 jogos/3 gols manuais + partida de 2 gols: augment→raw→augment deve continuar 3 jogos/5 gols, restaurando raw manual 2/3', () => {
    const input = deepFreeze(mixedStatsSeason());
    let current = input.players[0];
    for (let pass = 0; pass < 3; pass++) {
      const displayed = augmentSeasonWithMatchStats({ ...input, players: [current] }, 'Clube').players[0];
      expect(displayed.statsLeagues[0].stats).toMatchObject({ games: 3, goals: 5 });
      current = toRawPlayer(displayed);
      expect(current.statsLeagues).toEqual(input.players[0].statsLeagues);
      expect(current).not.toHaveProperty('manualStatsLeagues');
      expect(current).not.toHaveProperty('_isAugmented');
    }
  });
  it('[B02] raw sem marcador preserva campos, snapshot manual vazio e zeros', () => {
    const raw = deepFreeze(player({ statsLeagues: [leagueStats()] }));
    expect(toRawPlayer(raw)).toEqual(raw);
    expect(toRawPlayer({ ...raw, manualStatsLeagues: [] }).statsLeagues).toEqual([]);
    expect(toRawPlayer({ ...raw, manualStatsLeagues: raw.statsLeagues }).statsLeagues).toEqual([leagueStats()]);
  });
});

describe('agregação de carreira e histórico', () => {
  it('carreira vazia e mapa vazio retornam arrays vazios', () => {
    expect(getAggregatedPlayersForCareer(career())).toEqual([]);
    expect(aggregatePlayerStats(new Map())).toEqual([]);
  });
  it('[B01] um prêmio na primeira ocorrência conta uma vez', () => {
    expect(getAggregatedPlayersForCareer(career({ clubData: [season({ players: [player({ ballonDor: 1 })] })] }))[0].ballonDor).toBe(1);
  });
  it.each([[0], [1], [1, 2], [0, 0]])('[B01] agrega premiações %j sem duplicar ao reprocessar', (...awards) => {
    const input = deepFreeze(career({ clubData: awards.map((ballonDor, i) => season({ id: `s${i}`, seasonNumber: i + 1, players: [player({ ballonDor })] })) }));
    const expected = awards.reduce((sum, n) => sum + n, 0);
    const first = getAggregatedPlayersForCareer(input);
    expect(first[0].ballonDor).toBe(expected);
    expect(getAggregatedPlayersForCareer(input)).toEqual(first);
    expect(getAggregatedPlayersForCareer(career({ clubData: [season({ players: first })] }))[0].ballonDor).toBe(expected);
  });
  it('[B05] identidade usa ID e preserva homônimos distintos', () => {
    const input = deepFreeze(career({ clubData: [season({ players: homonyms() })] }));
    const result = getAggregatedPlayersForCareer(input);
    expect(result.map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
  it('agrega duas temporadas, incluindo ficha vendida, e pondera notas', () => {
    const input = deepFreeze(career({ clubData: [
      season({ players: [player({ overall: 90, statsLeagues: [leagueStats({ games: 2, goals: 2, rating: 6 })] })] }),
      season({ id: 's2', seasonNumber: 2, players: [player({ sell: true, overall: 80, statsLeagues: [leagueStats({ games: 1, goals: 3, rating: 9 })] })] }),
    ] }));
    const result = getAggregatedPlayersForCareer(input)[0];
    expect(result).toMatchObject({ sell: true, overall: 80 });
    expect(result.statsLeagues[0].stats).toMatchObject({ games: 3, goals: 5, rating: 7 });
  });
  it('histórico preserva máximo overall, soma prêmios uma vez e usa último contrato', () => {
    const history = deepFreeze([player({ overall: 90, ballonDor: 1, statsLeagues: [leagueStats({ games: 2, rating: 6 })] }), player({ overall: 80, ballonDor: 2, sell: true, statsLeagues: [leagueStats({ games: 1, rating: 9 })] })]);
    const result = aggregatePlayerStats(new Map([['identity', history]]))[0];
    expect(result).toMatchObject({ overall: 90, ballonDor: 3, sell: true });
    expect(result.statsLeagues[0].stats).toMatchObject({ games: 3, rating: 7, minutesPlayed: 0, defenses: 0 });
  });
  it('mapa de histórico respeita chaves distintas mesmo com nomes iguais', () => {
    expect(aggregatePlayerStats(new Map([['a', [player()]], ['b', [player({ id: 'p2' })]]]))).toHaveLength(2);
  });
  it('histórico com duas estatísticas de zero jogos evita divisão por zero', () => {
    const result = aggregatePlayerStats(new Map([['a', [player({ statsLeagues: [leagueStats()] }), player({ statsLeagues: [leagueStats()] })]]]));
    expect(result[0].statsLeagues[0].stats.rating).toBe(0);
  });
});
