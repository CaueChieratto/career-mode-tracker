// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import AddTransferPlayer from "../layout/SectionView/features/ClubTabs/SquadTab/views/AddTransferPlayer";
import EditTransferScreen from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/screens/EditTransferScreen";
import TransfersPanel from "../components/TransfersModal/components/TransfersPanel";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { ServicePlayers } from "../common/services/ServicePlayers";
import { toast } from "../common/services/ToastService";

import { SeasonThemeProvider } from "../contexts/SeasonThemeContext";
import { ThemeProvider } from "../contexts/LightThemeContext";

vi.mock("../common/services/ServicePlayers", () => ({
  ServicePlayers: {
    editTransferInSeason: vi.fn(),
    editPlayerInSeason: vi.fn(),
  },
}));

vi.mock("../common/services/ToastService", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Edição de Empréstimo Finalizado em Tela Única (Padrão FC Barcelona)", () => {
  const mockCareer: Career = {
    id: "barca-career-id",
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

  const mockLoanPlayer: Players = {
    id: "pau-victor-id",
    name: "Pau Víctor",
    overall: 74,
    potential: 82,
    age: 23,
    position: "ATA",
    sector: "Ataque",
    nation: "ESP",
    playerValue: 12000000,
    salary: 30000,
    captain: false,
    incomingLoan: true,
    ballonDor: 0,
    shirtNumber: "18",
    buy: false,
    sell: false,
    statsLeagues: [],
    contract: [
      {
        fromClub: "Girona FC",
        leftClub: "",
        dataArrival: new Date("2026-07-15"),
        buyValue: 0,
        sellValue: 0,
        isLoan: true,
        loanDuration: 1,
        wagePercentage: 60,
        salary: 30000,
        timing: "Imediata",
        buyOptionValue: 15000000,
        loanTerms: {
          hasBuyOption: true,
          buyOptionFee: 15000000,
          durationYears: 1,
          ourWagePercentage: 60,
          theirWagePercentage: 40,
          partnerClub: "Girona FC",
          sellOnPercentage: 15,
        },
      },
    ],
  };

  const mockExitLoanPlayer: Players = {
    id: "ansu-fati-id",
    name: "Ansu Fati",
    overall: 79,
    potential: 85,
    age: 23,
    position: "PE",
    sector: "Ataque",
    nation: "ESP",
    playerValue: 25000000,
    salary: 80000,
    captain: false,
    loan: true,
    ballonDor: 0,
    shirtNumber: "10",
    buy: false,
    sell: false,
    statsLeagues: [],
    contract: [
      {
        fromClub: "FC Barcelona",
        leftClub: "Sevilla FC",
        dataArrival: new Date("2024-07-01"),
        dataExit: new Date("2026-07-20"),
        buyValue: 0,
        sellValue: 0,
        isLoan: true,
        loanDuration: 1,
        wagePercentage: 50,
        salary: 80000,
        timing: "Imediata",
        buyOptionValue: 20000000,
        loanTerms: {
          hasBuyOption: true,
          buyOptionFee: 20000000,
          durationYears: 1,
          ourWagePercentage: 50,
          theirWagePercentage: 50,
          partnerClub: "Sevilla FC",
        },
      },
    ],
  };

  const mockSeason: ClubData = {
    id: "season-2026",
    seasonNumber: 1,
    year: "2026/2027",
    clubName: "FC Barcelona",
    players: [mockLoanPlayer, mockExitLoanPlayer],
    table: [],
    matches: [],
  } as unknown as ClubData;

  mockCareer.clubData = [mockSeason];

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("abre a tela de edição de empréstimo diretamente no AddTransferPlayer com título do atleta e Salvar Alterações", async () => {
    const onCloseMock = vi.fn();
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ThemeProvider>
              <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
                <AddTransferPlayer
                  career={mockCareer}
                  season={mockSeason}
                  onClose={onCloseMock}
                  editTransfer={{
                    player: mockLoanPlayer,
                    contract: mockLoanPlayer.contract![0],
                    contractIndex: 0,
                  }}
                />
              </SeasonThemeProvider>
            </ThemeProvider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    // Deve exibir o nome do jogador no HeaderSeason
    expect(screen.getByText("Pau Víctor")).toBeDefined();

    // Deve exibir 'Salvar Alterações' na Navbar (e NÃO 'Enviar Proposta' nem 'Próximo')
    expect(screen.getByText("Salvar Alterações")).toBeDefined();
    expect(screen.queryByText("Enviar Proposta")).toBeNull();
    expect(screen.queryByText("Próximo")).toBeNull();

    // Verifica que é tela única com as seções canônicas de adicionar transferência
    expect(screen.getByText("Tipo de Transferência")).toBeDefined();
    expect(screen.getByText("Informações do Jogador")).toBeDefined();
    expect(screen.getByText("Detalhes Contratuais")).toBeDefined();
    expect(screen.getByText("Opção de Compra")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();

    // O salário semanal exibido deve ser o valor integral (50k), e NÃO o valor parcial (30k)
    const salaryInput = screen.getByPlaceholderText("Ex: 120k") as HTMLInputElement;
    expect(salaryInput.value).toBe("50k");

    // Clica em 'Salvar Alterações'
    const saveBtn = screen.getByText("Salvar Alterações");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(ServicePlayers.editTransferInSeason).toHaveBeenCalledWith(
        expect.objectContaining({
          careerId: "barca-career-id",
          seasonId: "season-2026",
          playerId: "pau-victor-id",
          contractIndex: 0,
          direction: "arrivals",
          transferType: "Empréstimo",
          clubName: "Girona FC",
          salary: "50k",
        }),
      );
      expect(toast.success).toHaveBeenCalledWith("Empréstimo atualizado com sucesso!");
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("garante que o salário exibido é o valor integral de 50k quando salary salvo é 25k e wagePercentage é 50%", async () => {
    const playerWith25k: Players = {
      ...mockLoanPlayer,
      salary: 25000,
      contract: [
        {
          ...mockLoanPlayer.contract![0],
          salary: 25000,
          wagePercentage: 50,
          fullSalary: 50000,
        },
      ],
    };

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ThemeProvider>
              <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
                <AddTransferPlayer
                  career={mockCareer}
                  season={mockSeason}
                  onClose={vi.fn()}
                  editTransfer={{
                    player: playerWith25k,
                    contract: playerWith25k.contract![0],
                    contractIndex: 0,
                  }}
                />
              </SeasonThemeProvider>
            </ThemeProvider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    const salaryInput = screen.getByPlaceholderText("Ex: 120k") as HTMLInputElement;
    expect(salaryInput.value).toBe("50k");
  });

  it("reconstitui o valor integral de 50k caso fullSalary esteja ausente ou igual a 25k com divisão de 50%", async () => {
    const playerCorrupted: Players = {
      ...mockLoanPlayer,
      salary: 25000,
      contract: [
        {
          ...mockLoanPlayer.contract![0],
          salary: 25000,
          wagePercentage: 50,
          fullSalary: 25000, // fullSalary gravado erroneamente com o valor reduzido
        },
      ],
    };

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ThemeProvider>
              <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
                <AddTransferPlayer
                  career={mockCareer}
                  season={mockSeason}
                  onClose={vi.fn()}
                  editTransfer={{
                    player: playerCorrupted,
                    contract: playerCorrupted.contract![0],
                    contractIndex: 0,
                  }}
                />
              </SeasonThemeProvider>
            </ThemeProvider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    const salaryInput = screen.getByPlaceholderText("Ex: 120k") as HTMLInputElement;
    // Deve recuperar os 50k originais (25k / 0.5) sem aplicar redução cumulativa
    expect(salaryInput.value).toBe("50k");
  });

  it("ao clicar em uma chegada por empréstimo no TransfersPanel, aciona onOpenScreen com addTransferPlayer e editTransfer", () => {
    const onOpenScreenMock = vi.fn();
    const onTransferClickMock = vi.fn();

    render(
      <TransfersPanel
        title="Chegadas"
        transferType="arrivals"
        players={[mockLoanPlayer]}
        career={mockCareer}
        season={mockSeason}
        onOpenScreen={onOpenScreenMock}
        onTransferClick={onTransferClickMock}
      />,
    );

    // O card do atleta deve estar visível
    const playerItem = screen.getByText("P. Víctor");
    expect(playerItem).toBeDefined();

    // Clica no item de transferência
    fireEvent.click(playerItem);

    // Deve chamar onOpenScreen para abrir addTransferPlayer com editTransfer
    expect(onOpenScreenMock).toHaveBeenCalledWith({
      key: "addTransferPlayer",
      editTransfer: {
        player: mockLoanPlayer,
        contract: mockLoanPlayer.contract![0],
        contractIndex: 0,
      },
    });
  });

  it("abre a tela de edição de empréstimo de saída (exit loan) no EditTransferScreen com Salvar Alterações e sem Próximo", async () => {
    const onCloseMock = vi.fn();
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ThemeProvider>
              <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
                <EditTransferScreen
                  career={mockCareer}
                  season={mockSeason}
                  player={mockExitLoanPlayer}
                  contract={mockExitLoanPlayer.contract![0]}
                  contractIndex={0}
                  direction="exit"
                  onClose={onCloseMock}
                />
              </SeasonThemeProvider>
            </ThemeProvider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    // Deve exibir o nome do jogador no HeaderSeason
    expect(screen.getByText("Ansu Fati")).toBeDefined();

    // Deve exibir 'Salvar Alterações' na Navbar (e NÃO 'Próximo')
    expect(screen.getByText("Salvar Alterações")).toBeDefined();
    expect(screen.queryByText("Próximo")).toBeNull();

    // Deve exibir a seção de Detalhes do Empréstimo
    expect(screen.getByText("Detalhes do Empréstimo")).toBeDefined();
    expect(screen.getByText("Duração (Anos)")).toBeDefined();
    expect(screen.getByText("% Salário (destino)")).toBeDefined();

    // Clica em 'Salvar Alterações'
    const saveBtn = screen.getByText("Salvar Alterações");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(ServicePlayers.editTransferInSeason).toHaveBeenCalledWith(
        expect.objectContaining({
          careerId: "barca-career-id",
          seasonId: "season-2026",
          playerId: "ansu-fati-id",
          contractIndex: 0,
          direction: "exit",
          transferType: "Emprestar",
          clubName: "Sevilla FC",
        }),
      );
      expect(toast.success).toHaveBeenCalledWith("Empréstimo atualizado com sucesso!");
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("ao clicar em uma saída por empréstimo no TransfersPanel, aciona onOpenScreen com transferPlayer e editTransfer quando onTransferClick não for fornecido", () => {
    const onOpenScreenMock = vi.fn();

    render(
      <TransfersPanel
        title="Saídas"
        transferType="exit"
        players={[mockExitLoanPlayer]}
        career={mockCareer}
        season={mockSeason}
        onOpenScreen={onOpenScreenMock}
      />,
    );

    // O card do atleta deve estar visível
    const playerItem = screen.getByText("A. Fati");
    expect(playerItem).toBeDefined();

    // Clica no item de transferência
    fireEvent.click(playerItem);

    // Deve chamar onOpenScreen para abrir transferPlayer com editTransfer
    expect(onOpenScreenMock).toHaveBeenCalledWith({
      key: "transferPlayer",
      playerId: "ansu-fati-id",
      editTransfer: {
        player: mockExitLoanPlayer,
        contract: mockExitLoanPlayer.contract![0],
        contractIndex: 0,
        direction: "exit",
      },
    });
  });

  it("ao clicar em uma saída por empréstimo no TransfersPanel com onTransferClick fornecido, chama onTransferClick", () => {
    const onTransferClickMock = vi.fn();

    render(
      <TransfersPanel
        title="Saídas"
        transferType="exit"
        players={[mockExitLoanPlayer]}
        career={mockCareer}
        season={mockSeason}
        onTransferClick={onTransferClickMock}
      />,
    );

    const playerItem = screen.getByText("A. Fati");
    expect(playerItem).toBeDefined();

    fireEvent.click(playerItem);

    expect(onTransferClickMock).toHaveBeenCalledWith(
      expect.objectContaining({
        player: mockExitLoanPlayer,
        contract: mockExitLoanPlayer.contract![0],
        contractIndex: 0,
      }),
      "exit",
    );
  });

  it("salva alterações em empréstimo de saída com sellOnPercentage formatada como porcentagem (ex: 20%) sem erro NaN", async () => {
    const onCloseMock = vi.fn();
    const mockExitPlayerWithSellOn: Players = {
      ...mockExitLoanPlayer,
      contract: [
        {
          ...mockExitLoanPlayer.contract![0],
          loanTerms: {
            ...mockExitLoanPlayer.contract![0].loanTerms!,
            sellOnPercentage: 20,
          },
        },
      ],
    };

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ThemeProvider>
              <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
                <EditTransferScreen
                  career={mockCareer}
                  season={mockSeason}
                  player={mockExitPlayerWithSellOn}
                  contract={mockExitPlayerWithSellOn.contract![0]}
                  contractIndex={0}
                  direction="exit"
                  onClose={onCloseMock}
                />
              </SeasonThemeProvider>
            </ThemeProvider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    // Clica em 'Salvar Alterações'
    const saveBtn = screen.getByText("Salvar Alterações");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(ServicePlayers.editTransferInSeason).toHaveBeenCalledWith(
        expect.objectContaining({
          careerId: "barca-career-id",
          seasonId: "season-2026",
          playerId: "ansu-fati-id",
          direction: "exit",
          transferType: "Emprestar",
          loanTerms: expect.objectContaining({
            sellOnPercentage: 20,
            hasBuyOption: true,
          }),
        }),
      );
      expect(toast.success).toHaveBeenCalledWith("Empréstimo atualizado com sucesso!");
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("salva alterações de empréstimo de saída quando opção de compra está desmarcada (hasBuyOption: false)", async () => {
    const onCloseMock = vi.fn();
    const mockExitPlayerNoBuyOpt: Players = {
      ...mockExitLoanPlayer,
      contract: [
        {
          ...mockExitLoanPlayer.contract![0],
          loanDuration: 2,
          wagePercentage: 40,
          buyOptionValue: 0,
          loanTerms: {
            durationYears: 2,
            ourWagePercentage: 60,
            theirWagePercentage: 40,
            hasBuyOption: false,
            partnerClub: "Sevilla FC",
          },
        },
      ],
    };

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ThemeProvider>
              <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
                <EditTransferScreen
                  career={mockCareer}
                  season={mockSeason}
                  player={mockExitPlayerNoBuyOpt}
                  contract={mockExitPlayerNoBuyOpt.contract![0]}
                  contractIndex={0}
                  direction="exit"
                  onClose={onCloseMock}
                />
              </SeasonThemeProvider>
            </ThemeProvider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    const saveBtn = screen.getByText("Salvar Alterações");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(ServicePlayers.editTransferInSeason).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: "exit",
          transferType: "Emprestar",
          loanTerms: expect.objectContaining({
            hasBuyOption: false,
            durationYears: 2,
            theirWagePercentage: 40,
          }),
        }),
      );
      expect(toast.success).toHaveBeenCalledWith("Empréstimo atualizado com sucesso!");
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("inicializa sellOnPercentage como string numérica pura (sem %), evitando aviso de input type number", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ThemeProvider>
              <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
                <EditTransferScreen
                  career={mockCareer}
                  season={mockSeason}
                  player={mockLoanPlayer}
                  contract={mockLoanPlayer.contract![0]}
                  contractIndex={0}
                  direction="arrivals"
                  onClose={vi.fn()}
                />
              </SeasonThemeProvider>
            </ThemeProvider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    // Localiza o input de futura venda e valida que o valor não contém "%"
    const sellOnInput = screen.getByPlaceholderText("Ex: 10, 20") as HTMLInputElement;
    expect(sellOnInput).toBeDefined();
    expect(sellOnInput.value).toBe("15");
    expect(sellOnInput.value).not.toContain("%");
  });
});
