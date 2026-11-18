// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  NavigationSessionStore,
  ClickAnchorSnapshot,
} from "../common/services/NavigationSessionStore";
import {
  classifyMacroRoute,
  useMacroNavigationSession,
} from "../common/hooks/useMacroNavigationSession";

describe("Frente 3: Navegação, Tabs, Reset e Restauração de Âncora (Padrão FC Barcelona)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe("classifyMacroRoute", () => {
    it("deve classificar rota de Temporada do FC Barcelona como 'macro'", () => {
      const res = classifyMacroRoute("/Career/c_barca/Season/s_2024_2025");
      expect(res.type).toBe("macro");
      expect(res.macroKey).toBe("season:c_barca:s_2024_2025");
    });

    it("deve classificar rota Geral do FC Barcelona como 'macro'", () => {
      const res = classifyMacroRoute("/Career/c_barca/Geral");
      expect(res.type).toBe("macro");
      expect(res.macroKey).toBe("geral:c_barca");
    });

    it("deve classificar rota de CareerGroup do FC Barcelona como 'macro'", () => {
      const res = classifyMacroRoute("/CareerGroup/grp_barca/Geral");
      expect(res.type).toBe("macro");
      expect(res.macroKey).toBe("group:grp_barca");
    });

    it("deve classificar rota filha de Match como 'child' preservando o macroKey da temporada", () => {
      const res = classifyMacroRoute(
        "/Career/c_barca/Season/s_2024_2025/Match/match_vs_sevilla",
      );
      expect(res.type).toBe("child");
      expect(res.macroKey).toBe("season:c_barca:s_2024_2025");
    });

    it("deve classificar rotas externas (/Careers ou /) como 'outside'", () => {
      expect(classifyMacroRoute("/Careers").type).toBe("outside");
      expect(classifyMacroRoute("/").type).toBe("outside");
      expect(classifyMacroRoute("/settings").type).toBe("outside");
    });
  });

  describe("NavigationSessionStore - Isolamento e Persistência", () => {
    it("deve retornar 0 (Elenco) como padrão para qualquer tab não configurada", () => {
      expect(NavigationSessionStore.getTab("season_barca_tab")).toBe(0);
      expect(NavigationSessionStore.getTab("geral_barca_tab")).toBe(0);
      expect(NavigationSessionStore.getTab("group_barca_tab")).toBe(0);
    });

    it("deve salvar e recuperar a tab ativa corretamente", () => {
      NavigationSessionStore.setTab("season_barca_tab", 2); // Finanças
      expect(NavigationSessionStore.getTab("season_barca_tab")).toBe(2);

      NavigationSessionStore.setTab("season_barca_tab", 3); // Resultados
      expect(NavigationSessionStore.getTab("season_barca_tab")).toBe(3);
    });

    it("deve gerenciar a tab de Cláusulas associada ao macro contexto", () => {
      NavigationSessionStore.setMacroContext("season:c_barca:s_2024_2025");
      expect(NavigationSessionStore.getClausesTab("renewals")).toBe("renewals");

      NavigationSessionStore.setClausesTab("arrivals");
      expect(NavigationSessionStore.getClausesTab("renewals")).toBe("arrivals");
    });

    it("deve gerenciar a tab individualizada por partida (matchesId)", () => {
      NavigationSessionStore.setMacroContext("season:c_barca:s_2024_2025");
      const match1Id = "match_barca_vs_valencia";
      const match2Id = "match_barca_vs_atletico";

      NavigationSessionStore.setMatchTab(match1Id, 1); // Estatísticas
      NavigationSessionStore.setMatchTab(match2Id, 0); // Resumo

      expect(NavigationSessionStore.getMatchTab(match1Id)).toBe(1);
      expect(NavigationSessionStore.getMatchTab(match2Id)).toBe(0);
    });

    it("saveClickAnchor e consumeClickAnchor devem funcionar de forma one-shot", () => {
      NavigationSessionStore.setMacroContext("season:c_barca:s_2024_2025");
      const snapshot: ClickAnchorSnapshot = {
        scrollY: 450,
        anchorSelector: "#match-card-vs-girona",
        viewportOffsetTop: 120,
        updatedAt: Date.now(),
      };

      NavigationSessionStore.saveClickAnchor("results_view", snapshot);

      const consumed = NavigationSessionStore.consumeClickAnchor("results_view");
      expect(consumed).not.toBeNull();
      expect(consumed?.scrollY).toBe(450);
      expect(consumed?.anchorSelector).toBe("#match-card-vs-girona");

      // Segundo consumo deve ser nulo pois foi consumido (one-shot)
      const secondConsume = NavigationSessionStore.consumeClickAnchor("results_view");
      expect(secondConsume).toBeNull();
    });

    it("clearAll deve limpar todas as sessões, tabs e âncoras salvas", () => {
      NavigationSessionStore.setMacroContext("season:c_barca:s_2024_2025");
      NavigationSessionStore.setTab("season-tab-c_barca", 2);
      NavigationSessionStore.setClausesTab("exit");
      NavigationSessionStore.setMatchTab("m_1", 1);
      NavigationSessionStore.saveClickAnchor("results_view", {
        scrollY: 300,
        updatedAt: Date.now(),
      });

      NavigationSessionStore.clearAll();

      expect(NavigationSessionStore.getMacroContext()).toBeNull();
      expect(NavigationSessionStore.getTab("season-tab-c_barca")).toBe(0);
      expect(NavigationSessionStore.getClausesTab("renewals")).toBe("renewals");
      expect(NavigationSessionStore.getMatchTab("m_1")).toBe(0);
      expect(NavigationSessionStore.consumeClickAnchor("results_view")).toBeNull();
    });
  });

  describe("useMacroNavigationSession Hook Lifecycle", () => {
    it("deve limpar tudo ao navegar de dentro da temporada para uma rota externa", () => {
      NavigationSessionStore.setMacroContext("season:c_barca:s_2024_2025");
      NavigationSessionStore.setTab("season_tab", 3);

      const { unmount } = renderHook(() => useMacroNavigationSession(), {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={["/Careers"]}>
            {children}
          </MemoryRouter>
        ),
      });

      expect(NavigationSessionStore.getMacroContext()).toBeNull();
      expect(NavigationSessionStore.getTab("season_tab")).toBe(0);
      unmount();
    });

    it("deve inicializar macroContext ao entrar em nova temporada do FC Barcelona", () => {
      const { unmount } = renderHook(() => useMacroNavigationSession(), {
        wrapper: ({ children }) => (
          <MemoryRouter
            initialEntries={["/Career/c_barca/Season/s_2024_2025"]}
          >
            {children}
          </MemoryRouter>
        ),
      });

      expect(NavigationSessionStore.getMacroContext()).toBe(
        "season:c_barca:s_2024_2025",
      );
      unmount();
    });
  });
});

