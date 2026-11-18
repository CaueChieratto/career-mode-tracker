// @vitest-environment jsdom
import { act, renderHook, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useCareerModalActions } from "../ui/modals/EditCareerModal/hooks/useCareerModalActions";
import { useAddSeasons } from "../pages/CareersPage/views/AddSeasons/hooks/useAddSeasons";
import { useSeasons } from "../pages/CareersPage/views/AddSeasons/hooks/useSeasons";
import { usePlayerActions } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/hooks/usePlayerActions";
import { useLineupPersistence } from "../pages/Match/components/LineupTab/hooks/useLineupPersistence";
import { ServiceCareer } from "../common/services/ServiceCareer";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import { ServicePlayers } from "../common/services/ServicePlayers";
import { ServiceLineup } from "../pages/Match/services/ServiceLineup";
import {
  toastStore,
  clearAllToasts,
  settleConfirm,
} from "../common/services/ToastService";
import { career, season } from "./factories/domain";
import type { Players } from "../common/interfaces/playersInfo/players";
import type { Match } from "../common/interfaces/Match";
import type { SavedLineup } from "../common/interfaces/Lineup";

vi.mock("../common/services/ServiceCareer", () => ({
  ServiceCareer: {
    saveCareer: vi.fn(),
    deleteCareer: vi.fn(),
  },
}));

vi.mock("../common/services/ServiceSeasons", () => ({
  ServiceSeasons: {
    addSeason: vi.fn(),
    deleteSeason: vi.fn(),
    updateSeasonCaptains: vi.fn(),
  },
}));

vi.mock("../common/services/ServicePlayers", () => ({
  ServicePlayers: {
    deletePlayerFromSeason: vi.fn(),
  },
}));

vi.mock("../pages/Match/services/ServiceLineup", () => ({
  ServiceLineup: {
    saveLineupToMatch: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../common/hooks/Career/UseCreateCareer", () => ({
  UseCreateCareer: vi.fn().mockImplementation(async (params) => ({
    id: "barcelona-new-career",
    clubName: params.club,
    managerName: params.manager,
    nation: "ESP",
    createdAt: new Date(),
    clubData: [],
  })),
}));

vi.mock("../common/hooks/Career/UseCareer", () => ({
  useCareers: vi.fn(() => ({ careers: [], loading: false })),
}));

vi.mock("../common/hooks/Colors/UseClubColors", () => ({
  useClubColors: () => ({ clubColor: "#004d98", darkClubColor: "#a50044" }),
}));

vi.mock("../common/services/ColorsService", () => ({
  ColorsService: {
    getColorSaved: () => "#004d98",
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ careerId: "fc-barcelona-career", seasonId: "season-1" }),
}));

describe("Visual Feedback Toasts — Confirmação de Mutações Críticas", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    clearAllToasts();
  });

  afterEach(() => {
    cleanup();
  });

  const barcelonaCareer = career({
    id: "fc-barcelona-career",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
  });

  const barcelonaSeason = season({
    id: "season-1",
    seasonNumber: 1,
    players: [],
  });

  describe("Criação de Carreira (useCareerModalActions)", () => {
    it("emite toast.success após salvar nova carreira com sucesso", async () => {
      vi.mocked(ServiceCareer.saveCareer).mockResolvedValueOnce(undefined);
      const closeModal = vi.fn();
      const setIsLoading = vi.fn();

      const { result } = renderHook(() =>
        useCareerModalActions({
          mode: "create",
          clubName: "FC Barcelona",
          managerName: "Hansi Flick",
          nation: "Espanha",
          createdAt: "01/07/2026",
          primaryColor: "#004d98",
          secondaryColor: "#a50044",
          closeModal,
          setIsLoading,
          file: null,
        }),
      );

      const fakeEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        await result.current.handleSave(fakeEvent);
      });

      expect(ServiceCareer.saveCareer).toHaveBeenCalled();
      expect(closeModal).toHaveBeenCalled();

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "success" &&
            t.message.includes("Carreira criada com sucesso!"),
        ),
      ).toBe(true);
    });
  });

  describe("Criação e Exclusão de Temporadas (useAddSeasons & useSeasons)", () => {
    it("emite toast.success ao adicionar nova temporada", async () => {
      vi.mocked(ServiceSeasons.addSeason).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useAddSeasons({
          careerId: barcelonaCareer.id,
          careers: [barcelonaCareer],
          loadingCareers: false,
        }),
      );

      await act(async () => {
        await result.current.handleAddSeason(barcelonaCareer);
      });

      expect(ServiceSeasons.addSeason).toHaveBeenCalledWith(barcelonaCareer);

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "success" &&
            t.message.includes("Temporada adicionada com sucesso!"),
        ),
      ).toBe(true);
    });

    it("emite toast.success ao excluir temporada confirmada", async () => {
      vi.mocked(ServiceSeasons.deleteSeason).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useSeasons(barcelonaCareer.id));

      let deletePromise!: Promise<void>;
      act(() => {
        deletePromise = result.current.handleDeleteSeason("season-1", 1);
      });

      const confirmToast = toastStore
        .getSnapshot()
        .find((t) => t.type === "confirm");
      expect(confirmToast).toBeDefined();

      await act(async () => {
        settleConfirm(confirmToast!.id, true);
        await deletePromise;
      });

      expect(ServiceSeasons.deleteSeason).toHaveBeenCalledWith(
        barcelonaCareer.id,
        "season-1",
      );

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "success" &&
            t.message.includes("Temporada excluída com sucesso!"),
        ),
      ).toBe(true);
    });
  });

  describe("Ações do Atleta no Elenco (usePlayerActions)", () => {
    const lamineYamal: Players = {
      id: "lamine-yamal-id",
      name: "Lamine Yamal",
      overall: 84,
      potential: 95,
      position: "PD",
      sector: "Ataque",
      age: 18,
      salary: 80000,
    } as unknown as Players;

    it("emite toast.success ao excluir jogador do elenco", async () => {
      vi.mocked(ServicePlayers.deletePlayerFromSeason).mockResolvedValueOnce(
        undefined as never,
      );
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        usePlayerActions({
          careerId: barcelonaCareer.id,
          seasonId: barcelonaSeason.id,
          player: lamineYamal,
          onSuccess,
          career: barcelonaCareer,
          season: barcelonaSeason,
        }),
      );

      await act(async () => {
        await result.current.handleDeletePlayer();
      });

      expect(onSuccess).toHaveBeenCalled();

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "success" &&
            t.message.includes("Jogador excluído do elenco com sucesso!"),
        ),
      ).toBe(true);
    });
  });

  describe("Escalação e Formação Tática (useLineupPersistence)", () => {
    it("emite toast.success ao persistir escalação da partida", async () => {
      vi.mocked(ServiceLineup.saveLineupToMatch).mockResolvedValueOnce([]);

      const mockSavedLineup: SavedLineup = {
        formation: "4-3-3 Ofensivo",
        goalkeeper: { slotId: "slot-gk", playerId: "ter-stegen-id", playerName: "Ter Stegen" },
        lines: [{ slotId: "slot-1", playerId: "pedri-id", playerName: "Pedri" }],
        bench: [],
      };

      const match: Match = {
        matchesId: "match-el-clasico",
        homeTeam: "FC Barcelona",
        awayTeam: "Sevilla FC",
        date: "15/10/2026",
        league: "La Liga",
        lineup: mockSavedLineup,
        playerStats: [],
      } as unknown as Match;

      let registeredSaveHandler: (() => Promise<void>) | undefined;
      const onRegisterSave = vi.fn((fn) => {
        registeredSaveHandler = fn;
      });

      renderHook(() =>
        useLineupPersistence({
          match,
          buildSavedLineup: () => mockSavedLineup,
          onRegisterSave,
        }),
      );

      expect(onRegisterSave).toHaveBeenCalled();

      await act(async () => {
        await registeredSaveHandler?.();
      });

      const toasts = toastStore.getSnapshot();
      expect(
        toasts.some(
          (t) =>
            t.type === "success" &&
            t.message.includes("Escalação salva com sucesso!"),
        ),
      ).toBe(true);
    });
  });
});
