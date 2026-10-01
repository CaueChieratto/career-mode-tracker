import { describe, expect, it } from "vitest";
import { hasStandingsImpact } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable/hasStandingsImpact";
import { match } from "./factories/domain";
import type { Match } from "../common/interfaces/Match";

const finished = () =>
  match({ status: "FINISHED", homeScore: 2, awayScore: 1, result: "V" });

describe("hasStandingsImpact", () => {
  it("ignora detalhes, eventos e estatisticas que nao contribuem para a tabela", () => {
    const previous = finished();
    const next = {
      ...previous,
      opponentMvpName: "Adversario",
      opponentMvpRating: 8,
      opponentEvents: [{ goals: [{ player: "Atacante", minute: "20" }] }],
      homePossession: 60,
      awayPossession: 40,
      stoppage1T: 2,
    };

    expect(hasStandingsImpact(previous, next)).toBe(false);
  });

  it.each<[string, Partial<Match>]>([
    ["placar", { homeScore: 3 }],
    ["status", { status: "SCHEDULED" }],
    ["liga", { league: "Outra Liga" }],
    ["mandante", { homeTeam: "Outro" }],
    ["visitante", { awayTeam: "Outro" }],
    ["penaltis", { homePenScore: 5, awayPenScore: 4 }],
  ])("detecta alteracao relevante em %s", (_label, update) => {
    const previous = finished();
    expect(hasStandingsImpact(previous, { ...previous, ...update })).toBe(true);
  });

  it("trata placar ausente como zero e ignora caixa ou espacos da liga", () => {
    const previous = match({
      status: "FINISHED",
      league: " Liga ",
      result: "E",
    });
    const next = { ...previous, league: "liga", homeScore: 0, awayScore: 0 };

    expect(hasStandingsImpact(previous, next)).toBe(false);
  });

  it("ignora mudancas entre partidas que continuam sem contribuir", () => {
    const previous = match({ status: "SCHEDULED" });
    const next = { ...previous, homeScore: 5, awayScore: 4 };

    expect(hasStandingsImpact(previous, next)).toBe(false);
  });
});
