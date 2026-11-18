// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSeasonView } from "../common/hooks/Seasons/UseSeasonView";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";

import { player } from "./factories/domain";

const mockCareer: Career = {
  id: "career-geral-test",
  managerName: "Treinador Teste",
  clubName: "Clube Teste",
  teamBadge: "badge.png",
  nation: "Inglaterra",
  currency: "GBP",
  trophies: [],
  createdAt: new Date("2026-01-01"),
  colorsTeams: ["#000000", "#ffffff"],
  clubData: [
    {
      id: "season-1",
      seasonNumber: 1,
      players: [player({ id: "p1", name: "Jogador 1" })],
      matches: [],
      financialReport: {
        seasonId: "season-1",
        seasonNumber: 1,
        entries: [
          {
            id: "e1",
            type: "revenue",
            category: "Ingressos",
            amount: 50000,
          },
        ],
      },
    } as ClubData,
    {
      id: "season-2",
      seasonNumber: 2,
      players: [player({ id: "p2", name: "Jogador 2" })],
      matches: [],
      financialReport: {
        seasonId: "season-2",
        seasonNumber: 2,
        entries: [
          {
            id: "e2",
            type: "expense",
            category: "Salários de atletas",
            amount: 20000,
          },
        ],
      },
    } as ClubData,
  ],
};

vi.mock("react-router-dom", () => ({
  useParams: () => ({ careerId: "career-geral-test", seasonId: undefined }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/Career/career-geral-test/Geral" }),
}));

vi.mock("../common/hooks/Career/UseCareer", () => ({
  useCareers: () => ({
    careers: [mockCareer],
    loading: false,
  }),
}));

describe("useSeasonView na Página Geral (Multi-Temporadas e Read-Only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fornece relatório financeiro consolidado de todas as temporadas na página Geral", () => {
    const { result } = renderHook(() => useSeasonView(true));

    expect(result.current.season).toBeDefined();
    expect(result.current.season?.financialReport).toBeDefined();
    expect(result.current.season?.financialReport?.entries).toHaveLength(2);
    expect(result.current.season?.financialReport?.entries[0].amount).toBe(50000);
    expect(result.current.season?.financialReport?.entries[1].amount).toBe(20000);
  });

  it("configura a aba Finanças com screen.readOnly = true no contexto Geral", () => {
    const { result } = renderHook(() => useSeasonView(true));

    const financeTab = result.current.tabsConfig.find(
      (t) => t.title === "Finanças",
    );
    expect(financeTab).toBeDefined();
    expect(financeTab?.screen).toBeDefined();
    expect(financeTab?.screen?.key).toBe("manageClauses");
    if (financeTab?.screen?.key === "manageClauses") {
      expect(financeTab.screen.readOnly).toBe(true);
    }
  });
});
