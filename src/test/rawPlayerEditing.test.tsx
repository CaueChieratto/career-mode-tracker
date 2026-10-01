// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AddSeasonPlayerScreen from '../layout/SectionView/features/ClubTabs/StatsTab_Club/views/AddSeason_Player/screens/AddSeason_PlayerScreen';
import PlayerStats from '../layout/SectionView/features/ClubTabs/StatsTab_Club/components/PlayerStatsList/components/PlayerStats';
import { augmentSeasonWithMatchStats } from '../layout/SectionView/helpers/mergeMatchStats';
import { career, leagueStats } from './factories/domain';
import { mixedStatsSeason } from './fixtures/scenarios';

const state = vi.hoisted(() => ({ drafted: '', remove: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), useLocation: () => ({ pathname: '/Season/s1' }), useParams: () => ({ careerId: 'c1' }) }));
vi.mock('../common/hooks/Modal/UseModalManager', () => ({ useModalManager: () => ({}) }));
vi.mock('../common/hooks/Seasons/UseSeasonTheme', () => ({ useSeasonTheme: () => ({}) }));
vi.mock('../common/constants/ModalManager', () => ({ default: () => null }));
vi.mock('../components/HeaderSeason', () => ({ default: () => null }));
vi.mock('../common/hooks/Players/UsePlayerStats', () => ({ usePlayerStats: ({ handleGoBack }: { handleGoBack: () => void }) => ({ handleStatsSave: handleGoBack, isStatsLoading: false }) }));
vi.mock('../common/hooks/Players/UsePlayerSeasonStats', () => ({ usePlayerSeasonStats: () => ({ handleDeleteLeague: state.remove, isDeletingLeague: false }) }));
vi.mock('../ui/Navbar', async () => {
  const { createElement } = await import('react');
  return { default: ({ save }: { save: () => void }) => createElement('button', { onClick: save }, 'Salvar') };
});
vi.mock('../layout/SectionView/features/ClubTabs/StatsTab_Club/views/AddSeason_Player/components/AddSeason_Player_Form', async () => {
  const { createElement, forwardRef } = await import('react');
  return { default: forwardRef<HTMLFormElement>((_, ref) => createElement('form', { ref },
    createElement('input', { name: 'draftedLeagues', value: state.drafted, readOnly: true }),
    createElement('input', { name: 'ballonDor', value: 'true', readOnly: true }))) };
});
vi.mock('../components/Statistics/StatisticsTable_Title', async () => {
  const { createElement } = await import('react');
  return { default: ({ type }: { type: string }) => createElement('span', null, type) };
});
vi.mock('../components/Statistics/CalculatedStatistics', async () => {
  const { createElement } = await import('react');
  return { default: ({ handleDeleteLeague }: { handleDeleteLeague?: (name: string) => void }) => handleDeleteLeague ? createElement('button', { onClick: () => handleDeleteLeague('Liga') }, 'Excluir Liga') : null };
});
afterEach(cleanup);

it.each(['edited', 'empty', 'omitted'] as const)('[B02] edição %s devolve base manual atualizada sem restaurar snapshot antigo', mode => {
  const season = augmentSeasonWithMatchStats(mixedStatsSeason(), 'Clube');
  const edited = [leagueStats({ games: 4, goals: 9 })];
  state.drafted = mode === 'omitted' ? '' : JSON.stringify(mode === 'empty' ? [] : edited);
  const close = vi.fn();
  render(createElement(AddSeasonPlayerScreen, { career: career(), season, player: season.players[0], onClose: close }));
  fireEvent.click(screen.getByText('Salvar'));
  const raw = close.mock.calls[0][0].player;
  expect(raw.statsLeagues).toEqual(mode === 'omitted' ? mixedStatsSeason().players[0].statsLeagues : mode === 'empty' ? [] : edited);
  expect(raw.ballonDor).toBe(1);
  expect(raw).not.toHaveProperty('_isAugmented');
  expect(raw).not.toHaveProperty('manualStatsLeagues');
});

it('[B02] exclusão manual não restaura liga removida nem apaga estatística derivada da partida', async () => {
  state.remove.mockResolvedValue(true);
  const input = mixedStatsSeason();
  input.players[0].statsLeagues.push(leagueStats({ games: 1, goals: 4 }, 'Copa'));
  const season = augmentSeasonWithMatchStats(input, 'Clube');
  const update = vi.fn();
  render(createElement(PlayerStats, { career: career(), season, player: season.players[0], isGeralPage: false, onEditPlayerStats: vi.fn(), onUpdatePlayer: update }));
  fireEvent.click(screen.getByText('expand'));
  fireEvent.click(screen.getAllByText('Excluir Liga')[0]);
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  const raw = update.mock.calls[0][0];
  expect(raw.statsLeagues).toEqual([leagueStats({ games: 1, goals: 4 }, 'Copa')]);
  expect(raw).not.toHaveProperty('manualStatsLeagues');
  const displayed = augmentSeasonWithMatchStats({ ...input, players: [raw] }, 'Clube').players[0];
  expect(displayed.statsLeagues.find(l => l.leagueName === 'Liga')!.stats).toMatchObject({ games: 1, goals: 2 });
});
