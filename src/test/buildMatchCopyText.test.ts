// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { buildMatchCopyText } from "../layout/SectionView/features/ClubTabs/AllMatchesTab/components/MatchCard/helpers/buildCopyText";
import {
  career as careerFactory,
  match as matchFactory,
  lineup as lineupFactory,
} from "./factories/domain";

describe("buildMatchCopyText", () => {
  const baseCareer = careerFactory({
    clubName: "Newell’s Old Boys",
  });

  it("formata partida normal sem prorrogação e sem pênaltis", () => {
    const match = matchFactory({
      date: "02/08/2024",
      result: "V",
      homeTeam: "Newell’s Old Boys",
      awayTeam: "Unión de Santa Fé",
      homeScore: 2,
      awayScore: 0,
      homePossession: 58,
      awayPossession: 42,
      homeFinishings: 5,
      awayFinishings: 1,
      homeXG: 2.09,
      awayXG: 0.01,
      league: "Torneo Clausura",
      lineup: lineupFactory(),
    });

    const text = buildMatchCopyText({ match, career: baseCareer });
    expect(text).toContain(
      "Dia 02: Vitória 2x0 vs Unión de Santa Fé (Casa, Torneo Clausura)\nPosse: 58% | Chutes: 5x1 | xG: 2.09x0.01",
    );
  });

  it("formata partida com pênaltis no formato (PEN: 3x2)", () => {
    const match = matchFactory({
      date: "02/08/2024",
      result: "E",
      homeTeam: "Newell’s Old Boys",
      awayTeam: "Unión de Santa Fé",
      homeScore: 0,
      awayScore: 0,
      homePenScore: 3,
      awayPenScore: 2,
      homePossession: 58,
      awayPossession: 42,
      homeFinishings: 5,
      awayFinishings: 1,
      homeXG: 2.09,
      awayXG: 0.01,
      league: "Torneo Clausura",
      lineup: lineupFactory(),
    });

    const text = buildMatchCopyText({ match, career: baseCareer });
    expect(text).toContain(
      "Dia 02: Empate 0x0 (PEN: 3x2) vs Unión de Santa Fé (Casa, Torneo Clausura)\nPosse: 58% | Chutes: 5x1 | xG: 2.09x0.01",
    );
  });

  it("formata partida com prorrogação incluindo PRORROGAÇÃO | antes da posse", () => {
    const match = matchFactory({
      date: "02/08/2024",
      result: "V",
      homeTeam: "Newell’s Old Boys",
      awayTeam: "Unión de Santa Fé",
      homeScore: 2,
      awayScore: 0,
      hasExtraTime: true,
      homePossession: 58,
      awayPossession: 42,
      homeFinishings: 5,
      awayFinishings: 1,
      homeXG: 2.09,
      awayXG: 0.01,
      league: "Torneo Clausura",
      lineup: lineupFactory(),
    });

    const text = buildMatchCopyText({ match, career: baseCareer });
    expect(text).toContain(
      "Dia 02: Vitória 2x0 vs Unión de Santa Fé (Casa, Torneo Clausura)\nPRORROGAÇÃO | Posse: 58% | Chutes: 5x1 | xG: 2.09x0.01",
    );
  });

  it("formata partida com prorrogação e pênaltis simultaneamente", () => {
    const match = matchFactory({
      date: "02/08/2024",
      result: "E",
      homeTeam: "Newell’s Old Boys",
      awayTeam: "Unión de Santa Fé",
      homeScore: 0,
      awayScore: 0,
      hasExtraTime: true,
      homePenScore: 3,
      awayPenScore: 2,
      homePossession: 58,
      awayPossession: 42,
      homeFinishings: 5,
      awayFinishings: 1,
      homeXG: 2.09,
      awayXG: 0.01,
      league: "Torneo Clausura",
      lineup: lineupFactory(),
    });

    const text = buildMatchCopyText({ match, career: baseCareer });
    expect(text).toContain(
      "Dia 02: Empate 0x0 (PEN: 3x2) vs Unión de Santa Fé (Casa, Torneo Clausura)\nPRORROGAÇÃO | Posse: 58% | Chutes: 5x1 | xG: 2.09x0.01",
    );
  });

  it("inverte os pênaltis corretamente quando o time do usuário joga fora de casa", () => {
    const match = matchFactory({
      date: "02/08/2024",
      result: "E",
      homeTeam: "Unión de Santa Fé",
      awayTeam: "Newell’s Old Boys",
      homeScore: 1,
      awayScore: 1,
      homePenScore: 4,
      awayPenScore: 5,
      homePossession: 45,
      awayPossession: 55,
      homeFinishings: 3,
      awayFinishings: 7,
      homeXG: 0.5,
      awayXG: 1.8,
      league: "Torneo Clausura",
      lineup: lineupFactory(),
    });

    const text = buildMatchCopyText({ match, career: baseCareer });
    expect(text).toContain(
      "Dia 02: Empate 1x1 (PEN: 5x4) vs Unión de Santa Fé (Fora, Torneo Clausura)",
    );
  });

  it("formata final em campo neutro com estádio omitindo localidade Casa/Fora", () => {
    const match = matchFactory({
      date: "26/05/2025",
      result: "V",
      homeTeam: "Newell’s Old Boys",
      awayTeam: "Real Madrid",
      homeScore: 2,
      awayScore: 0,
      homePossession: 52,
      awayPossession: 48,
      homeFinishings: 6,
      awayFinishings: 4,
      homeXG: 1.85,
      awayXG: 0.92,
      league: "Champions League",
      stage: "Final",
      stadium: "Estádio Metropolitano",
      isNeutral: true,
      lineup: lineupFactory(),
    });

    const text = buildMatchCopyText({ match, career: baseCareer });
    expect(text).toContain(
      "Dia 26: Vitória 2x0 vs Real Madrid (Champions League, Final no Estádio Metropolitano)",
    );
  });

  it("formata jogo de volta com cálculo automático do placar agregado (AGR: 5x1) e Volta da Semifinal", () => {
    const firstLeg = matchFactory({
      matchesId: "match-ida-1",
      date: "24/04/2025",
      result: "V",
      homeTeam: "Newell’s Old Boys",
      awayTeam: "Arsenal",
      homeScore: 3,
      awayScore: 0,
      league: "Champions League",
      stage: "Semifinal",
      status: "FINISHED",
    });

    const returnMatch = matchFactory({
      matchesId: "match-volta-1",
      date: "02/05/2025",
      result: "V",
      homeTeam: "Arsenal",
      awayTeam: "Newell’s Old Boys",
      homeScore: 1,
      awayScore: 2,
      homePossession: 42,
      awayPossession: 58,
      homeFinishings: 1,
      awayFinishings: 5,
      homeXG: 0.01,
      awayXG: 2.09,
      league: "Champions League",
      stage: "Semifinal",
      isKnockout: true,
      isReturnMatch: true,
      status: "FINISHED",
      lineup: lineupFactory(),
    });

    const text = buildMatchCopyText({
      match: returnMatch,
      career: baseCareer,
      seasonMatches: [firstLeg, returnMatch],
    });

    expect(text).toContain(
      "Dia 02: Vitória 2x1 (AGR: 5x1) vs Arsenal (Fora, Champions League, Volta da Semifinal)",
    );
  });

  it("formata jogo de volta com agregado e pênaltis", () => {
    const firstLeg = matchFactory({
      matchesId: "match-ida-2",
      date: "24/04/2025",
      result: "D",
      homeTeam: "Arsenal",
      awayTeam: "Newell’s Old Boys",
      homeScore: 1,
      awayScore: 0,
      league: "Champions League",
      stage: "Semifinal",
      status: "FINISHED",
    });

    const returnMatch = matchFactory({
      matchesId: "match-volta-2",
      date: "02/05/2025",
      result: "E",
      homeTeam: "Newell’s Old Boys",
      awayTeam: "Arsenal",
      homeScore: 1,
      awayScore: 0,
      homePenScore: 4,
      awayPenScore: 2,
      homePossession: 55,
      awayPossession: 45,
      homeFinishings: 8,
      awayFinishings: 3,
      homeXG: 1.5,
      awayXG: 0.4,
      league: "Champions League",
      stage: "Semifinal",
      isKnockout: true,
      isReturnMatch: true,
      hasExtraTime: true,
      status: "FINISHED",
      lineup: lineupFactory(),
    });

    const text = buildMatchCopyText({
      match: returnMatch,
      career: baseCareer,
      seasonMatches: [firstLeg, returnMatch],
    });

    expect(text).toContain(
      "Dia 02: Empate 1x0 (AGR: 1x1) (PEN: 4x2) vs Arsenal (Casa, Champions League, Volta da Semifinal)",
    );
    expect(text).toContain("PRORROGAÇÃO | Posse: 55% | Chutes: 8x3 | xG: 1.5x0.4");
  });
});

