// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { reconcileSeasonFinancialEntries } from "../common/services/ServiceFinance/reconciliation";
import { ServiceFinance } from "../common/services/ServiceFinance";
import { clauseSettlementService } from "../common/services/ServicePlayers/contractServices/clauseSettlementService";
import { transferExecutionService } from "../common/services/ServicePlayers/contractServices/transferExecutionService";
import { transferEditRevertService } from "../common/services/ServicePlayers/contractServices/transferEditRevertService";
import { FinancialEntryCard } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/AddFinancialEntry/components/FinancialEntryCard";
import useFinancialEntryActions from "../layout/SectionView/features/ClubTabs/FinanceTab/views/AddFinancialEntry/hooks/useFinancialEntryActions";
import { renderHook } from "@testing-library/react";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Career } from "../common/interfaces/Career";
import { FinancialEntry } from "../common/interfaces/finance";

// Mock do Firebase e Firestore
vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "barca-user" } },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn(),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(),
}));

vi.mock("../common/services/ServicePlayers/helpers/authHelpers", () => ({
  requireAuth: () => ({ uid: "barca-user" }),
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    getProposalsBySeason: vi.fn().mockResolvedValue([]),
    updateProposal: vi.fn().mockResolvedValue(undefined),
    createProposal: vi.fn().mockResolvedValue({ id: "prop_new" }),
  },
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

// Fixture oficial do FC Barcelona (padrão obrigatório conforme GEMINI.md)
const barcaCareer: Career = {
  id: "career-fc-barcelona",
  managerName: "Hansi Flick",
  clubName: "FC Barcelona",
  teamBadge: "barca_badge.png",
  nation: "Espanha",
  currency: "EUR",
  trophies: [],
  createdAt: new Date("2026-07-01"),
  colorsTeams: ["#004d98", "#a50044"],
  clubData: [],
};

const createBarcaSeason = (players: Players[] = []): ClubData => ({
  id: "season-2026-2027",
  seasonNumber: 1,
  players,
  matches: [],
});

const createDaniOlmo = (agentFee?: number): Players => ({
  id: "dani_olmo_barca",
  name: "Dani Olmo",
  position: "MEI",
  sector: "Meio-Campo",
  age: 28,
  nation: "Espanha",
  shirtNumber: "20",
  overall: 85,
  ballonDor: 0,
  buy: true,
  captain: false,
  sell: false,
  salary: 180000,
  contractTime: 5,
  contractUntil: "30/06/2031",
  statsLeagues: [],
  contractDetails: agentFee !== undefined ? {
    weeklyWage: 180000,
    durationYears: 5,
    agentFee,
  } : undefined,
  contract: [
    {
      buyValue: 55000000,
      sellValue: 0,
      fromClub: "RB Leipzig",
      leftClub: "",
      dataArrival: new Date("2026-07-15"),
      salary: 180000,
      contractTime: 5,
      contractUntil: "30/06/2031",
      contractDetails: agentFee !== undefined ? {
        weeklyWage: 180000,
        durationYears: 5,
        agentFee,
      } : undefined,
    },
  ],
});

describe("Contabilização da Despesa de Taxa de Agência nos Lançamentos Financeiros", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Reconciliação Determinística (reconcileSeasonFinancialEntries)", () => {
    it("gera lançamento automático de despesa de taxa de agência com atributos corretos", () => {
      const daniOlmo = createDaniOlmo(2500000); // 2.5M de taxa de agência
      const season = createBarcaSeason([daniOlmo]);

      const entries = reconcileSeasonFinancialEntries(season, [], barcaCareer);

      const agentFeeEntry = entries.find((e) => e.id === "agent_fee_dani_olmo_barca_0");
      expect(agentFeeEntry).toBeDefined();
      expect(agentFeeEntry).toMatchObject({
        id: "agent_fee_dani_olmo_barca_0",
        type: "expense",
        category: "Taxa de agência",
        amount: 2500000,
        description: "Taxa de agência referente a Dani Olmo",
        isAutomatic: true,
        source: "clause",
        sourceId: "dani_olmo_barca",
        contractIndex: 0,
        clauseType: "agentFee",
        transferDirection: "arrivals",
      });
    });

    it("calcula os totais financeiros incluindo a despesa de taxa de agência em totalExpense", () => {
      const daniOlmo = createDaniOlmo(1500000); // 1.5M de taxa de agência
      const season = createBarcaSeason([daniOlmo]);

      const entries = reconcileSeasonFinancialEntries(season, [], barcaCareer);
      const totals = ServiceFinance.calculateTotals(entries);

      // Compra: 55M + Taxa de agência: 1.5M = 56.5M de despesa total
      expect(totals.totalExpense).toBe(55000000 + 1500000);
      expect(totals.netBalance).toBe(-(55000000 + 1500000));
    });

    it("remove lançamento de taxa de agência se o valor for zerado ou ausente", () => {
      const daniOlmoWithoutFee = createDaniOlmo(0);
      const season = createBarcaSeason([daniOlmoWithoutFee]);

      const existingEntries: FinancialEntry[] = [
        {
          id: "agent_fee_dani_olmo_barca_0",
          type: "expense",
          category: "Taxa de agência",
          amount: 2000000,
          isAutomatic: true,
          source: "clause",
          clauseType: "agentFee",
          transferDirection: "arrivals",
        },
      ];

      const reconciled = reconcileSeasonFinancialEntries(season, existingEntries, barcaCareer);
      const feeEntry = reconciled.find((e) => e.id === "agent_fee_dani_olmo_barca_0");
      expect(feeEntry).toBeUndefined();
    });

    it("preserva lançamento existente de taxa de agência atualizando o montante", () => {
      const daniOlmoUpdated = createDaniOlmo(3000000);
      const season = createBarcaSeason([daniOlmoUpdated]);

      const existingEntries: FinancialEntry[] = [
        {
          id: "agent_fee_dani_olmo_barca_0",
          type: "expense",
          category: "Taxa de agência",
          amount: 1000000,
          date: "15/07",
          description: "Taxa de agência referente a Dani Olmo",
          isAutomatic: true,
          source: "clause",
          clauseType: "agentFee",
          transferDirection: "arrivals",
        },
      ];

      const reconciled = reconcileSeasonFinancialEntries(season, existingEntries, barcaCareer);
      const feeEntry = reconciled.find((e) => e.id === "agent_fee_dani_olmo_barca_0");
      expect(feeEntry).toBeDefined();
      expect(feeEntry?.amount).toBe(3000000);
    });
  });

  describe("2. Sincronização Operacional (clauseSettlementService.syncAgentFeeTransaction)", () => {
    it("adiciona lançamento de taxa de agência quando o montante for positivo", async () => {
      vi.spyOn(ServiceFinance, "getReportBySeason").mockResolvedValue({
        seasonId: "season-2026-2027",
        seasonNumber: 1,
        entries: [],
      });
      const addSpy = vi.spyOn(ServiceFinance, "addEntry").mockResolvedValue({} as never);

      await clauseSettlementService.syncAgentFeeTransaction(
        "career-fc-barcelona",
        "season-2026-2027",
        "dani_olmo_barca",
        0,
        "Dani Olmo",
        1800000,
        "15/07",
      );

      expect(addSpy).toHaveBeenCalledWith(
        "career-fc-barcelona",
        "season-2026-2027",
        expect.objectContaining({
          id: "agent_fee_dani_olmo_barca_0",
          type: "expense",
          category: "Taxa de agência",
          amount: 1800000,
          description: "Taxa de agência referente a Dani Olmo",
          clauseType: "agentFee",
          transferDirection: "arrivals",
        }),
      );
    });

    it("exclui lançamento de taxa de agência existente se o montante for zerado", async () => {
      vi.spyOn(ServiceFinance, "getReportBySeason").mockResolvedValue({
        seasonId: "season-2026-2027",
        seasonNumber: 1,
        entries: [
          {
            id: "agent_fee_dani_olmo_barca_0",
            type: "expense",
            category: "Taxa de agência",
            amount: 1800000,
          },
        ],
      });
      const deleteSpy = vi.spyOn(ServiceFinance, "deleteEntry").mockResolvedValue(undefined);

      await clauseSettlementService.syncAgentFeeTransaction(
        "career-fc-barcelona",
        "season-2026-2027",
        "dani_olmo_barca",
        0,
        "Dani Olmo",
        0,
      );

      expect(deleteSpy).toHaveBeenCalledWith(
        "career-fc-barcelona",
        "season-2026-2027",
        "agent_fee_dani_olmo_barca_0",
      );
    });
  });

  describe("3. Exibição e Interação no Card de Lançamento (FinancialEntryCard)", () => {
    it("exibe badge 'Cláusula' e categoria 'Taxa de agência' no FinancialEntryCard", () => {
      const entry: FinancialEntry = {
        id: "agent_fee_dani_olmo_barca_0",
        type: "expense",
        category: "Taxa de agência",
        amount: 2000000,
        date: "15/07",
        description: "Taxa de agência referente a Dani Olmo",
        isAutomatic: true,
        source: "clause",
        clauseType: "agentFee",
        transferDirection: "arrivals",
      };

      const handleRedirect = vi.fn();

      render(
        <FinancialEntryCard
          entry={entry}
          currency="EUR"
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onRedirect={handleRedirect}
        />,
      );

      expect(screen.getByText("Taxa de agência")).toBeTruthy();
      expect(screen.getByText("Cláusula")).toBeTruthy();
      expect(screen.getByText("Ver em Cláusulas")).toBeTruthy();

      fireEvent.click(screen.getByText("Ver em Cláusulas"));
      expect(handleRedirect).toHaveBeenCalledWith(entry);
    });
  });

  describe("4. Redirecionamento da Ação para Cláusulas (useFinancialEntryActions)", () => {
    it("redireciona para manageClauses com initialTab 'arrivals' ao clicar no lançamento de taxa de agência", () => {
      const onOpenScreen = vi.fn();
      const onClose = vi.fn();

      const { result } = renderHook(() =>
        useFinancialEntryActions({
          career: barcaCareer,
          season: createBarcaSeason(),
          notSeason: false,
          type: "expense",
          category: "Taxa de agência",
          parsedAmount: 2000000,
          editingEntry: null,
          setEditingEntry: vi.fn(),
          resetForm: vi.fn(),
          addOrUpdateEntryLocal: vi.fn(),
          removeEntryLocal: vi.fn(),
          onClose,
          onOpenScreen,
        }),
      );

      const agentFeeEntry: FinancialEntry = {
        id: "agent_fee_dani_olmo_barca_0",
        type: "expense",
        category: "Taxa de agência",
        amount: 2000000,
        isAutomatic: true,
        source: "clause",
        clauseType: "agentFee",
        transferDirection: "arrivals",
      };

      result.current.handleRedirectToSource(agentFeeEntry);

      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "manageClauses",
        initialTab: "arrivals",
      });
    });
  });

  describe("5. Reversão de Transferência (transferEditRevertService)", () => {
    it("remove o lançamento de taxa de agência ao reverter a transferência", async () => {
      const daniOlmo = createDaniOlmo(2000000);
      const season = createBarcaSeason([daniOlmo]);
      const careerWithSeason = { ...barcaCareer, clubData: [season] };

      const getters = await import("../common/helpers/Getters");
      vi.spyOn(getters, "getCareerById").mockResolvedValue(careerWithSeason as never);
      const setters = await import("../common/helpers/Setters");
      vi.spyOn(setters, "updateCareerFirestore").mockResolvedValue(undefined as never);

      vi.spyOn(ServiceFinance, "getReportBySeason").mockResolvedValue({
        seasonId: "season-2026-2027",
        seasonNumber: 1,
        entries: [
          {
            id: "transfer_buy_dani_olmo_barca_0",
            type: "expense",
            category: "Transferências (compras de atletas)",
            amount: 55000000,
          },
          {
            id: "agent_fee_dani_olmo_barca_0",
            type: "expense",
            category: "Taxa de agência",
            amount: 2000000,
          },
        ],
      });

      const deleteSpy = vi.spyOn(ServiceFinance, "deleteEntry").mockResolvedValue(undefined);

      await transferEditRevertService.revertTransferInSeason({
        careerId: "career-fc-barcelona",
        seasonId: "season-2026-2027",
        playerId: "dani_olmo_barca",
        contractIndex: 0,
        direction: "arrivals",
      });

      expect(deleteSpy).toHaveBeenCalledWith(
        "career-fc-barcelona",
        "season-2026-2027",
        "agent_fee_dani_olmo_barca_0",
      );
    });
  });

  describe("6. Execução de Transferência (transferExecutionService)", () => {
    it("chama syncAgentFeeTransaction ao contratar jogador com taxa de agência", async () => {
      const daniOlmo = createDaniOlmo(1200000);
      const season = createBarcaSeason();
      const careerWithSeason = { ...barcaCareer, clubData: [season] };

      const getters = await import("../common/helpers/Getters");
      vi.spyOn(getters, "getCareerById").mockResolvedValue(careerWithSeason as never);
      const syncSpy = vi
        .spyOn(clauseSettlementService, "syncAgentFeeTransaction")
        .mockResolvedValue(undefined);

      await transferExecutionService.signPlayerWithTerms({
        careerId: "career-fc-barcelona",
        seasonId: "season-2026-2027",
        player: daniOlmo,
        contract: daniOlmo.contract[0],
      });

      expect(syncSpy).toHaveBeenCalledWith(
        "career-fc-barcelona",
        "season-2026-2027",
        "dani_olmo_barca",
        0,
        "Dani Olmo",
        1200000,
        "15/07",
      );
    });
  });
});
