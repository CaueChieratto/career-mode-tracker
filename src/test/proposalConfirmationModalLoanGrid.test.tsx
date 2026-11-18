// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { ProposalConfirmationModal } from "../ui/modals/ProposalConfirmationModal";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";

describe("ProposalConfirmationModal - Grid Tático para Empréstimos (Padrão FC Barcelona)", () => {
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

  const ansuFati: Players = {
    id: "p_ansu_fati",
    name: "Ansu Fati",
    position: "PE",
    sector: "Ataque",
    age: 23,
    overall: 80,
    salary: 100000, // €100.000 / semana
    nation: "ESP",
    shirtNumber: "10",
    buy: false,
    sell: false,
    captain: false,
    loan: false,
    contract: [],
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

  it("calcula Custo Semanal em empréstimo de saída com salário real do jogador e percentual que o clube continuará pagando", () => {
    // Ansu Fati ganha €100k/sem. Destino paga 60%. Barça paga 40% = €40k/sem.
    const exitLoanProposal: TransferProposal = {
      id: "prop_exit_loan",
      careerId: "c_barca",
      seasonId: "s_2026",
      type: "emprestimo_saida",
      overallStatus: "em_andamento",
      playerId: "p_ansu_fati",
      playerName: "Ansu Fati",
      playerNation: "ESP",
      playerPosition: "PE",
      playerSector: "Ataque",
      clubNegotiation: {
        partnerClub: "Sevilla FC",
        status: "aceita",
        loanTerms: {
          durationYears: 1,
          theirWagePercentage: 60,
          ourWagePercentage: 40,
          hasBuyOption: true,
          buyOptionFee: 25000000,
          sellOnPercentage: 10,
        },
      },
    };

    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={exitLoanProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // Custo Semanal: 40% de 100k = €40k
    expect(screen.getByText("Custo Semanal")).toBeDefined();
    expect(screen.getByText(/40k \/sem/i)).toBeDefined();
    expect(screen.getByText(/40% pago por nós \(€ 100k total\)/i)).toBeDefined();

    // Duração: 1 Ano
    expect(screen.getByText("1 Ano")).toBeDefined();

    // Cards de Opção de Compra
    expect(screen.getByTestId("tactical-card-loan-buy-option")).toBeDefined();
    expect(screen.getByText("Fixada")).toBeDefined();
    const optValueCard = screen.getByTestId("tactical-card-loan-buy-option-value");
    expect(within(optValueCard).getByText(/25M/)).toBeDefined();
    expect(within(optValueCard).getByText(/10% de mais-valia em revenda/i)).toBeDefined();

    // NÃO deve exibir o card Janela de Efetivação
    expect(screen.queryByText("Janela de Efetivação")).toBeNull();
  });

  it("calcula Custo Semanal em empréstimo de chegada e exibe 'Sem opção' se não houver opção de compra fixada", () => {
    // Jogador vindo por empréstimo: salário de €50.000/sem, pagamos 70% = €35k/sem. Sem opção de compra.
    const arrivalLoanProposal: TransferProposal = {
      id: "prop_arrival_loan",
      careerId: "c_barca",
      seasonId: "s_2026",
      type: "emprestimo_entrada",
      overallStatus: "em_andamento",
      playerId: "p_joao_cancelo",
      playerName: "João Cancelo",
      playerNation: "POR",
      playerPosition: "LD",
      playerSector: "Defesa",
      clubNegotiation: {
        partnerClub: "Manchester City",
        status: "aceita",
        loanTerms: {
          durationYears: 2,
          theirWagePercentage: 30,
          ourWagePercentage: 70,
          hasBuyOption: false,
        },
      },
      playerNegotiation: {
        weeklyWage: 50000,
        durationYears: 2,
        squadRole: "Importante",
        status: "aceita",
      },
    };

    render(
      <ProposalConfirmationModal
        isOpen={true}
        proposal={arrivalLoanProposal}
        career={mockCareer}
        season={mockSeason}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // Custo Semanal: 70% de 50k = €35k
    expect(screen.getByText("Custo Semanal")).toBeDefined();
    expect(screen.getByText(/35k \/sem/i)).toBeDefined();
    expect(screen.getByText(/70% pago por nós \(€ 50k total\)/i)).toBeDefined();

    // Duração: 2 Anos
    expect(screen.getByText("2 Anos")).toBeDefined();

    // Opção de Compra: Sem opção
    expect(screen.getByTestId("tactical-card-loan-buy-option")).toBeDefined();
    expect(screen.getByText("Sem opção")).toBeDefined();
    expect(screen.getByText("Empréstimo simples")).toBeDefined();

    // Não deve renderizar card de valor de opção
    expect(screen.queryByTestId("tactical-card-loan-buy-option-value")).toBeNull();

    // NÃO deve exibir o card Janela de Efetivação
    expect(screen.queryByText("Janela de Efetivação")).toBeNull();
  });
});
