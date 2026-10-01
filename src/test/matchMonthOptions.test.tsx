// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AllMatchesTab } from '../layout/SectionView/features/ClubTabs/AllMatchesTab';
import { MONTH_OPTIONS, MONTH_TO_NUM } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/constants/MONTH_OPTIONS';
import { useMatchActions } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/hooks/useMatchActions';
import { useAddMatchesContext } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/contexts/context';
import { ServiceMatches } from '../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches';
import { getSeasonName } from '../common/utils/GetSeasonName';
import { career, deepFreeze, match, season } from './factories/domain';
import type { Match } from '../common/interfaces/Match';

const route = vi.hoisted(() => ({ pathname: '/Career/c1/Season/s1' }));
vi.mock('react-router-dom', () => ({ useLocation: () => route }));
vi.mock('../components/ContainerClubContent', () => ({
  ContainerClubContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../components/NoStatsMessage', () => ({ default: () => <div>Sem partidas</div> }));
vi.mock('../layout/SectionView/features/ClubTabs/AllMatchesTab/components/MatchCard', () => ({
  MatchCard: ({ match: data }: { match: Match }) => <div data-testid="match">{data.date}</div>,
}));
// Exercise the real tab state/filter using the select props, without theme providers.
vi.mock('../components/ButtonsSwitch', () => ({
  ButtonsSwitch: ({ selectOptions, selectValue, onSelectChange }: {
    selectOptions: string[]; selectValue: string; onSelectChange: (value: string) => void;
  }) => (
    <select aria-label="Meses" value={selectValue} onChange={event => onSelectChange(event.target.value)}>
      {selectOptions.map(value => <option key={value}>{value}</option>)}
    </select>
  ),
}));
vi.mock('../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/contexts/context', () => ({
  useAddMatchesContext: vi.fn(),
}));
// No Firebase or external team API is executed by these tests.
vi.mock('../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches', () => ({
  ServiceMatches: { addMatchToSeason: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/helpers/buildTeamData', () => ({
  buildTeamData: vi.fn(),
}));

const januaryToDecember = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const julyToJune = [...januaryToDecember.slice(6), ...januaryToDecember.slice(0, 6)];
const options = () => Array.from(screen.getByRole<HTMLSelectElement>('combobox').options, option => option.value);

beforeEach(() => {
  localStorage.clear();
  route.pathname = '/Career/c1/Season/s1';
});
afterEach(cleanup);

describe('ordem dos meses conforme o calendario existente', () => {
  it.each([
    ['Inglaterra', julyToJune, '24/25'],
    ['Brasil', januaryToDecember, '2024'],
    ['Pais desconhecido', januaryToDecember, '2024'],
    ['', januaryToDecember, '2024'],
  ])('%s conserva Tudo e doze meses unicos na ordem da temporada', (nation, months, name) => {
    const data = career({ nation: nation as string });
    render(<AllMatchesTab career={data} season={season()} />);
    expect(options()).toEqual(['Tudo', ...months]);
    expect(new Set(options().slice(1)).size).toBe(12);
    expect(options()).toHaveLength(13);
    expect(getSeasonName(1, data.createdAt, data.nation)).toBe(name);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('Tudo');
  });

  it('preserva labels, constante original e MONTH_TO_NUM', () => {
    expect(MONTH_OPTIONS).toEqual(['Tudo', ...julyToJune]);
    expect(MONTH_TO_NUM).toEqual({ Janeiro: 1, Fevereiro: 2, Março: 3, Abril: 4,
      Maio: 5, Junho: 6, Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12 });
  });

  it.each(['Inglaterra', 'Brasil'])('restaura selecao, filtra e persiste por label em %s', nation => {
    const data = deepFreeze(season({ matches: [
      match({ matchesId: 'january', date: '15/01/25' }),
      match({ matchesId: 'july', date: '15/07/24' }),
    ] }));
    localStorage.setItem('matchSelectedMonth_s1', 'Janeiro');
    const props = { career: career({ nation }), season: data };
    const view = render(<AllMatchesTab {...props} />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('Janeiro');
    expect(screen.getAllByTestId('match').map(node => node.textContent)).toEqual(['15/01/25']);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Julho' } });
    expect(screen.getAllByTestId('match').map(node => node.textContent)).toEqual(['15/07/24']);
    expect(localStorage.getItem('matchSelectedMonth_s1')).toBe('Julho');
    view.unmount();
    render(<AllMatchesTab {...props} />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('Julho');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Tudo' } });
    expect(screen.getAllByTestId('match')).toHaveLength(2);
    expect(data.matches?.map(item => item.date)).toEqual(['15/01/25', '15/07/24']);
  });

  it('atualiza somente a ordem ao mudar nation, mantendo selecao e localStorage', () => {
    localStorage.setItem('matchSelectedMonth_s1', 'Março');
    const data = season();
    const view = render(<AllMatchesTab career={career({ nation: 'Inglaterra' })} season={data} />);
    expect(options()).toEqual(['Tudo', ...julyToJune]);
    view.rerender(<AllMatchesTab career={career({ nation: 'Brasil' })} season={data} />);
    expect(options()).toEqual(['Tudo', ...januaryToDecember]);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('Março');
    expect(localStorage.getItem('matchSelectedMonth_s1')).toBe('Março');
  });

  it('preserva a chave de mes da visao Geral', () => {
    route.pathname = '/Career/c1/Geral';
    localStorage.setItem('matchSelectedMonth_geral', 'Dezembro');
    render(<AllMatchesTab career={career()} season={season()} />);
    expect(options()).toEqual(['Tudo', ...januaryToDecember]);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('Dezembro');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Janeiro' } });
    expect(localStorage.getItem('matchSelectedMonth_geral')).toBe('Janeiro');
    expect(localStorage.getItem('matchSelectedMonth_s1')).toBeNull();
  });

  it.each(['Inglaterra', 'Brasil', 'Pais desconhecido'])('cadastro por dia usa cada mes selecionado em %s', async nation => {
    const data = season({ teams: [{ name: 'Rival', badge: 'rival.png' }] });
    const club = career({ nation });
    const onClose = vi.fn();
    vi.mocked(useAddMatchesContext).mockReturnValue({
      career: club, season: data, formValues: { date: '15', league: 'Liga', opponentTeam: 'Rival' },
      booleanValues: { isHomeMatch: true }, onClose,
    } as ReturnType<typeof useAddMatchesContext>);
    render(<AllMatchesTab career={club} season={data} />);
    const { result } = renderHook(() => useMatchActions());
    for (const [index, label] of januaryToDecember.entries()) {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: label } });
      await act(async () => { await result.current.saveMatch(); });
      const year = nation === 'Inglaterra' && index < 6 ? '25' : '24';
      expect(ServiceMatches.addMatchToSeason).toHaveBeenLastCalledWith('c1', 's1', expect.objectContaining({
        date: `15/${String(index + 1).padStart(2, '0')}/${year}`,
      }));
      expect(localStorage.getItem('matchSelectedMonth_s1')).toBe(label);
    }
    expect(onClose).toHaveBeenCalledTimes(12);
  });
});
