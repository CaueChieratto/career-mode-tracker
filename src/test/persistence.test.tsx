// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLineupPersistence } from '../pages/Match/components/LineupTab/hooks/useLineupPersistence';
import { ServiceLineup } from '../pages/Match/services/ServiceLineup';
import { useMatchTabAction } from '../pages/Match/hooks/useMatchTabAction';
import { lineup, match, stat } from './factories/domain';

vi.mock('react-router-dom', () => ({ useParams: () => ({ careerId: 'c1', seasonId: 's1' }) }));
vi.mock('../pages/Match/services/ServiceLineup', () => ({ ServiceLineup: { saveLineupToMatch: vi.fn() } }));
beforeEach(() => {
  vi.mocked(ServiceLineup.saveLineupToMatch).mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('alert', vi.fn());
});
afterEach(cleanup);

describe('persistência da escalação', () => {
  it('ambiente DOM também bloqueia XMLHttpRequest', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.invalid');
    expect(() => xhr.send()).toThrow('TEST_NETWORK_BLOCKED');
  });
  it('sucesso publica escalação e estatísticas filtradas após salvar', async () => {
    const onSaved = vi.fn();
    let save: (() => void | Promise<void>) | undefined;
    const l = lineup();
    const { result } = renderHook(() => useLineupPersistence({ match: match({ playerStats: [stat(), stat({ playerId: 'removed' })] }), buildSavedLineup: () => l, onRegisterSave: handler => { save = handler; }, onSaved }));
    await act(async () => { await save!(); });
    expect(ServiceLineup.saveLineupToMatch).toHaveBeenCalledWith('c1', 's1', 'm1', l, [stat()], ['removed']);
    expect(onSaved).toHaveBeenCalledWith({ lineup: l, playerStats: [stat()] });
    expect(result.current.getSavedLineup()).toBe(l);
  });
  it('[B11] erro preserva rascunho e referência salva; tentativa seguinte funciona', async () => {
    vi.mocked(ServiceLineup.saveLineupToMatch).mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSaved = vi.fn();
    const openScreen = vi.fn();
    const previous = lineup({ formation: '4-3-3' });
    const draft = lineup();
    const before = structuredClone(draft);
    const { result } = renderHook(() => {
      const action = useMatchTabAction({ openScreen });
      const persistence = useLineupPersistence({ match: match({ lineup: previous }), buildSavedLineup: () => draft, onRegisterSave: action.registerSave, onSaved });
      return { ...action, ...persistence };
    });
    await act(async () => { await result.current.handleActionClick(); });
    expect(alert).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(openScreen).not.toHaveBeenCalled();
    expect(result.current.isActionLoading).toBe(false);
    expect(result.current.getSavedLineup()).toBe(previous);
    expect(draft).toEqual(before);
    await act(async () => { await result.current.handleActionClick(); });
    expect(ServiceLineup.saveLineupToMatch).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalledExactlyOnceWith({ lineup: draft, playerStats: [] });
    expect(result.current.getSavedLineup()).toBe(draft);
  });
  it('[B11] primeira gravação rejeitada não cria referência salva', async () => {
    vi.mocked(ServiceLineup.saveLineupToMatch).mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSaved = vi.fn();
    let save: (() => void | Promise<void>) | undefined;
    const { result } = renderHook(() => useLineupPersistence({ match: match(), buildSavedLineup: () => lineup(), onRegisterSave: handler => { save = handler; }, onSaved }));
    await act(async () => { await save!(); });
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.getSavedLineup()).toBeUndefined();
  });
});
