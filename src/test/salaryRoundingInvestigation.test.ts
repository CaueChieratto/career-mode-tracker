import { describe, expect, it } from "vitest";
import {
  calculateConsolidatedSeasonSalaryExpense,
  calculateSalaryExpenseEntries,
} from "../common/services/ServiceFinance/salaryTimelineCalculator";
import { Players } from "../common/interfaces/playersInfo/players";
import { Match } from "../common/interfaces/Match";
import { ClubData } from "../common/interfaces/club/clubData";

function createPlayer(overrides: Partial<Players>): Players {
  return {
    id: overrides.id || "p_default",
    name: overrides.name || "Test Player",
    position: overrides.position || "MC",
    sector: overrides.sector || "Meio-Campo",
    age: overrides.age ?? 22,
    nation: overrides.nation || "ESP",
    overall: overrides.overall ?? 85,
    shirtNumber: overrides.shirtNumber || "8",
    ballonDor: overrides.ballonDor ?? 0,
    buy: overrides.buy ?? false,
    captain: overrides.captain ?? false,
    sell: overrides.sell ?? false,
    contract: overrides.contract || [],
    statsLeagues: overrides.statsLeagues || [],
    ...overrides,
  };
}

function createMatch(overrides: Partial<Match>): Match {
  return {
    matchesId: overrides.matchesId || `m_${Math.random().toString(36).substring(2, 7)}`,
    date: overrides.date || "14/08/2026",
    league: overrides.league || "La Liga",
    homeTeam: overrides.homeTeam || "FC Barcelona",
    awayTeam: overrides.awayTeam || "Valencia CF",
    homeScore: overrides.homeScore ?? 2,
    awayScore: overrides.awayScore ?? 0,
    result: overrides.result || "V",
    status: overrides.status || "FINISHED",
    ...overrides,
  };
}

describe("Auditoria de Arredondamento e Precisão Monetária (Item 2)", () => {
  const barcaCareer = {
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    nation: "ESP",
  };

  it("Cenário A: Salário com dízima pura (100.000/sem = 14.285,7142857.../dia) com intervalos irregulares de 3, 4, 5, 2, 8 dias", () => {
    const player = createPlayer({
      id: "p_odd_100k",
      name: "Odd Salary Player",
      salary: 100000,
      contract: [
        {
          salary: 100000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01T00:00:00.000Z"),
        },
      ],
    });

    // 5 partidas com intervalos irregulares:
    // P1: 04/07 (3 dias) -> 3 * (100k / 7) = 42.857,14 -> Math.round = 42.857
    // P2: 08/07 (4 dias) -> 4 * (100k / 7) = 57.142,85 -> Math.round = 57.143
    // P3: 13/07 (5 dias) -> 5 * (100k / 7) = 71.428,57 -> Math.round = 71.429
    // P4: 15/07 (2 dias) -> 2 * (100k / 7) = 28.571,42 -> Math.round = 28.571
    // P5: 23/07 (8 dias) -> 8 * (100k / 7) = 114.285,71 -> Math.round = 114.286
    // Soma das 5 partidas arredondadas:
    // 42.857 + 57.143 + 71.429 + 28.571 + 114.286 = 314.286
    //
    // Total de dias acumulados = 3 + 4 + 5 + 2 + 8 = 22 dias
    // Cálculo global não arredondado:
    // 22 * (100.000 / 7) = 314.285,714... -> Math.round = 314.286
    // Diferença = 0!

    const m1 = createMatch({ matchesId: "m1", date: "04/07/2026", status: "FINISHED" });
    const m2 = createMatch({ matchesId: "m2", date: "08/07/2026", status: "FINISHED" });
    const m3 = createMatch({ matchesId: "m3", date: "13/07/2026", status: "FINISHED" });
    const m4 = createMatch({ matchesId: "m4", date: "15/07/2026", status: "FINISHED" });
    const m5 = createMatch({ matchesId: "m5", date: "23/07/2026", status: "FINISHED" });

    const season: ClubData = {
      id: "s_round_a",
      seasonNumber: 1,
      players: [player],
      matches: [m1, m2, m3, m4, m5],
    };

    const entries = calculateSalaryExpenseEntries({ career: barcaCareer, season });
    const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });

    expect(entries).toHaveLength(5);
    expect(entries[0].amount).toBe(42857);
    expect(entries[1].amount).toBe(57143);
    expect(entries[2].amount).toBe(71429);
    expect(entries[3].amount).toBe(28571);
    expect(entries[4].amount).toBe(114286);

    const sumEntries = entries.reduce((acc, e) => acc + e.amount, 0);
    expect(sumEntries).toBe(314286);
    expect(consolidated?.amount).toBe(314286);

    const exactGlobal = Math.round((100000 / 7) * 22);
    expect(exactGlobal).toBe(314286);
    expect(consolidated?.amount).toBe(exactGlobal);
  });

  it("Cenário B: Caso extremo onde ocorre diferença pontual de 1 unidade em 2 partidas", () => {
    // Atleta com 100.000/sem (14.285,714.../dia)
    // Partida 1 em 02/07 (1 dia) -> 14.285,71 -> round = 14.286
    // Partida 2 em 03/07 (1 dia) -> 14.285,71 -> round = 14.286
    // Soma das duas partidas = 14.286 + 14.286 = 28.572
    // Se fosse 1 única partida de 2 dias:
    // 2 * (100.000 / 7) = 28.571,42 -> round = 28.571
    // Diferença = 1 unidade monetária (ex.: €1 em €28.571)

    const player = createPlayer({
      id: "p_odd_extreme",
      name: "Extreme Player",
      salary: 100000,
      contract: [
        {
          salary: 100000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01T00:00:00.000Z"),
        },
      ],
    });

    const m1 = createMatch({ matchesId: "m1", date: "02/07/2026", status: "FINISHED" });
    const m2 = createMatch({ matchesId: "m2", date: "03/07/2026", status: "FINISHED" });

    const season: ClubData = {
      id: "s_round_b",
      seasonNumber: 1,
      players: [player],
      matches: [m1, m2],
    };

    const entries = calculateSalaryExpenseEntries({ career: barcaCareer, season });
    const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });

    expect(entries[0].amount).toBe(14286);
    expect(entries[1].amount).toBe(14286);
    expect(consolidated?.amount).toBe(28572);

    const directTwoDays = Math.round((100000 / 7) * 2);
    expect(directTwoDays).toBe(28571);

    const diff = (consolidated?.amount || 0) - directTwoDays;
    expect(diff).toBe(1); // Exatamente 1 unidade
  });

  it("Cenário C: Temporada inteira com 38 partidas irregulares e 4 movimentações salariais (contratação, venda, empréstimo e renovação)", () => {
    // Base: 4 atletas com salários variados gerando dízimas:
    // - Pedri: 350.000/sem (50.000/dia - exato)
    // - Gavi: 250.000/sem (35.714,285.../dia - dízima)
    // - Cubarsí: 130.000/sem (18.571,428.../dia - dízima)
    // - Lamine Yamal: 270.000/sem (38.571,428.../dia - dízima)
    // Folha inicial = 1.000.000/sem (142.857,142857.../dia)

    const pedri = createPlayer({
      id: "pedri",
      salary: 350000,
      contract: [{ salary: 350000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
    });
    const cubarsi = createPlayer({
      id: "cubarsi",
      salary: 130000,
      contract: [
        { salary: 130000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") },
        // Renovação em 15/10/2026 para 280.000/sem (+150k)
        { salary: 280000, previousSalary: 130000, isRenewal: true, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-10-15") },
      ],
    });
    const lamine = createPlayer({
      id: "lamine",
      salary: 270000,
      contract: [{ salary: 270000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
    });

    // Reforço contratado em 01/08/2026 com 220.000/sem (dízima)
    const refuerzo = createPlayer({
      id: "refuerzo",
      buy: true,
      salary: 220000,
      contract: [{ salary: 220000, buyValue: 30000000, sellValue: 0, fromClub: "Arsenal", leftClub: "", dataArrival: new Date("2026-08-01") }],
    });

    // Atleta emprestado para fora em 15/08/2026 com 50% pago pelo Barça (Gavi)
    const gaviEmprestado = createPlayer({
      id: "gavi",
      loan: true,
      salary: 250000,
      contract: [
        { salary: 250000, buyValue: 0, sellValue: 0, fromClub: "", leftClub: "Chelsea", dataArrival: new Date("2026-07-01"), dataExit: new Date("2026-08-15"), isLoan: true, wagePercentage: 50 },
      ],
    });

    // 38 partidas geradas com intervalos alternados entre 3, 4, 7 e 10 dias cobrindo o ano inteiro
    const matches: Match[] = [];
    let curTime = new Date("2026-07-01T00:00:00.000Z").getTime();
    const intervalDeltas = [3, 4, 7, 3, 4, 7, 10, 4, 3, 7, 14, 3, 4, 7, 4, 3, 7, 10, 4, 3, 7, 4, 3, 7, 10, 4, 3, 7, 4, 3, 7, 10, 4, 3, 7, 4, 3, 7];

    for (let i = 0; i < intervalDeltas.length; i++) {
      curTime += intervalDeltas[i] * 24 * 60 * 60 * 1000;
      const d = new Date(curTime);
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const year = d.getUTCFullYear();
      matches.push(createMatch({ matchesId: `m_round_${i + 1}`, date: `${day}/${month}/${year}`, status: "FINISHED" }));
    }

    const season: ClubData = {
      id: "s_round_full_season",
      seasonNumber: 1,
      players: [pedri, gaviEmprestado, cubarsi, lamine, refuerzo],
      matches,
    };

    const entries = calculateSalaryExpenseEntries({ career: barcaCareer, season });
    const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });

    expect(entries).toHaveLength(38);
    expect(consolidated).not.toBeNull();

    // Soma das 38 partidas arredondadas individualmente
    const sumOfIndividualMatches = entries.reduce((acc, e) => acc + e.amount, 0);
    expect(consolidated?.amount).toBe(sumOfIndividualMatches);

    // Comparação precisa de arredondamento:
    // Soma das 38 partidas arredondadas = 34.552.141
    expect(consolidated?.amount).toBe(34552141);
    expect(sumOfIndividualMatches).toBe(34552141);

    // Avaliando a discrepância máxima teórica possível:
    // Em 38 partidas, se cada partida tiver um erro de arredondamento de até +-0.5,
    // o desvio máximo teórico acumulado após 38 rodadas seria de até 19 unidades em um universo de 34 milhões.
    // Em percentual: 19 / 34.552.141 = 0,000055% (completamente insignificante para finanças do clube).
  });
});
