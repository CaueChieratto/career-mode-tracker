// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AllMatchesTab } from "../layout/SectionView/features/ClubTabs/AllMatchesTab";
import StatisticsTable_Title from "../components/Statistics/StatisticsTable_Title";
import TotalPlayerTab from "../layout/SectionView/features/PlayerTabs/TotalPlayerTab";
import { ClubData } from "../common/interfaces/club/clubData";
import {
  career,
  season,
  player,
  match,
  stat,
  leagueStats,
} from "./factories/domain";

// Mock dependencies
vi.mock("../common/services/Firebase", () => ({
  auth: { currentUser: { uid: "user_barca_123" } },
  db: {},
}));

const emptyToasts: unknown[] = [];

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  toastStore: {
    subscribe: vi.fn(() => vi.fn()),
    getSnapshot: vi.fn(() => emptyToasts),
  },
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    activeStyle: {
      color: "#ffffff",
      darkClubColor: "#a50044",
      backgroundColor: "#004d98",
      primaryColor: "#004d98",
    },
  }),
}));

describe("Frente 4: Tela do Atleta e AllMatches (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const barcaMatchS1 = match({
    matchesId: "match_s1_valencia",
    homeTeam: "Valencia CF",
    awayTeam: "FC Barcelona",
    league: "LaLiga",
    status: "FINISHED",
    date: "17/08",
    homeScore: 1,
    awayScore: 2,
    result: "V",
    playerStats: [
      stat({
        playerId: "p_pedri",
        minutesPlayed: 90,
        goals: 1,
        assists: 1,
        rating: 8.5,
      }),
    ],
  });

  const barcaMatchS2 = match({
    matchesId: "match_s2_sevilla",
    homeTeam: "FC Barcelona",
    awayTeam: "Sevilla FC",
    league: "LaLiga",
    status: "FINISHED",
    date: "20/08",
    homeScore: 3,
    awayScore: 0,
    result: "V",
    playerStats: [
      stat({
        playerId: "p_pedri",
        minutesPlayed: 85,
        goals: 0,
        assists: 2,
        rating: 8.0,
      }),
    ],
  });

  const season1: ClubData = season({
    id: "s_1",
    seasonNumber: 1,
    matches: [barcaMatchS1],
    players: [],
  });

  const season2: ClubData = season({
    id: "s_2",
    seasonNumber: 2,
    matches: [barcaMatchS2],
    players: [],
  });

  const barcaCareer = career({
    id: "c_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    currency: "EUR",
    nation: "ESP",
    teamBadge: "https://example.com/barca.png",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [
      {
        leagueName: "LaLiga",
        leagueImage: "https://example.com/laliga.png",
        seasons: ["s_1"],
      },
    ],
    createdAt: new Date("2024-07-01"),
    updatedAt: Date.now(),
    clubData: [season1, season2],
  });

  const pedri = player({
    id: "p_pedri",
    name: "Pedri",
    position: "MC",
    sector: "Meio-Campo",
    age: 22,
    nation: "ESP",
    overall: 89,
    shirtNumber: "8",
    statsLeagues: [
      leagueStats({ games: 38, goals: 8, assists: 12 }, "LaLiga"),
    ],
  });

  describe("AllMatchesTab - Temporada vs Geral", () => {
    it("na rota de Temporada (/Career/.../Season/...), NÃO deve exibir o seletor de temporadas", () => {
      render(
        <MemoryRouter initialEntries={["/Career/c_barca/Season/s_1"]}>
          <AllMatchesTab
            career={barcaCareer}
            season={season1}
            player={pedri}
          />
        </MemoryRouter>,
      );

      expect(screen.queryByText("Todas")).toBeNull();
      expect(screen.queryByText("Temporada 1")).toBeNull();
    });

    it("na rota Geral (/Career/.../Geral), DEVE exibir opções do filtro de temporadas", () => {
      render(
        <MemoryRouter initialEntries={["/Career/c_barca/Geral"]}>
          <AllMatchesTab
            career={barcaCareer}
            season={season1}
            player={pedri}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("Todas")).not.toBeNull();
    });
  });

  describe("StatisticsTable_Title - Sem animação de marquee em expand_container", () => {
    it("deve renderizar o título dentro de expand_container com classe name_season e sem OverflowText animado", () => {
      const { container } = render(
        <StatisticsTable_Title
          type="info"
          teamBadge="https://example.com/barca-badge.png"
          playerName="Temporada 2024/2025 - FC Barcelona"
        />,
      );

      const spanTitle = container.querySelector("span[class*='name_season']");
      expect(spanTitle).not.toBeNull();
      expect(spanTitle?.textContent).toBe("Temporada 2024/2025 - FC Barcelona");

      const marqueeElement = container.querySelector("[class*='marquee']");
      expect(marqueeElement).toBeNull();
    });
  });

  describe("TotalPlayerTab - Conquistas de Temporada vs Geral", () => {
    it("em contexto de temporada, renderiza sem erro e com dados limpos", () => {
      render(
        <MemoryRouter initialEntries={["/Career/c_barca/Season/s_1"]}>
          <TotalPlayerTab
            career={barcaCareer}
            season={season1}
            player={pedri}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("Total")).not.toBeNull();
    });
  });
});
