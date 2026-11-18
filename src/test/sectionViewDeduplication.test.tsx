// @vitest-environment jsdom
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  renderHook,
  act,
} from "@testing-library/react";
import { IoPersonOutline, IoTrophyOutline } from "react-icons/io5";

import {
  SectionSummaryCard,
  SectionSummaryGrid,
  SectionSummaryItem,
} from "../layout/SectionView/ui/SectionSummaryCard";
import PlayerInfoSection from "../layout/SectionView/features/PlayerTabs/InfoPlayerTab/components/PlayerInfoSection";
import ExpandableLeagueStatsRow from "../layout/SectionView/features/PlayerTabs/components/ExpandableLeagueStatsRow";
import { SortableVerticalList } from "../components/SortableVerticalList";
import { CardsModal } from "../ui/modals/SeasonConfigs/components/CardsModal";
import {
  SeasonConfigLeagueCard,
  SeasonConfigSubScreen,
} from "../ui/modals/SeasonConfigs/components/SeasonConfigSubScreen";
import { ActionChoiceModal } from "../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/ui/ActionChoiceModal";
import { formatSeasonString } from "../layout/SectionView/features/PlayerTabs/TotalPlayerTab/helpers/formatSeasonString";
import { usePersistedSortOption } from "../layout/SectionView/features/ClubTabs/StatsTab_Club/hooks/usePersistedSortOption";
import { useSquadSort } from "../layout/SectionView/features/ClubTabs/SquadTab/hooks/useSquadSort";
import { formatMonthsDuration } from "../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/components/FooterSection_Player/utils/FormatContract";
import { filterSupersededPlayers } from "../common/stats/helpers/mergeMatchStats";
import { contributesToStandings } from "../common/services/ServiceTable/buildStandingsRows";
import { useTableTeamActions } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/hooks/useTableTeamActions";
import { AddTeamsToTableContext } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/contexts/context";
import { ServiceTable } from "../common/services/ServiceTable";
import type { Players } from "../common/interfaces/playersInfo/players";
import type { LeagueStats } from "../common/interfaces/playersStats/leagueStats";
import type { Trophy } from "../common/interfaces/club/trophy";
import type { Career } from "../common/interfaces/Career";
import type { ClubData } from "../common/interfaces/club/clubData";
import type { Match } from "../common/interfaces/Match";

vi.mock("../common/services/ServiceTable", () => ({
  ServiceTable: {
    addTeamToTable: vi.fn().mockResolvedValue(undefined),
    updateTeamInTable: vi.fn().mockResolvedValue(undefined),
    deleteTeamFromTable: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../common/services/ToastService", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../common/services/ToastService")
  >();
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

const mockLamineYamal: Players = {
  id: "lamine_yamal_19",
  name: "Lamine Yamal",
  nation: "Espanha",
  position: "ED",
  sector: "Ataque",
  age: 18,
  overall: 88,
  salary: 120000,
  playerValue: 180000000,
  shirtNumber: "19",
  buy: false,
  captain: false,
  sell: false,
  contractTime: 5,
  ballonDor: 0,
  contract: [],
  statsLeagues: [],
};

const mockLaLigaStats: LeagueStats = {
  leagueName: "LaLiga",
  leagueImage: "/images/leagues/laliga.png",
  stats: {
    games: 35,
    goals: 12,
    assists: 15,
    cleanSheets: 0,
    rating: 8.4,
    minutesPlayed: 2900,
    defenses: 0,
  },
};

const mockLaLigaTrophy: Trophy = {
  leagueName: "LaLiga",
  leagueImage: "/images/leagues/laliga.png",
  seasons: ["24/25", "25/26"],
};

describe("Etapa 2 — Desduplicação no Hub SectionView e Componentes Genéricos (FC Barcelona)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = "";
    document.body.className = "";
  });

  afterEach(() => {
    cleanup();
  });

  describe("SectionSummaryCard, SectionSummaryGrid e SectionSummaryItem", () => {
    it("renderiza título, itens, cor customizada e variação boldLabel sem exibir ícone de edição de clube", () => {
      render(
        <SectionSummaryCard title="Resumo FC Barcelona">
          <SectionSummaryGrid>
            <SectionSummaryItem
              label="Total de jogadores"
              value={25}
              icon={<span data-testid="icon-squad">icon</span>}
              color="#a50044"
              boldLabel
            />
          </SectionSummaryGrid>
        </SectionSummaryCard>,
      );

      expect(screen.getByText("Resumo FC Barcelona")).toBeTruthy();
      expect(screen.getByText("Total de jogadores")).toBeTruthy();
      expect(screen.getByText("25")).toBeTruthy();
      expect(screen.getByTestId("icon-squad")).toBeTruthy();
      expect(
        screen.getByText("Total de jogadores").className,
      ).toContain("labelBold");
    });

    it("preserva a ordem visual e os rótulos exatos de PlayerInfoSection para Lamine Yamal", () => {
      render(<PlayerInfoSection player={mockLamineYamal} />);

      expect(screen.getByText("Informações do jogador")).toBeTruthy();
      expect(screen.getByText("Espanha")).toBeTruthy();
      expect(screen.getByText("Lamine Yamal")).toBeTruthy();
      expect(screen.getByText("ED")).toBeTruthy();
      expect(screen.getByText("Posição")).toBeTruthy();
      expect(screen.getByText("18")).toBeTruthy();
      expect(screen.getByText("Idade")).toBeTruthy();
      expect(screen.getByText("19")).toBeTruthy();
      expect(screen.getByText("Número da camisa")).toBeTruthy();
    });
  });

  describe("ExpandableLeagueStatsRow", () => {
    it("dispara onToggleExpand e exibe NoTitleSeason quando expandido sem troféu", () => {
      const onToggleExpand = vi.fn();

      const { rerender } = render(
        <MemoryRouter>
          <ExpandableLeagueStatsRow
            expandKey="s1-LaLiga"
            leagueStats={mockLaLigaStats}
            fallbackLeagueName="LaLiga"
            isGoalkeeper={false}
            isExpanded={false}
            onToggleExpand={onToggleExpand}
            isTotal={false}
          />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByAltText("LaLiga"));
      expect(onToggleExpand).toHaveBeenCalledWith("s1-LaLiga");

      rerender(
        <MemoryRouter>
          <ExpandableLeagueStatsRow
            expandKey="s1-LaLiga"
            leagueStats={mockLaLigaStats}
            fallbackLeagueName="LaLiga"
            isGoalkeeper={false}
            isExpanded={true}
            onToggleExpand={onToggleExpand}
            isTotal={false}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Não ganhou a LaLiga/i)).toBeTruthy();
    });

    it("exibe troféu quando expandido com trophy tanto em modo temporada quanto total", () => {
      const { rerender } = render(
        <MemoryRouter>
          <ExpandableLeagueStatsRow
            expandKey="s1-LaLiga"
            leagueStats={mockLaLigaStats}
            fallbackLeagueName="LaLiga"
            isGoalkeeper={false}
            isExpanded={true}
            onToggleExpand={vi.fn()}
            trophy={mockLaLigaTrophy}
            isTotal={false}
          />
        </MemoryRouter>,
      );

      expect(screen.queryByText(/Não ganhou a/i)).toBeNull();
      expect(screen.getByText(/Campeão da/i)).toBeTruthy();

      rerender(
        <MemoryRouter>
          <ExpandableLeagueStatsRow
            expandKey="LaLiga"
            leagueStats={mockLaLigaStats}
            fallbackLeagueName="LaLiga"
            isGoalkeeper={false}
            isExpanded={true}
            onToggleExpand={vi.fn()}
            trophy={mockLaLigaTrophy}
            isTotal={true}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText(/2x/i)).toBeTruthy();
    });
  });

  describe("SortableVerticalList", () => {
    const barcaCompetitions = [
      { id: "laliga", name: "LaLiga" },
      { id: "ucl", name: "Champions League" },
    ];

    it("exibe drag handles quando readOnly é false e oculta quando readOnly é true", () => {
      const { rerender } = render(
        <SortableVerticalList
          title="Competições"
          items={barcaCompetitions}
          getItemId={(item) => item.id}
          renderItemContent={(item) => <span>{item.name}</span>}
          onReorderPersist={vi.fn().mockResolvedValue(undefined)}
          getDragHandleAriaLabel={(item) => `Reordenar ${item.name}`}
          readOnly={false}
        />,
      );

      expect(screen.getByText("Competições")).toBeTruthy();
      expect(screen.getByText("LaLiga")).toBeTruthy();
      expect(screen.getByText("Champions League")).toBeTruthy();
      expect(screen.getAllByLabelText(/Reordenar/)).toHaveLength(2);

      rerender(
        <SortableVerticalList
          title="Competições"
          items={barcaCompetitions}
          getItemId={(item) => item.id}
          renderItemContent={(item) => <span>{item.name}</span>}
          onReorderPersist={vi.fn().mockResolvedValue(undefined)}
          getDragHandleAriaLabel={(item) => `Reordenar ${item.name}`}
          readOnly={true}
        />,
      );

      expect(screen.queryByLabelText(/Reordenar/)).toBeNull();
    });
  });

  describe("CardsModal, SeasonConfigSubScreen e ActionChoiceModal", () => {
    it("CardsModal aplica classe selected quando isSelected=true e aceita customIconNode", () => {
      const { container } = render(
        <CardsModal
          customIconNode={<span data-testid="custom-fcb-icon">FCB</span>}
          label="Clube"
          title="FC Barcelona"
          onClick={vi.fn()}
          clubColor="#004d98"
          darkClubColor="#a50044"
          isSelected
          selectedClassName="extra-selected"
        />,
      );

      expect(screen.getByTestId("custom-fcb-icon")).toBeTruthy();
      const cardEl = container.firstChild as HTMLElement;
      expect(cardEl.className).toContain("selected");
      expect(cardEl.className).toContain("extra-selected");
    });

    it("SeasonConfigSubScreen renderiza header, cards removíveis e aciona salvar/voltar", () => {
      const onConfirm = vi.fn();
      const onBack = vi.fn();
      const onRemove = vi.fn();

      render(
        <SeasonConfigSubScreen
          title="Selecionar Ligas"
          subtitle="Torneios do FC Barcelona"
          clubColor="#004d98"
          confirmLabel="Confirmar (1)"
          onConfirm={onConfirm}
          onBack={onBack}
        >
          <SeasonConfigLeagueCard
            name="LaLiga"
            imageSrc="/images/leagues/laliga.png"
            onRemove={onRemove}
          />
        </SeasonConfigSubScreen>,
      );

      expect(screen.getByText("Selecionar Ligas")).toBeTruthy();
      expect(screen.getByText("LaLiga")).toBeTruthy();

      fireEvent.click(screen.getByText("Confirmar (1)"));
      expect(onConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText("Voltar"));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("ActionChoiceModal permite selecionar opção e confirmar ação limpando modal-open", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      document.body.classList.add("modal-open");

      render(
        <ActionChoiceModal
          title="Pedri"
          onClose={onClose}
          onConfirm={onConfirm}
          clubColor="#004d98"
          darkClubColor="#a50044"
          options={[
            {
              key: "view",
              text: "Visualizar",
              title: "Pedri",
              icon: IoPersonOutline,
              actionLabel: "Entrar na Visualização",
            },
            {
              key: "trophies",
              text: "Títulos",
              title: "LaLiga",
              icon: IoTrophyOutline,
              actionLabel: "Ver Títulos",
            },
          ]}
        />,
      );

      expect(screen.queryByText("Entrar na Visualização")).toBeNull();
      fireEvent.click(screen.getByText("Visualizar"));
      fireEvent.click(screen.getByText("Entrar na Visualização"));

      expect(onConfirm).toHaveBeenCalledWith("view");
      expect(document.body.classList.contains("modal-open")).toBe(false);
    });
  });

  describe("Desduplicação de helpers: formatSeasonString, sorting, contratos e standings", () => {
    it("formatSeasonString corrige calendário não-europeu e suporta Firestore Timestamp", () => {
      expect(formatSeasonString("2024-08-01T00:00:00.000Z", 1, "Espanha")).toBe(
        "24/25",
      );
      expect(
        formatSeasonString({ seconds: 1722470400 }, 2, "Espanha"),
      ).toBe("25/26");
      expect(
        formatSeasonString("2024-02-01T00:00:00.000Z", 1, "Colômbia"),
      ).toBe("2024");
      expect(
        formatSeasonString("2024-02-01T00:00:00.000Z", 1, "Japão"),
      ).toBe("2024");
    });

    it("useSquadSort e usePersistedSortOption preservam suas chaves distintas no localStorage", () => {
      const { result: squadResult } = renderHook(() => useSquadSort("s_fcb"));
      act(() => {
        squadResult.current.handleSortChange("Overall");
      });
      act(() => {
        squadResult.current.handleSortChange("Overall");
      });

      expect(localStorage.getItem("squadSortOption_s_fcb")).toBe("Overall");
      expect(localStorage.getItem("squadSortAsc_s_fcb")).toBe("true");
      expect(squadResult.current.isAsc).toBe(true);

      const { result: statsResult } = renderHook(() =>
        usePersistedSortOption("s_fcb"),
      );
      act(() => {
        statsResult.current.setSortOption("Gols");
      });
      expect(localStorage.getItem("playerSortOption_s_fcb")).toBe("Gols");
      expect(localStorage.getItem("playerSortReversed_s_fcb")).toBe("false");
    });

    it("formatMonthsDuration formata corretamente durações de contrato", () => {
      expect(formatMonthsDuration(0)).toBe("Expirado");
      expect(formatMonthsDuration(1)).toBe("1 Mês");
      expect(formatMonthsDuration(6)).toBe("6 Meses");
      expect(formatMonthsDuration(12)).toBe("1 Ano");
      expect(formatMonthsDuration(36)).toBe("3 Anos");
      expect(formatMonthsDuration(18)).toBe("1A. 6M.");
    });

    it("filterSupersededPlayers remove versão anterior substituída por playedWithUs", () => {
      const pedriOld: Players = {
        ...mockLamineYamal,
        id: "pedri_1",
        name: "Pedri",
        sell: true,
      };
      const pedriRehired: Players = {
        ...mockLamineYamal,
        id: "pedri_2",
        name: "Pedri",
        playedWithUs: "pedri_1",
        sell: false,
      };

      const filtered = filterSupersededPlayers([pedriOld, pedriRehired]);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("pedri_2");
    });

    it("contributesToStandings delega corretamente para contributesToLeagueStandings", () => {
      const finishedLaLigaMatch = {
        matchesId: "m1",
        status: "FINISHED",
        league: "LaLiga",
      } as Match;
      const finishedCupMatch = {
        matchesId: "m2",
        status: "FINISHED",
        league: "Copa del Rey",
      } as Match;

      const seasonLeagues = {
        leagues: [
          { name: "LaLiga", logo: "", trophy: "", league: true },
          { name: "Copa del Rey", logo: "", trophy: "", league: false },
        ],
      };

      expect(contributesToStandings(finishedLaLigaMatch, seasonLeagues)).toBe(
        true,
      );
      expect(contributesToStandings(finishedCupMatch, seasonLeagues)).toBe(
        false,
      );
    });
  });

  describe("useTableTeamActions — prevenção de dupla escrita", () => {
    const mockCareer = {
      id: "career_fcb",
      clubName: "FC Barcelona",
      teamBadge: "/fcb.png",
    } as Career;

    const mockSeason = {
      id: "season_1",
      seasonNumber: 1,
      teams: [{ id: "t1", name: "FC Barcelona", badge: "/fcb.png" }],
    } as unknown as ClubData;

    const createWrapper = (teamId?: string) => {
      const onClose = vi.fn();
      const value = {
        career: mockCareer,
        season: mockSeason,
        teamId,
        teamToEdit: undefined,
        onClose,
        formValues: {
          teamName: "FC Barcelona",
          played: "10",
          won: "8",
          drawn: "1",
          lost: "1",
          goalsFor: "28",
          goalsAgainst: "7",
          points: "25",
          customZone: "Campeão",
        },
        booleanValues: {},
        mergedFormValues: {},
        handleInputChange: vi.fn(),
        handleBooleanChange: vi.fn(),
        setFormValues: vi.fn(),
        setBooleanValues: vi.fn(),
        resetForm: vi.fn(),
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AddTeamsToTableContext.Provider value={value as never}>
          {children}
        </AddTeamsToTableContext.Provider>
      );

      return { wrapper, onClose };
    };

    it("invoca ServiceTable.addTeamToTable exatamente 1 vez ao adicionar novo time", async () => {
      const { wrapper, onClose } = createWrapper(undefined);
      const { result } = renderHook(() => useTableTeamActions(), { wrapper });

      await act(async () => {
        await result.current.saveTableTeam();
      });

      expect(ServiceTable.addTeamToTable).toHaveBeenCalledTimes(1);
      expect(ServiceTable.updateTeamInTable).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("invoca ServiceTable.updateTeamInTable exatamente 1 vez ao atualizar time existente", async () => {
      const { wrapper, onClose } = createWrapper("fcb_row_1");
      const { result } = renderHook(() => useTableTeamActions(), { wrapper });

      await act(async () => {
        await result.current.saveTableTeam();
      });

      expect(ServiceTable.updateTeamInTable).toHaveBeenCalledTimes(1);
      expect(ServiceTable.addTeamToTable).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
