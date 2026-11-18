// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act, render, screen, cleanup } from "@testing-library/react";
import { useManageClausesLoanActions } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/hooks/useManageClausesLoanActions";
import { ClauseOperationalManageView } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ClauseOperationalManageView";
import { ServiceProposals } from "../common/services/ServiceProposals";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { TransferItem } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/types";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    getProposalsBySeason: vi.fn(),
    createProposal: vi.fn(),
    updateProposal: vi.fn(),
  },
}));

describe("loanRevertAndBuyOptionLifecycle (Padrão FC Barcelona)", () => {
  const showWarning = vi.fn();
  const showError = vi.fn();
  const showSuccess = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockCareer: Career = {
    id: "c_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "",
    nation: "ESP",
    currency: "€",
    createdAt: new Date("2026-07-01"),
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    clubData: [],
  };

  const pauVictorContract: Contract = {
    isLoan: true,
    fromClub: "Girona FC",
    leftClub: "",
    buyValue: 0,
    sellValue: 0,
    dataArrival: new Date("2026-07-15"),
    timing: "Imediata",
    loanTerms: {
      durationYears: 1,
      ourWagePercentage: 60,
      theirWagePercentage: 40,
      hasBuyOption: true,
      buyOptionFee: 3000000,
      partnerClub: "Girona FC",
    },
  };

  const pauVictorPlayer: Players = {
    id: "p_pau_victor",
    name: "Pau Víctor",
    position: "ATA",
    sector: "Ataque",
    age: 23,
    overall: 78,
    nation: "ESP",
    shirtNumber: "18",
    buy: false,
    sell: false,
    captain: false,
    incomingLoan: true,
    contract: [pauVictorContract],
    ballonDor: 0,
    statsLeagues: [],
  };

  const mockSeason: ClubData = {
    id: "s_2026",
    seasonNumber: 1,
    year: "2026/2027",
    clubName: "FC Barcelona",
    players: [pauVictorPlayer],
    table: [],
    matches: [],
  } as unknown as ClubData;

  const transferItem: TransferItem = {
    player: pauVictorPlayer,
    contract: pauVictorContract,
    contractIndex: 0,
    direction: "arrivals",
    cardKey: "p_pau_victor_0_arrivals",
  };

  it("cria a proposta de compra por opção sem marcar o contrato permanentemente no banco", async () => {
    vi.mocked(ServiceProposals.getProposalsBySeason).mockResolvedValueOnce([]);
    vi.mocked(ServiceProposals.createProposal).mockResolvedValueOnce({
      id: "prop_new",
    } as unknown as TransferProposal);

    const { result } = renderHook(() =>
      useManageClausesLoanActions({
        career: mockCareer,
        season: mockSeason,
        setIsLoading: vi.fn(),
        setLocalVersion: vi.fn(),
        setActiveInline: vi.fn(),
        setActiveProposal: vi.fn(),
        setActiveSectionDrawer: vi.fn(),
        lastClickedCardKeyRef: { current: null },
        drawerSnapshotRef: { current: null },
        showError,
        showWarning,
        showSuccess,
      }),
    );

    await act(async () => {
      await result.current.handleExerciseArrivalLoanBuyOption(transferItem);
    });

    expect(ServiceProposals.createProposal).toHaveBeenCalledWith(
      "c_barca",
      "s_2026",
      expect.objectContaining({
        type: "compra",
        originLoanBuyOption: true,
        playerId: "p_pau_victor",
        clubNegotiation: expect.objectContaining({
          transferFee: 3000000,
        }),
      }),
    );
    expect(showSuccess).toHaveBeenCalled();
  });

  it("impede criação de propostas concorrentes se já existir uma proposta de opção de compra ativa", async () => {
    vi.mocked(ServiceProposals.getProposalsBySeason).mockResolvedValueOnce([
      {
        id: "prop_existing",
        playerId: "p_pau_victor",
        originLoanBuyOption: true,
        overallStatus: "em_andamento",
      } as unknown as TransferProposal,
    ]);

    const { result } = renderHook(() =>
      useManageClausesLoanActions({
        career: mockCareer,
        season: mockSeason,
        setIsLoading: vi.fn(),
        setLocalVersion: vi.fn(),
        setActiveInline: vi.fn(),
        setActiveProposal: vi.fn(),
        setActiveSectionDrawer: vi.fn(),
        lastClickedCardKeyRef: { current: null },
        drawerSnapshotRef: { current: null },
        showError,
        showWarning,
        showSuccess,
      }),
    );

    await act(async () => {
      await result.current.handleExerciseArrivalLoanBuyOption(transferItem);
    });

    expect(ServiceProposals.createProposal).not.toHaveBeenCalled();
    expect(showWarning).toHaveBeenCalledWith(
      "Já existe uma proposta de exercício da opção de compra em andamento.",
    );
  });

  it("permite reexercer a opção de compra se a proposta anterior foi cancelada", async () => {
    vi.mocked(ServiceProposals.getProposalsBySeason).mockResolvedValueOnce([
      {
        id: "prop_cancelled",
        playerId: "p_pau_victor",
        originLoanBuyOption: true,
        overallStatus: "cancelada",
      } as unknown as TransferProposal,
    ]);
    vi.mocked(ServiceProposals.createProposal).mockResolvedValueOnce({
      id: "prop_new_2",
    } as unknown as TransferProposal);

    const { result } = renderHook(() =>
      useManageClausesLoanActions({
        career: mockCareer,
        season: mockSeason,
        setIsLoading: vi.fn(),
        setLocalVersion: vi.fn(),
        setActiveInline: vi.fn(),
        setActiveProposal: vi.fn(),
        setActiveSectionDrawer: vi.fn(),
        lastClickedCardKeyRef: { current: null },
        drawerSnapshotRef: { current: null },
        showError,
        showWarning,
        showSuccess,
      }),
    );

    await act(async () => {
      await result.current.handleExerciseArrivalLoanBuyOption(transferItem);
    });

    expect(ServiceProposals.createProposal).toHaveBeenCalledTimes(1);
    expect(showSuccess).toHaveBeenCalled();
  });

  it("bloqueia o exercício se o atleta já foi comprado definitivamente (fromLoanBuyOption && !isLoan)", async () => {
    const boughtItem: TransferItem = {
      ...transferItem,
      contract: {
        ...pauVictorContract,
        isLoan: false,
        fromLoanBuyOption: true,
      },
      player: {
        ...pauVictorPlayer,
        contract: [
          pauVictorContract,
          {
            ...pauVictorContract,
            isLoan: false,
            fromLoanBuyOption: true,
          },
        ],
      },
    };

    const { result } = renderHook(() =>
      useManageClausesLoanActions({
        career: mockCareer,
        season: mockSeason,
        setIsLoading: vi.fn(),
        setLocalVersion: vi.fn(),
        setActiveInline: vi.fn(),
        setActiveProposal: vi.fn(),
        setActiveSectionDrawer: vi.fn(),
        lastClickedCardKeyRef: { current: null },
        drawerSnapshotRef: { current: null },
        showError,
        showWarning,
        showSuccess,
      }),
    );

    await act(async () => {
      await result.current.handleExerciseArrivalLoanBuyOption(boughtItem);
    });

    expect(ServiceProposals.createProposal).not.toHaveBeenCalled();
    expect(showWarning).toHaveBeenCalledWith(
      "A opção de compra deste atleta já foi exercida e concluída.",
    );
  });

  it("permite reexercer a opção de compra se a proposta anterior foi excluída e atleta NÃO possui contrato definitivo", async () => {
    // Propostas do banco agora vazias (proposta foi excluída)
    vi.mocked(ServiceProposals.getProposalsBySeason).mockResolvedValueOnce([]);
    vi.mocked(ServiceProposals.createProposal).mockResolvedValueOnce({
      id: "prop_re_exercised",
    } as unknown as TransferProposal);

    // Mesmo que o contrato de empréstimo tivesse uma flag residual de buyOptionExercised
    const itemWithResidualFlag: TransferItem = {
      ...transferItem,
      contract: {
        ...pauVictorContract,
        loanTerms: {
          ...pauVictorContract.loanTerms!,
          buyOptionExercised: true,
        },
      },
    };

    const { result } = renderHook(() =>
      useManageClausesLoanActions({
        career: mockCareer,
        season: mockSeason,
        setIsLoading: vi.fn(),
        setLocalVersion: vi.fn(),
        setActiveInline: vi.fn(),
        setActiveProposal: vi.fn(),
        setActiveSectionDrawer: vi.fn(),
        lastClickedCardKeyRef: { current: null },
        drawerSnapshotRef: { current: null },
        showError,
        showWarning,
        showSuccess,
      }),
    );

    await act(async () => {
      await result.current.handleExerciseArrivalLoanBuyOption(itemWithResidualFlag);
    });

    expect(ServiceProposals.createProposal).toHaveBeenCalledTimes(1);
    expect(showSuccess).toHaveBeenCalledWith(
      "Proposta de compra criada com base na opção fixada!",
    );
  });

  it("bloqueia o exercício se o contrato possui buyOptionFinalized: true", async () => {
    const finalizedItem: TransferItem = {
      ...transferItem,
      contract: {
        ...pauVictorContract,
        buyOptionFinalized: true,
        loanTerms: {
          ...pauVictorContract.loanTerms!,
          buyOptionFinalized: true,
        },
      },
    };

    const { result } = renderHook(() =>
      useManageClausesLoanActions({
        career: mockCareer,
        season: mockSeason,
        setIsLoading: vi.fn(),
        setLocalVersion: vi.fn(),
        setActiveInline: vi.fn(),
        setActiveProposal: vi.fn(),
        setActiveSectionDrawer: vi.fn(),
        lastClickedCardKeyRef: { current: null },
        drawerSnapshotRef: { current: null },
        showError,
        showWarning,
        showSuccess,
      }),
    );

    await act(async () => {
      await result.current.handleExerciseArrivalLoanBuyOption(finalizedItem);
    });

    expect(ServiceProposals.createProposal).not.toHaveBeenCalled();
    expect(showWarning).toHaveBeenCalledWith(
      "A opção de compra deste atleta já foi exercida e concluída.",
    );
  });

  it("ClauseOperationalManageView: exibe badge pendente se há proposta ativa, e botão se cancelada", () => {
    const activeProposal = {
      id: "prop_pau",
      playerId: "p_pau_victor",
      originLoanBuyOption: true,
      overallStatus: "em_andamento",
    } as TransferProposal;

    const { rerender } = render(
      <ClauseOperationalManageView
        career={mockCareer}
        activeTransferItem={transferItem}
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
        handleApplyWageAdjustment={vi.fn()}
        handleSettleInstallment={vi.fn()}
        handleUnsettleInstallment={vi.fn()}
        handleSettleBonus={vi.fn()}
        handleExerciseBuyback={vi.fn()}
        handleExerciseFirstRefusal={vi.fn()}
        handleTriggerReleaseClause={vi.fn()}
        handleConfirmSellOn={vi.fn()}
        handleExerciseLoanBuyOption={vi.fn()}
        handleExerciseArrivalLoanBuyOption={vi.fn()}
        proposals={[activeProposal]}
        onOpenScreen={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("arrival-loan-buy-option-pending-badge"),
    ).toBeDefined();
    expect(
      screen.queryByTestId("btn-exercise-arrival-loan-buy-option"),
    ).toBeNull();

    // Rerender com proposta cancelada: agora exibe o botão
    const cancelledProposal = {
      ...activeProposal,
      overallStatus: "cancelada",
    } as TransferProposal;

    rerender(
      <ClauseOperationalManageView
        career={mockCareer}
        activeTransferItem={transferItem}
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
        handleApplyWageAdjustment={vi.fn()}
        handleSettleInstallment={vi.fn()}
        handleUnsettleInstallment={vi.fn()}
        handleSettleBonus={vi.fn()}
        handleExerciseBuyback={vi.fn()}
        handleExerciseFirstRefusal={vi.fn()}
        handleTriggerReleaseClause={vi.fn()}
        handleConfirmSellOn={vi.fn()}
        handleExerciseLoanBuyOption={vi.fn()}
        handleExerciseArrivalLoanBuyOption={vi.fn()}
        proposals={[cancelledProposal]}
        onOpenScreen={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId("arrival-loan-buy-option-pending-badge"),
    ).toBeNull();
    expect(
      screen.getByTestId("btn-exercise-arrival-loan-buy-option"),
    ).toBeDefined();
  });

  it("ClauseOperationalManageView: exibe badge exercida se buyOptionFinalized é true", () => {
    const finalizedItem: TransferItem = {
      ...transferItem,
      contract: {
        ...pauVictorContract,
        buyOptionFinalized: true,
      },
    };

    render(
      <ClauseOperationalManageView
        career={mockCareer}
        activeTransferItem={finalizedItem}
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
        handleApplyWageAdjustment={vi.fn()}
        handleSettleInstallment={vi.fn()}
        handleUnsettleInstallment={vi.fn()}
        handleSettleBonus={vi.fn()}
        handleExerciseBuyback={vi.fn()}
        handleExerciseFirstRefusal={vi.fn()}
        handleTriggerReleaseClause={vi.fn()}
        handleConfirmSellOn={vi.fn()}
        handleExerciseLoanBuyOption={vi.fn()}
        handleExerciseArrivalLoanBuyOption={vi.fn()}
        proposals={[]}
        onOpenScreen={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("arrival-loan-buy-option-exercised-badge"),
    ).toBeDefined();
    expect(
      screen.queryByTestId("btn-exercise-arrival-loan-buy-option"),
    ).toBeNull();
  });

  it("bloqueia handleExerciseArrivalLoanBuyOption e handleExerciseLoanBuyOption quando não há opção de compra definida", async () => {
    const loanWithoutOptionContract: Contract = {
      isLoan: true,
      fromClub: "Girona FC",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2026-07-15"),
      timing: "Imediata",
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 60,
        theirWagePercentage: 40,
        hasBuyOption: false,
        partnerClub: "Girona FC",
      },
    };

    const itemWithoutOption: TransferItem = {
      player: { ...pauVictorPlayer, contract: [loanWithoutOptionContract] },
      contract: loanWithoutOptionContract,
      contractIndex: 0,
      direction: "arrivals",
      cardKey: "p_pau_victor_0_arrivals",
    };

    const { result } = renderHook(() =>
      useManageClausesLoanActions({
        career: mockCareer,
        season: mockSeason,
        setIsLoading: vi.fn(),
        setLocalVersion: vi.fn(),
        setActiveInline: vi.fn(),
        setActiveProposal: vi.fn(),
        setActiveSectionDrawer: vi.fn(),
        lastClickedCardKeyRef: { current: null },
        drawerSnapshotRef: { current: null },
        showError,
        showWarning,
        showSuccess,
      }),
    );

    await act(async () => {
      await result.current.handleExerciseArrivalLoanBuyOption(itemWithoutOption);
    });

    expect(ServiceProposals.createProposal).not.toHaveBeenCalled();
    expect(showWarning).toHaveBeenCalledWith(
      "Este empréstimo não possui opção de compra definida.",
    );

    showWarning.mockClear();

    await act(async () => {
      result.current.setLoanBuyOptionDateInput("20/08");
    });

    await act(async () => {
      await result.current.handleExerciseLoanBuyOption(itemWithoutOption);
    });

    expect(showWarning).toHaveBeenCalledWith(
      "Este empréstimo não possui opção de compra definida.",
    );
  });
});
