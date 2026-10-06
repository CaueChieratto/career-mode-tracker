import { describe, expect, it } from "vitest";
import { buildFormFields } from "../pages/Match/components/MatchDetailsTab/views/AddDetails/helpers/buildFormFields";

describe("buildFormFields - Opponent Cards Layout", () => {
  const getDisciplineSection = (booleanValues: Record<string, boolean>) => {
    const sections = buildFormFields(
      false, // hasExtraTime
      false, // hasPenalties
      0, // opponentScore
      1, // opponentCardCount
      0, // opponentOwnGoalCount
      0, // userScore
      [], // goalOptions
      booleanValues,
    );
    return sections.find((s) => s.title === "Eventos do Adversário - Disciplina");
  };

  it("sem cartão selecionado: jogador em linha única e checkboxes abaixo", () => {
    const section = getDisciplineSection({});
    expect(section).toBeDefined();
    const rows = section!.fields;

    // Linha 1: apenas Jogador
    expect(rows[0].map((f) => f.id)).toEqual(["opponentCardPlayer_0"]);
    // Linha 2: Checkboxes [Amarelo, Vermelho]
    expect(rows[1].map((f) => f.id)).toEqual(["opponentYellow_0", "opponentRed_0"]);
    expect(rows).toHaveLength(2);
  });

  it("amarelo selecionado: jogador e minuto lado a lado, checkboxes abaixo", () => {
    const section = getDisciplineSection({ opponentYellow_0: true });
    expect(section).toBeDefined();
    const rows = section!.fields;

    // Linha 1: [Jogador, Minuto 1º Amarelo] lado a lado
    expect(rows[0].map((f) => f.id)).toEqual([
      "opponentCardPlayer_0",
      "opponentYellowMin_0",
    ]);
    // Linha 2: Checkboxes [Amarelo, 2º Amarelo, Vermelho]
    expect(rows[1].map((f) => f.id)).toEqual([
      "opponentYellow_0",
      "opponentSecondYellow_0",
      "opponentRed_0",
    ]);
    expect(rows).toHaveLength(2);
  });

  it("segundo amarelo selecionado: jogador e 1º amarelo lado a lado, 2º amarelo abaixo, checkboxes abaixo", () => {
    const section = getDisciplineSection({
      opponentYellow_0: true,
      opponentSecondYellow_0: true,
    });
    expect(section).toBeDefined();
    const rows = section!.fields;

    // Linha 1: [Jogador, Minuto 1º Amarelo] lado a lado
    expect(rows[0].map((f) => f.id)).toEqual([
      "opponentCardPlayer_0",
      "opponentYellowMin_0",
    ]);
    // Linha 2: [Minuto 2º Amarelo] abaixo dos dois
    expect(rows[1].map((f) => f.id)).toEqual(["opponentSecondYellowMin_0"]);
    // Linha 3: Checkboxes
    expect(rows[2].map((f) => f.id)).toEqual([
      "opponentYellow_0",
      "opponentSecondYellow_0",
      "opponentRed_0",
    ]);
    expect(rows).toHaveLength(3);
  });

  it("vermelho direto selecionado: jogador e minuto do vermelho lado a lado", () => {
    const section = getDisciplineSection({ opponentRed_0: true });
    expect(section).toBeDefined();
    const rows = section!.fields;

    // Linha 1: [Jogador, Minuto C. Vermelho] lado a lado
    expect(rows[0].map((f) => f.id)).toEqual([
      "opponentCardPlayer_0",
      "opponentRedMin_0",
    ]);
    // Linha 2: Checkboxes [Amarelo, Vermelho]
    expect(rows[1].map((f) => f.id)).toEqual(["opponentYellow_0", "opponentRed_0"]);
    expect(rows).toHaveLength(2);
  });

  it("amarelo e vermelho selecionados juntos: jogador e 1º amarelo lado a lado, vermelho abaixo", () => {
    const section = getDisciplineSection({
      opponentYellow_0: true,
      opponentRed_0: true,
    });
    expect(section).toBeDefined();
    const rows = section!.fields;

    // Linha 1: [Jogador, Minuto 1º Amarelo] lado a lado
    expect(rows[0].map((f) => f.id)).toEqual([
      "opponentCardPlayer_0",
      "opponentYellowMin_0",
    ]);
    // Linha 2: [Minuto C. Vermelho] abaixo dos dois
    expect(rows[1].map((f) => f.id)).toEqual(["opponentRedMin_0"]);
    // Linha 3: Checkboxes
    expect(rows[2].map((f) => f.id)).toEqual([
      "opponentYellow_0",
      "opponentSecondYellow_0",
      "opponentRed_0",
    ]);
    expect(rows).toHaveLength(3);
  });
});
