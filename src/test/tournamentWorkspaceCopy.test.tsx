// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { TournamentWorkspace } from "../pages/Academy/layouts/AcademyContent/components/Tournament/views/TournamentWorkspace";
import { useAcademyContext } from "../pages/Academy/layouts/contexts/AcademyContext/hooks/useAcademyContext";
import { AcademyTournaments } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyTournaments";
import { Career } from "../common/interfaces/Career";

afterEach(cleanup);

vi.mock("../pages/Academy/layouts/contexts/AcademyContext/hooks/useAcademyContext", () => ({
  useAcademyContext: vi.fn(),
}));

const mockTournament: AcademyTournaments = {
  id: "t1",
  name: "Copa Jorge Griffa - 4ª Edição",
  date: "01/08/2024",
  totalMatches: 1,
  isChampion: false,
  tournamentResult: "Em andamento",
  matches: [
    {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Talleres",
      userGoals: 2,
      opponentGoals: 0,
      status: "Quartas de Final",
      result: "FINISHED",
      lineup: [
        {
          playerId: "p1",
          playerName: "Lucas Blanco",
          rating: 8.6,
          goals: 2,
          assists: 0,
          defesas: null,
          cleanSheets: null,
        },
      ],
    },
  ],
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

describe("TournamentWorkspace — Copiar Torneio", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.alert = vi.fn();
    (useAcademyContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isGeral: false,
      career: mockCareer,
      allPlayersAcademy: [
        {
          id: "p1",
          name: "Lucas Blanco",
          position: "ATA",
          age: 17,
          overall: 65,
          potential: 80,
          status: "academy",
          evolutionHistory: [],
          shirtNumber: 10,
        },
      ],
    });
  });

  it("renderiza o botão 'Copiar Torneio' com subtítulo 'Toque para copiar' posicionado acima de 'Gerenciar Torneio'", () => {
    render(<TournamentWorkspace selectedTournament={mockTournament} />);

    expect(screen.getByText("Copiar Torneio")).toBeTruthy();
    expect(screen.getByText("Toque para copiar")).toBeTruthy();
    expect(screen.getByText("Gerenciar Torneio")).toBeTruthy();

    const titles = screen.getAllByText(/(Adicionar Partidas|Ver Partidas|Copiar Torneio|Gerenciar Torneio)/).map((el) => el.textContent);
    const copyIndex = titles.indexOf("Copiar Torneio");
    const manageIndex = titles.indexOf("Gerenciar Torneio");
    expect(copyIndex).toBeGreaterThan(-1);
    expect(manageIndex).toBeGreaterThan(-1);
    expect(copyIndex).toBeLessThan(manageIndex);
  });

  it("ao clicar em 'Copiar Torneio', copia texto formatado e atualiza feedback temporário", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
    // @ts-expect-error test override
    window.isSecureContext = true;

    render(<TournamentWorkspace selectedTournament={mockTournament} />);

    const copyBtn = screen.getByText("Copiar Torneio");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    const copiedArg = writeTextMock.mock.calls[0][0];
    expect(copiedArg).toContain("4ª edição da Copa Jorge Griffa {");
    expect(copiedArg).toContain("QUARTAS DE FINAL {");
    expect(copiedArg).toContain("Newell’s Old Boys 2 x 0 Talleres");
    expect(copiedArg).toContain("• Lucas Blanco — nota 8,6; 2 gols.");

    await waitFor(() => {
      expect(screen.getByText("Copiado com sucesso!")).toBeTruthy();
    });
  });
});
