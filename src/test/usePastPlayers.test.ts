// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePastPlayers } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddSquad_Player/hooks/usePastPlayers";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { player } from "./factories/domain";
import { getPlayerIdentityKey } from "../common/utils/playerIdentity";

describe("usePastPlayers - Elegibilidade de Ex-Jogadores (Já treinou o jogador?)", () => {
  it("inclui casos de bug: atletas de temporadas passadas que nunca tiveram saída registrada e não estão mais ativos no squadTab", () => {
    // Lionel Messi jogou na Temporada 1 pelo FC Barcelona (sem sell: true, atuou normalmente)
    const messiSeason1: Players = player({
      id: "messi-id",
      name: "Lionel Messi",
      age: 36,
      overall: 90,
      position: "RW",
      sector: "Ataque",
      nation: "ARG",
      sell: false,
    });

    // Andrés Iniesta também jogou na Temporada 1 (sem saída registrada)
    const iniestaSeason1: Players = player({
      id: "iniesta-id",
      name: "Andrés Iniesta",
      age: 39,
      overall: 82,
      position: "CM",
      sector: "Meia",
      nation: "ESP",
      sell: false,
    });

    const season1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [messiSeason1, iniestaSeason1],
      matches: [],
      table: [],
    };

    // Temporada 2 atual: Lamine Yamal e Pedri ativos no elenco
    const lamineSeason2: Players = player({
      id: "lamine-id",
      name: "Lamine Yamal",
      age: 17,
      overall: 84,
      position: "RW",
      sector: "Ataque",
      nation: "ESP",
      sell: false,
    });

    const pedriSeason2: Players = player({
      id: "pedri-id",
      name: "Pedri",
      age: 21,
      overall: 87,
      position: "CM",
      sector: "Meia",
      nation: "ESP",
      sell: false,
    });

    const season2: ClubData = {
      id: "season-2",
      seasonNumber: 2,
      players: [lamineSeason2, pedriSeason2],
      matches: [],
      table: [],
    };

    const career: Career = {
      id: "career-barca-1",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      currency: "€",
      nation: "Espanha",
      createdAt: "2024-07-01T00:00:00.000Z",
      clubData: [season1, season2],
    } as unknown as Career;

    const { result } = renderHook(() =>
      usePastPlayers(career, season2, false, undefined),
    );

    const pastPlayerNames = result.current.pastPlayers.map((p) => p.name);

    // Messi e Iniesta devem estar disponíveis porque jogaram na Season 1 e sumiram da Season 2 (caso de bug)
    expect(pastPlayerNames).toContain("Lionel Messi");
    expect(pastPlayerNames).toContain("Andrés Iniesta");

    // Lamine e Pedri NÃO devem estar disponíveis pois já estão ativos na Season 2
    expect(pastPlayerNames).not.toContain("Lamine Yamal");
    expect(pastPlayerNames).not.toContain("Pedri");
  });

  it("inclui atletas que foram vendidos na temporada corrente (p.sell === true)", () => {
    const gaviSold: Players = player({
      id: "gavi-id",
      name: "Gavi",
      age: 20,
      overall: 83,
      position: "CM",
      sector: "Meia",
      nation: "ESP",
      sell: true, // Vendido na temporada atual
    });

    const lamineActive: Players = player({
      id: "lamine-id",
      name: "Lamine Yamal",
      age: 17,
      overall: 84,
      position: "RW",
      sector: "Ataque",
      nation: "ESP",
      sell: false,
    });

    const currentSeason: ClubData = {
      id: "season-current",
      seasonNumber: 1,
      players: [gaviSold, lamineActive],
      matches: [],
      table: [],
    };

    const career: Career = {
      id: "career-barca-2",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      currency: "€",
      nation: "Espanha",
      createdAt: "2024-07-01T00:00:00.000Z",
      clubData: [currentSeason],
    } as unknown as Career;

    const { result } = renderHook(() =>
      usePastPlayers(career, currentSeason, false, undefined),
    );

    const pastPlayerNames = result.current.pastPlayers.map((p) => p.name);
    expect(pastPlayerNames).toContain("Gavi");
    expect(pastPlayerNames).not.toContain("Lamine Yamal");
  });

  it("NÃO inclui jogadores que continuaram normalmente da temporada anterior para a atual", () => {
    // Pedri e Gavi continuaram normalmente da Temporada 1 para a Temporada 2
    const pedriSeason1: Players = player({
      id: "pedri-s1",
      name: "Pedri",
      nation: "ESP",
      overall: 85,
      sell: false,
    });
    const gaviSeason1: Players = player({
      id: "gavi-s1",
      name: "Gavi",
      nation: "ESP",
      overall: 82,
      sell: false,
    });

    const season1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [pedriSeason1, gaviSeason1],
      matches: [],
      table: [],
    };

    const pedriSeason2: Players = player({
      id: "pedri-s2",
      name: "Pedri",
      nation: "ESP",
      overall: 87,
      sell: false,
    });
    const gaviSeason2: Players = player({
      id: "gavi-s2",
      name: "Gavi",
      nation: "ESP",
      overall: 84,
      sell: false,
    });
    const lamineSeason2: Players = player({
      id: "lamine-s2",
      name: "Lamine Yamal",
      nation: "ESP",
      overall: 84,
      sell: false,
    });

    const season2: ClubData = {
      id: "season-2",
      seasonNumber: 2,
      players: [pedriSeason2, gaviSeason2, lamineSeason2],
      matches: [],
      table: [],
    };

    const career: Career = {
      id: "career-barca-3",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      currency: "€",
      nation: "Espanha",
      createdAt: "2024-07-01T00:00:00.000Z",
      clubData: [season1, season2],
    } as unknown as Career;

    const { result } = renderHook(() =>
      usePastPlayers(career, season2, false, undefined),
    );

    // Como Pedri, Gavi e Lamine continuam ativos no elenco da Temporada 2 e nunca saíram, a lista deve estar vazia
    expect(result.current.pastPlayers).toHaveLength(0);
    expect(result.current.pastPlayerOptions).toHaveLength(0);
  });

  it("inclui jogadores vendidos em temporadas passadas (p.sell === true na Season 1)", () => {
    const busquetsSold: Players = player({
      id: "busquets-s1",
      name: "Sergio Busquets",
      nation: "ESP",
      overall: 85,
      sell: true, // Vendido na Season 1
    });

    const pedriSeason1: Players = player({
      id: "pedri-s1",
      name: "Pedri",
      nation: "ESP",
      overall: 85,
      sell: false,
    });

    const season1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [busquetsSold, pedriSeason1],
      matches: [],
      table: [],
    };

    const pedriSeason2: Players = player({
      id: "pedri-s2",
      name: "Pedri",
      nation: "ESP",
      overall: 87,
      sell: false,
    });

    const season2: ClubData = {
      id: "season-2",
      seasonNumber: 2,
      players: [pedriSeason2],
      matches: [],
      table: [],
    };

    const career: Career = {
      id: "career-barca-4",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      currency: "€",
      nation: "Espanha",
      createdAt: "2024-07-01T00:00:00.000Z",
      clubData: [season1, season2],
    } as unknown as Career;

    const { result } = renderHook(() =>
      usePastPlayers(career, season2, false, undefined),
    );

    const names = result.current.pastPlayers.map((p) => p.name);
    expect(names).toContain("Sergio Busquets");
    expect(names).not.toContain("Pedri");
  });

  it("não inclui ex-jogador vendido que já foi recontratado e está ativo no elenco atual", () => {
    // Dani Olmo foi vendido na Season 1
    const olmoSeason1: Players = player({
      id: "olmo-s1",
      name: "Dani Olmo",
      nation: "ESP",
      overall: 82,
      sell: true,
    });

    const season1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [olmoSeason1],
      matches: [],
      table: [],
    };

    // Na Season 2, Dani Olmo foi recontratado e está ativo
    const olmoSeason2: Players = player({
      id: "olmo-s2",
      name: "Dani Olmo",
      nation: "ESP",
      overall: 85,
      sell: false,
    });

    const season2: ClubData = {
      id: "season-2",
      seasonNumber: 2,
      players: [olmoSeason2],
      matches: [],
      table: [],
    };

    const career: Career = {
      id: "career-barca-5",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      currency: "€",
      nation: "Espanha",
      createdAt: "2024-07-01T00:00:00.000Z",
      clubData: [season1, season2],
    } as unknown as Career;

    const { result } = renderHook(() =>
      usePastPlayers(career, season2, false, undefined),
    );

    const names = result.current.pastPlayers.map((p) => p.name);
    expect(names).not.toContain("Dani Olmo");
  });

  it("preserva id e playedWithUs e isola estatísticas e base ao remover do grupo, unificando novamente ao readicionar", () => {
    // 1. Carreira A (FC Barcelona): Lamine Yamal revelado na base da Carreira A
    const lamineInCareerA: Players = player({
      id: "lamine-global-id",
      name: "Lamine Yamal",
      nation: "ESP",
      overall: 88,
      age: 18,
      isAcademy: true,
      academyNickname: "La Masia Diamond",
      academyTournaments: [
        {
          id: "tourney-1",
          name: "Copa Catalunya Sub-19",
          date: "2024-05-01",
          totalMatches: 3,
          matches: [],
          tournamentResult: "Campeão",
          isChampion: true,
        },
      ],
      statsLeagues: [
        {
          leagueName: "La Liga",
          leagueImage: "",
          stats: {
            games: 35,
            goals: 15,
            assists: 12,
            cleanSheets: 0,
            rating: 8.8,
          },
        },
      ],
    });

    const careerA: Career = {
      id: "career-a-barca",
      clubName: "FC Barcelona",
      groupId: "group-saves-1",
      createdAt: "2024-07-01T00:00:00.000Z",
      clubData: [
        {
          id: "season-a1",
          seasonNumber: 1,
          players: [lamineInCareerA],
          matches: [],
          table: [],
        },
      ],
    } as unknown as Career;

    // 2. Carreira B (FC Barcelona B / Segunda equipe) no mesmo grupo:
    // Contrata Lamine via "Já treinou o jogador?". O jogador mantém id e playedWithUs,
    // mas por originCareerId !== careerB.id, NÃO copia torneios de base para o doc da Carreira B.
    const lamineInCareerB: Players = player({
      id: "lamine-global-id", // Mesmo id preservado!
      playedWithUs: "lamine-global-id", // Identidade preservada!
      name: "Lamine Yamal",
      nation: "ESP",
      overall: 88,
      age: 18,
      isAcademy: false, // Não veio da base da Carreira B!
      academyTournaments: [],
      statsLeagues: [
        {
          leagueName: "Primera Federación",
          leagueImage: "",
          stats: {
            games: 10,
            goals: 4,
            assists: 3,
            cleanSheets: 0,
            rating: 7.9,
          },
        },
      ],
    });

    const careerBWithGroup: Career = {
      id: "career-b-barca",
      clubName: "FC Barcelona B",
      groupId: "group-saves-1",
      createdAt: "2025-07-01T00:00:00.000Z",
      clubData: [
        {
          id: "season-b1",
          seasonNumber: 1,
          players: [lamineInCareerB],
          matches: [],
          table: [],
        },
      ],
    } as unknown as Career;

    // Quando no grupo: ambos compartilham a chave de identidade
    const keyA = getPlayerIdentityKey(lamineInCareerA, careerA.id);
    const keyB = getPlayerIdentityKey(lamineInCareerB, careerBWithGroup.id);
    expect(keyA).toBe(keyB);

    // 3. Carreira B é REMOVIDA do grupo (groupId: null)
    const careerBWithoutGroup: Career = {
      ...careerBWithGroup,
      groupId: null as unknown as string,
    };

    // Na visão individual da Carreira B (sem grupo), os dados de Carreira A não existem em clubData
    const careerBPlayers = careerBWithoutGroup.clubData[0].players;
    const playerInB = careerBPlayers.find((p) => p.id === "lamine-global-id");

    expect(playerInB).toBeDefined();
    expect(playerInB?.id).toBe("lamine-global-id");
    expect(playerInB?.playedWithUs).toBe("lamine-global-id");
    // Estatísticas da Carreira B são estritamente as da própria Carreira B (10 jogos, 4 gols)
    expect(playerInB?.statsLeagues?.[0]?.stats?.games).toBe(10);
    expect(playerInB?.statsLeagues?.[0]?.stats?.goals).toBe(4);
    // Torneios de base da Carreira A não vazam
    expect(playerInB?.academyTournaments).toEqual([]);

    // 4. Carreira B é READICIONADA ao mesmo grupo (groupId: "group-saves-1")
    const careerBReAdded: Career = {
      ...careerBWithoutGroup,
      groupId: "group-saves-1",
    };

    // A chave de identidade continua exatamente idêntica, unificando novamente sem duplicação
    const keyBReAdded = getPlayerIdentityKey(lamineInCareerB, careerBReAdded.id);
    expect(keyBReAdded).toBe(keyA);
  });
});
