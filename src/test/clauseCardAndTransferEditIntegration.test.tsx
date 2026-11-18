// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, renderHook } from "@testing-library/react";
import React from "react";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { TransferClauseCard } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/TransferClauseCard";
import { ProposalClauseCard } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ProposalClauseCard";
import { useManageClausesTransfers } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/hooks/useManageClausesTransfers";
import { ModularClausesGrid } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/components/ModularClausesGrid";
import {
  validateProposalStageRules,
  calculateOverallProposalStatus,
} from "../common/helpers/proposals/proposalStatusHelper";
import {
  isClubNameMatch,
  findClubBadgeInDatabase,
} from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/helpers/findClubBadgeInDatabase";
import { ServiceClubBadges } from "../common/services/ServiceClubBadges";
import { ServiceTable } from "../common/services/ServiceTable";
import EditTransferScreen from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/screens/EditTransferScreen";
import AddTransferPlayer from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { ActiveSectionScreen } from "../layout/SectionView/components/ActiveSectionScreen";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { SeasonFinancialReport } from "../common/interfaces/finance";

// Mock dependencies
vi.mock("../common/services/Firebase", () => ({
  auth: { currentUser: { uid: "user_123" } },
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

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/career/1/season/1" }),
    Form: React.forwardRef<
      HTMLFormElement,
      React.FormHTMLAttributes<HTMLFormElement>
    >(({ children, ...props }, ref) => (
      <form ref={ref} {...props}>
        {children}
      </form>
    )),
  };
});

function createMockPlayer(overrides: Partial<Players>): Players {
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

describe("Pontos 2, 3 e 4: Escudo DB, Botão de Edição sem voltar tela e Carregamento da Taxa de Transferência", () => {
  const mockCareer: Career = {
    id: "career_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "https://example.com/barca.png",
    currency: "EUR",
    nation: "ESP",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    createdAt: new Date("2024-07-01"),
    updatedAt: Date.now(),
    clubData: [
      {
        id: "season_1",
        seasonNumber: 1,
        players: [],
      } as unknown as ClubData,
    ],
  };

  const mockSeason: ClubData = {
    id: "season_1",
    seasonNumber: 1,
    players: [],
  } as unknown as ClubData;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Ponto 2: Verificação do escudo no DB (sem API externa) e fallback para iniciais", () => {
    it("isClubNameMatch reconhece variações de nome de clube (ex: 'FC Barcelona' e 'Barcelona')", () => {
      expect(isClubNameMatch("FC Barcelona", "Barcelona")).toBe(true);
      expect(isClubNameMatch("Barcelona", "FC Barcelona")).toBe(true);
      expect(isClubNameMatch("Real Betis Balompie", "Real Betis")).toBe(true);
      expect(isClubNameMatch("Chelsea FC", "Chelsea")).toBe(true);
      expect(isClubNameMatch("Bayern München", "Bayern Munchen")).toBe(true);
    });

    it("findClubBadgeInDatabase recupera escudo da tabela da temporada no Firestore sem chamar API", async () => {
      vi.spyOn(ServiceTable, "getTableBySeason").mockResolvedValueOnce([
        {
          id: "team_betis",
          name: "Real Betis",
          badge: "https://example.com/betis.png",
          played: 10,
          won: 5,
          drawn: 2,
          lost: 3,
          goalsFor: 15,
          goalsAgainst: 10,
          goalDiff: 5,
          points: 17,
        },
      ]);

      const badge = await findClubBadgeInDatabase(
        "Real Betis Balompie",
        mockCareer,
        mockSeason,
      );

      expect(badge).toBe("https://example.com/betis.png");
    });

    it("findClubBadgeInDatabase busca no catálogo Firestore de clubes disponíveis", async () => {
      vi.spyOn(ServiceTable, "getTableBySeason").mockResolvedValueOnce([]);
      vi.spyOn(
        ServiceClubBadges,
        "getAvailableClubsCatalog",
      ).mockResolvedValueOnce({
        arsenal: {
          name: "Arsenal FC",
          badge: "https://example.com/arsenal.png",
        },
      });

      const badge = await findClubBadgeInDatabase(
        "Arsenal",
        mockCareer,
        mockSeason,
      );
      expect(badge).toBe("https://example.com/arsenal.png");
    });

    it("TransferClauseCard exibe imagem quando escudo é encontrado no DB, e iniciais quando ausente", () => {
      const playerWithBadge = createMockPlayer({
        id: "p_pedri",
        name: "Pedri",
        overall: 89,
        contract: [
          {
            buyValue: 0,
            sellValue: 70000000,
            fromClub: "FC Barcelona",
            leftClub: "Real Betis",
            dataArrival: null,
            dataExit: new Date("2024-07-01"),
            transferClauses: { sellOnPercentage: 15 },
          },
        ],
      });

      const { unmount } = render(
        <TransferClauseCard
          item={{
            player: playerWithBadge,
            contract: playerWithBadge.contract[0],
            contractIndex: 0,
            direction: "exit",
          }}
          isDetailView={false}
          career={mockCareer}
          season={mockSeason}
          clubColor="#004d98"
          readOnly={false}
          activeInline={null}
          highlightedCardKey={null}
          getClubBadgeUrl={(name) =>
            name === "Real Betis" ? "https://example.com/betis.png" : undefined
          }
          startEditCard={vi.fn()}
          startManageCard={vi.fn()}
          cancelInline={vi.fn()}
          handleDeleteRenewal={vi.fn()}
          handleRevertTransfer={vi.fn()}
        />,
      );

      const img = screen.getByRole("img", { name: "Real Betis" });
      expect(img).toBeDefined();
      expect(img.getAttribute("src")).toBe("https://example.com/betis.png");

      unmount();

      // Sem escudo -> exibe iniciais
      render(
        <TransferClauseCard
          item={{
            player: playerWithBadge,
            contract: playerWithBadge.contract[0],
            contractIndex: 0,
            direction: "exit",
          }}
          isDetailView={false}
          career={mockCareer}
          season={mockSeason}
          clubColor="#004d98"
          readOnly={false}
          activeInline={null}
          highlightedCardKey={null}
          getClubBadgeUrl={() => undefined}
          startEditCard={vi.fn()}
          startManageCard={vi.fn()}
          cancelInline={vi.fn()}
          handleDeleteRenewal={vi.fn()}
          handleRevertTransfer={vi.fn()}
        />,
      );

      expect(screen.getByText("RB")).toBeDefined();
    });

    it("ProposalClauseCard exibe imagem do escudo quando encontrado via getClubBadgeUrl", () => {
      const mockProposal: TransferProposal = {
        id: "prop_1",
        careerId: "career_barca",
        seasonId: "season_1",
        playerId: "p_lamine",
        playerName: "Lamine Yamal",
        playerNation: "ESP",
        playerPosition: "ED",
        playerSector: "Ataque",
        type: "venda",
        overallStatus: "em_andamento",
        clubNegotiation: {
          status: "em_negociacao",
          partnerClub: "Paris Saint-Germain",
          transferFee: 120000000,
        },
      };

      render(
        <ProposalClauseCard
          proposal={mockProposal}
          career={mockCareer}
          season={mockSeason}
          getClubBadgeUrl={(name) =>
            name === "Paris Saint-Germain"
              ? "https://example.com/psg.png"
              : undefined
          }
        />,
      );

      const img = screen.getByRole("img", { name: "Paris Saint-Germain" });
      expect(img).toBeDefined();
      expect(img.getAttribute("src")).toBe("https://example.com/psg.png");
    });
  });

  describe("Ponto 3: Botão de edição em .clubSection com returnToScreen para transferências concluídas e pendentes", () => {
    it("TransferClauseCard: renderiza o botão em .clubSection e aciona onOpenScreen com returnToScreen", () => {
      const onOpenScreen = vi.fn();
      const testPlayer = createMockPlayer({
        id: "p_gavi",
        name: "Gavi",
        overall: 87,
        contract: [
          {
            buyValue: 0,
            sellValue: 80000000,
            fromClub: "FC Barcelona",
            leftClub: "Arsenal",
            dataArrival: null,
            dataExit: new Date("2024-07-01"),
            transferClauses: { sellOnPercentage: 10 },
          },
        ],
      });

      render(
        <TransferClauseCard
          item={{
            player: testPlayer,
            contract: testPlayer.contract[0],
            contractIndex: 0,
            direction: "exit",
          }}
          isDetailView={false}
          career={mockCareer}
          season={mockSeason}
          clubColor="#004d98"
          readOnly={false}
          activeInline={null}
          highlightedCardKey={null}
          getClubBadgeUrl={() => undefined}
          startEditCard={vi.fn()}
          startManageCard={vi.fn()}
          cancelInline={vi.fn()}
          handleDeleteRenewal={vi.fn()}
          handleRevertTransfer={vi.fn()}
          onOpenScreen={onOpenScreen}
        />,
      );

      const editBtn = screen.getByTestId("btn-edit-club-transfer");
      expect(editBtn).toBeDefined();

      fireEvent.click(editBtn);

      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "transferPlayer",
        playerId: "p_gavi",
        seasonId: "season_1",
        editTransfer: {
          player: testPlayer,
          contract: testPlayer.contract[0],
          contractIndex: 0,
          direction: "exit",
        },
        returnToScreen: {
          key: "manageClauses",
          initialTab: "exit",
        },
      });
    });

    it("ProposalClauseCard: renderiza o botão em .clubSection e aciona onOpenScreen com returnToScreen para pendente de saída", () => {
      const onOpenScreen = vi.fn();
      const mockProposal: TransferProposal = {
        id: "prop_exit_1",
        careerId: "career_barca",
        seasonId: "season_1",
        playerId: "p_gavi",
        playerName: "Gavi",
        playerNation: "ESP",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        type: "venda",
        overallStatus: "em_andamento",
        clubNegotiation: {
          status: "em_negociacao",
          partnerClub: "Chelsea FC",
          transferFee: 90000000,
        },
      };

      render(
        <ProposalClauseCard
          proposal={mockProposal}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={onOpenScreen}
        />,
      );

      const editBtn = screen.getByTestId("btn-edit-proposal-transfer");
      expect(editBtn).toBeDefined();

      fireEvent.click(editBtn);

      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "transferPlayer",
        playerId: "p_gavi",
        seasonId: "season_1",
        proposalId: "prop_exit_1",
        initialProposal: mockProposal,
        mode: "transfer",
        returnToScreen: {
          key: "manageClauses",
          initialTab: "exit",
        },
      });
    });

    it("ProposalClauseCard: renderiza o botão em .clubSection e aciona onOpenScreen com returnToScreen para pendente de chegada", () => {
      const onOpenScreen = vi.fn();
      const mockProposal: TransferProposal = {
        id: "prop_arrival_1",
        careerId: "career_barca",
        seasonId: "season_1",
        playerId: "p_nico",
        playerName: "Nico Williams",
        playerNation: "ESP",
        playerPosition: "EE",
        playerSector: "Ataque",
        type: "compra",
        overallStatus: "em_andamento",
        clubNegotiation: {
          status: "em_negociacao",
          partnerClub: "Athletic Club",
          transferFee: 58000000,
        },
      };

      render(
        <ProposalClauseCard
          proposal={mockProposal}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={onOpenScreen}
        />,
      );

      const editBtn = screen.getByTestId("btn-edit-proposal-transfer");
      expect(editBtn).toBeDefined();

      fireEvent.click(editBtn);

      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "addTransferPlayer",
        seasonId: "season_1",
        proposalId: "prop_arrival_1",
        initialProposal: mockProposal,
        returnToScreen: {
          key: "manageClauses",
          initialTab: "arrivals",
        },
      });
    });
  });

  describe("Ponto 4: Taxa de transferência carregada na tela de edição", () => {
    it("carrega a taxa de transferência em EditTransferScreen para saída (sellValue)", () => {
      const testPlayer = createMockPlayer({
        id: "p_ferran",
        name: "Ferran Torres",
        overall: 83,
        sector: "Ataque",
        position: "PD",
        contract: [
          {
            buyValue: 0,
            sellValue: 45000000,
            fromClub: "FC Barcelona",
            leftClub: "Aston Villa",
            dataArrival: null,
            dataExit: new Date("2024-07-01"),
          },
        ],
      });

      render(
        <EditTransferScreen
          career={mockCareer}
          season={mockSeason}
          player={testPlayer}
          contract={testPlayer.contract[0]}
          contractIndex={0}
          direction="exit"
          onClose={vi.fn()}
        />,
      );

      const sellValueInput = screen.getByPlaceholderText(
        "Ex: 150k, 50M",
      ) as HTMLInputElement;
      expect(sellValueInput.value).toBe("45m");
    });

    it("carrega a taxa de transferência em AddTransferPlayer para chegada com editTransfer (buyValue)", () => {
      const testPlayer = createMockPlayer({
        id: "p_dani_olmo",
        name: "Dani Olmo",
        overall: 85,
        sector: "Meio-Campo",
        position: "MEI",
        contract: [
          {
            buyValue: 55000000,
            sellValue: 0,
            fromClub: "RB Leipzig",
            leftClub: "",
            dataArrival: new Date("2024-07-01"),
          },
        ],
      });

      render(
        <AddTransferPlayer
          career={mockCareer}
          season={mockSeason}
          onClose={vi.fn()}
          editTransfer={{
            player: testPlayer,
            contract: testPlayer.contract[0],
            contractIndex: 0,
          }}
        />,
      );

      // No campo "Taxa da Transferência" (buyValue), o valor de 55M deve vir preenchido
      const buyValueInput = screen.getByLabelText(
        /Taxa da Transferência/i,
      ) as HTMLInputElement;
      expect(buyValueInput.value).toBe("55M");
    });

    it("TransfersPanel dispara onOpenScreen com editTransfer ao clicar em uma chegada", () => {
      const onOpenScreen = vi.fn();
      const testPlayer = createMockPlayer({
        id: "p_lewy",
        name: "Robert Lewandowski",
        overall: 90,
        sector: "Ataque",
        position: "ATA",
        contract: [
          {
            buyValue: 45000000,
            sellValue: 0,
            fromClub: "Bayern München",
            leftClub: "",
            dataArrival: new Date("2024-07-01"),
          },
        ],
      });

      render(
        <TransfersPanel
          title="Chegadas"
          transferType="arrivals"
          players={[testPlayer]}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={onOpenScreen}
          onTransferClick={vi.fn()}
        />,
      );

      const playerItem = screen.getByText(/Lewandowski/i);
      fireEvent.click(playerItem);

      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "addTransferPlayer",
        editTransfer: {
          player: testPlayer,
          contract: testPlayer.contract[0],
          contractIndex: 0,
        },
      });
    });

    it("useEditTransferForm carrega os valores de taxa de transferência (sellValue e buyOption) ao entrar para editar", async () => {
      const { renderHook } = await import("@testing-library/react");
      const { useEditTransferForm } = await import(
        "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useEditTransferForm"
      );

      const testPlayerExit = createMockPlayer({
        id: "p_fati",
        name: "Ansu Fati",
        contract: [
          {
            buyValue: 0,
            sellValue: 25000000,
            leftClub: "Brighton",
            fromClub: "Barcelona",
            isLoan: false,
            dataArrival: null,
            dataExit: new Date("2024-08-01"),
          },
        ],
      });

      const { result: exitResult } = renderHook(() =>
        useEditTransferForm({
          career: mockCareer,
          season: mockSeason,
          player: testPlayerExit,
          contract: testPlayerExit.contract[0],
          contractIndex: 0,
          direction: "exit",
          onClose: vi.fn(),
        }),
      );

      expect(exitResult.current.formValues.sellValue).toBe("25m");
      expect(exitResult.current.formValues.transferFee).toBe("25m");

      const testPlayerLoanExit = createMockPlayer({
        id: "p_vitor",
        name: "Vitor Roque",
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            buyOptionValue: 30000000,
            leftClub: "Real Betis",
            fromClub: "Barcelona",
            isLoan: true,
            dataArrival: null,
            loanTerms: {
              durationYears: 1,
              hasBuyOption: true,
              buyOptionFee: 30000000,
            },
            dataExit: new Date("2024-08-15"),
          },
        ],
      });

      const { result: loanResult } = renderHook(() =>
        useEditTransferForm({
          career: mockCareer,
          season: mockSeason,
          player: testPlayerLoanExit,
          contract: testPlayerLoanExit.contract[0],
          contractIndex: 0,
          direction: "exit",
          onClose: vi.fn(),
        }),
      );

      expect(loanResult.current.formValues.buyOption).toBe("30m");
      expect(loanResult.current.formValues.buyOptionValue).toBe("30m");
      expect(loanResult.current.booleanValues.hasBuyOption).toBe(true);
    });

    it("TransfersPanel e ProposalClauseCard repassam initialProposal ao abrir edição e AddTransferPlayer preenche buyValue com 145,80M", async () => {
      const sampleProposal: TransferProposal = {
        id: "prop_1794319733834_g7hngtv",
        type: "compra",
        overallStatus: "aguardando_confirmacao",
        playerId: "target_1794319733834_soxna",
        playerName: "Nico Schlotterbeck",
        playerPosition: "ZAG",
        playerSector: "Defesa",
        playerValue: 94000000,
        playerNation: "GER",
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        clubNegotiation: {
          partnerClub: "Borussia Dortmund",
          firstRefusal: false,
          status: "aceita",
          transferFee: 145800000,
          swapPlayer: {
            playerName: "Alejandro Balde",
            estimatedValue: 27000000,
            playerValue: 27000000,
            sector: "Defesa",
            position: "LE",
          },
        },
        formState: {
          booleanValues: {
            isSigning: false,
            isCaptain: false,
            hasInstallments: false,
            hasPlayerSwap: true,
          },
          formValues: {
            playerName: "Nico Schlotterbeck",
            position: "ZAG",
            sector: "Defesa",
            fromClub: "Borussia Dortmund",
            buyValue: "145,80M",
            transferFee: "145,80M",
            playerValue: "94m",
            timing: "Imediata",
            installmentsPercentage: "Nenhum",
            installmentsYears: "1 Parcela",
          },
        },
      };

      // 1. TransfersPanel repassa initialProposal
      const onOpenScreenFromPanel = vi.fn();
      render(
        <TransfersPanel
          title="Chegadas"
          transferType="arrivals"
          players={[]}
          proposals={[sampleProposal]}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={onOpenScreenFromPanel}
          onTransferClick={vi.fn()}
        />,
      );

      const proposalItem = screen.getByTestId(
        `transfers-panel-proposal-${sampleProposal.id}`,
      );
      fireEvent.click(proposalItem);

      expect(onOpenScreenFromPanel).toHaveBeenCalledWith({
        key: "addTransferPlayer",
        proposalId: sampleProposal.id,
        initialProposal: sampleProposal,
        seasonId: mockSeason.id,
      });

      cleanup();

      // 2. ProposalClauseCard repassa initialProposal ao clicar em btnEditClubTransfer
      const onOpenScreenFromCard = vi.fn();
      render(
        <ProposalClauseCard
          proposal={sampleProposal}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={onOpenScreenFromCard}
        />,
      );

      const btnEdit = screen.getByTestId("btn-edit-proposal-transfer");
      fireEvent.click(btnEdit);

      expect(onOpenScreenFromCard).toHaveBeenCalledWith({
        key: "addTransferPlayer",
        proposalId: sampleProposal.id,
        initialProposal: sampleProposal,
        seasonId: mockSeason.id,
        returnToScreen: {
          key: "manageClauses",
          initialTab: "arrivals",
        },
      });

      cleanup();

      // 3. AddTransferPlayer com initialProposal pré-popula input Taxa da Transferência (buyValue) com '145,80M'
      const { container } = render(
        <AddTransferPlayer
          career={mockCareer}
          season={mockSeason}
          proposalId={sampleProposal.id}
          initialProposal={sampleProposal}
          onClose={vi.fn()}
        />,
      );

      const buyValueInput = container.querySelector(
        'input[name="buyValue"]',
      ) as HTMLInputElement;
      expect(buyValueInput.value).toBe("145,80M");
    });

    it("mantém input de taxa de transferência preenchido mesmo quando formState possui isSigning: false e buyValue vazio", () => {
      const pendingProposalWithEmptyFormFee: TransferProposal = {
        id: "prop_pedri_pending_fee",
        type: "compra",
        overallStatus: "em_andamento",
        playerId: "p_pedri",
        playerName: "Pedri",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerValue: 100000000,
        playerNation: "ESP",
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        clubNegotiation: {
          partnerClub: "FC Barcelona",
          firstRefusal: false,
          status: "aceita",
          transferFee: 145800000,
        },
        formState: {
          booleanValues: {
            isSigning: false,
            isCaptain: false,
            hasInstallments: false,
          },
          formValues: {
            playerName: "Pedri",
            position: "MC",
            sector: "Meio-Campo",
            fromClub: "FC Barcelona",
            buyValue: "",
            transferFee: "",
          },
        },
      };

      const { container } = render(
        <AddTransferPlayer
          career={mockCareer}
          season={mockSeason}
          proposalId={pendingProposalWithEmptyFormFee.id}
          initialProposal={pendingProposalWithEmptyFormFee}
          onClose={vi.fn()}
        />,
      );

      const buyValueInput = container.querySelector(
        'input[name="buyValue"]',
      ) as HTMLInputElement;
      expect(buyValueInput.value).toBe("145,80M");
    });

    it("ActiveSectionScreen repassa initialProposal e seasonId para AddTransferPlayer", () => {
      const sampleProposal: TransferProposal = {
        id: "prop_pedri_active_screen",
        type: "compra",
        overallStatus: "aguardando_confirmacao",
        playerId: "p_pedri",
        playerName: "Pedri",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerValue: 120000000,
        playerNation: "ESP",
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        clubNegotiation: {
          partnerClub: "Paris Saint-Germain",
          firstRefusal: false,
          status: "aceita",
          transferFee: 110000000,
        },
      };

      const onClose = vi.fn();
      const onOpenScreen = vi.fn();

      const element = ActiveSectionScreen({
        screen: {
          key: "addTransferPlayer",
          proposalId: sampleProposal.id,
          initialProposal: sampleProposal,
          seasonId: mockSeason.id,
        },
        career: mockCareer,
        season: mockSeason,
        onClose,
        onOpenScreen,
      });

      expect(element).toBeDefined();
      const child = element?.props?.children as React.ReactElement;
      expect(child).toBeDefined();
      expect(child.props.initialProposal).toBe(sampleProposal);
      expect(child.props.proposalId).toBe(sampleProposal.id);
      expect(child.props.seasonId).toBe(mockSeason.id);
    });

    it("ActiveSectionScreen repassa initialProposal e seasonId para TransferPlayer", () => {
      const sampleProposal: TransferProposal = {
        id: "prop_gavi_active_screen",
        type: "venda",
        overallStatus: "aguardando_confirmacao",
        playerId: "p_gavi",
        playerName: "Gavi",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerValue: 90000000,
        playerNation: "ESP",
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
      };

      const element = ActiveSectionScreen({
        screen: {
          key: "transferPlayer",
          playerId: "p_gavi",
          proposalId: sampleProposal.id,
          initialProposal: sampleProposal,
          seasonId: mockSeason.id,
        },
        career: mockCareer,
        season: mockSeason,
        onClose: vi.fn(),
      });

      expect(element).toBeDefined();
      const child = element?.props?.children as React.ReactElement;
      expect(child).toBeDefined();
      expect(child.props.initialProposal).toBe(sampleProposal);
      expect(child.props.proposalId).toBe(sampleProposal.id);
      expect(child.props.seasonId).toBe(mockSeason.id);
    });
  });

  describe("Ponto 5: Segregação de bônus do atleta e do clube na reversão e precisão de Toasts", () => {
    it("não mistura bônus de performance do atleta nas cláusulas do clube ao atualizar proposta", async () => {
      const { splitClubAndPlayerBonuses } = await import(
        "../common/helpers/contractPlayerClauses"
      );

      const mixedBonuses = [
        {
          id: "b_club_1",
          name: "Vencer a Copa",
          bonusCategory: "Objetivo atingido" as const,
          category: "objective" as const,
          direction: "payable" as const,
          status: "pending" as const,
          value: 2000000,
          bonusOrigin: "club" as const,
        },
        {
          id: "b_player_1",
          name: "Partidas",
          bonusCategory: "Desempenho" as const,
          category: "performance" as const,
          direction: "payable" as const,
          status: "pending" as const,
          metric: "matches" as const,
          targetCount: 20,
          value: 1000000,
          bonusOrigin: "player" as const,
        },
      ];

      const { clubBonuses, playerBonuses } = splitClubAndPlayerBonuses(mixedBonuses);

      expect(clubBonuses).toHaveLength(1);
      expect(clubBonuses[0].name).toBe("Vencer a Copa");
      expect(clubBonuses[0].bonusOrigin).toBe("club");

      expect(playerBonuses).toHaveLength(1);
      expect(playerBonuses[0].name).toBe("Partidas");
      expect(playerBonuses[0].bonusOrigin).toBe("player");
    });

    it("transferEditRevertService.revertTransferInSeason separa bônus do clube e bônus de desempenho do atleta sem misturar", async () => {
      const { transferEditRevertService } = await import(
        "../common/services/ServicePlayers/contractServices/transferEditRevertService"
      );
      const { ServiceProposals } = await import(
        "../common/services/ServiceProposals"
      );
      const Getters = await import("../common/helpers/Getters");

      const playerToRevert = createMockPlayer({
        id: "p_dani_olmo",
        name: "Dani Olmo",
        buy: true,
        contract: [
          {
            type: "compra",
            fromClub: "RB Leipzig",
            buyValue: 55000000,
            bonuses: [
              {
                id: "bonus_club_revert",
                name: "Classificar para a Champions",
                bonusCategory: "Objetivo atingido",
                value: 2000000,
                bonusOrigin: "club",
              },
            ],
            contractDetails: {
              performanceBonuses: [
                {
                  id: "bonus_player_revert",
                  name: "Partidas",
                  bonusCategory: "Desempenho",
                  metric: "matches",
                  targetCount: 15,
                  value: 1000000,
                  bonusOrigin: "player",
                },
              ],
            },
          } as unknown as Contract,
        ],
      });

      vi.spyOn(Getters, "getCareerById").mockResolvedValueOnce({
        ...mockCareer,
        clubData: [
          {
            ...mockSeason,
            players: [playerToRevert],
          },
        ],
      });

      const updatedProposals: Partial<TransferProposal>[] = [];
      vi.spyOn(ServiceProposals, "getProposalsBySeason").mockResolvedValueOnce([
        {
          id: "prop_revert_test",
          type: "compra",
          overallStatus: "concluida",
          playerId: "p_dani_olmo",
          playerName: "Dani Olmo",
          seasonId: "season_1",
          careerId: "career_barca",
          clubNegotiation: {
            partnerClub: "RB Leipzig",
            transferFee: 55000000,
            bonuses: [],
          },
          playerNegotiation: {
            performanceBonuses: [],
          },
        } as unknown as TransferProposal,
      ]);
      vi.spyOn(ServiceProposals, "updateProposal").mockImplementation(
        async (_careerId, _seasonId, proposalId, partial) => {
          updatedProposals.push({ id: proposalId, ...partial });
        },
      );

      const { ServiceFinance } = await import("../common/services/ServiceFinance");
      vi.spyOn(ServiceFinance, "getReportBySeason").mockResolvedValueOnce({
        entries: [],
      } as unknown as SeasonFinancialReport);

      const firestore = await import("firebase/firestore");
      vi.spyOn(firestore, "deleteDoc").mockResolvedValue(undefined);
      vi.spyOn(firestore, "setDoc").mockResolvedValue(undefined);

      const Setters = await import("../common/helpers/Setters");
      vi.spyOn(Setters, "updateCareerFirestore").mockResolvedValue(undefined);

      await transferEditRevertService.revertTransferInSeason({
        careerId: "career_barca",
        seasonId: "season_1",
        playerId: "p_dani_olmo",
        contractIndex: 0,
        direction: "arrivals",
      });

      expect(updatedProposals).toHaveLength(1);
      const reverted = updatedProposals[0];
      expect(reverted.overallStatus).toBe("em_andamento");

      // Bônus do clube contém APENAS o bônus do clube
      expect(reverted.clubNegotiation?.bonuses).toHaveLength(1);
      expect(reverted.clubNegotiation?.bonuses?.[0].name).toBe("Classificar para a Champions");
      expect(reverted.clubNegotiation?.bonuses?.[0].bonusOrigin).toBe("club");

      // Bônus do atleta contém APENAS o bônus do atleta
      expect(reverted.playerNegotiation?.performanceBonuses).toHaveLength(1);
      expect(reverted.playerNegotiation?.performanceBonuses?.[0].name).toBe("Partidas");
      expect(reverted.playerNegotiation?.performanceBonuses?.[0].bonusOrigin).toBe("player");
    });
  });

  describe("Ponto 5: Unificação de Propostas: Venda e Renovação em ProposalClauseCard (Padrão FC Barcelona)", () => {
    it("ProposalClauseCard para type: 'venda' exibe 'Cláusulas do Clube' e NÃO exibe 'Termos do Atleta'", () => {
      const saleProposal: TransferProposal = {
        id: "prop_venda_pedri",
        careerId: "career_barca",
        seasonId: "season_1",
        playerId: "p_pedri",
        playerName: "Pedri",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerNation: "ESP",
        type: "venda",
        overallStatus: "em_andamento",
        clubNegotiation: {
          partnerClub: "Manchester City",
          transferFee: 120000000,
          status: "aceita",
        },
      };

      render(
        <ProposalClauseCard
          proposal={saleProposal}
          career={mockCareer}
          season={mockSeason}
        />,
      );

      // Deve exibir Cláusulas do Clube
      expect(
        screen.getByTestId("btn-edit-club-proposal-prop_venda_pedri"),
      ).toBeDefined();

      // NÃO deve exibir Termos do Atleta (botão de rodapé nem na grade de estágios)
      expect(
        screen.queryByTestId("btn-edit-player-proposal-prop_venda_pedri"),
      ).toBeNull();
      expect(screen.queryByText("Termos do Atleta")).toBeNull();
      expect(screen.getByText("Termos do Clube")).toBeDefined();
    });

    it("ProposalClauseCard para type: 'renovacao' (Gavi) exibe cabeçalho 'Renovação', exibe 'Termos do Atleta', NÃO exibe 'Cláusulas do Clube' e botão de edição abre renewPlayer", () => {
      const onOpenScreen = vi.fn();
      const renewalProposal: TransferProposal = {
        id: "prop_renovacao_gavi",
        careerId: "career_barca",
        seasonId: "season_1",
        playerId: "p_gavi",
        playerName: "Gavi",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerNation: "ESP",
        type: "renovacao",
        overallStatus: "em_andamento",
        playerNegotiation: {
          squadRole: "Crucial",
          weeklyWage: 250000,
          durationYears: 5,
          status: "aceita",
        },
      };

      render(
        <ProposalClauseCard
          proposal={renewalProposal}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={onOpenScreen}
        />,
      );

      // Cabeçalho deve exibir "Renovação"
      expect(screen.getByText("Renovação")).toBeDefined();

      // Nome do clube deve ser o clube atual (FC Barcelona)
      expect(screen.getByText("FC Barcelona")).toBeDefined();

      // Deve exibir Termos do Atleta
      expect(
        screen.getByTestId("btn-edit-player-proposal-prop_renovacao_gavi"),
      ).toBeDefined();

      // NÃO deve exibir Cláusulas do Clube
      expect(
        screen.queryByTestId("btn-edit-club-proposal-prop_renovacao_gavi"),
      ).toBeNull();
      expect(screen.queryByText("Termos do Clube")).toBeNull();
      expect(screen.getAllByText("Termos do Atleta").length).toBeGreaterThanOrEqual(1);

      // Ao clicar em btn-edit-proposal-transfer (ícone de edição do clube)
      const editBtn = screen.getByTestId("btn-edit-proposal-transfer");
      fireEvent.click(editBtn);

      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "renewPlayer",
        playerId: "p_gavi",
        proposalId: "prop_renovacao_gavi",
        initialProposal: renewalProposal,
        seasonId: "season_1",
        returnToScreen: {
          key: "manageClauses",
          initialTab: "renewals",
        },
      });
    });

    it("ProposalClauseCard para renovação exibe clausePill 'Extensão de 1 ano', 'Extensão de 2 anos' ou 'Sem extensão'", () => {
      // 1 ano de extensão
      const proposal1Year: TransferProposal = {
        id: "prop_ren_1y",
        careerId: "career_barca",
        seasonId: "season_1",
        playerId: "p_pedri",
        playerName: "Pedri",
        playerPosition: "MC",
        playerSector: "Meio-Campo",
        playerNation: "ESP",
        type: "renovacao",
        overallStatus: "em_andamento",
        formState: {
          formValues: {
            contractTime: "1",
          },
          booleanValues: {},
        },
        playerNegotiation: {
          weeklyWage: 200000,
          durationYears: 3,
          status: "aceita",
        },
      };

      const { rerender } = render(
        <ProposalClauseCard
          proposal={proposal1Year}
          career={mockCareer}
          season={mockSeason}
        />,
      );

      expect(screen.getByText(/Extensão de 1 ano/)).toBeDefined();

      // 2 anos de extensão
      const proposal2Years: TransferProposal = {
        ...proposal1Year,
        id: "prop_ren_2y",
        formState: {
          formValues: {
            contractTime: "2",
          },
          booleanValues: {},
        },
      };

      rerender(
        <ProposalClauseCard
          proposal={proposal2Years}
          career={mockCareer}
          season={mockSeason}
        />,
      );

      expect(screen.getByText(/Extensão de 2 anos/)).toBeDefined();

      // 0 anos de extensão ("Sem extensão")
      const proposal0Years: TransferProposal = {
        ...proposal1Year,
        id: "prop_ren_0y",
        formState: {
          formValues: {
            contractTime: "0",
          },
          booleanValues: {},
        },
      };

      rerender(
        <ProposalClauseCard
          proposal={proposal0Years}
          career={mockCareer}
          season={mockSeason}
        />,
      );

      expect(screen.getByText(/Sem extensão/)).toBeDefined();
    });
  });

  describe("Ponto 6: Integração de Venda com Atleta de Troca, Painel Modular Restrito e Filtragem de Contrapartida", () => {
    it("ProposalClauseCard em venda sem troca NÃO exibe 'Termos do Atleta', mas em venda COM troca exibe 'Termos do Atleta' e aciona onEditPlayer", () => {
      const onEditPlayer = vi.fn();
      const onOpenScreen = vi.fn();

      // Proposta de venda normal de Ferran Torres sem atleta de troca
      const saleWithoutSwap: TransferProposal = {
        id: "prop_venda_ferran",
        careerId: "career_barca",
        seasonId: "season_1",
        playerId: "p_ferran",
        playerName: "Ferran Torres",
        playerPosition: "ATA",
        playerSector: "Ataque",
        playerNation: "ESP",
        type: "venda",
        overallStatus: "em_andamento",
        clubNegotiation: {
          partnerClub: "Aston Villa",
          transferFee: 35000000,
          status: "em_negociacao",
        },
      };

      const { rerender } = render(
        <ProposalClauseCard
          proposal={saleWithoutSwap}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={onOpenScreen}
          onEditPlayer={onEditPlayer}
        />,
      );

      // Não deve exibir Termos do Atleta
      expect(
        screen.queryByTestId("btn-edit-player-proposal-prop_venda_ferran"),
      ).toBeNull();
      expect(screen.queryByText("Termos do Atleta")).toBeNull();
      // Deve exibir Cláusulas do Clube
      expect(
        screen.getByTestId("btn-edit-club-proposal-prop_venda_ferran"),
      ).toBeDefined();

      // Agora proposta de venda de Ferran Torres com atleta de troca vindo do Aston Villa
      const saleWithSwap: TransferProposal = {
        ...saleWithoutSwap,
        id: "prop_venda_ferran_swap",
        clubNegotiation: {
          partnerClub: "Aston Villa",
          transferFee: 20000000,
          status: "em_negociacao",
          swapPlayer: {
            playerName: "Jacob Ramsey",
            position: "MC",
            overall: 78,
            age: 23,
            estimatedValue: 15000000,
            incomingSwap: true,
          },
        },
        playerNegotiation: {
          squadRole: "Importante",
          weeklyWage: 80000,
          durationYears: 4,
          status: "em_negociacao",
        },
      };

      rerender(
        <ProposalClauseCard
          proposal={saleWithSwap}
          career={mockCareer}
          season={mockSeason}
          onOpenScreen={onOpenScreen}
          onEditPlayer={onEditPlayer}
        />,
      );

      // Deve exibir Termos do Atleta no rodapé e na grade de estágios
      const playerTermsBtn = screen.getByTestId(
        "btn-edit-player-proposal-prop_venda_ferran_swap",
      );
      expect(playerTermsBtn).toBeDefined();
      expect(screen.getAllByText("Termos do Atleta").length).toBeGreaterThanOrEqual(1);

      fireEvent.click(playerTermsBtn);
      expect(onEditPlayer).toHaveBeenCalledWith(saleWithSwap);
    });

    it("useManageClausesTransfers: filtra contrapartida de saída de exitTransfers mas mantém chegada por troca em arrivalTransfers", () => {
      // Eric García cedido como contrapartida em transferência de compra
      const ericGarcia = createMockPlayer({
        id: "p_eric_garcia",
        name: "Eric García",
        position: "ZAG",
        sector: "Defesa",
        sell: true,
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "FC Barcelona",
            leftClub: "Girona FC",
            dataArrival: null,
            dataExit: new Date("2024-07-20"),
            swapPlayer: {
              playerId: "p_eric_garcia",
              playerName: "Eric García",
              isCounterpart: true,
            },
          },
        ],
      });

      // Atleta de troca recebido pelo FC Barcelona
      const jacobRamsey = createMockPlayer({
        id: "p_ramsey",
        name: "Jacob Ramsey",
        position: "MC",
        sector: "Meio-Campo",
        buy: true,
        contract: [
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "Aston Villa",
            leftClub: "",
            dataArrival: new Date("2024-07-20"),
            salary: 80000,
            contractTime: 4,
            contractUntil: "2028-06-30",
            swapPlayer: {
              playerId: "p_ferran",
              playerName: "Ferran Torres",
              isCounterpart: true,
            },
          },
        ],
      });

      const testSeason: ClubData = {
        id: "season_1",
        seasonNumber: 1,
        players: [ericGarcia, jacobRamsey],
      } as unknown as ClubData;

      const { result } = renderHook(() =>
        useManageClausesTransfers({
          career: mockCareer,
          season: testSeason,
        }),
      );

      // Eric García NÃO deve estar na lista de saídas (contrapartida de saída filtrada)
      const exitPlayerIds = result.current.exitTransfers.map(
        (item) => item.player.id,
      );
      expect(exitPlayerIds).not.toContain("p_eric_garcia");

      // Jacob Ramsey DEVE estar na lista de chegadas (atleta recebido como contrapartida)
      const arrivalPlayerIds = result.current.arrivalTransfers.map(
        (item) => item.player.id,
      );
      expect(arrivalPlayerIds).toContain("p_ramsey");
    });

    it("ModularClausesGrid com onlyPlayerCards={true} renderiza apenas os 2 módulos do jogador e exibe '2 Módulos Operacionais'", () => {
      const onOpenBonus = vi.fn();
      const onOpenOtherClauses = vi.fn();
      const onOpenPlayerBonus = vi.fn();
      const onOpenPlayerOtherClauses = vi.fn();

      render(
        <ModularClausesGrid
          direction="arrivals"
          onlyPlayerCards={true}
          formValues={{
            transferFee: "0",
            salary: "80.000",
            contractYears: "4",
          }}
          bonuses={[]}
          onOpenBonus={onOpenBonus}
          onOpenOtherClauses={onOpenOtherClauses}
          onOpenPlayerBonus={onOpenPlayerBonus}
          onOpenPlayerOtherClauses={onOpenPlayerOtherClauses}
        />,
      );

      // Deve exibir "2 Módulos Operacionais"
      expect(screen.getByText(/2 Módulos Operacionais/i)).toBeDefined();

      // Deve renderizar os 2 módulos do jogador (com numeração de 1 a 2)
      expect(screen.getByText("1. Bônus & Metas (Jogador)")).toBeDefined();
      expect(screen.getByText("2. Cláusulas Especiais (Jogador)")).toBeDefined();

      // NÃO deve renderizar os módulos de clube
      expect(screen.queryByText("Parcelamento")).toBeNull();
      expect(screen.queryByText("Atleta de Troca")).toBeNull();
      expect(screen.queryByText("Bônus & Metas (Clube)")).toBeNull();
      expect(screen.queryByText("Cláusulas Especiais (Clube)")).toBeNull();
    });

    it("proposalStatusHelper: valida regras de estágios e status geral para venda com e sem atleta de troca", () => {
      // 1. Venda sem atleta de troca: não permite playerNegotiation
      const saleNoSwap: TransferProposal = {
        id: "prop_test_1",
        careerId: "career_barca",
        seasonId: "season_1",
        playerId: "p_ferran",
        playerName: "Ferran Torres",
        playerPosition: "ATA",
        playerSector: "Ataque",
        playerNation: "ESP",
        type: "venda",
        overallStatus: "em_andamento",
        clubNegotiation: {
          partnerClub: "Aston Villa",
          status: "em_negociacao",
        },
      };

      expect(() =>
        validateProposalStageRules({
          ...saleNoSwap,
          playerNegotiation: {
            squadRole: "Importante",
            weeklyWage: 80000,
            durationYears: 4,
            status: "aceita",
          },
        }),
      ).toThrow(
        "Negociação com o atleta não é aplicável a propostas de venda ou empréstimo de saída",
      );

      // 2. Venda COM atleta de troca: permite playerNegotiation
      const saleWithSwap: TransferProposal = {
        ...saleNoSwap,
        clubNegotiation: {
          partnerClub: "Aston Villa",
          status: "em_negociacao",
          swapPlayer: {
            playerName: "Jacob Ramsey",
          },
        },
        playerNegotiation: {
          squadRole: "Importante",
          weeklyWage: 80000,
          durationYears: 4,
          status: "aceita",
        },
      };

      expect(() => validateProposalStageRules(saleWithSwap)).not.toThrow();

      // 3. Status geral: se o clube aceitou mas o jogador ainda está em negociação, status é 'em_andamento'
      const statusPartial = calculateOverallProposalStatus({
        ...saleWithSwap,
        clubNegotiation: {
          ...saleWithSwap.clubNegotiation!,
          status: "aceita",
        },
        playerNegotiation: {
          ...saleWithSwap.playerNegotiation!,
          status: "em_negociacao",
        },
      });
      expect(statusPartial).toBe("em_andamento");

      // 4. Status geral: quando ambos aceitam, status vira 'aguardando_confirmacao'
      const statusComplete = calculateOverallProposalStatus({
        ...saleWithSwap,
        clubNegotiation: {
          ...saleWithSwap.clubNegotiation!,
          status: "aceita",
        },
        playerNegotiation: {
          ...saleWithSwap.playerNegotiation!,
          status: "aceita",
        },
      });
      expect(statusComplete).toBe("aguardando_confirmacao");
    });
  });
});
