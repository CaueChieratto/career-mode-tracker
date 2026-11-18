// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, afterEach, beforeAll, vi } from "vitest";
import { AddDetailsScreen } from "../pages/Match/components/MatchDetailsTab/views/AddDetails/screens/AddDetailsScreen";
import { SeasonThemeProvider } from "../contexts/SeasonThemeContext";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { MemoryRouter } from "react-router-dom";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Match } from "../common/interfaces/Match";
import { OpponentEvents } from "../common/interfaces/OpponentEventsMatches";
import { career, season, player } from "../test/factories/domain";
import { ServiceMatches } from "../common/services/ServiceMatches";
import { ServiceOpponentPlayers } from "../common/services/ServiceOpponentPlayers";

vi.mock("../common/services/ServiceMatches", () => ({
  ServiceMatches: {
    updateMatchDetailsInSeason: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../common/services/ServiceOpponentPlayers", () => ({
  ServiceOpponentPlayers: {
    getOpponentPlayers: vi.fn(),
    saveOpponentPlayers: vi.fn(),
  },
}));

describe("MatchDetailsTab - Seleção Explícita e Ex-Jogadores (FC Barcelona)", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockCareer: Career = career({
    id: "c-barca",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    colorsTeams: ["#004d98", "#a50044"],
    clubData: [
      season({
        id: "s-prev",
        seasonNumber: 1,
        players: [
          player({
            id: "ex-lionel-messi",
            name: "Lionel Messi",
            position: "RW",
            overall: 90,
            age: 37,
            nation: "Argentina",
            sell: true,
            contract: [
              {
                buyValue: 0,
                sellValue: 0,
                fromClub: "FC Barcelona",
                dataArrival: new Date("2021-07-01"),
                leftClub: "Inter Miami",
                isLoan: false,
              },
            ],
          }),
        ],
      }),
    ],
  });

  const mockSeason: ClubData = season({
    id: "s-current",
    seasonNumber: 2,
    players: [],
  });

  const baseMatch: Match = {
    matchesId: "match-1",
    date: "15/10/2026",
    league: "La Liga",
    homeTeam: "FC Barcelona",
    awayTeam: "Sevilla FC",
    result: "V",
    status: "FINISHED",
    homeScore: 3,
    awayScore: 1,
  };

  it("seleção explícita de jogador existente vincula seu ID original", async () => {
    const existingOpponents = [
      { id: "opp-pedri-homonym", name: "Pedri González", team: "Sevilla FC" },
    ];
    vi.mocked(ServiceOpponentPlayers.getOpponentPlayers).mockResolvedValue(
      existingOpponents,
    );
    vi.mocked(ServiceOpponentPlayers.saveOpponentPlayers).mockResolvedValue(
      existingOpponents,
    );

    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <SeasonThemeProvider career={mockCareer} careerId={mockCareer.id}>
            <AddDetailsScreen
              career={mockCareer}
              season={mockSeason}
              match={baseMatch}
              onClose={vi.fn()}
            />
          </SeasonThemeProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Aguarda carregar
    await waitFor(() => {
      expect(screen.getAllByText(/Sevilla FC/).length).toBeGreaterThan(0);
    });

    // O input do autor do gol do Sevilla (opponentGoalPlayer_0)
    const goalInput = container.querySelector(
      'input[name="opponentGoalPlayer_0"]',
    ) as HTMLInputElement;
    expect(goalInput).toBeDefined();

    // Abre o dropdown clicando no input e clica explicitamente na opção da lista
    fireEvent.focus(goalInput);
    fireEvent.click(goalInput);
    const option = screen.getByText("Pedri González");
    fireEvent.mouseDown(option);

    // Clica em Salvar na Navbar
    const saveButton = screen.getByText("Salvar");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(ServiceMatches.updateMatchDetailsInSeason).toHaveBeenCalled();
    });

    const callArgs = vi.mocked(ServiceMatches.updateMatchDetailsInSeason).mock.calls[0];
    const updatedMatch = callArgs[3] as Match;
    const oppGoals = (updatedMatch.opponentEvents as OpponentEvents)?.goals || [];

    expect(oppGoals).toHaveLength(1);
    expect(oppGoals[0].player).toBe("Pedri González");
    expect(oppGoals[0].playerId).toBe("opp-pedri-homonym");
  });

  it("digitação manual do mesmo nome sem clique gera novo ID independente (homônimo)", async () => {
    const existingOpponents = [
      { id: "opp-pedri-1", name: "Pedri González", team: "Sevilla FC" },
    ];
    vi.mocked(ServiceOpponentPlayers.getOpponentPlayers).mockResolvedValue(
      existingOpponents,
    );
    vi.mocked(ServiceOpponentPlayers.saveOpponentPlayers).mockImplementation(
      async (_cId, players) => {
        return players.map((p) => ({
          id: p.id || "new-id",
          name: p.name,
          team: p.team,
        }));
      },
    );

    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <SeasonThemeProvider career={mockCareer} careerId={mockCareer.id}>
            <AddDetailsScreen
              career={mockCareer}
              season={mockSeason}
              match={baseMatch}
              onClose={vi.fn()}
            />
          </SeasonThemeProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Sevilla FC/).length).toBeGreaterThan(0);
    });

    const goalInput = container.querySelector(
      'input[name="opponentGoalPlayer_0"]',
    ) as HTMLInputElement;

    // Simula digitação manual sem clique (isExplicitSelection ausente/false)
    fireEvent.change(goalInput, {
      target: {
        name: "opponentGoalPlayer_0",
        value: "Pedri González",
      },
    });

    const saveButton = screen.getByText("Salvar");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(ServiceMatches.updateMatchDetailsInSeason).toHaveBeenCalled();
    });

    const callArgs = vi.mocked(ServiceMatches.updateMatchDetailsInSeason).mock.calls[0];
    const updatedMatch = callArgs[3] as Match;
    const oppGoals = (updatedMatch.opponentEvents as OpponentEvents)?.goals || [];

    expect(oppGoals).toHaveLength(1);
    expect(oppGoals[0].player).toBe("Pedri González");
    // ID deve ser diferente de "opp-pedri-1" (novo uuid gerado)
    expect(oppGoals[0].playerId).toBeDefined();
    expect(oppGoals[0].playerId).not.toBe("opp-pedri-1");
  });

  it("ex-jogador que saiu do clube aparece como opção e é salvo com isFormerPlayer = true", async () => {
    vi.mocked(ServiceOpponentPlayers.getOpponentPlayers).mockResolvedValue([]);
    vi.mocked(ServiceOpponentPlayers.saveOpponentPlayers).mockImplementation(
      async (_cId, players) => {
        return players.map((p) => ({
          id: p.id || "id-1",
          name: p.name,
          team: p.team,
          isFormerPlayer: p.isFormerPlayer,
        }));
      },
    );

    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <SeasonThemeProvider career={mockCareer} careerId={mockCareer.id}>
            <AddDetailsScreen
              career={mockCareer}
              season={mockSeason}
              match={baseMatch}
              onClose={vi.fn()}
            />
          </SeasonThemeProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Sevilla FC/).length).toBeGreaterThan(0);
    });

    // Seleciona explicitamente o ex-jogador Lionel Messi
    const goalInput = container.querySelector(
      'input[name="opponentGoalPlayer_0"]',
    ) as HTMLInputElement;
    // Seleciona explicitamente o ex-jogador Lionel Messi na lista
    fireEvent.focus(goalInput);
    fireEvent.click(goalInput);
    const option = screen.getByText("Lionel Messi");
    fireEvent.mouseDown(option);

    const saveButton = screen.getByText("Salvar");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(ServiceMatches.updateMatchDetailsInSeason).toHaveBeenCalled();
    });

    const callArgs = vi.mocked(ServiceMatches.updateMatchDetailsInSeason).mock.calls[0];
    const updatedMatch = callArgs[3] as Match;
    const oppGoals = (updatedMatch.opponentEvents as OpponentEvents)?.goals || [];

    expect(oppGoals).toHaveLength(1);
    expect(oppGoals[0].player).toBe("Lionel Messi");
    expect(oppGoals[0].playerId).toBe("ex-lionel-messi");
    expect(oppGoals[0].isFormerPlayer).toBe(true);

    // Verifica que saveOpponentPlayers recebeu isFormerPlayer: true
    expect(ServiceOpponentPlayers.saveOpponentPlayers).toHaveBeenCalledWith(
      "c-barca",
      expect.arrayContaining([
        expect.objectContaining({
          id: "ex-lionel-messi",
          name: "Lionel Messi",
          isFormerPlayer: true,
        }),
      ]),
      undefined,
      expect.any(Object),
    );
  });

  it("ao editar partida existente já salva, preserva playerId e isFormerPlayer dos eventos intocados ao salvar", async () => {
    const existingMatch: Match = {
      ...baseMatch,
      opponentEvents: {
        goals: [
          {
            player: "Lucas Ocampos",
            minute: "35",
            playerId: "player-ocampos-1",
            isFormerPlayer: false,
          },
        ],
      },
    };

    vi.mocked(ServiceOpponentPlayers.getOpponentPlayers).mockResolvedValue([
      { id: "player-ocampos-1", name: "Lucas Ocampos", team: "Sevilla FC" },
    ]);
    vi.mocked(ServiceOpponentPlayers.saveOpponentPlayers).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ThemeProvider>
          <SeasonThemeProvider career={mockCareer} careerId={mockCareer.id}>
            <AddDetailsScreen
              career={mockCareer}
              season={mockSeason}
              match={existingMatch}
              onClose={vi.fn()}
            />
          </SeasonThemeProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Sevilla FC/).length).toBeGreaterThan(0);
    });

    // Clica direto em Salvar sem tocar no campo do jogador existente
    const saveButton = screen.getByText("Salvar");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(ServiceMatches.updateMatchDetailsInSeason).toHaveBeenCalled();
    });

    const callArgs = vi.mocked(ServiceMatches.updateMatchDetailsInSeason).mock.calls[0];
    const updatedMatch = callArgs[3] as Match;
    const oppGoals = (updatedMatch.opponentEvents as OpponentEvents)?.goals || [];

    expect(oppGoals).toHaveLength(1);
    expect(oppGoals[0].player).toBe("Lucas Ocampos");
    expect(oppGoals[0].playerId).toBe("player-ocampos-1");
  });

  it("jogador recontratado e ativo no elenco atual não é considerado ex-jogador adversário", async () => {
    // Dani Olmo foi vendido na Season 1, mas recontratado e ativo na Season 2 atual
    const careerWithRehired: Career = career({
      id: "c-barca-2",
      clubName: "FC Barcelona",
      managerName: "Hansi Flick",
      clubData: [
        season({
          id: "s-1",
          seasonNumber: 1,
          players: [
            player({
              id: "dani-olmo-id",
              name: "Dani Olmo",
              sell: true,
            }),
          ],
        }),
      ],
    });

    const seasonWithRehiredActive: ClubData = season({
      id: "s-2",
      seasonNumber: 2,
      players: [
        player({
          id: "dani-olmo-id",
          name: "Dani Olmo",
          sell: false, // Ativo no elenco do FC Barcelona!
        }),
      ],
    });

    vi.mocked(ServiceOpponentPlayers.getOpponentPlayers).mockResolvedValue([]);

    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <SeasonThemeProvider career={careerWithRehired} careerId={careerWithRehired.id}>
            <AddDetailsScreen
              career={careerWithRehired}
              season={seasonWithRehiredActive}
              match={baseMatch}
              onClose={vi.fn()}
            />
          </SeasonThemeProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Sevilla FC/).length).toBeGreaterThan(0);
    });

    const goalInput = container.querySelector(
      'input[name="opponentGoalPlayer_0"]',
    ) as HTMLInputElement;

    fireEvent.focus(goalInput);
    fireEvent.click(goalInput);

    // Dani Olmo NÃO deve aparecer no dropdown pois é jogador ativo no elenco atual
    expect(screen.queryByText("Dani Olmo")).toBeNull();
  });
});
