import { describe, expect, it } from 'vitest';
import { buildLoanContractHistory, buildReturnContractHistory, buildSellContractHistory, mergeUpdatedContracts } from '../common/services/ServicePlayers/helpers/contractHelpers';
import { stripHeavyData } from '../common/utils/stripHeavyData';
import { deepFreeze, player, season } from './factories/domain';
import { loanPlayer, mixedStatsSeason } from './fixtures/scenarios';

const start = new Date(2024, 6, 1);
const end = new Date(2025, 5, 30);
describe('contratos e payload leve', () => {
  it('edição ordinária combina primeiro contrato e preserva histórico sem mutar', () => {
    const p = deepFreeze(player());
    const result = mergeUpdatedContracts(p, { contract: [{ ...p.contract[0], buyValue: 300 }] });
    expect(result[0]).toMatchObject({ buyValue: 300, fromClub: 'Origem' });
    expect(p.contract[0].buyValue).toBe(100);
  });
  it('edição de empréstimo preserva condições especiais do último contrato', () => {
    const p = deepFreeze(loanPlayer());
    expect(mergeUpdatedContracts(p, { contract: [{ ...p.contract[0], buyValue: 200, leftClub: 'Incorreto', loanDuration: 9 }] })[0]).toMatchObject({ buyValue: 200, leftClub: 'Destino', loanDuration: 1, wagePercentage: 50, isLoan: true });
  });
  it('sem contrato novo conserva histórico; sem histórico retorna vazio', () => {
    const p = player();
    expect(mergeUpdatedContracts(p, {})).toBe(p.contract);
    expect(mergeUpdatedContracts({}, {})).toEqual([]);
  });
  it.each([['15/08', 2024, 7], ['10/02', 2025, 1]] as const)('venda %s escolhe ano da temporada sem mutar', (date, year, month) => {
    const p = deepFreeze(player());
    const result = buildSellContractHistory(p, '1k', 'Comprador', date, start, end);
    expect(result[0]).toMatchObject({ leftClub: 'Comprador', sellValue: 1000, dataExit: new Date(year, month, Number(date.slice(0, 2))) });
    expect(p.contract[0]).not.toHaveProperty('dataExit');
  });
  it('venda sem histórico cria contrato inicial', () => {
    expect(buildSellContractHistory(player({ contract: [] }), '0', 'Destino', '01/07', start, end)[0]).toMatchObject({ buyValue: 0, sellValue: 0, dataArrival: null });
  });
  it('empréstimo converte prazo, porcentagem e opção sem mutar', () => {
    const result = buildLoanContractHistory(deepFreeze(player()), '2k', 'Destino', '10/02', '2', '50', start, end);
    expect(result[0]).toMatchObject({ isLoan: true, loanDuration: 2, wagePercentage: 50, buyOptionValue: 2000, dataExit: new Date(2025, 1, 10) });
  });
  it('datas não numéricas são rejeitadas em venda/empréstimo', () => {
    expect(() => buildSellContractHistory(player(), '0', 'X', 'xx/yy', start, end)).toThrow();
    expect(() => buildLoanContractHistory(player(), '0', 'X', 'xx/yy', '1', '0', start, end)).toThrow();
  });
  it('retorno de empréstimo cedido adiciona chegada sem mutar histórico', () => {
    const p = deepFreeze(loanPlayer());
    const result = buildReturnContractHistory(p, '10/02', start, end);
    expect(result.contractHistory).toHaveLength(2);
    expect(result.contractHistory[1]).toMatchObject({ fromClub: 'Destino', dataArrival: new Date(2025, 1, 10) });
  });
  it('retorno sem data usa fim da temporada e permite histórico vazio', () => {
    expect(buildReturnContractHistory(player({ contract: [] }), '', start, end)).toEqual({ contractHistory: [], parsedDate: end });
  });
  it('[B04] retorno recebido preserva entrada e cria saída no resultado', () => {
    const p = deepFreeze(loanPlayer(true));
    const before = structuredClone(p);
    const result = buildReturnContractHistory(p, '10/02', start, end);
    expect(p).toEqual(before);
    expect(result.contractHistory[0]).not.toBe(p.contract[0]);
    expect(result.contractHistory[0]).toEqual({ ...before.contract[0], leftClub: 'Origem', dataExit: new Date(2025, 1, 10) });
    expect(result.parsedDate).toEqual(new Date(2025, 1, 10));
  });
  it('[B04] sem origem usa o destino de retorno padrão sem mutar', () => {
    const p = loanPlayer(true);
    p.contract[0].fromClub = '';
    const before = structuredClone(p);
    const result = buildReturnContractHistory(deepFreeze(p), '', start, end);
    expect(p).toEqual(before);
    expect(result.contractHistory[0]).toMatchObject({ leftClub: 'Fim de Empréstimo', dataExit: end });
  });
  it('[B13] stripHeavyData remove apenas cópias hidratadas, preservando metadados', () => {
    const input = deepFreeze([mixedStatsSeason()]);
    const result = stripHeavyData(input, [season()]);
    expect(result[0]).toMatchObject({ id: 's1', seasonNumber: 1, players: [] });
    expect(result[0]).not.toHaveProperty('matches');
    expect(input[0].players).toHaveLength(1);
    expect(stripHeavyData([])).toEqual([]);
  });
});

it('[B13] sem prova de redundância preserva legado e entrada congelada', () => {
  const input = deepFreeze([mixedStatsSeason()]);
  const before = structuredClone(input);
  expect(stripHeavyData(input)).toEqual(before);
  expect(input).toEqual(before);
});
it('[B13] preserva fonte embutida original em formato misto e novos metadados', () => {
  const stored = deepFreeze([mixedStatsSeason()]);
  const before = structuredClone(stored);
  const hydrated = [{ ...stored[0], leagues: [{ name: 'Nova Liga', trophy: '', logo: '' }], players: [player({ overall: 99 })] }];
  const result = stripHeavyData(deepFreeze(hydrated), stored);
  expect(result[0].players).toEqual(stored[0].players);
  expect(result[0].matches).toEqual(stored[0].matches);
  expect(result[0].leagues).toEqual(hydrated[0].leagues);
  expect(stored).toEqual(before);
});
