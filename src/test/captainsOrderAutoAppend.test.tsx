// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, render, screen, act } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { SeasonThemeProvider } from "../contexts/SeasonThemeContext";
import { usePlayerActions } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/hooks/usePlayerActions";
import AddSquad_Player_Form from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/components/AddSquad_Player_Form";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { ServiceSeasons } from "../common/services/ServiceSeasons";

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../common/services/ServiceSeasons", () => ({
  ServiceSeasons: {
    updateSeasonCaptains: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../common/hooks/Players/UseAddSquadPlayer", () => ({
  useAddSquadPlayer: () => ({
    addPlayer: vi.fn().mockImplementation(async (formData: FormData) => {
      return {
        id: "lamine-yamal",
        name: (formData.get("playerName") as string) || "Lamine Yamal",
        position: (formData.get("position") as string) || "ED",
        sector: (formData.get("sector") as string) || "Ataque",
        overall: Number(formData.get("overall")) || 88,
        shirtNumber: (formData.get("shirtNumber") as string) || "19",
        captain: (formData.get("isCaptain") as string) === "true",
        nation: "Espanha",
        age: 18,
        ballonDor: 0,
        buy: false,
        sell: false,
        contract: [],
        statsLeagues: [],
      } as Players;
    }),
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

const mockTerStegen: Players = {
  id: "ter-stegen",
  name: "Marc-André ter Stegen",
  position: "GOL",
  sector: "Goleiro",
  overall: 89,
  age: 32,
  nation: "Alemanha",
  shirtNumber: "1",
  ballonDor: 0,
  buy: false,
  captain: true,
  captainRank: 1,
  sell: false,
  contract: [],
  statsLeagues: [],
};

const mockDeJong: Players = {
  id: "de-jong",
  name: "Frenkie de Jong",
  position: "MC",
  sector: "Meio-Campo",
  overall: 87,
  age: 27,
  nation: "Holanda",
  shirtNumber: "21",
  ballonDor: 0,
  buy: false,
  captain: true,
  captainRank: 2,
  sell: false,
  contract: [],
  statsLeagues: [],
};

const mockGavi: Players = {
  id: "gavi",
  name: "Gavi",
  position: "MC",
  sector: "Meio-Campo",
  overall: 83,
  age: 20,
  nation: "Espanha",
  shirtNumber: "6",
  ballonDor: 0,
  buy: false,
  captain: false,
  sell: false,
  contract: [],
  statsLeagues: [],
};

const mockCareer: Career = {
  id: "barcelona-career",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  createdAt: new Date("2026-07-01"),
  teamBadge: "barca.png",
  nation: "Espanha",
  colorsTeams: [],
  trophies: [],
  clubData: [],
};

describe("Fluxo de Capitães — Inclusão automática no fim da lista", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ao cadastrar novo jogador com isCaptain: true, ele entra no fim da lista de capitães existente", async () => {
    const season: ClubData = {
      id: "season-2026",
      seasonNumber: 1,
      players: [mockTerStegen, mockDeJong],
      captains: ["ter-stegen", "de-jong"],
    };

    const { result } = renderHook(() =>
      usePlayerActions({
        careerId: mockCareer.id,
        seasonId: season.id,
        currentPlayers: season.players,
        onSuccess: vi.fn(),
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
    formData.append("isCaptain", "true");

    await act(async () => {
      await result.current.handleAddOrEditPlayer(formData);
    });

    expect(ServiceSeasons.updateSeasonCaptains).toHaveBeenCalledTimes(1);
    expect(ServiceSeasons.updateSeasonCaptains).toHaveBeenCalledWith(
      mockCareer.id,
      season.id,
      ["ter-stegen", "de-jong", "lamine-yamal"],
    );
  });

  it("ao promover um jogador existente para capitão, ele é anexado ao final da lista de capitães", async () => {
    const season: ClubData = {
      id: "season-2026",
      seasonNumber: 1,
      players: [mockTerStegen, mockDeJong, mockGavi],
      captains: ["ter-stegen", "de-jong"],
    };

    const { result } = renderHook(() =>
      usePlayerActions({
        careerId: mockCareer.id,
        seasonId: season.id,
        player: mockGavi,
        currentPlayers: season.players,
        onSuccess: vi.fn(),
        career: mockCareer,
        season,
      }),
    );

    const formData = new FormData();
    formData.append("playerName", "Gavi");
    formData.append("position", "MC");
    formData.append("sector", "Meio-Campo");
    formData.append("overall", "83");
    formData.append("age", "20");
    formData.append("nation", "Espanha");
    formData.append("shirtNumber", "6");
    formData.append("isCaptain", "true");

    await act(async () => {
      await result.current.handleAddOrEditPlayer(formData);
    });

    expect(ServiceSeasons.updateSeasonCaptains).toHaveBeenCalledTimes(1);
    expect(ServiceSeasons.updateSeasonCaptains).toHaveBeenCalledWith(
      mockCareer.id,
      season.id,
      ["ter-stegen", "de-jong", "gavi"],
    );
  });

  it("ao editar um capitão existente mantendo a braçadeira, sua posição relativa é preservada", async () => {
    const season: ClubData = {
      id: "season-2026",
      seasonNumber: 1,
      players: [mockTerStegen, mockDeJong],
      captains: ["ter-stegen", "de-jong"],
    };

    const { result } = renderHook(() =>
      usePlayerActions({
        careerId: mockCareer.id,
        seasonId: season.id,
        player: mockTerStegen,
        currentPlayers: season.players,
        onSuccess: vi.fn(),
        career: mockCareer,
        season,
      }),
    );

    const formData = new FormData();
    formData.append("playerName", "Marc-André ter Stegen");
    formData.append("position", "GOL");
    formData.append("sector", "Goleiro");
    formData.append("overall", "89");
    formData.append("age", "32");
    formData.append("nation", "Alemanha");
    formData.append("shirtNumber", "1");
    formData.append("isCaptain", "true");

    await act(async () => {
      await result.current.handleAddOrEditPlayer(formData);
    });

    expect(ServiceSeasons.updateSeasonCaptains).toHaveBeenCalledTimes(1);
    expect(ServiceSeasons.updateSeasonCaptains).toHaveBeenCalledWith(
      mockCareer.id,
      season.id,
      ["ter-stegen", "de-jong"],
    );
  });

  it("ao desmarcar um capitão (isCaptain: false), ele é removido da lista de capitães", async () => {
    const season: ClubData = {
      id: "season-2026",
      seasonNumber: 1,
      players: [mockTerStegen, mockDeJong],
      captains: ["ter-stegen", "de-jong"],
    };

    const { result } = renderHook(() =>
      usePlayerActions({
        careerId: mockCareer.id,
        seasonId: season.id,
        player: mockDeJong,
        currentPlayers: season.players,
        onSuccess: vi.fn(),
        career: mockCareer,
        season,
      }),
    );

    const formData = new FormData();
    formData.append("playerName", "Frenkie de Jong");
    formData.append("position", "MC");
    formData.append("sector", "Meio-Campo");
    formData.append("overall", "87");
    formData.append("age", "27");
    formData.append("nation", "Holanda");
    formData.append("shirtNumber", "21");
    formData.append("isCaptain", "false");

    await act(async () => {
      await result.current.handleAddOrEditPlayer(formData);
    });

    expect(ServiceSeasons.updateSeasonCaptains).toHaveBeenCalledTimes(1);
    expect(ServiceSeasons.updateSeasonCaptains).toHaveBeenCalledWith(
      mockCareer.id,
      season.id,
      ["ter-stegen"],
    );
  });

  it("não renderiza mais a seção 'Ordem de Capitães' (CaptainsHierarchyEditor) no formulário AddSquad_Player_Form", () => {
    const season: ClubData = {
      id: "season-2026",
      seasonNumber: 1,
      players: [mockTerStegen, mockDeJong],
      captains: ["ter-stegen", "de-jong"],
    };

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ThemeProvider>
              <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
                <AddSquad_Player_Form
                  player={mockTerStegen}
                  season={season}
                  career={mockCareer}
                  openModal={vi.fn()}
                />
              </SeasonThemeProvider>
            </ThemeProvider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    // Garante que o componente da 2ª imagem foi 100% removido do fluxo do usuário
    expect(screen.queryByText(/Ordem de Capitães/i)).toBeNull();
    expect(screen.queryByLabelText(/Subir capitão/i)).toBeNull();
    expect(screen.queryByLabelText(/Descer capitão/i)).toBeNull();
  });
});
