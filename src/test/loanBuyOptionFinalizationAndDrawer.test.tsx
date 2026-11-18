// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ClauseOperationalManageView } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ClauseOperationalManageView";
import { ClauseInlineEditView } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ClauseInlineEditView";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";
import { TransferItem } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/types";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import {
  getCurrencySymbol,
  formatDisplayValue,
} from "../common/utils/FormatValue";
import { transferEditRevertService } from "../common/services/ServicePlayers/contractServices/transferEditRevertService";
import { buildSaleClausesSections } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import { setDoc } from "firebase/firestore";

// Mock do Firebase Auth e Firestore para testes unitários
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

vi.mock(
  "../common/services/ServiceMatches",
  () => ({
    ServiceMatches: {
      addTeamToSeason: vi.fn().mockResolvedValue(undefined),
    },
  }),
);

vi.mock("../common/services/ServiceFinance", () => ({
  ServiceFinance: {
    deleteEntry: vi.fn(() => Promise.resolve()),
    addEntry: vi.fn(() => Promise.resolve()),
    getReportBySeason: vi.fn(() => Promise.resolve({ entries: [] })),
  },
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    getProposalsBySeason: vi.fn(() => Promise.resolve([])),
    updateProposal: vi.fn(() => Promise.resolve()),
    createProposal: vi.fn(() => Promise.resolve()),
  },
}));

describe("loanBuyOptionFinalizationAndDrawer (Padrão FC Barcelona)", () => {
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
    currency: "USD", // Testando com USD para garantir que exibe sempre o símbolo "$"
    createdAt: new Date("2026-07-01"),
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    clubData: [],
  };

  const loanContractExercised: Contract = {
    isLoan: true,
    fromClub: "Girona FC",
    leftClub: "",
    buyValue: 0,
    sellValue: 0,
    dataArrival: new Date("2026-07-15"),
    dataExit: null,
    timing: "Imediata",
    salary: 25000,
    fullSalary: 50000,
    loanDuration: 1,
    wagePercentage: 50,
    loanTerms: {
      durationYears: 1,
      ourWagePercentage: 50,
      theirWagePercentage: 50,
      hasBuyOption: true,
      buyOptionFee: 3000000,
      sellOnPercentage: 15,
      partnerClub: "Girona FC",
      buyOptionExercised: true,
      exercisedDate: "15/07",
    },
  };

  const purchaseContractFromLoan: Contract = {
    isLoan: false,
    fromClub: "Girona FC",
    leftClub: "",
    buyValue: 3000000,
    sellValue: 0,
    dataArrival: new Date("2026-07-20"),
    dataExit: null,
    timing: "Imediata",
    salary: 60000,
    contractTime: 4,
    fromLoanBuyOption: true,
    transferClauses: {
      sellOnPercentage: 15,
    },
    contractDetails: {
      weeklyWage: 60000,
      durationYears: 4,
      signingBonus: 500000,
      releaseClause: 100000000,
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
    buy: true,
    sell: false,
    captain: false,
    incomingLoan: false,
    contract: [loanContractExercised, purchaseContractFromLoan],
    ballonDor: 0,
    statsLeagues: [],
  };

  it("1. Não permite exercer opção de compra mais de 1 vez: oculta botão e exibe badge de já exercida", () => {
    const exercisedLoanItem: TransferItem = {
      player: pauVictorPlayer,
      contract: loanContractExercised,
      contractIndex: 0,
      direction: "arrivals",
      cardKey: "p_pau_victor_0_arrivals",
    };

    render(
      <ClauseOperationalManageView
        career={mockCareer}
        activeTransferItem={exercisedLoanItem}
        isLoading={false}
        cancelInline={vi.fn()}
        sellOnActiveCardKey={null}
        setSellOnActiveCardKey={vi.fn()}
        sellOnTotalInput=""
        setSellOnTotalInput={vi.fn()}
        sellOnDateInput="01/07"
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
        onOpenScreen={vi.fn()}
      />,
    );

    // O botão de exercer NÃO deve existir
    expect(
      screen.queryByTestId("btn-exercise-arrival-loan-buy-option"),
    ).toBeNull();

    // Deve exibir o badge de opção de compra já exercida
    expect(
      screen.getByTestId("arrival-loan-buy-option-exercised-badge"),
    ).toBeDefined();
    expect(screen.getByText("Opção de Compra Já Exercida")).toBeDefined();
  });

  it("2. Ao editar a transferência resultante de opção de compra (fromLoanBuyOption), exibe apenas os 3 módulos dos Termos do Atleta", () => {
    const buyItem: TransferItem = {
      player: pauVictorPlayer,
      contract: purchaseContractFromLoan,
      contractIndex: 1,
      direction: "arrivals",
      cardKey: "p_pau_victor_1_arrivals",
    };

    const handleOpenSectionDrawer = vi.fn();
    const handleSaveInline = vi.fn();

    render(
      <ClauseInlineEditView
        career={mockCareer}
        activeTransferItem={buyItem}
        editingBooleans={{
          isRetirement: false,
          isEndContract: false,
          isReturnLoan: false,
          hasInstallments: false,
          hasPlayerSwap: false,
          hasBonus: false,
          hasOtherClauses: false,
          firstRefusal: false,
        }}
        editingValues={{
          salary: "60k",
          contractTime: "4",
          contractUntil: "30/06/2030",
          signingBonus: "500k",
          releaseClause: "100M",
        }}
        editingBonuses={[]}
        editingBonusItemIndex={null}
        activeSectionDrawer={null}
        isLoading={false}
        clubColor="#004d98"
        mergedFormValues={{
          salary: "60k",
          contractTime: "4",
          contractUntil: "30/06/2030",
          signingBonus: "500k",
          releaseClause: "100M",
        }}
        renewalContractSection={{
          title: "Informações do Contrato",
          rows: [],
        }}
        clausesSections={buildSaleClausesSections({
          isRetirement: false,
          isEndContract: false,
          isReturnLoan: false,
          hasInstallments: false,
          hasPlayerSwap: false,
          hasBonus: false,
          hasOtherClauses: false,
          firstRefusal: false,
        })}
        renewalBonusSection={{ title: "Bônus & Metas", rows: [] }}
        renewalSpecialClausesSection={{
          title: "Cláusulas Especiais",
          rows: [],
        }}
        handleOpenSectionDrawer={handleOpenSectionDrawer}
        handleCancelSectionDrawer={vi.fn()}
        handleSaveInline={handleSaveInline}
        cancelInline={vi.fn()}
        handleCustomInputChange={vi.fn()}
        handleBooleanChangeWrapper={vi.fn()}
        handleAddOrEditBonus={vi.fn()}
        handleEditBonus={vi.fn()}
        handleDeleteBonus={vi.fn()}
      />,
    );

    // Deve exibir o badge de 3 módulos operacionais
    expect(
      screen.getByText("3 Módulos Operacionais (Termos do Atleta)"),
    ).toBeDefined();

    // Card 1: Informações do Contrato
    const contractInfoCard = screen.getByTestId("modular-card-contract-info");
    expect(contractInfoCard).toBeDefined();

    // Clicar em Informações do Contrato abre o drawer lateral
    fireEvent.click(contractInfoCard);
    expect(handleOpenSectionDrawer).toHaveBeenCalledWith("contract");

    // NÃO deve renderizar cards do clube (Parcelamento, Atleta de Troca, etc.)
    expect(screen.queryByText("1. Parcelamento")).toBeNull();
    expect(screen.queryByText("2. Atleta de Troca")).toBeNull();
  });

  it("3. No TransfersPanel, transferências e propostas com opção de compra de empréstimo não são clicáveis/editáveis", () => {
    const onOpenScreen = vi.fn();
    const onTransferClick = vi.fn();

    const mockSeason: ClubData = {
      id: "s_2026",
      seasonNumber: 1,
      year: "2026/2027",
      clubName: "FC Barcelona",
      players: [pauVictorPlayer],
      table: [],
      matches: [],
    } as unknown as ClubData;

    const mockProposalOriginLoan: TransferProposal = {
      id: "prop_loan_buy_1",
      careerId: mockCareer.id,
      seasonId: mockSeason.id,
      type: "compra",
      overallStatus: "em_andamento",
      timing: "Imediata",
      originLoanBuyOption: true,
      playerName: "Pau Víctor",
      playerId: pauVictorPlayer.id,
      playerOverall: 78,
      playerValue: 3000000,
      playerNation: "ESP",
      playerPosition: "ATA",
      playerSector: "Ataque",
      clubNegotiation: {
        status: "aceita",
        partnerClub: "Girona FC",
        transferFee: 3000000,
      },
    };

    render(
      <TransfersPanel
        career={mockCareer}
        season={mockSeason}
        players={[pauVictorPlayer]}
        transferType="arrivals"
        onOpenScreen={onOpenScreen}
        onTransferClick={onTransferClick}
        proposals={[mockProposalOriginLoan]}
      />,
    );

    // Proposta originada da opção de compra de empréstimo
    const proposalItem = screen.getByTestId(
      "transfers-panel-proposal-prop_loan_buy_1",
    );
    expect(proposalItem).toBeDefined();
    expect(proposalItem.style.cursor).toBe("default");

    fireEvent.click(proposalItem);
    // Não deve chamar onOpenScreen ao clicar na proposta originada de opção de compra
    expect(onOpenScreen).not.toHaveBeenCalled();

    // Transferência finalizada fromLoanBuyOption: deve estar presente na lista, mas sem cursor pointer
    const transferItems = screen.getAllByRole("listitem");
    // O item da compra concluída deve ter cursor default
    const purchaseTransferItem = transferItems.find(
      (item) =>
        item.textContent?.includes("Víctor") &&
        item.textContent?.includes("De: Girona FC") &&
        item.textContent?.includes("$3M"),
    );
    expect(purchaseTransferItem).toBeDefined();
    expect(purchaseTransferItem?.style.cursor).toBe("default");
  });

  it("4. Garante que getCurrencySymbol sempre resolve para o símbolo e nunca para 'USD'", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("GBP")).toBe("£");
    expect(getCurrencySymbol("BRL")).toBe("R$");
    expect(getCurrencySymbol("$")).toBe("$");
    expect(getCurrencySymbol("€")).toBe("€");

    // formatDisplayValue com USD usa o símbolo "$"
    expect(formatDisplayValue(5000000, "USD")).toBe("$5M");
    expect(formatDisplayValue(50000, "USD")).toBe("$50k");
  });

  it("5. Ao editar a opção de compra ou % de revenda na tela de empréstimo, sincroniza o contrato de compra gerado", async () => {
    const loanContractWithExercised: Contract = {
      ...loanContractExercised,
      fromClub: "Girona FC",
      loanTerms: {
        ...loanContractExercised.loanTerms!,
        hasBuyOption: true,
        buyOptionFee: 3000000,
        sellOnPercentage: 15,
        buyOptionExercised: true,
      },
    };

    const purchaseContract: Contract = {
      ...purchaseContractFromLoan,
      fromClub: "Girona FC",
      buyValue: 3000000,
      fromLoanBuyOption: true,
      transferClauses: {
        sellOnPercentage: 15,
      },
    };

    const testPlayer: Players = {
      ...pauVictorPlayer,
      contract: [loanContractWithExercised, purchaseContract],
    };

    const mockSeason: ClubData = {
      id: "s_2026",
      seasonNumber: 1,
      year: "2026/2027",
      clubName: "FC Barcelona",
      players: [testPlayer],
      table: [],
      matches: [],
    } as unknown as ClubData;

    const fullCareer: Career = {
      ...mockCareer,
      clubData: [mockSeason],
    };

    const inProgressBuyOptionProposal: TransferProposal = {
      id: "prop_pau_victor_buy",
      careerId: mockCareer.id,
      seasonId: mockSeason.id,
      type: "compra",
      overallStatus: "em_andamento",
      playerId: testPlayer.id,
      playerName: testPlayer.name,
      playerNation: testPlayer.nation,
      playerPosition: testPlayer.position,
      playerSector: testPlayer.sector,
      originLoanBuyOption: true,
      clubNegotiation: {
        status: "aceita",
        partnerClub: "Girona FC",
        transferFee: 3000000,
      },
    };

    const loanProposal: TransferProposal = {
      id: "prop_pau_victor_loan",
      careerId: mockCareer.id,
      seasonId: mockSeason.id,
      type: "emprestimo_entrada",
      overallStatus: "concluida",
      playerId: testPlayer.id,
      playerName: testPlayer.name,
      playerNation: testPlayer.nation,
      playerPosition: testPlayer.position,
      playerSector: testPlayer.sector,
      clubNegotiation: {
        status: "aceita",
        partnerClub: "Girona FC",
        loanTerms: {
          durationYears: 1,
          ourWagePercentage: 50,
          theirWagePercentage: 50,
          hasBuyOption: true,
          buyOptionFee: 3000000,
        },
      },
    };

    const { getCareerById } = await import("../common/helpers/Getters");
    const { ServiceProposals } = await import("../common/services/ServiceProposals");
    vi.mocked(getCareerById).mockResolvedValue(fullCareer);
    vi.mocked(setDoc).mockResolvedValue(undefined);
    vi.mocked(ServiceProposals.getProposalsBySeason).mockResolvedValue([
      inProgressBuyOptionProposal,
      loanProposal,
    ]);
    vi.mocked(ServiceProposals.updateProposal).mockResolvedValue(undefined);

    await transferEditRevertService.editTransferInSeason({
      careerId: mockCareer.id,
      seasonId: mockSeason.id,
      playerId: testPlayer.id,
      contractIndex: 0,
      direction: "arrivals",
      transferType: "Empréstimo",
      clubName: "Girona FC Updated",
      date: "15/07",
      buyOption: "4M",
      loanDuration: "1",
      wagePercentage: "50",
      salary: "50k",
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 50,
        theirWagePercentage: 50,
        hasBuyOption: true,
        buyOptionFee: 4000000,
        sellOnPercentage: 20,
        partnerClub: "Girona FC Updated",
      },
    });

    const updatedPurchaseContract = testPlayer.contract?.find(
      (c) => c.fromLoanBuyOption,
    );
    expect(updatedPurchaseContract).toBeDefined();
    expect(updatedPurchaseContract?.buyValue).toBe(4000000);
    expect(updatedPurchaseContract?.fromClub).toBe("Girona FC Updated");
    expect(updatedPurchaseContract?.transferClauses?.sellOnPercentage).toBe(20);

    // Deve atualizar o valor da opção e a taxa de revenda na proposta de compra em andamento
    expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
      mockCareer.id,
      mockSeason.id,
      "prop_pau_victor_buy",
      expect.objectContaining({
        clubNegotiation: expect.objectContaining({
          transferFee: 4000000,
          sellOnPercentage: 20,
        }),
        originLoanBuyOption: true,
      }),
    );

    // Deve atualizar o valor da opção e a revenda na proposta de empréstimo
    expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
      mockCareer.id,
      mockSeason.id,
      "prop_pau_victor_loan",
      expect.objectContaining({
        clubNegotiation: expect.objectContaining({
          loanTerms: expect.objectContaining({
            buyOptionFee: 4000000,
            sellOnPercentage: 20,
          }),
        }),
      }),
    );
  });

  it("ao reverter transferência, reabre a proposta para 'em_andamento' (Pendente) e reseta buyOptionExercised do empréstimo", async () => {
    const loanContractWithExercised: Contract = {
      isLoan: true,
      fromClub: "Girona FC",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2026-07-15"),
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 50,
        theirWagePercentage: 50,
        hasBuyOption: true,
        buyOptionFee: 3000000,
        partnerClub: "Girona FC",
        buyOptionExercised: true,
        exercisedDate: "15/07",
      },
    };

    const purchaseContract: Contract = {
      isLoan: false,
      fromClub: "Girona FC",
      leftClub: "",
      buyValue: 3000000,
      sellValue: 0,
      dataArrival: new Date("2026-07-15"),
      fromLoanBuyOption: true,
    };

    const testPlayer: Players = {
      ...pauVictorPlayer,
      contract: [loanContractWithExercised, purchaseContract],
    };

    const mockSeason: ClubData = {
      id: "s_2026",
      seasonNumber: 1,
      year: "2026/2027",
      clubName: "FC Barcelona",
      players: [testPlayer],
      table: [],
      matches: [],
    } as unknown as ClubData;

    const fullCareer: Career = {
      ...mockCareer,
      clubData: [mockSeason],
    };

    const mockCompletedProposal: TransferProposal = {
      id: "prop_pau_victor_1",
      careerId: mockCareer.id,
      seasonId: mockSeason.id,
      type: "compra",
      overallStatus: "concluida",
      playerId: testPlayer.id,
      playerName: testPlayer.name,
      playerNation: testPlayer.nation,
      playerPosition: testPlayer.position,
      playerSector: testPlayer.sector,
      originLoanBuyOption: true,
      finalizedAt: 1234567,
      clubNegotiation: {
        status: "aceita",
        partnerClub: "Girona FC",
        transferFee: 3000000,
      },
    };

    const { getCareerById } = await import("../common/helpers/Getters");
    const { ServiceProposals } = await import("../common/services/ServiceProposals");
    vi.mocked(getCareerById).mockResolvedValue(fullCareer);
    vi.mocked(setDoc).mockResolvedValue(undefined);
    vi.mocked(ServiceProposals.getProposalsBySeason).mockResolvedValue([mockCompletedProposal]);
    vi.mocked(ServiceProposals.updateProposal).mockResolvedValue(undefined);

    await transferEditRevertService.revertTransferInSeason({
      careerId: mockCareer.id,
      seasonId: mockSeason.id,
      playerId: testPlayer.id,
      contractIndex: 1, // Revertendo o contrato de compra exercido
      direction: "arrivals",
    });

    // 1. O contrato de compra deve ter sido removido e o empréstimo restante deve ter buyOptionExercised resetado para false
    expect(testPlayer.contract?.length).toBe(1);
    expect(testPlayer.contract?.[0].loanTerms?.buyOptionExercised).toBe(false);
    expect(testPlayer.contract?.[0].loanTerms?.exercisedDate).toBeUndefined();

    // 2. A proposta associada deve ter sido atualizada para 'em_andamento' (Pendente)
    expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
      mockCareer.id,
      mockSeason.id,
      "prop_pau_victor_1",
      expect.objectContaining({
        overallStatus: "em_andamento",
      }),
    );
  });

  it("getAddTransferPlayerFields inclui a seção de Manutenção com 'Desfazer essa transferência?' quando isEditTransfer é true", async () => {
    const { getAddTransferPlayerFields } = await import(
      "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer/constants/transferFormFields"
    );

    const sections = getAddTransferPlayerFields(
      "ESP",
      "Compra",
      ["Girona FC"],
      {},
      [],
      undefined,
      true, // isEditTransfer
    );

    const maintenanceSection = sections.find((s) => s.title === "Manutenção");
    expect(maintenanceSection).toBeDefined();
    expect(maintenanceSection?.fields[0][0].name).toBe("Desfazer essa transferência?");
    expect(maintenanceSection?.fields[0][0].id).toBe("revertTransfer");
  });
});
