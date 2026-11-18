// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTableData } from "../layout/SectionView/features/ClubTabs/TableTab/hooks/useTableData";
import { ServiceTable } from "../common/services/ServiceTable";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { TableRowData } from "../common/interfaces/Table";

vi.mock("../common/services/ServiceTable", () => ({
  ServiceTable: {
    getTableBySeason: vi.fn(),
  },
}));

const mockTableBarca: TableRowData = {
  id: "team-barca",
  name: "FC Barcelona",
  position: 1,
  points: 12,
  played: 4,
  won: 4,
  drawn: 0,
  lost: 0,
  goalsFor: 15,
  goalsAgainst: 2,
  goalDiff: 13,
  zone: "first",
  badge: "barca.png",
};

const mockCareer: Career = {
  id: "career-barca",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  createdAt: new Date("2026-07-01"),
  teamBadge: "barca.png",
  nation: "Espanha",
  updatedAt: 1000,
  colorsTeams: [],
  trophies: [],
  clubData: [],
};

describe("tableDataNoPopIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não dispara fetch redundante quando a tabela já está pré-hidratada e updatedAt não mudou", () => {
    const seasonWithTable: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [],
      table: [mockTableBarca],
    };

    const { result } = renderHook(() =>
      useTableData(mockCareer, seasonWithTable, true),
    );

    // Os dados devem estar imediatamente disponíveis
    expect(result.current.tableData).toHaveLength(1);
    expect(result.current.tableData[0].name).toBe("FC Barcelona");

    // ServiceTable.getTableBySeason NÃO deve ter sido chamado, evitando requisição N+1 e pop-in
    expect(ServiceTable.getTableBySeason).not.toHaveBeenCalled();
  });

  it("busca novos dados quando career.updatedAt avança (ex: após término de partida reconciliada)", async () => {
    const updatedTableBarca: TableRowData = {
      ...mockTableBarca,
      points: 15,
      played: 5,
      won: 5,
      goalsFor: 18,
    };

    vi.mocked(ServiceTable.getTableBySeason).mockResolvedValueOnce([
      updatedTableBarca as unknown as typeof mockTableBarca,
    ]);

    const seasonWithTable: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [],
      table: [mockTableBarca],
    };

    const { result, rerender } = renderHook(
      ({ careerProp }) => useTableData(careerProp, seasonWithTable, true),
      { initialProps: { careerProp: mockCareer } },
    );

    expect(result.current.tableData[0].points).toBe(12);

    // Atualiza updatedAt da carreira
    const updatedCareer = { ...mockCareer, updatedAt: 2000 };
    rerender({ careerProp: updatedCareer });

    await waitFor(() => {
      expect(ServiceTable.getTableBySeason).toHaveBeenCalledWith(
        "career-barca",
        "season-1",
      );
    });

    await waitFor(() => {
      expect(result.current.tableData[0].points).toBe(15);
    });
  });
});
