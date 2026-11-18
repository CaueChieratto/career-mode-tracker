import { describe, expect, it, vi } from "vitest";
import {
  calculateSalaryExpenseEntries,
  getContractWeeklyWage,
  getPlayerWeeklyWageAtDate,
  calculateConsolidatedSeasonSalaryExpense,
} from "../common/services/ServiceFinance/salaryTimelineCalculator";
import { reconcileSeasonFinancialEntries } from "../common/services/ServiceFinance/reconciliation";
import { ServiceFinance } from "../common/services/ServiceFinance";
import { Players } from "../common/interfaces/playersInfo/players";
import { Match } from "../common/interfaces/Match";
import { ClubData } from "../common/interfaces/club/clubData";
import { FinancialEntry } from "../common/interfaces/finance";

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

describe("Despesas Automáticas com Salários Semanais (Padrão FC Barcelona - 3.md)", () => {
  const barcaCareer = {
    createdAt: new Date("2026-07-01"),
    nation: "ESP",
  };

  it("1. Carreira sem transferências: calcula proporcional por dias de 01/07 até a primeira partida finalizada", () => {
    // Pedri (salário semanal: 350.000) e Gavi (salário semanal: 250.000) -> Folha: 600.000/sem
    const pedri = createPlayer({
      id: "pedri_8",
      name: "Pedri",
      contract: [
        {
          salary: 350000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01"),
        },
      ],
    });

    const gavi = createPlayer({
      id: "gavi_6",
      name: "Gavi",
      contract: [
        {
          salary: 250000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01"),
        },
      ],
    });

    // Partida em 15/07/2026 -> 14 dias transcorridos de 01/07 a 15/07
    const match1 = createMatch({
      matchesId: "match_1",
      date: "15/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [pedri, gavi],
      matches: [match1],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].matchId).toBe("match_1");
    expect(entries[0].days).toBe(14);
    // (600.000 / 7) * 14 = 1.200.000
    expect(entries[0].amount).toBe(1200000);
    expect(entries[0].description).toBe("Salários de atletas (01/07 a 15/07)");
  });

  it("2. Contratação que aumenta a folha salarial: fatia o período proporcionalmente por dias", () => {
    // Folha inicial em 01/07: Raphinha (salário semanal: 400.000)
    const raphinha = createPlayer({
      id: "raphinha_11",
      name: "Raphinha",
      contract: [
        {
          salary: 400000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01"),
        },
      ],
    });

    // Dani Olmo contratado em 11/07/2026 com salário de 300.000/sem
    const daniOlmo = createPlayer({
      id: "dani_olmo_20",
      name: "Dani Olmo",
      buy: true,
      contract: [
        {
          salary: 300000,
          buyValue: 55000000,
          sellValue: 0,
          fromClub: "RB Leipzig",
          leftClub: "",
          dataArrival: new Date("2026-07-11"),
        },
      ],
    });

    // Partida em 21/07/2026
    const match1 = createMatch({
      matchesId: "match_1",
      date: "21/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [raphinha, daniOlmo],
      matches: [match1],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    expect(entries).toHaveLength(1);
    // De 01/07 a 11/07: 10 dias com folha 400.000 -> (400.000 / 7) * 10 = 571.428,57
    // De 11/07 a 21/07: 10 dias com folha 700.000 -> (700.000 / 7) * 10 = 1.000.000
    // Total = 1.571.429
    expect(entries[0].days).toBe(20);
    expect(entries[0].amount).toBe(1571429);
  });

  it("3. Venda que diminui a folha salarial: cessa a despesa do atleta na data da saída", () => {
    // Robert Lewandowski (salário: 700.000/sem) vendido em 10/07/2026
    const lewy = createPlayer({
      id: "lewy_9",
      name: "Robert Lewandowski",
      sell: true,
      contract: [
        {
          salary: 700000,
          buyValue: 0,
          sellValue: 15000000,
          fromClub: "FC Barcelona",
          leftClub: "Al-Hilal",
          dataArrival: new Date("2026-07-01"),
          dataExit: new Date("2026-07-10"),
        },
      ],
    });

    // Lamine Yamal (salário: 350.000/sem) permanece
    const lamine = createPlayer({
      id: "lamine_19",
      name: "Lamine Yamal",
      contract: [
        {
          salary: 350000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01"),
        },
      ],
    });

    // Partida em 20/07/2026
    const match1 = createMatch({
      matchesId: "match_1",
      date: "20/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [lewy, lamine],
      matches: [match1],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    expect(entries).toHaveLength(1);
    // De 01/07 a 10/07 (9 dias): folha 1.050.000 -> (1.050.000 / 7) * 9 = 1.350.000
    // De 10/07 a 20/07 (10 dias): folha 350.000 -> (350.000 / 7) * 10 = 500.000
    // Total = 1.850.000
    expect(entries[0].days).toBe(19);
    expect(entries[0].amount).toBe(1850000);
  });

  it("4. Múltiplas transferências em um mesmo período (Exemplo oficial da Seção 3 de 3.md)", () => {
    // 01/07: folha salarial de 5 milhões por semana
    // 20/07: contratação que aumenta a folha para 5,5 milhões (+500k)
    // 05/08: venda que reduz a folha para 5,2 milhões (-300k)
    // 14/08: partida finalizada
    const playerBase = createPlayer({
      id: "p_base",
      name: "Base Squad",
      contract: [
        {
          salary: 4700000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01"),
        },
      ],
    });

    // Jogador que será vendido em 05/08 (recebia 300k)
    const playerSold = createPlayer({
      id: "p_sold",
      name: "Player Sold",
      sell: true,
      contract: [
        {
          salary: 300000,
          buyValue: 0,
          sellValue: 20000000,
          fromClub: "FC Barcelona",
          leftClub: "Chelsea FC",
          dataArrival: new Date("2026-07-01"),
          dataExit: new Date("2026-08-05"),
        },
      ],
    });

    // Jogador contratado em 20/07 (recebe 500k)
    const playerSigned = createPlayer({
      id: "p_signed",
      name: "Player Signed",
      buy: true,
      contract: [
        {
          salary: 500000,
          buyValue: 40000000,
          sellValue: 0,
          fromClub: "Bayern München",
          leftClub: "",
          dataArrival: new Date("2026-07-20"),
        },
      ],
    });

    // Partida finalizada em 14/08/2026
    const match1 = createMatch({
      matchesId: "match_exemplar",
      date: "14/08/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [playerBase, playerSold, playerSigned],
      matches: [match1],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    expect(entries).toHaveLength(1);
    // Intervalo 1 (01/07 a 20/07): 19 dias com 5.000.000 -> (5M / 7) * 19 = 13.571.428,57...
    // Intervalo 2 (20/07 a 05/08): 16 dias com 5.500.000 -> (5.5M / 7) * 16 = 12.571.428,57...
    // Intervalo 3 (05/08 a 14/08): 9 dias com 5.200.000 -> (5.2M / 7) * 9 = 6.685.714,28...
    // Total dias = 19 + 16 + 9 = 44 dias
    // Soma = 32.828.571,42... -> Math.round = 32.828.571
    expect(entries[0].days).toBe(44);
    expect(entries[0].amount).toBe(32828571);
    expect(entries[0].description).toBe("Salários de atletas (01/07 a 14/08)");
  });

  it("5. Transferências realizadas na mesma data combinam seus efeitos salariais no mesmo dia", () => {
    // Em 10/07: contratação (+200k) e venda (-100k) no mesmo dia
    const base = createPlayer({
      id: "p_base",
      name: "Pedri",
      contract: [
        {
          salary: 500000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01"),
        },
      ],
    });

    const sold = createPlayer({
      id: "p_sold",
      name: "Ansu Fati",
      sell: true,
      contract: [
        {
          salary: 100000,
          buyValue: 0,
          sellValue: 10000000,
          fromClub: "FC Barcelona",
          leftClub: "Sevilla FC",
          dataArrival: new Date("2026-07-01"),
          dataExit: new Date("2026-07-10"),
        },
      ],
    });

    const bought = createPlayer({
      id: "p_bought",
      name: "Nico Williams",
      buy: true,
      contract: [
        {
          salary: 200000,
          buyValue: 58000000,
          sellValue: 0,
          fromClub: "Athletic Club",
          leftClub: "",
          dataArrival: new Date("2026-07-10"),
        },
      ],
    });

    // Partida em 15/07/2026
    const match1 = createMatch({
      matchesId: "match_same_day",
      date: "15/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [base, sold, bought],
      matches: [match1],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    // De 01/07 a 10/07 (9 dias): folha 600.000 -> (600k / 7) * 9 = 771.428,57...
    // De 10/07 a 15/07 (5 dias): folha 700.000 -> (700k / 7) * 5 = 500.000
    // Total = 1.271.429
    expect(entries[0].days).toBe(14);
    expect(entries[0].amount).toBe(1271429);
  });

  it("6. Contratação no meio de uma semana com cálculo proporcional por dias (sem arredondar semana cheia)", () => {
    // Atleta com salário de 700.000/semana (exatamente 100.000/dia) contratado na quarta-feira (04/07)
    // Partida finalizada no sábado (07/07) -> 3 dias
    const player = createPlayer({
      id: "p_cubarsi",
      name: "Pau Cubarsí",
      buy: true,
      contract: [
        {
          salary: 700000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-04"),
        },
      ],
    });

    const match1 = createMatch({
      matchesId: "match_cubarsi",
      date: "07/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [player],
      matches: [match1],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    // 01/07 a 04/07: folha 0 (3 dias)
    // 04/07 a 07/07: folha 700.000 (3 dias) -> 100.000 * 3 = 300.000
    expect(entries[0].days).toBe(6);
    expect(entries[0].amount).toBe(300000);
  });

  it("7. Partidas finalizadas em sequência geram marcos subsequentes sem duplicar períodos anteriores", () => {
    const player = createPlayer({
      id: "frenkie_21",
      name: "Frenkie de Jong",
      contract: [
        {
          salary: 700000, // 100k/dia
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01"),
        },
      ],
    });

    // Partida 1: 08/07 (7 dias desde 01/07)
    const match1 = createMatch({
      matchesId: "match_seq_1",
      date: "08/07/2026",
      status: "FINISHED",
    });

    // Partida 2: 15/07 (7 dias desde 08/07)
    const match2 = createMatch({
      matchesId: "match_seq_2",
      date: "15/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [player],
      matches: [match1, match2],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    expect(entries).toHaveLength(2);
    // Entrada 1: 01/07 a 08/07 (7 dias) -> 700.000
    expect(entries[0].matchId).toBe("match_seq_1");
    expect(entries[0].days).toBe(7);
    expect(entries[0].amount).toBe(700000);
    expect(entries[0].description).toBe("Salários de atletas (01/07 a 08/07)");

    // Entrada 2: 08/07 a 15/07 (7 dias) -> 700.000
    expect(entries[1].matchId).toBe("match_seq_2");
    expect(entries[1].days).toBe(7);
    expect(entries[1].amount).toBe(700000);
    expect(entries[1].description).toBe("Salários de atletas (08/07 a 15/07)");
  });

  it("8. Partidas finalizadas fora de ordem cronológica são ordenadas e produzem resultado consistente", () => {
    const player = createPlayer({
      id: "frenkie_21",
      name: "Frenkie de Jong",
      contract: [
        {
          salary: 700000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01"),
        },
      ],
    });

    const matchLater = createMatch({
      matchesId: "match_later",
      date: "20/07/2026",
      status: "FINISHED",
    });

    const matchEarlier = createMatch({
      matchesId: "match_earlier",
      date: "10/07/2026",
      status: "FINISHED",
    });

    // Inseridas na ordem inversa [later, earlier]
    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [player],
      matches: [matchLater, matchEarlier],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    expect(entries).toHaveLength(2);
    // match_earlier é processada primeiro
    expect(entries[0].matchId).toBe("match_earlier");
    expect(entries[0].days).toBe(9); // 01/07 a 10/07
    expect(entries[0].amount).toBe(900000);

    // match_later é processada em seguida
    expect(entries[1].matchId).toBe("match_later");
    expect(entries[1].days).toBe(10); // 10/07 a 20/07
    expect(entries[1].amount).toBe(1000000);
  });

  it("9. Reprocessamento e idempotência: executar múltiplas vezes não duplica despesas", () => {
    const player = createPlayer({
      id: "pedri_8",
      name: "Pedri",
      contract: [
        {
          salary: 350000,
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-07-01"),
        },
      ],
    });

    const match1 = createMatch({
      matchesId: "match_reprocess",
      date: "15/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [player],
      matches: [match1],
    };

    // Primeira reconciliação
    const run1 = reconcileSeasonFinancialEntries(season, [], barcaCareer);
    const salaryEntries1 = run1.filter((e) => e.source === "salary");
    expect(salaryEntries1).toHaveLength(1);

    // Segunda reconciliação passando as entradas da primeira rodada (simulando reabertura/reload)
    const run2 = reconcileSeasonFinancialEntries(season, run1, barcaCareer);
    const salaryEntries2 = run2.filter((e) => e.source === "salary");
    expect(salaryEntries2).toHaveLength(1);
    expect(salaryEntries2[0].amount).toBe(salaryEntries1[0].amount);
    expect(salaryEntries2[0].id).toBe(salaryEntries1[0].id);
  });

  it("10. Calendário não europeu: inicia em 01/01 e calcula proporcionalmente", () => {
    const nonEuropeanCareer = {
      createdAt: new Date("2026-01-01"),
      nation: "BRA", // Brasil = não europeu
    };

    const player = createPlayer({
      id: "p_bra",
      name: "Vitor Roque",
      contract: [
        {
          salary: 140000, // 20k/dia
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
          dataArrival: new Date("2026-01-01"),
        },
      ],
    });

    // Partida em 15/01/2026
    const match1 = createMatch({
      matchesId: "match_bra_1",
      date: "15/01/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [player],
      matches: [match1],
    };

    const entries = calculateSalaryExpenseEntries({
      career: nonEuropeanCareer,
      season,
    });

    expect(entries).toHaveLength(1);
    // De 01/01 a 15/01 (14 dias): 20k * 14 = 280.000
    expect(entries[0].days).toBe(14);
    expect(entries[0].amount).toBe(280000);
    expect(entries[0].description).toBe("Salários de atletas (01/01 a 15/01)");
  });

  it("11. Reconstrução histórica com atletas que já saíram do clube (sell: true)", () => {
    // Atleta vendido no passado, mas que jogou parte do período
    const ilkayGundogan = createPlayer({
      id: "gundo_22",
      name: "İlkay Gündoğan",
      sell: true,
      contract: [
        {
          salary: 350000, // 50k/dia
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "Manchester City",
          dataArrival: new Date("2026-07-01"),
          dataExit: new Date("2026-07-21"), // Saiu em 21/07
        },
      ],
    });

    // Partida em 31/07/2026 (30 dias desde 01/07)
    const match1 = createMatch({
      matchesId: "match_gundo",
      date: "31/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [ilkayGundogan],
      matches: [match1],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    expect(entries).toHaveLength(1);
    // 01/07 a 21/07 (20 dias): recebia 350k/sem -> 50k * 20 = 1.000.000
    // 21/07 a 31/07 (10 dias): já havia saído -> 0
    expect(entries[0].days).toBe(30);
    expect(entries[0].amount).toBe(1000000);
  });

  it("12. Mudanças salariais por renovação contratual (isRenewal) aplicam o novo salário a partir da data de renovação", () => {
    // Ronald Araújo renovou contrato com aumento salarial em 15/07/2026
    const araujo = createPlayer({
      id: "araujo_4",
      name: "Ronald Araújo",
      contract: [
        {
          // Contrato novo de renovação
          salary: 420000, // 60k/dia
          previousSalary: 280000, // 40k/dia antes
          isRenewal: true,
          dataArrival: new Date("2026-07-15"),
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          leftClub: "",
        },
      ],
    });

    // Partida em 25/07/2026
    const match1 = createMatch({
      matchesId: "match_araujo_renew",
      date: "25/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [araujo],
      matches: [match1],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    expect(entries).toHaveLength(1);
    // 01/07 a 15/07 (14 dias): recebia previousSalary de 280k/sem (40k/dia) -> 40k * 14 = 560.000
    // 15/07 a 25/07 (10 dias): recebe novo salário de 420k/sem (60k/dia) -> 60k * 10 = 600.000
    // Total = 1.160.000
    expect(entries[0].days).toBe(24);
    expect(entries[0].amount).toBe(1160000);
  });

  it("13. Sem partidas finalizadas, nenhuma despesa salarial é gerada", () => {
    const player = createPlayer({
      id: "pedri_8",
      name: "Pedri",
      contract: [{ salary: 350000, buyValue: 0, sellValue: 0, fromClub: "", leftClub: "", dataArrival: new Date("2026-07-01") }],
    });

    const matchScheduled = createMatch({
      matchesId: "match_scheduled",
      date: "15/07/2026",
      status: "SCHEDULED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [player],
      matches: [matchScheduled],
    };

    const entries = calculateSalaryExpenseEntries({
      career: barcaCareer,
      season,
    });

    expect(entries).toEqual([]);
  });

  it("14. Preservação de lançamentos manuais na reconciliação de finanças", () => {
    const manualEntry: FinancialEntry = {
      id: "manual_ingressos_1",
      type: "revenue",
      category: "Ingressos",
      amount: 4500000,
      isAutomatic: false,
      source: "manual",
    };

    const player = createPlayer({
      id: "pedri_8",
      name: "Pedri",
      contract: [{ salary: 350000, buyValue: 0, sellValue: 0, fromClub: "", leftClub: "", dataArrival: new Date("2026-07-01") }],
    });

    const match1 = createMatch({
      matchesId: "match_manual_test",
      date: "08/07/2026",
      status: "FINISHED",
    });

    const season: ClubData = {
      id: "season_2026",
      seasonNumber: 1,
      players: [player],
      matches: [match1],
    };

    const result = reconcileSeasonFinancialEntries(
      season,
      [manualEntry],
      barcaCareer,
    );

    // Deve conter o lançamento manual de ingressos E o automático de salário
    expect(result.some((e) => e.id === "manual_ingressos_1")).toBe(true);
    expect(result.some((e) => e.source === "salary")).toBe(true);
  });

  describe("Motor da Etapa 1: Extração Salarial, Reconstrução Histórica e Consolidação", () => {
    const seasonStartDate = new Date("2026-07-01T00:00:00.000Z");
    const seasonEndDate = new Date("2027-06-30T23:59:59.999Z");

    describe("getContractWeeklyWage", () => {
      it("aplica wagePercentage sobre fullSalary bruto sem desconto duplicado", () => {
        // Atleta com fullSalary 200.000 e wagePercentage 50%
        const wage = getContractWeeklyWage({
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "Sevilla FC",
          dataArrival: null,
          fullSalary: 200000,
          salary: 100000, // já com percentual gravado no banco legado
          wagePercentage: 50,
          isLoan: true,
        });
        // 200.000 * 50% = 100.000 (e NÃO 100.000 * 50% = 50.000)
        expect(wage).toBe(100000);
      });

      it("considera loanTerms.ourWagePercentage quando wagePercentage direto não está definido", () => {
        const wage = getContractWeeklyWage({
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "Girona FC",
          dataArrival: null,
          fullSalary: 150000,
          isLoan: true,
          loanTerms: {
            durationYears: 1,
            hasBuyOption: false,
            ourWagePercentage: 40,
          },
        });
        // 150.000 * 40% = 60.000
        expect(wage).toBe(60000);
      });

      it("retorna 0 quando a porcentagem paga pelo clube (ourWagePercentage ou wagePercentage) é 0%", () => {
        const wage = getContractWeeklyWage({
          buyValue: 0,
          sellValue: 0,
          fromClub: "",
          leftClub: "Everton FC",
          dataArrival: null,
          salary: 80000,
          wagePercentage: 0,
          isLoan: true,
        });
        expect(wage).toBe(0);
      });

      it("utiliza fallbackPlayerSalary quando o contrato não tem salário explícito", () => {
        const wage = getContractWeeklyWage(
          {
            buyValue: 0,
            sellValue: 15000000,
            fromClub: "",
            leftClub: "Al-Hilal",
            dataArrival: null,
            dataExit: new Date("2026-07-10"),
            isLoan: false,
          },
          700000, // fallback do player.salary
        );
        expect(wage).toBe(700000);
      });

      it("retorna fallbackPlayerSalary mesmo se contract for nulo", () => {
        const wage = getContractWeeklyWage(null, 500000);
        expect(wage).toBe(500000);
      });
    });

    describe("getPlayerWeeklyWageAtDate (Reconstrução Histórica)", () => {
      it("Exemplo 1 Canônico: Atleta do elenco inicial vendido (Robert Lewandowski com salary na raiz) gera despesa antes da saída e 0 após a saída", () => {
        const lewy = createPlayer({
          id: "lewy_9",
          name: "Robert Lewandowski",
          salary: 700000, // 100k/dia na raiz
          sell: true,
          contract: [
            {
              buyValue: 0,
              sellValue: 15000000,
              fromClub: "",
              leftClub: "Al-Hilal",
              dataArrival: null,
              dataExit: new Date("2026-07-10T00:00:00.000Z"),
              isLoan: false,
            },
          ],
        });

        // 05/07: antes da venda -> Lewandowski ainda fazia parte do elenco do FC Barcelona
        const wageBefore = getPlayerWeeklyWageAtDate(
          lewy,
          new Date("2026-07-05T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageBefore).toBe(700000);

        // 10/07: data da venda -> deixa de gerar despesas
        const wageAtExit = getPlayerWeeklyWageAtDate(
          lewy,
          new Date("2026-07-10T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageAtExit).toBe(0);

        // 15/07: após a venda -> 0
        const wageAfter = getPlayerWeeklyWageAtDate(
          lewy,
          new Date("2026-07-15T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageAfter).toBe(0);
      });

      it("Exemplo 2 Canônico: Empréstimo de saída com wagePercentage e retorno subsequente (Ansu Fati)", () => {
        const ansuFati = createPlayer({
          id: "ansu_10",
          name: "Ansu Fati",
          salary: 140000, // 20k/dia
          loan: true,
          contract: [
            {
              buyValue: 0,
              sellValue: 0,
              fromClub: "",
              leftClub: "Sevilla FC",
              dataArrival: null,
              dataExit: new Date("2026-07-11T00:00:00.000Z"),
              isLoan: true,
              wagePercentage: 50, // FC Barcelona paga 50% = 70.000/sem
            },
            {
              buyValue: 0,
              sellValue: 0,
              fromClub: "Fim de Empréstimo",
              leftClub: "",
              dataArrival: new Date("2027-01-01T00:00:00.000Z"),
              dataExit: null,
              isLoan: false,
            },
          ],
        });

        // 05/07: Antes do empréstimo de saída -> FC Barcelona paga 100% (140.000)
        const wageBeforeLoan = getPlayerWeeklyWageAtDate(
          ansuFati,
          new Date("2026-07-05T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageBeforeLoan).toBe(140000);

        // 15/07: Durante o empréstimo de saída -> FC Barcelona paga 50% (70.000)
        const wageDuringLoan = getPlayerWeeklyWageAtDate(
          ansuFati,
          new Date("2026-07-15T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageDuringLoan).toBe(70000);

        // 10/01/2027: Após retorno de empréstimo -> FC Barcelona volta a pagar 100% (140.000)
        const wageAfterReturn = getPlayerWeeklyWageAtDate(
          ansuFati,
          new Date("2027-01-10T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageAfterReturn).toBe(140000);
      });

      it("Empréstimo de chegada (incomingLoan) com percentual pago pelo clube e término do empréstimo", () => {
        // Atleta contratado por empréstimo que chega em 15/07/2026 e sai em 31/12/2026
        const joaoCancelo = createPlayer({
          id: "cancelo_2",
          name: "João Cancelo",
          incomingLoan: true,
          contract: [
            {
              buyValue: 0,
              sellValue: 0,
              fromClub: "Manchester City",
              leftClub: "Manchester City",
              dataArrival: new Date("2026-07-15T00:00:00.000Z"),
              dataExit: new Date("2026-12-31T00:00:00.000Z"),
              isLoan: true,
              fullSalary: 200000,
              wagePercentage: 60, // FC Barcelona paga 60% = 120.000/sem
            },
          ],
        });

        // 10/07: antes da chegada do empréstimo -> 0
        const wageBeforeArrival = getPlayerWeeklyWageAtDate(
          joaoCancelo,
          new Date("2026-07-10T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageBeforeArrival).toBe(0);

        // 20/07: durante o empréstimo de chegada -> FC Barcelona paga 60% = 120.000
        const wageDuringLoan = getPlayerWeeklyWageAtDate(
          joaoCancelo,
          new Date("2026-07-20T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageDuringLoan).toBe(120000);

        // 05/01/2027: após o encerramento do empréstimo -> 0
        const wageAfterExit = getPlayerWeeklyWageAtDate(
          joaoCancelo,
          new Date("2027-01-05T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageAfterExit).toBe(0);
      });

      it("Múltiplas renovações contratuais (isRenewal) ordenadas cronologicamente", () => {
        // Pau Cubarsí com 2 renovações ao longo da temporada:
        // Antes da 1ª renovação: 100.000
        // 1ª renovação (15/07): 250.000 (previousSalary: 100.000)
        // 2ª renovação (15/10): 400.000 (previousSalary: 250.000)
        const cubarsi = createPlayer({
          id: "cubarsi_2",
          name: "Pau Cubarsí",
          contract: [
            {
              salary: 250000,
              previousSalary: 100000,
              isRenewal: true,
              dataArrival: new Date("2026-07-15T00:00:00.000Z"),
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
            },
            {
              salary: 400000,
              previousSalary: 250000,
              isRenewal: true,
              dataArrival: new Date("2026-10-15T00:00:00.000Z"),
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
            },
          ],
        });

        // 05/07: antes da 1ª renovação -> previousSalary da 1ª (100.000)
        const wageBeforeFirst = getPlayerWeeklyWageAtDate(
          cubarsi,
          new Date("2026-07-05T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageBeforeFirst).toBe(100000);

        // 01/08: entre a 1ª e a 2ª renovação -> salário da 1ª (250.000)
        const wageBetweenRenewals = getPlayerWeeklyWageAtDate(
          cubarsi,
          new Date("2026-08-01T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageBetweenRenewals).toBe(250000);

        // 20/10: após a 2ª renovação -> salário da 2ª (400.000)
        const wageAfterSecond = getPlayerWeeklyWageAtDate(
          cubarsi,
          new Date("2026-10-20T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wageAfterSecond).toBe(400000);
      });

      it("Ignora transferências com timing 'Próxima Temporada' na temporada atual", () => {
        // Atleta do FC Barcelona com venda pré-agendada para a próxima temporada
        const playerScheduledSale = createPlayer({
          id: "ferran_7",
          name: "Ferran Torres",
          salary: 210000, // 30k/dia
          sell: false,
          contract: [
            {
              salary: 210000,
              buyValue: 0,
              sellValue: 30000000,
              fromClub: "FC Barcelona",
              leftClub: "Newcastle United",
              dataArrival: null,
              dataExit: new Date("2027-01-10T00:00:00.000Z"),
              timing: "Próxima Temporada",
            },
          ],
        });

        // Mesmo após a data do acordo (10/01), ele continua jogando e recebendo normalmente no Barcelona nesta temporada
        const wage = getPlayerWeeklyWageAtDate(
          playerScheduledSale,
          new Date("2027-01-20T00:00:00.000Z"),
          seasonStartDate,
          seasonEndDate,
        );
        expect(wage).toBe(210000);
      });
    });

    describe("calculateConsolidatedSeasonSalaryExpense", () => {
      it("retorna null se não houver partidas finalizadas", () => {
        const season: ClubData = {
          id: "season_barca_empty",
          seasonNumber: 1,
          players: [
            createPlayer({
              id: "pedri_8",
              name: "Pedri",
              salary: 350000,
            }),
          ],
          matches: [
            createMatch({
              matchesId: "m_sched",
              status: "SCHEDULED",
            }),
          ],
        };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({
          career: barcaCareer,
          season,
        });
        expect(consolidated).toBeNull();
      });

      it("consolida lançamento único com ID determinístico, soma exata dos subintervalos e metadados de partidas", () => {
        // Frenkie de Jong: 700.000/sem (100k/dia)
        const frenkie = createPlayer({
          id: "frenkie_21",
          name: "Frenkie de Jong",
          salary: 700000,
          contract: [
            {
              salary: 700000,
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
              dataArrival: new Date("2026-07-01"),
            },
          ],
        });

        // Partida 1: 08/07 (7 dias desde 01/07) -> 700.000
        const match1 = createMatch({
          matchesId: "m_seq_1",
          date: "08/07/2026",
          status: "FINISHED",
        });

        // Partida 2: 15/07 (7 dias desde 08/07) -> 700.000
        const match2 = createMatch({
          matchesId: "m_seq_2",
          date: "15/07/2026",
          status: "FINISHED",
        });

        const season: ClubData = {
          id: "season_barca_consolidated",
          seasonNumber: 1,
          players: [frenkie],
          matches: [match1, match2],
        };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({
          career: barcaCareer,
          season,
        });

        expect(consolidated).not.toBeNull();
        expect(consolidated!.id).toBe("salary_season_season_barca_consolidated");
        expect(consolidated!.seasonId).toBe("season_barca_consolidated");
        expect(consolidated!.lastMatchId).toBe("m_seq_2");
        expect(consolidated!.totalDays).toBe(14);
        expect(consolidated!.amount).toBe(1400000); // 700.000 + 700.000
        expect(consolidated!.fromDayMonth).toBe("01/07");
        expect(consolidated!.toDayMonth).toBe("15/07");
        expect(consolidated!.description).toBe("Salários de atletas (01/07 a 15/07)");
        expect(consolidated!.intervals).toHaveLength(2);
        expect(consolidated!.intervals[0].amount).toBe(700000);
        expect(consolidated!.intervals[1].amount).toBe(700000);
      });
    });

    describe("Etapa 2: Reconciliação Idempotente, Lançamento Consolidado e Edição Manual Protegida", () => {
      it("Gera lançamento salarial consolidado único para a temporada ('salary_season_${season.id}') somando múltiplos períodos de partidas", () => {
        const pedri = createPlayer({
          id: "pedri_8",
          name: "Pedri",
          salary: 350000,
          contract: [
            {
              salary: 350000,
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
              dataArrival: new Date("2026-07-01"),
            },
          ],
        });

        const match1 = createMatch({
          matchesId: "m_c1",
          date: "08/07/2026",
          status: "FINISHED",
        });
        const match2 = createMatch({
          matchesId: "m_c2",
          date: "15/07/2026",
          status: "FINISHED",
        });

        const season: ClubData = {
          id: "season_barca_unique",
          seasonNumber: 1,
          players: [pedri],
          matches: [match1, match2],
        };

        const reconciled = reconcileSeasonFinancialEntries(
          season,
          [],
          barcaCareer,
        );

        const salaryEntries = reconciled.filter((e) => e.source === "salary");
        expect(salaryEntries).toHaveLength(1);
        expect(salaryEntries[0].id).toBe("salary_season_season_barca_unique");
        expect(salaryEntries[0].category).toBe("Salários de atletas");
        expect(salaryEntries[0].isAutomatic).toBe(true);
        expect(salaryEntries[0].amount).toBe(700000); // 350k * 2 semanas
        expect(salaryEntries[0].calculatedAmount).toBe(700000);
        expect(salaryEntries[0].sourceId).toBe("m_c2");
      });

      it("Limpa lançamentos salariais fragmentados antigos (salary_auto_...) substituindo pelo consolidado", () => {
        const pedri = createPlayer({
          id: "pedri_8",
          name: "Pedri",
          salary: 350000,
          contract: [
            {
              salary: 350000,
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
              dataArrival: new Date("2026-07-01"),
            },
          ],
        });

        const match1 = createMatch({
          matchesId: "m_clean_1",
          date: "08/07/2026",
          status: "FINISHED",
        });

        const season: ClubData = {
          id: "season_barca_clean",
          seasonNumber: 1,
          players: [pedri],
          matches: [match1],
        };

        const oldFragmentedEntry: FinancialEntry = {
          id: "salary_auto_season_barca_clean_match_m_clean_1",
          type: "expense",
          category: "Salários de atletas",
          amount: 350000,
          isAutomatic: true,
          source: "salary",
        };

        const reconciled = reconcileSeasonFinancialEntries(
          season,
          [oldFragmentedEntry],
          barcaCareer,
        );

        expect(
          reconciled.some(
            (e) => e.id === "salary_auto_season_barca_clean_match_m_clean_1",
          ),
        ).toBe(false);
        expect(
          reconciled.some(
            (e) => e.id === "salary_season_season_barca_clean",
          ),
        ).toBe(true);
      });

      it("Preserva correção manual (manualAdjustment) em reprocessamento e reloads idempotentes", () => {
        const lamine = createPlayer({
          id: "lamine_19",
          name: "Lamine Yamal",
          salary: 700000,
          contract: [
            {
              salary: 700000,
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
              dataArrival: new Date("2026-07-01"),
            },
          ],
        });

        const match1 = createMatch({
          matchesId: "m_lamine_1",
          date: "11/07/2026",
          status: "FINISHED",
        });

        const season: ClubData = {
          id: "season_barca_edit",
          seasonNumber: 1,
          players: [lamine],
          matches: [match1],
        };

        const initialReconciled = reconcileSeasonFinancialEntries(
          season,
          [],
          barcaCareer,
        );
        const autoSalary = initialReconciled.find((e) => e.source === "salary")!;
        expect(autoSalary.amount).toBe(1000000);
        expect(autoSalary.calculatedAmount).toBe(1000000);

        const userEditedSalary: FinancialEntry = {
          ...autoSalary,
          amount: 1500000,
          manualAdjustment: 500000,
        };

        const reloadReconciled = reconcileSeasonFinancialEntries(
          season,
          [userEditedSalary],
          barcaCareer,
        );

        const reloadedSalary = reloadReconciled.find((e) => e.source === "salary")!;
        expect(reloadedSalary.amount).toBe(1500000);
        expect(reloadedSalary.calculatedAmount).toBe(1000000);
        expect(reloadedSalary.manualAdjustment).toBe(500000);
      });

      it("Soma novo período de nova partida sobre o total já corrigido pelo usuário (ex.: 10M corrigido para 12M -> +1M nova partida = 13M)", () => {
        const pedri = createPlayer({
          id: "pedri_8",
          name: "Pedri",
          salary: 700000,
          contract: [
            {
              salary: 700000,
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
              dataArrival: new Date("2026-07-01"),
            },
          ],
        });

        const match1 = createMatch({
          matchesId: "m_seq_1",
          date: "09/10/2026",
          status: "FINISHED",
        });

        const season: ClubData = {
          id: "season_fcb_p1",
          seasonNumber: 1,
          players: [pedri],
          matches: [match1],
        };

        const run1 = reconcileSeasonFinancialEntries(season, [], barcaCareer);
        const salary1 = run1.find((e) => e.source === "salary")!;
        expect(salary1.amount).toBe(10000000);
        expect(salary1.calculatedAmount).toBe(10000000);

        const correctedSalary: FinancialEntry = {
          ...salary1,
          amount: 12000000,
          calculatedAmount: 10000000,
          manualAdjustment: 2000000,
        };

        const match2 = createMatch({
          matchesId: "m_seq_2",
          date: "19/10/2026",
          status: "FINISHED",
        });

        const seasonWithMatch2: ClubData = {
          ...season,
          matches: [match1, match2],
        };

        const run2 = reconcileSeasonFinancialEntries(
          seasonWithMatch2,
          [correctedSalary],
          barcaCareer,
        );

        const salary2 = run2.find((e) => e.source === "salary")!;
        expect(salary2.calculatedAmount).toBe(11000000);
        expect(salary2.manualAdjustment).toBe(2000000);
        expect(salary2.amount).toBe(13000000);
      });

      it("ServiceFinance.updateEntry permite editar valor total da despesa de salários e calcula manualAdjustment", async () => {
        const careerId = "career_fcb_service";
        const seasonId = "season_fcb_service";

        const existingSalary: FinancialEntry = {
          id: `salary_season_${seasonId}`,
          type: "expense",
          category: "Salários de atletas",
          amount: 10000000,
          calculatedAmount: 10000000,
          isAutomatic: true,
          source: "salary",
        };

        const mockReport = {
          seasonId,
          seasonNumber: 1,
          entries: [existingSalary],
        };
        const key = `finance_report_${careerId}_${seasonId}`;
        (globalThis as unknown as { localStorage: unknown }).localStorage = {
          getItem: vi.fn((k: string) => (k === key ? JSON.stringify(mockReport) : null)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        };

        const updated = await ServiceFinance.updateEntry(
          careerId,
          seasonId,
          `salary_season_${seasonId}`,
          { amount: 12000000 },
        );

        expect(updated.amount).toBe(12000000);
        expect(updated.calculatedAmount).toBe(10000000);
        expect(updated.manualAdjustment).toBe(2000000);
        expect(updated.source).toBe("salary");
        expect(updated.isAutomatic).toBe(true);
        expect(updated.category).toBe("Salários de atletas");
      });

      it("ServiceFinance.updateEntry rejeita edição de transferências e cláusulas", async () => {
        const careerId = "career_fcb_blocked";
        const seasonId = "season_fcb_blocked";

        const transferEntry: FinancialEntry = {
          id: "transfer_buy_p1_0",
          type: "expense",
          category: "Transferências (compras de atletas)",
          amount: 50000000,
          isAutomatic: true,
          source: "transfer",
        };

        const clauseEntry: FinancialEntry = {
          id: "bonus_b1",
          type: "expense",
          category: "Bônus de conquista",
          amount: 5000000,
          isAutomatic: true,
          source: "clause",
        };

        const mockReport = {
          seasonId,
          seasonNumber: 1,
          entries: [transferEntry, clauseEntry],
        };
        const key = `finance_report_${careerId}_${seasonId}`;
        (globalThis as unknown as { localStorage: unknown }).localStorage = {
          getItem: vi.fn((k: string) => (k === key ? JSON.stringify(mockReport) : null)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        };

        await expect(
          ServiceFinance.updateEntry(careerId, seasonId, "transfer_buy_p1_0", {
            amount: 60000000,
          }),
        ).rejects.toThrow(
          "Lançamentos de transferências e cláusulas só podem ser editados em suas respectivas telas operacionais.",
        );

        await expect(
          ServiceFinance.updateEntry(careerId, seasonId, "bonus_b1", {
            amount: 7000000,
          }),
        ).rejects.toThrow(
          "Lançamentos de transferências e cláusulas só podem ser editados em suas respectivas telas operacionais.",
        );
      });

      it("ServiceFinance.deleteEntry bloqueia qualquer tentativa de excluir despesa de salários", async () => {
        const careerId = "career_fcb_delete";
        const seasonId = "season_fcb_delete";

        const salaryEntry: FinancialEntry = {
          id: `salary_season_${seasonId}`,
          type: "expense",
          category: "Salários de atletas",
          amount: 10000000,
          isAutomatic: true,
          source: "salary",
        };

        const mockReport = {
          seasonId,
          seasonNumber: 1,
          entries: [salaryEntry],
        };
        const key = `finance_report_${careerId}_${seasonId}`;
        (globalThis as unknown as { localStorage: unknown }).localStorage = {
          getItem: vi.fn((k: string) => (k === key ? JSON.stringify(mockReport) : null)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        };

        await expect(
          ServiceFinance.deleteEntry(
            careerId,
            seasonId,
            `salary_season_${seasonId}`,
          ),
        ).rejects.toThrow("A despesa automática de salários não pode ser excluída.");
      });
    });

    describe("Auditoria e Homologação dos 18 Cenários Obrigatórios da Seção 11 de PLANEJAMENTO_SALARIOS.md", () => {
      // 1. Carreira sem transferências
      it("Cenário 1 — Carreira sem transferências: calcula proporcional por dias de 01/07 até 15/07 e consolida lançamento único", () => {
        const pedri = createPlayer({
          id: "pedri_8",
          name: "Pedri",
          salary: 350000,
          contract: [{ salary: 350000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const gavi = createPlayer({
          id: "gavi_6",
          name: "Gavi",
          salary: 250000,
          contract: [{ salary: 250000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const match = createMatch({ matchesId: "m_c1", date: "15/07/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_c1", seasonNumber: 1, players: [pedri, gavi], matches: [match] };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        expect(consolidated!.totalDays).toBe(14);
        expect(consolidated!.amount).toBe(1200000); // 600.000 / 7 * 14 = 1.200.000

        const reconciled = reconcileSeasonFinancialEntries(season, [], barcaCareer);
        const salary = reconciled.find((e) => e.source === "salary");
        expect(salary).toBeDefined();
        expect(salary!.id).toBe("salary_season_s_c1");
        expect(salary!.amount).toBe(1200000);
      });

      // 2. Contratação que aumenta a folha salarial
      it("Cenário 2 — Contratação que aumenta a folha salarial: divide o período na data de chegada da nova contratação", () => {
        const raphinha = createPlayer({
          id: "raphinha_11",
          name: "Raphinha",
          salary: 400000,
          contract: [{ salary: 400000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const daniOlmo = createPlayer({
          id: "olmo_20",
          name: "Dani Olmo",
          buy: true,
          salary: 300000,
          contract: [{ salary: 300000, buyValue: 55000000, sellValue: 0, fromClub: "RB Leipzig", leftClub: "", dataArrival: new Date("2026-07-11") }],
        });
        const match = createMatch({ matchesId: "m_c2", date: "21/07/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_c2", seasonNumber: 1, players: [raphinha, daniOlmo], matches: [match] };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        // 01/07 a 11/07 (10 dias a 400k/sem) = 571.428,57
        // 11/07 a 21/07 (10 dias a 700k/sem) = 1.000.000
        // Total = 1.571.429
        expect(consolidated!.totalDays).toBe(20);
        expect(consolidated!.amount).toBe(1571429);
      });

      // 3. Venda que diminui a folha salarial (incluindo atleta do elenco inicial sem contract.salary explícito)
      it("Cenário 3 — Venda que diminui a folha salarial: cessa salário na data de saída mesmo se atleta do elenco inicial não tiver contract.salary explícito", () => {
        // Robert Lewandowski vendido em 10/07/2026 sem contract.salary explícito (padrão de atleta do elenco inicial vendido)
        const lewy = createPlayer({
          id: "lewy_9",
          name: "Robert Lewandowski",
          salary: 700000, // definido apenas na raiz do atleta
          sell: true,
          contract: [
            {
              buyValue: 0,
              sellValue: 15000000,
              fromClub: "FC Barcelona",
              leftClub: "Al-Hilal",
              dataArrival: null,
              dataExit: new Date("2026-07-10"),
              isLoan: false,
              // salary explícito ausente / undefined
            },
          ],
        });
        const lamine = createPlayer({
          id: "lamine_19",
          name: "Lamine Yamal",
          salary: 350000,
          contract: [{ salary: 350000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const match = createMatch({ matchesId: "m_c3", date: "20/07/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_c3", seasonNumber: 1, players: [lewy, lamine], matches: [match] };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        // 01/07 a 10/07 (9 dias): folha 1.050.000 -> (1.050.000 / 7) * 9 = 1.350.000
        // 10/07 a 20/07 (10 dias): folha 350.000 -> (350.000 / 7) * 10 = 500.000
        // Total = 1.850.000
        expect(consolidated!.totalDays).toBe(19);
        expect(consolidated!.amount).toBe(1850000);

        const reconciled = reconcileSeasonFinancialEntries(season, [], barcaCareer);
        const salary = reconciled.find((e) => e.source === "salary");
        expect(salary!.amount).toBe(1850000);
      });

      // 4. Empréstimos (chegada e saída) respeitando wagePercentage e renovação respeitando previousSalary
      it("Cenário 4 — Empréstimo respeitando wagePercentage (chegada e saída) e renovação contratual respeitando previousSalary", () => {
        // Empréstimo de chegada: João Cancelo com fullSalary 280k, wagePercentage 50%, salary gravado 140k (sem duplo desconto!)
        const cancelo = createPlayer({
          id: "cancelo_2",
          name: "João Cancelo",
          incomingLoan: true,
          contract: [
            {
              buyValue: 0,
              sellValue: 0,
              fromClub: "Manchester City",
              leftClub: "",
              dataArrival: new Date("2026-07-08"),
              fullSalary: 280000,
              salary: 140000,
              wagePercentage: 50,
              isLoan: true,
            },
          ],
        });
        // Empréstimo de saída: Ansu Fati (140k/sem) emprestado em 11/07 com 50% pago pelo Barcelona
        const ansu = createPlayer({
          id: "ansu_10",
          name: "Ansu Fati",
          salary: 140000,
          loan: true,
          contract: [
            {
              buyValue: 0,
              sellValue: 0,
              fromClub: "",
              leftClub: "Sevilla FC",
              dataArrival: null,
              dataExit: new Date("2026-07-11"),
              wagePercentage: 50,
              isLoan: true,
            },
          ],
        });
        // Renovação contratual: Ronald Araújo com previousSalary de 280k antes de 15/07 e 420k a partir de 15/07
        const araujo = createPlayer({
          id: "araujo_4",
          name: "Ronald Araújo",
          contract: [
            {
              salary: 420000,
              previousSalary: 280000,
              isRenewal: true,
              dataArrival: new Date("2026-07-15"),
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
            },
          ],
        });

        const match = createMatch({ matchesId: "m_c4", date: "22/07/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_c4", seasonNumber: 1, players: [cancelo, ansu, araujo], matches: [match] };

        // Subintervalos de 01/07 a 22/07 (21 dias):
        // 01/07 a 08/07 (7 dias): Cancelo: 0, Ansu: 140k, Araujo: 280k -> folha 420k/sem (60k/dia) -> 420.000
        // 08/07 a 11/07 (3 dias): Cancelo chega (140k), Ansu: 140k, Araujo: 280k -> folha 560k/sem (80k/dia) -> 240.000
        // 11/07 a 15/07 (4 dias): Cancelo: 140k, Ansu emprestado (70k), Araujo: 280k -> folha 490k/sem (70k/dia) -> 280.000
        // 15/07 a 22/07 (7 dias): Cancelo: 140k, Ansu: 70k, Araujo renova (420k) -> folha 630k/sem (90k/dia) -> 630.000
        // Total = 420.000 + 240.000 + 280.000 + 630.000 = 1.570.000
        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        expect(consolidated!.totalDays).toBe(21);
        expect(consolidated!.amount).toBe(1570000);
      });

      // 5. Múltiplas transferências em um mesmo período
      it("Cenário 5 — Múltiplas transferências em um mesmo período: reproduz exatamente o cálculo oficial da Seção 3 do plano", () => {
        const base = createPlayer({
          id: "p_b5",
          name: "Base Squad",
          contract: [{ salary: 4700000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const sold = createPlayer({
          id: "p_s5",
          name: "Player Sold",
          sell: true,
          contract: [{ salary: 300000, buyValue: 0, sellValue: 20000000, fromClub: "FC Barcelona", leftClub: "Chelsea FC", dataArrival: new Date("2026-07-01"), dataExit: new Date("2026-08-05") }],
        });
        const signed = createPlayer({
          id: "p_sig5",
          name: "Player Signed",
          buy: true,
          contract: [{ salary: 500000, buyValue: 40000000, sellValue: 0, fromClub: "Bayern", leftClub: "", dataArrival: new Date("2026-07-20") }],
        });
        const match = createMatch({ matchesId: "m_c5", date: "14/08/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_c5", seasonNumber: 1, players: [base, sold, signed], matches: [match] };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        expect(consolidated!.totalDays).toBe(44);
        expect(consolidated!.amount).toBe(32828571);
      });

      // 6. Transferências realizadas na mesma data
      it("Cenário 6 — Transferências na mesma data: contratação e venda no mesmo dia combinam seus impactos salariais", () => {
        const base = createPlayer({
          id: "p_b6",
          name: "Pedri",
          contract: [{ salary: 500000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const sold = createPlayer({
          id: "p_s6",
          name: "Ansu Fati",
          sell: true,
          contract: [{ salary: 100000, buyValue: 0, sellValue: 10000000, fromClub: "FC Barcelona", leftClub: "Sevilla FC", dataArrival: new Date("2026-07-01"), dataExit: new Date("2026-07-10") }],
        });
        const bought = createPlayer({
          id: "p_sig6",
          name: "Nico Williams",
          buy: true,
          contract: [{ salary: 200000, buyValue: 58000000, sellValue: 0, fromClub: "Athletic Club", leftClub: "", dataArrival: new Date("2026-07-10") }],
        });
        const match = createMatch({ matchesId: "m_c6", date: "15/07/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_c6", seasonNumber: 1, players: [base, sold, bought], matches: [match] };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        expect(consolidated!.totalDays).toBe(14);
        expect(consolidated!.amount).toBe(1271429);
      });

      // 7. Contratação ou venda no meio de uma semana
      it("Cenário 7 — Contratação ou venda no meio de uma semana: calcula proporcional por dias exatos", () => {
        const cubarsi = createPlayer({
          id: "cubarsi_2",
          name: "Pau Cubarsí",
          buy: true,
          contract: [{ salary: 700000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-04") }],
        });
        const match = createMatch({ matchesId: "m_c7", date: "07/07/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_c7", seasonNumber: 1, players: [cubarsi], matches: [match] };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        // 01/07 a 04/07: 0. 04/07 a 07/07: 3 dias a 100k/dia = 300.000
        expect(consolidated!.totalDays).toBe(6);
        expect(consolidated!.amount).toBe(300000);
      });

      // 8. Cálculo proporcional por dias sem arredondar semanas inteiras
      it("Cenário 8 — Cálculo proporcional por dias: 2 dias = 200k e 5 dias = 500k com folha de 100k/dia sem arredondar para semana cheia", () => {
        const player = createPlayer({
          id: "frenkie_21",
          name: "Frenkie de Jong",
          salary: 700000, // 100k/dia
          contract: [{ salary: 700000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });

        // Teste de 2 dias (01/07 a 03/07)
        const match2Days = createMatch({ matchesId: "m_2d", date: "03/07/2026", status: "FINISHED" });
        const season2Days: ClubData = { id: "s_2d", seasonNumber: 1, players: [player], matches: [match2Days] };
        const res2Days = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season: season2Days });
        expect(res2Days!.totalDays).toBe(2);
        expect(res2Days!.amount).toBe(200000);

        // Teste de 5 dias (01/07 a 06/07)
        const match5Days = createMatch({ matchesId: "m_5d", date: "06/07/2026", status: "FINISHED" });
        const season5Days: ClubData = { id: "s_5d", seasonNumber: 1, players: [player], matches: [match5Days] };
        const res5Days = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season: season5Days });
        expect(res5Days!.totalDays).toBe(5);
        expect(res5Days!.amount).toBe(500000);
      });

      // 9. Partidas finalizadas em sequência incrementando a despesa consolidada única da temporada
      it("Cenário 9 — Partidas em sequência incrementando a despesa consolidada única da temporada", () => {
        const pedri = createPlayer({
          id: "pedri_8",
          name: "Pedri",
          salary: 700000, // 100k/dia
          contract: [{ salary: 700000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const match1 = createMatch({ matchesId: "m_seq1", date: "08/07/2026", status: "FINISHED" });
        const match2 = createMatch({ matchesId: "m_seq2", date: "15/07/2026", status: "FINISHED" });

        const seasonPart1: ClubData = { id: "s_seq", seasonNumber: 1, players: [pedri], matches: [match1] };
        const run1 = reconcileSeasonFinancialEntries(seasonPart1, [], barcaCareer);
        const salaryEntries1 = run1.filter((e) => e.source === "salary");
        expect(salaryEntries1).toHaveLength(1);
        expect(salaryEntries1[0].id).toBe("salary_season_s_seq");
        expect(salaryEntries1[0].amount).toBe(700000);
        expect(salaryEntries1[0].description).toBe("Salários de atletas (01/07 a 08/07)");

        // Após segunda partida, reconcilia incrementando o mesmo lançamento consolidado único
        const seasonPart2: ClubData = { id: "s_seq", seasonNumber: 1, players: [pedri], matches: [match1, match2] };
        const run2 = reconcileSeasonFinancialEntries(seasonPart2, run1, barcaCareer);
        const salaryEntries2 = run2.filter((e) => e.source === "salary");
        expect(salaryEntries2).toHaveLength(1);
        expect(salaryEntries2[0].id).toBe("salary_season_s_seq");
        expect(salaryEntries2[0].amount).toBe(1400000);
        expect(salaryEntries2[0].description).toBe("Salários de atletas (01/07 a 15/07)");
      });

      // 10. Partidas finalizadas fora de ordem cronológica
      it("Cenário 10 — Partidas finalizadas fora de ordem cronológica: produzem exatamente o mesmo resultado consolidado final", () => {
        const lamine = createPlayer({
          id: "lamine_19",
          name: "Lamine Yamal",
          salary: 700000,
          contract: [{ salary: 700000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const matchEarly = createMatch({ matchesId: "m_early", date: "10/07/2026", status: "FINISHED" });
        const matchLate = createMatch({ matchesId: "m_late", date: "20/07/2026", status: "FINISHED" });

        const seasonChronological: ClubData = { id: "s_chrono", seasonNumber: 1, players: [lamine], matches: [matchEarly, matchLate] };
        const seasonInverted: ClubData = { id: "s_chrono", seasonNumber: 1, players: [lamine], matches: [matchLate, matchEarly] };

        const res1 = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season: seasonChronological });
        const res2 = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season: seasonInverted });

        expect(res1).not.toBeNull();
        expect(res2).not.toBeNull();
        expect(res1!.id).toBe(res2!.id);
        expect(res1!.amount).toBe(res2!.amount);
        expect(res1!.totalDays).toBe(res2!.totalDays);
        expect(res1!.description).toBe(res2!.description);
        expect(res1!.lastMatchId).toBe("m_late");
        expect(res2!.lastMatchId).toBe("m_late");
      });

      // 11. Reprocessamento idempotente sem duplicação
      it("Cenário 11 — Reprocessamento sem duplicação de despesas: executar 3 vezes consecutivas mantém 1 único lançamento", () => {
        const player = createPlayer({
          id: "p_idemp",
          name: "Pedri",
          salary: 350000,
          contract: [{ salary: 350000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const match = createMatch({ matchesId: "m_idemp", date: "15/07/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_idemp", seasonNumber: 1, players: [player], matches: [match] };

        const run1 = reconcileSeasonFinancialEntries(season, [], barcaCareer);
        const run2 = reconcileSeasonFinancialEntries(season, run1, barcaCareer);
        const run3 = reconcileSeasonFinancialEntries(season, run2, barcaCareer);

        const salaries = run3.filter((e) => e.source === "salary");
        expect(salaries).toHaveLength(1);
        expect(salaries[0].amount).toBe(run1.find((e) => e.source === "salary")!.amount);
      });

      // 14. Calendário europeu e não europeu (e início correto em múltiplas temporadas)
      it("Cenário 14 — Calendário europeu vs não europeu e início correto em múltiplas temporadas", () => {
        // 14.1. Calendário europeu (Espanha):
        // Temporada 1: 01/07/2026. Partida em 15/07/2026 -> 14 dias
        const fcbEuropeanCareer = { createdAt: new Date("2026-07-01"), nation: "ESP" };
        const frenkie = createPlayer({
          id: "frenkie_21",
          name: "Frenkie de Jong",
          salary: 700000, // 100k/dia
          contract: [{ salary: 700000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const matchEurT1 = createMatch({ matchesId: "m_eur_t1", date: "15/07/2026", status: "FINISHED" });
        const seasonEurT1: ClubData = { id: "s_eur_1", seasonNumber: 1, players: [frenkie], matches: [matchEurT1] };

        const resEurT1 = calculateConsolidatedSeasonSalaryExpense({ career: fcbEuropeanCareer, season: seasonEurT1 });
        expect(resEurT1!.totalDays).toBe(14);
        expect(resEurT1!.amount).toBe(1400000);

        // Temporada 2 europeia (seasonNumber: 2 -> data início: 01/07/2027)
        // Partida em 15/07/2027 DEVE calcular 14 dias a partir de 01/07/2027 (e NÃO 379 dias desde 2026!)
        const matchEurT2 = createMatch({ matchesId: "m_eur_t2", date: "15/07/2027", status: "FINISHED" });
        const seasonEurT2: ClubData = { id: "s_eur_2", seasonNumber: 2, players: [frenkie], matches: [matchEurT2] };

        const resEurT2 = calculateConsolidatedSeasonSalaryExpense({ career: fcbEuropeanCareer, season: seasonEurT2 });
        expect(resEurT2!.totalDays).toBe(14);
        expect(resEurT2!.amount).toBe(1400000);
        expect(resEurT2!.fromDayMonth).toBe("01/07");
        expect(resEurT2!.toDayMonth).toBe("15/07");

        // 14.2. Calendário não europeu (Brasil, nation: "BRA"):
        // Temporada 1: data início: 01/01/2026. Partida em 15/01/2026 -> 14 dias
        const nonEurCareer = { createdAt: new Date("2026-01-01"), nation: "BRA" };
        const vitorRoque = createPlayer({
          id: "vitor_19",
          name: "Vitor Roque",
          salary: 140000, // 20k/dia
          contract: [{ salary: 140000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-01-01") }],
        });
        const matchNonEurT1 = createMatch({ matchesId: "m_bra_t1", date: "15/01/2026", status: "FINISHED" });
        const seasonNonEurT1: ClubData = { id: "s_bra_1", seasonNumber: 1, players: [vitorRoque], matches: [matchNonEurT1] };

        const resNonEurT1 = calculateConsolidatedSeasonSalaryExpense({ career: nonEurCareer, season: seasonNonEurT1 });
        expect(resNonEurT1!.totalDays).toBe(14);
        expect(resNonEurT1!.amount).toBe(280000);
        expect(resNonEurT1!.fromDayMonth).toBe("01/01");
        expect(resNonEurT1!.toDayMonth).toBe("15/01");

        // Temporada 2 não europeia (seasonNumber: 2 -> data início: 01/01/2027)
        // Partida em 15/01/2027 calcula 14 dias da Temporada 2
        const matchNonEurT2 = createMatch({ matchesId: "m_bra_t2", date: "15/01/2027", status: "FINISHED" });
        const seasonNonEurT2: ClubData = { id: "s_bra_2", seasonNumber: 2, players: [vitorRoque], matches: [matchNonEurT2] };

        const resNonEurT2 = calculateConsolidatedSeasonSalaryExpense({ career: nonEurCareer, season: seasonNonEurT2 });
        expect(resNonEurT2!.totalDays).toBe(14);
        expect(resNonEurT2!.amount).toBe(280000);
      });

      // 15. Primeira partida finalizada muito tempo depois do início da temporada
      it("Cenário 15 — Primeira partida finalizada muito tempo depois do início da temporada (ex.: 01/07 a 15/10 = 106 dias)", () => {
        const pedri = createPlayer({
          id: "pedri_8",
          name: "Pedri",
          salary: 700000, // 100k/dia
          contract: [{ salary: 700000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        const lateMatch = createMatch({ matchesId: "m_late_106", date: "15/10/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_late", seasonNumber: 1, players: [pedri], matches: [lateMatch] };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        // 01/07 a 15/10 = 31 (julho) + 31 (agosto) + 30 (setembro) + 14 (outubro) = 106 dias
        expect(consolidated!.totalDays).toBe(106);
        expect(consolidated!.amount).toBe(10600000);
        expect(consolidated!.description).toBe("Salários de atletas (01/07 a 15/10)");
      });

      // 16. Reconstrução histórica com atletas que já saíram do elenco (sell: true)
      it("Cenário 16 — Reconstrução histórica envolvendo jogadores que já saíram do elenco (sell: true)", () => {
        const gundogan = createPlayer({
          id: "gundo_22",
          name: "İlkay Gündoğan",
          salary: 350000, // 50k/dia
          sell: true,
          contract: [{ salary: 350000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "Manchester City", dataArrival: new Date("2026-07-01"), dataExit: new Date("2026-07-21") }],
        });
        const match = createMatch({ matchesId: "m_c16", date: "31/07/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_c16", seasonNumber: 1, players: [gundogan], matches: [match] };

        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        // 01/07 a 21/07 (20 dias): recebia 50k/dia -> 1.000.000
        // 21/07 a 31/07 (10 dias): já havia saído do clube -> 0
        expect(consolidated!.totalDays).toBe(30);
        expect(consolidated!.amount).toBe(1000000);
      });

      // 17. Transferências anteriores à primeira partida finalizada
      it("Cenário 17 — Transferências anteriores à primeira partida finalizada: fatia a folha salarial antes da estreia na temporada", () => {
        // 01/07: Elenco base com folha de 3.000.000/sem
        const base = createPlayer({
          id: "p_base_17",
          name: "Base Squad",
          contract: [{ salary: 3000000, buyValue: 0, sellValue: 0, fromClub: "FC Barcelona", leftClub: "", dataArrival: new Date("2026-07-01") }],
        });
        // 15/07: Reforço contratado com +1.000.000/sem
        const signed = createPlayer({
          id: "p_sig_17",
          name: "Reforço",
          buy: true,
          contract: [{ salary: 1000000, buyValue: 40000000, sellValue: 0, fromClub: "Bayern", leftClub: "", dataArrival: new Date("2026-07-15") }],
        });
        // 01/08: Venda que remove 500.000/sem
        const sold = createPlayer({
          id: "p_sold_17",
          name: "Vendido",
          sell: true,
          contract: [{ salary: 500000, buyValue: 0, sellValue: 20000000, fromClub: "FC Barcelona", leftClub: "Chelsea", dataArrival: new Date("2026-07-01"), dataExit: new Date("2026-08-01") }],
        });

        // 1ª partida da temporada em 14/08/2026 (44 dias desde 01/07)
        const match = createMatch({ matchesId: "m_first_match_17", date: "14/08/2026", status: "FINISHED" });
        const season: ClubData = { id: "s_c17", seasonNumber: 1, players: [base, signed, sold], matches: [match] };

        // 01/07 a 15/07: 14 dias com folha 3.500.000 -> (3.5M / 7) * 14 = 7.000.000
        // 15/07 a 01/08: 17 dias com folha 4.500.000 -> (4.5M / 7) * 17 = 10.928.571,42...
        // 01/08 a 14/08: 13 dias com folha 4.000.000 -> (4.0M / 7) * 13 = 7.428.571,42...
        // Total = 7.000.000 + 10.928.571 + 7.428.571 = 25.357.143
        const consolidated = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season });
        expect(consolidated).not.toBeNull();
        expect(consolidated!.totalDays).toBe(44);
        expect(consolidated!.amount).toBe(25357143);
      });

      // 18. Mudanças salariais ao longo da temporada (empréstimo e retorno na mesma temporada / múltiplas renovações)
      it("Cenário 18 — Mudanças salariais ao longo da temporada: empréstimo com retorno na mesma temporada e múltiplas renovações sucessivas", () => {
        // Atleta 1: Ansu Fati emprestado em 10/07 com 0% pago pelo Barcelona e retorno em 20/07 (volta a pagar 100%)
        const ansu = createPlayer({
          id: "ansu_10",
          name: "Ansu Fati",
          salary: 140000, // 20k/dia
          loan: true,
          contract: [
            {
              buyValue: 0,
              sellValue: 0,
              fromClub: "",
              leftClub: "Sevilla FC",
              dataArrival: null,
              dataExit: new Date("2026-07-10"),
              wagePercentage: 0, // Sevilla paga 100%, Barça paga 0%
              isLoan: true,
            },
            {
              buyValue: 0,
              sellValue: 0,
              fromClub: "Fim de Empréstimo",
              leftClub: "",
              dataArrival: new Date("2026-07-20"),
              dataExit: null,
              isLoan: false,
            },
          ],
        });

        // Partida em 30/07/2026 (29 dias total)
        // 01/07 a 10/07 (9 dias): Barça paga 20k/dia -> 180.000
        // 10/07 a 20/07 (10 dias): Emprestado (0%) -> 0
        // 20/07 a 30/07 (10 dias): Retornou (100% = 20k/dia) -> 200.000
        // Total = 380.000
        const matchAnsu = createMatch({ matchesId: "m_c18_ansu", date: "30/07/2026", status: "FINISHED" });
        const seasonAnsu: ClubData = { id: "s_c18_ansu", seasonNumber: 1, players: [ansu], matches: [matchAnsu] };

        const resAnsu = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season: seasonAnsu });
        expect(resAnsu!.totalDays).toBe(29);
        expect(resAnsu!.amount).toBe(380000);

        // Atleta 2: Pau Cubarsí com 2 renovações sucessivas na mesma temporada
        const cubarsi = createPlayer({
          id: "cubarsi_2",
          name: "Pau Cubarsí",
          contract: [
            {
              salary: 250000,
              previousSalary: 100000,
              isRenewal: true,
              dataArrival: new Date("2026-07-15"),
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
            },
            {
              salary: 400000,
              previousSalary: 250000,
              isRenewal: true,
              dataArrival: new Date("2026-10-15"),
              buyValue: 0,
              sellValue: 0,
              fromClub: "FC Barcelona",
              leftClub: "",
            },
          ],
        });

        const matchCubarsi = createMatch({ matchesId: "m_c18_cubarsi", date: "31/10/2026", status: "FINISHED" });
        const seasonCubarsi: ClubData = { id: "s_c18_cubarsi", seasonNumber: 1, players: [cubarsi], matches: [matchCubarsi] };

        // 01/07 a 15/07 (14 dias): 100k/sem -> (100k / 7) * 14 = 200.000
        // 15/07 a 15/10 (92 dias): 250k/sem -> (250k / 7) * 92 = 3.285.714,28...
        // 15/10 a 31/10 (16 dias): 400k/sem -> (400k / 7) * 16 = 914.285,71...
        // Total = 200.000 + 3.285.714 + 914.286 = 4.400.000 (em 122 dias)
        const resCubarsi = calculateConsolidatedSeasonSalaryExpense({ career: barcaCareer, season: seasonCubarsi });
        expect(resCubarsi!.totalDays).toBe(122);
        expect(resCubarsi!.amount).toBe(4400000);
      });
    });
  });
});
