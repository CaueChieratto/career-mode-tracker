// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  renderHook,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import React from "react";
import ManageClauses from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses";
import { useManageClausesTransfers } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/hooks/useManageClausesTransfers";
import TransferClauseCard from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/TransferClauseCard";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { ServiceProposals } from "../common/services/ServiceProposals";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { TransferItem } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/types";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Career/c_barca/Season/s_2026" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "c_barca", seasonId: "s_2026" }),
  };
});

vi.mock("../contexts/SeasonThemeContext", () => ({
  SeasonThemeContext: React.createContext({
    clubColor: "#004d98",
    darkClubColor: "#a50044",
    activeStyle: {},
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

vi.mock("../components/HeaderSeason", () => ({
  default: ({
    titleText,
    backSeasons,
  }: {
    titleText: string;
    backSeasons: () => void;
  }) => (
    <header data-testid="header-season">
      <h1>{titleText}</h1>
      <button onClick={backSeasons}>Voltar</button>
    </header>
  ),
}));

describe("manageClausesExitLoansVisibility - Visibilidade de Empréstimos em Saídas (Padrão FC Barcelona)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
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

  const simpleLoanContract: Contract = {
    isLoan: true,
    leftClub: "Girona FC",
    fromClub: "",
    dataArrival: new Date("2026-07-01"),
    buyValue: 0,
    sellValue: 0,
    loanDuration: 2,
    wagePercentage: 50,
    dataExit: new Date("2026-07-15"),
    timing: "Imediata",
    // SEM opção de compra
    loanTerms: {
      durationYears: 2,
      theirWagePercentage: 50,
      ourWagePercentage: 50,
      hasBuyOption: false,
      partnerClub: "Girona FC",
    },
  };

  const ansuFati: Players = {
    id: "p_ansu_fati",
    name: "Ansu Fati",
    position: "PE",
    sector: "Ataque",
    age: 23,
    overall: 80,
    salary: 100000,
    nation: "ESP",
    shirtNumber: "10",
    buy: false,
    sell: false,
    captain: false,
    loan: true,
    contract: [simpleLoanContract],
    ballonDor: 0,
    statsLeagues: [],
  };

  const mockSeason: ClubData = {
    id: "s_2026",
    seasonNumber: 1,
    year: "2026/2027",
    clubName: "FC Barcelona",
    players: [ansuFati],
    table: [],
    matches: [],
  } as unknown as ClubData;

  it("inclui atletas emprestados de saída sem opção de compra em exitTransfers", () => {
    const { result } = renderHook(() =>
      useManageClausesTransfers({
        career: mockCareer,
        season: mockSeason,
        initialTab: "exit",
      }),
    );

    const exitLoans = result.current.exitTransfers.filter(
      (item) => item.player.id === "p_ansu_fati",
    );
    expect(exitLoans.length).toBe(1);
    expect(exitLoans[0].contract.isLoan).toBe(true);
    expect(exitLoans[0].contract.leftClub).toBe("Girona FC");
  });

  it("renderiza 'Duração do Empréstimo: 2 Anos' em TransferClauseCard para saída por empréstimo", () => {
    const item: TransferItem = {
      player: ansuFati,
      contract: simpleLoanContract,
      contractIndex: 0,
      direction: "exit",
      cardKey: "p_ansu_fati_0_exit",
    };

    render(
      <TransferClauseCard
        item={item}
        career={mockCareer}
        season={mockSeason}
        clubColor="#004d98"
        readOnly={false}
        highlightedCardKey={null}
        getClubBadgeUrl={() => undefined}
        startEditCard={vi.fn()}
        startManageCard={vi.fn()}
        cancelInline={vi.fn()}
        handleDeleteRenewal={vi.fn()}
        handleRevertTransfer={vi.fn()}
        activeInline={null}
        isDetailView={false}
      />,
    );

    expect(screen.getByText("Duração do Empréstimo:")).toBeDefined();
    expect(screen.getByText("2 Anos")).toBeDefined();
    expect(screen.queryByText("Taxa de Transferência:")).toBeNull();
  });

  it("empréstimo de chegada ativo fica em Chegadas; ao encerrar, sai de Chegadas e vai para Saídas mantendo 'Investimento Máximo Projetado' e fluxo de compra", async () => {
    vi.spyOn(ServiceProposals, "getProposalsBySeason").mockResolvedValue([]);
    const createProposalSpy = vi
      .spyOn(ServiceProposals, "createProposal")
      .mockResolvedValue({ id: "prop_cancelo_buy" } as TransferProposal);

    const activeIncomingContract: Contract = {
      isLoan: true,
      fromClub: "Manchester City",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      salary: 120_000,
      dataArrival: new Date("2026-07-15"),
      dataExit: null,
      loanDuration: 1,
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 100,
        theirWagePercentage: 0,
        hasBuyOption: true,
        buyOptionFee: 25_000_000,
        partnerClub: "Manchester City",
      },
    };

    const activeIncomingPlayer: Players = {
      ...ansuFati,
      id: "p_cancelo_active",
      name: "João Cancelo",
      loan: false,
      incomingLoan: true,
      sell: false,
      contract: [activeIncomingContract],
    };

    const { result: activeHook } = renderHook(() =>
      useManageClausesTransfers({
        career: mockCareer,
        season: { ...mockSeason, players: [activeIncomingPlayer] },
        initialTab: "arrivals",
      }),
    );

    expect(
      activeHook.current.arrivalTransfers.some(
        (t) => t.player.id === "p_cancelo_active",
      ),
    ).toBe(true);
    expect(
      activeHook.current.exitTransfers.some(
        (t) => t.player.id === "p_cancelo_active",
      ),
    ).toBe(false);

    // Ao encerrar o empréstimo de chegada
    const endedIncomingContract: Contract = {
      ...activeIncomingContract,
      leftClub: "Manchester City",
      dataExit: new Date("2027-06-30"),
    };
    const endedIncomingPlayer: Players = {
      ...activeIncomingPlayer,
      incomingLoan: false,
      sell: true,
      contract: [endedIncomingContract],
    };

    const { result: endedHook } = renderHook(() =>
      useManageClausesTransfers({
        career: mockCareer,
        season: { ...mockSeason, players: [endedIncomingPlayer] },
        initialTab: "exit",
      }),
    );

    expect(
      endedHook.current.arrivalTransfers.some(
        (t) => t.player.id === "p_cancelo_active",
      ),
    ).toBe(false);
    const movedExit = endedHook.current.exitTransfers.find(
      (t) => t.player.id === "p_cancelo_active",
    );
    expect(movedExit).toBeDefined();
    expect(movedExit?.loanOriginDirection).toBe("arrivals");

    render(
      <ManageClauses
        career={mockCareer}
        season={{ ...mockSeason, players: [endedIncomingPlayer] }}
        initialTab="exit"
        onClose={vi.fn()}
        onOpenScreen={vi.fn()}
      />,
    );

    const exitSlide = screen.getByTestId("clauses-tab-exit");
    expect(within(exitSlide).getByText("João Cancelo")).toBeDefined();
    expect(
      within(exitSlide).getByText("Investimento Máximo Projetado"),
    ).toBeDefined();

    fireEvent.click(within(exitSlide).getByTestId("btn-manage-clauses"));

    expect(
      screen.getByTestId("manage-arrival-loan-buy-option-card"),
    ).toBeDefined();
    expect(screen.getByText(/Acordo com Clube Cedente/i)).toBeDefined();

    fireEvent.click(screen.getByTestId("btn-exercise-arrival-loan-buy-option"));

    await waitFor(() => {
      expect(createProposalSpy).toHaveBeenCalledWith(
        "c_barca",
        "s_2026",
        expect.objectContaining({
          type: "compra",
          originLoanBuyOption: true,
          playerId: "p_cancelo_active",
        }),
      );
    });
  });

  it("empréstimo de saída ativo fica em Saídas; ao retornar ao FC Barcelona, sai de Saídas e vai para Chegadas mantendo 'Receita Máxima Projetada' e drawer de data", async () => {
    const exerciseSpy = vi
      .spyOn(PlayersContractService, "exerciseLoanBuyOption")
      .mockResolvedValue(undefined);

    const outgoingLoanContract: Contract = {
      isLoan: true,
      fromClub: "",
      leftClub: "Girona FC",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2026-07-01"),
      dataExit: new Date("2026-07-15"),
      loanDuration: 1,
      wagePercentage: 50,
      buyOptionValue: 12_000_000,
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 50,
        theirWagePercentage: 50,
        hasBuyOption: true,
        buyOptionFee: 12_000_000,
        partnerClub: "Girona FC",
      },
    };

    const activeOutgoingPlayer: Players = {
      ...ansuFati,
      id: "p_pau_victor_out",
      name: "Pau Víctor",
      loan: true,
      incomingLoan: false,
      sell: false,
      contract: [outgoingLoanContract],
    };

    const { result: activeHook } = renderHook(() =>
      useManageClausesTransfers({
        career: mockCareer,
        season: { ...mockSeason, players: [activeOutgoingPlayer] },
        initialTab: "exit",
      }),
    );

    expect(
      activeHook.current.exitTransfers.some(
        (t) => t.player.id === "p_pau_victor_out",
      ),
    ).toBe(true);
    expect(
      activeHook.current.arrivalTransfers.some(
        (t) => t.player.id === "p_pau_victor_out",
      ),
    ).toBe(false);

    // Ao encerrar empréstimo de saída com retorno ao FC Barcelona
    const returnContract: Contract = {
      buyValue: 0,
      sellValue: 0,
      fromClub: "Girona FC",
      leftClub: "",
      dataArrival: new Date("2027-06-30"),
      dataExit: null,
    };
    const returnedPlayer: Players = {
      ...activeOutgoingPlayer,
      loan: false,
      sell: false,
      contract: [outgoingLoanContract, returnContract],
    };

    const { result: returnedHook } = renderHook(() =>
      useManageClausesTransfers({
        career: mockCareer,
        season: { ...mockSeason, players: [returnedPlayer] },
        initialTab: "arrivals",
      }),
    );

    expect(
      returnedHook.current.exitTransfers.some(
        (t) => t.player.id === "p_pau_victor_out",
      ),
    ).toBe(false);
    const movedArrival = returnedHook.current.arrivalTransfers.find(
      (t) => t.player.id === "p_pau_victor_out",
    );
    expect(movedArrival).toBeDefined();
    expect(movedArrival?.loanOriginDirection).toBe("exit");
    expect(movedArrival?.contractIndex).toBe(0);

    render(
      <ManageClauses
        career={mockCareer}
        season={{ ...mockSeason, players: [returnedPlayer] }}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    const arrivalsSlide = screen.getByTestId("clauses-tab-arrivals");
    expect(within(arrivalsSlide).getByText("Pau Víctor")).toBeDefined();
    expect(
      within(arrivalsSlide).getByText("Receita Máxima Projetada"),
    ).toBeDefined();
    expect(
      within(arrivalsSlide).queryByRole("button", {
        name: /\+ Adicionar Cláusulas/i,
      }),
    ).toBeNull();
    expect(
      within(arrivalsSlide).queryByRole("button", { name: /^Editar$/i }),
    ).toBeNull();

    fireEvent.click(within(arrivalsSlide).getByTestId("btn-manage-clauses"));

    expect(screen.getByTestId("manage-loan-buy-option-card")).toBeDefined();
    expect(
      screen.queryByTestId("manage-arrival-loan-buy-option-card"),
    ).toBeNull();

    fireEvent.click(screen.getByTestId("btn-open-exercise-buy-option"));
    const dateInput = screen.getByTestId("loan-buy-option-date-input");
    fireEvent.change(dateInput, { target: { value: "01/07" } });
    fireEvent.click(screen.getByTestId("btn-confirm-exercise-buy-option"));

    await waitFor(() => {
      expect(exerciseSpy).toHaveBeenCalledWith(
        "c_barca",
        "s_2026",
        "p_pau_victor_out",
        0,
        "01/07",
      );
    });
  });
});
