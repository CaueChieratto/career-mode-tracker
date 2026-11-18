import { describe, it, expect } from "vitest";
import { calculatePlayerAge } from "../common/utils/calculatePlayerAge";
import { Match } from "../common/interfaces/Match";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";

describe("Item 5 - calculatePlayerAge (Marco Temporal de Temporada e Aniversário em Partidas)", () => {
  const careerCreatedAt = "2026-07-01T00:00:00.000Z";

  it("calcula idade exata para data de nascimento padrão no Brasil (DD/MM/AAAA) quando aniversário já ocorreu antes de 01/07", () => {
    // Nascido em 02/01/1992 em carreira iniciada em 01/07/2024
    const age = calculatePlayerAge("02/01/1992", "2024-07-01", 1, "ESP");
    expect(age).toBe(32);
  });

  it("cumpre o exemplo oficial do usuário: nascido em 14/11/2003 tem 22 anos em 01/07/2026 e 23 anos após partida finalizada em 14/11", () => {
    // 1. Início da temporada 1 (01/07/2026) sem partidas
    const ageNoMatches = calculatePlayerAge(
      "14/11/2003",
      careerCreatedAt,
      1,
      "ESP",
      [],
    );
    expect(ageNoMatches).toBe(22);

    // 2. Partida finalizada em 10/10/2026 (antes do aniversário de 14/11)
    const matchesBeforeBirthday: Match[] = [
      {
        matchesId: "m1",
        date: "10/10/2026",
        status: "FINISHED",
        homeTeam: "FC Barcelona",
        awayTeam: "Sevilla",
        result: "V",
      } as Match,
    ];
    const ageBeforeBirthday = calculatePlayerAge(
      "14/11/2003",
      careerCreatedAt,
      1,
      "ESP",
      matchesBeforeBirthday,
    );
    expect(ageBeforeBirthday).toBe(22);

    // 3. Partida finalizada exatamente no dia do aniversário (14/11/2026)
    const matchesOnBirthday: Match[] = [
      ...matchesBeforeBirthday,
      {
        matchesId: "m2",
        date: "14/11/2026",
        status: "FINISHED",
        homeTeam: "FC Barcelona",
        awayTeam: "Real Madrid",
        result: "V",
      } as Match,
    ];
    const ageOnBirthday = calculatePlayerAge(
      "14/11/2003",
      careerCreatedAt,
      1,
      "ESP",
      matchesOnBirthday,
    );
    expect(ageOnBirthday).toBe(23);

    // 4. Partida finalizada após o aniversário (20/12/2026)
    const matchesAfterBirthday: Match[] = [
      ...matchesOnBirthday,
      {
        matchesId: "m3",
        date: "20/12/2026",
        status: "FINISHED",
        homeTeam: "FC Barcelona",
        awayTeam: "Atlético de Madrid",
        result: "V",
      } as Match,
    ];
    const ageAfterBirthday = calculatePlayerAge(
      "14/11/2003",
      careerCreatedAt,
      1,
      "ESP",
      matchesAfterBirthday,
    );
    expect(ageAfterBirthday).toBe(23);
  });

  it("não incrementa idade para partidas agendadas (SCHEDULED)", () => {
    const scheduledMatches: Match[] = [
      {
        matchesId: "m_sched",
        date: "25/11/2026",
        status: "SCHEDULED",
        homeTeam: "FC Barcelona",
        awayTeam: "Valencia",
      } as Match,
    ];
    const age = calculatePlayerAge(
      "14/11/2003",
      careerCreatedAt,
      1,
      "ESP",
      scheduledMatches,
    );
    expect(age).toBe(22);
  });

  it("incrementa a idade corretamente ao avançar de temporada", () => {
    // 15/04/2000: em 01/07/2024 já completou 24 anos em abril
    const ageSeason1 = calculatePlayerAge("15/04/2000", "2024-07-01", 1, "ESP");
    const ageSeason2 = calculatePlayerAge("15/04/2000", "2024-07-01", 2, "ESP");
    const ageSeason5 = calculatePlayerAge("15/04/2000", "2024-07-01", 5, "ESP");

    expect(ageSeason1).toBe(24);
    expect(ageSeason2).toBe(25);
    expect(ageSeason5).toBe(28);
  });

  it("calcula corretamente para calendário não-europeu (início em 01/01)", () => {
    // Carreira no Brasil (início 01/01/2026)
    // Nascido em 14/11/2003: em 01/01/2026 tem 22 anos
    const ageJan = calculatePlayerAge("14/11/2003", "2026-01-01", 1, "BRA", []);
    expect(ageJan).toBe(22);

    // Partida no Brasileirão em 20/11/2026: completa 23 anos
    const matchesBR: Match[] = [
      {
        matchesId: "m_br",
        date: "20/11/2026",
        status: "FINISHED",
        homeTeam: "Santos",
        awayTeam: "Palmeiras",
        result: "V",
      } as Match,
    ];
    const ageNov = calculatePlayerAge(
      "14/11/2003",
      "2026-01-01",
      1,
      "BRA",
      matchesBR,
    );
    expect(ageNov).toBe(23);
  });

  it("retorna 0 para datas vazias, nulas ou indefinidas", () => {
    expect(calculatePlayerAge(null, careerCreatedAt, 1)).toBe(0);
    expect(calculatePlayerAge(undefined, careerCreatedAt, 1)).toBe(0);
    expect(calculatePlayerAge("", careerCreatedAt, 1)).toBe(0);
  });

  it("retorna 0 para formatos de data inválidos sem barras", () => {
    expect(calculatePlayerAge("19920102", careerCreatedAt, 1)).toBe(0);
    expect(calculatePlayerAge("invalid-date", careerCreatedAt, 1)).toBe(0);
    expect(calculatePlayerAge("02-01-1992", careerCreatedAt, 1)).toBe(0);
  });

  it("retorna 0 para dia ou mês fora do intervalo válido", () => {
    expect(calculatePlayerAge("32/01/1995", careerCreatedAt, 1)).toBe(0);
    expect(calculatePlayerAge("00/05/1995", careerCreatedAt, 1)).toBe(0);
    expect(calculatePlayerAge("15/13/1995", careerCreatedAt, 1)).toBe(0);
    expect(calculatePlayerAge("15/00/1995", careerCreatedAt, 1)).toBe(0);
  });

  it("retorna 0 para anos fora do intervalo histórico plausível (1900-2100)", () => {
    expect(calculatePlayerAge("01/01/1850", careerCreatedAt, 1)).toBe(0);
    expect(calculatePlayerAge("01/01/2250", careerCreatedAt, 1)).toBe(0);
  });

  it("lida com Date object e garante que idade não seja negativa para nascimentos no futuro", () => {
    const careerDate = new Date("2024-01-01");
    const futureAge = calculatePlayerAge("01/01/2030", careerDate, 1);
    expect(futureAge).toBe(0);
  });

  it("mapPlayerToFormValues recalcula idade dinamicamente quando birthDate está presente", async () => {
    const { mapPlayerToFormValues } = await import(
      "../common/helpers/Mappers"
    );
    const mockCareer = {
      id: "career-barca",
      clubName: "FC Barcelona",
      nation: "ESP",
      createdAt: "2026-07-01T00:00:00.000Z",
    } as unknown as Career;

    const mockFinishedMatch: Match = {
      matchesId: "m1",
      date: "20/11/2026",
      status: "FINISHED",
      result: "V",
      homeTeam: "FC Barcelona",
      awayTeam: "Sevilla",
    } as Match;

    const mockSeason = {
      id: "season-1",
      seasonNumber: 1,
      players: [],
      matches: [mockFinishedMatch],
      table: [],
    } as unknown as ClubData;

    // Lamine Yamal: nascido em 14/11/2003, idade salva estaticamente 22, mas com jogo em 20/11/2026 fez 23
    const mockPlayer = {
      id: "lamine-1",
      name: "Lamine Yamal",
      age: 22,
      birthDate: "14/11/2003",
      overall: 85,
      position: "RW",
      sector: "Ataque",
      contract: [],
    } as unknown as Players;

    const formValues = mapPlayerToFormValues(
      mockPlayer,
      "EUR",
      2026,
      mockCareer,
      mockSeason,
    );

    expect(formValues.age).toBe("23");
  });
});
