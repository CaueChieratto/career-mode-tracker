// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { PlayerWorkspace } from "../pages/Academy/layouts/AcademyContent/components/Player/views/PlayerWorkspace";
import { useAcademyContext } from "../pages/Academy/layouts/contexts/AcademyContext/hooks/useAcademyContext";
import { AcademyPlayers } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyPlayers/AcademyPlayers";
import { AcademyTournaments } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyTournaments";
import { Career } from "../common/interfaces/Career";

afterEach(cleanup);

vi.mock(
  "../pages/Academy/layouts/contexts/AcademyContext/hooks/useAcademyContext",
  () => ({
    useAcademyContext: vi.fn(),
  }),
);

const mockPlayer: AcademyPlayers = {
  id: "p1",
  name: "Jamie Ibarra",
  position: "PD",
  age: 17,
  nationality: "URU",
  height: 173,
  weight: 69,
  overall: 67,
  potential: 85,
  status: "academy",
  evolutionHistory: [],
  shirtNumber: 7,
};

const mockCareer: Career = {
  id: "c1",
  clubName: "Newell’s Old Boys",
  nation: "Argentina",
  createdAt: new Date("2024-01-01"),
  clubData: [],
  academy: {
    tournament: "Copa Jorge Griffa",
    nickname: "La Lepra",
  },
} as unknown as Career;

const mockTournaments: AcademyTournaments[] = [
  {
    id: "t1",
    name: "Copa Jorge Griffa - 1ª Edição",
    date: "01/08/2024",
    totalMatches: 1,
    isChampion: true,
    tournamentResult: "Campeão",
    matches: [
      {
        id: "m1",
        date: "01/08/2024",
        opponentTeam: "Talleres",
        userGoals: 2,
        opponentGoals: 0,
        status: "Final",
        result: "FINISHED",
        lineup: [
          {
            playerId: "p1",
            playerName: "Jamie Ibarra",
            rating: 7.5,
            goals: 1,
            assists: 1,
            defesas: null,
            cleanSheets: null,
          },
        ],
      },
    ],
  },
];

describe("PlayerWorkspace — Copiar jogador", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.alert = vi.fn();
    (useAcademyContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isGeral: false,
      career: mockCareer,
      tournamentsAcademy: mockTournaments,
      allTournamentsAcademy: mockTournaments,
    });
  });

  it("renderiza o botão 'Copiar jogador' com subtítulo 'Toque para copiar' posicionado abaixo de 'Acompanhar Desempenho'", () => {
    render(<PlayerWorkspace selectedPlayer={mockPlayer} />);

    expect(screen.getByText("Copiar jogador")).toBeTruthy();
    expect(screen.getByText("Toque para copiar")).toBeTruthy();
    expect(screen.getByText("Acompanhar Desempenho")).toBeTruthy();

    const titles = screen
      .getAllByText(
        /(Gerenciar Jogador|Adicionar Anotação|Ver Anotações|Acompanhar Desenvolvimento|Acompanhar Desempenho|Copiar jogador)/,
      )
      .map((el) => el.textContent);

    const perfIndex = titles.indexOf("Acompanhar Desempenho");
    const copyIndex = titles.indexOf("Copiar jogador");

    expect(perfIndex).toBeGreaterThan(-1);
    expect(copyIndex).toBeGreaterThan(-1);
    expect(copyIndex).toBeGreaterThan(perfIndex);
  });

  it("ao clicar em 'Copiar jogador', copia os dados formatados e exibe feedback temporário", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
    // @ts-expect-error test override
    window.isSecureContext = true;

    render(<PlayerWorkspace selectedPlayer={mockPlayer} />);

    const copyBtn = screen.getByText("Copiar jogador");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    const copiedArg = writeTextMock.mock.calls[0][0];
    expect(copiedArg).toBe(
      "Jamie Ibarra, PD, 17 anos, URU, 173cm e 69kg, 1 Jogo, 2 G/A, 1 Gol, 1 Assistência, 7.50, Campeão 1 vez de Copa Jorge Griffa.",
    );

    await waitFor(() => {
      expect(screen.getByText("Copiado com sucesso!")).toBeTruthy();
    });
  });
});
