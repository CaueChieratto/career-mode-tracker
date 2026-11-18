// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { useHeaderNavigation } from "../components/HeaderSeason/hooks/useHeaderNavigation";

const { navigateMock, mockBarcaCareer, mockBarcaPlayer, mockBarcaSeason, mockBarcaCareersList } = vi.hoisted(() => {
  const p = {
    id: "p-lamine",
    name: "Lamine Yamal",
    nation: "ESP",
    position: "ED",
    overall: 84,
    shirtNumber: "19",
    age: 17,
    contract: [],
    statsLeagues: [],
    manualStatsLeagues: [],
  };
  const s = {
    id: "s1",
    seasonNumber: 1,
    players: [p],
    matches: [],
    table: [],
    leagues: [],
  };
  const c = {
    id: "c1",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    nation: "Espanha",
    currency: "€",
    colorsTeams: ["#004d98", "#a50044"],
    createdAt: new Date("2024-07-01"),
    clubData: [s],
    trophies: [],
  };
  const careersList = [c];
  return {
    navigateMock: vi.fn(),
    mockBarcaCareer: c as unknown as import("../common/interfaces/Career").Career,
    mockBarcaPlayer: p as unknown as import("../common/interfaces/playersInfo/players").Players,
    mockBarcaSeason: s as unknown as import("../common/interfaces/club/clubData").ClubData,
    mockBarcaCareersList:
      careersList as unknown as import("../common/interfaces/Career").Career[],
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: {
    currentUser: { uid: "test-user-id" },
    onAuthStateChanged: vi.fn((cb) => {
      cb({ uid: "test-user-id" });
      return vi.fn();
    }),
  },
}));

vi.mock("../common/hooks/Career/UseCareer", () => ({
  useCareers: vi.fn((enabled = true) => ({
    careers: enabled ? mockBarcaCareersList : [],
    loading: false,
  })),
}));

vi.mock("../common/services/ColorsService", () => ({
  ColorsService: {
    getColorSaved: () => "#004d98",
  },
}));

vi.mock("../common/hooks/Colors/UseClubColors", () => ({
  useClubColors: () => ({ clubColor: "#004d98", darkClubColor: "#a50044" }),
}));

vi.mock("../common/services/ServiceSeasons", () => ({
  ServiceSeasons: {
    deleteSeason: vi.fn(),
    addSeason: vi.fn(),
  },
}));

vi.mock("../common/services/ServicePlayers", () => ({
  ServicePlayers: {
    getAggregatedGroupStats: vi.fn().mockResolvedValue([]),
    getPlayersBySeason: vi.fn().mockResolvedValue([mockBarcaPlayer]),
  },
}));

vi.mock("../common/services/ServiceMatches", () => ({
  ServiceMatches: {
    getMatchesBySeason: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../common/services/ServiceTable", () => ({
  ServiceTable: {
    getTableBySeason: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../common/services/ServiceFinance", () => ({
  ServiceFinance: {
    getReportBySeason: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../common/services/ServicePlayers/PlayersGroupService", () => ({
  PlayersGroupService: {
    getAggregatedGroupStats: vi.fn().mockResolvedValue([mockBarcaPlayer]),
    getGroupSeasonsData: vi.fn().mockResolvedValue([
      {
        clubName: "FC Barcelona",
        season: mockBarcaSeason,
        career: mockBarcaCareer,
      },
    ]),
  },
}));

vi.mock("../pages/GroupCareerPage/services/ServiceCareerGroup", () => ({
  ServiceCareerGroup: {
    getById: vi.fn().mockResolvedValue({
      id: "g1",
      managerName: "Hansi Flick Carreira",
      careers: [mockBarcaCareer],
      careerIds: ["c1"],
      createdAt: new Date("2024-07-01"),
    }),
  },
}));

import CareersPage from "../pages/CareersPage";
import Season from "../pages/Season";
import Geral from "../pages/Geral";
import { GroupCareerPage } from "../pages/GroupCareerPage";
import { ServiceCareerGroup } from "../pages/GroupCareerPage/services/ServiceCareerGroup";
import { PlayersGroupService } from "../common/services/ServicePlayers/PlayersGroupService";

describe("Navegação Controlada por Estado — Views AddSeasons e Players", () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    navigateMock.mockReset();
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.mocked(ServiceCareerGroup.getById).mockResolvedValue({
      id: "g1",
      managerName: "Hansi Flick Carreira",
      careers: [mockBarcaCareer],
      careerIds: ["c1"],
      createdAt: new Date("2024-07-01"),
    });
    vi.mocked(PlayersGroupService.getAggregatedGroupStats).mockResolvedValue([mockBarcaPlayer]);
    vi.mocked(PlayersGroupService.getGroupSeasonsData).mockResolvedValue([
      {
        clubName: "FC Barcelona",
        season: mockBarcaSeason,
        career: mockBarcaCareer,
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    scrollToSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("1. Exclusividade Mútua em CareersPage <-> AddSeasons", () => {
    it("ao clicar em 'Entrar', AddSeasons é renderizada e CareersPage é completamente desmontada", () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={["/CareersPage"]}>
            <Routes>
              <Route path="/CareersPage" element={<CareersPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getByText("Minhas Carreiras")).toBeDefined();
      expect(screen.getByText("FC Barcelona")).toBeDefined();

      const enterBtn = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(enterBtn);

      expect(screen.getByText("Selecionar temporadas")).toBeDefined();
      expect(screen.queryByText("Minhas Carreiras")).toBeNull();
      expect(navigateMock).not.toHaveBeenCalled();

      const backBtn = screen.getByRole("button", { name: "Voltar" });
      fireEvent.click(backBtn);

      expect(screen.getByText("Minhas Carreiras")).toBeDefined();
      expect(screen.queryByText("Selecionar temporadas")).toBeNull();
    });

    it("abre diretamente AddSeasons quando CareersPage recebe location.state.addSeasonsCareerId", () => {
      render(
        <ThemeProvider>
          <MemoryRouter
            initialEntries={[
              { pathname: "/CareersPage", state: { addSeasonsCareerId: "c1" } },
            ]}
          >
            <Routes>
              <Route path="/CareersPage" element={<CareersPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getByText("Selecionar temporadas")).toBeDefined();
      expect(screen.queryByText("Minhas Carreiras")).toBeNull();
    });
  });

  describe("2. Exclusividade Mútua e Ida/Volta de Players no contexto Season", () => {
    it("abre a view Players via SectionScreen com key 'player' e desmonta a casca anterior", () => {
      render(
        <ThemeProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/Career/c1/Season/s1",
                state: {
                  reopenScreen: {
                    key: "player",
                    playerId: "p-lamine",
                    careerId: "c1",
                    seasonId: "s1",
                    isNotSeason: false,
                  },
                },
              },
            ]}
          >
            <Routes>
              <Route path="/Career/:careerId/Season/:seasonId" element={<Season />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getAllByText("Lamine Yamal")[0]).toBeDefined();
      expect(screen.getByText("Temporada 1")).toBeDefined();
      expect(screen.queryByText("Classificação")).toBeNull();

      const backBtn = screen.getByRole("button", { name: "Voltar" });
      fireEvent.click(backBtn);

      expect(screen.queryByText("Temporada 1")).toBeDefined();
    });
  });

  describe("3. Exclusividade Mútua e Ida/Volta de Players no contexto Geral", () => {
    it("renderiza Players no modo Geral e restaura Geral ao fechar", async () => {
      render(
        <ThemeProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/Career/c1/Geral",
                state: {
                  reopenScreen: {
                    key: "player",
                    playerId: "p-lamine",
                    careerId: "c1",
                    isNotSeason: true,
                  },
                },
              },
            ]}
          >
            <Routes>
              <Route path="/Career/:careerId/Geral" element={<Geral />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getAllByText("Lamine Yamal")[0]).toBeDefined();
      expect(screen.getByText(/Temporada.* no clube/i)).toBeDefined();

      const backBtn = screen.getByRole("button", { name: "Voltar" });
      fireEvent.click(backBtn);

      expect((await screen.findAllByText("Geral")).length).toBeGreaterThan(0);
    });
  });

  describe("4. Exclusividade Mútua e Ida/Volta de Players em GroupCareerPage", () => {
    it("abre Players com carreira vinculada do grupo e propaga isFromGroup", async () => {
      render(
        <ThemeProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/CareerGroup/g1/Geral",
                state: {
                  save: {
                    id: "g1",
                    managerName: "Hansi Flick Carreira",
                    careers: [mockBarcaCareer],
                    careerIds: ["c1"],
                    createdAt: new Date("2024-07-01"),
                  },
                  reopenScreen: {
                    key: "player",
                    playerId: "p-lamine",
                    careerId: "c1",
                    isNotSeason: true,
                    isFromGroup: true,
                    groupId: "g1",
                  },
                },
              },
            ]}
          >
            <Routes>
              <Route path="/CareerGroup/:groupId/Geral" element={<GroupCareerPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>,
      );

      const yamalElements = await screen.findAllByText("Lamine Yamal");
      expect(yamalElements[0]).toBeDefined();
      expect(screen.queryByText("Hansi Flick Carreira")).toBeNull();

      const backBtn = screen.getByRole("button", { name: "Voltar" });
      fireEvent.click(backBtn);

      expect((await screen.findAllByText("Hansi Flick Carreira")).length).toBeGreaterThan(0);
    });
  });

  describe("5. Navegação de Retorno via useHeaderNavigation", () => {
    it("retorna de Season/Geral para CareersPage instruindo a abertura de AddSeasons", () => {
      const { result } = renderHook(
        () => useHeaderNavigation({ careerId: "c1" }),
        {
          wrapper: ({ children }) => (
            <MemoryRouter initialEntries={["/Career/c1/Season/s1"]}>
              <Routes>
                <Route
                  path="/Career/:careerId/Season/:seasonId"
                  element={<>{children}</>}
                />
              </Routes>
            </MemoryRouter>
          ),
        },
      );

      act(() => {
        result.current.handleGoBack();
      });

      expect(navigateMock).toHaveBeenCalledWith("/CareersPage", {
        state: { addSeasonsCareerId: "c1" },
      });
    });

    it("retorna de Match com playerId para rota de origem instruindo reabertura do jogador", () => {
      const { result } = renderHook(
        () => useHeaderNavigation({ careerId: "c1" }),
        {
          wrapper: ({ children }) => (
            <MemoryRouter
              initialEntries={[
                "/Career/c1/Season/s1/Match/m1?playerId=p-lamine&fromSeasonPlayer=true",
              ]}
            >
              <Routes>
                <Route
                  path="/Career/:careerId/Season/:seasonId/Match/:matchesId"
                  element={<>{children}</>}
                />
              </Routes>
            </MemoryRouter>
          ),
        },
      );

      act(() => {
        result.current.handleGoBack();
      });

      expect(navigateMock).toHaveBeenCalledWith("/Career/c1/Season/s1", {
        state: {
          reopenScreen: {
            key: "player",
            playerId: "p-lamine",
            careerId: "c1",
            seasonId: "s1",
            isNotSeason: false,
          },
        },
      });
    });
  });
});
