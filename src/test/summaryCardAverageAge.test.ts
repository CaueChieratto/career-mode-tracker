// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Career } from "../common/interfaces/Career";
import type { ClubData } from "../common/interfaces/club/clubData";
import type { Match } from "../common/interfaces/Match";
import type { Players } from "../common/interfaces/playersInfo/players";
import { useSummaryData } from "../layout/SectionView/features/ClubTabs/GeneralTab/components/SummaryCard/hooks/UseSummaryData";

const makePlayer = (overrides: Partial<Players>): Players =>
  ({
    id: "p-1",
    name: "Pedri",
    overall: 88,
    position: "MC",
    sector: "Meia",
    age: 23,
    nation: "ESP",
    shirtNumber: "8",
    buy: false,
    captain: false,
    sell: false,
    ballonDor: 0,
    contract: [],
    statsLeagues: [],
    salary: 200000,
    playerValue: 100000000,
    ...overrides,
  }) as Players;

const barcaCareer = {
  id: "career-barca",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  nation: "Espanha",
  currency: "EUR",
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
} as Career;

describe("SummaryCard / useSummaryData - cálculo da média de idade", () => {
  it("calcula a média de idade dinamicamente por birthDate (incluindo aniversário após partida finalizada)", () => {
    const finishedMatch = {
      matchesId: "m-1",
      date: "20/11/2026",
      status: "FINISHED",
      result: "V",
      homeTeam: "FC Barcelona",
      awayTeam: "Sevilla FC",
    } as Match;

    const season = {
      id: "season-1",
      seasonNumber: 1,
      matches: [finishedMatch],
      players: [
        // Nascido em 13/07/2007 -> em 20/11/2026 tem 19 anos (mesmo se age salvo for 0/antigo)
        makePlayer({
          id: "lamine",
          name: "Lamine Yamal",
          birthDate: "13/07/2007",
          age: 0,
        }),
        // Nascido em 25/11/2002 -> em 20/11/2026 ainda tem 23 anos
        makePlayer({
          id: "pedri",
          name: "Pedri",
          birthDate: "25/11/2002",
          age: 22,
        }),
      ],
    } as unknown as ClubData;

    const { result } = renderHook(() => useSummaryData(season, barcaCareer));
    const avgItem = result.current.content.find(
      (item) => item.info === "Média de idade",
    );

    expect(avgItem?.number).toBe("21.0");
  });

  it("não retorna NaN quando há jogador com age undefined, NaN ou string numérica", () => {
    const season = {
      id: "season-1",
      seasonNumber: 1,
      matches: [],
      players: [
        makePlayer({ id: "gavi", name: "Gavi", age: 21 }),
        makePlayer({
          id: "fati",
          name: "Ansu Fati",
          age: undefined as unknown as number,
        }),
        makePlayer({
          id: "cubarsi",
          name: "Pau Cubarsí",
          age: "19" as unknown as number,
        }),
        makePlayer({
          id: "balde",
          name: "Alejandro Balde",
          age: 0,
        }),
      ],
    } as unknown as ClubData;

    const { result } = renderHook(() => useSummaryData(season, barcaCareer));
    const avgItem = result.current.content.find(
      (item) => item.info === "Média de idade",
    );

    // Média dos 2 atletas com idade válida (21 e 19) = 20.0
    expect(avgItem?.number).toBe("20.0");
  });

  it("suporta career.createdAt no formato Firestore Timestamp e ignora jogadores vendidos", () => {
    const careerWithTimestamp = {
      ...barcaCareer,
      createdAt: {
        seconds: Math.floor(new Date("2026-07-01T00:00:00.000Z").getTime() / 1000),
        nanoseconds: 0,
      },
    } as unknown as Career;

    const season = {
      id: "season-1",
      seasonNumber: 1,
      matches: [],
      players: [
        makePlayer({
          id: "lamine",
          name: "Lamine Yamal",
          birthDate: "13/07/2007",
          age: undefined as unknown as number,
        }),
        makePlayer({
          id: "vendido",
          name: "Ex-Jogador",
          age: 35,
          sell: true,
        }),
      ],
    } as unknown as ClubData;

    const { result } = renderHook(() =>
      useSummaryData(season, careerWithTimestamp),
    );
    const totalItem = result.current.content.find(
      (item) => item.info === "Total de jogadores",
    );
    const avgItem = result.current.content.find(
      (item) => item.info === "Média de idade",
    );

    expect(totalItem?.number).toBe(1);
    // Em 01/07/2026 quem nasceu em 13/07/2007 tem 18 anos
    expect(avgItem?.number).toBe("18.0");
  });

  it("retorna '0.0' quando não há jogadores ativos com idade válida", () => {
    const season = {
      id: "season-1",
      seasonNumber: 1,
      matches: [],
      players: [],
    } as unknown as ClubData;

    const { result } = renderHook(() => useSummaryData(season, barcaCareer));
    const avgItem = result.current.content.find(
      (item) => item.info === "Média de idade",
    );

    expect(avgItem?.number).toBe("0.0");
  });
});
