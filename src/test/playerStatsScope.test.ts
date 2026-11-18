// @vitest-environment jsdom

import React from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { usePlayerStats } from "../layout/SectionView/features/PlayerTabs/PlayerDetailedStatsTab/hooks/usePlayerStats";
import type { Career } from "../common/interfaces/Career";
import type { ClubData } from "../common/interfaces/club/clubData";
import type { Players } from "../common/interfaces/playersInfo/players";

const mockUseGroupAggregatedPlayers = vi.fn();
const mockUseBestPlayersStats = vi.fn();

const parallelCareerAggregatedYamal: Players = {
  id: "player_yamal_parallel",
  name: "Lamine Yamal",
  nation: "Espanha",
  age: 17,
  position: "PD",
  sector: "Ataque",
  shirtNumber: "19",
  overall: 83,
  ballonDor: 0,
  buy: false,
  captain: false,
  sell: false,
  contract: [],
  statsLeagues: [
    {
      leagueName: "La Liga",
      leagueImage: "laliga.png",
      stats: {
        games: 38,
        goals: 12,
        assists: 15,
        minutesPlayed: 3100,
        cleanSheets: 0,
        defenses: 0,
        rating: 7.8,
      },
    },
    {
      leagueName: "Champions League",
      leagueImage: "ucl.png",
      stats: {
        games: 20,
        goals: 10,
        assists: 8,
        minutesPlayed: 1600,
        cleanSheets: 0,
        defenses: 0,
        rating: 8.2,
      },
    },
  ],
};

vi.mock(
  "../common/hooks/Players/useGroupAggregatedPlayers",
  () => ({
    useGroupAggregatedPlayers: (career: Career, enabled: boolean) => {
      mockUseGroupAggregatedPlayers(career, enabled);
      if (!enabled) {
        return { groupPlayers: [], isLoadingGroup: false };
      }
      return {
        groupPlayers: [parallelCareerAggregatedYamal],
        isLoadingGroup: false,
      };
    },
  }),
);

vi.mock(
  "../layout/SectionView/features/ClubTabs/BestPlayersTab/hooks/useBestPlayersStats",
  () => ({
    useBestPlayersStats: (
      season: ClubData,
      career: Career,
      isGeral: boolean,
      minPct: number,
    ) => mockUseBestPlayersStats(season, career, isGeral, minPct),
  }),
);

describe("playerStatsScope - Escopo estrito em rotas gerais e de grupo", () => {
  const barcaCareer: Career = {
    id: "career_barca_1",
    clubName: "FC Barcelona",
    managerName: "Hansi Flick",
    createdAt: new Date("2024-07-01"),
    teamBadge: "barca_badge.png",
    nation: "Espanha",
    groupId: "group_fcb_multiclub",
    colorsTeams: ["#004d98", "#a50044"],
    trophies: [],
    clubData: [],
  };

  const barcaSeason: ClubData = {
    id: "season_barca_1",
    seasonNumber: 1,
    players: [],
    teams: [],
  };

  const lamineYamal: Players = {
    id: "player_yamal_19",
    name: "Lamine Yamal",
    nation: "Espanha",
    age: 17,
    position: "PD",
    sector: "Ataque",
    shirtNumber: "19",
    overall: 83,
    ballonDor: 0,
    buy: false,
    captain: false,
    sell: false,
    statsLeagues: [],
    contract: [],
  };

  const baseYamalStats = {
    player: lamineYamal,
    goals: 12,
    assists: 15,
    matchesPlayed: 38,
    minutesPlayed: 3100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBestPlayersStats.mockReturnValue([baseYamalStats]);
  });

  it("garante escopo estrito em rota /Geral sem ?fromGroup=true (nao agrega carreiras paralelas)", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/Career/career_barca_1/Geral"] },
        children,
      );

    const { result } = renderHook(
      () =>
        usePlayerStats({
          career: barcaCareer,
          season: barcaSeason,
          player: lamineYamal,
        }),
      { wrapper },
    );

    expect(mockUseGroupAggregatedPlayers).toHaveBeenCalledWith(
      barcaCareer,
      false,
    );

    expect(result.current.isGeralPage).toBe(true);
    expect(result.current.playerStats).toBe(baseYamalStats);
    expect(result.current.playerStats?.goals).toBe(12);
  });

  it("permite agregacao de grupo quando a rota /Geral possui ?fromGroup=true", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        {
          initialEntries: [
            "/Career/career_barca_1/Geral?fromGroup=true&groupId=group_fcb_multiclub",
          ],
        },
        children,
      );

    const { result } = renderHook(
      () =>
        usePlayerStats({
          career: barcaCareer,
          season: barcaSeason,
          player: lamineYamal,
        }),
      { wrapper },
    );

    expect(mockUseGroupAggregatedPlayers).toHaveBeenCalledWith(
      barcaCareer,
      true,
    );

    expect(result.current.isGeralPage).toBe(true);
    expect(result.current.playerStats?.goals).toBe(22);
    expect(result.current.playerStats?.assists).toBe(23);
  });

  it("mantem escopo isolado da temporada em rota de temporada regular", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/Career/career_barca_1/Season/season_barca_1"] },
        children,
      );

    const { result } = renderHook(
      () =>
        usePlayerStats({
          career: barcaCareer,
          season: barcaSeason,
          player: lamineYamal,
        }),
      { wrapper },
    );

    expect(mockUseGroupAggregatedPlayers).toHaveBeenCalledWith(
      barcaCareer,
      false,
    );

    expect(result.current.isGeralPage).toBe(false);
    expect(result.current.playerStats).toBe(baseYamalStats);
  });
});
