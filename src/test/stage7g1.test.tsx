// @vitest-environment jsdom
import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useTableData } from "../layout/SectionView/features/ClubTabs/TableTab/hooks/useTableData";
import { ServiceTable } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import CompetitionsCard from "../layout/SectionView/features/ClubTabs/GeneralTab/components/CompetitionsCard";
import { career, season } from "./factories/domain";
import type { TableTeamData } from "../common/interfaces/TableTeamData";

vi.mock(
  "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable",
  () => ({
    ServiceTable: {
      getTableBySeason: vi.fn(),
    },
  }),
);

vi.mock("../common/services/ServiceSeasons", () => ({
  ServiceSeasons: {
    updateSeasonLeagues: vi.fn(),
  },
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
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

describe("Stage 7G1 — TableTab + CompetitionsCard Timeout Cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("TableTab / useTableData", () => {
    it("A) quando inativa (isActive = false), ServiceTable.getTableBySeason NÃO é chamado", async () => {
      const testCareer = career({ id: "c1" });
      const testSeason = season({ id: "s1" });

      renderHook(() => useTableData(testCareer, testSeason, false));

      expect(ServiceTable.getTableBySeason).not.toHaveBeenCalled();
    });

    it("B) quando ativa (isActive = true), ServiceTable.getTableBySeason é chamado normalmente", async () => {
      const testCareer = career({ id: "c1" });
      const testSeason = season({ id: "s1" });
      const mockTable: TableTeamData[] = [
        {
          id: "t1",
          name: "Clube 1",
          badge: "badge.png",
          points: 10,
          played: 5,
          won: 3,
          drawn: 1,
          lost: 1,
          goalsFor: 8,
          goalsAgainst: 3,
          goalDiff: 5,
        },
      ];

      vi.mocked(ServiceTable.getTableBySeason).mockResolvedValue(mockTable);

      const { result } = renderHook(() =>
        useTableData(testCareer, testSeason, true),
      );

      expect(ServiceTable.getTableBySeason).toHaveBeenCalledTimes(1);
      expect(ServiceTable.getTableBySeason).toHaveBeenCalledWith("c1", "s1");

      await act(async () => {});
      expect(result.current.tableData[0]?.name).toBe("Clube 1");
    });

    it("C) mudança de career.updatedAt enquanto inativa NÃO dispara fetch oculto", async () => {
      const testCareer = career({ id: "c1", updatedAt: 1000 });
      const testSeason = season({ id: "s1" });

      const { rerender } = renderHook(
        ({ c, s, active }) => useTableData(c, s, active),
        {
          initialProps: { c: testCareer, s: testSeason, active: false },
        },
      );

      expect(ServiceTable.getTableBySeason).not.toHaveBeenCalled();

      // Atualiza updatedAt com a tab ainda inativa
      const updatedCareer = { ...testCareer, updatedAt: 2000 };
      rerender({ c: updatedCareer, s: testSeason, active: false });

      expect(ServiceTable.getTableBySeason).not.toHaveBeenCalled();
    });

    it("D) ao tornar ativa, a busca ocorre; e se inativar novamente, mudanças subsequentes não disparam", async () => {
      const testCareer = career({ id: "c1", updatedAt: 1000 });
      const testSeason = season({ id: "s1" });
      vi.mocked(ServiceTable.getTableBySeason).mockResolvedValue([]);

      const { rerender } = renderHook(
        ({ c, s, active }) => useTableData(c, s, active),
        {
          initialProps: { c: testCareer, s: testSeason, active: false },
        },
      );

      expect(ServiceTable.getTableBySeason).not.toHaveBeenCalled();

      // 1. Torna a tab ativa -> busca deve ocorrer
      rerender({ c: testCareer, s: testSeason, active: true });
      expect(ServiceTable.getTableBySeason).toHaveBeenCalledTimes(1);

      // 2. Mudança em updatedAt enquanto ativa -> refetch ocorre
      const careerUpdate1 = { ...testCareer, updatedAt: 2000 };
      rerender({ c: careerUpdate1, s: testSeason, active: true });
      expect(ServiceTable.getTableBySeason).toHaveBeenCalledTimes(2);

      // 3. Sai da aba (torna inativa)
      rerender({ c: careerUpdate1, s: testSeason, active: false });
      expect(ServiceTable.getTableBySeason).toHaveBeenCalledTimes(2);

      // 4. Mudança em updatedAt com a aba inativa -> NENHUM fetch novo
      const careerUpdate2 = { ...careerUpdate1, updatedAt: 3000 };
      rerender({ c: careerUpdate2, s: testSeason, active: false });
      expect(ServiceTable.getTableBySeason).toHaveBeenCalledTimes(2);
    });
  });

  describe("CompetitionsCard Timeout Cleanup", () => {
    it("E) timeout pendente de debounce é cancelado no unmount e nenhuma persistência atrasada ocorre", async () => {
      vi.useFakeTimers();

      const testSeason = season({
        id: "s1",
        leagues: [
          {
            name: "Brasileirão",
            logo: "logo1.png",
            trophy: "trophy1.png",
            league: true,
          },
          {
            name: "Copa do Brasil",
            logo: "logo2.png",
            trophy: "trophy2.png",
            league: false,
          },
        ],
      });

      const { unmount, container } = render(
        <CompetitionsCard careerId="c1" season={testSeason} />,
      );

      // Componente montado
      expect(container).toBeDefined();

      // Desmonta o componente imediatamente
      unmount();

      // Avança o tempo além do debounce de 500ms
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Nenhuma chamada atrasada deve ter acontecido
      expect(ServiceSeasons.updateSeasonLeagues).not.toHaveBeenCalled();
    });
  });
});
