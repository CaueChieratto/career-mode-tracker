// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { reconcileSeasonFinancialEntries } from "../common/services/ServiceFinance/reconciliation";
import ManageClauses from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses";
import { resolveNextWindowTimingSchedule } from "../common/services/ServicePlayers/helpers/transferTimingHelpers";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Career/c1/Season/season-1" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "c1", seasonId: "season-1" }),
  };
});

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    darkClubColor: "#a50044",
  }),
}));

vi.mock("../contexts/SeasonThemeContext", () => ({
  SeasonThemeContext: React.createContext({
    clubColor: "#004d98",
    darkClubColor: "#a50044",
    activeStyle: {
      backgroundColor: "#004d98",
      color: "#ffffff",
      fontWeight: 600,
      border: "1px solid #a50044",
      clubColor: "#004d98",
      darkClubColor: "#a50044",
    },
    career: {} as Career,
    changeClubColor: vi.fn(),
  }),
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    darkClubColor: "#a50044",
  }),
}));

vi.mock("../common/services/ServiceClubBadges", () => ({
  ServiceClubBadges: {
    getAvailableClubsCatalog: vi.fn(() => []),
  },
}));

const createBarcaPlayer = (
  id: string,
  name: string,
  position: string,
  salary: number,
  contractOverrides: Partial<Players["contract"][0]> = {},
): Players => ({
  id,
  name,
  position,
  overall: 88,
  sector: "Ataque",
  age: 22,
  salary,
  nation: "ESP",
  shirtNumber: "10",
  playerValue: 90000000,
  buy: false,
  captain: false,
  sell: false,
  contractTime: 4,
  ballonDor: 0,
  statsLeagues: [],
  contract: [
    {
      buyValue: 0,
      sellValue: 0,
      fromClub: "FC Barcelona",
      leftClub: "",
      dataArrival: new Date("2024-07-01"),
      dataExit: null,
      salary,
      ...contractOverrides,
    },
  ],
});

describe("Isolamento Financeiro por Temporada e Esgotamento de Cláusulas (ManageClauses)", () => {
  const baseCareer: Career = {
    id: "career-fcb",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    createdAt: new Date("2024-07-01"),
    teamBadge: "",
    nation: "ESP",
    currency: "EUR",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    clubData: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("1. Isolamento Estrito do Relatório Financeiro por Temporada", () => {
    it("não herda custos de transferências realizadas em temporadas anteriores no relatório de uma nova temporada", () => {
      // Temporada 1: Compra de Robert Lewandowski por 50M
      const lewaBuyContract = {
        buyValue: 50000000,
        fromClub: "Bayern München",
        dataArrival: new Date("2024-07-15"),
        seasonId: "season-1",
      };
      const lewa = createBarcaPlayer("p-lewa", "Robert Lewandowski", "ATA", 200000, lewaBuyContract);

      const season1: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [lewa],
        matches: [],
      };

      const entriesSeason1 = reconcileSeasonFinancialEntries(
        season1,
        [],
        baseCareer,
      );

      // Temporada 1 contabiliza a transferência de compra
      const buyEntriesS1 = entriesSeason1.filter(
        (e) => e.source === "transfer" && e.type === "expense",
      );
      expect(buyEntriesS1.length).toBe(1);
      expect(buyEntriesS1[0].amount).toBe(50000000);

      // Temporada 2: Lewandowski continua no elenco, mas sua compra foi na temporada 1
      const season2: ClubData = {
        id: "season-2",
        seasonNumber: 2,
        players: [lewa],
        matches: [],
      };

      const entriesSeason2 = reconcileSeasonFinancialEntries(
        season2,
        [],
        baseCareer,
      );

      // O relatório da Temporada 2 NÃO deve herdar os 50M de compra da Temporada 1!
      const buyEntriesS2 = entriesSeason2.filter(
        (e) => e.source === "transfer" && e.type === "expense",
      );
      expect(buyEntriesS2.length).toBe(0);
    });

    it("parcelamento de transferência quitado na Temporada 1 não pontua na Temporada 2", () => {
      const gaviContract = {
        buyValue: 30000000,
        fromClub: "Real Betis",
        dataArrival: new Date("2024-07-10"),
        seasonId: "season-1",
        installments: {
          id: "inst-gavi",
          direction: "payable" as const,
          status: "paid" as const,
          remainingInstallments: 0,
          totalInstallments: 2,
          annualInstallmentValue: 15000000,
          percentage: 100,
          upfrontValue: 0,
          firstPaymentSeasonNumber: 1,
          partnerClub: "Real Betis",
          paidSeasonId: "season-1",
          paidSeasonNumber: 1,
        },
      };
      const gavi = createBarcaPlayer("p-gavi", "Gavi", "MC", 100000, gaviContract);

      const season2: ClubData = {
        id: "season-2",
        seasonNumber: 2,
        players: [gavi],
        matches: [],
      };

      const entriesSeason2 = reconcileSeasonFinancialEntries(
        season2,
        [],
        baseCareer,
      );

      const instEntries = entriesSeason2.filter(
        (e) => e.clauseType === "installment",
      );
      expect(instEntries.length).toBe(0);
    });
  });

  describe("2. Retirada de Cards Esgotados na Tela de Cláusulas (ManageClauses)", () => {
    it("retira card de saída quando todas as parcelas e mais-valia foram 100% quitadas/recebidas", () => {
      // Pedri vendido com parcelas totalmente pagas e sell-on já recebido
      const pedriSoldSettled = createBarcaPlayer("p-pedri", "Pedri", "MC", 0, {
        sellValue: 120000000,
        fromClub: "",
        leftClub: "Manchester City",
        dataExit: new Date("2024-07-20"),
        timing: "Imediata",
        installments: {
          id: "inst-pedri",
          direction: "receivable",
          status: "paid",
          remainingInstallments: 0,
          totalInstallments: 3,
          annualInstallmentValue: 40000000,
          percentage: 100,
          upfrontValue: 0,
          firstPaymentSeasonNumber: 1,
          partnerClub: "Manchester City",
          installmentsList: [
            { number: 1, value: 40000000, paid: true },
            { number: 2, value: 40000000, paid: true },
            { number: 3, value: 40000000, paid: true },
          ],
        },
        transferClauses: {
          sellOnPercentage: 10,
          sellOnReceived: true,
          sellOnExercised: true,
        },
      });
      pedriSoldSettled.sell = true;

      const season: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [pedriSoldSettled],
        matches: [],
      };

      render(
        <ManageClauses
          career={baseCareer}
          season={season}
          initialTab="exit"
          onClose={vi.fn()}
        />,
      );

      // Como todas as cláusulas foram 100% liquidadas, o card de Pedri não deve ser exibido em Saídas
      expect(screen.getByText(/Saídas \(0\)/i)).toBeTruthy();
      expect(screen.queryByText("Pedri")).toBeNull();
    });

    it("mantém card de saída ativo enquanto houver parcelas ou metas pendentes", () => {
      // Lamine Yamal com parcelas ainda pendentes
      const lamineSoldPending = createBarcaPlayer("p-lamine", "Lamine Yamal", "ED", 0, {
        sellValue: 200000000,
        fromClub: "",
        leftClub: "Paris Saint-Germain",
        dataExit: new Date("2024-08-01"),
        timing: "Imediata",
        installments: {
          id: "inst-lamine",
          direction: "receivable",
          status: "pending",
          remainingInstallments: 2,
          totalInstallments: 3,
          annualInstallmentValue: 50000000,
          percentage: 75,
          upfrontValue: 50000000,
          firstPaymentSeasonNumber: 1,
          partnerClub: "Paris Saint-Germain",
        },
      });
      lamineSoldPending.sell = true;

      const season: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [lamineSoldPending],
        matches: [],
      };

      render(
        <ManageClauses
          career={baseCareer}
          season={season}
          initialTab="exit"
          onClose={vi.fn()}
        />,
      );

      // Permanece em Saídas porque há pendências financeiras a receber
      expect(screen.getByText(/Saídas \(1\)/i)).toBeTruthy();
      expect(screen.getByText("Lamine Yamal")).toBeTruthy();
    });

    it("exibe transferência recém realizada nesta temporada que ainda não possui cláusulas cadastradas (botão 'Adicionar Cláusulas')", () => {
      const raphinhaBought = createBarcaPlayer("p-raphinha", "Raphinha", "EE", 150000, {
        buyValue: 60000000,
        fromClub: "Leeds United",
        leftClub: "",
        dataArrival: new Date("2024-07-15"),
        seasonId: "season-1",
      });
      raphinhaBought.buy = true;

      const season: ClubData = {
        id: "season-1",
        seasonNumber: 1,
        players: [raphinhaBought],
        matches: [],
      };

      render(
        <ManageClauses
          career={baseCareer}
          season={season}
          initialTab="arrivals"
          onClose={vi.fn()}
        />,
      );

      // Nova contratação sem cláusulas cadastradas aparece com botão para gerenciar/adicionar cláusulas
      expect(screen.getByText(/Chegadas \(1\)/i)).toBeTruthy();
      expect(screen.getAllByText("Raphinha").length).toBeGreaterThan(0);
    });
  });

  describe("3. Resolução Determinística de Próxima Janela sem Partidas", () => {
    it("acordo no 2º semestre no calendário europeu pertence à janela de inverno da mesma temporada (01/01/(ano+1))", () => {
      const contract = {
        timing: "Próxima Janela",
        dataExit: "15/08/2024",
      };

      const sched = resolveNextWindowTimingSchedule(
        contract as unknown as Contract,
        1,
        new Date("2024-07-01"),
        "ESP",
      );

      expect(sched.targetSeasonNumber).toBe(1);
      expect(sched.belongsToPreviousSeason).toBe(true);
      expect(sched.belongsToNewSeason).toBe(false);
      expect(sched.effectiveDate.getFullYear()).toBe(2025);
      expect(sched.effectiveDate.getMonth()).toBe(0); // Janeiro
      expect(sched.effectiveDate.getDate()).toBe(1);
    });

    it("acordo no 1º semestre no calendário europeu pertence à janela de verão da próxima temporada (01/07/(ano+1))", () => {
      const contract = {
        timing: "Próxima Janela",
        dataExit: "20/02/2025",
      };

      const sched = resolveNextWindowTimingSchedule(
        contract as unknown as Contract,
        1,
        new Date("2024-07-01"),
        "ESP",
      );

      expect(sched.targetSeasonNumber).toBe(2);
      expect(sched.belongsToPreviousSeason).toBe(false);
      expect(sched.belongsToNewSeason).toBe(true);
      expect(sched.effectiveDate.getFullYear()).toBe(2025);
      expect(sched.effectiveDate.getMonth()).toBe(6); // Julho
      expect(sched.effectiveDate.getDate()).toBe(1);
    });
  });
});
