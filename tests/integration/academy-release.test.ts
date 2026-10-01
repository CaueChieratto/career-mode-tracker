import { expect, it } from "vitest";
import { AcademyService } from "../../src/pages/Academy/layouts/AcademyContent/services/AcademyService";
import { academyPlayer, career, season } from "../../src/test/factories/domain";
import { boundary } from "./firestoreBoundary";
import { failOnce, put, read, seasonPath, seedCareer } from "./helpers";

async function seedRelease() {
  await seedCareer(
    career({ clubData: [season(), season({ id: "old-season" })] }),
  );
  await put(`${seasonPath()}/academyPlayers/a1`, academyPlayer());
  await put(
    `${seasonPath("old-season")}/academyPlayers/old-a`,
    academyPlayer({ id: "old-a", name: "Histórico" }),
  );
}

it("dispensa remove a camisa na escrita única e preserva dados históricos", async () => {
  await seedRelease();
  boundary.calls = [];

  await AcademyService.releasePlayerAcademy(
    "c1",
    "s1",
    academyPlayer(),
    "03/08/2024",
  );

  expect(boundary.calls).toEqual([
    {
      operation: "updateDoc",
      path: `${seasonPath()}/academyPlayers/a1`,
      phase: "before",
    },
    {
      operation: "updateDoc",
      path: `${seasonPath()}/academyPlayers/a1`,
      phase: "after",
    },
  ]);
  const released = await read(`${seasonPath()}/academyPlayers/a1`);
  expect(released).toMatchObject({
    id: "a1",
    status: "released",
    exitDate: "03/08/2024",
    evolutionHistory: expect.arrayContaining([
      expect.objectContaining({ newValue: "released" }),
    ]),
  });
  expect(released).not.toHaveProperty("shirtNumber");
  expect(
    await read(`${seasonPath("old-season")}/academyPlayers/old-a`),
  ).toMatchObject({ id: "old-a", shirtNumber: 10, status: "academy" });
  const refetched = await AcademyService.getPlayersAcademy("c1", "s1");
  expect(refetched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "a1", status: "released" }),
    ]),
  );
  expect(refetched.find((player) => player.id === "a1")).not.toHaveProperty(
    "shirtNumber",
  );
});

it("falha da escrita de dispensa não persiste estado parcial", async () => {
  await seedRelease();
  const before = await read(`${seasonPath()}/academyPlayers/a1`);
  failOnce("updateDoc", "/academyPlayers/a1");

  await expect(
    AcademyService.releasePlayerAcademy(
      "c1",
      "s1",
      academyPlayer(),
      "03/08/2024",
    ),
  ).rejects.toThrow("Injected");
  boundary.hook = undefined;

  expect(await read(`${seasonPath()}/academyPlayers/a1`)).toEqual(before);
});
