// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useAddSeasons } from '../pages/AddSeasons/hooks/useAddSeasons';
import { ServiceSeasons } from '../common/services/ServiceSeasons';
import { useCareers } from '../common/hooks/Career/UseCareer';
import { career, deepFreeze, season } from './factories/domain';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate, useParams: () => ({ careerId: 'c1' }) }));
vi.mock('../common/services/ServiceSeasons', () => ({ ServiceSeasons: { addSeason: vi.fn() } }));
vi.mock('../common/hooks/Career/UseCareer', () => ({ useCareers: vi.fn() }));
vi.mock('../common/hooks/Colors/UseClubColors', () => ({ useClubColors: () => ({ clubColor: '#fff', darkClubColor: '#000' }) }));
vi.mock('../common/services/ColorsService', () => ({ ColorsService: { getColorSaved: () => '#fff' } }));

it('[B07] erro de criação informa falha, libera loading e preserva estado local sem navegar', async () => {
  const original = deepFreeze(career({ clubData: [season()] }));
  vi.mocked(useCareers).mockReturnValue({ careers: [original], loading: false });
  let reject!: (reason: Error) => void;
  vi.mocked(ServiceSeasons.addSeason).mockImplementation(() => new Promise<void>((_, fail) => { reject = fail; }));
  const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { result } = renderHook(useAddSeasons);
  let pending!: Promise<void>;
  act(() => { pending = result.current.handleAddSeason(original); });
  expect(result.current.loading).toBe(true);
  await act(async () => { reject(new Error('commit-failed')); await pending; });
  expect(alert).toHaveBeenCalledExactlyOnceWith('Ocorreu um erro ao adicionar a temporada.');
  expect(error).toHaveBeenCalledWith('Erro ao adicionar temporada:', expect.objectContaining({ message: 'commit-failed' }));
  expect(result.current.loading).toBe(false);
  expect(result.current.career).toBe(original);
  expect(result.current.career!.clubData).toHaveLength(1);
  expect(navigate).not.toHaveBeenCalled();
});
