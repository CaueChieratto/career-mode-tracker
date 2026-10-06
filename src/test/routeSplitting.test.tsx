// @vitest-environment jsdom
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import { describe, expect, it, afterEach, vi } from "vitest";
import React, { lazy, Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Load from "../components/Load";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { career } from "./factories/domain";

vi.mock("../common/helpers/Deleters", () => ({
  deleteCareer: vi.fn(),
}));

vi.mock(
  "../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/API/TheSportsDBTeam",
  () => ({
    TheSportsDBTeam: {
      getTeamsLeague: vi.fn().mockResolvedValue([]),
    },
  }),
);

describe("[7E2] Route Code Splitting", () => {
  afterEach(async () => {
    await act(async () => {});
    cleanup();
  });

  describe(
    "Resolução de exports default e named para rotas lazy",
    { timeout: 30000 },
    () => {
      it("resolve Tutorial como export default de função/componente", async () => {
        const mod = await import("../pages/Tutorial");
        expect(typeof mod.default).toBe("function");
      });

      it("resolve Match como named export de função/componente", async () => {
        const mod = await import("../pages/Match");
        expect(typeof mod.Match).toBe("function");
      });

      it("resolve Academy como named export de função/componente", async () => {
        const mod = await import("../pages/Academy");
        expect(typeof mod.Academy).toBe("function");
      });

      it("resolve ComparePlayers como named export de função/componente", async () => {
        const mod = await import("../pages/ComparePlayers");
        expect(typeof mod.ComparePlayers).toBe("function");
      });

      it("resolve GroupCareerPage como named export de função/componente", async () => {
        const mod = await import("../pages/GroupCareerPage");
        expect(typeof mod.GroupCareerPage).toBe("function");
      });
    },
  );

  describe("Renderização sob Suspense e navegação", () => {
    it("renderiza Tutorial sob Suspense após resolução dinâmica do default export", async () => {
      const LazyTutorial = lazy(() => import("../pages/Tutorial"));

      render(
        <MemoryRouter initialEntries={["/tutorial"]}>
          <Suspense fallback={<Load />}>
            <Routes>
              <Route path="/tutorial" element={<LazyTutorial />} />
            </Routes>
          </Suspense>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Temporada")).toBeDefined();
      });
    });

    it("renderiza Academy sob Suspense resolvendo named export", async () => {
      const LazyAcademy = lazy(() =>
        import("../pages/Academy").then((m) => ({ default: m.Academy })),
      );

      const mockCareer = career({
        id: "c1",
        clubName: "Clube Teste",
        academy: {
          name: "Base do Clube",
          tournament: "Copa",
          nickname: "Base",
        },
      });

      render(
        <ThemeProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/Career/c1/Academy",
                state: { career: mockCareer, seasonId: "s1" },
              },
            ]}
          >
            <Suspense fallback={<Load />}>
              <Routes>
                <Route
                  path="/Career/:careerId/Academy"
                  element={<LazyAcademy />}
                />
              </Routes>
            </Suspense>
          </MemoryRouter>
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Clube Teste")).toBeDefined();
      });
    });

    it("exibe o componente Load como fallback e transiciona para o componente resolvido", async () => {
      let resolveComponent: (value: { default: React.FC }) => void;
      const deferredImport = new Promise<{ default: React.FC }>((resolve) => {
        resolveComponent = resolve;
      });

      const LazyComponent = lazy(() => deferredImport);

      const { container } = render(
        <MemoryRouter initialEntries={["/async-route"]}>
          <Suspense fallback={<Load />}>
            <Routes>
              <Route path="/async-route" element={<LazyComponent />} />
            </Routes>
          </Suspense>
        </MemoryRouter>,
      );

      // Enquanto a promise não resolveu, o fallback <Load /> exibe o spinner svg
      expect(container.querySelector("svg")).not.toBeNull();

      // Resolve a importação dinâmica
      await act(async () => {
        resolveComponent!({
          default: () => (
            <div data-testid="route-content">Página Carregada com Sucesso</div>
          ),
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("route-content")).toBeDefined();
      });
    });
  });
});
