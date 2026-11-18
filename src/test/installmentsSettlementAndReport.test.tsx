// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ManageClauses from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses";
import BudgetOverviewCard from "../layout/SectionView/features/ClubTabs/FinanceTab/components/BudgetOverviewCard";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { ServiceFinance } from "../common/services/ServiceFinance";
import { reconcileSeasonFinancialEntries } from "../common/services/ServiceFinance/reconciliation";
import { buildNextSeasonPlayers } from "../common/services/ServiceSeasons/helpers/buildNextSeasonPlayers";
import * as Getters from "../common/helpers/Getters";
import * as Setters from "../common/helpers/Setters";
import * as firestoreMocks from "./mocks/firestore";
import { auth } from "./mocks/firebaseClient";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { createTransferInstallments } from "../common/interfaces/playersInfo/transferTerms";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Career/barca-1/Season/season-1" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "barca-1", seasonId: "season-1" }),
  };
});

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

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
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
  overrides: Partial<Players> = {},
): Players => ({
  id,
  name,
  position: "PD",
  sector: "Ataque",
  overall: 88,
  age: 18,
  salary: 120000,
  nation: "Espanha",
  shirtNumber: "19",
  playerValue: 120000000,
  buy: false,
  captain: false,
  sell: false,
  loan: false,
  contractTime: 5,
  ballonDor: 0,
  statsLeagues: [],
  contract: [],
  ...overrides,
});

const createBarcaCareer = (clubData: ClubData[]): Career => ({
  id: "barca-1",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  teamBadge: "fc-barcelona.png",
  nation: "Espanha",
  currency: "EUR",
  colorsTeams: ["#004d98", "#a50044"],
  trophies: [],
  createdAt: new Date("2024-07-01"),
  updatedAt: 1000,
  clubData,
});

describe("Parcelas: Estilização, Liquidação/Estorno e Relatório Financeiro (FC Barcelona)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    auth.currentUser = { uid: "barca-manager" };
    window.scrollTo = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    firestoreMocks.getDoc.mockResolvedValue(
      firestoreMocks.documentSnapshot("doc-1", {}, false),
    );
    firestoreMocks.setDoc.mockResolvedValue(undefined);
    firestoreMocks.deleteDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("define a classe .btnRevertSecondary em ManageClauses.module.css e a aplica ao botão 'Desfazer Pagamento da Parcela'", () => {
    const cssPath = path.resolve(
      process.cwd(),
      "src/layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/ManageClauses.module.css",
    );
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toMatch(/\.btnRevertSecondary\s*\{/);

    const pedri = createBarcaPlayer("pedri-8", "Pedri", {
      buy: true,
      contract: [
        {
          buyValue: 60000000,
          sellValue: 0,
          fromClub: "UD Las Palmas",
          leftClub: "",
          dataArrival: new Date("2024-07-10"),
          dataExit: null,
          seasonId: "season-1",
          installments: createTransferInstallments({
            totalValue: 60000000,
            percentage: 100,
            totalInstallments: 3,
            paidInstallments: 1,
            currentSeasonNumber: 1,
            direction: "payable",
            partnerClub: "UD Las Palmas",
          }),
        },
      ],
    });

    const season1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [pedri],
      matches: [],
    };

    render(
      <ManageClauses
        career={createBarcaCareer([season1])}
        season={season1}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));

    const undoBtn = screen.getByTestId("btn-unsettle-installment");
    expect(undoBtn.textContent).toContain("Desfazer Pagamento da Parcela");
    expect(undoBtn.className).toContain("btnRevertSecondary");
  });

  it("decrementa remainingInstallments no serviço e permite desfazer e re-liquidar parcela sem o pagamento voltar", async () => {
    const lamine = createBarcaPlayer("yamal-19", "Lamine Yamal", {
      buy: true,
      contract: [
        {
          buyValue: 60000000,
          sellValue: 0,
          fromClub: "La Masia FC",
          leftClub: "",
          dataArrival: new Date("2024-07-15"),
          dataExit: null,
          seasonId: "season-1",
          installments: {
            id: "inst-yamal",
            direction: "payable",
            status: "pending",
            percentage: 100,
            totalInstallments: 3,
            remainingInstallments: 2, // 1 já paga
            annualInstallmentValue: 20000000,
            upfrontValue: 0,
            firstPaymentSeasonNumber: 2,
            partnerClub: "La Masia FC",
            paidSeasonId: "season-1",
            paidSeasonNumber: 1,
            installmentsList: [
              {
                number: 1,
                value: 20000000,
                paid: true,
                paidSeasonId: "season-1",
                paidSeasonNumber: 1,
              },
              { number: 2, value: 20000000, paid: false },
              { number: 3, value: 20000000, paid: false },
            ],
          },
        },
      ],
    });

    const season1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [lamine],
      matches: [],
    };
    const careerState = createBarcaCareer([season1]);

    vi.spyOn(Getters, "getCareerById").mockImplementation(async () => careerState);
    vi.spyOn(Setters, "updateCareerFirestore").mockResolvedValue(undefined);
    firestoreMocks.setDoc.mockImplementation(async (_ref, data) => {
      const updated = data as Players;
      const idx = season1.players.findIndex((p) => p.id === updated.id);
      if (idx >= 0) {
        season1.players[idx] = updated;
      }
    });

    // Adiciona o lançamento da parcela #1 previamente paga
    await ServiceFinance.addEntry(careerState.id, "season-1", {
      id: "inst_yamal-19_0_season-1",
      type: "expense",
      category: "Transferências (compras de atletas)",
      amount: 20000000,
      description: "Pagamento de parcela referente a Lamine Yamal (La Masia FC)",
      isAutomatic: true,
      source: "clause",
      sourceId: "yamal-19",
      contractIndex: 0,
      clauseType: "installment",
      transferDirection: "arrivals",
    });

    const { rerender } = render(
      <ManageClauses
        career={careerState}
        season={season1}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gerenciar/i }));
    expect(screen.getByText(/1 de 3 temporadas/i)).toBeTruthy();

    // 1. Clica em "Desfazer Pagamento da Parcela"
    fireEvent.click(screen.getByTestId("btn-unsettle-installment"));

    await waitFor(() => {
      expect(screen.getByText(/0 de 3 temporadas/i)).toBeTruthy();
      expect(screen.queryByTestId("btn-unsettle-installment")).toBeNull();
    });
    expect(season1.players[0].contract[0].installments?.remainingInstallments).toBe(3);

    // Verifica que a parcela estornada saiu do relatório financeiro
    let reportAfterUndo = await ServiceFinance.getReportBySeason(
      careerState.id,
      "season-1",
      1,
      season1,
      careerState,
    );
    expect(
      reportAfterUndo.entries.filter((e) => e.clauseType === "installment"),
    ).toHaveLength(0);

    // 2. Agora tenta "Liquidar Próxima Parcela" novamente
    fireEvent.click(
      screen.getByRole("button", { name: /Liquidar Próxima Parcela/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/1 de 3 temporadas/i)).toBeTruthy();
      expect(screen.getByTestId("btn-unsettle-installment")).toBeTruthy();
    });

    // Persistência no Firestore NÃO pode permanecer em 3; deve estar em 2
    expect(season1.players[0].contract[0].installments?.remainingInstallments).toBe(2);
    expect(season1.players[0].contract[0].installments?.paidSeasonId).toBe("season-1");

    // Simula disparo do listener do Firestore re-renderizando com o estado persistido
    rerender(
      <ManageClauses
        career={{ ...careerState, updatedAt: Date.now() }}
        season={{ ...season1, players: [...season1.players] }}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/1 de 3 temporadas/i)).toBeTruthy();
    expect(screen.getByTestId("btn-unsettle-installment")).toBeTruthy();

    // Verifica que a parcela liquidada voltou ao relatório financeiro
    reportAfterUndo = await ServiceFinance.getReportBySeason(
      careerState.id,
      "season-1",
      1,
      season1,
      careerState,
    );
    const instEntries = reportAfterUndo.entries.filter(
      (e) => e.clauseType === "installment",
    );
    expect(instEntries).toHaveLength(1);
    expect(instEntries[0].amount).toBe(20000000);
  });

  it("faz parcelas de compras e vendas chegarem ao Relatório Financeiro (temporada de origem, temporada seguinte e consolidado Geral)", async () => {
    // Temporada 1: Compra de Dani Olmo (parcelas a pagar) e venda de Vitor Roque (parcelas a receber)
    const olmo = createBarcaPlayer("olmo-20", "Dani Olmo", {
      buy: true,
      contract: [
        {
          buyValue: 60000000,
          sellValue: 0,
          fromClub: "RB Leipzig",
          leftClub: "",
          dataArrival: new Date("2024-08-01"),
          dataExit: null,
          seasonId: "season-1",
          installments: createTransferInstallments({
            totalValue: 60000000,
            percentage: 40,
            totalInstallments: 2,
            currentSeasonNumber: 1,
            direction: "payable",
            partnerClub: "RB Leipzig",
          }),
        },
      ],
    });

    const roque = createBarcaPlayer("roque-19", "Vitor Roque", {
      sell: true,
      contract: [
        {
          buyValue: 0,
          sellValue: 30000000,
          fromClub: "",
          leftClub: "Real Betis",
          dataArrival: null,
          dataExit: new Date("2024-08-15"),
          seasonId: "season-1",
          installments: createTransferInstallments({
            totalValue: 30000000,
            percentage: 60,
            totalInstallments: 2,
            currentSeasonNumber: 1,
            direction: "receivable",
            partnerClub: "Real Betis",
          }),
        },
      ],
    });

    const season1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [olmo, roque],
      matches: [],
    };
    const careerState = createBarcaCareer([season1]);

    vi.spyOn(Getters, "getCareerById").mockImplementation(async () => careerState);
    vi.spyOn(Setters, "updateCareerFirestore").mockResolvedValue(undefined);
    firestoreMocks.setDoc.mockImplementation(async (_ref, data) => {
      const updated = data as Players;
      for (const s of careerState.clubData) {
        const idx = s.players.findIndex((p) => p.id === updated.id);
        if (idx >= 0) s.players[idx] = updated;
      }
    });

    // Liquida 1ª parcela de Dani Olmo na Temporada 1 (12M despesa)
    await PlayersContractService.settleInstallment(
      careerState.id,
      "season-1",
      "olmo-20",
      0,
    );

    const reportS1 = await ServiceFinance.getReportBySeason(
      careerState.id,
      "season-1",
      1,
      season1,
      careerState,
    );
    const s1Installment = reportS1.entries.find(
      (e) => e.clauseType === "installment" && e.sourceId === "olmo-20",
    );
    expect(s1Installment).toBeDefined();
    expect(s1Installment?.type).toBe("expense");
    expect(s1Installment?.amount).toBe(12000000);

    // Transição para a Temporada 2: cada parcelamento ativo liquida automaticamente 1 parcela na nova temporada
    const season2Players = buildNextSeasonPlayers(
      season1.players,
      new Date("2025-07-01"),
      {
        seasonNumber: 2,
        newSeasonId: "season-2",
        careerCreatedAt: careerState.createdAt,
        careerNation: careerState.nation,
        previousSeasonNumber: 1,
      },
    );
    const season2: ClubData = {
      id: "season-2",
      seasonNumber: 2,
      players: season2Players,
      matches: [],
    };
    careerState.clubData.push(season2);

    const olmoS2 = season2.players.find((p) => p.id === "olmo-20")!;
    const roqueS2 = season2.players.find((p) => p.id === "roque-19")!;
    expect(olmoS2.contract[0].installments?.remainingInstallments).toBe(0);
    expect(olmoS2.contract[0].installments?.status).toBe("paid");
    expect(roqueS2.contract[0].installments?.remainingInstallments).toBe(1);
    expect(roqueS2.contract[0].installments?.status).toBe("pending");

    const reportS2 = await ServiceFinance.getReportBySeason(
      careerState.id,
      "season-2",
      2,
      season2,
      careerState,
    );

    const s2Installments = reportS2.entries.filter(
      (e) => e.clauseType === "installment",
    );
    expect(s2Installments).toHaveLength(2);
    expect(
      s2Installments.find((e) => e.sourceId === "olmo-20")?.amount,
    ).toBe(12000000);
    expect(
      s2Installments.find((e) => e.sourceId === "roque-19")?.amount,
    ).toBe(9000000);
    expect(
      s2Installments.find((e) => e.sourceId === "roque-19")?.type,
    ).toBe("revenue");

    // Reconciliação limpa a partir dos contratos (sem localStorage prévio) também preserva a parcela da S2
    const reconciledFromContractsOnly = reconcileSeasonFinancialEntries(
      season2,
      [],
      careerState,
    );
    expect(
      reconciledFromContractsOnly.filter((e) => e.clauseType === "installment"),
    ).toHaveLength(2);

    // BudgetOverviewCard da Temporada 2 exibe exatamente 9M de receita e 12M de despesa
    render(<BudgetOverviewCard season={season2} career={careerState} />);
    await waitFor(() => {
      expect(screen.getByTestId("revenue-total-value").textContent).toContain("9M");
      expect(screen.getByTestId("expense-total-value").textContent).toContain("12M");
    });

    // Consolidado Geral soma S1 (upfront 36M + 12M + upfront 12M) + S2 (12M + 9M)
    const consolidated = await ServiceFinance.getConsolidatedReport(careerState);
    const allConsolidatedInstallments = consolidated.entries.filter(
      (e) => e.clauseType === "installment",
    );
    expect(allConsolidatedInstallments).toHaveLength(3);
  });

  it("ao adicionar a temporada 2 com 5 parcelas pendentes na temporada 1, marca 1/5 pagas e lança no relatório financeiro da temporada 2", async () => {
    const raphinha = createBarcaPlayer("raphinha-11", "Raphinha", {
      buy: true,
      contract: [
        {
          buyValue: 50000000,
          sellValue: 0,
          fromClub: "Leeds United",
          leftClub: "",
          dataArrival: new Date("2024-07-15"),
          dataExit: null,
          seasonId: "season-1",
          installments: createTransferInstallments({
            totalValue: 50000000,
            percentage: 100,
            totalInstallments: 5,
            currentSeasonNumber: 1,
            direction: "payable",
            partnerClub: "Leeds United",
          }),
        },
      ],
    });

    const season1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [raphinha],
      matches: [],
    };
    const careerState = createBarcaCareer([season1]);

    const season2Players = buildNextSeasonPlayers(
      season1.players,
      new Date("2025-07-01"),
      {
        seasonNumber: 2,
        newSeasonId: "season-2",
        careerCreatedAt: careerState.createdAt,
        careerNation: careerState.nation,
        previousSeasonNumber: 1,
      },
    );

    const raphinhaS2 = season2Players.find((p) => p.id === "raphinha-11")!;
    expect(raphinhaS2.contract[0].installments?.totalInstallments).toBe(5);
    expect(raphinhaS2.contract[0].installments?.remainingInstallments).toBe(4);
    expect(raphinhaS2.contract[0].installments?.installmentsList?.[0]?.paid).toBe(
      true,
    );
    expect(
      raphinhaS2.contract[0].installments?.installmentsList?.[0]?.paidSeasonId,
    ).toBe("season-2");

    const season2: ClubData = {
      id: "season-2",
      seasonNumber: 2,
      players: season2Players,
      matches: [],
    };

    // Temporada 1 NÃO recebe a parcela automática da virada; Temporada 2 recebe 10M (1/5)
    const entriesS1 = reconcileSeasonFinancialEntries(season1, [], careerState);
    expect(entriesS1.filter((e) => e.clauseType === "installment")).toHaveLength(
      0,
    );

    const entriesS2 = reconcileSeasonFinancialEntries(season2, [], careerState);
    const s2Inst = entriesS2.filter((e) => e.clauseType === "installment");
    expect(s2Inst).toHaveLength(1);
    expect(s2Inst[0].type).toBe("expense");
    expect(s2Inst[0].amount).toBe(10000000);
  });

  it("contabiliza múltiplas parcelas pagas na mesma temporada e estorna apenas a última ao desfazer", async () => {
    const araujo = createBarcaPlayer("araujo-4", "Ronald Araújo", {
      sell: true,
      contract: [
        {
          buyValue: 0,
          sellValue: 80000000,
          fromClub: "",
          leftClub: "Bayern München",
          dataArrival: null,
          dataExit: new Date("2024-07-20"),
          seasonId: "season-1",
          installments: createTransferInstallments({
            totalValue: 80000000,
            percentage: 100,
            totalInstallments: 2,
            currentSeasonNumber: 1,
            direction: "receivable",
            partnerClub: "Bayern München",
          }),
        },
      ],
    });

    const season1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [araujo],
      matches: [],
    };
    const careerState = createBarcaCareer([season1]);

    vi.spyOn(Getters, "getCareerById").mockImplementation(async () => careerState);
    vi.spyOn(Setters, "updateCareerFirestore").mockResolvedValue(undefined);
    firestoreMocks.setDoc.mockImplementation(async (_ref, data) => {
      const updated = data as Players;
      const idx = season1.players.findIndex((p) => p.id === updated.id);
      if (idx >= 0) season1.players[idx] = updated;
    });

    await PlayersContractService.settleInstallment(
      careerState.id,
      "season-1",
      "araujo-4",
      0,
    );
    await PlayersContractService.settleInstallment(
      careerState.id,
      "season-1",
      "araujo-4",
      0,
    );

    const reportBoth = await ServiceFinance.getReportBySeason(
      careerState.id,
      "season-1",
      1,
      season1,
      careerState,
    );
    const instEntriesBoth = reportBoth.entries.filter(
      (e) => e.clauseType === "installment",
    );
    expect(instEntriesBoth).toHaveLength(2);
    expect(ServiceFinance.calculateTotals(reportBoth.entries).totalRevenue).toBe(
      80000000,
    );

    // Estorna apenas a 2ª parcela
    await PlayersContractService.unsettleInstallment(
      careerState.id,
      "season-1",
      "araujo-4",
      0,
    );

    const reportOneLeft = await ServiceFinance.getReportBySeason(
      careerState.id,
      "season-1",
      1,
      season1,
      careerState,
    );
    const instEntriesOne = reportOneLeft.entries.filter(
      (e) => e.clauseType === "installment",
    );
    expect(instEntriesOne).toHaveLength(1);
    expect(instEntriesOne[0].amount).toBe(40000000);
    expect(season1.players[0].contract[0].installments?.remainingInstallments).toBe(1);
    expect(season1.players[0].contract[0].installments?.status).toBe("pending");
  });
});
