// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, expect, it, afterEach, beforeAll, vi } from "vitest";
import { MatchStatsTab } from "../pages/Match/components/MatchStatsTab";
import { AddStatsMatchScreen } from "../pages/Match/components/MatchStatsTab/views/AddStatsMatch/screens/AddStatsMatchScreen";
import { buildMatchPayload } from "../pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/buildMatchPayload";
import { SeasonThemeProvider } from "../contexts/SeasonThemeContext";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { MemoryRouter } from "react-router-dom";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Match } from "../common/interfaces/Match";
import { career, season } from "../test/factories/domain";
import { ServiceMatches } from "../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";

vi.mock(
  "../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches",
  () => ({
    ServiceMatches: {
      updateMatchStatsInSeason: vi.fn().mockResolvedValue(undefined),
      updateMatchDetailsInSeason: vi.fn().mockResolvedValue(undefined),
    },
  }),
);

describe("Opponent Cards - UI and StatsTab Integration", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockCareer: Career = career({
    id: "c1",
    clubName: "Chelsea",
    managerName: "Coach",
    colorsTeams: ["#0000ff"],
  });

  const mockSeason: ClubData = season({
    id: "s1",
    seasonNumber: 1,
    matches: [],
  });

  const initialMatch: Match = {
    matchesId: "m1",
    date: "01/10/2026",
    league: "Premier League",
    homeTeam: "Chelsea",
    awayTeam: "Arsenal",
    result: "V",
    status: "FINISHED",
    homeScore: 2,
    awayScore: 1,
    homeYellowCards: 1,
    homeRedCards: 0,
    awayYellowCards: 0,
    awayRedCards: 0,
  };

  it("adicionar cartão nos detalhes → stats atualiza contagem como atalho da partida", () => {
    const formValues: Record<string, string> = {
      homeScore: "2",
      awayScore: "1",
      opponentCardCount: "1",
      opponentCardPlayer_0: "Saka",
      opponentYellowMin_0: "25",
    };
    const booleanValues: Record<string, boolean> = {
      opponentYellow_0: true,
      opponentSecondYellow_0: false,
      opponentRed_0: false,
    };

    const isUserHome = initialMatch.homeTeam === mockCareer.clubName;
    const { updatedMatch } = buildMatchPayload(
      initialMatch,
      formValues,
      booleanValues,
      isUserHome,
    );

    expect(updatedMatch.awayYellowCards).toBe(1);
    expect(updatedMatch.awayRedCards).toBe(0);
    expect(updatedMatch.homeYellowCards).toBe(1);

    const { container } = render(
      <MatchStatsTab match={updatedMatch as Match} career={mockCareer} />,
    );

    expect(screen.getByText("Cartões amarelos")).toBeTruthy();
    const textContent = container.textContent;
    expect(textContent).toContain("Cartões amarelos");
  });

  it("remover cartão nos detalhes → stats atualiza contagem", () => {
    const matchWithTwoCards: Match = {
      ...initialMatch,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "20",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
          {
            player: "Rice",
            yellow: true,
            yellowMinute: "40",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
      awayYellowCards: 2,
    };

    const formValues: Record<string, string> = {
      homeScore: "2",
      awayScore: "1",
      opponentCardCount: "1",
      opponentCardPlayer_0: "Saka",
      opponentYellowMin_0: "20",
    };
    const booleanValues: Record<string, boolean> = {
      opponentYellow_0: true,
      opponentSecondYellow_0: false,
      opponentRed_0: false,
    };

    const { updatedMatch } = buildMatchPayload(
      matchWithTwoCards,
      formValues,
      booleanValues,
      true,
    );

    expect(updatedMatch.awayYellowCards).toBe(1);
    expect(updatedMatch.awayRedCards).toBe(0);
  });

  it("remover último cartão nos detalhes → total derivado chega a ZERO", () => {
    const matchWithCard: Match = {
      ...initialMatch,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "20",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
      awayYellowCards: 1,
    };

    const formValues: Record<string, string> = {
      homeScore: "2",
      awayScore: "1",
      opponentCardCount: "0",
    };
    const booleanValues: Record<string, boolean> = {};

    const { updatedMatch } = buildMatchPayload(
      matchWithCard,
      formValues,
      booleanValues,
      true,
    );

    expect(updatedMatch.awayYellowCards).toBe(0);
    expect(updatedMatch.awayRedCards).toBe(0);
    expect(updatedMatch.opponentEvents?.cards).toEqual([]);
    expect(updatedMatch.opponentEvents?.cardsAuthoritative).toBe(true);
  });

  it("MatchStatsTab nunca bloqueia o usuário: campos adversários permanecem habilitados e preenchidos como atalho", () => {
    const matchWithDetails: Match = {
      ...initialMatch,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "25",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
      awayYellowCards: 1,
      awayRedCards: 0,
      homeYellowCards: 2,
      homeRedCards: 0,
    };

    render(
      <MemoryRouter>
        <ThemeProvider>
          <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
            <AddStatsMatchScreen
              career={mockCareer}
              season={mockSeason}
              match={matchWithDetails}
              onClose={vi.fn()}
            />
          </SeasonThemeProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const homeYellow = document.getElementById(
      "homeYellowCards",
    ) as HTMLInputElement;
    const awayYellow = document.getElementById(
      "awayYellowCards",
    ) as HTMLInputElement;
    const homeRed = document.getElementById("homeRedCards") as HTMLInputElement;
    const awayRed = document.getElementById("awayRedCards") as HTMLInputElement;

    expect(awayYellow).toBeTruthy();
    expect(homeYellow).toBeTruthy();

    expect(awayYellow.disabled).toBe(false);
    expect(awayRed.disabled).toBe(false);
    expect(homeYellow.disabled).toBe(false);
    expect(homeRed.disabled).toBe(false);

    expect(awayYellow.value).toBe("1");
    expect(awayRed.value).toBe("0");
    expect(homeYellow.value).toBe("2");
    expect(homeRed.value).toBe("0");
  });

  it("usuário pode colocar 2 amarelos nos detalhes e depois alterar para 3 em MatchStatsTab sem mudar MatchDetailsTab", async () => {
    const matchWithTwoCards: Match = {
      ...initialMatch,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "25",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
          {
            player: "Rice",
            yellow: true,
            yellowMinute: "40",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
      awayYellowCards: 2,
      awayRedCards: 0,
      homeYellowCards: 1,
      homeRedCards: 0,
    };

    const handleSaved = vi.fn();
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <ThemeProvider>
          <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
            <AddStatsMatchScreen
              career={mockCareer}
              season={mockSeason}
              match={matchWithTwoCards}
              onClose={handleClose}
              onSaved={handleSaved}
            />
          </SeasonThemeProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const awayYellow = document.getElementById(
      "awayYellowCards",
    ) as HTMLInputElement;

    expect(awayYellow.value).toBe("2");
    expect(awayYellow.disabled).toBe(false);

    fireEvent.change(awayYellow, { target: { value: "3" } });
    expect(awayYellow.value).toBe("3");

    const saveButton = screen.getByText("Salvar");
    fireEvent.click(saveButton);

    expect(ServiceMatches.updateMatchStatsInSeason).toHaveBeenCalledWith(
      "c1",
      "s1",
      expect.objectContaining({
        awayYellowCards: 3,
        opponentEvents: matchWithTwoCards.opponentEvents,
      }),
    );
  });

  it("partida legado sem detalhes: ambos os lados continuam editáveis em AddStatsMatchScreen", () => {
    const legacyMatch: Match = {
      ...initialMatch,
      homeYellowCards: 1,
      awayYellowCards: 3,
      opponentEvents: undefined,
    };

    render(
      <MemoryRouter>
        <ThemeProvider>
          <SeasonThemeProvider careerId={mockCareer.id} career={mockCareer}>
            <AddStatsMatchScreen
              career={mockCareer}
              season={mockSeason}
              match={legacyMatch}
              onClose={vi.fn()}
            />
          </SeasonThemeProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const homeYellow = document.getElementById(
      "homeYellowCards",
    ) as HTMLInputElement;
    const awayYellow = document.getElementById(
      "awayYellowCards",
    ) as HTMLInputElement;

    expect(homeYellow.disabled).toBe(false);
    expect(awayYellow.disabled).toBe(false);
    expect(homeYellow.value).toBe("1");
    expect(awayYellow.value).toBe("3");
  });
});
