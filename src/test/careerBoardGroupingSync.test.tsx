// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCareerBoard } from "../pages/CareersPage/hooks/CareerBoard/useCareerBoard";
import { ServiceCareer } from "../common/services/ServiceCareer";
import { Career } from "../common/interfaces/Career";

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: {
    saveCareerGroup: vi.fn().mockResolvedValue(undefined),
    removeCareerFromGroup: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockCareer1: Career = {
  id: "career-barca-a",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  createdAt: new Date("2026-07-01"),
  teamBadge: "barca.png",
  nation: "Espanha",
  groupId: null,
  colorsTeams: [],
  trophies: [],
  clubData: [],
};

const mockCareer2: Career = {
  id: "career-barca-b",
  clubName: "FC Barcelona B",
  managerName: "Hansi Flick",
  createdAt: new Date("2026-07-01"),
  teamBadge: "barca-b.png",
  nation: "Espanha",
  groupId: null,
  colorsTeams: [],
  trophies: [],
  clubData: [],
};

describe("CareerBoard Grouping & Ungrouping Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrupa duas carreiras do FC Barcelona e mantém o board sincronizado sem reverter", async () => {
    const { result, rerender } = renderHook(
      ({ careers }) => useCareerBoard(careers),
      { initialProps: { careers: [mockCareer1, mockCareer2] } },
    );

    expect(result.current.boardItems).toHaveLength(2);
    expect(result.current.boardItems[0].type).toBe("single");
    expect(result.current.boardItems[1].type).toBe("single");

    // Solicita o merge entre Career 1 e Career 2
    act(() => {
      result.current.requestMerge("career-barca-b", "career-barca-a");
    });

    expect(result.current.pendingMerge).toEqual({
      sourceId: "career-barca-b",
      targetId: "career-barca-a",
      sourceLabel: "FC Barcelona B",
      targetLabel: "FC Barcelona",
    });

    // Confirma o merge
    await act(async () => {
      await result.current.confirmMerge();
    });

    // O board deve ter agrupado em 1 item do tipo group
    expect(result.current.boardItems).toHaveLength(1);
    expect(result.current.boardItems[0].type).toBe("group");
    expect(ServiceCareer.saveCareerGroup).toHaveBeenCalledTimes(1);

    // Simula a chegada da lista atualizada com groupId definido
    const groupedCareer1 = { ...mockCareer1, groupId: "save-123", updatedAt: 2000 };
    const groupedCareer2 = { ...mockCareer2, groupId: "save-123", updatedAt: 2000 };

    rerender({ careers: [groupedCareer1, groupedCareer2] });

    // Permanece agrupado estavelmente
    expect(result.current.boardItems).toHaveLength(1);
    expect(result.current.boardItems[0].type).toBe("group");
  });

  it("desvincula carreira do grupo e atualiza o board sem reversão nem necessidade de F5", async () => {
    const groupId = "save-group-barca";
    const initialGrouped1: Career = { ...mockCareer1, groupId };
    const initialGrouped2: Career = { ...mockCareer2, groupId };

    const { result, rerender } = renderHook(
      ({ careers }) => useCareerBoard(careers),
      { initialProps: { careers: [initialGrouped1, initialGrouped2] } },
    );

    expect(result.current.boardItems).toHaveLength(1);
    expect(result.current.boardItems[0].type).toBe("group");

    // Solicita remoção da segunda carreira
    act(() => {
      result.current.requestRemoval(
        "career-barca-b",
        "FC Barcelona B",
        "Hansi Flick",
        groupId,
      );
    });

    expect(result.current.pendingRemoval).not.toBeNull();

    // Confirma a remoção
    await act(async () => {
      await result.current.confirmRemoval();
    });

    expect(ServiceCareer.removeCareerFromGroup).toHaveBeenCalledWith(
      "career-barca-b",
      groupId,
      ["career-barca-a"],
    );

    // O grupo original tinha 2 carreiras, logo ao remover uma, ambas voltam a ser singles
    expect(result.current.boardItems).toHaveLength(2);
    expect(result.current.boardItems[0].type).toBe("single");
    expect(result.current.boardItems[1].type).toBe("single");

    // Simula propagação do Firestore com groupId null
    rerender({
      careers: [
        { ...mockCareer1, groupId: null, updatedAt: 3000 },
        { ...mockCareer2, groupId: null, updatedAt: 3000 },
      ],
    });

    expect(result.current.boardItems).toHaveLength(2);
    expect(result.current.boardItems.every((item) => item.type === "single")).toBe(true);
  });
});
