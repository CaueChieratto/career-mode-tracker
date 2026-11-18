// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSectionCareer } from "../layout/SectionView/hooks/useSectionCareer";
import { Career } from "../common/interfaces/Career";
import { Players } from "../common/interfaces/playersInfo/players";
import { Match } from "../common/interfaces/Match";
import { TableRowData } from "../common/interfaces/Table";

vi.mock("../common/services/ServicePlayers", () => ({
  ServicePlayers: {
    getPlayersBySeason: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../common/services/ServiceFinance", () => ({
  ServiceFinance: {
    getReportBySeason: vi.fn().mockResolvedValue({ entries: [] }),
  },
}));

vi.mock("../common/services/ServiceMatches", () => ({
  ServiceMatches: {
    getMatchesBySeason: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../common/services/ServiceTable", () => ({
  ServiceTable: {
    getTableBySeason: vi.fn().mockResolvedValue([]),
  },
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

const mockPlayerLamine: Players = {
  id: "lamine-19",
  name: "Lamine Yamal",
  position: "ED",
  sector: "Ataque",
  overall: 88,
  age: 18,
  nation: "Espanha",
  shirtNumber: "19",
  ballonDor: 0,
  buy: false,
  captain: false,
  sell: false,
  contract: [],
  statsLeagues: [],
};

const mockMatch1: Match = {
  matchesId: "match-1",
  homeTeam: "FC Barcelona",
  awayTeam: "Sevilla FC",
  homeScore: 3,
  awayScore: 0,
  date: "2026-09-15",
  league: "La Liga",
  result: "win" as unknown as Match["result"],
  status: "finished" as unknown as Match["status"],
};

const mockMatch2: Match = {
  matchesId: "match-2",
  homeTeam: "Valencia CF",
  awayTeam: "FC Barcelona",
  homeScore: 1,
  awayScore: 4,
  date: "2026-09-22",
  league: "La Liga",
  result: "win" as unknown as Match["result"],
  status: "finished" as unknown as Match["status"],
};

const mockTable1: TableRowData = {
  id: "fc-barcelona",
  name: "FC Barcelona",
  position: 1,
  points: 3,
  played: 1,
  won: 1,
  drawn: 0,
  lost: 0,
  goalsFor: 3,
  goalsAgainst: 0,
  goalDiff: 3,
  zone: "champions",
  badge: "barca.png",
};

const mockTable2: TableRowData = {
  ...mockTable1,
  points: 6,
  played: 2,
  won: 2,
  goalsFor: 7,
  goalsAgainst: 1,
  goalDiff: 6,
};

describe("useSectionCareer Reconciliation", () => {
  it("atualiza players, matches e table imediatamente quando nova prop com updatedAt superior chega do Firestore", () => {
    const initialCareer: Career = {
      id: "career-barca",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      createdAt: new Date("2026-07-01"),
      teamBadge: "barca.png",
      nation: "Espanha",
      updatedAt: 1000,
      colorsTeams: [],
      trophies: [],
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          players: [mockPlayerPedri],
          matches: [mockMatch1],
          table: [mockTable1],
        },
      ],
    };

    const { result, rerender } = renderHook(
      ({ careerProp }) => useSectionCareer(careerProp, "season-1"),
      { initialProps: { careerProp: initialCareer } },
    );

    expect(result.current.localCareer.clubData[0].players).toHaveLength(1);
    expect(result.current.localCareer.clubData[0].players[0].name).toBe("Pedri");
    expect(result.current.localCareer.clubData[0].matches).toHaveLength(1);
    expect(result.current.localCareer.clubData[0].table).toHaveLength(1);

    // Simula chegada de snapshot fresco do Firestore com updatedAt mais recente
    const updatedCareerFromFirestore: Career = {
      ...initialCareer,
      updatedAt: 2000,
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          players: [mockPlayerPedri, mockPlayerLamine],
          matches: [mockMatch1, mockMatch2],
          table: [mockTable2],
        },
      ],
    };

    rerender({ careerProp: updatedCareerFromFirestore });

    // Sem necessidade de F5, os dados frescos do Firestore devem ser adotados
    expect(result.current.localCareer.clubData[0].players).toHaveLength(2);
    expect(result.current.localCareer.clubData[0].players[1].name).toBe("Lamine Yamal");
    expect(result.current.localCareer.clubData[0].matches).toHaveLength(2);
    expect(result.current.localCareer.clubData[0].table?.[0].points).toBe(6);
  });

  it("preserva mutação otimista recente contra snapshot stale com timestamp inferior", () => {
    const baseCareer: Career = {
      id: "career-barca",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      createdAt: new Date("2026-07-01"),
      teamBadge: "barca.png",
      nation: "Espanha",
      updatedAt: 1000,
      colorsTeams: [],
      trophies: [],
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          players: [mockPlayerPedri],
          matches: [mockMatch1],
        },
      ],
    };

    const { result, rerender } = renderHook(
      ({ careerProp }) => useSectionCareer(careerProp, "season-1"),
      { initialProps: { careerProp: baseCareer } },
    );

    // Aplica atualização otimista (ex: Lamine Yamal contratado/adicionado)
    act(() => {
      result.current.updateMatchesOptimistically(
        {
          type: "ADD_PLAYER",
          player: mockPlayerLamine,
        },
        "season-1",
      );
    });

    expect(result.current.localCareer.clubData[0].players).toHaveLength(2);
    expect(result.current.localCareer.clubData[0].players[1].name).toBe("Lamine Yamal");

    // Simula prop recebida com timestamp antigo (stale snapshot antes do commit propagar)
    const staleSnapshotCareer: Career = {
      ...baseCareer,
      updatedAt: 900,
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          players: [mockPlayerPedri],
          matches: [mockMatch1],
        },
      ],
    };

    rerender({ careerProp: staleSnapshotCareer });

    // O estado otimista deve ser preservado e não revertido pelo snapshot antigo
    expect(result.current.localCareer.clubData[0].players).toHaveLength(2);
    expect(result.current.localCareer.clubData[0].players[1].name).toBe("Lamine Yamal");
  });

  it("preserva players e matches locais quando snapshot com updatedAt superior chega com metadados sem subcoleções hidratadas (players: [])", () => {
    const baseCareer: Career = {
      id: "career-barca",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      createdAt: new Date("2026-07-01"),
      teamBadge: "barca.png",
      nation: "Espanha",
      updatedAt: 1000,
      colorsTeams: [],
      trophies: [],
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          players: [mockPlayerPedri, mockPlayerLamine],
          matches: [mockMatch1],
        },
      ],
    };

    const { result, rerender } = renderHook(
      ({ careerProp }) => useSectionCareer(careerProp, "season-1"),
      { initialProps: { careerProp: baseCareer } },
    );

    expect(result.current.localCareer.clubData[0].players).toHaveLength(2);

    // Simula prop recebida com timestamp mais recente (ex: atualização de metadados como capitães ou moedas)
    // onde o documento cru do Firestore traz players como [] por estarem na subcoleção moderna
    const metadataUpdateCareer: Career = {
      ...baseCareer,
      updatedAt: 2000,
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          captains: ["pedri-8"],
          players: [], // subcoleção não hidratada neste snapshot cru
          matches: [],
        },
      ],
    };

    rerender({ careerProp: metadataUpdateCareer });

    // Os players e partidas que já estavam carregados na sessão NÃO devem sumir!
    expect(result.current.localCareer.clubData[0].players).toHaveLength(2);
    expect(result.current.localCareer.clubData[0].players[0].name).toBe("Pedri");
    expect(result.current.localCareer.clubData[0].players[1].name).toBe("Lamine Yamal");
    expect(result.current.localCareer.clubData[0].matches).toHaveLength(1);
    expect(result.current.localCareer.clubData[0].captains).toEqual(["pedri-8"]);
  });
});
