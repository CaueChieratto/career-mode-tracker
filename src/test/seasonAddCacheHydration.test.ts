// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import {
  clearGettersCache,
  getAllCareers,
} from "../common/helpers/Getters";
import { useCareers } from "../common/hooks/Career/UseCareer";
import { ServiceCareer } from "../common/services/ServiceCareer";
import { auth } from "./mocks/firebaseClient";
import {
  writeBatch,
  arrayUnion,
  onSnapshot,
  querySnapshot,
} from "./mocks/firestore";
import { career, player, season } from "./factories/domain";
import { Career } from "../common/interfaces/Career";
import { AcademyPlayers } from "../common/interfaces/AcademyData";

describe("ServiceSeasons.addSeason - hidratação de estado e cache em memória (Padrão FC Barcelona)", () => {
  beforeEach(() => {
    auth.currentUser = { uid: "test-user" };
    clearGettersCache();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    clearGettersCache();
  });

  it("popula a nova temporada com elenco e base no estado e no listCareersCache para evitar temporada vazia antes de F5", async () => {
    const batchSet = vi.fn();
    const batchUpdate = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    writeBatch.mockReturnValue({
      set: batchSet,
      update: batchUpdate,
      commit,
    } as never);
    arrayUnion.mockClear();

    const yamal = player({
      id: "p_yamal",
      name: "Lamine Yamal",
      overall: 88,
      age: 18,
      position: "PD",
      sector: "Ataque",
      salary: 200_000,
      contractTime: 5,
    });
    const pedri = player({
      id: "p_pedri",
      name: "Pedri González",
      overall: 89,
      age: 22,
      position: "MC",
      sector: "Meio-Campo",
      salary: 220_000,
      contractTime: 5,
    });
    const toniFernandez: AcademyPlayers = {
      id: "acad_toni",
      name: "Toni Fernández",
      overall: 71,
      potential: 86,
      age: 17,
      position: "MEI",
      sector: "Meio-Campo",
      nation: "ESP",
      shirtNumber: "42",
      status: "academy",
      seasonsInAcademy: 1,
      evolutionHistory: [],
    } as unknown as AcademyPlayers;

    const season1 = season({
      id: "season-1",
      seasonNumber: 1,
      players: [yamal, pedri],
      academyPlayers: [toniFernandez],
      leagues: [
        { name: "LaLiga", logo: "", trophy: "", league: true, isFirstDivision: true },
      ],
    });

    const barcaCareer = career({
      id: "c_barca",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      nation: "Espanha",
      createdAt: new Date("2025-07-01"),
      updatedAt: 1000,
      academy: {
        name: "La Masia",
        tournament: "UEFA Youth League",
        nickname: "Barça Atlètic",
      },
      clubData: [season1],
    });

    let snapshotCb: ((snap: unknown) => Promise<void>) | undefined;
    onSnapshot.mockImplementation((_q: unknown, cb: unknown) => {
      snapshotCb = cb as (snap: unknown) => Promise<void>;
      return () => {};
    });

    vi.spyOn(ServiceCareer, "getAll").mockImplementation((cb) => {
      cb([barcaCareer]);
      return () => {};
    });

    const { result } = renderHook(() => useCareers(true));
    expect(result.current.careers).toHaveLength(1);

    await act(async () => {
      await ServiceSeasons.addSeason(barcaCareer);
    });

    // 1. O arrayUnion persistido no doc da carreira continua enxuto (players: [])
    const arrayUnionArg = arrayUnion.mock.calls[0][0] as {
      id: string;
      players: unknown[];
    };
    expect(arrayUnionArg.id).toBe("season-2");
    expect(arrayUnionArg.players).toEqual([]);

    // 2. O estado reativo do useCareers já recebeu a season-2 hidratada
    const stateSeason2 = result.current.careers[0].clubData.find(
      (s) => s.id === "season-2",
    );
    expect(stateSeason2).toBeDefined();
    expect(stateSeason2?.players.map((p) => p.name)).toEqual([
      "Lamine Yamal",
      "Pedri González",
    ]);
    expect(stateSeason2?.academyPlayers?.map((a) => a.name)).toEqual([
      "Toni Fernández",
    ]);
    expect(stateSeason2?.matches).toEqual([]);
    expect(stateSeason2?.table).toEqual([]);

    // 3. Mesmo quando o snapshot do Firestore chega com updatedAt === now e players: [],
    //    o hit no listCareersCache entrega a season-2 hidratada (não vazia!)
    const updatedAtSaved = (
      batchUpdate.mock.calls[0][1] as { updatedAt: number }
    ).updatedAt;

    let careersFromListener: Career[] = [];
    getAllCareers("test-user", (loaded) => {
      careersFromListener = loaded;
    });

    await act(async () => {
      await snapshotCb!(
        querySnapshot([
          {
            id: "c_barca",
            data: {
              ...barcaCareer,
              updatedAt: updatedAtSaved,
              clubData: [
                { ...season1, players: [], academyPlayers: undefined },
                arrayUnionArg,
              ],
            },
          },
        ]),
      );
    });

    const cachedSeason2 = careersFromListener[0].clubData.find(
      (s) => s.id === "season-2",
    );
    expect(cachedSeason2).toBeDefined();
    expect(cachedSeason2?.players.map((p) => p.name)).toEqual([
      "Lamine Yamal",
      "Pedri González",
    ]);
    expect(cachedSeason2?.academyPlayers?.map((a) => a.name)).toEqual([
      "Toni Fernández",
    ]);
  });
});
