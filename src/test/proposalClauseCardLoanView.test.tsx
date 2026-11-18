// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ProposalClauseCard from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses/components/ProposalClauseCard";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";

describe("proposalClauseCardLoanView (Padrão FC Barcelona)", () => {
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

  const mockSeason: ClubData = {
    id: "s_2026",
    seasonNumber: 1,
    year: "2026/2027",
    clubName: "FC Barcelona",
    players: [],
    table: [],
    matches: [],
  } as unknown as ClubData;

  const buyProposal: TransferProposal = {
    id: "prop_nico_1",
    careerId: "c_barca",
    seasonId: "s_2026",
    type: "compra",
    overallStatus: "em_andamento",
    playerId: "p_nico_williams",
    playerName: "Nico Williams",
    playerNation: "ESP",
    playerPosition: "EE",
    playerSector: "Ataque",
    timing: "Imediata",
    clubNegotiation: {
      partnerClub: "Athletic Club",
      transferFee: 58000000,
      status: "em_negociacao",
    },
    playerNegotiation: {
      weeklyWage: 180000,
      durationYears: 5,
      squadRole: "Crucial",
      status: "aceita",
    },
  };

  const loanProposal: TransferProposal = {
    id: "prop_pau_victor_loan",
    careerId: "c_barca",
    seasonId: "s_2026",
    type: "emprestimo_entrada",
    overallStatus: "em_andamento",
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
        hasBuyOption: true,
        buyOptionFee: 3000000,
        sellOnPercentage: 15,
        partnerClub: "Girona FC",
      },
    },
    playerNegotiation: {
      weeklyWage: 30000,
      durationYears: 1,
      squadRole: "Rodízio",
      status: "aceita",
    },
  };

  it("renderiza proposta de compra com cardHeader, gridContent, badges e os 4 botões de ação", () => {
    const onEditClub = vi.fn();
    const onEditPlayer = vi.fn();
    const onFinalize = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <ProposalClauseCard
        proposal={buyProposal}
        career={mockCareer}
        season={mockSeason}
        onEditClub={onEditClub}
        onEditPlayer={onEditPlayer}
        onFinalize={onFinalize}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Nico Williams")).toBeDefined();
    expect(screen.getByText("Athletic Club")).toBeDefined();
    expect(screen.getByText("Compra")).toBeDefined();

    // PlayerCircle renderiza sem número de overall fictício
    const overallBadges = container.querySelectorAll(".shirt_number_center");
    expect(overallBadges).toHaveLength(0);

    // Os 4 botões de compra estão presentes
    expect(screen.getByRole("button", { name: /Cláusulas do Clube/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Termos do Atleta/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Finalizar Transferência/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Excluir Proposta/i })).toBeDefined();

    // Botão único de empréstimo NÃO deve estar presente
    expect(screen.queryByRole("button", { name: /Gerenciar Cláusulas/i })).toBeNull();
  });

  it("renderiza proposta de empréstimo pendente com badge 'Pendente' e botões 'Finalizar' e 'Cancelar Proposta'", () => {
    const onFinalize = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <ProposalClauseCard
        proposal={loanProposal}
        career={mockCareer}
        season={mockSeason}
        onFinalize={onFinalize}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Pau Víctor")).toBeDefined();
    expect(screen.getByText("Girona FC")).toBeDefined();
    expect(screen.getByText("Empréstimo")).toBeDefined();
    expect(screen.getByText("Pendente")).toBeDefined();

    // PlayerCircle neutro
    const overallBadges = container.querySelectorAll(".shirt_number_center");
    expect(overallBadges).toHaveLength(0);

    // Botões de empréstimo pendente
    const finalizeBtn = screen.getByTestId("btn-finalize-proposal-prop_pau_victor_loan");
    expect(finalizeBtn).toBeDefined();
    expect(finalizeBtn.textContent).toContain("Finalizar");

    const deleteBtn = screen.getByTestId("btn-delete-proposal-prop_pau_victor_loan");
    expect(deleteBtn).toBeDefined();
    expect(deleteBtn.textContent).toContain("Cancelar Proposta");

    fireEvent.click(finalizeBtn);
    expect(onFinalize).toHaveBeenCalledWith(loanProposal);

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(loanProposal);

    // Botão de gerenciar NÃO deve aparecer enquanto não finalizado
    expect(screen.queryByTestId("btn-manage-loan-prop_pau_victor_loan")).toBeNull();
  });

  it("renderiza proposta de empréstimo finalizada com badge 'Finalizada' e estritamente o botão 'Gerenciar Cláusulas'", () => {
    const onManageLoan = vi.fn();
    const finalizedLoan: TransferProposal = {
      ...loanProposal,
      overallStatus: "concluida",
    };

    render(
      <ProposalClauseCard
        proposal={finalizedLoan}
        career={mockCareer}
        season={mockSeason}
        onManageLoan={onManageLoan}
      />,
    );

    expect(screen.getByText("Finalizada")).toBeDefined();

    // Botão exclusivo de gerenciar empréstimo
    const manageBtn = screen.getByTestId("btn-manage-loan-prop_pau_victor_loan");
    expect(manageBtn).toBeDefined();
    expect(manageBtn.textContent).toContain("Gerenciar Cláusulas");

    fireEvent.click(manageBtn);
    expect(onManageLoan).toHaveBeenCalledWith(finalizedLoan);

    // Botões de pendência NÃO devem estar presentes
    expect(screen.queryByTestId("btn-finalize-proposal-prop_pau_victor_loan")).toBeNull();
    expect(screen.queryByTestId("btn-delete-proposal-prop_pau_victor_loan")).toBeNull();
  });

  it("proposta originada de opção de compra (originLoanBuyOption: true) NÃO renderiza o botão 'Cláusulas do Clube' e possui badges na barra superior", () => {
    const buyOptionProposal: TransferProposal = {
      ...buyProposal,
      id: "prop_pau_victor_exercised",
      originLoanBuyOption: true,
      clubNegotiation: {
        partnerClub: "Girona FC",
        transferFee: 3000000,
        status: "aceita",
      },
    };

    const { container } = render(
      <ProposalClauseCard
        proposal={buyOptionProposal}
        career={mockCareer}
        season={mockSeason}
        onEditClub={vi.fn()}
        onEditPlayer={vi.fn()}
        onFinalize={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    // O botão de 'Cláusulas do Clube' NÃO deve existir
    expect(screen.queryByRole("button", { name: /Cláusulas do Clube/i })).toBeNull();

    // Mas os demais botões de compra continuam existindo
    expect(screen.getByRole("button", { name: /Termos do Atleta/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Finalizar Transferência/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Excluir Proposta/i })).toBeDefined();

    // Badges de status estão na barra superior (cardTopBar)
    const topBar = container.querySelector('[class*="cardTopBar"]');
    expect(topBar).toBeDefined();
    expect(topBar?.textContent).toContain("Clube: Aceito");
    expect(topBar?.textContent).toContain("Atleta: Aceito");
  });

  it("renderiza no clausesSummary as cláusulas tanto dos termos do clube quanto dos termos do atleta", () => {
    const proposalWithAllClauses: TransferProposal = {
      ...buyProposal,
      clubNegotiation: {
        partnerClub: "Athletic Club",
        transferFee: 58000000,
        status: "aceita",
        installments: {
          id: "inst_1",
          direction: "payable",
          status: "pending",
          percentage: 40,
          totalInstallments: 3,
          remainingInstallments: 3,
          annualInstallmentValue: 7733333,
          upfrontValue: 34800000,
          firstPaymentSeasonNumber: 1,
          partnerClub: "Athletic Club",
        },
        swapPlayer: {
          playerName: "Ferran Torres",
          playerValue: 30000000,
          position: "ATA",
          sector: "Ataque",
        },
        bonuses: [
          {
            id: "b_1",
            direction: "payable",
            category: "objective",
            name: "Gols",
            value: 2000000,
            status: "pending",
          },
        ],
        sellOnPercentage: 10,
      },
      playerNegotiation: {
        weeklyWage: 200000,
        durationYears: 5,
        squadRole: "Crucial",
        status: "aceita",
        signingBonus: 5000000,
        agentFee: 2000000,
        releaseClause: 100000000,
        wageAdjustment: {
          enabled: true,
          direction: "Aumentar",
          percentage: 10,
          targetObjective: "Vencer a liga",
        },
        performanceBonuses: [
          {
            id: "b_2",
            direction: "payable",
            category: "award",
            name: "Artilheiro",
            value: 1000000,
            status: "pending",
          },
        ],
      },
    };

    render(
      <ProposalClauseCard
        proposal={proposalWithAllClauses}
        career={mockCareer}
        season={mockSeason}
      />,
    );

    // Cláusulas do Clube
    expect(screen.getByText(/Parcelado \(3x\)/i)).toBeDefined();
    expect(screen.getByText(/Troca: Ferran Torres/i)).toBeDefined();
    expect(screen.getByText(/1 bônus \(clube\)/i)).toBeDefined();
    expect(screen.getByText(/Outros Acordos/i)).toBeDefined();

    // Cláusulas do Atleta
    expect(screen.getByText(/Contrato: 5 anos/i)).toBeDefined();
    expect(screen.queryByText(/Papel:/i)).toBeNull();
    expect(screen.getByText(/Luvas:/i)).toBeDefined();
    expect(screen.getByText(/Agência:/i)).toBeDefined();
    expect(screen.getByText(/Multa:/i)).toBeDefined();
    expect(screen.getByText(/Reajuste: 10%/i)).toBeDefined();
    expect(screen.getByText(/1 bônus \(atleta\)/i)).toBeDefined();
  });

  it("exibe o overall salvo no PlayerCircle no cabeçalho do card em vez do número da camisa quando o overall está presente", () => {
    const proposalWithOverall: TransferProposal = {
      ...buyProposal,
      playerOverall: 88,
      shirtNumber: "10",
    };

    render(
      <ProposalClauseCard
        proposal={proposalWithOverall}
        career={mockCareer}
        season={mockSeason}
      />,
    );

    // O overall 88 deve estar presente no círculo
    expect(screen.getByText("88")).toBeDefined();
    // O número da camisa "10" NÃO deve estar no PlayerCircle
    expect(screen.queryByText("10")).toBeNull();
  });

  it("exibe o número da camisa quando o overall não estiver salvo na proposta", () => {
    const proposalWithoutOverall: TransferProposal = {
      ...buyProposal,
      playerOverall: undefined,
      shirtNumber: "19",
    };

    render(
      <ProposalClauseCard
        proposal={proposalWithoutOverall}
        career={mockCareer}
        season={mockSeason}
      />,
    );

    // Como não há overall, exibe o número da camisa 19
    expect(screen.getByText("19")).toBeDefined();
  });
});

