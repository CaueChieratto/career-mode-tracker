// @vitest-environment jsdom
/**
 * [7A] useCareers — lifecycle dos listeners Firestore
 *
 * Garante que cada montagem do hook cria exatamente uma inscrição Firestore e
 * que a inscrição é sempre cancelada quando o hook desmonta. Esse é o contrato
 * mínimo para prevenir o acúmulo de listeners observado no baseline (Etapa 5):
 *
 *   Ciclos Careers → Group → Careers:
 *     listeners: 1 → 2 → 3 → 4  (baseline — leak)
 *     listeners: 1 → 1 → 1 → 1  (esperado após a correção)
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";

// ---------------------------------------------------------------------------
// Mocks de módulo — devem vir antes de qualquer import dos módulos mocados
// ---------------------------------------------------------------------------

// firebase/auth já é resolvido para src/test/mocks/auth.ts pelo plugin Vite.
// Importamos o mock diretamente para configurar o comportamento por teste.
import { onAuthStateChanged } from "firebase/auth";

// ServiceCareer.getAll é a única dependência de dados do hook.
vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: { getAll: vi.fn() },
}));
import { ServiceCareer } from "../common/services/ServiceCareer";

// Importar o hook DEPOIS dos mocks para que os módulos já estejam interceptados.
import { useCareers } from "../common/hooks/Career/UseCareer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dispara o callback de auth com um usuário logado ou não. */
type AuthCallback = (user: User | null) => void;
let capturedAuthCallback: AuthCallback | null = null;

function simulateLoggedIn(): void {
  act(() => {
    capturedAuthCallback?.({ uid: "test-user" } as unknown as User);
  });
}

function simulateLoggedOut(): void {
  act(() => {
    capturedAuthCallback?.(null);
  });
}

/** Cria um unsubscribe spy para rastrear cancelamentos. */
function makeUnsub(): ReturnType<typeof vi.fn> {
  return vi.fn();
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  capturedAuthCallback = null;

  vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
    capturedAuthCallback = callback as AuthCallback;
    // Retorna o unsubscribe do listener de auth (não rastreado neste arquivo).
    return vi.fn();
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("[7A] useCareers — listener lifecycle", () => {
  it("cria exatamente um listener Firestore ao montar com usuário logado", () => {
    const unsub = makeUnsub();
    vi.mocked(ServiceCareer.getAll).mockReturnValue(unsub);

    renderHook(() => useCareers());
    simulateLoggedIn();

    expect(ServiceCareer.getAll).toHaveBeenCalledTimes(1);
    expect(unsub).not.toHaveBeenCalled(); // ainda ativo
  });

  it("cancela o listener Firestore ao desmontar", () => {
    const unsub = makeUnsub();
    vi.mocked(ServiceCareer.getAll).mockReturnValue(unsub);

    const { unmount } = renderHook(() => useCareers());
    simulateLoggedIn();

    expect(unsub).not.toHaveBeenCalled();
    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("não acumula listeners em ciclos de montagem/desmontagem (simulação da jornada SPA)", () => {
    // Três ciclos: cada montagem deve criar 1 listener e desmontagem deve cancelá-lo.
    for (let cycle = 1; cycle <= 3; cycle++) {
      const unsub = makeUnsub();
      vi.mocked(ServiceCareer.getAll).mockReturnValue(unsub);

      const { unmount } = renderHook(() => useCareers());
      simulateLoggedIn();

      expect(ServiceCareer.getAll).toHaveBeenCalledTimes(cycle);
      unmount();
      // O listener deste ciclo deve ter sido cancelado.
      expect(unsub).toHaveBeenCalledTimes(1);
    }
  });

  it("cancela o listener anterior quando o estado de auth muda para deslogado", () => {
    const unsub = makeUnsub();
    vi.mocked(ServiceCareer.getAll).mockReturnValue(unsub);

    renderHook(() => useCareers());
    simulateLoggedIn();

    expect(unsub).not.toHaveBeenCalled();

    // Usuário desloga — o listener deve ser cancelado antes de limpar a lista.
    simulateLoggedOut();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("cancela o listener anterior e cria um novo ao reautenticar sem remontar", () => {
    const unsub1 = makeUnsub();
    const unsub2 = makeUnsub();
    vi.mocked(ServiceCareer.getAll)
      .mockReturnValueOnce(unsub1)
      .mockReturnValueOnce(unsub2);

    renderHook(() => useCareers());
    simulateLoggedIn(); // cria unsub1
    simulateLoggedOut(); // cancela unsub1
    simulateLoggedIn(); // cria unsub2

    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(unsub2).not.toHaveBeenCalled(); // novo listener ainda ativo
    expect(ServiceCareer.getAll).toHaveBeenCalledTimes(2);
  });

  it("não cria listener Firestore quando não há usuário logado", () => {
    renderHook(() => useCareers());
    simulateLoggedOut();

    expect(ServiceCareer.getAll).not.toHaveBeenCalled();
  });

  it("retorna careers vazias e loading=false quando não há usuário", () => {
    const { result } = renderHook(() => useCareers());
    simulateLoggedOut();

    expect(result.current.careers).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("retorna careers atualizadas pelo callback do onSnapshot", () => {
    const fakeCareer = { id: "c1", name: "Career 1" };
    let snapshotCallback: ((careers: unknown[]) => void) | undefined;

    vi.mocked(ServiceCareer.getAll).mockImplementation((cb) => {
      snapshotCallback = cb as (careers: unknown[]) => void;
      return makeUnsub();
    });

    const { result } = renderHook(() => useCareers());
    simulateLoggedIn();

    act(() => {
      snapshotCallback?.([fakeCareer]);
    });

    expect(result.current.careers).toEqual([fakeCareer]);
    expect(result.current.loading).toBe(false);
  });
});
