// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { ActiveSectionScreen } from "../layout/SectionView/components/ActiveSectionScreen";
import { ServicePlayers } from "../common/services/ServicePlayers";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";

// Mock Firebase & Auth
vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "test-uid" } },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn(),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../common/services/ServiceProposals", () => ({
  ServiceProposals: {
    getProposalsBySeason: vi.fn().mockResolvedValue([]),
    updateProposal: vi.fn().mockResolvedValue(undefined),
    createProposal: vi.fn().mockResolvedValue({ id: "prop_1" }),
    getProposalById: vi.fn().mockResolvedValue(null),
    updateProposalStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({ clubColor: "#004d98", darkClubColor: "#a50044" }),
}));

vi.mock("../common/services/ServicePlayers/helpers/authHelpers", () => ({
  requireAuth: () => ({ uid: "test-uid" }),
}));

describe("Edição Unificada de Transferências (Padrão FC Barcelona)", () => {
  const barcaPlayer: Players = {
    id: "yamal-19",
    name: "Lamine Yamal",
    age: 17,
    overall: 82,
    position: "ED",
    sector: "Ataque",
    nation: "ESP",
    contract: [
      {
        buyValue: 0,
        fromClub: "FC Barcelona",
        dataArrival: new Date("2024-07-01"),
        dataExit: new Date("2024-08-01"),
        leftClub: "Paris Saint-Germain",
        sellValue: 120000000,
        timing: "Imediata",
      },
    ],
  } as unknown as Players;

  const barcaSeason: ClubData = {
    id: "season-1",
    seasonNumber: 1,
    players: [barcaPlayer],
    matches: [],
    table: [],
  };

  const barcaCareer: Career = {
    id: "barca-career-1",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "",
    nation: "ESP",
    currency: "€",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    createdAt: new Date("2024-07-01"),
    clubData: [barcaSeason],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("ao editar uma saída por venda, exibe a mesma tela de vender o jogador com dados preenchidos e botão 'Salvar Alterações' (sem 'Próximo')", async () => {
    const editSpy = vi
      .spyOn(ServicePlayers, "editTransferInSeason")
      .mockResolvedValue(undefined);

    const router = createMemoryRouter([
      {
        path: "/",
        element: (
          <ThemeProvider>
            <ActiveSectionScreen
              career={barcaCareer}
              season={barcaSeason}
              screen={{
                key: "transferPlayer",
                playerId: barcaPlayer.id,
                editTransfer: {
                  player: barcaPlayer,
                  contract: barcaPlayer.contract![0],
                  contractIndex: 0,
                  direction: "exit",
                },
              }}
              onClose={vi.fn()}
            />
          </ThemeProvider>
        ),
      },
    ]);

    render(<RouterProvider router={router} />);

    // Deve exibir o cabeçalho com o nome do jogador
    expect(screen.getAllByText("Lamine Yamal")[0]).toBeDefined();

    // NÃO deve haver o botão "Próximo"
    expect(screen.queryByText("Próximo")).toBeNull();

    // O botão principal do Navbar deve ser "Salvar Alterações"
    const saveBtn = screen.getByText("Salvar Alterações");
    expect(saveBtn).toBeDefined();

    // Os dados da transferência devem estar preenchidos
    const clubInput = screen.getByPlaceholderText("Ex: Barcelona") as HTMLInputElement;
    expect(clubInput.value).toBe("Paris Saint-Germain");

    const feeInput = screen.getByPlaceholderText("Ex: 150k, 50M") as HTMLInputElement;
    expect(feeInput.value.toLowerCase()).toBe("120m");

    // Deve conter a opção de manutenção para desfazer a transferência
    expect(
      screen.getByText("Desfazer essa transferência?"),
    ).toBeDefined();

    // Ao clicar em Salvar Alterações, chama ServicePlayers.editTransferInSeason
    fireEvent.click(saveBtn);

    expect(editSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        careerId: "barca-career-1",
        seasonId: "season-1",
        playerId: "yamal-19",
        direction: "exit",
        transferType: "Venda",
        clubName: "Paris Saint-Germain",
      }),
    );
  });

  it("ao editar uma saída por empréstimo, exibe a mesma tela de empréstimo de jogador com dados preenchidos e 'Salvar Alterações'", async () => {
    const loanPlayer: Players = {
      id: "fati-10",
      name: "Ansu Fati",
      age: 21,
      overall: 79,
      position: "PE",
      sector: "Ataque",
      nation: "ESP",
      contract: [
        {
          buyValue: 0,
          sellValue: 0,
          fromClub: "FC Barcelona",
          dataArrival: new Date("2024-07-01"),
          dataExit: new Date("2024-07-15"),
          leftClub: "Sevilla FC",
          isLoan: true,
          loanDuration: 1,
          wagePercentage: 40,
          timing: "Imediata",
          loanTerms: {
            durationYears: 1,
            theirWagePercentage: 40,
            ourWagePercentage: 60,
            hasBuyOption: false,
          },
        },
      ],
    } as unknown as Players;

    const router = createMemoryRouter([
      {
        path: "/",
        element: (
          <ThemeProvider>
            <ActiveSectionScreen
              career={barcaCareer}
              season={barcaSeason}
              screen={{
                key: "transferPlayer",
                playerId: loanPlayer.id,
                editTransfer: {
                  player: loanPlayer,
                  contract: loanPlayer.contract![0],
                  contractIndex: 0,
                  direction: "exit",
                },
              }}
              onClose={vi.fn()}
            />
          </ThemeProvider>
        ),
      },
    ]);

    render(<RouterProvider router={router} />);

    // Nome no cabeçalho
    expect(screen.getAllByText("Ansu Fati")[0]).toBeDefined();

    // Sem "Próximo"
    expect(screen.queryByText("Próximo")).toBeNull();

    // Botão é "Salvar Alterações"
    expect(screen.getByText("Salvar Alterações")).toBeDefined();

    // Clube de destino preenchido
    const clubInput = screen.getByPlaceholderText("Ex: Barcelona") as HTMLInputElement;
    expect(clubInput.value).toBe("Sevilla FC");

    // Campos de empréstimo preenchidos
    const durationInput = screen.getByPlaceholderText("Ex: 1, 2") as HTMLInputElement;
    expect(durationInput.value).toBe("1");

    const wageInput = screen.getByPlaceholderText("Ex: 40, 45") as HTMLInputElement;
    expect(wageInput.value).toBe("40");
  });

  it("ao editar uma chegada (compra), exibe a mesma tela de adicionar transferência com 'Salvar Alterações'", async () => {
    const arrivalPlayer: Players = {
      id: "olmo-20",
      name: "Dani Olmo",
      age: 26,
      overall: 84,
      position: "MEI",
      sector: "Meio-Campo",
      nation: "ESP",
      contract: [
        {
          dataArrival: new Date("2024-08-09"),
          fromClub: "RB Leipzig",
          leftClub: "",
          sellValue: 0,
          buyValue: 55000000,
          salary: 150000,
          timing: "Imediata",
        },
      ],
    } as unknown as Players;

    const router = createMemoryRouter([
      {
        path: "/",
        element: (
          <ThemeProvider>
            <ActiveSectionScreen
              career={barcaCareer}
              season={barcaSeason}
              screen={{
                key: "addTransferPlayer",
                editTransfer: {
                  player: arrivalPlayer,
                  contract: arrivalPlayer.contract![0],
                  contractIndex: 0,
                },
              }}
              onClose={vi.fn()}
            />
          </ThemeProvider>
        ),
      },
    ]);

    render(<RouterProvider router={router} />);

    // Nome do atleta no cabeçalho
    expect(screen.getAllByText("Dani Olmo")[0]).toBeDefined();

    // Botão é "Salvar Alterações" e NÃO "Próximo"
    expect(screen.getByText("Salvar Alterações")).toBeDefined();
    expect(screen.queryByText("Próximo")).toBeNull();

    // Manutenção presente para reversão
    expect(
      screen.getByText("Desfazer essa transferência?"),
    ).toBeDefined();
  });
});
