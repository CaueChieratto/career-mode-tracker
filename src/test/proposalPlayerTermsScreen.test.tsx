// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import ProposalPlayerTerms from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ProposalPlayerTerms";
import { ServiceProposals } from "../common/services/ServiceProposals";
import { TransferProposal } from "../common/interfaces/proposals/transferProposal";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { career, season } from "./factories/domain";
import { toast } from "../common/services/ToastService";

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../common/hooks/Colors/UseClubColors", () => ({
  useClubColors: () => ({
    clubColor: "#a50044",
    darkClubColor: "#004d98",
  }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#a50044",
    darkClubColor: "#004d98",
  }),
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    getProposalById: vi.fn(),
    updateProposal: vi.fn().mockResolvedValue(undefined),
  },
}));

function renderWithRouter(ui: React.ReactElement) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: ui,
      },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("ProposalPlayerTerms Screen Tests (Padrão FC Barcelona)", () => {
  const mockCareer: Career = career({
    id: "career_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    currency: "€",
    createdAt: new Date("2026-08-01"),
    nation: "ESP",
    colorsTeams: ["#a50044", "#004d98"],
    clubData: [],
  });

  const mockSeason: ClubData = season({
    id: "season_2026",
    seasonNumber: 1,
    players: [],
    matches: [],
  });

  const mockProposal: TransferProposal = {
    id: "prop_yamal_1",
    careerId: "career_barca",
    seasonId: "season_2026",
    type: "compra",
    overallStatus: "em_andamento",
    playerId: "player_yamal",
    playerName: "Lamine Yamal",
    playerNation: "Espanha",
    playerPosition: "ED",
    playerSector: "Ataque",
    playerOverall: 84,
    playerAge: 18,
    shirtNumber: "19",
    clubNegotiation: {
      status: "aceita",
      partnerClub: "PSG",
      transferFee: 120000000,
    },
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(ServiceProposals.getProposalById).mockResolvedValue(mockProposal);
  });

  it("renderiza o HeaderSeason com o nome do atleta como título e sem headerCard redundante", async () => {
    renderWithRouter(
      <ProposalPlayerTerms
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_yamal_1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Lamine Yamal")).toBeDefined();
      expect(screen.getByText("Termos do Atleta")).toBeDefined();
    });

    expect(screen.queryByText("ED • Ataque • PSG")).toBeNull();
  });

  it("renderiza a seção 'Informações do Contrato' com salário, duração, taxa da contratação e taxa da agência no drawer", async () => {
    renderWithRouter(
      <ProposalPlayerTerms
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_yamal_1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("1. Informações do Contrato")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("modular-card-contract-info"));

    await waitFor(() => {
      expect(screen.getByText("Salário semanal")).toBeDefined();
    });

    expect(screen.getByText("Duração do contrato")).toBeDefined();
    expect(screen.getByText("Taxa da contratação")).toBeDefined();
    expect(screen.getByText("Taxa da agência")).toBeDefined();

    expect(screen.getByPlaceholderText("Ex: 500k, 1.2M")).toBeDefined();
    expect(screen.getByPlaceholderText("Ex: 1, 2, 3 anos")).toBeDefined();
    expect(screen.getByPlaceholderText("Ex: 5M, 500k")).toBeDefined();
    expect(screen.getByPlaceholderText("Ex: 2M, 500k")).toBeDefined();
  });

  it("renderiza o painel modular com cards de Informações do Contrato, Bônus & Metas e Cláusulas Especiais", async () => {
    renderWithRouter(
      <ProposalPlayerTerms
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_yamal_1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("1. Informações do Contrato")).toBeDefined();
      expect(screen.getByText("2. Bônus & Metas")).toBeDefined();
      expect(screen.getByText("3. Cláusulas Especiais")).toBeDefined();
    });
  });

  it("exibe aviso quando o usuário tenta salvar sem informar salário semanal", async () => {
    renderWithRouter(
      <ProposalPlayerTerms
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_yamal_1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("1. Informações do Contrato")).toBeDefined();
    });

    const saveButton = screen.getByText("Salvar Termos");
    fireEvent.click(saveButton);

    expect(toast.warning).toHaveBeenCalledWith(
      "Por favor, informe o salário semanal do atleta.",
    );
    expect(ServiceProposals.updateProposal).not.toHaveBeenCalled();
  });

  it("permite abrir o drawer de Bônus & Metas, adicionar bônus e salvar", async () => {
    renderWithRouter(
      <ProposalPlayerTerms
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_yamal_1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("2. Bônus & Metas")).toBeDefined();
    });

    fireEvent.click(screen.getByText("2. Bônus & Metas"));

    await waitFor(() => {
      expect(screen.getByText("Opção de bônus")).toBeDefined();
    });

    const bonusValueInput = document.getElementById("bonusValue") as HTMLInputElement;
    fireEvent.change(bonusValueInput, { target: { value: "2M" } });

    const objectiveInput = screen.getByPlaceholderText("Selecione ou digite o objetivo");
    fireEvent.change(objectiveInput, { target: { value: "Marcar 20 gols" } });

    const concludeButton = screen.getByText("Concluir");
    fireEvent.click(concludeButton);

    await waitFor(() => {
      expect(screen.getByText("1 Meta Ativa")).toBeDefined();
    });
  });

  it("salva termos com sucesso sem finalizar a transferência e redireciona para manageClauses", async () => {
    const onCloseMock = vi.fn();
    const onOpenScreenMock = vi.fn();

    renderWithRouter(
      <ProposalPlayerTerms
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_yamal_1"
        onClose={onCloseMock}
        onOpenScreen={onOpenScreenMock}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("1. Informações do Contrato")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("modular-card-contract-info"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ex: 500k, 1.2M")).toBeDefined();
    });

    const salaryInput = screen.getByPlaceholderText("Ex: 500k, 1.2M");
    fireEvent.change(salaryInput, { target: { value: "350k" } });

    const signingBonusInput = screen.getByPlaceholderText("Ex: 5M, 500k");
    fireEvent.change(signingBonusInput, { target: { value: "5M" } });

    const agentFeeInput = screen.getByPlaceholderText("Ex: 2M, 500k");
    fireEvent.change(agentFeeInput, { target: { value: "1.5M" } });

    const concludeBtn = screen.getByText("Concluir");
    fireEvent.click(concludeBtn);

    // O card de informações do contrato deve exibir os valores atualizados incluindo a taxa da agência
    await waitFor(() => {
      expect(screen.getByText(/Agência:/i)).toBeDefined();
      expect(screen.getByText(/€1\.5M/i)).toBeDefined();
    });

    const saveButton = screen.getByText("Salvar Termos");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
        mockCareer.id,
        mockSeason.id,
        "prop_yamal_1",
        expect.objectContaining({
          playerNegotiation: expect.objectContaining({
            status: "aceita",
            weeklyWage: 350000,
            signingBonus: 5000000,
            agentFee: 1500000,
          }),
          overallStatus: "aguardando_confirmacao",
        }),
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Termos do atleta salvos com sucesso!");
    expect(onCloseMock).toHaveBeenCalled();
    expect(onOpenScreenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "manageClauses",
        initialTab: "arrivals",
        selectedPlayerName: "Lamine Yamal",
        selectedProposalId: "prop_yamal_1",
      }),
    );
  });

  it("ao reabrir a tela, restaura os termos previamente salvos no formState e playerNegotiation", async () => {
    const savedProposal: TransferProposal = {
      ...mockProposal,
      playerNegotiation: {
        status: "aceita",
        weeklyWage: 400000,
        durationYears: 5,
        contractUntil: "30/06/2031",
        squadRole: "Importante",
        signingBonus: 10000000,
        agentFee: 2000000,
        releaseClause: 1000000000,
        wageAdjustment: {
          enabled: true,
          direction: "Aumentar",
          targetObjective: "Vencer La Liga",
          percentage: 15,
          status: "Pendente",
        },
      },
      formState: {
        formValues: {
          salary: "400k",
          contractTime: "5",
          contractUntil: "30/06/2031",
          signingBonus: "10M",
          agentFee: "2M",
          releaseClause: "1B",
          wageAdjustmentType: "Aumentar",
          wageAdjustmentObjective: "Vencer La Liga",
          wageAdjustmentPercentage: "15%",
        },
        booleanValues: {},
      },
    };

    vi.mocked(ServiceProposals.getProposalById).mockResolvedValueOnce(savedProposal);

    renderWithRouter(
      <ProposalPlayerTerms
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_yamal_1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("1. Informações do Contrato")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("modular-card-contract-info"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ex: 500k, 1.2M")).toBeDefined();
    });

    const salaryInput = screen.getByPlaceholderText("Ex: 500k, 1.2M") as HTMLInputElement;
    expect(salaryInput.value).toBe("400k");

    const contractTimeInput = screen.getByPlaceholderText("Ex: 1, 2, 3 anos") as HTMLInputElement;
    expect(contractTimeInput.value).toBe("5");

    const signingBonusInput = screen.getByPlaceholderText("Ex: 5M, 500k") as HTMLInputElement;
    expect(signingBonusInput.value).toBe("10M");

    const agentFeeInput = screen.getByPlaceholderText("Ex: 2M, 500k") as HTMLInputElement;
    expect(agentFeeInput.value).toBe("2M");
  });

  it("quando proposal.originLoanBuyOption é true, NÃO exibe o input de taxa da agência e salva agentFee como undefined", async () => {
    const buyOptionProposal: TransferProposal = {
      ...mockProposal,
      id: "prop_pau_victor_exercised",
      playerName: "Pau Víctor",
      originLoanBuyOption: true,
      clubNegotiation: {
        partnerClub: "Girona FC",
        transferFee: 3000000,
        status: "aceita",
      },
    };

    vi.mocked(ServiceProposals.getProposalById).mockResolvedValueOnce(buyOptionProposal);

    renderWithRouter(
      <ProposalPlayerTerms
        career={mockCareer}
        season={mockSeason}
        proposalId="prop_pau_victor_exercised"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("1. Informações do Contrato")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("modular-card-contract-info"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ex: 500k, 1.2M")).toBeDefined();
    });

    // Input de taxa da agência NÃO deve existir
    expect(screen.queryByPlaceholderText("Ex: 2M, 500k")).toBeNull();

    // Outros inputs contratuais existem normalmente
    expect(screen.getByPlaceholderText("Ex: 500k, 1.2M")).toBeDefined();
    expect(screen.getByPlaceholderText("Ex: 5M, 500k")).toBeDefined();

    // Preenche salário e clica em Salvar
    const salaryInput = screen.getByPlaceholderText("Ex: 500k, 1.2M");
    fireEvent.change(salaryInput, { target: { value: "50k" } });

    const concludeBtn = screen.getByText("Concluir");
    fireEvent.click(concludeBtn);

    // Quando originLoanBuyOption é true, Agência não deve aparecer no card
    expect(screen.queryByText(/Agência:/i)).toBeNull();

    const saveButton = screen.getByText("Salvar Termos");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
        mockCareer.id,
        mockSeason.id,
        "prop_pau_victor_exercised",
        expect.objectContaining({
          playerNegotiation: expect.objectContaining({
            weeklyWage: 50000,
            agentFee: undefined,
          }),
        }),
      );
    });
  });

  it("quando a proposta é de renovação, nomeia o input como 'Extensão de contrato' e soma com os anos originais do atleta ao salvar", async () => {
    const seasonWith2YearsPedri: ClubData = {
      ...mockSeason,
      players: [
        {
          id: "pedri_gonzalez",
          name: "Pedri",
          position: "MC",
          age: 23,
          overall: 89,
          salary: 200000,
          contractTime: 2,
          contractUntil: "31/07/2028",
          contract: [],
        } as unknown as Players,
      ],
    };

    const renewalProposal: TransferProposal = {
      id: "prop_pedri_renewal",
      careerId: mockCareer.id,
      seasonId: mockSeason.id,
      type: "renovacao",
      overallStatus: "em_andamento",
      playerId: "pedri_gonzalez",
      playerName: "Pedri",
      playerNation: "Espanha",
      playerPosition: "MC",
      playerSector: "Meio-Campo",
      playerOverall: 89,
      playerAge: 23,
      shirtNumber: "8",
      playerNegotiation: {
        status: "aceita",
        weeklyWage: 250000,
        durationYears: 2,
        contractUntil: "31/07/2028",
      },
      formState: {
        formValues: {
          salary: "250k",
          contractTime: "0",
        },
        booleanValues: {},
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    vi.mocked(ServiceProposals.getProposalById).mockResolvedValueOnce(renewalProposal);

    renderWithRouter(
      <ProposalPlayerTerms
        career={mockCareer}
        season={seasonWith2YearsPedri}
        proposalId="prop_pedri_renewal"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Pedri")).toBeDefined();
    });

    // Abre a gaveta de Informações do Contrato
    fireEvent.click(screen.getByTestId("modular-card-contract-info"));

    await waitFor(() => {
      expect(screen.getByText("Extensão de contrato")).toBeDefined();
      expect(screen.getByPlaceholderText("Ex: 0, 1, 2 anos")).toBeDefined();
    });

    // Taxa da agência NÃO deve existir em renovação
    expect(screen.queryByPlaceholderText("Ex: 2M, 500k")).toBeNull();

    // Altera a extensão para 1 ano (2 originais + 1 extensão = 3)
    const extensionInput = screen.getByPlaceholderText("Ex: 0, 1, 2 anos");
    fireEvent.change(extensionInput, { target: { value: "1" } });

    const concludeBtn = screen.getByText("Concluir");
    fireEvent.click(concludeBtn);

    const saveButton = screen.getByText("Salvar Termos");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(ServiceProposals.updateProposal).toHaveBeenCalledWith(
        mockCareer.id,
        mockSeason.id,
        "prop_pedri_renewal",
        expect.objectContaining({
          playerNegotiation: expect.objectContaining({
            durationYears: 3, // 2 originais + 1 extensão
          }),
        }),
      );
    });
  });
});
