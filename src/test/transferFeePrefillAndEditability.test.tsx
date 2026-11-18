// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, renderHook } from "@testing-library/react";
import {
  canEditTransferContract,
  canEditTransferProposal,
} from "../common/helpers/transferEditability";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { ClubData } from "../common/interfaces/club/clubData";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Career } from "../common/interfaces/Career";
import { TransferClauseCard } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/TransferClauseCard";
import { useTransferForm } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useTransferForm";
import { useManageClausesSettlementActions } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/hooks/useManageClausesSettlementActions";
import ClauseOperationalManageView from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ClauseOperationalManageView";

// Mock dependencies
vi.mock("../common/services/Firebase", () => ({
  auth: { currentUser: { uid: "user_barca_123" } },
  db: {},
}));

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  useToast: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    activeStyle: {
      color: "#ffffff",
      darkClubColor: "#a50044",
      backgroundColor: "#004d98",
      primaryColor: "#004d98",
    },
  }),
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    getProposalById: vi.fn(),
    updateProposal: vi.fn().mockResolvedValue(undefined),
  },
}));

const createMockContract = (overrides: Partial<Contract> = {}): Contract => ({
  buyValue: 0,
  sellValue: 0,
  fromClub: "FC Barcelona",
  leftClub: "",
  dataArrival: new Date("2024-07-01"),
  ...overrides,
});

function createBarcaPlayer(overrides: Partial<Players> = {}): Players {
  return {
    id: overrides.id || "p_pedri",
    name: overrides.name || "Pedri",
    position: overrides.position || "MC",
    sector: overrides.sector || "Meio-Campo",
    age: overrides.age ?? 22,
    nation: overrides.nation || "ESP",
    overall: overrides.overall ?? 89,
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

describe("Frentes 1, 2 e 6: Taxa de Transferência, Visibilidade de Edição e Recompra (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockCareer: Career = {
    id: "c_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "https://example.com/barca.png",
    currency: "EUR",
    nation: "ESP",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    createdAt: new Date("2024-07-01"),
    updatedAt: Date.now(),
    clubData: [],
  };

  const mockSeason: ClubData = {
    id: "s_2024_2025",
    seasonNumber: 1,
    players: [],
    matches: [],
  };

  describe("Frente 1: Taxa de Transferência Inicializa Vazia sem Prefill", () => {
    it("venda de Pedri sem prefill deve inicializar sellValue e buyOption vazios ('')", () => {
      const pedri = createBarcaPlayer({ id: "p_pedri", name: "Pedri" });

      const { result } = renderHook(() =>
        useTransferForm({
          player: pedri,
          career: mockCareer,
          season: mockSeason,
          careerId: mockCareer.id,
          currentPlayers: [],
          handleGoBack: vi.fn(),
        }),
      );

      expect(result.current.formValues.sellValue).toBe("");
      expect(result.current.formValues.buyOption).toBe("");
    });

    it("venda com prefill (ex.: recompra ou proposta) preenche sellValue com a taxa fornecida", () => {
      const daniOlmo = createBarcaPlayer({ id: "p_dani_olmo", name: "Dani Olmo" });

      const { result } = renderHook(() =>
        useTransferForm({
          player: daniOlmo,
          career: mockCareer,
          season: mockSeason,
          careerId: mockCareer.id,
          currentPlayers: [],
          handleGoBack: vi.fn(),
          prefill: {
            sellValue: "55M",
            toClub: "RB Leipzig",
            lockSellValue: true,
            lockToClub: true,
            lockTransferType: true,
          },
        }),
      );

      expect(result.current.formValues.sellValue).toBe("55M");
      expect(result.current.formValues.toClub).toBe("RB Leipzig");
      expect(result.current.isSellValueLocked).toBe(true);
      expect(result.current.isToClubLocked).toBe(true);
    });
  });

  describe("Frente 2: Regras de Elegibilidade canEditTransferContract e canEditTransferProposal", () => {
    it("deve permitir edição para compras e vendas normais do FC Barcelona", () => {
      const player = createBarcaPlayer({ id: "p_dani_olmo", name: "Dani Olmo" });
      const arrivalContract = createMockContract({
        fromClub: "RB Leipzig",
        isLoan: false,
        buyValue: 55000000,
      });

      const canEditArrival = canEditTransferContract({
        player,
        contract: arrivalContract,
        direction: "arrivals",
        season: mockSeason,
      });
      expect(canEditArrival).toBe(true);

      const exitContract = createMockContract({
        leftClub: "PSG",
        isLoan: false,
        sellValue: 80000000,
      });

      const canEditExit = canEditTransferContract({
        player,
        contract: exitContract,
        direction: "exit",
        season: mockSeason,
      });
      expect(canEditExit).toBe(true);
    });

    it("NÃO deve permitir edição se promovido da Base (fromClub === 'Base')", () => {
      const lamine = createBarcaPlayer({
        id: "p_lamine_yamal",
        name: "Lamine Yamal",
      });
      const academyContract = createMockContract({
        fromClub: "Base",
        isLoan: false,
        buyValue: 0,
      });

      const canEdit = canEditTransferContract({
        player: lamine,
        contract: academyContract,
        direction: "arrivals",
        season: mockSeason,
      });
      expect(canEdit).toBe(false);
    });

    it("NÃO deve permitir edição se for empréstimo de retorno (loan-back) ou retorno de empréstimo", () => {
      const player = createBarcaPlayer({ id: "p_gavi", name: "Gavi" });
      const loanBackContract = createMockContract({
        fromClub: "Real Betis",
        leftClub: "Real Betis",
        isLoan: false,
        transferClauses: {
          loanBackDuration: 1,
        },
      });

      const canEdit = canEditTransferContract({
        player,
        contract: loanBackContract,
        direction: "arrivals",
        season: mockSeason,
      });
      expect(canEdit).toBe(false);

      const returnExitContract = createMockContract({
        leftClub: "Real Betis",
        isLoan: false,
        isLoanBackReturn: true,
      });

      const canEditExit = canEditTransferContract({
        player,
        contract: returnExitContract,
        direction: "exit",
        season: mockSeason,
      });
      expect(canEditExit).toBe(false);
    });

    it("NÃO deve permitir edição se derivado de opção de compra de empréstimo", () => {
      const player = createBarcaPlayer({
        id: "p_joao_cancelo",
        name: "João Cancelo",
        contract: [
          createMockContract({
            fromClub: "Manchester City",
            isLoan: true,
            buyOptionValue: 25000000,
            loanTerms: {
              hasBuyOption: true,
              buyOptionExercised: true,
              durationYears: 1,
            },
          }),
        ],
      });

      const arrivalContract = createMockContract({
        fromClub: "Manchester City",
        isLoan: false,
        fromLoanBuyOption: true,
      });

      const canEdit = canEditTransferContract({
        player,
        contract: arrivalContract,
        direction: "arrivals",
        season: mockSeason,
      });
      expect(canEdit).toBe(false);
    });

    it("NÃO deve permitir edição se estiver na visão 'geral' ou readOnly", () => {
      const player = createBarcaPlayer();
      const contract = createMockContract({
        fromClub: "Athletic Club",
        buyValue: 58000000,
      });

      expect(
        canEditTransferContract({
          player,
          contract,
          direction: "arrivals",
          season: { ...mockSeason, id: "geral" },
        }),
      ).toBe(false);

      expect(
        canEditTransferContract({
          player,
          contract,
          direction: "arrivals",
          season: mockSeason,
          readOnly: true,
        }),
      ).toBe(false);
    });

    it("canEditTransferProposal permite renovações em andamento e bloqueia propostas derivadas de opção de compra", () => {
      const proposalRenewal: TransferProposal = {
        id: "prop_pedri_renov",
        careerId: "c_barca",
        seasonId: "s_2024_2025",
        playerId: "p_pedri",
        playerNation: "ESP",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        type: "renovacao",
        overallStatus: "em_andamento",
        playerName: "Pedri",
      };
      expect(canEditTransferProposal({ proposal: proposalRenewal, season: mockSeason })).toBe(true);

      const proposalLoanBuyOption: TransferProposal = {
        id: "prop_cancelo_buy",
        careerId: "c_barca",
        seasonId: "s_2024_2025",
        playerId: "p_cancelo",
        playerNation: "POR",
        playerPosition: "LD",
        playerSector: "Defesa",
        type: "compra",
        overallStatus: "em_andamento",
        playerName: "João Cancelo",
        originLoanBuyOption: true,
      };
      expect(canEditTransferProposal({ proposal: proposalLoanBuyOption, season: mockSeason })).toBe(false);
    });
  });

  describe("Frente 2: Ocultamento do botão de edição no DOM do TransferClauseCard", () => {
    const commonCardProps = {
      isDetailView: false,
      clubColor: "#004d98",
      readOnly: false,
      activeInline: null,
      highlightedCardKey: null,
      getClubBadgeUrl: () => undefined,
      startEditCard: vi.fn(),
      startManageCard: vi.fn(),
      cancelInline: vi.fn(),
      handleDeleteRenewal: vi.fn(),
      handleRevertTransfer: vi.fn(),
    };

    it("deve renderizar btn-edit-club-transfer para compra normal do FC Barcelona", () => {
      const player = createBarcaPlayer({ id: "p_dani_olmo", name: "Dani Olmo" });
      const contract = createMockContract({
        fromClub: "RB Leipzig",
        isLoan: false,
        buyValue: 55000000,
        transferClauses: {
          buybackValue: 70000000,
        },
      });

      render(
        <TransferClauseCard
          {...commonCardProps}
          item={{
            contract,
            player,
            direction: "arrivals",
            contractIndex: 0,
          }}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={vi.fn()}
        />,
      );

      const editBtn = screen.getByTestId("btn-edit-club-transfer");
      expect(editBtn).not.toBeNull();
    });

    it("NÃO deve renderizar btn-edit-club-transfer para contratação vinda da Base", () => {
      const player = createBarcaPlayer({ id: "p_lamine", name: "Lamine Yamal" });
      const contract = createMockContract({
        fromClub: "Base",
        isLoan: false,
        buyValue: 0,
        transferClauses: {
          buybackValue: 100000000,
        },
      });

      render(
        <TransferClauseCard
          {...commonCardProps}
          item={{
            contract,
            player,
            direction: "arrivals",
            contractIndex: 0,
          }}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={vi.fn()}
        />,
      );

      expect(screen.queryByTestId("btn-edit-club-transfer")).toBeNull();
    });
  });

  describe("Frente 6: Exercer Recompra para Atleta do Clube", () => {
    it("deve acionar tela de venda com toClub e sellValue travados quando exercer recompra em jogador no elenco via handleExerciseBuyback", () => {
      const onOpenScreen = vi.fn();
      const pedri = createBarcaPlayer({
        id: "p_pedri",
        name: "Pedri",
        sell: false,
        contract: [
          createMockContract({
            fromClub: "Las Palmas",
            isLoan: false,
            buyValue: 20000000,
            transferClauses: {
              buybackValue: 60000000,
            },
          }),
        ],
      });

      const { result } = renderHook(() =>
        useManageClausesSettlementActions({
          career: mockCareer,
          season: mockSeason,
          onOpenScreen,
          setIsLoading: vi.fn(),
          setLocalVersion: vi.fn(),
          setDeletedRenewalKeys: vi.fn(),
          activeInline: null,
          setActiveInline: vi.fn(),
          confirm: vi.fn().mockResolvedValue(true),
          showError: vi.fn(),
          showWarning: vi.fn(),
          showSuccess: vi.fn(),
        }),
      );

      result.current.handleExerciseBuyback({
        player: pedri,
        contract: pedri.contract[0],
        direction: "arrivals",
        contractIndex: 0,
      });

      expect(onOpenScreen).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "transferPlayer",
          playerId: "p_pedri",
          seasonId: "s_2024_2025",
          mode: "transfer",
          prefill: expect.objectContaining({
            sellValue: "60M",
            toClub: "Las Palmas",
            lockSellValue: true,
            lockToClub: true,
            lockTransferType: true,
            mode: "buyback",
          }),
        }),
      );
    });

    it("deve renderizar btn-exercise-buyback no ClauseOperationalManageView quando houver buybackValue", () => {
      const handleExerciseBuyback = vi.fn().mockResolvedValue(undefined);
      const pedri = createBarcaPlayer({
        id: "p_pedri",
        name: "Pedri",
        sell: false,
        contract: [
          createMockContract({
            fromClub: "Las Palmas",
            isLoan: false,
            buyValue: 20000000,
            transferClauses: {
              buybackValue: 60000000,
            },
          }),
        ],
      });

      render(
        <ClauseOperationalManageView
          activeTransferItem={{
            player: pedri,
            contract: pedri.contract[0],
            direction: "arrivals",
            contractIndex: 0,
          }}
          career={mockCareer}
          isLoading={false}
          cancelInline={vi.fn()}
          sellOnActiveCardKey={null}
          setSellOnActiveCardKey={vi.fn()}
          sellOnTotalInput=""
          setSellOnTotalInput={vi.fn()}
          sellOnDateInput=""
          setSellOnDateInput={vi.fn()}
          loanBuyOptionDateInput=""
          setLoanBuyOptionDateInput={vi.fn()}
          handleApplyWageAdjustment={vi.fn().mockResolvedValue(undefined)}
          handleSettleInstallment={vi.fn().mockResolvedValue(undefined)}
          handleUnsettleInstallment={vi.fn().mockResolvedValue(undefined)}
          handleSettleBonus={vi.fn().mockResolvedValue(undefined)}
          handleExerciseBuyback={handleExerciseBuyback}
          handleExerciseFirstRefusal={vi.fn().mockResolvedValue(undefined)}
          handleTriggerReleaseClause={vi.fn().mockResolvedValue(undefined)}
          handleConfirmSellOn={vi.fn().mockResolvedValue(undefined)}
          handleExerciseLoanBuyOption={vi.fn().mockResolvedValue(undefined)}
          onOpenScreen={vi.fn()}
        />,
      );

      const buybackBtn = screen.getByTestId("btn-exercise-buyback");
      expect(buybackBtn).not.toBeNull();

      fireEvent.click(buybackBtn);
      expect(handleExerciseBuyback).toHaveBeenCalled();
    });
  });
});
