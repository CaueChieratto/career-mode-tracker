// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, renderHook } from "@testing-library/react";
import { useManageClausesTransfers } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/hooks/useManageClausesTransfers";
import TransferClauseCard from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/TransferClauseCard";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { TransferItem } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/types";

describe("manageClausesExitLoansVisibility - Visibilidade de Empréstimos em Saídas (Padrão FC Barcelona)", () => {
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
});
