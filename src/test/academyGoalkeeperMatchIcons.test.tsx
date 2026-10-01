// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { TournamentMatchLineup } from "../pages/Academy/layouts/AcademyContent/components/Tournament/features/Match/components/TournamentMatchList/components/TournamentMatchLineup";
import { LineupList } from "../pages/Academy/layouts/AcademyContent/components/FeedItem/components/FeedItemModal/components/MatchDetails/ui/LineupList";
import type { AcademyPlayers } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyPlayers/AcademyPlayers";
import type { PlayerMatchesStats } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyMatches/PlayerMatchesStats";
import type { FeedEvent } from "../pages/Academy/layouts/AcademyContent/components/FeedItem/types/FeedEvent";

vi.mock("react-icons/gi", async () => {
  const { createElement } = await import("react");
  return { GiSoccerBall: () => createElement("i", { "data-testid": "soccer-icon" }) };
});
vi.mock("react-icons/md", async () => {
  const { createElement } = await import("react");
  return { MdSportsHandball: () => createElement("i", { "data-testid": "save-icon" }) };
});

afterEach(cleanup);

const players = [
  { id: "keeper-zero", position: "GOL", status: "promoted" },
  { id: "keeper-five", position: "GOL", status: "released" },
  { id: "keeper-null", position: "GOL" },
  { id: "field-anomaly", position: "ATA" },
] as AcademyPlayers[];

const stats = [
  { playerId: "keeper-zero", playerName: "Zero", goals: 4, assists: null, rating: 7, defesas: 0 },
  { playerId: "keeper-five", playerName: "Five", goals: 1, assists: null, rating: 7, defesas: 5 },
  { playerId: "keeper-null", playerName: "Null", goals: 3, assists: null, rating: 7, defesas: null },
  { playerId: "field-anomaly", playerName: "Field", goals: 0, assists: null, rating: 7, defesas: 8 },
  { playerId: "deleted", playerName: "Unknown", goals: 0, assists: null, rating: 7, defesas: null },
] satisfies PlayerMatchesStats[];

const renderAndAssert = (ui: React.ReactElement) => {
  render(<ThemeProvider>{ui}</ThemeProvider>);
  const rows = screen.getAllByText(/^(Zero|Five|Null|Field|Unknown)$/).map((name) => name.parentElement!);
  expect(rows[0].querySelector('[data-testid="save-icon"]')).not.toBeNull();
  expect(rows[0].textContent).toContain("0");
  expect(rows[1].querySelector('[data-testid="save-icon"]')).not.toBeNull();
  expect(rows[1].textContent).toContain("5");
  expect(rows[2].querySelector('[data-testid="save-icon"]')).not.toBeNull();
  expect(rows[2].textContent).toContain("0");
  expect(rows[3].querySelector('[data-testid="soccer-icon"]')).not.toBeNull();
  expect(rows[3].textContent).toContain("0");
  expect(rows[4].querySelector('[data-testid="soccer-icon"]')).not.toBeNull();
};

describe("academy match player icons", () => {
  it("uses position and nullish stats in tournament match lineups", () => {
    renderAndAssert(<TournamentMatchLineup lineup={stats} allPlayersAcademy={players} />);
  });

  it("uses position and nullish stats in academy feed match details", () => {
    const details = { lineup: stats } as NonNullable<FeedEvent["details"]>;
    renderAndAssert(<LineupList details={details} allPlayersAcademy={players} />);
  });
});
