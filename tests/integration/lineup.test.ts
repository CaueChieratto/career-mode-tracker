import { expect, it } from "vitest";
import { ServiceLineup } from "../../src/pages/Match/services/ServiceLineup";
import { savePlayerMatchStats } from "../../src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats";
import { buildLineupStatsUpdate } from "../../src/pages/Match/components/LineupTab/helpers/buildLineupStatsUpdate";
import { ServiceMatches } from "../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import {
  career,
  lineup,
  match,
  player,
  season,
  stat,
} from "../../src/test/factories/domain";
import {
  careerPath,
  failOnce,
  list,
  matchPath,
  put,
  read,
  seedCareer,
} from "./helpers";
import { boundary } from "./firestoreBoundary";

async function seedLineup() {
  await seedCareer();
  const stats = [
    stat(),
    stat({ playerId: "p2" }),
    stat({ playerId: "removed" }),
  ];
  await put(matchPath(), match({ playerStats: stats }));
  for (const s of stats)
    await put(matchPath() + "/playerStats/" + s.playerId, s);
  return stats;
}
it("salva titular e reserva, exclui removido nas duas fontes e repetir não duplica documentos", async () => {
  const stats = await seedLineup();
  const update = buildLineupStatsUpdate(lineup(), stats);
  for (let i = 0; i < 2; i++)
    await ServiceLineup.saveLineupToMatch(
      "c1",
      "s1",
      "m1",
      lineup(),
      update.updatedPlayerStats,
      update.removedPlayerIds,
    );
  expect((await read(matchPath()))!.playerStats).toHaveLength(2);
  expect(
    (await list(matchPath() + "/playerStats")).map((s) => s._documentId),
  ).toEqual(["p1", "p2"]);
  expect(await read(careerPath())).toHaveProperty("updatedAt");
});
it("falha ao excluir atleta impede atualização do pai e deixa estado original", async () => {
  await seedLineup();
  failOnce("deleteDoc", "/playerStats/removed", "before", "permission-denied");
  await expect(
    ServiceLineup.saveLineupToMatch(
      "c1",
      "s1",
      "m1",
      lineup(),
      [stat(), stat({ playerId: "p2" })],
      ["removed"],
    ),
  ).rejects.toThrow("Injected");
  expect((await read(matchPath()))!.playerStats).toHaveLength(3);
  expect(await list(matchPath() + "/playerStats")).toHaveLength(3);
});
it("[B16-A] falha no pai durante commit atômico preserva ficha moderna e estado anterior", async () => {
  await seedLineup();
  failOnce("updateDoc", "/matches/m1", "before", "permission-denied");
  await expect(
    ServiceLineup.saveLineupToMatch(
      "c1",
      "s1",
      "m1",
      lineup(),
      [stat()],
      ["removed"],
    ),
  ).rejects.toThrow("Injected");
  expect(await read(matchPath() + "/playerStats/removed")).toBeDefined();
  expect((await read(matchPath()))!.playerStats).toHaveLength(3);
});
it("[B16] falha entre exclusão de playerStats/removed e escrita do pai: releitura não deve ressuscitar removido por estatística embutida", async () => {
  await seedLineup();
  failOnce("updateDoc", "/matches/m1", "before", "permission-denied");
  await expect(
    ServiceLineup.saveLineupToMatch(
      "c1",
      "s1",
      "m1",
      lineup(),
      [stat(), stat({ playerId: "p2" })],
      ["removed"],
    ),
  ).rejects.toThrow("Injected");
  expect(await read(matchPath() + "/playerStats/removed")).toBeDefined();
  boundary.hook = undefined;
  await ServiceLineup.saveLineupToMatch(
    "c1",
    "s1",
    "m1",
    lineup(),
    [stat(), stat({ playerId: "p2" })],
    ["removed"],
  );
  expect(await read(matchPath() + "/playerStats/removed")).toBeUndefined();
  expect((await read(matchPath()))!.playerStats).toEqual([
    expect.objectContaining({ playerId: "p1" }),
    expect.objectContaining({ playerId: "p2" }),
  ]);
  expect(
    (await ServiceMatches.getMatchesBySeason("c1", "s1"))[0].playerStats!.some(
      (s) => s.playerId === "removed",
    ),
  ).toBe(false);
});
it("[B16-A] falha de updatedAt no batch aborta commit e não deixa lineup parcial", async () => {
  await seedLineup();
  failOnce("updateDoc", "/careers/c1", "before", "permission-denied");
  await expect(
    ServiceLineup.saveLineupToMatch(
      "c1",
      "s1",
      "m1",
      lineup(),
      [stat()],
      ["removed"],
    ),
  ).rejects.toThrow("Injected");
  expect((await read(matchPath()))!.playerStats).toHaveLength(3);
  expect(await read(matchPath() + "/playerStats/removed")).toBeDefined();
  expect(await read(careerPath())).not.toHaveProperty("updatedAt");
});
it("[B16-A] rejeita atualização de escalação com mais de 500 escritas no batch", async () => {
  await seedLineup();
  const excessRemoved = Array.from({ length: 499 }, (_, i) => `excess-${i}`);
  await expect(
    ServiceLineup.saveLineupToMatch(
      "c1",
      "s1",
      "m1",
      lineup(),
      [stat()],
      excessRemoved,
    ),
  ).rejects.toThrow("500 escritas");
});
it("savePlayerMatchStats grava titular/substituto em subcoleções; repetir mantém dois IDs", async () => {
  await seedCareer();
  await put(matchPath(), match());
  const args = {
    career: career(),
    season: season({ players: [player(), player({ id: "p2", name: "Bia" })] }),
    match: match(),
    player: player(),
    formValues: { minutesPlayed: "60", substituteIn: "Bia", matchGoals: "2" },
    booleanValues: {},
  };
  await savePlayerMatchStats(args);
  await savePlayerMatchStats(args);
  const saved = await list(matchPath() + "/playerStats");
  expect(saved).toHaveLength(2);
  expect(saved.find((s) => s._documentId === "p2")).toMatchObject({
    minutesPlayed: 30,
    substituteIn: "Ana",
  });
  expect(await read(matchPath())).toHaveProperty("playerStats");
});
it("falha transitória na contraparte é atômica e nova tentativa grava ambas as estatísticas", async () => {
  await seedCareer();
  await put(matchPath(), match());
  const args = {
    career: career(),
    season: season({
      players: [player(), player({ id: "p2", name: "Bia" })],
    }),
    match: match(),
    player: player(),
    formValues: { minutesPlayed: "60", substituteIn: "Bia" },
    booleanValues: {},
  };
  failOnce("setDoc", "/playerStats/p2");
  await expect(savePlayerMatchStats(args)).rejects.toThrow("Injected");
  expect(await list(matchPath() + "/playerStats")).toEqual([]);
  await savePlayerMatchStats(args);
  expect(await list(matchPath() + "/playerStats")).toEqual([
    expect.objectContaining({ playerId: "p1", minutesPlayed: 60 }),
    expect.objectContaining({ playerId: "p2", minutesPlayed: 30 }),
  ]);
});
it("stats da contraparte já informadas permanecem após editar titular", async () => {
  await seedCareer();
  const other = stat({ playerId: "p2", minutesPlayed: 10, goals: 1 });
  await put(matchPath(), match({ playerStats: [other] }));
  await put(matchPath() + "/playerStats/p2", other);
  await savePlayerMatchStats({
    career: career(),
    season: season({ players: [player(), player({ id: "p2", name: "Bia" })] }),
    match: match({ playerStats: [other] }),
    player: player(),
    formValues: { minutesPlayed: "80", substituteIn: "Bia" },
    booleanValues: {},
  });
  expect(await read(matchPath() + "/playerStats/p2")).toEqual(other);
});
