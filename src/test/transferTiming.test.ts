import { describe, it, expect } from "vitest";
import {
  shouldPlayerLeaveOnNextWindow,
  isPlayerSoldOrDeparted,
} from "../common/services/ServicePlayers/helpers/transferTimingHelpers";
import { buildSquadData } from "../layout/SectionView/features/ClubTabs/SquadTab/helpers/buildSquadData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Match } from "../common/interfaces/Match";

describe("Caso Xavi Espart: Venda com 'Próxima Janela' e remoção dinâmica no SquadTab", () => {
  const xaviEspart: Players = {
    id: "fdf63831-d740-4c2b-99ec-1f0d3a2d352d",
    name: "Xavi Espart",
    sell: false,
    buy: false,
    ballonDor: 0,
    nation: "ESP",
    age: 19,
    position: "LD",
    sector: "Defesa",
    overall: 71,
    shirtNumber: "12",
    captain: false,
    loan: false,
    incomingLoan: false,
    statsLeagues: [],
    contract: [
      {
        buyValue: 0,
        sellValue: 25400000,
        fromClub: "",
        leftClub: "Tottenham",
        dataArrival: null,
        dataExit: new Date("2026-07-13T03:00:00.000Z"),
        timing: "Próxima Janela",
        isLoan: false,
      },
    ],
  };

  const julesKounde: Players = {
    id: "c7b8dd4e-bd90-42aa-b575-5ab2b33fd0ec",
    name: "Jules Koundé",
    sell: true,
    buy: false,
    ballonDor: 0,
    nation: "FRA",
    age: 28,
    position: "LD",
    sector: "Defesa",
    overall: 85,
    shirtNumber: "23",
    captain: false,
    loan: false,
    incomingLoan: false,
    statsLeagues: [],
    contract: [
      {
        buyValue: 0,
        sellValue: 75600000,
        fromClub: "",
        leftClub: "Tottenham",
        dataArrival: null,
        dataExit: new Date("2026-07-13T03:00:00.000Z"),
        timing: "Imediata",
        isLoan: false,
      },
    ],
  };

  const regularPlayer: Players = {
    id: "regular-1",
    name: "Alejandro Balde",
    sell: false,
    buy: false,
    ballonDor: 0,
    nation: "ESP",
    age: 23,
    position: "LE",
    sector: "Defesa",
    overall: 82,
    shirtNumber: "3",
    captain: false,
    loan: false,
    incomingLoan: false,
    statsLeagues: [],
    contract: [],
  };

  const loanedOutPlayer: Players = {
    id: "loaned-1",
    name: "Vitor Roque",
    sell: false,
    buy: false,
    ballonDor: 0,
    nation: "BRA",
    loan: true,
    age: 21,
    position: "ATA",
    sector: "Ataque",
    overall: 78,
    shirtNumber: "19",
    captain: false,
    incomingLoan: false,
    statsLeagues: [],
    contract: [
      {
        buyValue: 0,
        sellValue: 0,
        fromClub: "",
        leftClub: "Real Betis",
        dataArrival: null,
        isLoan: true,
      },
    ],
  };

  const matchesFinishedDecember: Match[] = [
    {
      matchesId: "88edff81-3c57-4cbb-aab8-a8af571a990b",
      date: "31/12/26",
      status: "FINISHED",
      homeTeam: "aaaaaaaa",
      awayTeam: "AEK Atenas",
      homeScore: 1,
      awayScore: 0,
    } as unknown as Match,
    {
      matchesId: "99edff81-3c57-4cbb-aab8-a8af571a990c",
      date: "01/01/27",
      status: "SCHEDULED",
      homeTeam: "Bayern",
      awayTeam: "aaaaaaaa",
    } as unknown as Match,
  ];

  const matchesPendingDecember: Match[] = [
    {
      matchesId: "88edff81-3c57-4cbb-aab8-a8af571a990b",
      date: "31/12/26",
      status: "SCHEDULED",
      homeTeam: "aaaaaaaa",
      awayTeam: "AEK Atenas",
    } as unknown as Match,
    {
      matchesId: "99edff81-3c57-4cbb-aab8-a8af571a990c",
      date: "01/01/27",
      status: "SCHEDULED",
      homeTeam: "Bayern",
      awayTeam: "aaaaaaaa",
    } as unknown as Match,
  ];

  it("shouldPlayerLeaveOnNextWindow retorna true quando jogo de 31/12 está FINISHED e de 01/01 está SCHEDULED", () => {
    const shouldLeave = shouldPlayerLeaveOnNextWindow(
      matchesFinishedDecember,
      xaviEspart.contract![0].dataExit,
    );
    expect(shouldLeave).toBe(true);
  });

  it("shouldPlayerLeaveOnNextWindow retorna false quando jogo de 31/12 ainda está SCHEDULED", () => {
    const shouldLeave = shouldPlayerLeaveOnNextWindow(
      matchesPendingDecember,
      xaviEspart.contract![0].dataExit,
    );
    expect(shouldLeave).toBe(false);
  });

  it("isPlayerSoldOrDeparted identifica que Xavi Espart já partiu na janela de Janeiro", () => {
    expect(isPlayerSoldOrDeparted(xaviEspart, matchesFinishedDecember)).toBe(true);
  });

  it("isPlayerSoldOrDeparted identifica que Xavi Espart ainda não partiu enquanto o jogo de 31/12 não for concluído", () => {
    expect(isPlayerSoldOrDeparted(xaviEspart, matchesPendingDecember)).toBe(false);
  });

  it("buildSquadData exclui Xavi Espart e Koundé do SquadTab quando a janela de Janeiro abre", () => {
    const allPlayers = [xaviEspart, julesKounde, regularPlayer, loanedOutPlayer];

    const { groupedData, flatData } = buildSquadData(
      allPlayers,
      "Ordenar por padrão",
      false,
      matchesFinishedDecember,
    );

    // Koundé e Xavi Espart não devem estar no elenco ativo
    expect(flatData.some((p) => p.name === "Jules Koundé")).toBe(false);
    expect(flatData.some((p) => p.name === "Xavi Espart")).toBe(false);

    // Balde deve estar no elenco
    expect(flatData.some((p) => p.name === "Alejandro Balde")).toBe(true);

    // Vitor Roque deve estar no grupo 'loaned'
    const loanedPlayers = groupedData.get("loaned") || [];
    expect(loanedPlayers.some((p) => p.name === "Vitor Roque")).toBe(true);
  });

  it("buildSquadData mantém Xavi Espart no SquadTab enquanto dezembro estiver em andamento", () => {
    const allPlayers = [xaviEspart, julesKounde, regularPlayer, loanedOutPlayer];

    const { flatData } = buildSquadData(
      allPlayers,
      "Ordenar por padrão",
      false,
      matchesPendingDecember,
    );

    // Xavi Espart deve permanecer no elenco ativo antes do término de dezembro
    expect(flatData.some((p) => p.name === "Xavi Espart")).toBe(true);

    // Koundé foi venda imediata (sell: true), então nunca aparece
    expect(flatData.some((p) => p.name === "Jules Koundé")).toBe(false);
  });
});

