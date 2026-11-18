import { beforeEach, describe, expect, it } from "vitest";
import {
  ServiceOpponentPlayers,
  extractOpponentPlayersFromCareer,
} from "../common/services/ServiceOpponentPlayers";
import { auth } from "./mocks/firebaseClient";
import { getDoc, updateDoc, documentSnapshot } from "./mocks/firestore";
import { Career } from "../common/interfaces/Career";
import { buildFormFields } from "../pages/Match/components/MatchDetailsTab/views/AddDetails/helpers/buildFormFields";
import { OpponentPlayer } from "../common/interfaces/OpponentPlayer";

describe("ServiceOpponentPlayers - isolamento e persistência de adversários", () => {
  beforeEach(() => {
    auth.currentUser = { uid: "test-user" };
    getDoc.mockReset();
    updateDoc.mockReset().mockResolvedValue(undefined);
  });

  it("extractOpponentPlayersFromCareer extrai adversários de gols, assistências, cartões, gols contra e MVP", () => {
    const mockCareer: Career = {
      id: "career-1",
      clubName: "Meu Time",
      clubData: [
        {
          id: "season-1",
          seasonNumber: 1,
          matches: [
            {
              id: "match-1",
              homeTeam: "Meu Time",
              awayTeam: "Rival FC",
              opponentEvents: {
                goals: [{ player: "Atacante Rival", minute: "10" }],
                assists: [{ player: "Meia Rival", minute: "10" }],
                cards: [{ player: "Zagueiro Rival", minute: "30", cardType: "yellow" }],
                ownGoals: [{ player: "Volante Rival", minute: "40" }],
              },
              opponentMvpName: "Goleiro Rival",
            },
          ],
        },
      ],
    } as unknown as Career;

    const players = extractOpponentPlayersFromCareer(mockCareer);
    expect(players).toHaveLength(5);
    const names = players.map((p) => p.name);
    expect(names).toContain("Atacante Rival");
    expect(names).toContain("Meia Rival");
    expect(names).toContain("Zagueiro Rival");
    expect(names).toContain("Volante Rival");
    expect(names).toContain("Goleiro Rival");

    players.forEach((p) => {
      expect(p.id).toBeDefined();
      expect(p.team).toBe("Rival FC");
      expect(p.careerId).toBe("career-1");
    });
  });

  it("busca jogadores do grupo quando groupId é fornecido e grupo possui opponentPlayers", async () => {
    const groupPlayers = [
      { id: "g-p1", name: "Craque do Grupo", team: "Time A", groupId: "group-1" },
    ];

    getDoc.mockImplementation(async (...args: unknown[]) => {
      const ref = args[0] as { path: string };
      if (ref?.path?.includes("careerGroups/group-1")) {
        return documentSnapshot("group-1", { opponentPlayers: groupPlayers }, true);
      }
      return documentSnapshot("career-1", {}, false);
    });

    const result = await ServiceOpponentPlayers.getOpponentPlayers("career-1", "group-1");
    expect(result).toEqual(groupPlayers);
    expect(getDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/test-user/careerGroups/group-1" }),
    );
  });

  it("busca jogadores da carreira quando não há groupId (isolamento de carreira)", async () => {
    const careerPlayers = [
      { id: "c-p1", name: "Craque da Carreira", team: "Time B", careerId: "career-1" },
    ];

    getDoc.mockImplementation(async (...args: unknown[]) => {
      const ref = args[0] as { path: string };
      if (ref?.path?.includes("careers/career-1")) {
        return documentSnapshot("career-1", { opponentPlayers: careerPlayers }, true);
      }
      return documentSnapshot("group-1", {}, false);
    });

    const result = await ServiceOpponentPlayers.getOpponentPlayers("career-1", null);
    expect(result).toEqual(careerPlayers);
    expect(getDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/test-user/careers/career-1" }),
    );
  });

  it("salva novos jogadores no grupo quando groupId é fornecido", async () => {
    const existingGroupPlayers = [
      { id: "p1", name: "Jogador Existente", team: "Time A", groupId: "group-1" },
    ];

    getDoc.mockResolvedValue(
      documentSnapshot("group-1", { opponentPlayers: existingGroupPlayers }, true),
    );

    const saved = await ServiceOpponentPlayers.saveOpponentPlayers(
      "career-1",
      [
        { name: "Jogador Existente", team: "Time A" },
        { name: "Novo Jogador", team: "Time B" },
      ],
      "group-1",
    );

    expect(saved).toHaveLength(2);
    expect(saved[0].id).toBe("p1");
    expect(saved[1].name).toBe("Novo Jogador");
    expect(saved[1].groupId).toBe("group-1");
    expect(saved[1].careerId).toBeUndefined();

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/test-user/careerGroups/group-1" }),
      expect.objectContaining({
        opponentPlayers: expect.arrayContaining([
          expect.objectContaining({ name: "Jogador Existente" }),
          expect.objectContaining({ name: "Novo Jogador" }),
        ]),
      }),
    );
  });

  it("salva novos jogadores isolados na carreira quando groupId é null/undefined", async () => {
    getDoc.mockResolvedValue(
      documentSnapshot("career-2", { opponentPlayers: [] }, true),
    );

    const saved = await ServiceOpponentPlayers.saveOpponentPlayers(
      "career-2",
      [{ name: "Adversário Exclusivo", team: "Time C" }],
      null,
    );

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Adversário Exclusivo");
    expect(saved[0].careerId).toBe("career-2");

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/test-user/careers/career-2" }),
      expect.objectContaining({
        opponentPlayers: expect.arrayContaining([
          expect.objectContaining({ name: "Adversário Exclusivo", careerId: "career-2" }),
        ]),
      }),
    );

    // Garante que nenhuma propriedade com valor undefined seja enviada ao updateDoc
    const calls = updateDoc.mock.calls;
    const lastCallPayload = calls[calls.length - 1][1] as { opponentPlayers: unknown[] };
    lastCallPayload.opponentPlayers.forEach((playerObj) => {
      Object.entries(playerObj as Record<string, unknown>).forEach(([key, value]) => {
        expect(value, `Campo ${key} não pode ser undefined`).not.toBeUndefined();
      });
    });
  });

  it("garante que nenhum campo undefined seja enviado ao salvar em grupos com dados incompletos (sem team, etc.)", async () => {
    getDoc.mockResolvedValue(
      documentSnapshot("group-1", { opponentPlayers: [] }, true),
    );

    await ServiceOpponentPlayers.saveOpponentPlayers(
      "career-1",
      [{ name: "Adversário Sem Time" }],
      "group-1",
    );

    expect(updateDoc).toHaveBeenCalled();
    const calls = updateDoc.mock.calls;
    const lastCallPayload = calls[calls.length - 1][1] as { opponentPlayers: unknown[] };
    lastCallPayload.opponentPlayers.forEach((playerObj) => {
      Object.entries(playerObj as Record<string, unknown>).forEach(([key, value]) => {
        expect(value, `Campo ${key} não pode ser undefined`).not.toBeUndefined();
      });
    });
  });

  it("ignora strings vazias ao salvar", async () => {
    const saved = await ServiceOpponentPlayers.saveOpponentPlayers(
      "career-1",
      [{ name: "" }, { name: "   " }],
      null,
    );
    expect(saved).toEqual([]);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("suporta skipCareerWrite ao salvar em carreira individual evitando write redundante em careerRef", async () => {
    getDoc.mockResolvedValue(
      documentSnapshot("career-1", { opponentPlayers: [] }, true),
    );

    const saved = await ServiceOpponentPlayers.saveOpponentPlayers(
      "career-1",
      [{ name: "Craque sem double-write", team: "Rival FC" }],
      null,
      { skipCareerWrite: true },
    );

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Craque sem double-write");
    expect(updateDoc).not.toHaveBeenCalled();
  });

  describe("filtro contextual de adversários em buildFormFields", () => {
    const knownOpponents: OpponentPlayer[] = [
      { id: "op1", name: "Rival Striker", team: "Rival FC", createdAt: 1 },
      { id: "op2", name: "Rival Winger", team: "Rival FC", createdAt: 2 },
      { id: "op3", name: "Outro Meia", team: "Outro Clube", createdAt: 3 },
    ];

    it("campo limpo/vazio: exibe apenas os jogadores do clube adversário da partida", () => {
      const sections = buildFormFields(
        false,
        false,
        1,
        1,
        0,
        0,
        ["Gol 1"],
        {},
        "Meu Clube",
        "Rival FC",
        {},
        knownOpponents.map((p) => p.name),
        knownOpponents,
        "Rival FC",
      );

      const mvpSection = sections.find((s) => s.title === "Resultado e Tempo de Jogo");
      const mvpField = mvpSection?.fields.flat().find((f) => f.id === "opponentMvpName");

      expect(mvpField?.options).toEqual(["Rival Striker", "Rival Winger"]);
      expect(mvpField?.options).not.toContain("Outro Meia");
    });

    it("campo com digitação: expande as opções para todos os jogadores do histórico geral", () => {
      const sections = buildFormFields(
        false,
        false,
        1,
        1,
        0,
        0,
        ["Gol 1"],
        {},
        "Meu Clube",
        "Rival FC",
        { opponentMvpName: "Outro" },
        knownOpponents.map((p) => p.name),
        knownOpponents,
        "Rival FC",
      );

      const mvpSection = sections.find((s) => s.title === "Resultado e Tempo de Jogo");
      const mvpField = mvpSection?.fields.flat().find((f) => f.id === "opponentMvpName");

      expect(mvpField?.options).toEqual([
        "Rival Striker",
        "Rival Winger",
        "Outro Meia",
      ]);
    });

    it("fallback: exibe todos os jogadores quando o clube adversário não possui atletas cadastrados", () => {
      const sections = buildFormFields(
        false,
        false,
        1,
        1,
        0,
        0,
        ["Gol 1"],
        {},
        "Meu Clube",
        "Clube Inédito",
        {},
        knownOpponents.map((p) => p.name),
        knownOpponents,
        "Clube Inédito",
      );

      const mvpSection = sections.find((s) => s.title === "Resultado e Tempo de Jogo");
      const mvpField = mvpSection?.fields.flat().find((f) => f.id === "opponentMvpName");

      expect(mvpField?.options).toEqual([
        "Rival Striker",
        "Rival Winger",
        "Outro Meia",
      ]);
    });
  });
});

