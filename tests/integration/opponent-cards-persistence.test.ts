import { describe, expect, it } from "vitest";
import { ServiceMatches } from "../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { buildMatchPayload } from "../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/buildMatchPayload";
import { normalizeOpponentEvents } from "../../src/pages/Match/helpers/opponentCards";
import { career, match, season } from "../../src/test/factories/domain";
import type { Match } from "../../src/common/interfaces/Match";
import type { TableTeamData } from "../../src/common/interfaces/TableTeamData";
import {
  failOnce,
  list,
  matchPath,
  put,
  read,
  seasonPath,
  seedCareer,
} from "./helpers";

const league = { name: "Premier League", trophy: "", logo: "", league: true };

describe("Opponent Cards Persistence & Concurrency Integration", () => {
  it("eventos de cartões adversários e projeções escalares persistem de forma atômica e coerente", async () => {
    const currentSeason = season({
      leagues: [league],
      matches: [],
      table: [],
    });
    const currentCareer = career({
      clubName: "Chelsea",
      clubData: [currentSeason],
    });
    await seedCareer(currentCareer);

    const initialMatch = match({
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
      homeYellowCards: 1,
      homeRedCards: 0,
      awayYellowCards: 0,
      awayRedCards: 0,
    });
    await put(matchPath(), initialMatch);

    const formValues: Record<string, string> = {
      homeScore: "2",
      awayScore: "1",
      opponentCardCount: "2",
      opponentCardPlayer_0: "Saka",
      opponentYellowMin_0: "25",
      opponentCardPlayer_1: "Rice",
      opponentYellowMin_1: "40",
      opponentSecondYellowMin_1: "85",
    };
    const booleanValues: Record<string, boolean> = {
      opponentYellow_0: true,
      opponentSecondYellow_0: false,
      opponentRed_0: false,
      opponentYellow_1: true,
      opponentSecondYellow_1: true,
      opponentRed_1: false,
    };

    const { updatedMatch } = buildMatchPayload(
      initialMatch,
      formValues,
      booleanValues,
      true, // user is home
    );

    // Saka: 1 yellow. Rice: 1 yellow + 1 second yellow (2 yellows, 1 red). Total: 3 yellows, 1 red.
    expect(updatedMatch.awayYellowCards).toBe(3);
    expect(updatedMatch.awayRedCards).toBe(1);

    await ServiceMatches.updateMatchDetailsInSeason(
      currentCareer,
      currentSeason,
      initialMatch,
      updatedMatch as Match,
    );

    const persisted = (await read(matchPath())) as Match;
    expect(persisted).toBeDefined();
    expect(persisted.awayYellowCards).toBe(3);
    expect(persisted.awayRedCards).toBe(1);
    expect(persisted.homeYellowCards).toBe(1);
    expect(persisted.homeRedCards).toBe(0);
    const persistedEvents = normalizeOpponentEvents(persisted.opponentEvents)!;
    expect(persistedEvents.cardsAuthoritative).toBe(true);
    expect(persistedEvents.cards).toHaveLength(2);
    expect(persistedEvents.cards?.[0].player).toBe("Saka");
    expect(persistedEvents.cards?.[1].player).toBe("Rice");
  });

  it("falha no commit do lote não deixa estado parcial na partida", async () => {
    const currentSeason = season();
    const currentCareer = career({
      clubName: "Chelsea",
      clubData: [currentSeason],
    });
    await seedCareer(currentCareer);

    const initialMatch = match({
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      awayYellowCards: 0,
      awayRedCards: 0,
    });
    await put(matchPath(), initialMatch);

    const updatedMatch: Match = {
      ...initialMatch,
      awayYellowCards: 2,
      awayRedCards: 1,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "10",
            secondYellow: true,
            secondYellowMinute: "80",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
    };

    // Inject failure on career updateDoc inside writeBatch
    failOnce("updateDoc", "/careers/c1");

    await expect(
      ServiceMatches.updateMatchDetailsInSeason(
        currentCareer,
        currentSeason,
        initialMatch,
        updatedMatch,
      ),
    ).rejects.toThrow("Injected");

    // Match document must remain untouched
    const persisted = (await read(matchPath())) as Match;
    expect(persisted.awayYellowCards).toBe(0);
    expect(persisted.awayRedCards).toBe(0);
    expect(persisted.opponentEvents).toBeUndefined();
  });

  it("salvamento repetido de detalhes não acumula cartões", async () => {
    const currentSeason = season();
    const currentCareer = career({
      clubName: "Chelsea",
      clubData: [currentSeason],
    });
    await seedCareer(currentCareer);

    const initialMatch = match({
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      awayYellowCards: 0,
    });
    await put(matchPath(), initialMatch);

    const updatedMatch: Match = {
      ...initialMatch,
      awayYellowCards: 2,
      awayRedCards: 0,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "10",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
          {
            player: "Rice",
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
    };

    await ServiceMatches.updateMatchDetailsInSeason(
      currentCareer,
      currentSeason,
      initialMatch,
      updatedMatch,
    );
    await ServiceMatches.updateMatchDetailsInSeason(
      currentCareer,
      currentSeason,
      updatedMatch,
      updatedMatch,
    );

    const persisted = (await read(matchPath())) as Match;
    expect(persisted.awayYellowCards).toBe(2);
    expect(persisted.awayRedCards).toBe(0);
    const persistedEvents = normalizeOpponentEvents(persisted.opponentEvents)!;
    expect(persistedEvents.cards).toHaveLength(2);
  });

  it("remover último cartão nos detalhes zera a projeção e não ressuscita cartão legado", async () => {
    const currentSeason = season();
    const currentCareer = career({
      clubName: "Chelsea",
      clubData: [currentSeason],
    });
    await seedCareer(currentCareer);

    const matchWithCard = match({
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      awayYellowCards: 1,
      awayRedCards: 0,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "15",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
    });
    await put(matchPath(), matchWithCard);

    // User removes all cards
    const formValues: Record<string, string> = {
      homeScore: "1",
      awayScore: "0",
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

    await ServiceMatches.updateMatchDetailsInSeason(
      currentCareer,
      currentSeason,
      matchWithCard,
      updatedMatch as Match,
    );

    const persisted = (await read(matchPath())) as Match;
    expect(persisted.awayYellowCards).toBe(0);
    expect(persisted.awayRedCards).toBe(0);
    const persistedEvents = normalizeOpponentEvents(persisted.opponentEvents)!;
    expect(persistedEvents.cards).toEqual([]);
    expect(persistedEvents.cardsAuthoritative).toBe(true);
  });

  it("usuário pode colocar 2 amarelos em MatchDetailsTab e depois alterar para 3 em MatchStatsTab sem alterar MatchDetailsTab", async () => {
    const currentSeason = season();
    const currentCareer = career({
      clubName: "Chelsea",
      clubData: [currentSeason],
    });
    await seedCareer(currentCareer);

    // Initial state: details recorded with 2 opponent cards
    const initialMatch = match({
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      awayYellowCards: 2,
      awayRedCards: 0,
      homePossession: 50,
      awayPossession: 50,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "10",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
          {
            player: "Rice",
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
    });
    await put(matchPath(), initialMatch);

    // User in MatchStatsTab changes awayYellowCards from 2 to 3
    const statsUpdateMatch: Match = {
      ...initialMatch,
      awayYellowCards: 3,
      homePossession: 62,
      awayPossession: 38,
    };

    await ServiceMatches.updateMatchStatsInSeason(
      "c1",
      "s1",
      statsUpdateMatch,
    );

    const persisted = (await read(matchPath())) as Match;
    // awayYellowCards was updated to 3 as requested by the user
    expect(persisted.awayYellowCards).toBe(3);
    expect(persisted.awayRedCards).toBe(0);
    expect(persisted.homePossession).toBe(62);
    expect(persisted.awayPossession).toBe(38);

    // Opponent events in MatchDetailsTab is 100% preserved (not modified)
    const persistedEvents = normalizeOpponentEvents(persisted.opponentEvents)!;
    expect(persistedEvents.cards).toHaveLength(2);
    expect(persistedEvents.cards?.[0].player).toBe("Saka");
    expect(persistedEvents.cards?.[1].player).toBe("Rice");
    expect(persistedEvents.cardsAuthoritative).toBe(true);
  });

  it("partida legado sem detalhes autoritativos: MatchStatsTab permite salvar cartões manuais normalmente", async () => {
    const currentSeason = season();
    const currentCareer = career({
      clubName: "Chelsea",
      clubData: [currentSeason],
    });
    await seedCareer(currentCareer);

    // Legacy match with manual card counts and no opponentEvents
    const legacyMatch = match({
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      homeYellowCards: 1,
      awayYellowCards: 2,
    });
    delete (legacyMatch as { opponentEvents?: unknown }).opponentEvents;
    await put(matchPath(), legacyMatch);

    // User updates stats in legacy match
    const updatedStats: Match = {
      ...legacyMatch,
      homeYellowCards: 3,
      awayYellowCards: 4,
    };
    await ServiceMatches.updateMatchStatsInSeason(
      "c1",
      "s1",
      updatedStats,
    );

    const persisted = (await read(matchPath())) as Match;
    expect(persisted.homeYellowCards).toBe(3);
    expect(persisted.awayYellowCards).toBe(4);
  });

  it("classificação da liga é atualizada e preservada conjuntamente com os cartões", async () => {
    const previousMatch = match({
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      league: "Premier League",
      status: "SCHEDULED",
    });
    const currentSeason = season({
      leagues: [league],
      matches: [previousMatch],
      table: [],
    });
    const currentCareer = career({
      clubName: "Chelsea",
      clubData: [currentSeason],
    });
    await seedCareer(currentCareer);
    await put(matchPath(), previousMatch);

    const updatedMatch: Match = {
      ...previousMatch,
      status: "FINISHED",
      result: "V",
      homeScore: 3,
      awayScore: 1,
      awayYellowCards: 1,
      awayRedCards: 0,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "30",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
    };

    await ServiceMatches.updateMatchDetailsInSeason(
      currentCareer,
      currentSeason,
      previousMatch,
      updatedMatch,
    );

    const tableRows = await list<TableTeamData>(`${seasonPath()}/table`);
    const chelseaRow = tableRows.find((r) => r.name === "Chelsea");
    const arsenalRow = tableRows.find((r) => r.name === "Arsenal");

    expect(chelseaRow).toMatchObject({
      played: 1,
      won: 1,
      points: 3,
      goalsFor: 3,
      goalsAgainst: 1,
      goalDiff: 2,
    });
    expect(arsenalRow).toMatchObject({
      played: 1,
      lost: 1,
      points: 0,
      goalsFor: 1,
      goalsAgainst: 3,
      goalDiff: -2,
    });

    const persistedMatch = (await read(matchPath())) as Match;
    expect(persistedMatch.awayYellowCards).toBe(1);
    const persistedEvents = normalizeOpponentEvents(persistedMatch.opponentEvents)!;
    expect(persistedEvents.cards).toHaveLength(1);
  });

  it("pênaltis com valor 0 são estritamente preservados em details e stats", async () => {
    const currentSeason = season();
    const currentCareer = career({
      clubName: "Chelsea",
      clubData: [currentSeason],
    });
    await seedCareer(currentCareer);

    const matchWithZeroPens = match({
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      homeScore: 1,
      awayScore: 1,
      homePenScore: 0,
      awayPenScore: 0,
      awayYellowCards: 0,
    });
    await put(matchPath(), matchWithZeroPens);

    const updatedDetails: Match = {
      ...matchWithZeroPens,
      awayYellowCards: 1,
      opponentEvents: {
        cards: [
          {
            player: "Saka",
            yellow: true,
            yellowMinute: "55",
            secondYellow: false,
            secondYellowMinute: "",
            red: false,
            redMinute: "",
          },
        ],
        cardsAuthoritative: true,
      },
    };

    await ServiceMatches.updateMatchDetailsInSeason(
      currentCareer,
      currentSeason,
      matchWithZeroPens,
      updatedDetails,
    );

    const afterDetails = (await read(matchPath())) as Match;
    expect(afterDetails.homePenScore).toBe(0);
    expect(afterDetails.awayPenScore).toBe(0);
    expect(afterDetails.awayYellowCards).toBe(1);

    // Save stats - penalties must still remain 0
    await ServiceMatches.updateMatchStatsInSeason(
      "c1",
      "s1",
      afterDetails,
    );

    const afterStats = (await read(matchPath())) as Match;
    expect(afterStats.homePenScore).toBe(0);
    expect(afterStats.awayPenScore).toBe(0);
    expect(afterStats.awayYellowCards).toBe(1);
  });

  it("releitura do servidor concorda exatamente com o estado local de buildMatchPayload", async () => {
    const currentSeason = season();
    const currentCareer = career({
      clubName: "Chelsea",
      clubData: [currentSeason],
    });
    await seedCareer(currentCareer);

    const initialMatch = match({
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      awayYellowCards: 0,
      awayRedCards: 0,
    });
    await put(matchPath(), initialMatch);

    const formValues: Record<string, string> = {
      homeScore: "2",
      awayScore: "1",
      opponentCardCount: "1",
      opponentCardPlayer_0: "Gabriel",
      opponentYellowMin_0: "12",
      opponentRedMin_0: "77",
    };
    const booleanValues: Record<string, boolean> = {
      opponentYellow_0: true,
      opponentSecondYellow_0: false,
      opponentRed_0: true, // yellow + direct red
    };

    const { updatedMatch } = buildMatchPayload(
      initialMatch,
      formValues,
      booleanValues,
      true,
    );

    // Policy: yellow + direct red = 1 yellow, 1 red
    expect(updatedMatch.awayYellowCards).toBe(1);
    expect(updatedMatch.awayRedCards).toBe(1);

    await ServiceMatches.updateMatchDetailsInSeason(
      currentCareer,
      currentSeason,
      initialMatch,
      updatedMatch as Match,
    );

    const persisted = (await read(matchPath())) as Match;
    expect(persisted.awayYellowCards).toBe(updatedMatch.awayYellowCards);
    expect(persisted.awayRedCards).toBe(updatedMatch.awayRedCards);
    expect(persisted.opponentEvents).toEqual(updatedMatch.opponentEvents);
  });
});
