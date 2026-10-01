import { FirebaseError } from "firebase/app";
import { expect, it } from "vitest";
import type { Match } from "../../src/common/interfaces/Match";
import type { TableTeamData } from "../../src/common/interfaces/TableTeamData";
import { ServiceMatches } from "../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { ServiceLineup } from "../../src/pages/Match/services/ServiceLineup";
import { savePlayerMatchStats } from "../../src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats";
import {
  career,
  lineup,
  match,
  player,
  season,
  stat,
} from "../../src/test/factories/domain";
import { boundary } from "./firestoreBoundary";
import {
  careerPath,
  list,
  matchPath,
  put,
  read,
  seasonPath,
  seedCareer,
} from "./helpers";

const league = { name: "Liga", trophy: "", logo: "", league: true };

const tableRow = (
  id: string,
  name: string,
  overrides: Partial<TableTeamData> = {},
): TableTeamData => ({
  id,
  name,
  badge: "",
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  points: 0,
  ...overrides,
});

const reads = () =>
  boundary.calls.filter(
    ({ phase, operation }) => phase === "before" && operation.startsWith("get"),
  );

const blockReads = () => {
  boundary.calls = [];
  boundary.hook = (call) => {
    if (call.phase === "before" && call.operation.startsWith("get")) {
      throw new FirebaseError("resource-exhausted", "Injected read quota");
    }
  };
};

it("MatchStats continua salvando por batch sem leituras", async () => {
  await seedCareer();
  const persisted = match({
    status: "FINISHED",
    homeScore: 2,
    awayScore: 1,
    result: "V",
  });
  await put(matchPath(), persisted);
  blockReads();

  await ServiceMatches.updateMatchStatsInSeason("c1", "s1", {
    ...persisted,
    homePossession: 61,
    awayPossession: 39,
  });

  expect(reads()).toEqual([]);
  boundary.hook = undefined;
  expect(await read(matchPath())).toMatchObject({
    status: "FINISHED",
    homeScore: 2,
    awayScore: 1,
    homePossession: 61,
    awayPossession: 39,
  });
});

it("MatchDetails adiciona e remove eventos sem leitura e preserva os demais campos", async () => {
  const originalLineup = lineup();
  const previous = match({
    lineup: originalLineup,
    playerStats: [stat()],
    homePossession: 57,
    awayPossession: 43,
  });
  const firstSeason = season({
    leagues: [league],
    matches: [previous],
    table: [],
  });
  const currentCareer = career({ clubData: [firstSeason] });
  await seedCareer(currentCareer);
  await put(matchPath(), previous);
  const withEvent: Match = {
    ...previous,
    status: "FINISHED",
    result: "V",
    homeScore: 2,
    awayScore: 0,
    opponentEvents: [{ goals: [{ player: "Rival", minute: "31" }] }],
  };
  blockReads();

  await ServiceMatches.updateMatchDetailsInSeason(
    currentCareer,
    firstSeason,
    previous,
    withEvent,
  );

  expect(reads()).toEqual([]);
  boundary.hook = undefined;
  const rows = await list<TableTeamData>(`${seasonPath()}/table`);
  const secondSeason = season({
    leagues: [league],
    matches: [withEvent],
    table: rows as never,
  });
  const withoutEvent = { ...withEvent, opponentEvents: [] };
  blockReads();
  await ServiceMatches.updateMatchDetailsInSeason(
    career({ clubData: [secondSeason] }),
    secondSeason,
    withEvent,
    withoutEvent,
  );

  expect(reads()).toEqual([]);
  boundary.hook = undefined;
  expect(await read(matchPath())).toMatchObject({
    opponentEvents: [],
    lineup: originalLineup,
    playerStats: [stat()],
    homePossession: 57,
    awayPossession: 43,
  });
  expect((await list(`${seasonPath()}/table`)).find(row => row.name === "Clube"))
    .toMatchObject({ played: 1, won: 1, points: 3 });
});

it("Lineup salva titulares, reservas e stats sem leitura e sem sobrescrever detalhes", async () => {
  await seedCareer();
  const removed = stat({ playerId: "removed" });
  const persisted = match({
    status: "FINISHED",
    homeScore: 3,
    awayScore: 1,
    opponentMvpName: "Adversário",
    homePossession: 62,
    playerStats: [stat(), stat({ playerId: "p2" }), removed],
  });
  await put(matchPath(), persisted);
  for (const playerStat of persisted.playerStats || []) {
    await put(`${matchPath()}/playerStats/${playerStat.playerId}`, playerStat);
  }
  const savedLineup = lineup();
  const activeStats = [stat(), stat({ playerId: "p2" })];
  blockReads();

  await ServiceLineup.saveLineupToMatch(
    "c1",
    "s1",
    "m1",
    savedLineup,
    activeStats,
    ["removed"],
  );

  expect(reads()).toEqual([]);
  boundary.hook = undefined;
  expect(await read(matchPath())).toMatchObject({
    lineup: savedLineup,
    playerStats: activeStats,
    status: "FINISHED",
    homeScore: 3,
    awayScore: 1,
    opponentMvpName: "Adversário",
    homePossession: 62,
  });
  expect((await list(`${matchPath()}/playerStats`)).map(row => row._documentId))
    .toEqual(["p1", "p2"]);
});

it("playerMatchStats cria, edita e zera stat sem leitura, preservando as demais", async () => {
  const teammate = stat({ playerId: "p2", minutesPlayed: 30, goals: 1 });
  const persisted = match({
    status: "FINISHED",
    homeScore: 2,
    awayScore: 1,
    homePossession: 58,
    lineup: lineup(),
    playerStats: [teammate],
  });
  const currentSeason = season({
    players: [player(), player({ id: "p2", name: "Bia" })],
    matches: [persisted],
  });
  const currentCareer = career({ clubData: [currentSeason] });
  await seedCareer(currentCareer);
  await put(matchPath(), persisted);
  await put(`${matchPath()}/playerStats/p2`, teammate);
  blockReads();

  await savePlayerMatchStats({
    career: currentCareer,
    season: currentSeason,
    match: persisted,
    player: currentSeason.players[0],
    formValues: { matchGoals: "2", minutesPlayed: "60" },
    booleanValues: {},
  });

  expect(reads()).toEqual([]);
  boundary.hook = undefined;
  const afterCreate = (await read(matchPath())) as Match;
  expect(afterCreate).toMatchObject({
    status: "FINISHED",
    homeScore: 2,
    awayScore: 1,
    homePossession: 58,
    lineup: lineup(),
  });
  expect(afterCreate.playerStats).toEqual([
    teammate,
    expect.objectContaining({ playerId: "p1", goals: 2, minutesPlayed: 60 }),
  ]);
  expect(await read(`${matchPath()}/playerStats/p2`)).toEqual(teammate);

  blockReads();
  await savePlayerMatchStats({
    career: currentCareer,
    season: currentSeason,
    match: afterCreate,
    player: currentSeason.players[0],
    formValues: { matchGoals: "0", minutesPlayed: "0" },
    booleanValues: {},
  });
  expect(reads()).toEqual([]);
  boundary.hook = undefined;
  expect(await read(`${matchPath()}/playerStats/p1`)).toMatchObject({
    playerId: "p1",
    goals: 0,
    minutesPlayed: 0,
  });
  expect(((await read(matchPath())) as Match).playerStats).toEqual([
    teammate,
    expect.objectContaining({ playerId: "p1", goals: 0, minutesPlayed: 0 }),
  ]);
  expect(await read(careerPath())).toHaveProperty("updatedAt");
});

it("Delete SCHEDULED remove match e stats conhecidas sem leitura e preserva tabela", async () => {
  const scheduled = match({ playerStats: [stat()] });
  const row = tableRow("manual", "Manual", { played: 8, points: 13 });
  const currentSeason = season({
    matches: [scheduled],
    table: [row] as never,
  });
  const currentCareer = career({ clubData: [currentSeason] });
  await seedCareer(currentCareer);
  await put(matchPath(), scheduled);
  await put(`${matchPath()}/playerStats/p1`, stat());
  await put(`${seasonPath()}/table/manual`, row);
  blockReads();

  await ServiceMatches.deleteMatchFromSeason(
    currentCareer,
    currentSeason,
    scheduled,
  );

  expect(reads()).toEqual([]);
  boundary.hook = undefined;
  expect(await read(matchPath())).toBeUndefined();
  expect(await list(`${matchPath()}/playerStats`)).toEqual([]);
  expect(await read(`${seasonPath()}/table/manual`)).toEqual(row);
  expect(await read(careerPath())).toHaveProperty("updatedAt");
});

it("Delete FINISHED recalcula standings locais sem leitura, inclusive pênaltis", async () => {
  const finished = match({
    status: "FINISHED",
    result: "V",
    homeScore: 1,
    awayScore: 1,
    homePenScore: 4,
    awayPenScore: 3,
    playerStats: [stat()],
  });
  const own = tableRow("own", "Clube", {
    played: 1,
    won: 1,
    goalsFor: 1,
    goalsAgainst: 1,
    points: 3,
    customZone: "first",
  });
  const rival = tableRow("rival", "Rival", {
    played: 1,
    lost: 1,
    goalsFor: 1,
    goalsAgainst: 1,
  });
  const currentSeason = season({
    leagues: [league],
    matches: [finished],
    table: [own, rival] as never,
  });
  const currentCareer = career({ clubData: [currentSeason] });
  await seedCareer(currentCareer);
  await put(matchPath(), finished);
  await put(`${matchPath()}/playerStats/p1`, stat());
  await put(`${seasonPath()}/table/own`, own);
  await put(`${seasonPath()}/table/rival`, rival);
  blockReads();

  await ServiceMatches.deleteMatchFromSeason(
    currentCareer,
    currentSeason,
    finished,
  );

  expect(reads()).toEqual([]);
  boundary.hook = undefined;
  expect(await read(matchPath())).toBeUndefined();
  expect(await list(`${matchPath()}/playerStats`)).toEqual([]);
  expect(await read(`${seasonPath()}/table/own`)).toMatchObject({
    id: "own",
    customZone: "first",
    played: 0,
    won: 0,
    points: 0,
  });
  expect(await read(`${seasonPath()}/table/rival`)).toMatchObject({
    id: "rival",
    played: 0,
    lost: 0,
    points: 0,
  });
});
