import { expect, it, vi } from "vitest";
import { ServiceSeasons } from "../../src/common/services/ServiceSeasons";
import {
  academyPlayer,
  career,
  player,
  season,
} from "../../src/test/factories/domain";
import { loanPlayer } from "../../src/test/fixtures/scenarios";
import { boundary } from "./firestoreBoundary";
import {
  careerPath,
  failOnce,
  list,
  put,
  read,
  seasonPath,
  seedCareer,
} from "./helpers";

const resourceExhaustedReads = () => {
  boundary.calls = [];
  boundary.hook = (call) => {
    if (call.operation === "getDoc" || call.operation === "getDocs") {
      throw Object.assign(new Error("Quota exceeded"), {
        code: "resource-exhausted",
      });
    }
  };
};

const loadedCareer = () => {
  const regular = player({ contractTime: 0 });
  const sold = player({ id: "sold", sell: true });
  const returningLoan = loanPlayer();
  const incomingLoan = loanPlayer(true);
  const longLoan = loanPlayer(false, 2);
  longLoan.id = "long-loan";
  return career({
    clubData: [
      season({
        leagues: [{ name: "Liga", trophy: "", logo: "", league: true }],
        players: [regular, sold, returningLoan, incomingLoan, longLoan],
        academyPlayers: [
          academyPlayer(),
          academyPlayer({ id: "a2", status: "promoted" }),
          academyPlayer({ id: "a3", status: "released" }),
        ],
      }),
    ],
  });
};

async function seedSource() {
  const loaded = loadedCareer();
  await seedCareer(
    career({
      clubData: [
        season({
          leagues: loaded.clubData[0].leagues,
          players: [],
        }),
      ],
    }),
  );
  for (const entry of loaded.clubData[0].players) {
    await put(`${seasonPath()}/players/${entry.id}`, entry);
  }
  for (const entry of loaded.clubData[0].academyPlayers || []) {
    await put(`${seasonPath()}/academyPlayers/${entry.id}`, entry);
  }
  return loaded;
}

it("cria primeira temporada deterministicamente com zero reads", async () => {
  const input = career();
  await seedCareer(input);
  resourceExhaustedReads();

  await ServiceSeasons.addSeason(input);
  const actionCalls = [...boundary.calls];
  boundary.hook = undefined;

  expect(
    actionCalls.filter(
      (call) => call.operation === "getDoc" || call.operation === "getDocs",
    ),
  ).toEqual([]);
  expect((await read(careerPath()))!.clubData).toEqual([
    { id: "season-1", seasonNumber: 1, players: [], leagues: [] },
  ]);
  expect((await read(careerPath()))!.updatedAt).toEqual(expect.any(Number));
  expect(await list(`${seasonPath("season-1")}/players`)).toEqual([]);
});

it("copia elenco e base em batch, preservando fonte e metadados existentes", async () => {
  const input = await seedSource();
  const before = await read(careerPath());
  resourceExhaustedReads();

  await ServiceSeasons.addSeason(input);
  const actionCalls = [...boundary.calls];
  boundary.hook = undefined;

  expect(
    actionCalls.filter(
      (call) => call.operation === "getDoc" || call.operation === "getDocs",
    ),
  ).toEqual([]);
  const stored = await read(careerPath());
  expect(stored!.clubData[0]).toEqual(before!.clubData[0]);
  expect(stored!.clubData[1]).toEqual({
    id: "season-2",
    seasonNumber: 2,
    players: [],
    leagues: input.clubData[0].leagues,
  });
  const roster = await list(`${seasonPath("season-2")}/players`);
  expect(roster.map((entry) => entry._documentId).sort()).toEqual([
    "incoming",
    "loan",
    "long-loan",
    "p1",
  ]);
  expect(roster.every((entry) => entry.age === 21)).toBe(true);
  expect(roster.find((entry) => entry._documentId === "loan")).toMatchObject({
    loan: false,
    contract: expect.arrayContaining([
      expect.objectContaining({ dataArrival: expect.anything() }),
    ]),
  });
  expect(
    await list(`${seasonPath("season-2")}/academyPlayers`),
  ).toEqual([{ ...academyPlayer(), evolutionHistory: [], _documentId: "a1" }]);
  expect(await list(`${seasonPath()}/players`)).toHaveLength(5);
  expect(await list(`${seasonPath()}/academyPlayers`)).toHaveLength(3);
});

it("duas criações concorrentes do mesmo snapshot não duplicam temporada", async () => {
  const input = await seedSource();
  resourceExhaustedReads();

  await Promise.all([
    ServiceSeasons.addSeason(input),
    ServiceSeasons.addSeason(input),
  ]);
  const actionCalls = [...boundary.calls];
  boundary.hook = undefined;

  expect(
    actionCalls.filter(
      (call) => call.operation === "getDoc" || call.operation === "getDocs",
    ),
  ).toEqual([]);
  const stored = await read(careerPath());
  expect(
    stored!.clubData.filter(
      (entry: { id: string }) => entry.id === "season-2",
    ),
  ).toHaveLength(1);
  expect(await list(`${seasonPath("season-2")}/players`)).toHaveLength(4);
  expect(
    await list(`${seasonPath("season-2")}/academyPlayers`),
  ).toHaveLength(1);
});

it.each([
  ["setDoc", "/season-2/players/p1"],
  ["setDoc", "/season-2/academyPlayers/a1"],
  ["updateDoc", "/careers/c1"],
] as const)(
  "falha atômica em %s preserva a carreira e não deixa cópias",
  async (operation, suffix) => {
    const input = await seedSource();
    const before = await read(careerPath());
    vi.spyOn(console, "error").mockImplementation(() => {});
    failOnce(operation, suffix);

    await expect(ServiceSeasons.addSeason(input)).rejects.toThrow("Injected");
    boundary.hook = undefined;

    expect(await read(careerPath())).toEqual(before);
    expect(await list(`${seasonPath("season-2")}/players`)).toEqual([]);
    expect(await list(`${seasonPath("season-2")}/academyPlayers`)).toEqual([]);
  },
);

it("retry após falha usa os mesmos paths e conclui uma única temporada", async () => {
  const input = await seedSource();
  vi.spyOn(console, "error").mockImplementation(() => {});
  failOnce("setDoc", "/season-2/players/p1");
  await expect(ServiceSeasons.addSeason(input)).rejects.toThrow("Injected");
  boundary.hook = undefined;

  await ServiceSeasons.addSeason(input);

  const stored = await read(careerPath());
  expect(
    stored!.clubData.filter(
      (entry: { id: string }) => entry.id === "season-2",
    ),
  ).toHaveLength(1);
  expect(await list(`${seasonPath("season-2")}/players`)).toHaveLength(4);
});

it("limite de 500 writes aborta antes do commit", async () => {
  const players = Array.from({ length: 500 }, (_, index) =>
    player({ id: `p${index}` }),
  );
  const input = career({
    clubData: [season({ players, academyPlayers: [] })],
  });
  await seedCareer(career({ clubData: [season()] }));

  await expect(ServiceSeasons.addSeason(input)).rejects.toThrow("500 escritas");
  expect((await read(careerPath()))!.clubData).toHaveLength(1);
  expect(await list(`${seasonPath("season-2")}/players`)).toEqual([]);
});
