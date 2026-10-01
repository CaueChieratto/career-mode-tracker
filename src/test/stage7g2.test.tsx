// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import SectionView from "../layout/SectionView";
import type { TabConfig } from "../layout/SectionView/config/seasonTabsConfig";
import { career, season, match as matchFactory } from "./factories/domain";
import { Match } from "../pages/Match";
import * as MatchDataHook from "../pages/Match/hooks/useMatchData";

// Mock child components of Match to isolate tab mounting assertions
vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: {},
}));

vi.mock("../common/helpers/Deleters", () => ({}));

vi.mock("../layout/SectionView/components/ActiveSectionScreen", () => ({
  ActiveSectionScreen: () => null,
}));

vi.mock("../layout/SectionView/components/SectionModal", () => ({
  SectionModal: () => null,
}));

vi.mock("../pages/Match/components/MatchDetailsTab", () => ({
  MatchDetailsTab: () => (
    <div data-testid="match-details-tab">Resultado Content</div>
  ),
}));

vi.mock("../pages/Match/components/LineupTab", () => ({
  LineupTab: () => <div data-testid="lineup-tab">Formações Content</div>,
}));

vi.mock("../pages/Match/components/MatchStatsTab", () => ({
  MatchStatsTab: () => (
    <div data-testid="match-stats-tab">Estatísticas Content</div>
  ),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
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

import { ThemeProvider } from "../contexts/LightThemeContext";
import { cleanup } from "@testing-library/react";

const testSeason = season({ id: "s1" });
const testCareer = career({
  id: "c1",
  colorsTeams: ["#ffffff", "#000000"],
  clubData: [testSeason],
});

describe("Stage 7G2 — Lazy Mount of Tabs (SectionView & Match)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  describe("SectionView Lazy Mount", () => {
    it("initially mounts ONLY the active tab component and keeps SwiperSlide shells for all tabs", () => {
      const Tab1 = vi.fn((props: { isActive?: boolean }) => (
        <div data-testid="tab-1">
          Tab 1 (isActive: {String(props.isActive)})
        </div>
      ));
      const Tab2 = vi.fn((props: { isActive?: boolean }) => (
        <div data-testid="tab-2">
          Tab 2 (isActive: {String(props.isActive)})
        </div>
      ));
      const Tab3 = vi.fn((props: { isActive?: boolean }) => (
        <div data-testid="tab-3">
          Tab 3 (isActive: {String(props.isActive)})
        </div>
      ));

      const mockTabsConfig: TabConfig[] = [
        { title: "Elenco", component: Tab1 },
        { title: "Geral", component: Tab2 },
        { title: "Classificação", component: Tab3 },
      ];

      const { container } = render(
        <ThemeProvider>
          <SectionView
            career={testCareer}
            season={testSeason}
            tabsConfig={mockTabsConfig}
          />
        </ThemeProvider>,
      );

      // Active tab (index 0 / "Elenco") is mounted with isActive: true
      expect(screen.getByTestId("tab-1")).toBeTruthy();
      expect(screen.getByText("Tab 1 (isActive: true)")).toBeTruthy();
      expect(Tab1).toHaveBeenCalled();

      // Inactive tabs (index 1 and 2) are NOT mounted
      expect(screen.queryByTestId("tab-2")).toBeNull();
      expect(Tab2).not.toHaveBeenCalled();
      expect(screen.queryByTestId("tab-3")).toBeNull();
      expect(Tab3).not.toHaveBeenCalled();

      // All 3 SwiperSlide elements and containers exist in the DOM to preserve Swiper layout
      const slides = container.querySelectorAll(".swiper-slide");
      expect(slides.length).toBe(3);
    });

    it("mounts unvisited tab on first navigation and preserves previously visited tabs", () => {
      let renderCountTab1 = 0;
      let renderCountTab2 = 0;
      let renderCountTab3 = 0;

      const Tab1 = vi.fn((props: { isActive?: boolean }) => {
        renderCountTab1++;
        return (
          <div data-testid="tab-1">
            Tab 1 (isActive: {String(props.isActive)})
          </div>
        );
      });
      const Tab2 = vi.fn((props: { isActive?: boolean }) => {
        renderCountTab2++;
        return (
          <div data-testid="tab-2">
            Tab 2 (isActive: {String(props.isActive)})
          </div>
        );
      });
      const Tab3 = vi.fn((props: { isActive?: boolean }) => {
        renderCountTab3++;
        return (
          <div data-testid="tab-3">
            Tab 3 (isActive: {String(props.isActive)})
          </div>
        );
      });

      const mockTabsConfig: TabConfig[] = [
        { title: "Elenco", component: Tab1 },
        { title: "Geral", component: Tab2 },
        { title: "Classificação", component: Tab3 },
      ];

      render(
        <ThemeProvider>
          <SectionView
            career={testCareer}
            season={testSeason}
            tabsConfig={mockTabsConfig}
          />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("tab-1")).toBeTruthy();
      expect(screen.queryByTestId("tab-2")).toBeNull();
      expect(screen.queryByTestId("tab-3")).toBeNull();

      // Navigate to Tab 2 ("Geral")
      act(() => {
        fireEvent.click(screen.getByText("Geral"));
      });

      // Now Tab 2 is mounted
      expect(screen.getByTestId("tab-2")).toBeTruthy();
      expect(screen.getByText("Tab 2 (isActive: true)")).toBeTruthy();
      expect(renderCountTab2).toBeGreaterThanOrEqual(1);

      // Tab 1 remains mounted, but now isActive is false
      expect(screen.getByTestId("tab-1")).toBeTruthy();
      expect(screen.getByText("Tab 1 (isActive: false)")).toBeTruthy();
      expect(renderCountTab1).toBeGreaterThanOrEqual(1);

      // Tab 3 was never visited, so it remains unmounted
      expect(screen.queryByTestId("tab-3")).toBeNull();
      expect(renderCountTab3).toBe(0);

      // Navigate back to Tab 1 ("Elenco")
      act(() => {
        fireEvent.click(screen.getByText("Elenco"));
      });

      // Both Tab 1 and Tab 2 remain mounted
      expect(screen.getByTestId("tab-1")).toBeTruthy();
      expect(screen.getByText("Tab 1 (isActive: true)")).toBeTruthy();
      expect(screen.getByTestId("tab-2")).toBeTruthy();
      expect(screen.getByText("Tab 2 (isActive: false)")).toBeTruthy();

      // Tab 3 still unmounted
      expect(screen.queryByTestId("tab-3")).toBeNull();
    });

    it("resets visited tabs when season or career context changes", () => {
      const Tab1 = vi.fn((props: { isActive?: boolean }) => (
        <div data-testid="tab-1">
          Tab 1 (isActive: {String(props.isActive)})
        </div>
      ));
      const Tab2 = vi.fn((props: { isActive?: boolean }) => (
        <div data-testid="tab-2">
          Tab 2 (isActive: {String(props.isActive)})
        </div>
      ));

      const mockTabsConfig: TabConfig[] = [
        { title: "Elenco", component: Tab1 },
        { title: "Geral", component: Tab2 },
      ];

      const { rerender } = render(
        <ThemeProvider>
          <SectionView
            career={testCareer}
            season={{ ...testSeason, id: "season-1" }}
            tabsConfig={mockTabsConfig}
          />
        </ThemeProvider>,
      );

      // Visit Tab 2 in season-1 -> Both tabs are now visited and mounted
      act(() => {
        fireEvent.click(screen.getByText("Geral"));
      });
      expect(screen.getByTestId("tab-2")).toBeTruthy();
      expect(screen.getByTestId("tab-1")).toBeTruthy();

      // Change season context to season-2
      rerender(
        <ThemeProvider>
          <SectionView
            career={testCareer}
            season={{ ...testSeason, id: "season-2" }}
            tabsConfig={mockTabsConfig}
          />
        </ThemeProvider>,
      );

      // Tab 2 (currently active) is mounted
      expect(screen.getByTestId("tab-2")).toBeTruthy();
      // Tab 1 ("Elenco" - visited in season-1, but not visited in season-2) was reset and is NOT mounted
      expect(screen.queryByTestId("tab-1")).toBeNull();
    });
  });

  describe("Match Lazy Mount", () => {
    const mockMatchData = matchFactory({
      matchesId: "m1",
      homeTeam: "Flamengo",
      awayTeam: "Vasco",
    });

    beforeEach(() => {
      vi.spyOn(MatchDataHook, "useMatchData").mockReturnValue({
        career: testCareer,
        season: testSeason,
        match: mockMatchData,
        loading: false,
        goBack: vi.fn(),
        isFromGeral: false,
        updateLocalMatch: vi.fn(),
        careerId: testCareer.id,
        matchesId: "m1",
      });
    });

    it("initially mounts only the active Match tab ('Resultado') and defers 'Formações' and 'Estatísticas'", () => {
      const { container } = render(
        <ThemeProvider>
          <Match />
        </ThemeProvider>,
      );

      // Active tab "Resultado" is mounted
      expect(screen.getByTestId("match-details-tab")).toBeTruthy();

      // Inactive tabs are not mounted
      expect(screen.queryByTestId("lineup-tab")).toBeNull();
      expect(screen.queryByTestId("match-stats-tab")).toBeNull();

      // 3 Swiper slides exist in DOM
      const slides = container.querySelectorAll(".swiper-slide");
      expect(slides.length).toBe(3);
    });

    it("mounts Match tabs on demand when navigated to and retains visited tabs", () => {
      render(
        <ThemeProvider>
          <Match />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("match-details-tab")).toBeTruthy();
      expect(screen.queryByTestId("lineup-tab")).toBeNull();

      // Navigate to "Formações"
      act(() => {
        fireEvent.click(screen.getByText("Formações"));
      });

      expect(screen.getByTestId("lineup-tab")).toBeTruthy();
      expect(screen.getByTestId("match-details-tab")).toBeTruthy();
      expect(screen.queryByTestId("match-stats-tab")).toBeNull();

      // Navigate to "Estatísticas"
      act(() => {
        fireEvent.click(screen.getByText("Estatísticas"));
      });

      expect(screen.getByTestId("match-stats-tab")).toBeTruthy();
      expect(screen.getByTestId("lineup-tab")).toBeTruthy();
      expect(screen.getByTestId("match-details-tab")).toBeTruthy();
    });

    it("resets visited tabs when match context changes", () => {
      const { rerender } = render(
        <ThemeProvider>
          <Match />
        </ThemeProvider>,
      );

      // Navigate to "Formações" -> both "Resultado" and "Formações" are mounted
      act(() => {
        fireEvent.click(screen.getByText("Formações"));
      });
      expect(screen.getByTestId("lineup-tab")).toBeTruthy();
      expect(screen.getByTestId("match-details-tab")).toBeTruthy();

      // Change match context to m2
      vi.spyOn(MatchDataHook, "useMatchData").mockReturnValue({
        career: testCareer,
        season: testSeason,
        match: { ...mockMatchData, matchesId: "m2" },
        loading: false,
        goBack: vi.fn(),
        isFromGeral: false,
        updateLocalMatch: vi.fn(),
        careerId: testCareer.id,
        matchesId: "m2",
      });

      rerender(
        <ThemeProvider>
          <Match />
        </ThemeProvider>,
      );

      // "Formações" (active tab) is mounted for m2
      expect(screen.getByTestId("lineup-tab")).toBeTruthy();
      // "Resultado" (visited in m1, but not yet in m2) was reset and is NOT mounted
      expect(screen.queryByTestId("match-details-tab")).toBeNull();
    });
  });
});
