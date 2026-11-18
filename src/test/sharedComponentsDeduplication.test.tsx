// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  renderHook,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { FaStar } from "react-icons/fa";

const mockAddTeamToSeason = vi.fn().mockResolvedValue(undefined);
const mockGetAllTeamsAcrossUserCareers = vi.fn().mockResolvedValue([
  "FC Barcelona",
  "Bayern München",
  "Arsenal",
]);

vi.mock("../common/services/ServiceMatches", () => ({
  ServiceMatches: {
    addTeamToSeason: (...args: unknown[]) => mockAddTeamToSeason(...args),
    getAllTeamsAcrossUserCareers: () => mockGetAllTeamsAcrossUserCareers(),
  },
}));

const mockAddTeamToTable = vi.fn().mockResolvedValue(undefined);
const mockUpdateTeamInTable = vi.fn().mockResolvedValue(undefined);
const mockDeleteTeamFromTable = vi.fn().mockResolvedValue(undefined);

vi.mock("../common/services/ServiceTable", () => ({
  ServiceTable: {
    addTeamToTable: (...args: unknown[]) => mockAddTeamToTable(...args),
    updateTeamInTable: (...args: unknown[]) => mockUpdateTeamInTable(...args),
    deleteTeamFromTable: (...args: unknown[]) => mockDeleteTeamFromTable(...args),
  },
}));

vi.mock("../common/services/ToastService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../common/services/ToastService")>();
  return {
    ...actual,
    toast: {
      ...actual.toast,
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

vi.mock("../common/services/ColorsService", () => ({
  ColorsService: {
    getColorSaved: () => "#A50044",
    setColorSaved: vi.fn(),
  },
}));

import { SeasonThemeContext } from "../contexts/SeasonThemeContext";
import { ThemeProvider } from "../contexts/LightThemeContext";
import { ThemedActionButton } from "../common/elements/Buttons/ThemedActionButton";
import { Buttons } from "../common/elements/Buttons";
import AddOrEditLeagueButton from "../common/elements/Buttons/AddOrEditLeagueButton";
import {
  SectionSummaryCard,
  SectionSummaryGrid,
  SectionSummaryItem,
} from "../layout/SectionView/ui/SectionSummaryCard";
import ExpandableLeagueStatsRow from "../layout/SectionView/features/PlayerTabs/components/ExpandableLeagueStatsRow";
import {
  formatSeasonShortLabel,
  getValidDate,
} from "../common/utils/Date";
import { useTableTeamActions } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/hooks/useTableTeamActions";
import { AddTeamsToTableContext } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/contexts/context";
import {
  buildPlayerIdentitySections,
  normalizeSector,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/shared/buildPlayerIdentitySections";
import {
  ensureTeamSavedInSeason,
  useGlobalTeamsOptions,
} from "../layout/SectionView/features/ClubTabs/SquadTab/views/shared/useGlobalTeamsOptions";
import { useTransferBonusesDraft } from "../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/hooks/useTransferBonusesDraft";
import { mergeFormValues } from "../common/hooks/UseForm";
import { MatchFormSubScreen } from "../pages/Match/components/MatchFormSubScreen";
import SeasonCard from "../pages/CareersPage/views/AddSeasons/ui/SeasonCard";
import { useStatsSummary } from "../pages/CareersPage/components/CareerCard/hooks/useStatsSummary";
import { GroupEditModal } from "../pages/CareersPage/components/CareerGroupCard/ui/GroupEditModal";
import { AcademyFormRenderer } from "../pages/Academy/layouts/AcademyContent/components/AcademyFormRenderer";
import { AcademyMatchLineupList } from "../pages/Academy/layouts/AcademyContent/ui/AcademyMatchLineupList";
import {
  compareAcademyDates,
  extractDateInfo,
} from "../pages/Academy/layouts/AcademyContent/components/FeedItem/helpers/extractDateInfo";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Match } from "../common/interfaces/Match";
import { Players } from "../common/interfaces/playersInfo/players";
import { AcademyPlayers } from "../common/interfaces/AcademyData";
import { convertDateToString } from "../ui/modals/EditCareerModal/helpers/convertDateToString";
import { convertStringToDate } from "../ui/modals/EditCareerModal/helpers/convertStringToDate";
import { ConfirmModal } from "../pages/CareersPage/ui/ConfirmModal";
import { StatRow } from "../pages/ComparePlayers/components/StatRow";
import { PlayerMatchModal } from "../pages/Match/components/LineupTab/components/PlayerMatchModal";
import { usePlayerInfo } from "../layout/SectionView/features/PlayerTabs/InfoPlayerTab/hooks/usePlayerInfo";

const mockThemeValue = {
  clubColor: "#A50044",
  darkClubColor: "#004D98",
  textColor: "#FFFFFF",
  activeStyle: {
    darkClubColor: "#004D98",
    color: "#FFFFFF",
    fontWeight: "bold",
    border: "1px solid #A50044",
  },
  changeClubColor: vi.fn(),
  isLightColor: false,
};

const withSeasonTheme = (ui: React.ReactElement) => (
  <SeasonThemeContext.Provider
    value={
      mockThemeValue as unknown as React.ContextType<typeof SeasonThemeContext>
    }
  >
    <ThemeProvider>{ui}</ThemeProvider>
  </SeasonThemeContext.Provider>
);

const withRouterAndTheme = (ui: React.ReactElement) => {
  const router = createMemoryRouter(
    [{ path: "/", element: withSeasonTheme(ui) }],
    { initialEntries: ["/"] },
  );
  return <RouterProvider router={router} />;
};

const barcaCareer: Career = {
  id: "career-barca-1",
  clubName: "FC Barcelona",
  managerName: "Hansi Flick",
  nation: "Espanha",
  currency: "€",
  teamBadge: "",
  colorsTeams: ["#A50044", "#004D98"],
  trophies: [],
  createdAt: new Date("2024-08-01T00:00:00Z"),
  clubData: [],
};

const barcaSeason: ClubData = {
  id: "season-24-25",
  seasonNumber: 1,
  players: [],
  matches: [],
  teams: [{ name: "Sevilla FC", showMatch: true }],
  table: [],
  trophies: [],
} as unknown as ClubData;

describe("Homologação de Desduplicação e Componentes Genéricos (Etapas 1, 2 e 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddTeamToSeason.mockResolvedValue(undefined);
    mockGetAllTeamsAcrossUserCareers.mockResolvedValue([
      "FC Barcelona",
      "Bayern München",
      "Arsenal",
    ]);
    mockAddTeamToTable.mockResolvedValue(undefined);
    mockUpdateTeamInTable.mockResolvedValue(undefined);
    mockDeleteTeamFromTable.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  describe("1. Botões Temáticos e Parametrizados (ThemedActionButton & AddOrEditLeagueButton)", () => {
    it("renderiza ThemedActionButton e botões nominais de Buttons.* com activeStyle e dispara onClick", () => {
      const onClick = vi.fn();
      render(
        withSeasonTheme(
          <>
            <ThemedActionButton
              label="Adicionar Atleta"
              icon={<FaStar />}
              onClick={onClick}
            />
            <Buttons.AddSquadPlayer onClick={onClick} />
            <Buttons.ManageClauses onClick={onClick} />
          </>,
        ),
      );

      const customBtn = screen.getByRole("button", { name: /Adicionar Atleta/i });
      expect(customBtn.style.backgroundColor).toBe("rgb(0, 77, 152)");
      expect(customBtn.style.color).toBe("rgb(255, 255, 255)");

      fireEvent.click(customBtn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("renderiza AddOrEditLeagueButton com labels padrão e customizados ('Salvar Bônus')", () => {
      const onClick = vi.fn();
      const { rerender } = render(
        withSeasonTheme(
          <AddOrEditLeagueButton isEditing={false} onClick={onClick} />,
        ),
      );

      expect(
        screen.getByRole("button", { name: "Adicionar Liga" }),
      ).toBeTruthy();

      rerender(
        withSeasonTheme(
          <AddOrEditLeagueButton
            isEditing={false}
            onClick={onClick}
            addLabel="Salvar Bônus"
          />,
        ),
      );
      const bonusBtn = screen.getByRole("button", { name: "Salvar Bônus" });
      fireEvent.click(bonusBtn);
      expect(onClick).toHaveBeenCalledTimes(1);

      rerender(
        withSeasonTheme(
          <AddOrEditLeagueButton
            isEditing={true}
            onClick={onClick}
            addLabel="Salvar Bônus"
          />,
        ),
      );
      expect(
        screen.getByRole("button", { name: "Salvar Alterações" }),
      ).toBeTruthy();
    });
  });

  describe("2. SectionSummaryCard e ExpandableLeagueStatsRow", () => {
    it("renderiza SectionSummaryCard, SectionSummaryGrid e SectionSummaryItem com color e boldLabel", () => {
      render(
        withSeasonTheme(
          <SectionSummaryCard title="Resumo FC Barcelona">
            <SectionSummaryGrid>
              <SectionSummaryItem
                label="Posição"
                value="MC"
                icon={<FaStar data-testid="summary-icon" />}
                color="rgb(165, 0, 68)"
                boldLabel
              />
            </SectionSummaryGrid>
          </SectionSummaryCard>,
        ),
      );

      expect(screen.getByText("Resumo FC Barcelona")).toBeTruthy();
      expect(screen.getByText("Posição")).toBeTruthy();
      expect(screen.getByText("MC")).toBeTruthy();
      expect(screen.getByTestId("summary-icon")).toBeTruthy();
    });

    it("renderiza ExpandableLeagueStatsRow nos modos temporada e total, com e sem troféu", () => {
      const onToggle = vi.fn();
      const { rerender } = render(
        <MemoryRouter>
          {withSeasonTheme(
            <ExpandableLeagueStatsRow
              expandKey="season-1-LaLiga"
              fallbackLeagueName="LaLiga"
              isGoalkeeper={false}
              isExpanded={true}
              onToggleExpand={onToggle}
              leagueStats={{
                leagueName: "LaLiga",
                leagueImage: "/images/leagues/laliga.png",
                stats: {
                  games: 35,
                  goals: 12,
                  assists: 15,
                  rating: 8.2,
                  cleanSheets: 0,
                },
              }}
              trophy={{
                leagueName: "LaLiga",
                leagueImage: "/images/leagues/laliga.png",
                seasons: ["24/25"],
              }}
              isTotal={false}
            />,
          )}
        </MemoryRouter>,
      );

      expect(screen.getByText(/Campeão da/i)).toBeTruthy();
      expect(screen.getByText(/LaLiga/i)).toBeTruthy();

      rerender(
        <MemoryRouter>
          {withSeasonTheme(
            <ExpandableLeagueStatsRow
              expandKey="Champions League"
              fallbackLeagueName="Champions League"
              isGoalkeeper={false}
              isExpanded={true}
              onToggleExpand={onToggle}
              isTotal={true}
            />,
          )}
        </MemoryRouter>,
      );

      expect(screen.getByText(/Não ganhou a/i)).toBeTruthy();
    });
  });

  describe("3. Datas (Date.ts) e Escrita Única em useTableTeamActions", () => {
    it("processa getValidDate e formatSeasonShortLabel para Date, ISO, Timestamp, Europa e não-Europa", () => {
      const fromTs = getValidDate({ seconds: 1722470400 });
      expect(fromTs.getUTCFullYear()).toBe(2024);

      expect(
        formatSeasonShortLabel(new Date("2024-08-15T12:00:00Z"), "Espanha", 1),
      ).toBe("24/25");
      expect(
        formatSeasonShortLabel("2024-08-15T12:00:00Z", "Brasil", 2),
      ).toBe("2025");
      expect(
        formatSeasonShortLabel({ seconds: 1723723200 }, "Espanha", 2),
      ).toBe("25/26");
    });

    it("executa ServiceTable.addTeamToTable exatamente 1 vez por submissão em useTableTeamActions", async () => {
      const onClose = vi.fn();
      const contextValue = {
        career: barcaCareer,
        season: barcaSeason,
        teamId: undefined,
        teamToEdit: undefined,
        onClose,
        formValues: {
          teamName: "FC Barcelona",
          played: "10",
          won: "9",
          drawn: "1",
          lost: "0",
          goalsFor: "31",
          goalsAgainst: "6",
          points: "28",
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
        <AddTeamsToTableContext.Provider value={contextValue as never}>
          {children}
        </AddTeamsToTableContext.Provider>
      );

      const { result } = renderHook(() => useTableTeamActions(), { wrapper });

      await act(async () => {
        await result.current.saveTableTeam();
      });

      expect(mockAddTeamToTable).toHaveBeenCalledTimes(1);
      expect(mockUpdateTeamInTable).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("4. Subtelas Compartilhadas de Elenco e Bônus (SquadTab/views/shared & useTransferBonusesDraft)", () => {
    it("gera seções de identidade com buildPlayerIdentitySections e normaliza setores legados", () => {
      expect(normalizeSector("Meias")).toBe("Meia");

      const fullSections = buildPlayerIdentitySections({
        nationValue: "ESP",
        sectorValue: "Meias",
        pastPlayerOptions: ["Gavi", "Pedri"],
        includeExtendedFields: true,
      });

      expect(fullSections.playerInfoSection.title).toBe(
        "Informações do Jogador",
      );
      expect(fullSections.playerInfoSection.fields).toHaveLength(5);
      expect(fullSections.statusSection.title).toBe("Status");
      expect(fullSections.searchPastPlayerSection.title).toBe("Buscar Jogador");

      const compactSections = buildPlayerIdentitySections({
        nationValue: "ESP",
        sectorValue: "Ataque",
        pastPlayerOptions: [],
        includeExtendedFields: false,
      });
      expect(compactSections.playerInfoSection.fields).toHaveLength(2);
    });

    it("filtra clube atual da carreira em useGlobalTeamsOptions e evita duplicar times em ensureTeamSavedInSeason", async () => {
      const { result } = renderHook(() =>
        useGlobalTeamsOptions({
          career: barcaCareer,
          season: barcaSeason,
          searchQuery: "",
        }),
      );

      await waitFor(() => {
        expect(result.current.globalTeams).toContain("Bayern München");
      });

      expect(result.current.globalTeams).not.toContain("FC Barcelona");

      const skippedExisting = await ensureTeamSavedInSeason(
        barcaCareer.id,
        barcaSeason.id,
        barcaSeason,
        "Sevilla FC",
      );
      expect(skippedExisting).toBe(false);
      expect(mockAddTeamToSeason).not.toHaveBeenCalled();

      const addedNew = await ensureTeamSavedInSeason(
        barcaCareer.id,
        barcaSeason.id,
        barcaSeason,
        "Girona FC",
      );
      expect(addedNew).toBe(true);
      expect(mockAddTeamToSeason).toHaveBeenCalledTimes(1);
    });

    it("gerencia criação, edição e exclusão de bônus via useTransferBonusesDraft", () => {
      const { result } = renderHook(() => {
        const [formValues, setFormValues] = React.useState<
          Record<string, string>
        >({
          bonusCategory: "Desempenho",
          bonusObjective: "Gols marcados",
          bonusCount: "15",
          bonusValue: "2m",
          toClub: "Bayern München",
        });

        const draft = useTransferBonusesDraft({
          formValues,
          setFormValues,
          requireValueSuffix: true,
        });

        return { formValues, setFormValues, ...draft };
      });

      act(() => {
        const added = result.current.handleAddOrEditBonus();
        expect(added).toBe(true);
      });

      expect(result.current.bonuses).toHaveLength(1);
      expect(result.current.bonuses[0].name).toBe("Gols marcados");
      expect(result.current.bonuses[0].value).toBe(2_000_000);
      expect(result.current.bonuses[0].metric).toBe("goals");

      act(() => {
        result.current.handleEditBonus(0);
      });
      expect(result.current.editingBonusIndex).toBe(0);
      expect(result.current.formValues.bonusObjective).toBe("Gols marcados");

      act(() => {
        result.current.handleDeleteBonus(0);
      });
      expect(result.current.bonuses).toHaveLength(0);
      expect(result.current.editingBonusIndex).toBeNull();
    });

    it("combina formValues e booleanValues em mergeFormValues", () => {
      const merged = mergeFormValues(
        { playerName: "Gavi", nation: "ESP" },
        { isCaptain: true, isKnownPlayer: false },
      );

      expect(merged).toEqual({
        playerName: "Gavi",
        nation: "ESP",
        isCaptain: "true",
        isKnownPlayer: "false",
      });
    });
  });

  describe("5. Páginas Externas (MatchFormSubScreen, SeasonCard, useStatsSummary, GroupEditModal e Academy)", () => {
    it("renderiza MatchFormSubScreen no estado carregado e exibe título e filhos", () => {
      const onClose = vi.fn();
      const onSave = vi.fn();

      render(
        withRouterAndTheme(
          <MatchFormSubScreen
            career={barcaCareer}
            titleText="Lamine Yamal"
            onClose={onClose}
            onSave={onSave}
          >
            <div>Campos da Partida</div>
          </MatchFormSubScreen>,
        ),
      );

      expect(screen.getByText("Lamine Yamal")).toBeTruthy();
      expect(screen.getByText("Campos da Partida")).toBeTruthy();
    });

    it("renderiza SeasonCard sem botão de exclusão quando onDelete não é informado (card Geral)", () => {
      const onClick = vi.fn();
      const { container } = render(
        withSeasonTheme(<SeasonCard title="Geral" onClick={onClick} />),
      );

      expect(screen.getByText("Geral")).toBeTruthy();
      fireEvent.click(screen.getByText("Geral"));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(container.querySelector("svg[color='red']")).toBeNull();
    });

    it("agrupa estatísticas em useStatsSummary usando getPlayerIdentityKey para atleta recontratado", () => {
      const careerWithResignedPlayer: Career = {
        ...barcaCareer,
        clubData: [
          {
            ...barcaSeason,
            id: "s1",
            seasonNumber: 1,
            players: [
              {
                id: "pedri-v1",
                name: "Pedri",
                nation: "ESP",
                sector: "Meia",
                position: "MC",
                overall: 88,
                age: 21,
                shirtNumber: "8",
                statsLeagues: [
                  {
                    leagueName: "LaLiga",
                    stats: {
                      games: 30,
                      goals: 8,
                      assists: 10,
                      rating: 8.1,
                      cleanSheets: 0,
                    },
                  },
                ],
                contract: [],
              } as unknown as Players,
            ],
          },
          {
            ...barcaSeason,
            id: "s2",
            seasonNumber: 2,
            players: [
              {
                id: "pedri-v2",
                playedWithUs: "pedri-v1",
                name: "Pedri",
                nation: "ESP",
                sector: "Meia",
                position: "MC",
                overall: 90,
                age: 22,
                shirtNumber: "8",
                statsLeagues: [
                  {
                    leagueName: "LaLiga",
                    stats: {
                      games: 32,
                      goals: 10,
                      assists: 12,
                      rating: 8.4,
                      cleanSheets: 0,
                    },
                  },
                ],
                contract: [],
              } as unknown as Players,
            ],
          },
        ],
      };

      const { result } = renderHook(() =>
        useStatsSummary(careerWithResignedPlayer),
      );

      expect(result.current.mostGames.name).toBe("Pedri");
      expect(result.current.mostGames.games).toBe(62);
      expect(result.current.mostGoals.goals).toBe(18);
      expect(result.current.mostAssists.assists).toBe(22);
      expect(result.current.mostGoalContributions.goalContributions).toBe(40);
    });

    it("seleciona carreira no GroupEditModal reutilizando CardsModal", () => {
      const onClose = vi.fn();
      const onSelectCareer = vi.fn();

      render(
        withSeasonTheme(
          <GroupEditModal
            careers={[barcaCareer]}
            onClose={onClose}
            onSelectCareer={onSelectCareer}
          />,
        ),
      );

      fireEvent.click(screen.getByText("FC Barcelona"));
      const editBtn = screen.getByRole("button", {
        name: /Editar FC Barcelona/i,
      });
      fireEvent.click(editBtn);

      expect(onSelectCareer).toHaveBeenCalledWith(barcaCareer);
    });

    it("renderiza AcademyFormRenderer, AcademyMatchLineupList e ordena datas da base via extractDateInfo", () => {
      const onSubmit = vi.fn((e: React.FormEvent<HTMLFormElement>) =>
        e.preventDefault(),
      );

      render(
        withSeasonTheme(
          <>
            <AcademyFormRenderer
              formRows={[
                [
                  {
                    name: "name",
                    label: "Nome",
                    placeholder: "Ex: Pau Cubarsí",
                    defaultValue: "Pau Cubarsí",
                  },
                  {
                    name: "hiddenField",
                    label: "Oculto na Evolução",
                    placeholder: "",
                    hideOnEvolution: true,
                  },
                ],
              ]}
              onSubmit={onSubmit}
              submitText="Salvar Joia"
              loadingText="Salvando..."
              isLoading={false}
              isEvolution={true}
              hiddenFields={[{ name: "sector", value: "Defesa" }]}
            />
            <AcademyMatchLineupList
              players={[
                {
                  playerId: "cubarsi-1",
                  playerName: "Pau Cubarsí",
                  rating: 8.5,
                  goals: 1,
                  assists: 0,
                },
              ]}
              allPlayersAcademy={[
                {
                  id: "cubarsi-1",
                  name: "Pau Cubarsí",
                  position: "ZAG",
                } as unknown as AcademyPlayers,
              ]}
            />
          </>,
        ),
      );

      expect(screen.getByText("Nome")).toBeTruthy();
      expect(screen.queryByText("Oculto na Evolução")).toBeNull();
      expect(screen.getByText("Pau Cubarsí")).toBeTruthy();

      const infoAug = extractDateInfo("15/08 - 24/25", true);
      const infoFeb = extractDateInfo("10/02 - 24/25", true);
      expect(infoAug.formattedDate).toBe("15/08/24");
      expect(infoFeb.formattedDate).toBe("10/02/25");
      expect(
        compareAcademyDates("15/08 - 24/25", "10/02 - 24/25", true),
      ).toBeLessThan(0);
    });
  });

  describe("6. Fechamento 100% do Plano Mestre (EditCareerModal Datas, ConfirmModal, RatingBadge e usePlayerInfo)", () => {
    it("delega convertDateToString e convertStringToDate para Date.ts suportando Date, ISO e Firestore Timestamp", () => {
      const fromDate = convertDateToString(new Date(2024, 7, 15));
      expect(fromDate).toBe("15/08/2024");

      const fromTimestampSeconds = convertDateToString({
        seconds: Math.floor(new Date(2025, 4, 10, 12, 0, 0).getTime() / 1000),
      });
      expect(fromTimestampSeconds).toBe("10/05/2025");

      const fromTimestampToDate = convertDateToString({
        seconds: 0,
        toDate: () => new Date(2024, 6, 1),
      });
      expect(fromTimestampToDate).toBe("01/07/2024");

      expect(convertDateToString("")).toBe("");

      const parsed = convertStringToDate("15/08/2024");
      expect(parsed?.getFullYear()).toBe(2024);
      expect(parsed?.getMonth()).toBe(7);
      expect(parsed?.getDate()).toBe(15);
      expect(convertStringToDate("31/02/2024")).toBeUndefined();
      expect(convertStringToDate("15/08")).toBeUndefined();
    });

    it("renderiza ConfirmModal com Modal compartilhado, lockBodyScroll e ações de confirmar/cancelar", () => {
      const onCancel = vi.fn();
      const onConfirm = vi.fn();

      const { unmount } = render(
        <ConfirmModal
          title="Agrupar carreiras do FC Barcelona?"
          description='Mover "FC Barcelona" para o save de Hansi Flick.'
          confirmText="Agrupar"
          onCancel={onCancel}
          onConfirm={onConfirm}
        />,
      );

      expect(screen.getByText("Agrupar carreiras do FC Barcelona?")).toBeTruthy();
      expect(document.body.classList.contains("modal-open")).toBe(true);

      fireEvent.click(screen.getByRole("button", { name: "Agrupar" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onCancel).toHaveBeenCalledTimes(1);

      unmount();
      expect(document.body.classList.contains("modal-open")).toBe(false);
    });

    it("usa RatingBadge em ComparePlayers StatRow e PlayerMatchModal preservando formatação", () => {
      const matchFixture = {
        id: "fcb-match-1",
        homeTeam: "FC Barcelona",
        awayTeam: "Sevilla",
        homeScore: 4,
        awayScore: 1,
        date: "20/10/2024",
        playerStats: [
          {
            playerId: "lamine-19",
            rating: 8,
            minutesPlayed: 90,
            goals: 2,
            assists: 1,
          },
        ],
      } as unknown as Match;

      const laminePlayer = {
        id: "lamine-19",
        name: "Lamine Yamal",
        shirtNumber: 19,
      } as unknown as Players;

      render(
        <>
          <StatRow label="Nota Média" val1="8.7" val2="8.0" isRating />
          <PlayerMatchModal
            isOpen
            closeModal={vi.fn()}
            match={matchFixture}
            player={laminePlayer}
          />
        </>,
      );

      const badges = screen.getAllByTestId("rating-badge");
      expect(badges).toHaveLength(3);
      expect(badges[0].textContent).toBe("8.7");
      expect(badges[1].textContent).toBe("8.0");
      expect(badges[2].textContent).toBe("8.0");
    });

    it("resolve transações e idade em usePlayerInfo usando Date.ts e findPlayerInList com Timestamp", () => {
      const pedriPlayer = {
        id: "pedri-8",
        name: "Pedri",
        nation: "Espanha",
        age: 22,
        position: "MC",
        statsLeagues: [],
        contract: [
          {
            fromClub: "Las Palmas",
            buyValue: 20000000,
            dataArrival: {
              seconds: Math.floor(
                new Date(2024, 7, 15, 12, 0, 0).getTime() / 1000,
              ),
            },
          },
        ],
      } as unknown as Players;

      const careerWithTs = {
        ...barcaCareer,
        createdAt: {
          seconds: Math.floor(new Date(2024, 6, 1, 12, 0, 0).getTime() / 1000),
        } as unknown as Date,
        clubData: [
          {
            ...barcaSeason,
            id: "season-24-25",
            seasonNumber: 1,
            players: [
              {
                ...pedriPlayer,
                id: "pedri-legacy",
                age: 21,
              },
            ],
          },
        ],
      } as Career;

      const { result } = renderHook(
        () => usePlayerInfo(pedriPlayer, careerWithTs, "season-24-25", false),
        {
          wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
        },
      );

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0].hasBeenBought).toBe(true);
      expect(
        result.current.getPlayerAgeForTransaction("15/08/2024"),
      ).toBe(21);
    });
  });
});
