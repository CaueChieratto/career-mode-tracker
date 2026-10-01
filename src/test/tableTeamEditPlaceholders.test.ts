// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TableRowData } from "../common/interfaces/Table";
import type { Career } from "../common/interfaces/Career";
import type { ClubData } from "../common/interfaces/club/clubData";
import { getTableTeamFormFields } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/constants/TableTeamFormFields";
import {
  getEmptyTableTeamStatFormValues,
  getTableTeamStatPlaceholders,
  resolveTableTeamStatValues,
  type TableTeamStatField,
} from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/helpers/tableTeamFormStats";
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

vi.mock(
  "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable",
  () => ({
    ServiceTable: {
      addTeamToTable: mocks.addTeamToTable,
      updateTeamInTable: mocks.updateTeamInTable,
      deleteTeamFromTable: mocks.deleteTeamFromTable,
    },
  }),
);

vi.mock("uuid", () => ({ v4: () => "new-team-id" }));

const existingTeam: TableRowData = {
  id: "team-1",
  position: 1,
  badge: "badge.png",
  name: "Time Existente",
  played: 2,
  won: 1,
  drawn: 0,
  lost: 1,
  goalsFor: 3,
  goalsAgainst: 2,
  goalDiff: 1,
  points: 3,
  zone: "none",
};

const numericFields: TableTeamStatField[] = [
  "played",
  "won",
  "drawn",
  "lost",
  "goalsFor",
  "goalsAgainst",
];

describe("campos numericos da edicao da tabela", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia os values vazios e usa os valores persistidos como placeholders", () => {
    const formValues = getEmptyTableTeamStatFormValues();
    const placeholders = getTableTeamStatPlaceholders(existingTeam);
    const sections = getTableTeamFormFields(
      [existingTeam.name],
      true,
      true,
      placeholders,
    );
    const fields = sections.flatMap((section) => section.fields.flat());

    for (const fieldId of numericFields) {
      expect(formValues[fieldId]).toBe("");
      expect(fields.find((field) => field.id === fieldId)?.placeholder).toBe(
        String(existingTeam[fieldId]),
      );
    }

    expect(fields.find((field) => field.id === "teamName")?.placeholder).toBe(
      "Nome da equipe",
    );
  });

  it("substitui somente o campo digitado e preserva os demais, incluindo zero real", () => {
    expect(
      resolveTableTeamStatValues(
        {
          ...getEmptyTableTeamStatFormValues(),
          played: "38",
        },
        existingTeam,
      ),
    ).toEqual({
      played: 38,
      won: 1,
      drawn: 0,
      lost: 1,
      goalsFor: 3,
      goalsAgainst: 2,
      points: 3,
      goalDiff: 1,
    });
  });

  it("calcula pontos e saldo a partir dos valores efetivos finais", () => {
    expect(
      resolveTableTeamStatValues(
        {
          ...getEmptyTableTeamStatFormValues(),
          won: "20",
          drawn: "8",
          goalsFor: "70",
        },
        existingTeam,
      ),
    ).toMatchObject({
      won: 20,
      drawn: 8,
      goalsFor: 70,
      goalsAgainst: 2,
      points: 68,
      goalDiff: 68,
    });
  });

  it("mantem zeros como default para time realmente novo", () => {
    expect(resolveTableTeamStatValues({})).toEqual({
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      goalDiff: 0,
    });
    expect(getTableTeamStatPlaceholders()).toEqual({});
  });

  it("produz payload numerico sem reutilizar strings de placeholder", () => {
    const result = resolveTableTeamStatValues(
      getEmptyTableTeamStatFormValues(),
      existingTeam,
    );

    for (const fieldId of [...numericFields, "points", "goalDiff"] as const) {
      expect(typeof result[fieldId]).toBe("number");
    }
  });

  it("envia ao save os valores efetivos e mantem teamName", async () => {
    const onClose = vi.fn();
    mocks.context = {
      career: {
        id: "career-1",
        clubName: "Meu Clube",
      } as Career,
      season: {
        id: "season-1",
        teams: [{ name: existingTeam.name, badge: existingTeam.badge }],
      } as ClubData,
      teamId: existingTeam.id,
      teamToEdit: existingTeam,
      formValues: {
        teamName: existingTeam.name,
        ...getEmptyTableTeamStatFormValues(),
        played: "38",
      },
      onClose,
    };
    mocks.updateTeamInTable.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTableTeamActions());
    await act(async () => result.current.saveTableTeam());

    const payload = mocks.updateTeamInTable.mock.calls.at(-1)?.[3];
    expect(payload).toMatchObject({
      name: existingTeam.name,
      played: 38,
      won: 1,
      drawn: 0,
      lost: 1,
      goalsFor: 3,
      goalsAgainst: 2,
      points: 3,
      goalDiff: 1,
    });
    expect(mocks.addTeamToTable).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith({
      type: "UPDATE_TABLE_TEAM",
      team: payload,
    });
  });
});
