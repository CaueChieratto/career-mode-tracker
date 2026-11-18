// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, render, screen, act, cleanup } from "@testing-library/react";
import { useAddTransferPlayerActions } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/hooks/useAddTransferPlayerActions";
import { useTransferForm } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useTransferForm";
import TransferPlayer from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer";
import { useRenewPlayerForm } from "../layout/SectionView/features/ClubTabs/SquadTab/views/RenewPlayer/hooks/useRenewPlayerForm";
import RenewPlayer from "../layout/SectionView/features/ClubTabs/SquadTab/views/RenewPlayer";
import { useProposalClubClausesForm } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ProposalClubClauses/hooks/useProposalClubClausesForm";
import { ServiceProposals } from "../common/services/ServiceProposals";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { toast } from "../common/services/ToastService";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Field } from "../components/FormSection";

vi.mock("../common/hooks/Colors/UseClubColors", () => ({
  useClubColors: () => ({ clubColor: "#004d98", darkClubColor: "#002d58" }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    activeStyle: {
      color: "#ffffff",
      darkClubColor: "#002d58",
      backgroundColor: "#004d98",
      primaryColor: "#004d98",
    },
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ pathname: "/career/1/season/1" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "fc_barcelona_career", seasonId: "season_2026_27" }),
    Form: React.forwardRef<HTMLFormElement, React.FormHTMLAttributes<HTMLFormElement>>(
      ({ children, ...props }, ref) => (
        <form ref={ref} {...props}>{children}</form>
      ),
    ),
  };
});

// Mock Services and Toasts
vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    createProposal: vi.fn(),
    updateProposal: vi.fn(),
    updateProposalStatus: vi.fn(),
    getProposalById: vi.fn(),
  },
}));

vi.mock("../common/services/ServicePlayers/PlayersContractService", () => ({
  PlayersContractService: {
    signPlayerWithTerms: vi.fn(),
    createPlayerRenewal: vi.fn(),
  },
}));

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Proposal Forms Isolation Tests (Etapa 2 - Padrão FC Barcelona)", () => {
  const mockCareer: Career = {
    id: "fc_barcelona_career",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "https://example.com/barca.png",
    nation: "ESP",
    currency: "EUR",
    createdAt: new Date("2026-07-01"),
    customBonusObjectives: {},
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    clubData: [],
  };

  const mockPedriPlayer: Players = {
    id: "pedri_8",
    name: "Pedri",
    position: "MC",
    sector: "Meio-Campo",
    age: 23,
    overall: 89,
    nation: "ESP",
    shirtNumber: "8",
    playerValue: 120000000,
    salary: 220000,
    buy: true,
    sell: false,
    captain: false,
    contractTime: 3,
    contractUntil: "30/06/2029",
    ballonDor: 0,
    contract: [],
    statsLeagues: [],
    squadRole: "Crucial",
  };

  const mockSeason: ClubData = {
    id: "season_2026_27",
    seasonNumber: 1,
    year: "2026/2027",
    clubName: "FC Barcelona",
    players: [mockPedriPlayer],
    finances: {
      budget: 150000000,
      wageBudget: 4000000,
    },
    table: [],
    matches: [],
  } as unknown as ClubData;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("AddTransferPlayer Isolation", () => {
    it("deve salvar proposta via ServiceProposals sem chamar PlayersContractService.signPlayerWithTerms()", async () => {
      const onClose = vi.fn();
      const onOpenScreen = vi.fn();
      const setIsLoading = vi.fn();

      const createdMockProposal = {
        id: "prop_123",
        careerId: mockCareer.id,
        seasonId: mockSeason.id,
        type: "compra" as const,
        overallStatus: "em_andamento" as const,
        playerId: "target_yamal",
        playerName: "Lamine Yamal",
        playerNation: "ESP",
        playerPosition: "PD",
        playerSector: "Ataque",
        playerOverall: 88,
        playerAge: 19,
        clubNegotiation: {
          partnerClub: "La Masia",
          status: "em_negociacao" as const,
          transferFee: 80000000,
        },
      };

      vi.mocked(ServiceProposals.createProposal).mockResolvedValueOnce(
        createdMockProposal as unknown as TransferProposal,
      );

      const { result } = renderHook(() =>
        useAddTransferPlayerActions({
          career: mockCareer,
          season: mockSeason,
          onClose,
          onOpenScreen,
          formValues: {
            playerName: "Lamine Yamal",
            fromClub: "La Masia",
            position: "PD",
            sector: "Ataque",
            buyValue: "80m",
            nation: "ESP",
            overall: "88",
            age: "19",
          },
          booleanValues: {},
          bonuses: [],
          transferType: "Compra",
          setIsLoading,
        }),
      );

      let saved: TransferProposal | null = null;
      await act(async () => {
        saved = await result.current.handleSaveProposal(1, false);
      });

      expect(ServiceProposals.createProposal).toHaveBeenCalledTimes(1);
      expect(
        PlayersContractService.signPlayerWithTerms,
      ).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Proposta enviada com sucesso!");
      expect(onClose).toHaveBeenCalled();
      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "manageClauses",
        initialTab: "arrivals",
        selectedPlayerName: "Lamine Yamal",
        selectedProposalId: "prop_123",
      });
      expect(saved).toEqual(createdMockProposal);
    });
  });

  describe("TransferPlayer Isolation (Venda)", () => {
    it("deve salvar proposta de venda via ServiceProposals sem mutar elenco ou finanças e redirecionar para manageClauses (exit)", async () => {
      const handleGoBack = vi.fn();
      const onOpenScreen = vi.fn();

      vi.mocked(ServiceProposals.createProposal).mockResolvedValueOnce({
        id: "prop_pedri_sale",
        playerName: "Pedri",
      } as unknown as TransferProposal);

      const { result } = renderHook(() =>
        useTransferForm({
          careerId: mockCareer.id,
          season: mockSeason,
          career: mockCareer,
          player: mockPedriPlayer,
          currentPlayers: [mockPedriPlayer],
          handleGoBack,
          onOpenScreen,
        }),
      );

      // Simula preenchimento dos campos de venda
      act(() => {
        result.current.handleCustomInputChange(
          {
            target: { name: "toClub", value: "Manchester City" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          { id: "toClub" } as unknown as Field,
        );
        result.current.handleCustomInputChange(
          {
            target: { name: "sellValue", value: "120m" },
          } as unknown as React.ChangeEvent<HTMLInputElement>,
          { id: "sellValue" } as unknown as Field,
        );
      });

      await act(async () => {
        await result.current.handleSaveProposal(false);
      });

      expect(ServiceProposals.createProposal).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(ServiceProposals.createProposal).mock
        .calls[0][2];
      expect(callArgs.type).toBe("venda");
      expect(callArgs.playerName).toBe("Pedri");
      expect(callArgs.playerNegotiation).toBeUndefined(); // Venda: termos do atleta acertados externamente
      expect(callArgs.clubNegotiation?.partnerClub).toBe("Manchester City");
      expect(callArgs.clubNegotiation?.transferFee).toBe(120000000);

      // Garante que o jogador continuou no elenco sem alteração
      expect(mockPedriPlayer.sell).toBe(false);
      expect(toast.success).toHaveBeenCalledWith("Proposta salva com sucesso!");
      expect(handleGoBack).toHaveBeenCalled();
      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "manageClauses",
        initialTab: "exit",
        selectedPlayerName: "Pedri",
        selectedProposalId: "prop_pedri_sale",
      });
    });

    it("não renderiza barra de botões duplicados (Salvar Proposta / Revisar e Finalizar) e exibe Enviar Proposta na Navbar", () => {
      render(
        <TransferPlayer
          career={mockCareer}
          season={mockSeason}
          playerId={mockPedriPlayer.id}
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText("Salvar Proposta")).toBeNull();
      expect(screen.queryByText("Revisar e Finalizar")).toBeNull();
      expect(screen.getByText("Enviar Proposta")).toBeDefined();
    });
  });

  describe("RenewPlayer Isolation (Renovação)", () => {
    it("deve salvar proposta de renovação sem chamar createPlayerRenewal, sem clubNegotiation, com VETO a agentFee e redirecionando para manageClauses (renewals)", async () => {
      const onClose = vi.fn();
      const onOpenScreen = vi.fn();

      vi.mocked(ServiceProposals.createProposal).mockResolvedValueOnce({
        id: "prop_pedri_renewal",
        playerName: "Pedri",
      } as unknown as TransferProposal);

      const { result } = renderHook(() =>
        useRenewPlayerForm({
          career: mockCareer,
          season: mockSeason,
          playerId: mockPedriPlayer.id,
          onClose,
          onOpenScreen,
        }),
      );

      // Preenche dados da renovação
      act(() => {
        result.current.handleInputChange({
          target: { name: "salary", value: "280k" },
        });
        result.current.handleInputChange({
          target: { name: "contractTime", value: "4" },
        });
        result.current.handleInputChange({
          target: { name: "signingBonus", value: "5m" },
        });
      });

      await act(async () => {
        await result.current.handleSaveProposal(false);
      });

      expect(ServiceProposals.createProposal).toHaveBeenCalledTimes(1);
      expect(
        PlayersContractService.createPlayerRenewal,
      ).not.toHaveBeenCalled();

      const callArgs = vi.mocked(ServiceProposals.createProposal).mock
        .calls[0][2];
      expect(callArgs.type).toBe("renovacao");
      expect(callArgs.playerName).toBe("Pedri");
      expect(callArgs.clubNegotiation).toBeUndefined(); // Renovação: sem etapa de clube
      expect(callArgs.playerNegotiation).toBeDefined();
      expect(callArgs.playerNegotiation?.weeklyWage).toBe(280000);
      expect(callArgs.playerNegotiation?.durationYears).toBe(7); // 3 anos originais + 4 anos de extensão = 7 anos

      // VETO ABSOLUTO A AGENT FEE
      expect(callArgs.playerNegotiation?.agentFee).toBeUndefined();

      expect(toast.success).toHaveBeenCalledWith(
        "Proposta de renovação salva com sucesso!",
      );
      expect(onClose).toHaveBeenCalled();
      expect(onOpenScreen).toHaveBeenCalledWith({
        key: "manageClauses",
        initialTab: "renewals",
        selectedPlayerName: "Pedri",
        selectedProposalId: "prop_pedri_renewal",
      });
    });

    it("não renderiza barra de botões duplicados (Salvar Proposta / Revisar e Finalizar) e exibe Enviar Proposta na Navbar", () => {
      render(
        <RenewPlayer
          career={mockCareer}
          season={mockSeason}
          playerId={mockPedriPlayer.id}
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText("Salvar Proposta")).toBeNull();
      expect(screen.queryByText("Revisar e Finalizar")).toBeNull();
      expect(screen.getByText("Enviar Proposta")).toBeDefined();
    });
  });

  describe("Bônus em Propostas de Venda (Regressão de 'Objetivo atingido' vs 'Prêmio')", () => {
    it("permite adicionar um bônus de Prêmio ('Bola de Ouro') e em seguida um de Objetivo atingido sem disparar toast de duplicidade", () => {
      const mockSaleProposal: TransferProposal = {
        id: "prop_raphinha_sale",
        careerId: "career_barca",
        seasonId: "season_1",
        type: "venda",
        playerId: "raphinha_id",
        playerName: "Raphinha",
        playerPosition: "ATA",
        playerSector: "Ataque",
        playerNation: "BRA",
        overallStatus: "em_andamento",
        timing: "Imediata",
        clubNegotiation: {
          partnerClub: "Paris Saint-Germain",
          transferFee: 90000000,
          status: "em_negociacao",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { result } = renderHook(() =>
        useProposalClubClausesForm({
          career: mockCareer,
          season: mockSeason,
          proposal: mockSaleProposal,
        }),
      );

      // 1. Adiciona bônus de categoria "Prêmio"
      act(() => {
        result.current.setFormValues({
          bonusCategory: "Prêmio",
          bonusObjective: "Bola de Ouro",
          bonusValue: "5M",
        });
      });

      act(() => {
        const added = result.current.handleAddOrEditBonus();
        expect(added).toBe(true);
      });

      expect(result.current.bonuses).toHaveLength(1);
      expect(result.current.bonuses[0].bonusCategory).toBe("Prêmio");
      expect(result.current.bonuses[0].category).toBe("award");
      expect(toast.warning).not.toHaveBeenCalled();

      // 2. Adiciona bônus de categoria "Objetivo atingido"
      act(() => {
        result.current.setFormValues((prev) => ({
          ...prev,
          bonusCategory: "Objetivo atingido",
          bonusObjective: "Conquistar a UEFA Champions League",
          bonusValue: "10M",
        }));
      });

      act(() => {
        const added = result.current.handleAddOrEditBonus();
        expect(added).toBe(true);
      });

      expect(result.current.bonuses).toHaveLength(2);
      expect(result.current.bonuses[1].bonusCategory).toBe("Objetivo atingido");
      expect(result.current.bonuses[1].category).toBe("objective");
      expect(toast.warning).not.toHaveBeenCalled();

      // 3. Tenta adicionar um segundo bônus de "Objetivo atingido" (deve ser bloqueado)
      act(() => {
        result.current.setFormValues((prev) => ({
          ...prev,
          bonusCategory: "Objetivo atingido",
          bonusObjective: "Ser campeão na liga nacional",
          bonusValue: "5M",
        }));
      });

      act(() => {
        const added = result.current.handleAddOrEditBonus();
        expect(added).toBe(false);
      });

      expect(toast.warning).toHaveBeenCalledWith(
        "O bônus de 'Objetivo atingido' só pode ser adicionado uma única vez.",
      );
      expect(result.current.bonuses).toHaveLength(2);
    });
  });
});

