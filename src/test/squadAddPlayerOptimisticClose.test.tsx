// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlayerActions } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/hooks/usePlayerActions";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../common/hooks/Players/UseAddSquadPlayer", () => ({
  useAddSquadPlayer: () => ({
    addPlayer: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useEditSquadPlayer", () => ({
  useEditSquadPlayer: () => ({
    editPlayer: vi.fn().mockResolvedValue(undefined),
    deletePlayer: vi.fn().mockResolvedValue(undefined),
    sellPlayer: vi.fn().mockResolvedValue(undefined),
    loanPlayer: vi.fn().mockResolvedValue(undefined),
    returnLoanPlayer: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mockPlayerPedri: Players = {
  id: "pedri-8",
  name: "Pedri",
  position: "MC",
  sector: "Meio-Campo",
  overall: 89,
  age: 22,
  nation: "Espanha",
  shirtNumber: "8",
  ballonDor: 0,
  buy: false,
  captain: false,
  sell: false,
  contract: [],
  statsLeagues: [],
};

const mockCareer: Career = {
  id: "career-barca",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  createdAt: new Date("2026-07-01"),
  teamBadge: "barca.png",
  nation: "Espanha",
  colorsTeams: [],
  trophies: [],
  clubData: [],
};

describe("squadAddPlayerOptimisticClose", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emite payload otimista ADD_PLAYER no onSuccess sem mutar o array da prop season.players diretamente", async () => {
    const originalPlayersList = [mockPlayerPedri];
    const season: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: originalPlayersList,
    };

    const onSuccessMock = vi.fn();

    const { result } = renderHook(() =>
      usePlayerActions({
        careerId: mockCareer.id,
        seasonId: season.id,
        currentPlayers: season.players,
        onSuccess: onSuccessMock,
        career: mockCareer,
        season,
      }),
    );

    const formData = new FormData();
    formData.append("playerName", "Lamine Yamal");
    formData.append("position", "ED");
    formData.append("sector", "Ataque");
    formData.append("overall", "88");
    formData.append("age", "18");
    formData.append("nation", "Espanha");
    formData.append("shirtNumber", "19");

    await act(async () => {
      await result.current.handleAddOrEditPlayer(formData);
    });

    expect(onSuccessMock).toHaveBeenCalledTimes(1);
    const optimisticPayload = onSuccessMock.mock.calls[0][0];
    expect(optimisticPayload).toBeDefined();
    expect(optimisticPayload.type).toBe("ADD_PLAYER");
    expect(optimisticPayload.player.name).toBe("Lamine Yamal");

    // Imutabilidade estrita: a prop original season.players não pode ser mutada diretamente
    expect(season.players).toBe(originalPlayersList);
    expect(season.players).toHaveLength(1);
  });

  it("emite payload otimista DELETE_PLAYER no handleDeletePlayer", async () => {
    const season: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [mockPlayerPedri],
    };

    const onSuccessMock = vi.fn();

    const { result } = renderHook(() =>
      usePlayerActions({
        careerId: mockCareer.id,
        seasonId: season.id,
        player: mockPlayerPedri,
        currentPlayers: season.players,
        onSuccess: onSuccessMock,
        career: mockCareer,
        season,
      }),
    );

    await act(async () => {
      await result.current.handleDeletePlayer();
    });

    expect(onSuccessMock).toHaveBeenCalledTimes(1);
    const payload = onSuccessMock.mock.calls[0][0];
    expect(payload).toEqual({
      type: "DELETE_PLAYER",
      playerId: "pedri-8",
    });
  });
});
