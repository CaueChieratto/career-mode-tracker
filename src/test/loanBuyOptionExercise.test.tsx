// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ClauseOperationalManageView } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ClauseOperationalManageView";
import TransferClauseCard from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/TransferClauseCard";
import ProposalClauseCard from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ProposalClauseCard";
import { TransferItem } from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/types";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import {
  getContractBuyOptionFee,
  hasDefinedLoanBuyOption,
} from "../common/services/ServicePlayers/helpers/contractHelpers";

describe("loanBuyOptionExercise (Padrão FC Barcelona)", () => {
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
    dataExit: null,
    timing: "Imediata",
    loanTerms: {
      durationYears: 1,
      ourWagePercentage: 60,
      theirWagePercentage: 40,
      hasBuyOption: true,
      buyOptionFee: 3000000,
      sellOnPercentage: 15,
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

  const arrivalLoanItem: TransferItem = {
    player: pauVictorPlayer,
    contract: pauVictorContract,
    contractIndex: 0,
    direction: "arrivals",
    cardKey: "p_pau_victor_0_arrivals",
  };

  it("exibe exclusivamente o bloco de opção de compra de chegada em ClauseOperationalManageView", () => {
    const onOpenScreen = vi.fn();
    const handleExerciseArrivalLoanBuyOption = vi.fn();

    render(
      <ClauseOperationalManageView
        career={mockCareer}
        activeTransferItem={arrivalLoanItem}
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
        handleExerciseArrivalLoanBuyOption={handleExerciseArrivalLoanBuyOption}
        onOpenScreen={onOpenScreen}
      />,
    );

    // O card de opção de compra de chegada deve estar presente
    const arrivalCard = screen.getByTestId("manage-arrival-loan-buy-option-card");
    expect(arrivalCard).toBeDefined();
    expect(screen.getByText("Opção de Compra Fixada")).toBeDefined();
    expect(screen.getByText(/Girona FC/i)).toBeDefined();
    expect(screen.getByText(/15/)).toBeDefined();

    // Botão de exercer opção de compra
    const exerciseBtn = screen.getByTestId("btn-exercise-arrival-loan-buy-option");
    expect(exerciseBtn).toBeDefined();

    fireEvent.click(exerciseBtn);
    expect(handleExerciseArrivalLoanBuyOption).toHaveBeenCalledWith(arrivalLoanItem);

    // Blocos operacionais de saídas ou outros fluxos NÃO devem ser renderizados
    expect(screen.queryByTestId("manage-loan-buy-option-card")).toBeNull();
    expect(screen.queryByTestId("manage-special-agreements-card")).toBeNull();
    expect(screen.queryByTestId("manage-release-clause-card")).toBeNull();
  });

  it("calcula Investimento Máximo Projetado com salário anual (salary * 52) e adiciona valor da opção se exercida", () => {
    const mockSeason: ClubData = {
      id: "s_2026",
      seasonNumber: 1,
      year: "2026/2027",
      clubName: "FC Barcelona",
      players: [],
      table: [],
      matches: [],
    } as unknown as ClubData;

    // Cenário 1: Empréstimo sem opção de compra exercida
    // Salário semanal = 20.000 -> 20.000 * 52 = 1.040.000 (€1.04M)
    const unexercisedContract: Contract = {
      ...pauVictorContract,
      salary: 20000,
      loanTerms: {
        ...pauVictorContract.loanTerms!,
        buyOptionExercised: false,
      },
      transferClauses: {
        sellOnPercentage: 15,
      },
    };

    const unexercisedItem: TransferItem = {
      player: { ...pauVictorPlayer, contract: [unexercisedContract] },
      contract: unexercisedContract,
      contractIndex: 0,
      direction: "arrivals",
      cardKey: "p_pau_victor_0_arrivals",
    };

    const { rerender } = render(
      <TransferClauseCard
        item={unexercisedItem}
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

    expect(screen.getByText("Investimento Máximo Projetado")).toBeDefined();
    // 20.000 * 52 = 1.040.000 -> 1.04M
    expect(screen.getByText(/1\.04M/i)).toBeDefined();

    // Revenda futura: 15% deve aparecer apenas UMA vez, sem duplicação
    const resaleItems = screen.getAllByText(/Revenda futura: 15%/i);
    expect(resaleItems).toHaveLength(1);

    // Cenário 2: Opção de compra exercida
    // 1.040.000 + 3.000.000 = 4.040.000 (€4.04M)
    const exercisedContract: Contract = {
      ...unexercisedContract,
      loanTerms: {
        ...unexercisedContract.loanTerms!,
        buyOptionExercised: true,
      },
    };

    const exercisedItem: TransferItem = {
      player: { ...pauVictorPlayer, contract: [exercisedContract] },
      contract: exercisedContract,
      contractIndex: 0,
      direction: "arrivals",
      cardKey: "p_pau_victor_0_arrivals",
    };

    rerender(
      <TransferClauseCard
        item={exercisedItem}
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

    // 4.040.000 -> 4.04M
    expect(screen.getByText(/4\.04M/i)).toBeDefined();
  });

  it("hasDefinedLoanBuyOption e getContractBuyOptionFee identificam corretamente contratos com e sem opção de compra", () => {
    expect(hasDefinedLoanBuyOption(pauVictorContract)).toBe(true);
    expect(getContractBuyOptionFee(pauVictorContract)).toBe(3000000);

    // Empréstimo simples sem loanTerms nem buyOptionValue
    const simpleLoan: Contract = {
      isLoan: true,
      fromClub: "Girona FC",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2026-07-15"),
    };
    expect(hasDefinedLoanBuyOption(simpleLoan)).toBe(false);
    expect(getContractBuyOptionFee(simpleLoan)).toBe(0);

    // Empréstimo com hasBuyOption explicitamente false
    const disabledLoan: Contract = {
      ...simpleLoan,
      buyOptionValue: 5000000,
      loanTerms: {
        durationYears: 1,
        hasBuyOption: false,
        partnerClub: "Girona FC",
      },
    };
    expect(hasDefinedLoanBuyOption(disabledLoan)).toBe(false);
    expect(getContractBuyOptionFee(disabledLoan)).toBe(0);

    // Empréstimo inconsistente com hasBuyOption true mas sem valor definido
    const zeroFeeLoan: Contract = {
      ...simpleLoan,
      loanTerms: {
        durationYears: 1,
        hasBuyOption: true,
        buyOptionFee: 0,
        partnerClub: "Girona FC",
      },
    };
    expect(hasDefinedLoanBuyOption(zeroFeeLoan)).toBe(false);
    expect(getContractBuyOptionFee(zeroFeeLoan)).toBe(0);

    // Empréstimo legado apenas com buyOptionValue > 0
    const legacyLoan: Contract = {
      ...simpleLoan,
      buyOptionValue: 12000000,
    };
    expect(hasDefinedLoanBuyOption(legacyLoan)).toBe(true);
    expect(getContractBuyOptionFee(legacyLoan)).toBe(12000000);

    // Contrato definitivo (não é empréstimo)
    expect(
      hasDefinedLoanBuyOption({
        ...pauVictorContract,
        isLoan: false,
      }),
    ).toBe(false);
  });

  it("NÃO exibe card nem botão de exercer opção de compra em ClauseOperationalManageView para empréstimo de chegada sem opção definida", () => {
    const simpleArrivalLoanContract: Contract = {
      isLoan: true,
      fromClub: "Girona FC",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2026-07-15"),
      dataExit: null,
      timing: "Imediata",
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 60,
        theirWagePercentage: 40,
        hasBuyOption: false,
        partnerClub: "Girona FC",
      },
    };

    const simpleArrivalItem: TransferItem = {
      player: { ...pauVictorPlayer, contract: [simpleArrivalLoanContract] },
      contract: simpleArrivalLoanContract,
      contractIndex: 0,
      direction: "arrivals",
      cardKey: "p_pau_victor_0_arrivals",
    };

    render(
      <ClauseOperationalManageView
        career={mockCareer}
        activeTransferItem={simpleArrivalItem}
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
        onOpenScreen={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("manage-arrival-loan-buy-option-card")).toBeNull();
    expect(screen.queryByTestId("btn-exercise-arrival-loan-buy-option")).toBeNull();
    expect(screen.getByTestId("manage-arrival-loan-no-buy-option")).toBeDefined();
  });

  it("NÃO exibe card nem drawer de opção de compra para empréstimo de saída sem opção definida", () => {
    const simpleExitLoanContract: Contract = {
      isLoan: true,
      fromClub: "",
      leftClub: "Real Betis",
      buyValue: 0,
      sellValue: 0,
      dataArrival: null,
      dataExit: new Date("2026-07-15"),
      timing: "Imediata",
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 50,
        theirWagePercentage: 50,
        hasBuyOption: false,
        partnerClub: "Real Betis",
      },
    };

    const simpleExitItem: TransferItem = {
      player: {
        ...pauVictorPlayer,
        id: "p_vitor_roque",
        name: "Vitor Roque",
        incomingLoan: false,
        loan: true,
        contract: [simpleExitLoanContract],
      },
      contract: simpleExitLoanContract,
      contractIndex: 0,
      direction: "exit",
      cardKey: "p_vitor_roque_0_exit",
    };

    render(
      <ClauseOperationalManageView
        career={mockCareer}
        activeTransferItem={simpleExitItem}
        isLoading={false}
        cancelInline={vi.fn()}
        sellOnActiveCardKey={null}
        setSellOnActiveCardKey={vi.fn()}
        sellOnTotalInput=""
        setSellOnTotalInput={vi.fn()}
        sellOnDateInput=""
        setSellOnDateInput={vi.fn()}
        loanBuyOptionDateInput="15/08"
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
        activeSectionDrawer="loanBuyOption"
        onOpenScreen={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("manage-loan-buy-option-card")).toBeNull();
    expect(screen.queryByTestId("btn-open-exercise-buy-option")).toBeNull();
    expect(screen.queryByTestId("loan-buy-option-activation-box")).toBeNull();
  });

  it("TransferClauseCard NÃO exibe botão Gerenciar em empréstimos (chegada ou saída) sem opção de compra", () => {
    const mockSeason: ClubData = {
      id: "s_2026",
      seasonNumber: 1,
      year: "2026/2027",
      clubName: "FC Barcelona",
      players: [],
      table: [],
      matches: [],
    } as unknown as ClubData;

    const arrivalWithoutBuyOption: Contract = {
      isLoan: true,
      fromClub: "Girona FC",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2026-07-15"),
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 100,
        theirWagePercentage: 0,
        hasBuyOption: false,
        partnerClub: "Girona FC",
      },
    };

    const { rerender } = render(
      <TransferClauseCard
        item={{
          player: { ...pauVictorPlayer, contract: [arrivalWithoutBuyOption] },
          contract: arrivalWithoutBuyOption,
          contractIndex: 0,
          direction: "arrivals",
          cardKey: "p_pau_victor_0_arrivals",
        }}
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

    expect(screen.queryByTestId("btn-manage-clauses")).toBeNull();

    const exitWithoutBuyOption: Contract = {
      isLoan: true,
      fromClub: "",
      leftClub: "Real Betis",
      buyValue: 0,
      sellValue: 0,
      dataArrival: null,
      dataExit: new Date("2026-07-15"),
      loanDuration: 1,
      wagePercentage: 50,
    };

    rerender(
      <TransferClauseCard
        item={{
          player: {
            ...pauVictorPlayer,
            incomingLoan: false,
            loan: true,
            contract: [exitWithoutBuyOption],
          },
          contract: exitWithoutBuyOption,
          contractIndex: 0,
          direction: "exit",
          cardKey: "p_pau_victor_0_exit",
        }}
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

    expect(screen.queryByTestId("btn-manage-clauses")).toBeNull();
  });

  it("ProposalClauseCard NÃO exibe botão Gerenciar Cláusulas em proposta de empréstimo finalizada sem opção de compra", () => {
    const mockSeason: ClubData = {
      id: "s_2026",
      seasonNumber: 1,
      year: "2026/2027",
      clubName: "FC Barcelona",
      players: [],
      table: [],
      matches: [],
    } as unknown as ClubData;

    const finalizedLoanWithoutOption: TransferProposal = {
      id: "prop_simple_loan",
      careerId: "c_barca",
      seasonId: "s_2026",
      type: "emprestimo_entrada",
      overallStatus: "concluida",
      playerId: "p_pau_victor",
      playerName: "Pau Víctor",
      playerNation: "ESP",
      playerPosition: "ATA",
      playerSector: "Ataque",
      timing: "Imediata",
      clubNegotiation: {
        partnerClub: "Girona FC",
        status: "aceita",
        loanTerms: {
          durationYears: 1,
          ourWagePercentage: 60,
          theirWagePercentage: 40,
          hasBuyOption: false,
          partnerClub: "Girona FC",
        },
      },
    };

    render(
      <ProposalClauseCard
        proposal={finalizedLoanWithoutOption}
        career={mockCareer}
        season={mockSeason}
        onManageLoan={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("btn-manage-loan-prop_simple_loan")).toBeNull();
  });
});
