import { expect, it } from "vitest";
import { AcademyService } from "../../src/pages/Academy/layouts/AcademyContent/services/AcademyService";
import type { AcademyTournaments } from "../../src/pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyTournaments";
import {
  academyPlayer,
  career,
  deepFreeze,
  player,
  season,
} from "../../src/test/factories/domain";
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

const tournament = (): AcademyTournaments => ({
  id: "t1",
  name: "Copa Base",
  date: "01/08/2024",
  totalMatches: 1,
  isChampion: true,
  tournamentResult: "Campeão",
  matches: [
    {
      id: "am1",
      date: "01/08/2024",
      opponentTeam: "Rival",
      userGoals: 2,
      opponentGoals: 0,
      lineup: [
        {
          playerId: "a1",
          playerName: "Junior",
          goals: 1,
          assists: 1,
          rating: 8,
          defesas: 0,
          cleanSheets: 0,
        },
      ],
    },
  ],
});

const loadedCareer = () =>
  career({
    academy: { name: "Academia", nickname: "Base FC", tournament: "" },
    clubData: [
      season(),
      season({ id: "old-season", seasonNumber: 0 }),
    ],
  });

async function seedPromotion() {
  const input = loadedCareer();
  await seedCareer(
    career({
      academy: input.academy,
      clubData: [season(), season({ id: "old-season", seasonNumber: 0 })],
    }),
  );
  await put(`${seasonPath()}/academyPlayers/a1`, academyPlayer());
  await put(
    `${seasonPath()}/academyPlayers/a2`,
    academyPlayer({ id: "a2", name: "Outro" }),
  );
  await put(
    `${seasonPath("old-season")}/academyPlayers/old-a`,
    academyPlayer({ id: "old-a", name: "Histórico" }),
  );
  return input;
}


const blockReads = () => {
  boundary.calls = [];
  boundary.hook = (call) => {
    if (call.operation === "getDoc" || call.operation === "getDocs") {
      throw Object.assign(new Error("Quota exceeded"), {
        code: "resource-exhausted",
      });
    }
  };
};


it("promove com zero reads e mantém identidade, histórico e torneios", async () => {
  const input = await seedPromotion();
  const source = deepFreeze(academyPlayer());
  blockReads();

  const result = await AcademyService.promotePlayerToProfessional(
    input,
    "s1",
    source,
    "03/08/2024",
    [tournament()],
  );
  const actionCalls = [...boundary.calls];
  boundary.hook = undefined;

  expect(
    actionCalls.filter(
      (call) => call.operation === "getDoc" || call.operation === "getDocs",
    ),
  ).toEqual([]);
  expect(
    actionCalls.filter((call) => call.phase === "before"),
  ).toMatchObject([
    { operation: "setDoc", path: `${seasonPath()}/academyPlayers/a1` },
    { operation: "setDoc", path: `${seasonPath()}/players/academy-a1` },
    { operation: "updateDoc", path: careerPath() },
  ]);
  expect(await read(`${seasonPath()}/academyPlayers/a1`)).toMatchObject({
    status: "promoted",
    exitDate: "03/08/2024",
    evolutionHistory: expect.arrayContaining([
      expect.objectContaining({
        id: 'promotion:["s1","a1"]',
        oldValue: "academy",
        newValue: "promoted",
      }),
    ]),
  });
  expect(await read(`${seasonPath()}/players/academy-a1`)).toMatchObject({
    id: "academy-a1",
    name: "Junior",
    nation: "Brasil",
    position: "ATA",
    overall: 65,
    shirtNumber: "",
    isAcademy: true,
    academyData: { id: "a1", status: "promoted", potential: "80-90" },
    academyHistory: expect.any(Array),
    academyTournaments: [expect.objectContaining({ id: "t1", totalMatches: 1 })],
  });
  expect(result.professional.id).toBe("academy-a1");
  expect(source.status).toBe("academy");
  expect((await read(careerPath()))!.updatedAt).toEqual(expect.any(Number));
  expect(await read(`${seasonPath()}/academyPlayers/a2`)).toMatchObject({
    id: "a2",
    status: "academy",
  });
  expect(
    await read(`${seasonPath("old-season")}/academyPlayers/old-a`),
  ).toMatchObject({ id: "old-a", status: "academy" });
});

it.each([
  ["setDoc", "/academyPlayers/a1"],
  ["setDoc", "/players/academy-a1"],
  ["updateDoc", "/careers/c1"],
] as const)(
  "falha atômica em %s não deixa promoção parcial",
  async (operation, suffix) => {
    const input = await seedPromotion();
    const beforeAcademy = await read(`${seasonPath()}/academyPlayers/a1`);
    const beforeCareer = await read(careerPath());
    failOnce(operation, suffix);

    await expect(
      AcademyService.promotePlayerToProfessional(
        input,
        "s1",
        academyPlayer(),
        "03/08/2024",
      ),
    ).rejects.toThrow("Injected");
    boundary.hook = undefined;

    expect(await read(`${seasonPath()}/academyPlayers/a1`)).toEqual(
      beforeAcademy,
    );
    expect(await read(`${seasonPath()}/players/academy-a1`)).toBeUndefined();
    expect(await read(careerPath())).toEqual(beforeCareer);
  },
);

it("duplo submit concorrente sobrescreve os mesmos paths sem duplicar", async () => {
  const input = await seedPromotion();
  blockReads();

  await Promise.all([
    AcademyService.promotePlayerToProfessional(
      input,
      "s1",
      academyPlayer(),
      "03/08/2024",
    ),
    AcademyService.promotePlayerToProfessional(
      input,
      "s1",
      academyPlayer(),
      "03/08/2024",
    ),
  ]);
  const actionCalls = [...boundary.calls];
  boundary.hook = undefined;

  expect(
    actionCalls.filter(
      (call) => call.operation === "getDoc" || call.operation === "getDocs",
    ),
  ).toEqual([]);
  expect(await list(`${seasonPath()}/players`)).toHaveLength(1);
  const promoted = await read(`${seasonPath()}/academyPlayers/a1`);
  expect(
    promoted!.evolutionHistory.filter(
      (entry: { id: string }) => entry.id === 'promotion:["s1","a1"]',
    ),
  ).toHaveLength(1);
});

it("retry após falha conclui a mesma promoção", async () => {
  const input = await seedPromotion();
  failOnce("setDoc", "/players/academy-a1");
  await expect(
    AcademyService.promotePlayerToProfessional(
      input,
      "s1",
      academyPlayer(),
      "03/08/2024",
    ),
  ).rejects.toThrow("Injected");
  boundary.hook = undefined;

  await AcademyService.promotePlayerToProfessional(
    input,
    "s1",
    academyPlayer(),
    "03/08/2024",
  );

  expect(await list(`${seasonPath()}/players`)).toHaveLength(1);
  expect(await read(`${seasonPath()}/academyPlayers/a1`)).toMatchObject({
    status: "promoted",
  });
});

it("reutiliza ID histórico carregado pelo vínculo academyData.id", async () => {
  const historical = player({
    id: "historical-id",
    isAcademy: true,
    academyData: academyPlayer({ status: "promoted" }),
  });
  const input = await seedPromotion();
  input.clubData[1].players = [historical];

  await AcademyService.promotePlayerToProfessional(
    input,
    "s1",
    academyPlayer(),
    "03/08/2024",
  );

  expect(await read(`${seasonPath()}/players/historical-id`)).toMatchObject({
    id: "historical-id",
    academyData: { id: "a1" },
  });
  expect(await read(`${seasonPath()}/players/academy-a1`)).toBeUndefined();
});

it("origem inválida falha antes de qualquer write", async () => {
  const input = await seedPromotion();
  boundary.calls = [];

  await expect(
    AcademyService.promotePlayerToProfessional(
      input,
      "s1",
      academyPlayer({ status: "released" }),
      "03/08/2024",
    ),
  ).rejects.toThrow("Origem de promoção inválida");

  expect(
    boundary.calls.filter((call) =>
      ["setDoc", "updateDoc", "deleteDoc"].includes(call.operation),
    ),
  ).toEqual([]);
});
