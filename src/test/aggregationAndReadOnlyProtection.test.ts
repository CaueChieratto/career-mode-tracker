import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  aggregateFinancialReports,
  aggregateCareerFinancialTotals,
  aggregateCareerTransfers,
  aggregateCareerClauses,
} from "../common/services/ServiceFinance/aggregation";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { career, player, season } from "./factories/domain";

// Mock Firebase e Auth
vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "test-user-ro" } },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/services/ServicePlayers/helpers/authHelpers", () => ({
  requireAuth: () => ({ uid: "test-user-ro" }),
}));

describe("Bloco 4: Agregação Multi-Temporadas e Proteção Estrita Read-Only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Agregação Financeira Multi-Temporadas (aggregation.ts)", () => {
    it("retorna estrutura vazia segura quando carreira for nula ou não tiver temporadas", () => {
      const emptyReport = aggregateFinancialReports(null);
      expect(emptyReport.seasonId).toBe("geral");
      expect(emptyReport.seasonNumber).toBe(0);
      expect(emptyReport.entries).toHaveLength(0);

      const totals = aggregateCareerFinancialTotals(null);
      expect(totals.totalRevenue).toBe(0);
      expect(totals.totalExpense).toBe(0);
      expect(totals.netBalance).toBe(0);
    });

    it("agrega lançamentos de todas as temporadas da carreira", () => {
      const testCareer = career({
        clubData: [
          season({
            id: "s1",
            seasonNumber: 1,
            financialReport: {
              seasonId: "s1",
              seasonNumber: 1,
              entries: [
                { id: "e1", type: "revenue", category: "Ingressos", amount: 15000000 },
                { id: "e2", type: "expense", category: "Salários de atletas", amount: 10000000 },
              ],
            },
          }),
          season({
            id: "s2",
            seasonNumber: 2,
            financialReport: {
              seasonId: "s2",
              seasonNumber: 2,
              entries: [
                { id: "e3", type: "revenue", category: "Transferências", amount: 25000000 },
                { id: "e4", type: "expense", category: "Manutenção estádio", amount: 3000000 },
              ],
            },
          }),
        ],
      });

      const report = aggregateFinancialReports(testCareer);
      expect(report.seasonId).toBe("geral");
      expect(report.entries).toHaveLength(4);

      const totals = aggregateCareerFinancialTotals(testCareer);
      expect(totals.totalRevenue).toBe(40000000);
      expect(totals.totalExpense).toBe(13000000);
      expect(totals.netBalance).toBe(27000000);
      expect(totals.totalMovement).toBe(53000000);
    });
  });

  describe("2. Agregação de Transferências e Linha do Tempo (aggregation.ts)", () => {
    it("unifica chegadas, saídas e constrói linha do tempo com indicação de temporada", () => {
      const p1 = player({
        id: "p1",
        name: "Contratação Ano 1",
        contract: [
          {
            fromClub: "Porto",
            leftClub: "",
            buyValue: 20000000,
            sellValue: 0,
            dataArrival: new Date("2024-07-10"),
            dataExit: null,
          },
        ],
      });

      const p2 = player({
        id: "p2",
        name: "Venda Ano 2",
        contract: [
          {
            fromClub: "",
            leftClub: "Real Madrid",
            buyValue: 0,
            sellValue: 60000000,
            dataArrival: null,
            dataExit: new Date("2025-08-01"),
          },
        ],
      });

      const testCareer = career({
        clubData: [
          season({ id: "s1", seasonNumber: 1, players: [p1] }),
          season({ id: "s2", seasonNumber: 2, players: [p2] }),
        ],
      });

      const result = aggregateCareerTransfers(testCareer);

      expect(result.arrivals).toHaveLength(1);
      expect(result.arrivals[0].id).toBe("p1");

      expect(result.departures).toHaveLength(1);
      expect(result.departures[0].id).toBe("p2");

      expect(result.timeline).toHaveLength(2);
      expect(result.timeline[0].partnerClub).toBe("Real Madrid");
      expect(result.timeline[0].seasonNumber).toBe(2);
      expect(result.timeline[0].direction).toBe("exit");
      expect(result.timeline[0].transferType).toBe("Venda");

      expect(result.timeline[1].partnerClub).toBe("Porto");
      expect(result.timeline[1].seasonNumber).toBe(1);
      expect(result.timeline[1].direction).toBe("arrivals");
      expect(result.timeline[1].transferType).toBe("Compra");
    });
  });

  describe("3. Agregação Completa de Cláusulas Contratuais (aggregation.ts)", () => {
    it("consolida parcelas, bônus e cláusulas especiais de todas as temporadas", () => {
      const richPlayer = player({
        id: "p-rich",
        name: "Vinícius",
        contract: [
          {
            buyValue: 45000000,
            sellValue: 0,
            fromClub: "Flamengo",
            leftClub: "",
            dataArrival: new Date("2024-07-01"),
            installments: {
              id: "inst-1",
              direction: "payable",
              status: "pending",
              percentage: 60,
              totalInstallments: 3,
              remainingInstallments: 2,
              annualInstallmentValue: 15000000,
              upfrontValue: 18000000,
              firstPaymentSeasonNumber: 2,
              partnerClub: "Flamengo",
            },
            bonuses: [
              {
                id: "b-goals",
                direction: "payable",
                category: "performance",
                name: "Meta de 20 gols",
                metric: "goals",
                metricTarget: 20,
                value: 3000000,
                status: "pending",
              },
              {
                id: "b-ucl",
                direction: "payable",
                category: "objective",
                name: "Campeão da Champions",
                value: 5000000,
                status: "pending",
              },
            ],
            transferClauses: {
              buybackValue: 100000000,
              sellOnPercentage: 20,
              loanBackDuration: 1,
            },
          },
        ],
        contractDetails: {
          weeklyWage: 120000,
          durationYears: 5,
          squadRole: "Crucial",
          releaseClause: 150000000,
          wageAdjustment: {
            enabled: true,
            percentage: 15,
            competitionBasis: "league",
            targetObjective: "Vencer a Liga",
          },
        },
      });

      const testCareer = career({
        clubData: [season({ id: "s1", seasonNumber: 1, players: [richPlayer] })],
      });

      const clauses = aggregateCareerClauses(testCareer);

      expect(clauses.installments).toHaveLength(1);
      expect(clauses.installments[0].value).toBe(15000000);
      expect(clauses.installments[0].partnerClub).toBe("Flamengo");

      expect(clauses.performanceBonuses).toHaveLength(1);
      expect(clauses.performanceBonuses[0].title).toBe("Meta de 20 gols");

      expect(clauses.achievementBonuses).toHaveLength(1);
      expect(clauses.achievementBonuses[0].title).toBe("Campeão da Champions");

      // otherClauses: buyback, sellOn, loanBack, releaseClause, wageAdjustment = 5
      expect(clauses.otherClauses).toHaveLength(5);
      const clauseTitles = clauses.otherClauses.map((c) => c.title);
      expect(clauseTitles).toContain("Cláusula de Recompra Fixada");
      expect(clauseTitles).toContain("Taxa de Futura Venda (Sell-On)");
      expect(clauseTitles).toContain("Empréstimo de Volta (Loan-Back)");
      expect(clauseTitles).toContain("Multa Rescisória Unilateral");
      expect(clauseTitles).toContain("Ajuste Salarial por Meta");

      expect(clauses.totalActiveCount).toBeGreaterThan(0);
      expect(clauses.totalPendingValue).toBe(23000000); // 15M parcela + 3M bônus + 5M conquista
    });
  });

  describe("4. Trava Rígida de Serviço: Proteção Read-Only no Modo Geral", () => {
    const EXPECTED_ERROR =
      "Mutações de contratos e transferências não são permitidas no modo somente leitura (Geral).";

    it("rejeita sellPlayerFromSeason quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.sellPlayerFromSeason(
          "c1",
          "geral",
          "p1",
          "50M",
          "Chelsea",
          "01/08",
        ),
      ).rejects.toThrow(EXPECTED_ERROR);
    });

    it("rejeita signPlayerWithTerms quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.signPlayerWithTerms({
          careerId: "c1",
          seasonId: "geral",
          player: { name: "Teste" },
          contract: {},
        }),
      ).rejects.toThrow(EXPECTED_ERROR);
    });

    it("rejeita loanPlayerFromSeason quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.loanPlayerFromSeason(
          "c1",
          "geral",
          "p1",
          "10M",
          "Porto",
          "01/08",
          "1",
          "50",
        ),
      ).rejects.toThrow(EXPECTED_ERROR);
    });

    it("rejeita returnPlayerFromLoan quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.returnPlayerFromLoan(
          "c1",
          "geral",
          "p1",
          "01/08",
        ),
      ).rejects.toThrow(EXPECTED_ERROR);
    });

    it("rejeita editTransferInSeason quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.editTransferInSeason({
          careerId: "c1",
          seasonId: "geral",
          playerId: "p1",
          contractIndex: 0,
          direction: "exit",
          date: "01/08",
        }),
      ).rejects.toThrow(EXPECTED_ERROR);
    });

    it("rejeita revertTransferInSeason quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.revertTransferInSeason({
          careerId: "c1",
          seasonId: "geral",
          playerId: "p1",
          contractIndex: 0,
          direction: "exit",
        }),
      ).rejects.toThrow(EXPECTED_ERROR);
    });

    it("rejeita settleInstallment quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.settleInstallment("c1", "geral", "p1", 0),
      ).rejects.toThrow(EXPECTED_ERROR);
    });

    it("rejeita settleBonus quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.settleBonus("c1", "geral", "p1", "b1"),
      ).rejects.toThrow(EXPECTED_ERROR);
    });

    it("rejeita deleteClause quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.deleteClause("c1", "geral", "p1", "installment", 0),
      ).rejects.toThrow(EXPECTED_ERROR);
    });

    it("rejeita updateClauseValue quando seasonId === 'geral'", async () => {
      await expect(
        PlayersContractService.updateClauseValue(
          "c1",
          "geral",
          "p1",
          "installment",
          0,
          1000000,
        ),
      ).rejects.toThrow(EXPECTED_ERROR);
    });
  });
});

