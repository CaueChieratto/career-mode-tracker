// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  renderHook,
  act,
} from "@testing-library/react";
import {
  isFirestoreTimestamp,
  getValidDate,
  isEuropeanSeason,
  getSeasonStartYear,
  formatSeasonShortLabel,
} from "../common/utils/Date";
import { getSeasonDateRange } from "../common/utils/GetSeasonDateRange";
import { getSeasonName } from "../common/utils/GetSeasonName";
import {
  getAllLeaguesFlat,
  isContinentalOrCupCompetition,
  contributesToLeagueStandings,
  getContinentByCountry,
} from "../common/utils/league";
import { getPositionRank } from "../common/utils/Sorts";
import {
  getLuminance,
  getContrastTextColor,
} from "../common/hooks/Colors/UseClubColors";
import { useForm } from "../common/hooks/UseForm";
import { SeasonThemeContext } from "../contexts/SeasonThemeContext";
import { Buttons, ThemedActionButton } from "../common/elements/Buttons";
import AddOrEditLeagueButton from "../common/elements/Buttons/AddOrEditLeagueButton";
import { RatingBadge } from "../components/RatingBadge";
import { PlayerStatRow } from "../layout/SectionView/features/ClubTabs/BestPlayersTab/components/PlayerStatRow";
import { Players } from "../common/interfaces/playersInfo/players";

afterEach(cleanup);

const fcbCareer = {
  id: "fc_barcelona_career",
  club: "FC Barcelona",
  nation: "Espanha",
  createdAt: "2024-08-01T00:00:00.000Z",
};

const mockFcbThemeValue = {
  clubColor: "#004D98",
  darkClubColor: "#004D98",
  changeClubColor: vi.fn(),
  activeStyle: {
    darkClubColor: "#004D98",
    color: "#FFFFFF",
    fontWeight: "bold",
    border: "1px solid #A50044",
  },
};

const renderWithFcbTheme = (ui: React.ReactElement) =>
  render(
    <SeasonThemeContext.Provider
      value={
        mockFcbThemeValue as unknown as React.ContextType<
          typeof SeasonThemeContext
        >
      }
    >
      {ui}
    </SeasonThemeContext.Provider>,
  );

describe("Utilitários de Data e Temporada (Date.ts, GetSeasonDateRange, GetSeasonName)", () => {
  it("valida isFirestoreTimestamp e getValidDate para Date, ISO, número e Timestamp do Firestore", () => {
    const isoDate = getValidDate(fcbCareer.createdAt);
    expect(isoDate.getFullYear()).toBe(2024);

    const tsWithSeconds = { seconds: 1722470400 };
    expect(isFirestoreTimestamp(tsWithSeconds)).toBe(true);
    expect(getValidDate(tsWithSeconds).getUTCFullYear()).toBe(2024);

    const tsWithToDate = {
      seconds: 1722470400,
      toDate: () => new Date("2024-08-15T00:00:00.000Z"),
    };
    expect(isFirestoreTimestamp(tsWithToDate)).toBe(true);
    expect(getValidDate(tsWithToDate).toISOString()).toBe(
      "2024-08-15T00:00:00.000Z",
    );

    expect(getValidDate(null).getTime()).toBe(0);
    expect(getValidDate("data-invalida").getTime()).toBe(0);
  });

  it("identifica temporadas europeias do FC Barcelona e gera rótulos YY/YY e YYYY", () => {
    expect(isEuropeanSeason(fcbCareer.nation)).toBe(true);
    expect(isEuropeanSeason("Brasil")).toBe(false);
    expect(isEuropeanSeason(undefined)).toBe(false);

    expect(getSeasonStartYear(fcbCareer.createdAt, 1)).toBe(2024);
    expect(getSeasonStartYear(fcbCareer.createdAt, 3)).toBe(2026);

    expect(
      formatSeasonShortLabel(fcbCareer.createdAt, fcbCareer.nation, 1),
    ).toBe("24/25");
    expect(
      formatSeasonShortLabel(fcbCareer.createdAt, fcbCareer.nation, 2),
    ).toBe("25/26");
    expect(formatSeasonShortLabel(fcbCareer.createdAt, "Brasil", 1)).toBe(
      "2024",
    );

    expect(getSeasonName(1, fcbCareer.createdAt, fcbCareer.nation)).toBe(
      "24/25",
    );
    expect(getSeasonName(2, { seconds: 1722470400 }, "Espanha")).toBe("25/26");
  });

  it("calcula corretamente o intervalo de datas de temporada europeia (Jul-Jun) e não europeia (Jan-Dez)", () => {
    const fcbRange = getSeasonDateRange(1, fcbCareer.createdAt, "Espanha");
    expect(fcbRange.startDate.getFullYear()).toBe(2024);
    expect(fcbRange.startDate.getMonth()).toBe(6);
    expect(fcbRange.endDate.getFullYear()).toBe(2025);
    expect(fcbRange.endDate.getMonth()).toBe(5);

    const brRange = getSeasonDateRange(1, "2024-02-10T00:00:00.000Z", "Brasil");
    expect(brRange.startDate.getFullYear()).toBe(2024);
    expect(brRange.startDate.getMonth()).toBe(0);
    expect(brRange.endDate.getFullYear()).toBe(2024);
    expect(brRange.endDate.getMonth()).toBe(11);
  });
});

describe("Utilitários de Ligas e Classificação (league.ts)", () => {
  it("achata todas as ligas via getAllLeaguesFlat e resolve continentes", () => {
    const allLeagues = getAllLeaguesFlat();
    expect(allLeagues.length).toBeGreaterThan(10);
    expect(allLeagues.some((l) => l.name === "LaLiga")).toBe(true);
    expect(allLeagues.some((l) => l.name === "Champions League")).toBe(true);

    expect(getContinentByCountry("Espanha")).toBe("Europa");
  });

  it("distingue ligas domésticas de copas e competições continentais", () => {
    expect(contributesToLeagueStandings("LaLiga", "Espanha")).toBe(true);
    expect(contributesToLeagueStandings("LaLiga 2", "Espanha")).toBe(true);
    expect(contributesToLeagueStandings("Copa del Rey", "Espanha")).toBe(false);
    expect(contributesToLeagueStandings("Champions League", "Espanha")).toBe(
      false,
    );
    expect(contributesToLeagueStandings("")).toBe(false);
    expect(contributesToLeagueStandings("Amistoso de Pré-Temporada")).toBe(
      false,
    );

    expect(isContinentalOrCupCompetition("Champions League")).toBe(true);
    expect(isContinentalOrCupCompetition("Copa del Rey")).toBe(true);
    expect(isContinentalOrCupCompetition("LaLiga")).toBe(false);
  });
});

describe("Ranking de Posições (Sorts.getPositionRank)", () => {
  it("ordena posições do FC Barcelona na sequência de POSITION_DATA (ATA -> MC -> ZAG -> GOL)", () => {
    expect(getPositionRank("ATA")).toBeLessThan(getPositionRank("MC"));
    expect(getPositionRank("MC")).toBeLessThan(getPositionRank("ZAG"));
    expect(getPositionRank("ZAG")).toBeLessThan(getPositionRank("GOL"));
    expect(getPositionRank("DESCONHECIDA")).toBe(999);
  });
});

describe("Luminância e Contraste de Cores (UseClubColors)", () => {
  it("calcula luminância e contraste para as cores oficiais do FC Barcelona", () => {
    expect(getLuminance("#004D98")).toBeLessThan(128);
    expect(getLuminance("#A50044")).toBeLessThan(128);
    expect(getLuminance("#EDBB00")).toBeGreaterThanOrEqual(128);

    expect(getContrastTextColor("#004D98")).toBe("#FFFFFF");
    expect(getContrastTextColor("#A50044")).toBe("#FFFFFF");
    expect(getContrastTextColor("#EDBB00")).toBe("#000000");
    expect(getContrastTextColor("#FFF")).toBe("#000000");
  });
});

describe("Hook useForm (mergedFormValues)", () => {
  it("expõe mergedFormValues unindo formValues e booleanValues convertidos para string", () => {
    const { result } = renderHook(() => useForm());

    expect(result.current.mergedFormValues.isSigning).toBe("false");
    expect(result.current.mergedFormValues.isCaptain).toBe("false");

    act(() => {
      result.current.setFormValues((prev) => ({
        ...prev,
        playerName: "Pedri",
      }));
      result.current.handleCaptainChange(true);
    });

    expect(result.current.mergedFormValues.playerName).toBe("Pedri");
    expect(result.current.mergedFormValues.isCaptain).toBe("true");
    expect(result.current.mergedFormValues.isSigning).toBe("false");
  });
});

describe("ThemedActionButton e os 10 Botões Temáticos", () => {
  it("aplica activeStyle do SeasonThemeContext e aciona onClick em ThemedActionButton", () => {
    const onClick = vi.fn();
    renderWithFcbTheme(
      <ThemedActionButton label="Escalar FC Barcelona" onClick={onClick} />,
    );

    const btn = screen.getByRole("button", { name: /Escalar FC Barcelona/i });
    expect(btn.style.backgroundColor).toBe("rgb(0, 77, 152)");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renderiza todos os 10 botões temáticos mantendo rótulos e ações", () => {
    mockFcbThemeValue.changeClubColor.mockClear();
    const clickHandlers = Array.from({ length: 9 }, () => vi.fn());

    renderWithFcbTheme(
      <div>
        <Buttons.AddDetails onClick={clickHandlers[0]} />
        <Buttons.AddMatches onClick={clickHandlers[1]} />
        <Buttons.AddPlayerSeason onClick={clickHandlers[2]} />
        <Buttons.AddSquadPlayer onClick={clickHandlers[3]} />
        <Buttons.AddStatsMatch onClick={clickHandlers[4]} />
        <Buttons.AddTeamsToTable onClick={clickHandlers[5]} />
        <Buttons.ChangeClubColors />
        <Buttons.EnterAcademy onClick={clickHandlers[6]} />
        <Buttons.ManageClauses onClick={clickHandlers[7]} />
        <Buttons.SaveFormation onClick={clickHandlers[8]} />
      </div>,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(10);

    fireEvent.click(screen.getByRole("button", { name: /Adicionar resultado/i }));
    fireEvent.click(screen.getByRole("button", { name: /Adicionar partida/i }));
    fireEvent.click(screen.getByRole("button", { name: /Adicionar jogador/i }));
    fireEvent.click(screen.getByRole("button", { name: /Adicionar times/i }));
    fireEvent.click(screen.getByRole("button", { name: /Trocar Cores/i }));
    fireEvent.click(screen.getByRole("button", { name: /Acessar Base/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cláusulas/i }));
    fireEvent.click(screen.getByRole("button", { name: /Salvar Formação/i }));

    expect(clickHandlers[0]).toHaveBeenCalledTimes(1);
    expect(clickHandlers[1]).toHaveBeenCalledTimes(1);
    expect(clickHandlers[3]).toHaveBeenCalledTimes(1);
    expect(clickHandlers[5]).toHaveBeenCalledTimes(1);
    expect(mockFcbThemeValue.changeClubColor).toHaveBeenCalledTimes(1);
    expect(clickHandlers[6]).toHaveBeenCalledTimes(1);
    expect(clickHandlers[7]).toHaveBeenCalledTimes(1);
    expect(clickHandlers[8]).toHaveBeenCalledTimes(1);
  });
});

describe("AddOrEditLeagueButton parametrizado", () => {
  it("suporta labels padrão e labels customizados (ex.: Salvar Bônus)", () => {
    const onClick = vi.fn();

    const { rerender } = renderWithFcbTheme(
      <AddOrEditLeagueButton isEditing={false} onClick={onClick} />,
    );
    expect(
      screen.getByRole("button", { name: "Adicionar Liga" }),
    ).toBeDefined();

    rerender(
      <SeasonThemeContext.Provider
        value={
          mockFcbThemeValue as unknown as React.ContextType<
            typeof SeasonThemeContext
          >
        }
      >
        <AddOrEditLeagueButton
          isEditing={false}
          onClick={onClick}
          addLabel="Salvar Bônus"
          editLabel="Atualizar Bônus"
        />
      </SeasonThemeContext.Provider>,
    );
    const addBonusBtn = screen.getByRole("button", { name: "Salvar Bônus" });
    fireEvent.click(addBonusBtn);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <SeasonThemeContext.Provider
        value={
          mockFcbThemeValue as unknown as React.ContextType<
            typeof SeasonThemeContext
          >
        }
      >
        <AddOrEditLeagueButton
          isEditing={true}
          onClick={onClick}
          addLabel="Salvar Bônus"
          editLabel="Atualizar Bônus"
        />
      </SeasonThemeContext.Provider>,
    );
    expect(
      screen.getByRole("button", { name: "Atualizar Bônus" }),
    ).toBeDefined();
  });
});

describe("RatingBadge e integração em PlayerStatRow", () => {
  it("formata inteiros sem casas decimais, preserva decimais e aceita customColor", () => {
    const { rerender } = render(<RatingBadge rating={9} />);
    expect(screen.getByTestId("rating-badge").textContent).toBe("9");

    rerender(
      <RatingBadge rating={8.6} variant="compact" customColor="#004D98" />,
    );
    const badge = screen.getByTestId("rating-badge");
    expect(badge.textContent).toBe("8.6");
    expect(badge.style.backgroundColor).toBe("rgb(0, 77, 152)");
  });

  it("renderiza RatingBadge dentro de PlayerStatRow para atleta do FC Barcelona", () => {
    const lamineYamal = {
      id: "lamine_19",
      name: "Lamine Yamal",
      position: "PD",
      sector: "Ataque",
      shirtNumber: "19",
      age: 18,
      nation: "ESP",
      overall: 89,
      ballonDor: 0,
      salary: 150000,
      playerValue: 180000000,
      buy: false,
      captain: false,
      sell: false,
      contractTime: 5,
      contract: [],
      statsLeagues: [],
    } as unknown as Players;

    render(<PlayerStatRow player={lamineYamal} value={8.5} isRating />);
    const badge = screen.getByTestId("rating-badge");
    expect(badge.textContent).toBe("8.5");
  });
});
