// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  cleanup,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import SectionView from "../layout/SectionView";
import type { TabConfig } from "../layout/SectionView/config/seasonTabsConfig";
import { career, season, player as playerFactory } from "./factories/domain";
import { ServicePlayers } from "../common/services/ServicePlayers";
import { useGroupAggregatedPlayers } from "../common/hooks/Players/useGroupAggregatedPlayers";
import { PlayerGroupStatsProvider } from "../pages/Players/contexts/PlayerGroupStatsContext";
import type { Career } from "../common/interfaces/Career";

import { ThemeProvider } from "../contexts/LightThemeContext";

vi.stubEnv("VITE_FOOTBALL_DATA_API_TOKEN", "test-token");

vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: {
    updateCareer: vi.fn(),
  },
}));

vi.mock("../common/helpers/Deleters", () => ({}));

vi.mock("../layout/SectionView/components/ActiveSectionScreen", () => ({
  ActiveSectionScreen: () => null,
}));

vi.mock("../layout/SectionView/components/SectionModal", () => ({
  SectionModal: () => null,
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      search: "?fromGroup=true&groupId=g1",
      pathname: "/Career/c1/Geral/Player/p1",
    }),
    useParams: () => ({
      careerId: "c1",
      playerId: "p1",
    }),
  };
});

describe("Stage 7G3 — Shared On-Demand Group Stats", () => {
  const mockPlayer = playerFactory({ id: "p1", name: "Jogador Teste" });
  const mockAggregatedPlayers = [
    playerFactory({ id: "p1", name: "Jogador Teste", overall: 85 }),
    playerFactory({ id: "p2", name: "Jogador Secundario", overall: 80 }),
  ];

  const testSeason = season({ id: "s1" });
  const groupCareer = career({
    id: "c1",
    groupId: "g1",
    createdAt: new Date("2024-07-01T00:00:00Z"),
    colorsTeams: ["#ffffff", "#000000"],
    clubData: [testSeason],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Consumer tab mock components that consume useGroupAggregatedPlayers
  type TabComponentProps = Parameters<TabConfig["component"]>[0];
  const ConsumerTab1: React.FC<
    Partial<TabComponentProps> & { career: Career }
  > = ({ career: c }) => {
    const { groupPlayers, isLoadingGroup } = useGroupAggregatedPlayers(c, true);
    return (
      <div data-testid="consumer-tab-1">
        Tab 1: {isLoadingGroup ? "loading" : `count=${groupPlayers.length}`}
      </div>
    );
  };

  const ConsumerTab2: React.FC<
    Partial<TabComponentProps> & { career: Career }
  > = ({ career: c }) => {
    const { groupPlayers, isLoadingGroup } = useGroupAggregatedPlayers(c, true);
    return (
      <div data-testid="consumer-tab-2">
        Tab 2: {isLoadingGroup ? "loading" : `count=${groupPlayers.length}`}
      </div>
    );
  };

  const ConsumerTab3: React.FC<
    Partial<TabComponentProps> & { career: Career }
  > = ({ career: c }) => {
    const { groupPlayers, isLoadingGroup } = useGroupAggregatedPlayers(c, true);
    return (
      <div data-testid="consumer-tab-3">
        Tab 3: {isLoadingGroup ? "loading" : `count=${groupPlayers.length}`}
      </div>
    );
  };

  it("A) abertura inicial: 0 chamadas a getAggregatedGroupStats", () => {
    const getStatsSpy = vi
      .spyOn(ServicePlayers, "getAggregatedGroupStats")
      .mockResolvedValue(mockAggregatedPlayers);

    const tabsConfig: TabConfig[] = [
      {
        title: "Jogador",
        component: () => <div data-testid="info-tab">Info</div>,
      },
      { title: "Partidas", component: () => <div>Matches</div> },
      {
        title: "Temporadas",
        component: ConsumerTab1 as TabConfig["component"],
      },
      {
        title: "Estatísticas",
        component: ConsumerTab2 as TabConfig["component"],
      },
      { title: "Total", component: ConsumerTab3 as TabConfig["component"] },
    ];

    render(
      <ThemeProvider>
        <PlayerGroupStatsProvider career={groupCareer} isGeralPage={true}>
          <SectionView
            isPlayer
            notSeason
            career={groupCareer}
            season={testSeason}
            player={mockPlayer}
            tabsConfig={tabsConfig}
          />
        </PlayerGroupStatsProvider>
      </ThemeProvider>,
    );

    // Initial open renders Slide 0 (InfoPlayerTab)
    expect(screen.getByTestId("info-tab")).toBeDefined();
    // Consumers are not mounted due to lazy mount
    expect(screen.queryByTestId("consumer-tab-1")).toBeNull();
    expect(screen.queryByTestId("consumer-tab-2")).toBeNull();
    expect(screen.queryByTestId("consumer-tab-3")).toBeNull();

    // Zero calls to getAggregatedGroupStats
    expect(getStatsSpy).toHaveBeenCalledTimes(0);
  });

  it("B, C, D, E, F) fluxo sequencial de consumo: 1ª tab busca (1 chamada), 2ª e 3ª reutilizam (continua 1 chamada), revisitas não refazem consulta, todos recebem o mesmo resultado", async () => {
    const getStatsSpy = vi
      .spyOn(ServicePlayers, "getAggregatedGroupStats")
      .mockResolvedValue(mockAggregatedPlayers);

    const tabsConfig: TabConfig[] = [
      {
        title: "Jogador",
        component: () => <div data-testid="info-tab">Info</div>,
      },
      { title: "Partidas", component: () => <div>Matches</div> },
      {
        title: "Temporadas",
        component: ConsumerTab1 as TabConfig["component"],
      },
      {
        title: "Estatísticas",
        component: ConsumerTab2 as TabConfig["component"],
      },
      { title: "Total", component: ConsumerTab3 as TabConfig["component"] },
    ];

    render(
      <ThemeProvider>
        <PlayerGroupStatsProvider career={groupCareer} isGeralPage={true}>
          <SectionView
            isPlayer
            notSeason
            career={groupCareer}
            season={testSeason}
            player={mockPlayer}
            tabsConfig={tabsConfig}
          />
        </PlayerGroupStatsProvider>
      </ThemeProvider>,
    );

    expect(getStatsSpy).toHaveBeenCalledTimes(0);

    // B) Visitar a 1ª tab consumidora ("Temporadas" - index 2)
    await act(async () => {
      fireEvent.click(screen.getByText("Temporadas"));
    });

    // 1ª tab dispara exatamente 1 chamada
    expect(getStatsSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("consumer-tab-1").textContent).toContain(
      "count=2",
    );

    // C) Visitar a 2ª tab consumidora ("Estatísticas" - index 3)
    await act(async () => {
      fireEvent.click(screen.getByText("Estatísticas"));
    });

    // Continua exatamente 1 chamada total (0 novas chamadas)
    expect(getStatsSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("consumer-tab-2").textContent).toContain(
      "count=2",
    );

    // D) Visitar a 3ª tab consumidora ("Total" - index 4)
    await act(async () => {
      fireEvent.click(screen.getByText("Total"));
    });

    // Continua exatamente 1 chamada total
    expect(getStatsSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("consumer-tab-3").textContent).toContain(
      "count=2",
    );

    // E) Revisitar abas anteriores: "Temporadas" e "Estatísticas"
    await act(async () => {
      fireEvent.click(screen.getByText("Temporadas"));
    });
    expect(getStatsSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByText("Estatísticas"));
    });
    expect(getStatsSpy).toHaveBeenCalledTimes(1);

    // F) Todos os consumidores receberam o mesmo resultado (count=2)
    expect(screen.getByTestId("consumer-tab-1").textContent).toBe(
      "Tab 1: count=2",
    );
    expect(screen.getByTestId("consumer-tab-2").textContent).toBe(
      "Tab 2: count=2",
    );
    expect(screen.getByTestId("consumer-tab-3").textContent).toBe(
      "Tab 3: count=2",
    );
  });

  it("G) mudança de contexto/chave: não reutiliza resultado incorreto e busca novamente para o novo contexto", async () => {
    const getStatsSpy = vi
      .spyOn(ServicePlayers, "getAggregatedGroupStats")
      .mockImplementation(async (groupId) => {
        if (groupId === "g1") return mockAggregatedPlayers;
        if (groupId === "g2") {
          return [
            playerFactory({
              id: "p99",
              name: "Jogador de Outro Grupo",
              overall: 90,
            }),
          ];
        }
        return [];
      });

    const differentGroupCareer = career({
      id: "c2",
      groupId: "g2",
      createdAt: new Date("2024-08-01T00:00:00Z"),
      colorsTeams: ["#ffffff", "#000000"],
      clubData: [testSeason],
    });

    const { rerender } = render(
      <PlayerGroupStatsProvider career={groupCareer} isGeralPage={true}>
        <ConsumerTab1 career={groupCareer} />
      </PlayerGroupStatsProvider>,
    );

    // Aguarda resolução do primeiro grupo (g1)
    await act(async () => {});
    expect(getStatsSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("consumer-tab-1").textContent).toContain(
      "count=2",
    );

    // Mudança de contexto: alterar para carreira do grupo g2
    await act(async () => {
      rerender(
        <PlayerGroupStatsProvider
          career={differentGroupCareer}
          isGeralPage={true}
        >
          <ConsumerTab1 career={differentGroupCareer} />
        </PlayerGroupStatsProvider>,
      );
    });

    // Deve buscar novamente para a nova chave (g2)
    expect(getStatsSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("consumer-tab-1").textContent).toContain(
      "count=1",
    );
  });

  it("H) chamadas concorrentes: no máximo 1 operação equivalente em andamento quando múltiplos consumidores montam simultaneamente", async () => {
    let resolvePromise: (value: typeof mockAggregatedPlayers) => void;
    const delayedPromise = new Promise<typeof mockAggregatedPlayers>((res) => {
      resolvePromise = res;
    });

    const getStatsSpy = vi
      .spyOn(ServicePlayers, "getAggregatedGroupStats")
      .mockReturnValue(delayedPromise);

    render(
      <PlayerGroupStatsProvider career={groupCareer} isGeralPage={true}>
        <ConsumerTab1 career={groupCareer} />
        <ConsumerTab2 career={groupCareer} />
        <ConsumerTab3 career={groupCareer} />
      </PlayerGroupStatsProvider>,
    );

    // 3 consumidores montados simultaneamente enquanto a promise ainda está pendente
    expect(getStatsSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("consumer-tab-1").textContent).toContain(
      "loading",
    );
    expect(screen.getByTestId("consumer-tab-2").textContent).toContain(
      "loading",
    );
    expect(screen.getByTestId("consumer-tab-3").textContent).toContain(
      "loading",
    );

    // Resolve a única promise em voo
    await act(async () => {
      resolvePromise!(mockAggregatedPlayers);
    });

    // Continua exatamente 1 chamada
    expect(getStatsSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("consumer-tab-1").textContent).toContain(
      "count=2",
    );
    expect(screen.getByTestId("consumer-tab-2").textContent).toContain(
      "count=2",
    );
    expect(screen.getByTestId("consumer-tab-3").textContent).toContain(
      "count=2",
    );
  });

  it("I) erro não deixa cache/estado travado como sucesso e permite nova tentativa posterior", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldFail = true;

    const getStatsSpy = vi
      .spyOn(ServicePlayers, "getAggregatedGroupStats")
      .mockImplementation(async () => {
        if (shouldFail) {
          throw new Error("Erro de rede simulado");
        }
        return mockAggregatedPlayers;
      });

    const { rerender } = render(
      <PlayerGroupStatsProvider career={groupCareer} isGeralPage={true}>
        <ConsumerTab1 career={groupCareer} />
      </PlayerGroupStatsProvider>,
    );

    // Aguarda a falha
    await act(async () => {});
    expect(getStatsSpy).toHaveBeenCalledTimes(1);
    // Estado de erro não travou como sucesso (count é 0 e não loading)
    expect(screen.getByTestId("consumer-tab-1").textContent).toContain(
      "count=0",
    );

    // Nova tentativa após recuperação
    shouldFail = false;
    const sameGroupCareer = { ...groupCareer };

    await act(async () => {
      rerender(
        <PlayerGroupStatsProvider career={sameGroupCareer} isGeralPage={true}>
          <ConsumerTab2 career={sameGroupCareer} />
        </PlayerGroupStatsProvider>,
      );
    });

    // Permitiu nova tentativa sem ficar travado em sucesso com dados vazios
    expect(getStatsSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("consumer-tab-2").textContent).toContain(
      "count=2",
    );

    errorSpy.mockRestore();
  });
});
