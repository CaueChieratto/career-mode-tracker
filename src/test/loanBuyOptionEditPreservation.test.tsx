// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { resolveTransferDisplayValue } from "../components/TransfersModal/components/TransfersPanel/helpers/resolveTransferDisplayValue";
import { buildTransferCopyText } from "../components/TransfersModal/components/TransfersPanel/utils/buildTransferCopyText";
import { transferEditRevertService } from "../common/services/ServicePlayers/contractServices/transferEditRevertService";
import { applyEditToCareer } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/helpers/transferCareerStateReducers";
import { reconcileSeasonFinancialEntries } from "../common/services/ServiceFinance/reconciliation";
import { getCareerById } from "../common/helpers/Getters";
import { isContractedArrivalTransfer } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/helpers/arrivalTransferFilter";
import ManageClauses from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses";

vi.mock("../common/services/Firebase", () => ({
  auth: { currentUser: { uid: "user_barca" } },
  db: {},
}));

vi.mock("../common/helpers/Getters", () => ({
  getCareerById: vi.fn(),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("firebase/firestore", () => ({
  setDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));

vi.mock("../common/services/ServiceMatches", () => ({
  ServiceMatches: {
    addTeamToSeason: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../common/services/ServiceFinance", () => ({
  ServiceFinance: {
    addEntry: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockReturnValue(Promise.resolve()),
    getReportBySeason: vi.fn().mockResolvedValue({ entries: [] }),
  },
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    getProposalsBySeason: vi.fn().mockResolvedValue([]),
    updateProposal: vi.fn().mockResolvedValue(undefined),
    createProposal: vi.fn().mockResolvedValue(undefined),
    listenProposals: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    colorSecundary: "#a50044",
  }),
}));

describe("loanBuyOptionEditPreservation (Padrão FC Barcelona)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const createMockCareer = (): { career: Career; season: ClubData; player: Players } => {
    const loanContract: Contract = {
      isLoan: true,
      fromClub: "Manchester City",
      leftClub: "",
      buyValue: 0,
      buyOptionValue: 36000000,
      sellValue: 0,
      dataArrival: new Date("2026-07-10"),
      dataExit: null,
      timing: "Imediata",
      salary: 150000,
      fullSalary: 150000,
      loanDuration: 1,
      wagePercentage: 100,
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 100,
        theirWagePercentage: 0,
        hasBuyOption: true,
        buyOptionFee: 36000000,
        buyOptionExercised: true,
        exercisedDate: "15/01/2027",
        partnerClub: "Manchester City",
      },
    };

    const purchaseContract: Contract = {
      isLoan: false,
      fromLoanBuyOption: true,
      fromClub: "Manchester City",
      leftClub: "",
      buyValue: 36000000,
      sellValue: 0,
      dataArrival: new Date("2027-01-15"),
      dataExit: null,
      timing: "Imediata",
      salary: 200000,
      fullSalary: 200000,
      contractTime: 4,
      contractUntil: "30/06/2030",
    };

    const player: Players = {
      id: "p_cancelo",
      name: "João Cancelo",
      position: "LD",
      shirtNumber: "2",
      overall: 86,
      age: 30,
      nation: "PRT",
      salary: 200000,
      contractTime: 4,
      contractUntil: "30/06/2030",
      playerValue: 36000000,
      buy: true,
      incomingLoan: false,
      loan: false,
      sell: false,
      ballonDor: 0,
      sector: "DEF",
      captain: false,
      statsLeagues: [],
      contract: [loanContract, purchaseContract],
    };

    const season: ClubData = {
      id: "s1",
      seasonNumber: 1,
      year: "2026/2027",
      players: [player],
      matches: [],
    } as unknown as ClubData;

    const career: Career = {
      id: "c_barca",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      teamBadge: "",
      nation: "ESP",
      currency: "EUR",
      createdAt: new Date("2026-07-01"),
      colorsTeams: ["#004d98", "#a50044"],
      trophies: [],
      clubData: [season],
    };

    return { career, season, player };
  };

  it("Teste 1: Edição do valor da opção de compra (buyOption) em empréstimo de chegada já exercido", async () => {
    const { career, season, player } = createMockCareer();
    vi.mocked(getCareerById).mockResolvedValue(career);

    // Executa persistência com novo valor da opção (40M)
    await transferEditRevertService.editTransferInSeason({
      careerId: career.id,
      seasonId: season.id,
      playerId: player.id,
      contractIndex: 0,
      direction: "arrivals",
      transferType: "Empréstimo",
      clubName: "Manchester City",
      transferValue: "0",
      date: "01/07",
      loanDuration: "1",
      wagePercentage: "100",
      buyOption: "40M",
      buyOptionValue: "40000000",
      salary: "150000",
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 100,
        theirWagePercentage: 0,
        hasBuyOption: true,
        buyOptionFee: 40000000,
        partnerClub: "Manchester City",
      },
    });

    // Asserções no jogador retornado pela persistência
    expect(player.buy).toBe(true);
    expect(player.incomingLoan).toBe(false);
    expect(player.contract![0].buyOptionValue).toBe(40000000);
    expect(player.contract![0].loanTerms?.buyOptionFee).toBe(40000000);
    expect(player.contract![0].loanTerms?.buyOptionExercised).toBe(true);
    expect(player.contract![1].buyValue).toBe(40000000);
    expect(player.contract![1].isLoan).toBe(false);
    expect(player.playerValue).toBe(40000000);

    // Executa reducer de estado em memória
    const updatedCareer = applyEditToCareer(
      career,
      season.id,
      player.id,
      0,
      "arrivals",
      {
        clubName: "Manchester City",
        transferValue: 0,
        transferType: "Empréstimo",
        date: new Date("2026-07-01"),
        loanDuration: 1,
        wagePercentage: 100,
        buyOptionValue: 40000000,
        buyOption: "40M",
        salary: 150000,
      },
    );

    const memPlayer = updatedCareer.clubData[0].players.find((p) => p.id === player.id)!;
    expect(memPlayer.buy).toBe(true);
    expect(memPlayer.incomingLoan).toBe(false);
    expect(memPlayer.contract![0].buyOptionValue).toBe(40000000);
    expect(memPlayer.contract![0].loanTerms?.buyOptionExercised).toBe(true);
    expect(memPlayer.contract![1].buyValue).toBe(40000000);
    expect(memPlayer.contract![1].isLoan).toBe(false);
    expect(memPlayer.playerValue).toBe(40000000);

    // Resolução visual no TransfersPanel
    const displayContract0 = resolveTransferDisplayValue({
      player: memPlayer,
      contract: memPlayer.contract![0],
      contractIndex: 0,
      direction: "arrivals",
      currency: "EUR",
      career,
      season,
      value: Number(memPlayer.contract![0].buyValue),
    });
    const displayContract1 = resolveTransferDisplayValue({
      player: memPlayer,
      contract: memPlayer.contract![1],
      contractIndex: 1,
      direction: "arrivals",
      currency: "EUR",
      career,
      season,
      value: Number(memPlayer.contract![1].buyValue),
    });

    expect(displayContract0).toBe("Empréstimo");
    expect(displayContract1).toBe("€40M");
  });

  it("Teste 2: Edição de outro campo (salário/data) do empréstimo mantendo valor inalterado não corrompe salário nem exibição", async () => {
    const { career, season, player } = createMockCareer();
    vi.mocked(getCareerById).mockResolvedValue(career);

    // Editar empréstimo alterando data e salário do empréstimo
    await transferEditRevertService.editTransferInSeason({
      careerId: career.id,
      seasonId: season.id,
      playerId: player.id,
      contractIndex: 0,
      direction: "arrivals",
      transferType: "Empréstimo",
      clubName: "Manchester City",
      transferValue: "0",
      date: "05/07",
      loanDuration: "1",
      wagePercentage: "100",
      buyOption: "36M",
      buyOptionValue: "36000000",
      salary: "140000",
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 100,
        theirWagePercentage: 0,
        hasBuyOption: true,
        buyOptionFee: 36000000,
        partnerClub: "Manchester City",
      },
    });

    // Salário do contrato definitivo e salário do jogador permanecem 200k
    expect(player.salary).toBe(200000);
    expect(player.contract![1].salary).toBe(200000);
    expect(player.contract![0].salary).toBe(140000);

    // TransfersPanel exibe 'Empréstimo' para contract[0] e '€36M' para contract[1]
    const displayContract0 = resolveTransferDisplayValue({
      player,
      contract: player.contract![0],
      contractIndex: 0,
      direction: "arrivals",
      currency: "EUR",
      career,
      season,
      value: Number(player.contract![0].buyValue),
    });
    const displayContract1 = resolveTransferDisplayValue({
      player,
      contract: player.contract![1],
      contractIndex: 1,
      direction: "arrivals",
      currency: "EUR",
      career,
      season,
      value: Number(player.contract![1].buyValue),
    });

    expect(displayContract0).toBe("Empréstimo");
    expect(displayContract1).toBe("€36M");

    // buildTransferCopyText
    const copyContract0 = buildTransferCopyText({
      player,
      contract: player.contract![0],
      direction: "arrivals",
      currency: "EUR",
      career,
      season,
    });
    const copyContract1 = buildTransferCopyText({
      player,
      contract: player.contract![1],
      direction: "arrivals",
      currency: "EUR",
      career,
      season,
    });

    expect(copyContract0).toContain("por empréstimo");
    expect(copyContract1).toContain("36 milhões de euros");
    expect(copyContract1).not.toContain("por empréstimo");
  });

  it("Teste 3: Edição de empréstimo de saída (Emprestar) com opção de compra já exercida no applyEditToCareer", () => {
    const { career, season } = createMockCareer();

    const exitLoanContract: Contract = {
      isLoan: true,
      fromClub: "",
      leftClub: "Brighton & Hove Albion",
      buyValue: 0,
      sellValue: 0,
      buyOptionValue: 25000000,
      dataArrival: null,
      dataExit: new Date("2026-07-10"),
      timing: "Imediata",
      loanDuration: 1,
      wagePercentage: 100,
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 0,
        theirWagePercentage: 100,
        hasBuyOption: true,
        buyOptionFee: 25000000,
        buyOptionExercised: true,
        partnerClub: "Brighton & Hove Albion",
      },
    };

    const exitSaleContract: Contract = {
      isLoan: false,
      fromLoanBuyOption: true,
      fromClub: "",
      leftClub: "Brighton & Hove Albion",
      buyValue: 0,
      sellValue: 25000000,
      dataArrival: null,
      dataExit: new Date("2027-01-20"),
      timing: "Imediata",
    };

    const exitPlayer: Players = {
      id: "p_ansu",
      name: "Ansu Fati",
      position: "PE",
      overall: 81,
      age: 23,
      nation: "ESP",
      buy: false,
      incomingLoan: false,
      loan: false,
      sell: true,
      ballonDor: 0,
      sector: "ATA",
      shirtNumber: "10",
      captain: false,
      statsLeagues: [],
      contract: [exitLoanContract, exitSaleContract],
    };

    career.clubData[0].players = [exitPlayer];

    const updatedCareer = applyEditToCareer(
      career,
      season.id,
      exitPlayer.id,
      0,
      "exit",
      {
        clubName: "Brighton & Hove Albion",
        transferValue: 0,
        transferType: "Emprestar",
        date: new Date("2026-07-10"),
        loanDuration: 1,
        buyOptionValue: 30000000,
        buyOption: "30M",
      },
    );

    const memPlayer = updatedCareer.clubData[0].players.find((p) => p.id === exitPlayer.id)!;
    expect(memPlayer.sell).toBe(true);
    expect(memPlayer.loan).toBe(false);
    expect(memPlayer.contract![0].loanTerms?.buyOptionExercised).toBe(true);
    expect(memPlayer.contract![1].sellValue).toBe(30000000);

    const displayExit0 = resolveTransferDisplayValue({
      player: memPlayer,
      contract: memPlayer.contract![0],
      contractIndex: 0,
      direction: "exit",
      currency: "EUR",
      career,
      season,
      value: memPlayer.contract![0].sellValue,
    });
    const displayExit1 = resolveTransferDisplayValue({
      player: memPlayer,
      contract: memPlayer.contract![1],
      contractIndex: 1,
      direction: "exit",
      currency: "EUR",
      career,
      season,
      value: memPlayer.contract![1].sellValue,
    });

    expect(displayExit0).toBe("Empréstimo");
    expect(displayExit1).toBe("€30M");
  });

  it("Teste 4: Reconciliação financeira gera despesa de compra de contract[1] e não a ignora como empréstimo", () => {
    const { season } = createMockCareer();

    const entries = reconcileSeasonFinancialEntries(season);

    const purchaseEntry = entries.find((e) => e.id === "transfer_buy_p_cancelo_1");
    expect(purchaseEntry).toBeDefined();
    expect(purchaseEntry?.amount).toBe(36000000);
    expect(purchaseEntry?.type).toBe("expense");

    // contract[0] (empréstimo de 0 euros) não gera despesa
    const loanEntry = entries.find((e) => e.id === "transfer_buy_p_cancelo_0");
    expect(loanEntry).toBeUndefined();
  });

  it("Teste 5: Renderização completa no TransfersPanel exibe uma linha de Empréstimo e uma linha de €36M", () => {
    const { career, season, player } = createMockCareer();

    render(
      <TransfersPanel
        title="Chegadas"
        transferType="arrivals"
        players={[player]}
        currency="EUR"
        career={career}
        season={season}
      />,
    );

    // Na tabela de transferências, deve haver uma linha com "Empréstimo" e uma com "€36M"
    expect(screen.getByText("Empréstimo")).toBeDefined();
    expect(screen.getByText("€36M")).toBeDefined();

    // Ambas as linhas devem conter "J. Cancelo"
    const canceloNames = screen.getAllByText("J. Cancelo");
    expect(canceloNames.length).toBe(2);
  });

  it("Teste 6: isContractedArrivalTransfer aceita compra vinda de opção de compra (fromLoanBuyOption: true sem leftClub) e recusa saídas", () => {
    const { career, player } = createMockCareer();
    const purchaseContract = player.contract![1];

    // Contrato de compra decorrente de empréstimo (fromLoanBuyOption: true, sem leftClub)
    const isArrival = isContractedArrivalTransfer(
      player,
      purchaseContract,
      1,
      career,
      1,
    );
    expect(isArrival).toBe(true);

    // Contrato de saída decorrente de empréstimo (fromLoanBuyOption: true, com leftClub)
    const exitSaleContract: Contract = {
      ...purchaseContract,
      leftClub: "Girona",
      sellValue: 30000000,
      buyValue: 0,
    };
    const isArrivalForExit = isContractedArrivalTransfer(
      player,
      exitSaleContract,
      1,
      career,
      1,
    );
    expect(isArrivalForExit).toBe(false);
  });

  it("Teste 7: Na tela de Cláusulas (ManageClauses), o card da compra permanece visível na aba Chegadas após editar o empréstimo já exercido", async () => {
    const { career, season, player } = createMockCareer();
    vi.mocked(getCareerById).mockResolvedValue(career);

    // 1. Edita o empréstimo exercido alterando a taxa para 40M
    await transferEditRevertService.editTransferInSeason({
      careerId: career.id,
      seasonId: season.id,
      playerId: player.id,
      contractIndex: 0,
      direction: "arrivals",
      transferType: "Empréstimo",
      wagePercentage: "100",
      loanDuration: "1",
      buyOption: "40M",
      clubName: "Manchester City",
      date: "10/07",
      salary: 160000,
    });

    const updatedSeason = career.clubData[0];
    const updatedPlayer = updatedSeason.players[0];

    // O jogador possui dois contratos: o empréstimo e a compra atualizada
    expect(updatedPlayer.contract?.length).toBe(2);
    expect(updatedPlayer.contract![1].buyValue).toBe(40000000);
    expect(updatedPlayer.contract![1].fromLoanBuyOption).toBe(true);

    // 2. Renderiza ManageClauses na aba "Chegadas"
    render(
      <MemoryRouter>
        <ManageClauses
          career={career}
          season={updatedSeason}
          initialTab="arrivals"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Na aba Chegadas, devem existir dois cards de João Cancelo:
    // 1) O card do empréstimo ("Empréstimo")
    // 2) O card da compra ("Chegada") que antes sumia!
    const playerHeaders = screen.getAllByText("João Cancelo");
    expect(playerHeaders.length).toBe(2);

    expect(screen.getByText("Empréstimo")).toBeDefined();
    expect(screen.getByText("Chegada")).toBeDefined();
    expect(screen.getAllByText("€40M").length).toBeGreaterThan(0);
  });

  it("Teste 8: Edição de empréstimo de chegada já exercido com novo valor de compra e nova taxa de revenda (sellOnPercentage)", async () => {
    const { career, season, player } = createMockCareer();
    vi.mocked(getCareerById).mockResolvedValue(career);

    // Edita o empréstimo exercido alterando buyOption para 45M e taxa de revenda para 20%
    await transferEditRevertService.editTransferInSeason({
      careerId: career.id,
      seasonId: season.id,
      playerId: player.id,
      contractIndex: 0,
      direction: "arrivals",
      transferType: "Empréstimo",
      clubName: "Manchester City",
      transferValue: "0",
      date: "01/07",
      loanDuration: "1",
      wagePercentage: "100",
      buyOption: "45M",
      buyOptionValue: "45000000",
      salary: "150000",
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 100,
        theirWagePercentage: 0,
        hasBuyOption: true,
        buyOptionFee: 45000000,
        sellOnPercentage: 20,
        partnerClub: "Manchester City",
      },
    });

    // 1. Verifica contrato de empréstimo (índice 0)
    expect(player.contract![0].buyOptionValue).toBe(45000000);
    expect(player.contract![0].loanTerms?.buyOptionFee).toBe(45000000);
    expect(player.contract![0].loanTerms?.sellOnPercentage).toBe(20);

    // 2. Verifica contrato definitivo de compra derivada (índice 1)
    expect(player.contract![1].buyValue).toBe(45000000);
    expect(player.contract![1].transferClauses?.sellOnPercentage).toBe(20);
    expect(player.playerValue).toBe(45000000);

    // 3. Testa no reducer applyEditToCareer
    const updatedCareer = applyEditToCareer(
      career,
      season.id,
      player.id,
      0,
      "arrivals",
      {
        clubName: "Manchester City",
        transferValue: 0,
        transferType: "Empréstimo",
        date: new Date("2026-07-01"),
        loanDuration: 1,
        wagePercentage: 100,
        buyOptionValue: 45000000,
        buyOption: "45M",
        salary: 150000,
        loanTerms: {
          durationYears: 1,
          ourWagePercentage: 100,
          theirWagePercentage: 0,
          hasBuyOption: true,
          buyOptionFee: 45000000,
          sellOnPercentage: 20,
          partnerClub: "Manchester City",
        },
      },
    );

    const memPlayer = updatedCareer.clubData[0].players.find((p) => p.id === player.id)!;
    expect(memPlayer.contract![0].buyOptionValue).toBe(45000000);
    expect(memPlayer.contract![0].loanTerms?.sellOnPercentage).toBe(20);
    expect(memPlayer.contract![1].buyValue).toBe(45000000);
    expect(memPlayer.contract![1].transferClauses?.sellOnPercentage).toBe(20);
    expect(memPlayer.playerValue).toBe(45000000);
  });
});
