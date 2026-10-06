import { describe, expect, it } from "vitest";
import { buildOpponentEvents } from "../pages/Match/components/MatchDetailsTab/views/AddDetails/helpers/buildOpponentEvents";
import { buildMatchPayload } from "../pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/buildMatchPayload";
import { Match } from "../common/interfaces/Match";

describe("buildOpponentEvents e buildMatchPayload com playerId", () => {
  it("buildOpponentEvents associa playerId para gols, assistências, cartões e gols contra", () => {
    const formValues: Record<string, string> = {
      opponentGoalPlayer_0: "Vini Jr",
      opponentGoalMinute_0: "25",
      opponentAssistPlayer_0: "Modric",
      opponentAssistTo_0: "Gol 1",
      opponentCardPlayer_0: "Rüdiger",
      opponentYellowMin_0: "44",
      opponentCardPlayer_1: "Militão",
      opponentRedMin_1: "75",
      opponentOwnGoalPlayer_0: "Carvajal",
      opponentOwnGoalMinute_0: "90",
    };

    const booleanValues: Record<string, boolean> = {
      opponentYellow_0: true,
      opponentRed_1: true,
    };

    const playerMap = new Map<string, string>([
      ["vini jr", "id-vini"],
      ["modric", "id-modric"],
      ["rüdiger", "id-rudiger"],
      ["militão", "id-militao"],
      ["carvajal", "id-carvajal"],
    ]);

    const events = buildOpponentEvents(
      1, // 1 gol
      2, // 2 cartões
      1, // 1 gol contra
      formValues,
      booleanValues,
      playerMap,
    );

    expect(events.goals).toEqual([
      { player: "Vini Jr", minute: "25", playerId: "id-vini" },
    ]);
    expect(events.assists).toEqual([
      { player: "Modric", goalReference: "Gol 1", playerId: "id-modric" },
    ]);
    expect(events.cards).toEqual([
      {
        player: "Rüdiger",
        yellow: true,
        yellowMinute: "44",
        secondYellow: false,
        secondYellowMinute: "",
        red: false,
        redMinute: "",
        playerId: "id-rudiger",
      },
      {
        player: "Militão",
        yellow: false,
        yellowMinute: "",
        secondYellow: false,
        secondYellowMinute: "",
        red: true,
        redMinute: "75",
        playerId: "id-militao",
      },
    ]);
    expect(events.ownGoals).toEqual([
      { player: "Carvajal", minute: "90", playerId: "id-carvajal" },
    ]);
  });

  it("buildOpponentEvents preserva player como string mesmo se playerId não for encontrado", () => {
    const formValues: Record<string, string> = {
      opponentGoalPlayer_0: "Jogador Desconhecido",
      opponentGoalMinute_0: "12",
    };

    const events = buildOpponentEvents(1, 0, 0, formValues, {});

    expect(events.goals).toEqual([
      { player: "Jogador Desconhecido", minute: "12" },
    ]);
  });

  it("buildMatchPayload propaga playerMap para eventos do oponente e MVP", () => {
    const match: Match = {
      id: "m1",
      homeTeam: "Meu Time",
      awayTeam: "Real Madrid",
    } as unknown as Match;

    const formValues: Record<string, string> = {
      homeScore: "2",
      awayScore: "1",
      opponentMvpName: "Courtois",
      opponentMvpRating: "8.5",
      opponentGoalPlayer_0: "Mbappé",
      opponentGoalMinute_0: "15",
    };

    const booleanValues: Record<string, boolean> = {};

    const playerMap = new Map<string, string>([
      ["courtois", "id-courtois"],
      ["mbappé", "id-mbappe"],
    ]);

    const { updatedMatch, userResult } = buildMatchPayload(
      match,
      formValues,
      booleanValues,
      true, // isUserHome
      playerMap,
    );

    expect(userResult).toBe("V");
    expect(updatedMatch.opponentMvpName).toBe("Courtois");
    expect(updatedMatch.opponentMvpPlayerId).toBe("id-courtois");
    expect(updatedMatch.opponentEvents?.goals).toEqual([
      { player: "Mbappé", minute: "15", playerId: "id-mbappe" },
    ]);
  });
});

