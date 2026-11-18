import { describe, expect, it } from "vitest";
import { evaluateTournamentStatus } from "../pages/Academy/layouts/AcademyContent/components/Tournament/helpers/evaluateTournamentStatus";
import type { AcademyMatches } from "../common/interfaces/AcademyData/AcademyTournaments";

describe("evaluateTournamentStatus (La Masia - FC Barcelona)", () => {
  it("retorna 'Torneio Marcado' quando a lista de partidas esta vazia", () => {
    const result = evaluateTournamentStatus([]);

    expect(result).toEqual({
      isFinished: false,
      isChampion: false,
      tournamentResult: "Torneio Marcado",
    });
  });

  it("retorna 'Torneio Marcado' quando todas as partidas estao apenas agendadas (SCHEDULED)", () => {
    const matches: AcademyMatches[] = [
      {
        id: "m_barca_ajax_sub19",
        date: "2024-08-10",
        opponentTeam: "AFC Ajax Sub-19",
        userGoals: undefined,
        opponentGoals: undefined,
        status: "Fase de Grupos",
        result: "SCHEDULED",
        lineup: [],
      },
    ];

    const result = evaluateTournamentStatus(matches);

    expect(result).toEqual({
      isFinished: false,
      isChampion: false,
      tournamentResult: "Torneio Marcado",
    });
  });

  it("mantem 'Em andamento' na fase de grupos mesmo em caso de derrota", () => {
    const matches: AcademyMatches[] = [
      {
        id: "m_group_1",
        date: "2024-08-10",
        opponentTeam: "SL Benfica Sub-19",
        userGoals: 1,
        opponentGoals: 2,
        status: "Fase de Grupos",
        result: "FINISHED",
        lineup: [],
      },
    ];

    const result = evaluateTournamentStatus(matches);

    expect(result).toEqual({
      isFinished: false,
      isChampion: false,
      tournamentResult: "Em andamento",
    });
  });

  it("define 'Eliminado' quando o FC Barcelona perde em fase eliminatoria (Semifinal)", () => {
    const matches: AcademyMatches[] = [
      {
        id: "m_group_1",
        date: "2024-08-10",
        opponentTeam: "SL Benfica Sub-19",
        userGoals: 3,
        opponentGoals: 1,
        status: "Fase de Grupos",
        result: "FINISHED",
        lineup: [],
      },
      {
        id: "m_semi",
        date: "2024-08-14",
        opponentTeam: "Chelsea FC Sub-19",
        userGoals: 0,
        opponentGoals: 2,
        status: "Semifinal",
        result: "FINISHED",
        lineup: [],
      },
    ];

    const result = evaluateTournamentStatus(matches);

    expect(result).toEqual({
      isFinished: true,
      isChampion: false,
      tournamentResult: "Eliminado",
    });
  });

  it("consagra 'Campeão' quando o FC Barcelona vence a Final", () => {
    const matches: AcademyMatches[] = [
      {
        id: "m_semi",
        date: "2024-08-14",
        opponentTeam: "Chelsea FC Sub-19",
        userGoals: 2,
        opponentGoals: 1,
        status: "Semifinal",
        result: "FINISHED",
        lineup: [],
      },
      {
        id: "m_final",
        date: "2024-08-18",
        opponentTeam: "Sporting CP Sub-19",
        userGoals: 3,
        opponentGoals: 1,
        status: "Final",
        result: "FINISHED",
        lineup: [],
      },
    ];

    const result = evaluateTournamentStatus(matches);

    expect(result).toEqual({
      isFinished: true,
      isChampion: true,
      tournamentResult: "Campeão",
    });
  });

  it("define 'Vice-Campeão' quando o FC Barcelona e derrotado na Final", () => {
    const matches: AcademyMatches[] = [
      {
        id: "m_final",
        date: "2024-08-18",
        opponentTeam: "Bayern München Sub-19",
        userGoals: 1,
        opponentGoals: 2,
        status: "Final",
        result: "FINISHED",
        lineup: [],
      },
    ];

    const result = evaluateTournamentStatus(matches);

    expect(result).toEqual({
      isFinished: true,
      isChampion: false,
      tournamentResult: "Vice-Campeão",
    });
  });

  it("trata desempate por penaltis com vitoria na Final consagrando Campeão", () => {
    const matches: AcademyMatches[] = [
      {
        id: "m_final_penalties",
        date: "2024-08-18",
        opponentTeam: "PSG Sub-19",
        userGoals: 2,
        opponentGoals: 2,
        userPenalties: 5,
        opponentPenalties: 4,
        status: "Final",
        result: "FINISHED",
        lineup: [],
      },
    ];

    const result = evaluateTournamentStatus(matches);

    expect(result).toEqual({
      isFinished: true,
      isChampion: true,
      tournamentResult: "Campeão",
    });
  });

  it("trata desempate por penaltis com derrota na Final resultando em Vice-Campeão", () => {
    const matches: AcademyMatches[] = [
      {
        id: "m_final_penalties_loss",
        date: "2024-08-18",
        opponentTeam: "Juventus Sub-19",
        userGoals: 1,
        opponentGoals: 1,
        userPenalties: 3,
        opponentPenalties: 4,
        status: "Final",
        result: "FINISHED",
        lineup: [],
      },
    ];

    const result = evaluateTournamentStatus(matches);

    expect(result).toEqual({
      isFinished: true,
      isChampion: false,
      tournamentResult: "Vice-Campeão",
    });
  });

  it("trata desempate por penaltis com derrota na Semifinal resultando em Eliminado", () => {
    const matches: AcademyMatches[] = [
      {
        id: "m_semi_penalties_loss",
        date: "2024-08-14",
        opponentTeam: "FC Porto Sub-19",
        userGoals: 0,
        opponentGoals: 0,
        userPenalties: 4,
        opponentPenalties: 5,
        status: "Semifinal",
        result: "FINISHED",
        lineup: [],
      },
    ];

    const result = evaluateTournamentStatus(matches);

    expect(result).toEqual({
      isFinished: true,
      isChampion: false,
      tournamentResult: "Eliminado",
    });
  });
});
