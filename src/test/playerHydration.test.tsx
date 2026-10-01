// @vitest-environment jsdom
/**
 * [7D] Player Hydration — Prevenção de subscrição duplicada ao abrir a página Player
 *
 * Garante que:
 * 1. A montagem da página Player (usePlayerPageData) dispara exatamente UMA
 *    inscrição/busca no ServiceCareer.getAll, eliminando o segundo listener
 *    identificado no diagnóstico da Etapa 7D.
 * 2. Todos os dados dependentes (career, season, player, groupCareers, resumo de carreira)
 *    continuam sendo devidamente providos e acessíveis.
 * 3. A desmontagem do hook cancela exatamente o listener registrado.
 */
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: { getAll: vi.fn() },
}));
import { ServiceCareer } from "../common/services/ServiceCareer";
import { usePlayerPageData } from "../pages/Players/hooks/usePlayerPageData";
import {
  career as careerFactory,
  player as playerFactory,
  season as seasonFactory,
} from "./factories/domain";

type AuthCallback = (user: User | null) => void;
let capturedAuthCallback: AuthCallback | null = null;

function simulateLoggedIn(): void {
  act(() => {
    capturedAuthCallback?.({ uid: "test-user" } as unknown as User);
  });
}

const createWrapper = (route: string) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="/Career/:careerId/Season/:seasonId/Player/:playerId"
            element={<>{children}</>}
          />
          <Route
            path="/Career/:careerId/Geral/Player/:playerId"
            element={<>{children}</>}
          />
        </Routes>
      </MemoryRouter>
    );
  };
};

beforeEach(() => {
  capturedAuthCallback = null;
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
    capturedAuthCallback = callback as AuthCallback;
    return vi.fn();
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("[7D] Player Hydration — usePlayerPageData", () => {
  it("cria exatamente UMA subscrição a ServiceCareer.getAll ao montar a tela de Player", () => {
    const unsub = vi.fn();
    let snapshotCallback: ((careers: unknown[]) => void) | undefined;

    vi.mocked(ServiceCareer.getAll).mockImplementation((cb) => {
      snapshotCallback = cb as (careers: unknown[]) => void;
      return unsub;
    });

    const testPlayer = playerFactory({ id: "p1", name: "Gabriel Gol" });
    const testSeason = seasonFactory({
      id: "s1",
      seasonNumber: 1,
      players: [testPlayer],
    });
    const testCareer = careerFactory({
      id: "c1",
      clubName: "Flamengo",
      clubData: [testSeason],
    });

    const { result, unmount } = renderHook(() => usePlayerPageData(), {
      wrapper: createWrapper("/Career/c1/Season/s1/Player/p1"),
    });

    simulateLoggedIn();

    // Comprova que NÃO há segunda chamada a ServiceCareer.getAll
    expect(ServiceCareer.getAll).toHaveBeenCalledTimes(1);

    // Emite os dados através do snapshot do listener único
    act(() => {
      snapshotCallback?.([testCareer]);
    });

    // Garante que todos os dados continuam chegando intactos à página de Player
    expect(result.current.career?.id).toBe("c1");
    expect(result.current.career?.clubName).toBe("Flamengo");
    expect(result.current.actualSeason?.id).toBe("s1");
    expect(result.current.player?.id).toBe("p1");
    expect(result.current.player?.name).toBe("Gabriel Gol");
    expect(result.current.spoofedCareer).toBeDefined();
    expect(result.current.totalSeasons).toBeDefined();
    expect(result.current.totalClubs).toBeDefined();

    // Desmontagem deve cancelar exatamente 1 listener
    expect(unsub).not.toHaveBeenCalled();
    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("funciona normalmente na rota Geral (/Career/:careerId/Geral/Player/:playerId)", () => {
    const unsub = vi.fn();
    let snapshotCallback: ((careers: unknown[]) => void) | undefined;

    vi.mocked(ServiceCareer.getAll).mockImplementation((cb) => {
      snapshotCallback = cb as (careers: unknown[]) => void;
      return unsub;
    });

    const testPlayer = playerFactory({ id: "p1", name: "Gabriel Gol" });
    const testSeason = seasonFactory({
      id: "s1",
      seasonNumber: 1,
      players: [testPlayer],
    });
    const testCareer = careerFactory({
      id: "c1",
      clubName: "Flamengo",
      clubData: [testSeason],
    });

    const { result } = renderHook(() => usePlayerPageData(), {
      wrapper: createWrapper("/Career/c1/Geral/Player/p1"),
    });

    simulateLoggedIn();

    expect(ServiceCareer.getAll).toHaveBeenCalledTimes(1);

    act(() => {
      snapshotCallback?.([testCareer]);
    });

    expect(result.current.isNotSeason).toBe(true);
    expect(result.current.career?.id).toBe("c1");
    expect(result.current.player?.id).toBe("p1");
  });
});
