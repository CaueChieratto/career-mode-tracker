// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Academy } from "../pages/Academy";
import { Career } from "../common/interfaces/Career";
import * as useCareerHook from "../common/hooks/Career/UseCareer";

vi.mock("../contexts/SeasonThemeContext", () => ({
  SeasonThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="season-theme-provider">{children}</div>
  ),
  useSeasonTheme: () => ({ clubColor: "#004d98", darkClubColor: "#a50044" }),
}));

vi.mock("../pages/Academy/layouts/AcademyContent", () => ({
  AcademyContent: ({ career, seasonId }: { career: Career; seasonId: string }) => (
    <div data-testid="academy-content">
      <span>Clube: {career.clubName}</span>
      <span>Temporada: {seasonId}</span>
    </div>
  ),
}));

const mockBarcaCareer: Career = {
  id: "career-barca",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  createdAt: new Date("2026-07-01"),
  teamBadge: "barca.png",
  nation: "Espanha",
  colorsTeams: [],
  trophies: [],
  clubData: [
    {
      id: "season-1",
      seasonNumber: 1,
      players: [],
    },
  ],
};

describe("Academy F5 Reload Recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("exibe Load enquanto busca a carreira e renderiza a base após F5 sem location.state", async () => {
    // 1. Simula estado inicial de F5: carregando do hook useCareers
    vi.spyOn(useCareerHook, "useCareers").mockReturnValue({
      careers: [],
      loading: true,
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={["/Career/career-barca/Academy"]}>
        <Routes>
          <Route path="/Career/:careerId/Academy" element={<Academy />} />
        </Routes>
      </MemoryRouter>,
    );

    // Deve exibir o loader e NÃO exibir NotFoundDisplay
    expect(screen.queryByTestId("not-found-display")).toBeNull();

    // 2. Simula resolução do hook com a carreira encontrada
    vi.spyOn(useCareerHook, "useCareers").mockReturnValue({
      careers: [mockBarcaCareer],
      loading: false,
    });

    rerender(
      <MemoryRouter initialEntries={["/Career/career-barca/Academy"]}>
        <Routes>
          <Route path="/Career/:careerId/Academy" element={<Academy />} />
        </Routes>
      </MemoryRouter>,
    );

    // Agora deve renderizar o conteúdo da academia do FC Barcelona
    expect(screen.getByTestId("academy-content")).not.toBeNull();
    expect(screen.getByText("Clube: FC Barcelona")).not.toBeNull();
    expect(screen.queryByTestId("not-found-display")).toBeNull();
  });

  it("renderiza NotFoundDisplay apenas quando o carregamento terminar e a carreira não existir", () => {
    vi.spyOn(useCareerHook, "useCareers").mockReturnValue({
      careers: [mockBarcaCareer],
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={["/Career/inexistente/Academy"]}>
        <Routes>
          <Route path="/Career/:careerId/Academy" element={<Academy />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("academy-content")).toBeNull();
    expect(
      screen.getByText(
        "Não foi possível encontrar os dados para esta temporada.",
      ),
    ).not.toBeNull();
  });
});
