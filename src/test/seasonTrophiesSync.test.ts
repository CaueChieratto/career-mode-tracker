// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncSeasonTrophies } from "../common/helpers/Mergers";
import { removeAllTrophiesForSeason } from "../common/helpers/Deleters";
import { ServiceCareer } from "../common/services/ServiceCareer";
import { updateCareerTrophies } from "../common/helpers/Setters";
import { auth } from "./mocks/firebaseClient";
import { getDoc } from "./mocks/firestore";
import { career } from "./factories/domain";
import { toast } from "../common/services/ToastService";
import { useSave } from "../common/hooks/Career/UseSave";
import { useAddTrophies } from "../common/hooks/Career/UseAddTrophies";
import { renderHook, act } from "@testing-library/react";
import type { Career } from "../common/interfaces/Career";
import type { ClubData } from "../common/interfaces/club/clubData";
import type { League } from "../common/interfaces/League";

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
  updateCareerTrophies: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Sincronização de Títulos de Temporadas (syncSeasonTrophies)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = { uid: "test-user" };
  });

  const availableLeagues: League[] = [
    {
      name: "La Liga",
      trophy: "https://example.com/trophies/laliga.png",
      logo: "https://example.com/badges/laliga.png",
    },
    {
      name: "Copa del Rey",
      trophy: "https://example.com/trophies/copadelrey.png",
      logo: "https://example.com/badges/copadelrey.png",
    },
    {
      name: "UEFA Champions League",
      trophy: "https://example.com/trophies/ucl.png",
      logo: "https://example.com/badges/ucl.png",
    },
  ];

  it("remove troféu que foi desmarcado pelo usuário para a temporada", () => {
    const barcaCareer: Career = career({
      clubName: "FC Barcelona",
      trophies: [
        {
          leagueName: "La Liga",
          leagueImage: "https://example.com/trophies/laliga.png",
          seasons: ["23/24"],
        },
        {
          leagueName: "UEFA Champions League",
          leagueImage: "https://example.com/trophies/ucl.png",
          seasons: ["23/24"],
        },
      ],
    });

    // Desmarca UEFA Champions League e mantém apenas La Liga
    const result = syncSeasonTrophies(
      barcaCareer,
      "23/24",
      ["La Liga"],
      availableLeagues,
    );

    expect(result).toHaveLength(1);
    expect(result[0].leagueName).toBe("La Liga");
    expect(result[0].seasons).toEqual(["23/24"]);
  });

  it("mantém troféu se ele ainda possui conquistas em outras temporadas", () => {
    const barcaCareer: Career = career({
      clubName: "FC Barcelona",
      trophies: [
        {
          leagueName: "La Liga",
          leagueImage: "https://example.com/trophies/laliga.png",
          seasons: ["23/24", "24/25"],
        },
      ],
    });

    // Remove La Liga da temporada 23/24
    const result = syncSeasonTrophies(
      barcaCareer,
      "23/24",
      [],
      availableLeagues,
    );

    expect(result).toHaveLength(1);
    expect(result[0].leagueName).toBe("La Liga");
    expect(result[0].seasons).toEqual(["24/25"]);
  });

  it("esvazia os troféus da temporada se lista vier vazia sem afetar outras temporadas", () => {
    const barcaCareer: Career = career({
      clubName: "FC Barcelona",
      trophies: [
        {
          leagueName: "La Liga",
          leagueImage: "https://example.com/trophies/laliga.png",
          seasons: ["22/23", "23/24"],
        },
        {
          leagueName: "Supercopa da Espanha",
          leagueImage: "https://example.com/trophies/supercopa.png",
          seasons: ["23/24"],
        },
      ],
    });

    const result = syncSeasonTrophies(
      barcaCareer,
      "23/24",
      [],
      availableLeagues,
    );

    expect(result).toHaveLength(1);
    expect(result[0].leagueName).toBe("La Liga");
    expect(result[0].seasons).toEqual(["22/23"]);
  });

  it("adiciona novo troféu com imagem correta da liga da temporada", () => {
    const barcaCareer: Career = career({
      clubName: "FC Barcelona",
      trophies: [],
    });

    const result = syncSeasonTrophies(
      barcaCareer,
      "23/24",
      ["Copa del Rey"],
      availableLeagues,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      leagueName: "Copa del Rey",
      leagueImage: "https://example.com/trophies/copadelrey.png",
      seasons: ["23/24"],
    });
  });

  it("não duplica seasonName caso o troféu já esteja atribuído à temporada", () => {
    const barcaCareer: Career = career({
      clubName: "FC Barcelona",
      trophies: [
        {
          leagueName: "La Liga",
          leagueImage: "https://example.com/trophies/laliga.png",
          seasons: ["23/24"],
        },
      ],
    });

    const result = syncSeasonTrophies(
      barcaCareer,
      "23/24",
      ["La Liga"],
      availableLeagues,
    );

    expect(result).toHaveLength(1);
    expect(result[0].seasons).toEqual(["23/24"]);
  });
});

describe("Helper Puro removeAllTrophiesForSeason", () => {
  it("remove todas as menções à temporada de todos os troféus", () => {
    const barcaCareer: Career = career({
      clubName: "FC Barcelona",
      trophies: [
        {
          leagueName: "La Liga",
          leagueImage: "laliga.png",
          seasons: ["23/24", "24/25"],
        },
        {
          leagueName: "Copa del Rey",
          leagueImage: "copa.png",
          seasons: ["23/24"],
        },
      ],
    });

    const result = removeAllTrophiesForSeason(barcaCareer, "23/24");
    expect(result).toHaveLength(1);
    expect(result[0].leagueName).toBe("La Liga");
    expect(result[0].seasons).toEqual(["24/25"]);
  });

  it("retorna array vazio quando career.trophies não está definido", () => {
    const barcaCareer = career({ clubName: "FC Barcelona", trophies: undefined });
    expect(removeAllTrophiesForSeason(barcaCareer, "23/24")).toEqual([]);
  });
});

describe("ServiceCareer.syncSeasonTrophies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = { uid: "test-user" };
  });

  it("carrega carreira, reconcilia troféus e persiste com updateCareerTrophies", async () => {
    const barcaCareer = career({
      id: "barca-1",
      clubName: "FC Barcelona",
      trophies: [
        {
          leagueName: "La Liga",
          leagueImage: "laliga.png",
          seasons: ["23/24"],
        },
      ],
    });

    getDoc.mockResolvedValueOnce({
      id: "barca-1",
      exists: () => true,
      data: () => barcaCareer,
    } as never);

    const updated = await ServiceCareer.syncSeasonTrophies(
      "barca-1",
      "23/24",
      [],
    );

    expect(updated).toEqual([]);
    expect(updateCareerTrophies).toHaveBeenCalledWith(
      "test-user",
      "barca-1",
      [],
    );
  });
});

describe("Hook useSave - Salvamento e Esvaziamento de Títulos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite submeter lista vazia de títulos sem emitir toast.warning e chamando ServiceCareer.syncSeasonTrophies", async () => {
    const syncSpy = vi
      .spyOn(ServiceCareer, "syncSeasonTrophies")
      .mockResolvedValueOnce([]);
    const setViewMock = vi.fn();
    const setSelectedCareerMock = vi.fn();
    const barcaCareer = career({
      id: "barca-1",
      clubName: "FC Barcelona",
      trophies: [
        {
          leagueName: "La Liga",
          leagueImage: "laliga.png",
          seasons: ["23/24"],
        },
      ],
    });

    const { result } = renderHook(() =>
      useSave({
        setView: setViewMock,
        selectedCareer: barcaCareer,
        setSelectedCareer: setSelectedCareerMock,
      }),
    );

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.saveTrophies(fakeEvent, "barca-1", [], "23/24");
    });

    expect(toast.warning).not.toHaveBeenCalled();
    expect(syncSpy).toHaveBeenCalledWith("barca-1", "23/24", [], undefined);
    expect(setSelectedCareerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trophies: [],
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Títulos salvos com sucesso!");
    expect(setViewMock).toHaveBeenCalledWith("menu");
  });
});

describe("Hook useAddTrophies - Integração com Seleção e Exclusão", () => {
  const barcaCareer = career({
    id: "barca-1",
    clubName: "FC Barcelona",
    trophies: [
      {
        leagueName: "La Liga",
        leagueImage: "laliga.png",
        seasons: ["23/24"],
      },
      {
        leagueName: "Copa del Rey",
        leagueImage: "copa.png",
        seasons: ["23/24"],
      },
    ],
  });

  const seasonData: ClubData = {
    id: "s1",
    seasonNumber: 1,
    players: [],
    matches: [],
    leagues: [
      {
        name: "La Liga",
        trophy: "laliga.png",
        logo: "laliga_badge.png",
      },
      {
        name: "Copa del Rey",
        trophy: "copa.png",
        logo: "copa_badge.png",
      },
    ],
  };

  it("inicializa com os troféus já salvos para a temporada e permite remover um a um até esvaziar", async () => {
    const syncSpy = vi
      .spyOn(ServiceCareer, "syncSeasonTrophies")
      .mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAddTrophies({
        setView: vi.fn(),
        careerId: "barca-1",
        selectedCareer: barcaCareer,
        setSelectedCareer: vi.fn(),
        season: seasonData,
        seasonName: "23/24",
      }),
    );

    // Deve inicializar com os 2 títulos
    expect(result.current.selectedTrophies).toEqual(["La Liga", "Copa del Rey"]);

    // Remove Copa del Rey
    act(() => {
      result.current.removeTrophy("Copa del Rey");
    });
    expect(result.current.selectedTrophies).toEqual(["La Liga"]);

    // Remove La Liga
    act(() => {
      result.current.removeTrophy("La Liga");
    });
    expect(result.current.selectedTrophies).toEqual([]);

    // Salva com a lista vazia
    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.saveTrophies(fakeEvent);
    });

    expect(syncSpy).toHaveBeenCalledWith(
      "barca-1",
      "23/24",
      [],
      seasonData.leagues,
    );
  });
});
