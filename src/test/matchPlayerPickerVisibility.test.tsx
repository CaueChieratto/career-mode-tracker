// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { Match } from "../pages/Match";
import * as MatchDataHook from "../pages/Match/hooks/useMatchData";
import { career as careerFactory, season as seasonFactory, match as matchFactory } from "./factories/domain";

vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: {},
}));

vi.mock("../layout/SectionView/components/ActiveSectionScreen", () => ({
  ActiveSectionScreen: () => null,
}));

vi.mock("../layout/SectionView/components/SectionModal", () => ({
  SectionModal: () => null,
}));

vi.mock("../pages/Match/components/MatchDetailsTab", () => ({
  MatchDetailsTab: () => <div data-testid="match-details-tab">Resultado Content</div>,
}));

vi.mock("../pages/Match/components/LineupTab", () => ({
  LineupTab: ({ onPickerOpenChange }: { onPickerOpenChange?: (open: boolean) => void }) => (
    <div data-testid="mock-lineup-tab">
      <button type="button" onClick={() => onPickerOpenChange?.(true)}>
        Abrir Picker
      </button>
      <button type="button" onClick={() => onPickerOpenChange?.(false)}>
        Fechar Picker
      </button>
    </div>
  ),
}));

vi.mock("../pages/Match/components/MatchStatsTab", () => ({
  MatchStatsTab: () => <div data-testid="match-stats-tab">Estatísticas Content</div>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ search: "", pathname: "/match" }),
    useParams: () => ({
      careerId: "c1",
      seasonId: "s1",
      matchesId: "m1",
    }),
  };
});

describe("Match page PlayerPicker mobile visibility integration", () => {
  const testSeason = seasonFactory({ id: "s1" });
  const testCareer = careerFactory({
    id: "c1",
    colorsTeams: ["#ffffff", "#000000"],
    clubData: [testSeason],
  });
  const testMatch = matchFactory({
    matchesId: "m1",
    homeTeam: "Flamengo",
    awayTeam: "Vasco",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();

    vi.spyOn(MatchDataHook, "useMatchData").mockReturnValue({
      career: testCareer,
      season: testSeason,
      match: testMatch,
      loading: false,
      goBack: vi.fn(),
      isFromGeral: false,
      updateLocalMatch: vi.fn(),
      careerId: testCareer.id,
      matchesId: "m1",
    });
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it("oculta o botão Salvar Formação e o BottomMenu enquanto o picker estiver aberto e os restaura ao fechar", () => {
    render(
      <ThemeProvider>
        <Match />
      </ThemeProvider>,
    );

    // Navigate to Formações tab
    act(() => {
      fireEvent.click(screen.getByText("Formações"));
    });

    expect(screen.getByTestId("mock-lineup-tab")).toBeTruthy();

    // In Formações tab: Salvar Formação and BottomMenu are initially visible
    expect(screen.getByRole("button", { name: "Salvar Formação" })).toBeTruthy();
    // BottomMenu contains navigation icons (e.g. role button or links)
    const initialBottomMenu = document.querySelector("footer") || document.querySelector("nav");
    expect(initialBottomMenu).toBeTruthy();

    // Trigger picker open
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Abrir Picker" }));
    });

    // Both Salvar Formação and BottomMenu must be hidden!
    expect(screen.queryByRole("button", { name: "Salvar Formação" })).toBeNull();
    // BottomMenu should be unmounted (shouldShowBottomMenu is false)
    const bottomNav = document.querySelector("footer");
    expect(bottomNav).toBeNull();

    // Trigger picker close
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Fechar Picker" }));
    });

    // Both Salvar Formação and BottomMenu must be restored!
    expect(screen.getByRole("button", { name: "Salvar Formação" })).toBeTruthy();
    expect(document.querySelector("footer") || document.querySelector("nav")).toBeTruthy();
  });
});
