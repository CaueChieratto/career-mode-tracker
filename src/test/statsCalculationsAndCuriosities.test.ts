import { describe, it, expect } from "vitest";
import {
  aggregateAllPlayersStats,
  aggregateSinglePlayerStats,
} from "../common/stats/engine/playerStatsAggregator";
import { METRICS_REGISTRY } from "../common/stats/registry/metricsRegistry";
import { getAggregatedStats } from "../pages/ComparePlayers/helpers/getAggregatedStats";
import { buildCuriosities } from "../layout/SectionView/features/ClubTabs/CuriositiesTab/helpers/buildCuriosities";
import {
  getGoalPeriod,
  getInterval,
} from "../layout/SectionView/features/ClubTabs/CuriositiesTab/helpers/buildCuriosities/utils";
import { allRankingCards } from "../layout/SectionView/features/ClubTabs/CuriositiesTab/constants";
import { Match } from "../common/interfaces/Match";
import { Players } from "../common/interfaces/playersInfo/players";
import { LeagueStats } from "../common/interfaces/playersStats/leagueStats";
import { AugmentedCareer } from "../common/interfaces/ComparePlayers";
import { ClubData } from "../common/interfaces/club/clubData";
import { Career } from "../common/interfaces/Career";
import { UNIFIED_CARDS_CONFIG } from "../layout/SectionView/features/ClubTabs/BestPlayersTab/constants/statConfigs";

const createMockLeagueStat = (
  leagueName: string,
  stats: Partial<LeagueStats["stats"]> & { minutes?: number },
): LeagueStats => ({
  leagueName,
  leagueImage: "",
  stats: {
    games: 0,
    goals: 0,
    assists: 0,
    minutesPlayed: stats.minutesPlayed ?? stats.minutes ?? 0,
    rating: 0,
    defenses: 0,
    cleanSheets: 0,
    ...stats,
  },
});

const createMockPlayer = (
  id: string,
  name: string,
  statsLeagues: LeagueStats[] = [],
): Players =>
  ({
    id,
    name,
    position: "ATA",
    sector: "Ataque",
    overall: 80,
    age: 24,
    salary: 10000,
    nation: "Brasil",
    shirtNumber: "9",
    playerValue: 1000000,
    buy: false,
    captain: false,
    sell: false,
    contractTime: 3,
    statsLeagues,
    contract: [],
    transferHistory: [],
    ballonDor: 0,
  }) as Players;

const createMockMatch = (partial: Partial<Match>): Match => ({
  matchesId: "m-" + Math.random().toString(36).slice(2),
  date: "2026-05-10",
  homeTeam: "Real Madrid",
  awayTeam: "Barcelona",
  result: "V",
  league: "La Liga",
  status: "FINISHED",
  playerStats: [],
  ...partial,
});

describe("Cálculos de Stats e Curiosidades - Suíte de Testes Automatizados", () => {
  describe("Pilar 1: Métricas Pareadas (*PerGame e *Per90)", () => {
    it("evita divisão por zero quando o jogador possui 0 minutos jogados", () => {
      const playerZero = createMockPlayer("p1", "Jogador 0 Min", [
        createMockLeagueStat("La Liga", {
          games: 1,
          minutes: 0,
          goals: 1,
          assists: 1,
          rating: 7.0,
        }),
      ]);

      const career: AugmentedCareer = {
        id: "c1",
        clubName: "Real Madrid",
        clubData: [
          {
            id: "s1",
            seasonNumber: 1,
            players: [playerZero],
            matches: [
              createMockMatch({
                playerStats: [
                  {
                    playerId: "p1",
                    minutesPlayed: 0,
                    goals: 0,
                    assists: 0,
                    defenses: 0,
                    rating: 7,
                    distanceKm: 0,
                    yellowCard: true,
                    redCard: false,
                    totalPasses: 10,
                  },
                ],
              }),
            ],
          },
        ],
      } as unknown as AugmentedCareer;

      const agg = aggregateSinglePlayerStats(
        playerZero,
        career,
        "s1",
        "season",
      );
      expect(agg).not.toBeNull();
      if (!agg) return;

      expect(agg.minutesPlayed).toBe(0);
      expect(agg.games).toBe(1);

      // PerGame deve calcular normalmente (1/1)
      expect(agg.goalsPerGame).toBe(1);
      expect(agg.assistsPerGame).toBe(1);
      expect(agg.passesPerGame).toBe(10);
      expect(agg.yellowCardsPerGame).toBe(1);

      // Per90 deve ser 0 absoluto e nunca Infinity, NaN ou inflado
      expect(agg.goalsPer90).toBe(0);
      expect(agg.assistsPer90).toBe(0);
      expect(agg.passesPer90).toBe(0);
      expect(agg.yellowCardsPer90).toBe(0);
      expect(Number.isFinite(agg.goalsPer90)).toBe(true);
      expect(Number.isFinite(agg.passesPer90)).toBe(true);
    });

    it("calcula corretamente métricas por jogo e por 90 minutos com minutos reais", () => {
      // 2 partidas de 90 min (180 min total): 4 gols, 2 assists, 100 passes
      const playerReal = createMockPlayer("p2", "Jogador Real", [
        createMockLeagueStat("La Liga", {
          games: 2,
          minutes: 180,
          goals: 4,
          assists: 2,
          rating: 8.5,
        }),
      ]);

      const career: AugmentedCareer = {
        id: "c1",
        clubName: "Real Madrid",
        clubData: [
          {
            id: "s1",
            seasonNumber: 1,
            players: [playerReal],
            matches: [
              createMockMatch({
                playerStats: [
                  {
                    playerId: "p2",
                    minutesPlayed: 90,
                    goals: 0,
                    assists: 0,
                    defenses: 0,
                    rating: 8,
                    distanceKm: 10,
                    yellowCard: false,
                    redCard: false,
                    totalPasses: 60,
                    passesMissed: 10,
                    totalFinishings: 4,
                    finishingsMissed: 1,
                  },
                ],
              }),
              createMockMatch({
                playerStats: [
                  {
                    playerId: "p2",
                    minutesPlayed: 90,
                    goals: 0,
                    assists: 0,
                    defenses: 0,
                    rating: 8,
                    distanceKm: 10,
                    yellowCard: false,
                    redCard: false,
                    totalPasses: 40,
                    passesMissed: 10,
                    totalFinishings: 4,
                    finishingsMissed: 1,
                  },
                ],
              }),
            ],
          },
        ],
      } as unknown as AugmentedCareer;

      const agg = aggregateSinglePlayerStats(
        playerReal,
        career,
        "s1",
        "season",
      );
      expect(agg).not.toBeNull();
      if (!agg) return;

      expect(agg.games).toBe(2);
      expect(agg.minutesPlayed).toBe(180);

      // Per Game
      expect(agg.goalsPerGame).toBe(2); // 4 / 2
      expect(agg.assistsPerGame).toBe(1); // 2 / 2
      expect(agg.passesPerGame).toBe(50); // 100 / 2
      expect(agg.finishingsPerGame).toBe(4); // 8 / 2

      // Per 90 (multiplier = 90 / 180 = 0.5)
      expect(agg.goalsPer90).toBe(2); // 4 * 0.5
      expect(agg.assistsPer90).toBe(1); // 2 * 0.5
      expect(agg.passesPer90).toBe(50); // 100 * 0.5
      expect(agg.finishingsPer90).toBe(4); // 8 * 0.5
    });

    it("agrega métricas pareadas para todos os jogadores via aggregateAllPlayersStats", () => {
      const p1 = createMockPlayer("p1", "Jogador 1", [
        createMockLeagueStat("La Liga", {
          games: 1,
          minutes: 90,
          goals: 2,
          assists: 1,
          rating: 7.5,
        }),
      ]);
      const p2 = createMockPlayer("p2", "Jogador 2", [
        createMockLeagueStat("La Liga", {
          games: 2,
          minutes: 180,
          goals: 6,
          assists: 2,
          rating: 8.0,
        }),
      ]);

      const season = {
        id: "s1",
        seasonNumber: 1,
        players: [p1, p2],
        matches: [],
      };
      const career = {
        id: "c1",
        clubName: "Real Madrid",
        clubData: [season],
      };

      const result = aggregateAllPlayersStats({
        season: season as unknown as ClubData,
        career: career as unknown as Career,
        isGeralPage: false,
        minPercentage: 0,
      });

      const p1Stat = result.find((s) => s.player.id === "p1");
      const p2Stat = result.find((s) => s.player.id === "p2");

      expect(p1Stat?.goalsPerGame).toBe(2);
      expect(p1Stat?.goalsPer90).toBe(2);
      expect(p2Stat?.goalsPerGame).toBe(3);
      expect(p2Stat?.goalsPer90).toBe(3);
    });

    it("formata todas as métricas pareadas no getAggregatedStats (ComparePlayers)", () => {
      const p1 = createMockPlayer("p1", "Jogador 1", [
        createMockLeagueStat("La Liga", {
          games: 1,
          minutes: 90,
          goals: 2,
          assists: 1,
          rating: 8.0,
        }),
      ]);

      const career: AugmentedCareer = {
        id: "c1",
        clubName: "Real Madrid",
        clubData: [
          {
            id: "s1",
            seasonNumber: 1,
            players: [p1],
            matches: [
              createMockMatch({
                playerStats: [
                  {
                    playerId: "p1",
                    minutesPlayed: 90,
                    goals: 0,
                    assists: 0,
                    defenses: 0,
                    rating: 8,
                    distanceKm: 10,
                    yellowCard: false,
                    redCard: false,
                    totalPasses: 50,
                  },
                ],
              }),
            ],
          },
        ],
      } as unknown as AugmentedCareer;

      const display = getAggregatedStats(p1, career, "s1", "season");
      expect(display).not.toBeNull();
      if (!display) return;

      expect(display.goalsPerGame).toBe("2.00");
      expect(display.goalsPer90).toBe("2.00");
      expect(display.assistsPerGame).toBe("1.00");
      expect(display.assistsPer90).toBe("1.00");
      expect(display.passesPerGame).toBe("50.0");
      expect(display.passesPer90).toBe("50.0");
    });

    it("mantém no METRICS_REGISTRY o pareamento estruturado de métricas perGame e per90", () => {
      const metricList = Object.values(METRICS_REGISTRY);
      const keys = metricList.map((m) => m.id);

      const verifyPair = (perGameKey: string, per90Key: string) => {
        const gameMetric = METRICS_REGISTRY[perGameKey];
        const p90Metric = METRICS_REGISTRY[per90Key];
        expect(gameMetric).toBeDefined();
        expect(p90Metric).toBeDefined();
        expect(gameMetric.category).toBe(p90Metric.category);

        const gameIdx = keys.indexOf(perGameKey);
        const p90Idx = keys.indexOf(per90Key);
        // Devem estar sequencialmente pareadas
        expect(p90Idx).toBe(gameIdx + 1);
      };

      verifyPair("goalsPerGame", "goalsPer90");
      verifyPair("assistsPerGame", "assistsPer90");
      verifyPair("goalParticipationsPerGame", "goalParticipationsPer90");
      verifyPair("finishingsPerGame", "finishingsPer90");
      verifyPair("finishingsOnTargetPerGame", "finishingsOnTargetPer90");
      verifyPair("passesPerGame", "passesPer90");
      verifyPair("passesCompletedPerGame", "passesCompletedPer90");
      verifyPair("passesMissedPerGame", "passesMissedPer90");
      verifyPair("keyPassesPerGame", "keyPassesPer90");
      verifyPair("dribblesPerGame", "dribblesPer90");
      verifyPair("ballsRecoveredPerGame", "ballsRecoveredPer90");
      verifyPair("ballsLostPerGame", "ballsLostPer90");
      verifyPair("defensesPerGame", "defensesPer90");
      verifyPair("yellowCardsPerGame", "yellowCardsPer90");
      verifyPair("redCardsPerGame", "redCardsPer90");
    });
  });

  describe("Pilar 2: Acréscimos (1º e 2º Tempo) e Prorrogação", () => {
    describe("getGoalPeriod", () => {
      it("considera 1º Tempo para minutos <= 45", () => {
        expect(getGoalPeriod(30, "30")).toBe("1T");
        expect(getGoalPeriod(45, "45")).toBe("1T");
      });

      it("considera 1º Tempo para acréscimos explícitos no 1º tempo", () => {
        // Gol aos 50 min com 5 min de acréscimo no 1T
        expect(getGoalPeriod(50, "50", { stoppage1T: 5 } as Match)).toBe("1T");
        expect(getGoalPeriod(48, "48", { stoppage1T: 3 } as Match)).toBe("1T");
        // Gol com string no formato '45+5'
        expect(getGoalPeriod(50, "45+5")).toBe("1T");
      });

      it("não considera 1º tempo quando o minuto excede os acréscimos do 1T", () => {
        // Minuto 50 sem acréscimo de 1T ou acréscimo menor (ex: 3 min) -> pertence ao 2T
        expect(getGoalPeriod(50, "50")).toBe("2T");
        expect(getGoalPeriod(50, "50", { stoppage1T: 3 } as Match)).toBe("2T");
      });

      it("trata prorrogação estritamente sob a regra hasExtraTime === true", () => {
        // Gol aos 99 min SEM prorrogação -> 2º Tempo (acréscimos regulamentares)
        expect(getGoalPeriod(99, "99", { hasExtraTime: false } as Match)).toBe(
          "2T",
        );
        expect(getGoalPeriod(99, "99", {} as Match)).toBe("2T");

        // Gol aos 99 min COM prorrogação -> ET (Prorrogação)
        expect(getGoalPeriod(99, "99", { hasExtraTime: true } as Match)).toBe(
          "ET",
        );
        expect(getGoalPeriod(95, "95", { hasExtraTime: true } as Match)).toBe(
          "ET",
        );
        expect(getGoalPeriod(118, "118", { hasExtraTime: true } as Match)).toBe(
          "ET",
        );
      });
    });

    describe("getInterval", () => {
      it("coloca gols nos acréscimos do 1º tempo no intervalo 31-45+'", () => {
        expect(getInterval(50, "1T")).toBe("31-45+'");
        expect(getInterval(45, "1T")).toBe("31-45+'");
        expect(getInterval(20, "1T")).toBe("16-30'");
        expect(getInterval(5, "1T")).toBe("0-15'");
      });

      it("coloca gols regulamentares do 2º tempo nos intervalos adequados", () => {
        expect(getInterval(50, "2T")).toBe("46-60'");
        expect(getInterval(65, "2T")).toBe("61-75'");
        expect(getInterval(80, "2T")).toBe("76-90+'");
        expect(getInterval(99, "2T")).toBe("76-90+'"); // Acréscimo do 2ºT
      });

      it("coloca gols de prorrogação nos intervalos 91-105' e 106-120+'", () => {
        expect(getInterval(95, "ET")).toBe("91-105'");
        expect(getInterval(105, "ET")).toBe("91-105'");
        expect(getInterval(106, "ET")).toBe("106-120+'");
        expect(getInterval(119, "ET")).toBe("106-120+'");
      });
    });

    describe("Integração com Curiosities: stoppageTimeExperts e Faro de Gol", () => {
      it("computa gol aos 96' como stoppageTimeExperts quando hasExtraTime é false", () => {
        const p1 = createMockPlayer("p1", "Jude Bellingham");
        const match = createMockMatch({
          hasExtraTime: false,
          playerStats: [
            {
              playerId: "p1",
              minutesPlayed: 90,
              goals: 1,
              assists: 0,
              defenses: 0,
              rating: 8,
              distanceKm: 10,
              yellowCard: false,
              redCard: false,
              goalMinutes: [96],
            },
          ],
        });

        const curiosities = buildCuriosities([match], "Real Madrid", (id) =>
          id === "p1" ? p1.name : "Desconhecido",
        );

        expect(curiosities.rankings?.topStoppageTimeExperts).toEqual([
          { label: "Jude Bellingham", count: 1 },
        ]);

        const faroHighlight = curiosities.highlights.find(
          (h) => h.label === "⏱️ Faro de Gol (Tempos)",
        );
        expect(faroHighlight).toBeDefined();
        // Não deve ter 'Prorrogação'
        expect(faroHighlight?.value).toBe("0 no 1ºT | 1 no 2ºT");
      });

      it("computa gol aos 96' em prorrogação quando hasExtraTime é true, sem inflar stoppageTimeExperts", () => {
        const p1 = createMockPlayer("p1", "Jude Bellingham");
        const match = createMockMatch({
          hasExtraTime: true,
          playerStats: [
            {
              playerId: "p1",
              minutesPlayed: 120,
              goals: 1,
              assists: 0,
              defenses: 0,
              rating: 8,
              distanceKm: 12,
              yellowCard: false,
              redCard: false,
              goalMinutes: [96],
            },
          ],
        });

        const curiosities = buildCuriosities([match], "Real Madrid", (id) =>
          id === "p1" ? p1.name : "Desconhecido",
        );

        // Não é gol nos acréscimos regulamentares do 2T (stoppageTimeExperts)
        expect(curiosities.rankings?.topStoppageTimeExperts).toEqual([]);

        // Deve figurar na Prorrogação no Faro de Gol
        const faroHighlight = curiosities.highlights.find(
          (h) => h.label === "⏱️ Faro de Gol (Tempos)",
        );
        expect(faroHighlight).toBeDefined();
        expect(faroHighlight?.value).toBe(
          "0 no 1ºT | 0 no 2ºT | 1 na Prorrogação",
        );
      });
    });
  });

  describe("Pilar 3: Duplas em Curiosities (Conexões Diretas vs Melhores Duplas)", () => {
    it("separa Conexões Diretas (direcionais) e agrega Melhores Duplas (simétrica)", () => {
      // Cenário:
      // Vinicius passa para Rodrygo marcar 3 vezes (Vinicius -> Rodrygo: 3)
      // Rodrygo passa para Vinicius marcar 2 vezes (Rodrygo -> Vinicius: 2)
      // Total de participações mútuas da dupla: 5
      const match = createMockMatch({
        playerStats: [
          {
            playerId: "pRodrygo",
            minutesPlayed: 90,
            goals: 3,
            assists: 0,
            defenses: 0,
            rating: 9,
            distanceKm: 10,
            yellowCard: false,
            redCard: false,
            goalMinutes: [10, 20, 30],
            assistTargets: ["Vinicius Jr - 50'", "Vinicius Jr - 60'"],
          },
          {
            playerId: "pVini",
            minutesPlayed: 90,
            goals: 2,
            assists: 0,
            defenses: 0,
            rating: 8.5,
            distanceKm: 10,
            yellowCard: false,
            redCard: false,
            goalMinutes: [50, 60],
            assistTargets: ["Rodrygo - 10'", "Rodrygo - 20'", "Rodrygo - 30'"],
          },
        ],
      });

      const playerMap: Record<string, string> = {
        pVini: "Vinicius Jr",
        pRodrygo: "Rodrygo",
      };

      const curiosities = buildCuriosities([match], "Real Madrid", (id) =>
        id ? playerMap[id] || id : "Desconhecido",
      );

      // Conexões Diretas (direcionais) mantêm distinção de quem serviu quem
      const diretas = curiosities.rankings?.topTeamDuos;
      expect(diretas).toBeDefined();
      expect(diretas).toEqual([
        { label: "Rodrygo (Ass: Vinicius Jr)", count: 3 },
        { label: "Vinicius Jr (Ass: Rodrygo)", count: 2 },
      ]);

      // Melhores Duplas (simétrica / soma mútua)
      const melhoresDuplas = curiosities.rankings?.topBestDuos;
      expect(melhoresDuplas).toBeDefined();
      expect(melhoresDuplas).toEqual([
        { label: "Rodrygo & Vinicius Jr", count: 5 },
      ]);
    });

    it("valida títulos e configurações dos cards de Duplas em allRankingCards", () => {
      const topTeamDuosCard = allRankingCards.find(
        (c) => c.key === "topTeamDuos",
      );
      const topBestDuosCard = allRankingCards.find(
        (c) => c.key === "topBestDuos",
      );

      expect(topTeamDuosCard).toBeDefined();
      expect(topTeamDuosCard?.title).toBe("Conexões Diretas (Gol & Passe)");
      expect(topTeamDuosCard?.type).toBe("goals");

      expect(topBestDuosCard).toBeDefined();
      expect(topBestDuosCard?.title).toBe("Melhores Duplas");
      expect(topBestDuosCard?.type).toBe("participations");
    });
  });

  describe("UNIFIED_CARDS_CONFIG (BestPlayersTab - Opção 2 e Sequência de Stats)", () => {
    it("respeita a ordem estrita de categorias sem alternâncias entre ataque e passe", () => {
      const categoryOrder = [
        "geral",
        "ataque",
        "criacao",
        "conducoes",
        "defesa",
        "disciplina",
        "goleiro",
        "fisico",
      ];

      let lastIndex = 0;
      UNIFIED_CARDS_CONFIG.forEach((card) => {
        const catIndex = categoryOrder.indexOf(card.category);
        expect(catIndex).toBeGreaterThanOrEqual(lastIndex);
        lastIndex = catIndex;
      });
    });

    it("mantém todas as métricas de finalização contíguas sob 'ataque'", () => {
      const ataqueCards = UNIFIED_CARDS_CONFIG.filter(
        (c) => c.category === "ataque",
      );
      expect(ataqueCards.map((c) => c.id)).toEqual([
        "goals",
        "goalParticipations",
        "totalFinishings",
        "finishingsOnTarget",
        "finishingsMissed",
      ]);
    });

    it("mantém todas as métricas de passes e criação contíguas sob 'criacao'", () => {
      const criacaoCards = UNIFIED_CARDS_CONFIG.filter(
        (c) => c.category === "criacao",
      );
      expect(criacaoCards.map((c) => c.id)).toEqual([
        "assists",
        "totalPasses",
        "passesCompleted",
        "passesMissed",
        "keyPasses",
      ]);
    });

    it("nomeia a categoria e cards de condução corretamente como 'Conduções'", () => {
      const conducoesCards = UNIFIED_CARDS_CONFIG.filter(
        (c) => c.category === "conducoes",
      );
      expect(conducoesCards.map((c) => c.title)).toEqual([
        "Conduções",
        "Conduções Certas",
        "Conduções Erradas",
      ]);
    });

    it("possui Frequência como a 2ª aba em Gols, G/A e Assistências", () => {
      const goalsCard = UNIFIED_CARDS_CONFIG.find((c) => c.id === "goals");
      expect(goalsCard).toBeDefined();
      expect(goalsCard?.tabs.map((t) => t.id)).toEqual([
        "totals",
        "frequency",
        "perGame",
        "per90",
      ]);
      expect(goalsCard?.tabs.map((t) => t.label)).toEqual([
        "Totais",
        "Frequência",
        "Por Jogo",
        "Por 90 min",
      ]);
      expect(goalsCard?.tabs[1].isAscending).toBe(true);

      const assistsCard = UNIFIED_CARDS_CONFIG.find((c) => c.id === "assists");
      expect(assistsCard?.tabs[1].id).toBe("frequency");
      expect(assistsCard?.tabs[1].label).toBe("Frequência");

      const gaCard = UNIFIED_CARDS_CONFIG.find(
        (c) => c.id === "goalParticipations",
      );
      expect(gaCard?.tabs[1].id).toBe("frequency");
      expect(gaCard?.tabs[1].label).toBe("Frequência");

      const avgRatingCard = UNIFIED_CARDS_CONFIG.find(
        (c) => c.id === "avgRating",
      );
      expect(avgRatingCard?.tabs).toHaveLength(1);
    });

    it("aplica descrições completas nas stats (ex: '5 gols', '1 gol a cada 76 min', '1,09 gols por partida', '1,19 gols a cada 90 minutos')", () => {
      const goalsCard = UNIFIED_CARDS_CONFIG.find((c) => c.id === "goals");
      const totalsTab = goalsCard?.tabs.find((t) => t.id === "totals");
      const freqTab = goalsCard?.tabs.find((t) => t.id === "frequency");
      const perGameTab = goalsCard?.tabs.find((t) => t.id === "perGame");
      const per90Tab = goalsCard?.tabs.find((t) => t.id === "per90");

      expect(totalsTab?.format?.(5)).toBe("5 gols");
      expect(totalsTab?.format?.(1)).toBe("1 gol");
      expect(freqTab?.format?.(76)).toBe("1 gol a cada 76 min");
      expect(perGameTab?.format?.(1.09)).toBe("1,09 gols por partida");
      expect(per90Tab?.format?.(1.19)).toBe("1,19 gols a cada 90 minutos");

      const assistsCard = UNIFIED_CARDS_CONFIG.find((c) => c.id === "assists");
      expect(assistsCard?.tabs.find((t) => t.id === "totals")?.format?.(3)).toBe("3 assistências");
      expect(assistsCard?.tabs.find((t) => t.id === "frequency")?.format?.(120)).toBe("1 assistência a cada 120 min");
      expect(assistsCard?.tabs.find((t) => t.id === "perGame")?.format?.(0.5)).toBe("0,50 assistências por partida");
      expect(assistsCard?.tabs.find((t) => t.id === "per90")?.format?.(0.67)).toBe("0,67 assistências a cada 90 minutos");
    });

    it("separa em 2 linhas com formatParts (número grande em cima e descrição em 11px embaixo)", () => {
      const goalsCard = UNIFIED_CARDS_CONFIG.find((c) => c.id === "goals");
      const totalsTab = goalsCard?.tabs.find((t) => t.id === "totals");
      const freqTab = goalsCard?.tabs.find((t) => t.id === "frequency");
      const perGameTab = goalsCard?.tabs.find((t) => t.id === "perGame");
      const per90Tab = goalsCard?.tabs.find((t) => t.id === "per90");

      expect(totalsTab?.formatParts?.(5)).toEqual({ value: "5 gols" });
      expect(totalsTab?.formatParts?.(1)).toEqual({ value: "1 gol" });
      expect(freqTab?.formatParts?.(76)).toEqual({ value: "1 gol", description: "a cada 76 min" });
      expect(perGameTab?.formatParts?.(1.09)).toEqual({ value: "1,09 gols", description: "por partida" });
      expect(per90Tab?.formatParts?.(1.19)).toEqual({ value: "1,19 gols", description: "a cada 90 min" });

      const assistsCard = UNIFIED_CARDS_CONFIG.find((c) => c.id === "assists");
      expect(assistsCard?.tabs.find((t) => t.id === "totals")?.formatParts?.(3)).toEqual({ value: "3 assistências" });
      expect(assistsCard?.tabs.find((t) => t.id === "frequency")?.formatParts?.(120)).toEqual({ value: "1 assistência", description: "a cada 120 min" });
      expect(assistsCard?.tabs.find((t) => t.id === "perGame")?.formatParts?.(0.5)).toEqual({ value: "0,50 assistências", description: "por partida" });
      expect(assistsCard?.tabs.find((t) => t.id === "per90")?.formatParts?.(0.67)).toEqual({ value: "0,67 assistências", description: "a cada 90 min" });

      // Todas as tabs de todos os cards devem possuir formatParts
      UNIFIED_CARDS_CONFIG.forEach((card) => {
        card.tabs.forEach((tab) => {
          expect(tab.formatParts).toBeDefined();
        });
      });
    });
  });
});



