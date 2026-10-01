import { FirebaseError } from "firebase/app";
import { boundary } from "./firestoreBoundary";
import { expect, it, vi } from "vitest";
import { deleteCareerFromFirestore } from "../../src/common/helpers/Deleters";
import { ServiceSeasons } from "../../src/common/services/ServiceSeasons";
import { ServiceMatches } from "../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import {
  academyPlayer,
  career,
  match,
  player,
  season,
  stat,
} from "../../src/test/factories/domain";
import { auth } from "./firebaseClient";
import {
  careerPath,
  failOnce,
  groupPath,
  login,
  matchPath,
  put,
  read,
  seasonPath,
  seedCareer,
} from "./helpers";
import { Functions } from "firebase/functions";

let mockCallableRejectError: Error | null = null;

vi.mock("firebase/functions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/functions")>();
  return {
    ...actual,
    httpsCallable: (functionsInstance: Functions, name: string) => {
      if (mockCallableRejectError && name === "deleteCareerRecursive") {
        return async () => {
          throw mockCallableRejectError;
        };
      }
      return actual.httpsCallable(functionsInstance, name);
    },
  };
});

async function tree() {
  await seedCareer();
  const docs = [
    [seasonPath(), { id: "s1" }],
    [matchPath(), match({ playerStats: [stat()] })],
    [matchPath() + "/playerStats/p1", stat()],
    [seasonPath() + "/players/p1", player()],
    [seasonPath() + "/table/t1", { id: "t1", points: 3 }],
    [seasonPath() + "/academyPlayers/a1", academyPlayer()],
    [seasonPath() + "/academyTournaments/t1", { id: "t1" }],
    [seasonPath("orphan") + "/players/p-orphan", player({ id: "p-orphan" })],
  ] as const;
  for (const [path, data] of docs) await put(path, data);
  return docs.map(([path]) => path);
}
async function deleteFixtureMatch() {
  const current = match({ playerStats: [stat()] });
  const s = season({ matches: [current], table: [] });
  await ServiceMatches.deleteMatchFromSeason(
    career({ clubData: [s] }),
    s,
    current,
  );
}
it("[B08] deleteSeason remove toda a árvore conhecida e preserva temporada irmã", async () => {
  const paths = await tree();
  await ServiceSeasons.deleteSeason("c1", "s1");
  expect(await read(careerPath())).toMatchObject({ clubData: [] });
  const exists = await Promise.all(paths.map(async (p) => !!(await read(p))));
  expect(exists).toEqual([
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
  ]);
  await ServiceSeasons.deleteSeason("c1", "s1");
  expect(await read(matchPath())).toBeUndefined();
  expect(await read(paths[7])).toBeDefined();
});
it("[B08] temporada vazia pode ser excluída e repetida sem apagar a carreira", async () => {
  await seedCareer();
  await put(seasonPath(), { id: "s1" });
  await ServiceSeasons.deleteSeason("c1", "s1");
  await ServiceSeasons.deleteSeason("c1", "s1");
  expect(await read(seasonPath())).toBeUndefined();
  expect(await read(careerPath())).toMatchObject({ id: "c1", clubData: [] });
});
it("[B12] exclusão da carreira (via Cloud Function) remove recursivamente todos os documentos e órfãos", async () => {
  const paths = await tree();

  // 1. Sibling career for user A:
  const uidA = auth.currentUser!.uid;
  await put(careerPath("c2", uidA), { id: "c2", clubName: "Sibling Career A" });

  // 2. Career for user B:
  await login("b");
  const uidB = auth.currentUser!.uid;
  await put(careerPath("c1", uidB), { id: "c1", clubName: "Career User B" });
  await login("a");

  // 3. Orphan descendant without parent season document or metadata:
  const orphanPlayerPath = `users/${uidA}/careers/c1/seasons/orphan-season/players/p1`;
  await put(orphanPlayerPath, { name: "orphan" });

  // 4. Deep descendant in matches/playerStats:
  const deepStatPath = matchPath() + "/playerStats/p-deep";
  await put(deepStatPath, { id: "p-deep", goals: 5 });

  await deleteCareerFromFirestore("c1");

  // Verify career c1 and its descendants are completely gone:
  expect(await read(careerPath("c1", uidA))).toBeUndefined();
  expect(await read(orphanPlayerPath)).toBeUndefined();
  expect(await read(deepStatPath)).toBeUndefined();
  expect(await Promise.all(paths.map(async (p) => !!(await read(p))))).toEqual(
    paths.map(() => false),
  );

  // Sibling career of user A preserved:
  expect(await read(careerPath("c2", uidA))).toMatchObject({
    id: "c2",
    clubName: "Sibling Career A",
  });

  // Career of user B preserved:
  await login("b");
  expect(await read(careerPath("c1", uidB))).toMatchObject({
    id: "c1",
    clubName: "Career User B",
  });
  await login("a");

  // Idempotent repeat:
  await deleteCareerFromFirestore("c1");
});

it("[B12] auth da function: rejeita sem auth, rejeita path traversal e isola por UID", async () => {
  const { httpsCallable } = await import("firebase/functions");
  const { functions } = await import("./firebaseClient");
  const deleteFn = httpsCallable(functions, "deleteCareerRecursive");

  // 1. Path traversal / slashes rejected
  await expect(deleteFn({ careerId: "../c2" })).rejects.toMatchObject({
    code: "functions/invalid-argument",
  });
  await expect(deleteFn({ careerId: "c1/seasons" })).rejects.toMatchObject({
    code: "functions/invalid-argument",
  });
  await expect(deleteFn({ careerId: "" })).rejects.toMatchObject({
    code: "functions/invalid-argument",
  });

  // 2. Arbitrary uid in payload cannot delete another user's career
  await login("b");
  const uidB = auth.currentUser!.uid;
  await put(careerPath("victim", uidB), { id: "victim", clubName: "Victim B" });
  await login("a");
  await deleteFn({ careerId: "victim", uid: uidB, userId: uidB });
  await login("b");
  expect(await read(careerPath("victim", uidB))).toBeDefined();
  await login("a");

  // 3. Unauthenticated call rejected
  const { signOut } = await import("firebase/auth");
  await signOut(auth);
  await expect(deleteFn({ careerId: "c1" })).rejects.toMatchObject({
    code: "functions/unauthenticated",
  });
  await login("a");
});

it("[B12] falha da Cloud Function: rejeita sem executar deleção client-side e deixa carreira e descendentes intactos", async () => {
  const paths = await tree();
  const orphanPath = seasonPath("orphan") + "/players/p-orphan";

  mockCallableRejectError = new FirebaseError(
    "unavailable",
    "Cloud Function unavailable",
  );

  try {
    await expect(deleteCareerFromFirestore("c1")).rejects.toMatchObject({
      code: "unavailable",
    });

    // Verify no client-side deletion occurred: career, normal descendants, and orphans remain
    expect(await read(careerPath("c1"))).toBeDefined();
    expect(await read(matchPath())).toBeDefined();
    expect(await read(orphanPath)).toBeDefined();
    for (const p of paths) {
      expect(await read(p)).toBeDefined();
    }
  } finally {
    mockCallableRejectError = null;
  }
});
it("exclusão da partida remove suas stats e preserva jogadores/tabela/base", async () => {
  await tree();
  await deleteFixtureMatch();
  expect(await read(matchPath())).toBeUndefined();
  expect(await read(matchPath() + "/playerStats/p1")).toBeUndefined();
  expect(await read(seasonPath() + "/table/t1")).toMatchObject({ points: 3 });
  expect(await read(seasonPath() + "/players/p1")).toBeDefined();
  await deleteFixtureMatch();
});
it("falha persistente antes de excluir partida faz uma tentativa atômica e permite retry explícito", async () => {
  await tree();
  let attempts = 0;
  boundary.hook = (c) => {
    if (
      c.operation === "deleteDoc" &&
      c.path.endsWith("/matches/m1") &&
      c.phase === "before"
    ) {
      attempts++;
      throw new FirebaseError("unavailable", "Injected persistent failure");
    }
  };
  await expect(
    deleteFixtureMatch(),
  ).rejects.toMatchObject({ code: "unavailable" });
  expect(await read(matchPath())).toBeDefined();
  expect(await read(matchPath() + "/playerStats/p1")).toBeDefined();
  expect(await read(careerPath())).not.toHaveProperty("updatedAt");
  expect(attempts).toBe(1);
  boundary.hook = undefined;
  await deleteFixtureMatch();
  expect(await read(matchPath())).toBeUndefined();
});

it("falha em deleteSeason depois dos profissionais deixa base e metadados intactos", async () => {
  await tree();
  failOnce("deleteDoc", "/academyPlayers/a1");
  await expect(ServiceSeasons.deleteSeason("c1", "s1")).rejects.toThrow(
    "Injected",
  );
  expect(await read(seasonPath() + "/players/p1")).toBeUndefined();
  expect(await read(seasonPath() + "/academyPlayers/a1")).toBeDefined();
  expect((await read(careerPath()))!.clubData).toHaveLength(1);
});
it("falha ao atualizar metadados da exclusão deixa temporada listada sem profissionais", async () => {
  await tree();
  failOnce("updateDoc", "/careers/c1");
  await expect(ServiceSeasons.deleteSeason("c1", "s1")).rejects.toThrow(
    "Injected",
  );
  expect(await read(seasonPath())).toBeUndefined();
  expect(await read(seasonPath() + "/players/p1")).toBeUndefined();
  expect((await read(careerPath()))!.clubData).toHaveLength(1);
});
it("carreira inexistente retorna sem criar documentos", async () => {
  await deleteCareerFromFirestore("missing");
  expect(await read(careerPath("missing"))).toBeUndefined();
});
it("[B13] excluir temporada preserva dados exclusivamente legados das outras", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  await seedCareer(
    career({
      clubData: [
        season(),
        season({
          id: "s2",
          seasonNumber: 2,
          players: [player()],
          matches: [match()],
        }),
      ],
    }),
  );
  const before = (await read(careerPath()))!.clubData[1];
  await ServiceSeasons.deleteSeason("c1", "s1");
  expect((await read(careerPath()))!.clubData).toEqual([before]);
  expect(await read(seasonPath("s2") + "/players/p1")).toBeUndefined();
});
it("[B13] falha ao hidratar s2 não apaga seu legado durante exclusão de s1", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  await seedCareer(
    career({
      clubData: [
        season(),
        season({
          id: "s2",
          seasonNumber: 2,
          players: [player()],
          matches: [match({ playerStats: [stat({ goals: 7 })] })],
        }),
      ],
    }),
  );
  const before = (await read(careerPath()))!.clubData[1];
  failOnce("getDocs", "/seasons/s2/matches");
  await ServiceSeasons.deleteSeason("c1", "s1");
  expect((await read(careerPath()))!.clubData).toEqual([before]);
  expect(await read(seasonPath("s2") + "/players/p1")).toBeUndefined();
});

it.each([
  "/players/p1",
  "/academyPlayers/a1",
  "/table/t1",
  "/academyTournaments/t1",
  "/matches/m1/playerStats/p1",
  "/matches/m1",
  "/seasons/s1",
])(
  "[B08] falha em %s propaga erro e permite repetir até completar",
  async (suffix) => {
    const paths = await tree();
    failOnce("deleteDoc", suffix);
    await expect(ServiceSeasons.deleteSeason("c1", "s1")).rejects.toThrow(
      "Injected",
    );
    expect((await read(careerPath()))!.clubData).toHaveLength(1);
    await ServiceSeasons.deleteSeason("c1", "s1");
    expect(await Promise.all(paths.slice(0, 7).map((p) => read(p)))).toEqual(
      Array(7).fill(undefined),
    );
    expect(await read(paths[7])).toBeDefined();
    expect(await read(careerPath())).toMatchObject({ clubData: [] });
  },
);
it("[B08] falha ao remover metadados permite repetir com descendentes já ausentes", async () => {
  const paths = await tree();
  failOnce("updateDoc", "/careers/c1");
  await expect(ServiceSeasons.deleteSeason("c1", "s1")).rejects.toThrow(
    "Injected",
  );
  expect((await read(careerPath()))!.clubData).toHaveLength(1);
  await ServiceSeasons.deleteSeason("c1", "s1");
  expect(await Promise.all(paths.slice(0, 7).map((p) => read(p)))).toEqual(
    Array(7).fill(undefined),
  );
  expect(await read(careerPath())).toMatchObject({ clubData: [] });
});

it("[B08] exclui apenas s1: preserva irmã, carreira A2, usuário B e grupo externo", async () => {
  const paths = await tree();
  const own = (await read(careerPath()))!;
  own.clubData.push(season({ id: "s2", seasonNumber: 2 }));
  await put(careerPath(), own);
  const survivors = [
    seasonPath("s2"),
    seasonPath("s2") + "/players/p2",
    careerPath("c2"),
    careerPath("c2") + "/seasons/s1/matches/m2",
    groupPath(),
  ];
  for (const path of survivors)
    await put(path, { marker: "unchanged", nested: { numbers: [1, 2] } });
  await login("b");
  const otherUser = careerPath();
  const otherChild = seasonPath() + "/academyPlayers/a1";
  await put(otherUser, { marker: "user-b" });
  await put(otherChild, { marker: "child-b" });
  const beforeB = [await read(otherUser), await read(otherChild)];
  await login("a");
  const beforeA = await Promise.all(survivors.map((path) => read(path)));
  await ServiceSeasons.deleteSeason("c1", "s1");
  expect(
    await Promise.all(paths.slice(0, 7).map((path) => read(path))),
  ).toEqual(Array(7).fill(undefined));
  expect(await Promise.all(survivors.map((path) => read(path)))).toEqual(
    beforeA,
  );
  expect(await read(careerPath())).toEqual({
    ...own,
    clubData: [{ id: "s2", seasonNumber: 2, players: [] }],
  });
  await login("b");
  expect([await read(otherUser), await read(otherChild)]).toEqual(beforeB);
});
