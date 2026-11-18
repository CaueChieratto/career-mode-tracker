// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import ManageClauses from "../layout/SectionView/features/ClubTabs/FinanceTab/views/ManageClauses";
import { PlayersContractService } from "../common/services/ServicePlayers/PlayersContractService";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/Career/c_barca/Season/s_2025" }),
    useNavigate: () => vi.fn(),
    useParams: () => ({ careerId: "c_barca", seasonId: "s_2025" }),
  };
});

vi.mock("../contexts/SeasonThemeContext", () => ({
  SeasonThemeContext: React.createContext({
    clubColor: "#004d98",
    darkClubColor: "#a50044",
    activeStyle: {
      backgroundColor: "#004d98",
      color: "#ffffff",
      fontWeight: 600,
      border: "1px solid #a50044",
    },
    career: {} as Career,
    changeClubColor: vi.fn(),
  }),
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    darkClubColor: "#a50044",
    activeStyle: {
      backgroundColor: "#004d98",
      color: "#ffffff",
    },
  }),
}));

vi.mock("../common/hooks/Seasons/UseSeasonTheme", () => ({
  useSeasonTheme: () => ({
    clubColor: "#004d98",
    darkClubColor: "#a50044",
    activeStyle: {
      backgroundColor: "#004d98",
      color: "#ffffff",
    },
  }),
}));

vi.mock("../components/HeaderSeason", () => ({
  default: ({
    titleText,
    backSeasons,
    isPlayer,
    player,
  }: {
    titleText: string;
    backSeasons: () => void;
    isPlayer?: boolean;
    player?: Players;
  }) => (
    <header data-testid="header-season">
      <h1>{titleText}</h1>
      {isPlayer && player && (
        <span data-testid="header-player-name">{player.name}</span>
      )}
      <button type="button" onClick={backSeasons}>
        Voltar Header
      </button>
    </header>
  ),
}));

describe("Telas Dedicadas de Cláusulas e Fluxo de Chegadas (Padrão FC Barcelona)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const barcaCareer: Career = {
    id: "c_barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    teamBadge: "https://example.com/barca.png",
    currency: "EUR",
    nation: "ESP",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    createdAt: new Date("2025-07-01"),
    updatedAt: Date.now(),
    clubData: [],
  };

  const daniOlmoNoClauses: Players = {
    id: "p_dani_olmo",
    name: "Dani Olmo",
    position: "MEI",
    sector: "Meio-Campo",
    age: 26,
    nation: "ESP",
    overall: 86,
    shirtNumber: "20",
    salary: 180000,
    contractTime: 5,
    contractUntil: "30/06/2030",
    buy: true,
    sell: false,
    captain: false,
    ballonDor: 0,
    statsLeagues: [],
    contract: [
      {
        fromClub: "RB Leipzig",
        leftClub: "",
        buyValue: 55000000,
        sellValue: 0,
        dataArrival: new Date("2025-08-10"),
        isLoan: false,
        salary: 180000,
        contractTime: 5,
        contractUntil: "30/06/2030",
      },
    ],
  };

  const nicoWilliamsWithClauses: Players = {
    id: "p_nico_williams",
    name: "Nico Williams",
    position: "PE",
    sector: "Ataque",
    age: 22,
    nation: "ESP",
    overall: 85,
    shirtNumber: "11",
    salary: 200000,
    contractTime: 5,
    contractUntil: "30/06/2030",
    buy: true,
    sell: false,
    captain: false,
    ballonDor: 0,
    statsLeagues: [],
    contract: [
      {
        fromClub: "Athletic Club",
        leftClub: "",
        buyValue: 58000000,
        sellValue: 0,
        dataArrival: new Date("2025-08-01"),
        isLoan: false,
        salary: 200000,
        contractTime: 5,
        contractUntil: "30/06/2030",
        bonuses: [
          {
            id: "b_club_nico",
            direction: "payable",
            category: "objective",
            name: "Vencer La Liga",
            value: 5000000,
            partnerClub: "Athletic Club",
            status: "pending",
          },
          {
            id: "b_player_nico",
            direction: "payable",
            category: "performance",
            name: "20 Gols",
            value: 2000000,
            partnerClub: "",
            status: "pending",
          },
        ],
        contractClauses: {
          releaseClause: 500000000,
        },
        contractDetails: {
          weeklyWage: 200000,
          durationYears: 5,
          releaseClause: 500000000,
          agentFee: 3000000,
          performanceBonuses: [
            {
              id: "b_player_nico",
              direction: "payable",
              category: "performance",
              name: "20 Gols",
              value: 2000000,
              partnerClub: "",
              status: "pending",
            },
          ],
        },
      },
    ],
  };

  const ferranTorresExit: Players = {
    id: "p_ferran_torres",
    name: "Ferran Torres",
    position: "PD",
    sector: "Ataque",
    age: 25,
    nation: "ESP",
    overall: 82,
    shirtNumber: "7",
    salary: 150000,
    contractTime: 3,
    buy: false,
    sell: true,
    captain: false,
    ballonDor: 0,
    statsLeagues: [],
    contract: [
      {
        fromClub: "Manchester City",
        leftClub: "Aston Villa",
        buyValue: 0,
        sellValue: 35000000,
        dataArrival: null,
        dataExit: new Date("2025-08-15"),
        timing: "Imediata",
        isLoan: false,
      },
    ],
  };

  const makeSeason = (players: Players[]): ClubData => ({
    id: "s_2025",
    seasonNumber: 1,
    players,
    matches: [],
  });

  it("1. Saídas: clicar em 'Adicionar Cláusulas' abre tela dedicada 'Cláusulas do Clube' com módulo '0. Data de Saída & Taxa de Transferência' e salva via Navbar", async () => {
    const editTransferSpy = vi
      .spyOn(PlayersContractService, "editTransferInSeason")
      .mockResolvedValue(undefined);

    render(
      <ManageClauses
        career={barcaCareer}
        season={makeSeason([ferranTorresExit])}
        initialTab="exit"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Adicionar Cláusulas/i }),
    );

    // Tela dedicada com HeaderSeason do jogador e Navbar salvando
    expect(screen.getByText("Cláusulas do Clube")).toBeTruthy();
    expect(screen.getByTestId("header-player-name").textContent).toBe(
      "Ferran Torres",
    );
    expect(screen.getByText("Salvar Cláusulas")).toBeTruthy();

    // Módulo 0 presente
    expect(
      screen.getByText("0. Data de Saída & Taxa de Transferência"),
    ).toBeTruthy();

    // Abre o drawer do módulo 0 e altera a taxa para 42M
    fireEvent.click(screen.getByTestId("modular-card-transfer-details"));
    const drawer = screen.getByRole("dialog", {
      name: "Data de Saída & Taxa de Transferência",
    });
    const feeInput = within(drawer).getByPlaceholderText("Ex: 150k, 50M");
    fireEvent.change(feeInput, { target: { value: "42M" } });

    // Concluir aplica localmente sem salvar no Firestore
    fireEvent.click(within(drawer).getByRole("button", { name: /^Concluir$/i }));
    expect(editTransferSpy).not.toHaveBeenCalled();

    // Salvar Cláusulas no Navbar persiste com o novo valor
    fireEvent.click(screen.getByText("Salvar Cláusulas"));

    await waitFor(() => {
      expect(editTransferSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          careerId: "c_barca",
          seasonId: "s_2025",
          playerId: "p_ferran_torres",
          direction: "exit",
          transferValue: "42M",
        }),
      );
    });
  });

  it("2. Chegadas ('Adicionar Cláusulas'): mostra card de escolha com Voltar à esquerda, 'Cláusulas do Clube' e 'Termos do Atleta', sem ir direto para salvar", () => {
    render(
      <ManageClauses
        career={barcaCareer}
        season={makeSeason([daniOlmoNoClauses])}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Adicionar Cláusulas/i }),
    );

    // Permanece em Cláusulas Contratuais exibindo o card com os 3 botões
    expect(screen.getByText("Cláusulas Contratuais")).toBeTruthy();
    expect(screen.queryByText("Salvar Cláusulas")).toBeNull();
    expect(screen.queryByText("Salvar Termos")).toBeNull();

    const backBtn = screen.getByTestId("btn-choose-scope-back");
    const clubBtn = screen.getByTestId("btn-choose-club-clauses");
    const playerBtn = screen.getByTestId("btn-choose-player-terms");

    expect(backBtn.className).toContain("btnBackLeft");
    expect(clubBtn.textContent).toContain("Cláusulas do Clube");
    expect(playerBtn.textContent).toContain("Termos do Atleta");

    // Escolhe 'Cláusulas do Clube' -> vai para tela dedicada com 5 módulos do clube
    fireEvent.click(clubBtn);
    expect(screen.getByText("Cláusulas do Clube")).toBeTruthy();
    expect(screen.getByText("Salvar Cláusulas")).toBeTruthy();
    expect(
      screen.getByText("0. Momento & Taxa de Transferência"),
    ).toBeTruthy();
    expect(screen.getByText("1. Parcelamento")).toBeTruthy();
    expect(screen.queryByText("1. Informações do Contrato")).toBeNull();

    // Clicar em Voltar no header volta para o card de escolha
    fireEvent.click(screen.getByRole("button", { name: "Voltar Header" }));
    expect(screen.getByTestId("btn-choose-player-terms")).toBeTruthy();

    // Escolhe 'Termos do Atleta' -> vai para tela dedicada com os 3 módulos do atleta
    fireEvent.click(screen.getByTestId("btn-choose-player-terms"));
    expect(screen.getByText("Termos do Atleta")).toBeTruthy();
    expect(screen.getByText("Salvar Termos")).toBeTruthy();
    expect(screen.getByText("1. Informações do Contrato")).toBeTruthy();
    expect(screen.getByText("2. Bônus & Metas")).toBeTruthy();
    expect(screen.getByText("3. Cláusulas Especiais")).toBeTruthy();
    expect(screen.queryByText("1. Parcelamento")).toBeNull();
  });

  it("3. Chegadas ('Termos do Atleta'): exibe módulo '1. Informações do Contrato' com taxa de agência e salva preservando cláusulas do clube", async () => {
    const editTransferSpy = vi
      .spyOn(PlayersContractService, "editTransferInSeason")
      .mockResolvedValue(undefined);

    render(
      <ManageClauses
        career={barcaCareer}
        season={makeSeason([nicoWilliamsWithClauses])}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    // Chegada que já tem cláusulas -> clicar em Editar também mostra o card de escolha
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));
    expect(screen.getByTestId("btn-choose-club-clauses")).toBeTruthy();
    expect(screen.getByTestId("btn-choose-player-terms")).toBeTruthy();

    // Escolhe Termos do Atleta
    fireEvent.click(screen.getByTestId("btn-choose-player-terms"));
    expect(screen.getByText("Termos do Atleta")).toBeTruthy();

    // Abre Informações do Contrato e edita salário e taxa da agência
    fireEvent.click(screen.getByTestId("modular-card-contract-info"));
    const drawer = screen.getByRole("dialog", {
      name: "Informações do Contrato",
    });
    expect(within(drawer).getByText("Duração do contrato")).toBeTruthy();
    expect(within(drawer).getByText("Taxa da agência")).toBeTruthy();

    const salaryInput = within(drawer).getByPlaceholderText("Ex: 500k, 1.2M");
    const agentFeeInput = within(drawer).getByPlaceholderText("Ex: 2M, 500k");
    fireEvent.change(salaryInput, { target: { value: "250k" } });
    fireEvent.change(agentFeeInput, { target: { value: "4M" } });

    fireEvent.click(within(drawer).getByRole("button", { name: /^Concluir$/i }));
    fireEvent.click(screen.getByText("Salvar Termos"));

    await waitFor(() => {
      expect(editTransferSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: "p_nico_williams",
          direction: "arrivals",
          salary: "250k",
          agentFee: "4M",
          // Preserva o bônus do clube existente junto com o do atleta
          bonuses: expect.arrayContaining([
            expect.objectContaining({ id: "b_club_nico" }),
            expect.objectContaining({ id: "b_player_nico" }),
          ]),
        }),
      );
    });
  });

  it("4. Gerenciar: abre tela dedicada com HeaderSeason do jogador e Navbar 'Gerenciar Cláusulas'", () => {
    render(
      <ManageClauses
        career={barcaCareer}
        season={makeSeason([nicoWilliamsWithClauses])}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("btn-manage-clauses"));

    // Tela dedicada de Gerenciar Cláusulas
    expect(screen.getAllByText("Gerenciar Cláusulas").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("header-player-name").textContent).toBe(
      "Nico Williams",
    );
    // Não exibe o card de resumo nem as abas de listagem
    expect(screen.queryByTestId("transfer-card-p_nico_williams")).toBeNull();
    expect(screen.queryByText(/Renovações \(/i)).toBeNull();
    expect(
      screen.getByText("Gerenciamento Operacional de Cláusulas"),
    ).toBeTruthy();
  });

  it("5. Chegadas de 'Passes Livres': mostra card de escolha SEM o botão de 'Cláusulas do Clube', apenas 'Termos do Atleta'", () => {
    const freeAgentArrival: Players = {
      ...daniOlmoNoClauses,
      id: "p_rabiot",
      name: "Adrien Rabiot",
      contract: [
        {
          ...daniOlmoNoClauses.contract![0],
          fromClub: "Passes Livres",
          buyValue: 0,
        },
      ],
    };

    render(
      <ManageClauses
        career={barcaCareer}
        season={makeSeason([freeAgentArrival])}
        initialTab="arrivals"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Adicionar Cláusulas/i }),
    );

    // Permanece em Cláusulas Contratuais exibindo Voltar e Termos do Atleta
    expect(screen.getByText("Cláusulas Contratuais")).toBeTruthy();
    expect(screen.getByTestId("btn-choose-scope-back")).toBeTruthy();
    expect(screen.getByTestId("btn-choose-player-terms")).toBeTruthy();

    // NÃO deve exibir o botão de Cláusulas do Clube
    expect(screen.queryByTestId("btn-choose-club-clauses")).toBeNull();
    expect(screen.queryByRole("button", { name: /Cláusulas do Clube/i })).toBeNull();

    // Clicar em Termos do Atleta abre a tela dedicada de termos do jogador
    fireEvent.click(screen.getByTestId("btn-choose-player-terms"));
    expect(screen.getByText("Termos do Atleta")).toBeTruthy();
    expect(screen.getByText("Salvar Termos")).toBeTruthy();
  });
});
