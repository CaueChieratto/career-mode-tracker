// @vitest-environment jsdom
import { act, render, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import CaptainsHierarchyCard from "../layout/SectionView/features/ClubTabs/GeneralTab/components/CaptainsHierarchyCard";
import CompetitionsCard from "../layout/SectionView/features/ClubTabs/GeneralTab/components/CompetitionsCard";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import { toastStore, clearAllToasts } from "../common/services/ToastService";
import { season } from "./factories/domain";
import type { Players } from "../common/interfaces/playersInfo/players";
import type { League } from "../common/interfaces/League";

vi.mock("../common/services/ServiceSeasons", () => ({
  ServiceSeasons: {
    updateSeasonCaptains: vi.fn(),
    updateSeasonLeagues: vi.fn(),
  },
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd?: (event: unknown) => void }) => (
    <div data-testid="dnd-context" onClick={() => onDragEnd?.({ active: { id: "p2" }, over: { id: "p1" } })}>
      {children}
    </div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

describe("Debounced Auto-save Feedback — CaptainsHierarchyCard & CompetitionsCard", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    clearAllToasts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  const barcelonaCaptains: Players[] = [
    {
      id: "pedri-id",
      name: "Pedri",
      overall: 88,
      position: "MC",
      captain: true,
      age: 22,
      salary: 150000,
    } as unknown as Players,
    {
      id: "gavi-id",
      name: "Gavi",
      overall: 86,
      position: "MC",
      captain: true,
      age: 20,
      salary: 120000,
    } as unknown as Players,
  ];

  const barcelonaSeason = season({
    id: "season-2026-barcelona",
    seasonNumber: 1,
    captains: ["pedri-id", "gavi-id"],
    players: barcelonaCaptains,
  });

  describe("CaptainsHierarchyCard", () => {
    it("no salvamento com sucesso: mantém silêncio visual (SEM toast)", async () => {
      vi.mocked(ServiceSeasons.updateSeasonCaptains).mockResolvedValueOnce(undefined);

      render(
        <CaptainsHierarchyCard
          careerId="barcelona-career-id"
          season={barcelonaSeason}
        />,
      );

      // Simula o término do debounce
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(0);
    });

    it("na falha do auto-save: emite toast.error avisando o usuário", async () => {
      vi.mocked(ServiceSeasons.updateSeasonCaptains).mockRejectedValueOnce(
        new Error("Firestore write quota exceeded"),
      );
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <CaptainsHierarchyCard
          careerId="barcelona-career-id"
          season={barcelonaSeason}
        />,
      );

      // Dispara o drag end mockado pelo DndContext
      const dndRoot = document.querySelector('[data-testid="dnd-context"]');
      if (dndRoot) {
        act(() => {
          dndRoot.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
      }

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "error" &&
            t.message.includes("Erro ao salvar ordem dos capitães no banco de dados."),
        ),
      ).toBe(true);

      consoleError.mockRestore();
    });
  });

  describe("CompetitionsCard", () => {
    const barcelonaLeagues = [
      { name: "La Liga", level: 1 },
      { name: "UEFA Champions League", level: 1 },
      { name: "Copa del Rey", level: 2 },
    ] as unknown as League[];

    const seasonWithLeagues = {
      ...barcelonaSeason,
      leagues: barcelonaLeagues,
    };

    it("no salvamento com sucesso: mantém silêncio visual (SEM toast)", async () => {
      vi.mocked(ServiceSeasons.updateSeasonLeagues).mockResolvedValueOnce(undefined);

      render(
        <CompetitionsCard
          careerId="barcelona-career-id"
          season={seasonWithLeagues}
        />,
      );

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(0);
    });

    it("na falha do auto-save: emite toast.error avisando o usuário", async () => {
      vi.mocked(ServiceSeasons.updateSeasonLeagues).mockRejectedValueOnce(
        new Error("Network disconnect"),
      );
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <CompetitionsCard
          careerId="barcelona-career-id"
          season={seasonWithLeagues}
        />,
      );

      const dndRoot = document.querySelector('[data-testid="dnd-context"]');
      if (dndRoot) {
        act(() => {
          dndRoot.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
      }

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "error" &&
            t.message.includes("Erro ao salvar ordem das competições no banco de dados."),
        ),
      ).toBe(true);

      consoleError.mockRestore();
    });
  });
});
