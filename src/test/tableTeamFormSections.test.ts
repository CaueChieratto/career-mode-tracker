// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Career } from "../common/interfaces/Career";
import type { ClubData } from "../common/interfaces/club/clubData";
import type { TableRowData } from "../common/interfaces/Table";
import { useTableTeamForm } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/hooks/useTableTeamForm";
import { useTableTeamActions } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/hooks/useTableTeamActions";

const mocks = vi.hoisted(() => ({
  context: undefined as unknown,
  addTeamToTable: vi.fn(),
  updateTeamInTable: vi.fn(),
  deleteTeamFromTable: vi.fn(),
}));

vi.mock(
  "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/contexts/context",
  () => ({ useAddTeamsToTableContext: () => mocks.context }),
);

vi.mock("../common/services/ServiceTable", () => ({
  ServiceTable: {
    addTeamToTable: mocks.addTeamToTable,
    updateTeamInTable: mocks.updateTeamInTable,
    deleteTeamFromTable: mocks.deleteTeamFromTable,
  },
}));

vi.mock("uuid", () => ({ v4: () => "new-table-team-id" }));

const baseCareer = {
  id: "career-barca",
  clubName: "FC Barcelona",
  teamBadge: "/barca.png",
  nation: "Espanha",
} as Career;

const editedRow: TableRowData = {
  id: "row-sevilla",
  position: 4,
  badge: "/sevilla.png",
  name: "Sevilla FC",
  played: 10,
  won: 6,
  drawn: 2,
  lost: 2,
  goalsFor: 18,
  goalsAgainst: 11,
  goalDiff: 7,
  points: 20,
  zone: "champions",
};

const expectedEditSectionTitles = [
  "Seleção de Equipe",
  "Classificação Manual",
  "Estatísticas de Partidas",
  "Estatísticas de Gols",
  "Manutenção",
];

describe("AddTeamsToTable - exibição completa de seções do formulário", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe todas as seções ao editar time salvo com nome de liga legado ('La Liga' vs 'LaLiga')", () => {
    mocks.context = {
      career: baseCareer,
      season: {
        id: "season-1",
        teams: [
          { name: "Sevilla FC", badge: "/sevilla.png", leagueName: "La Liga" },
        ],
        matches: [],
      } as unknown as ClubData,
      teamId: editedRow.id,
      teamToEdit: editedRow,
      formValues: { teamName: "Sevilla FC" },
      onClose: vi.fn(),
    };

    const { result } = renderHook(() =>
      useTableTeamForm({ addedTeamNames: ["FC Barcelona", "Sevilla FC"] }),
    );

    expect(result.current.formFields.map((s) => s.title)).toEqual(
      expectedEditSectionTitles,
    );
  });

  it("exibe todas as seções e permite salvar ao editar time na tabela ausente de season.teams", async () => {
    const onClose = vi.fn();
    mocks.context = {
      career: baseCareer,
      season: {
        id: "season-1",
        teams: [],
        matches: [],
      } as unknown as ClubData,
      teamId: editedRow.id,
      teamToEdit: editedRow,
      formValues: { teamName: "Sevilla FC", won: "7" },
      onClose,
    };
    mocks.updateTeamInTable.mockResolvedValue(undefined);

    const { result: formResult } = renderHook(() =>
      useTableTeamForm({ addedTeamNames: ["Sevilla FC"] }),
    );
    expect(formResult.current.formFields.map((s) => s.title)).toEqual(
      expectedEditSectionTitles,
    );

    const { result: actionResult } = renderHook(() => useTableTeamActions());
    await act(async () => actionResult.current.saveTableTeam());

    expect(mocks.updateTeamInTable).toHaveBeenCalledTimes(1);
    const savedPayload = mocks.updateTeamInTable.mock.calls[0]?.[3];
    expect(savedPayload).toMatchObject({
      id: "row-sevilla",
      name: "Sevilla FC",
      badge: "/sevilla.png",
      won: 7,
    });
    expect(onClose).toHaveBeenCalledWith({
      type: "UPDATE_TABLE_TEAM",
      team: savedPayload,
    });
  });

  it("exibe todas as seções no primeiro render de edição antes do formValues.teamName ser populado", () => {
    mocks.context = {
      career: baseCareer,
      season: {
        id: "season-1",
        teams: [],
        matches: [],
      } as unknown as ClubData,
      teamId: editedRow.id,
      teamToEdit: editedRow,
      formValues: {},
      onClose: vi.fn(),
    };

    const { result } = renderHook(() => useTableTeamForm());

    expect(result.current.formFields.map((s) => s.title)).toEqual(
      expectedEditSectionTitles,
    );
  });

  it("inclui time com showMatch=false quando participou de partida de liga válida", () => {
    mocks.context = {
      career: baseCareer,
      season: {
        id: "season-1",
        teams: [{ name: "Sevilla FC", showMatch: false }],
        matches: [
          {
            matchesId: "m-1",
            league: "La Liga",
            homeTeam: "FC Barcelona",
            awayTeam: "Sevilla FC",
          },
        ],
      } as unknown as ClubData,
      teamId: undefined,
      teamToEdit: undefined,
      formValues: { teamName: "Sevilla FC" },
      onClose: vi.fn(),
    };

    const { result } = renderHook(() => useTableTeamForm());

    expect(result.current.formFields.map((s) => s.title)).toEqual([
      "Seleção de Equipe",
      "Classificação Manual",
      "Estatísticas de Partidas",
      "Estatísticas de Gols",
    ]);
  });

  it("reconhece ligas customizadas da temporada marcadas com league=true", () => {
    mocks.context = {
      career: baseCareer,
      season: {
        id: "season-1",
        leagues: [{ name: "Superliga Catalã", logo: "", league: true }],
        teams: [
          {
            name: "Girona FC",
            leagueName: "Superliga Catalã",
          },
        ],
        matches: [],
      } as unknown as ClubData,
      teamId: undefined,
      teamToEdit: undefined,
      formValues: { teamName: "Girona FC" },
      onClose: vi.fn(),
    };

    const { result } = renderHook(() => useTableTeamForm());

    expect(result.current.formFields.map((s) => s.title)).toEqual([
      "Seleção de Equipe",
      "Classificação Manual",
      "Estatísticas de Partidas",
      "Estatísticas de Gols",
    ]);
  });
});
