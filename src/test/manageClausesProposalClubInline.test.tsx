// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, renderHook, act } from "@testing-library/react";
import ProposalClauseCard from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ProposalClauseCard";
import { useManageClausesActions } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/hooks/useManageClausesActions";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { career, season } from "./factories/domain";
import { parseValue } from "../common/utils/FormatValue";
import { createTransferInstallments } from "../common/interfaces/playersInfo/transferTerms";
import { getAddTransferPlayerFields } from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/constants/transferFormFields";
import { ServiceProposals } from "../common/services/ServiceProposals";

const mockConfirm = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("../common/hooks/UseToast", () => ({
  useToast: () => ({
    confirm: mockConfirm,
    success: mockToastSuccess,
    error: mockToastError,
    warning: vi.fn(),
  }),
}));

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    deleteProposal: vi.fn().mockResolvedValue(undefined),
    updateProposal: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("ManageClauses Proposal Club Inline Tests (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockCareer: Career = career({
    id: "c_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    currency: "€",
    createdAt: new Date("2026-08-01"),
    nation: "ESP",
    clubData: [],
  });

  const mockSeason: ClubData = season({
    id: "s_2026",
    seasonNumber: 1,
    players: [],
    matches: [],
  });

  const barcaProposalWithClauses: TransferProposal = {
    id: "prop_pedri_1",
    careerId: "c_barca",
    seasonId: "s_2026",
    type: "compra",
    overallStatus: "em_andamento",
    playerId: "p_pedri",
    playerName: "Pedri",
    playerNation: "Espanha",
    playerPosition: "MC",
    playerSector: "Meio-Campo",
    playerOverall: 89,
    playerAge: 23,
    timing: "Imediata",
    clubNegotiation: {
      partnerClub: "Las Palmas",
      transferFee: 50000000,
      status: "em_negociacao",
      installments: createTransferInstallments({
        totalValue: 50000000,
        percentage: 60,
        totalInstallments: 3,
        currentSeasonNumber: 1,
        direction: "payable",
        partnerClub: "Las Palmas",
      }),
      swapPlayer: {
        playerName: "Ansu Fati",
        playerValue: 15000000,
        sector: "Ataque",
        position: "PE",
        incomingSwap: false,
      },
      bonuses: [
        {
          id: "b_pedri_1",
          direction: "payable",
          category: "performance",
          bonusCategory: "Desempenho",
          name: "10 assistências",
          description: "10 assistências",
          bonusTarget: "10 assistências",
          value: 5000000,
          status: "pending",
          paid: false,
        },
      ],
      buybackValue: 60000000,
    },
    createdAt: 1000,
    updatedAt: 1000,
  };

  it("renderiza botão 'Voltar' no ProposalClauseCard quando isDetailView é true", () => {
    const onBack = vi.fn();
    render(
      <ProposalClauseCard
        proposal={barcaProposalWithClauses}
        career={mockCareer}
        season={mockSeason}
        isDetailView={true}
        onBack={onBack}
      />,
    );

    const backBtn = screen.getByTestId(`btn-back-proposal-${barcaProposalWithClauses.id}`);
    expect(backBtn).toBeDefined();
    expect(backBtn.textContent).toContain("Voltar");

    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);

    // Não deve renderizar botões da visualização de lista normal
    expect(screen.queryByRole("button", { name: /Cláusulas do Clube/i })).toBeNull();
  });

  it("renderiza pílulas de resumo de cláusulas quando a proposta possui parcelamento, troca ou bônus", () => {
    render(
      <ProposalClauseCard
        proposal={barcaProposalWithClauses}
        career={mockCareer}
        season={mockSeason}
        isDetailView={true}
        onBack={vi.fn()}
      />,
    );

    // Pílulas de resumo
    expect(screen.getByText(/Parcelado/i)).toBeDefined();
    expect(screen.getByText(/Ansu Fati/i)).toBeDefined();
    expect(screen.getByText(/bônus/i)).toBeDefined();
  });

  it("startEditProposalClub abre a proposta inline com dados populados e activeTransferItem sintético", () => {
    const setIsLoading = vi.fn();
    const setLocalVersion = vi.fn();
    const setDeletedRenewalKeys = vi.fn();

    const { result } = renderHook(() =>
      useManageClausesActions({
        career: mockCareer,
        season: mockSeason,
        allTransfers: [],
        setIsLoading,
        setLocalVersion,
        setDeletedRenewalKeys,
      }),
    );

    act(() => {
      result.current.startEditProposalClub(barcaProposalWithClauses);
    });

    expect(result.current.activeProposal).toEqual(barcaProposalWithClauses);
    expect(result.current.activeInline).toEqual({
      cardKey: barcaProposalWithClauses.id,
      mode: "edit",
      scope: "club",
    });

    // activeTransferItem sintético deve estar configurado como arrivals para propostas de compra
    expect(result.current.activeTransferItem).toBeDefined();
    expect(result.current.activeTransferItem?.player.name).toBe("Pedri");
    expect(result.current.activeTransferItem?.direction).toBe("arrivals");

    // FormValues populados
    expect(result.current.editingBooleans.hasInstallments).toBe(true);
    expect(result.current.editingBooleans.hasPlayerSwap).toBe(true);
    expect(result.current.editingBooleans.hasBonus).toBe(true);
    expect(result.current.editingValues.swapPlayerName).toBe("Ansu Fati");
  });

  it("handleSaveInline em proposta salva via ServiceProposals.updateProposal sem finalizar", async () => {
    const setIsLoading = vi.fn();
    const setLocalVersion = vi.fn();
    const setDeletedRenewalKeys = vi.fn();

    const { result } = renderHook(() =>
      useManageClausesActions({
        career: mockCareer,
        season: mockSeason,
        allTransfers: [],
        setIsLoading,
        setLocalVersion,
        setDeletedRenewalKeys,
      }),
    );

    act(() => {
      result.current.startEditProposalClub(barcaProposalWithClauses);
    });

    await act(async () => {
      await result.current.handleSaveInline(result.current.activeTransferItem!);
    });

    expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
      "c_barca",
      "s_2026",
      "prop_pedri_1",
      expect.objectContaining({
        clubNegotiation: expect.objectContaining({
          status: "em_negociacao",
        }),
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Cláusulas do clube salvas com sucesso!",
    );
  });

  it("parseValue normaliza pontos de milhar corretamente e maxLength é 15 nos inputs", () => {
    expect(parseValue("50.000.000")).toBe(50000000);
    expect(parseValue("1.2M")).toBe(1200000);
    expect(parseValue("250k")).toBe(250000);

    const sections = getAddTransferPlayerFields("", "Compra", [], {}, []);
    const contractSection = sections.find(
      (s) => s.title === "Detalhes Contratuais",
    );
    const buyValueField = contractSection?.fields
      .flat()
      .find((f) => f.id === "buyValue");

    expect(buyValueField?.maxLength).toBe(15);
  });

  it("em proposta de compra sem atleta de troca inicial, direction é arrivals, card fica Nenhum e ao selecionar atleta do clube resolve dados automáticos", () => {
    const setIsLoading = vi.fn();
    const setLocalVersion = vi.fn();
    const setDeletedRenewalKeys = vi.fn();

    const mockSeasonWithGavi: ClubData = season({
      id: "s_2026",
      seasonNumber: 1,
      players: [
        {
          id: "p_gavi",
          name: "Gavi",
          position: "MC",
          sector: "Meio-Campo",
          playerValue: 90000000,
          overall: 85,
          age: 20,
        } as unknown as Players,
      ],
      matches: [],
    });

    const purchaseProposalNoSwap: TransferProposal = {
      id: "prop_purchase_no_swap",
      careerId: "c_barca",
      seasonId: "s_2026",
      type: "compra",
      overallStatus: "em_andamento",
      playerId: "p_target",
      playerName: "Dani Olmo",
      playerNation: "Espanha",
      playerPosition: "MEI",
      playerSector: "Meio-Campo",
      playerOverall: 84,
      playerAge: 26,
      timing: "Imediata",
      clubNegotiation: {
        partnerClub: "RB Leipzig",
        transferFee: 55000000,
        status: "em_negociacao",
      },
      createdAt: 1000,
      updatedAt: 1000,
    };

    const { result } = renderHook(() =>
      useManageClausesActions({
        career: mockCareer,
        season: mockSeasonWithGavi,
        allTransfers: [],
        setIsLoading,
        setLocalVersion,
        setDeletedRenewalKeys,
      }),
    );

    act(() => {
      result.current.startEditProposalClub(purchaseProposalNoSwap);
    });

    // 1. Deve ser arrivals, sem atleta de troca inicial
    expect(result.current.activeTransferItem?.direction).toBe("arrivals");
    expect(result.current.editingBooleans.hasPlayerSwap).toBe(false);
    expect(result.current.editingValues.swapPlayerName).toBe("");

    // 2. Abre a gaveta de troca (hasPlayerSwap deve permanecer false pois ainda não há jogador)
    act(() => {
      result.current.handleOpenSectionDrawer("swap");
    });
    expect(result.current.editingBooleans.hasPlayerSwap).toBe(false);

    // 3. Usuário seleciona "Gavi" via SearchableSelect
    act(() => {
      result.current.handleCustomInputChange(
        { target: { value: "Gavi" } } as unknown as React.ChangeEvent<HTMLInputElement>,
        { id: "swapPlayerName" },
      );
    });

    expect(result.current.editingValues.swapPlayerName).toBe("Gavi");
    expect(result.current.editingValues.swapPlayerValue.toLowerCase()).toBe("90m");
    expect(result.current.editingValues.swapPlayerSector).toBe("Meio-Campo");
    expect(result.current.editingValues.swapPlayerPosition).toBe("MC");
    expect(result.current.editingBooleans.hasPlayerSwap).toBe(true);

    // 4. Usuário limpa / remove atleta da troca
    act(() => {
      result.current.handleCustomInputChange(
        { target: { value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>,
        { id: "swapPlayerName" },
      );
    });

    expect(result.current.editingValues.swapPlayerName).toBe("");
    expect(result.current.editingBooleans.hasPlayerSwap).toBe(false);
  });
});
