import { expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { signOut } from "firebase/auth";
import { ServiceLineup } from "../../src/pages/Match/services/ServiceLineup";
import { ServiceMatches } from "../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { buildLineupStatsUpdate } from "../../src/pages/Match/components/LineupTab/helpers/buildLineupStatsUpdate";
import { savePlayerMatchStats } from "../../src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats";
import type { PlayerMatchStat } from "../../src/common/interfaces/PlayerMatchStat";
import type { SavedLineup } from "../../src/common/interfaces/Lineup";
import {
  career,
  match,
  player,
  season,
  stat,
} from "../../src/test/factories/domain";
import { auth } from "./firebaseClient";
import { boundary } from "./firestoreBoundary";
import {
  careerPath,
  deferred,
  failOnce,
  list,
  login,
  matchPath,
  put,
  read,
  seedCareer,
} from "./helpers";

// Characterization only: assertions below deliberately record the current B16 defect.
const allIds = ["A", "B", "C", "D"];
const keepIds = ["C", "D"];
const lineupFor = (ids: string[]): SavedLineup => ({
  formation: "4-4-2",
  goalkeeper: { slotId: "gk", playerId: null, playerName: null },
  lines: ids
    .filter((id) => id !== "D")
    .map((id) => ({ slotId: `slot-${id}`, playerId: id, playerName: id })),
  bench: ids.includes("D")
    ? [{ slotId: "bench-D", playerId: "D", playerName: "D" }]
    : [],
});
const records = () => [
  stat({ playerId: "A", goals: 1 }),
  stat({ playerId: "B", goals: 2 }),
  stat({
    playerId: "C",
    goals: 3,
    minutesPlayed: 60,
    substituteIn: "D",
    rating: 8.5,
    goalMinutes: [10, 20, 30],
    assists: 1,
    assistTargets: ["D"],
    totalPasses: 42,
  }),
  stat({
    playerId: "D",
    goals: 1,
    minutesPlayed: 30,
    substituteIn: "C",
    rating: 7.5,
  }),
];
const idsOf = (stats: PlayerMatchStat[] = []) =>
  stats.map((s) => s.playerId).sort();
const appMatch = async (id = "m1") =>
  (await ServiceMatches.getMatchesBySeason("c1", "s1")).find(
    (m) => m.matchesId === id,
  )!;
type Source =
  | "modern-only"
  | "embedded-only"
  | "identical"
  | "divergent"
  | "A-modern-B-embedded"
  | "A-embedded-B-modern";
async function seed(source: Source = "identical") {
  const embedded = records().filter(
    (s) =>
      source !== "modern-only" &&
      !(source === "A-modern-B-embedded" && s.playerId === "A"),
  );
  const modern = records().filter(
    (s) =>
      source !== "embedded-only" &&
      !(source === "A-embedded-B-modern" && s.playerId === "A") &&
      !(source === "A-modern-B-embedded" && s.playerId === "B"),
  );
  if (source === "A-embedded-B-modern")
    embedded.splice(
      embedded.findIndex((s) => s.playerId === "B"),
      1,
    );
  if (source === "divergent")
    for (const s of modern) {
      if (s.playerId === "A" || s.playerId === "B") s.goals *= 10;
    }
  await seedCareer(career({ updatedAt: 7, clubData: [season()] }));
  await put(matchPath(), {
    ...match({
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
      lineup: lineupFor(allIds),
      ...(embedded.length ? { playerStats: embedded } : {}),
    }),
    unrelated: "preserve-me",
  });
  for (const s of modern)
    await put(`${matchPath()}/playerStats/${s.playerId}`, s);
  return { embedded, modern };
}
async function state() {
  return {
    parent: (await read(matchPath()))!,
    modern: await list<PlayerMatchStat>(`${matchPath()}/playerStats`),
    application: await appMatch(),
    career: (await read(careerPath()))!,
  };
}
type State = Awaited<ReturnType<typeof state>>;
function expectSources(
  actual: State,
  modern: string[],
  embedded: string[],
  application: string[],
) {
  expect(actual.modern.map((s) => s._documentId).sort()).toEqual(
    [...modern].sort(),
  );
  expect(idsOf(actual.parent.playerStats)).toEqual([...embedded].sort());
  expect(idsOf(actual.application.playerStats)).toEqual(
    [...application].sort(),
  );
  expect(actual.parent).toMatchObject({
    homeScore: 2,
    awayScore: 1,
    status: "FINISHED",
    unrelated: "preserve-me",
  });
  for (const s of records().filter((s) => keepIds.includes(s.playerId))) {
    expect(
      actual.application.playerStats!.find((p) => p.playerId === s.playerId),
    ).toEqual(s);
    const modernStat = actual.modern.find((p) => p.playerId === s.playerId);
    if (modernStat)
      expect(modernStat).toEqual({ ...s, _documentId: s.playerId });
    const embeddedStat = (
      actual.parent.playerStats as PlayerMatchStat[] | undefined
    )?.find((p) => p.playerId === s.playerId);
    if (embeddedStat) expect(embeddedStat).toEqual(s);
  }
}
async function remove(
  ids = ["A", "B"],
  snapshot?: Awaited<ReturnType<typeof appMatch>>,
) {
  const loaded = snapshot ?? (await appMatch());
  const target = lineupFor(allIds.filter((id) => !ids.includes(id)));
  const update = buildLineupStatsUpdate(target, loaded.playerStats);
  await ServiceLineup.saveLineupToMatch(
    "c1",
    "s1",
    "m1",
    target,
    update.updatedPlayerStats,
    update.removedPlayerIds,
  );
}
async function retryAndRepeat(modernKept = keepIds) {
  boundary.hook = undefined;
  // Rebuild from the real merged reread, retaining the same removal intention.
  await remove();
  const recovered = await state();
  expectSources(recovered, modernKept, keepIds, keepIds);
  expect(recovered.parent.lineup).toEqual(lineupFor(keepIds));
  expect(recovered.career.updatedAt).toBeGreaterThan(7);
  await remove();
  const repeated = await state();
  expect(repeated.parent).toEqual(recovered.parent);
  expect(repeated.modern).toEqual(recovered.modern);
  expect(repeated.application).toEqual(recovered.application);
  expect(repeated.career.updatedAt).toBeGreaterThanOrEqual(
    recovered.career.updatedAt,
  );
}

it("[B16] reprodução original: falha no pai não causa exclusão parcial e retry conclui com consistência", async () => {
  await seed();
  failOnce("updateDoc", "/matches/m1", "before", "permission-denied");
  await expect(remove(["A"])).rejects.toThrow("Injected");
  const failed = await state();
  expectSources(failed, allIds, allIds, allIds);
  expect(await read(`${matchPath()}/playerStats/A`)).toBeDefined();
  expect(failed.parent.lineup).toEqual(lineupFor(allIds));
  expect(failed.career.updatedAt).toBe(7);
  await retryAndRepeat();
});

it.each([
  "before-all",
  "after-A",
  "after-AB",
  "before-parent",
  "after-parent",
  "before-timestamp",
  "after-timestamp",
  "parent-permission-denied",
] as const)(
  "[B16] múltiplas exclusões, estado parcial e retry: %s",
  async (point) => {
    await seed();
    const aDeleted = deferred();
    const mPath = matchPath(),
      cPath = careerPath();
    boundary.hook = async (call) => {
      const deletion = call.operation === "deleteDoc";
      if (point === "before-all" && deletion && call.phase === "before")
        throw new FirebaseError("permission-denied", "Injected before-all");
      if ((point === "after-A" || point === "after-AB") && deletion) {
        if (call.path.endsWith("/playerStats/A") && call.phase === "after")
          aDeleted.resolve();
        if (call.path.endsWith("/playerStats/B") && call.phase === "before") {
          if (point === "after-A")
            throw new FirebaseError("permission-denied", "Injected after-A");
        }
        if (
          point === "after-AB" &&
          call.path.endsWith("/playerStats/B") &&
          call.phase === "after"
        )
          throw new FirebaseError("unavailable", "Injected after-AB");
      }
      if (call.operation === "updateDoc" && call.path === mPath) {
        if (point === "before-parent" && call.phase === "before")
          throw new FirebaseError(
            "permission-denied",
            "Injected before-parent",
          );
        if (point === "after-parent" && call.phase === "after")
          throw new FirebaseError("unavailable", "Injected after-parent");
        if (point === "parent-permission-denied" && call.phase === "before")
          await signOut(auth);
      }
      if (call.operation === "updateDoc" && call.path === cPath) {
        if (point === "before-timestamp" && call.phase === "before")
          throw new FirebaseError(
            "permission-denied",
            "Injected before-timestamp",
          );
        if (point === "after-timestamp" && call.phase === "after")
          throw new FirebaseError("unavailable", "Injected after-timestamp");
      }
    };
    const pending = remove();
    if (point === "parent-permission-denied") {
      await expect(pending).rejects.toMatchObject({
        code: "permission-denied",
      });
      await login();
    } else await expect(pending).rejects.toThrow("Injected");
    boundary.hook = undefined;
    const committed = ["after-AB", "after-parent", "after-timestamp"].includes(
      point,
    );
    const modern = committed ? keepIds : allIds;
    const embedded = committed ? keepIds : allIds;
    const application = committed ? keepIds : allIds;
    const failed = await state();
    expectSources(failed, modern, embedded, application);
    expect(failed.parent.lineup).toEqual(
      lineupFor(committed ? keepIds : allIds),
    );
    if (committed) expect(failed.career.updatedAt).toBeGreaterThan(7);
    else expect(failed.career.updatedAt).toBe(7);
    await retryAndRepeat();
  },
);

it.each([
  "modern-only",
  "embedded-only",
  "identical",
  "divergent",
  "A-modern-B-embedded",
  "A-embedded-B-modern",
] as const)(
  "[B16] origem %s: falha no pai, releitura, retry e repetição",
  async (source) => {
    const initial = await seed(source);
    const before = await appMatch();
    expect(idsOf(before.playerStats)).toEqual(allIds);
    if (source === "divergent")
      expect(before.playerStats!.find((s) => s.playerId === "A")!.goals).toBe(
        10,
      );
    failOnce("updateDoc", "/matches/m1", "before", "permission-denied");
    await expect(remove()).rejects.toThrow("Injected");
    const failed = await state();
    const embeddedIds = idsOf(initial.embedded);
    const modernIds = idsOf(initial.modern);
    const appIds = allIds;
    expectSources(failed, modernIds, embeddedIds, appIds);
    if (source === "divergent")
      expect(
        failed.application.playerStats!.find((s) => s.playerId === "A")!.goals,
      ).toBe(10);
    await retryAndRepeat();
  },
);

it("[B16] falha de exclusão antes do commit impede qualquer exclusão parcial", async () => {
  await seed();
  boundary.hook = async (call) => {
    if (
      call.operation === "deleteDoc" &&
      call.path.endsWith("/A") &&
      call.phase === "before"
    ) {
      throw new Error("Injected A");
    }
  };
  await expect(remove()).rejects.toThrow("Injected A");
  expectSources(await state(), allIds, allIds, allIds);
  await retryAndRepeat();
});

it("[B16] retry imediato após falha de exclusão converge para a mesma remoção", async () => {
  await seed();
  let rejectA = true;
  boundary.hook = async (call) => {
    if (
      rejectA &&
      call.operation === "deleteDoc" &&
      call.path.endsWith("/A") &&
      call.phase === "before"
    ) {
      rejectA = false;
      throw new Error("Injected A");
    }
  };
  await expect(remove()).rejects.toThrow("Injected A");
  expectSources(await state(), allIds, allIds, allIds);
  await remove();
  expectSources(await state(), keepIds, keepIds, keepIds);
  await retryAndRepeat();
});

it("[B16] sucesso completo e replay exato de A/B já ausentes mantêm os dados estáveis", async () => {
  await seed();
  const target = lineupFor(keepIds);
  const update = buildLineupStatsUpdate(target, (await appMatch()).playerStats);
  expect(update.removedPlayerIds).toEqual(["A", "B"]);
  let previous: State | undefined;
  for (let pass = 0; pass < 3; pass++) {
    await ServiceLineup.saveLineupToMatch(
      "c1",
      "s1",
      "m1",
      target,
      update.updatedPlayerStats,
      update.removedPlayerIds,
    );
    const current = await state();
    expectSources(current, keepIds, keepIds, keepIds);
    expect(current.parent.lineup).toEqual(target);
    if (previous) {
      expect(current.parent).toEqual(previous.parent);
      expect(current.modern).toEqual(previous.modern);
      expect(current.application).toEqual(previous.application);
      expect(current.career.updatedAt).toBeGreaterThanOrEqual(
        previous.career.updatedAt,
      );
    }
    previous = current;
  }
});

it.each(["A", "B"])(
  "[B16] concorrência: operação que remove %s grava o pai por último",
  async (firstRemoved) => {
    await seed();
    const original = await appMatch();
    const otherRemoved = firstRemoved === "A" ? "B" : "A";
    const entered = deferred(),
      release = deferred();
    let paused = false;
    boundary.hook = async (call) => {
      if (
        !paused &&
        call.operation === "updateDoc" &&
        call.path === matchPath() &&
        call.phase === "before"
      ) {
        paused = true;
        entered.resolve();
        await release.promise;
      }
    };
    const first = remove([firstRemoved], original);
    try {
      await entered.promise;
      await remove([otherRemoved], original);
      expectSources(
        await state(),
        allIds.filter((id) => id !== otherRemoved),
        allIds.filter((id) => id !== otherRemoved),
        allIds.filter((id) => id !== otherRemoved),
      );
    } finally {
      release.resolve();
      await first;
    }
    const final = await state();
    // Sem leitura transacional, o último snapshot local gravado define a Lineup.
    const lastWriterIds = allIds.filter((id) => id !== firstRemoved);
    expectSources(final, lastWriterIds, lastWriterIds, lastWriterIds);
    expect(final.parent.lineup).toEqual(lineupFor(lastWriterIds));
    await retryAndRepeat();
  },
);

it("[B16-B] concorrência: duas operações concorrentes tentando remover o MESMO atleta (A e A)", async () => {
  await seed();
  const original = await appMatch();
  const entered = deferred(),
    release = deferred();
  let paused = false;
  boundary.hook = async (call) => {
    if (
      !paused &&
      call.operation === "updateDoc" &&
      call.path === matchPath() &&
      call.phase === "before"
    ) {
      paused = true;
      entered.resolve();
      await release.promise;
    }
  };
  const first = remove(["A"], original);
  try {
    await entered.promise;
    await remove(["A"], original);
  } finally {
    release.resolve();
    await first;
  }
  const final = await state();
  expect(await read(`${matchPath()}/playerStats/A`)).toBeUndefined();
  expect(idsOf(final.parent.playerStats)).toEqual(["B", "C", "D"]);
  expect(idsOf(final.application.playerStats)).toEqual(["B", "C", "D"]);
  expect(final.parent.lineup).toEqual(lineupFor(["B", "C", "D"]));
  expect(final.application.playerStats!.some((s) => s.playerId === "A")).toBe(
    false,
  );
});

it("[B16-B] concorrência: operação 1 remove A e operação 2 remove A e B", async () => {
  await seed();
  const original = await appMatch();
  const entered = deferred(),
    release = deferred();
  let paused = false;
  boundary.hook = async (call) => {
    if (
      !paused &&
      call.operation === "updateDoc" &&
      call.path === matchPath() &&
      call.phase === "before"
    ) {
      paused = true;
      entered.resolve();
      await release.promise;
    }
  };
  const first = remove(["A"], original);
  try {
    await entered.promise;
    await remove(["A", "B"], original);
  } finally {
    release.resolve();
    await first;
  }
  const final = await state();
  expectSources(final, ["B", "C", "D"], ["B", "C", "D"], ["B", "C", "D"]);
  expect(final.parent.lineup).toEqual(lineupFor(["B", "C", "D"]));
});

it("[B16-B] save de lineup não abre leitura transacional", async () => {
  await seed();
  const original = await appMatch();
  boundary.calls = [];
  boundary.hook = (call) => {
    if (call.phase === "before" && call.operation.startsWith("get")) {
      throw new FirebaseError("resource-exhausted", "Injected read quota");
    }
  };
  await remove(["A"], original);
  boundary.hook = undefined;
  expect(
    boundary.calls.filter(
      (call) => call.phase === "before" && call.operation.startsWith("get"),
    ),
  ).toEqual([]);
  const final = await state();
  expectSources(final, ["B", "C", "D"], ["B", "C", "D"], ["B", "C", "D"]);
  expect(final.parent.lineup).toEqual(lineupFor(["B", "C", "D"]));
});

it("[B16-B] concorrência zero-read usa semântica de último snapshot local", async () => {
  await seed();
  const original = await appMatch();
  const entered = deferred(),
    release = deferred();
  let paused = false;
  boundary.hook = async (call) => {
    if (
      !paused &&
      call.operation === "updateDoc" &&
      call.path === matchPath() &&
      call.phase === "before"
    ) {
      paused = true;
      entered.resolve();
      await release.promise;
    }
  };
  const nonRemovingLineup: SavedLineup = {
    ...lineupFor(allIds),
    formation: "4-3-3",
  };
  const op2 = ServiceLineup.saveLineupToMatch(
    "c1",
    "s1",
    "m1",
    nonRemovingLineup,
    original.playerStats || [],
    [],
  );

  try {
    await entered.promise;
    await remove(["A"], original);
  } finally {
    release.resolve();
    await op2;
  }

  const final = await state();
  expectSources(final, allIds, allIds, allIds);
  expect(final.parent.lineup).toEqual(nonRemovingLineup);
});

it("[B16-B] combinado B16-A + B16-B: concorrência com falha injetada e retry converge", async () => {
  await seed();
  const original = await appMatch();
  failOnce("updateDoc", "/matches/m1", "before", "permission-denied");
  await expect(remove(["A"], original)).rejects.toThrow("Injected");
  const midState = await state();
  expectSources(midState, allIds, allIds, allIds);
  expect(await read(`${matchPath()}/playerStats/A`)).toBeDefined();

  await remove(["B"], original);
  const afterOp2 = await state();
  expect(idsOf(afterOp2.parent.playerStats)).toEqual(["A", "C", "D"]);

  boundary.hook = undefined;
  await remove(["A"], await appMatch());
  const final = await state();
  expectSources(final, keepIds, keepIds, keepIds);
  expect(final.parent.lineup).toEqual(lineupFor(["B", "C", "D"]));
});

it("[B16] uma ficha por partida: remover A de m1 não remove A de m2 nem seu histórico", async () => {
  await seed();
  const other = stat({ playerId: "A", goals: 8, minutesPlayed: 45 });
  await put(matchPath("m2"), match({ matchesId: "m2", playerStats: [other] }));
  await put(`${matchPath("m2")}/playerStats/A`, other);
  const before = await read(matchPath("m2"));
  await remove();
  expect(await read(`${matchPath()}/playerStats/A`)).toBeUndefined();
  expect(await read(`${matchPath("m2")}/playerStats/A`)).toEqual(other);
  expect(await read(matchPath("m2"))).toEqual(before);
  expect((await appMatch("m2")).playerStats).toEqual([other]);
});

it.each(["embedded-only", "identical"] as const)(
  "[B16] entradas embutidas repetidas de A em %s usam o mesmo documento moderno",
  async (source) => {
    await seed(source);
    const parent = (await read(matchPath()))!;
    await put(matchPath(), {
      ...parent,
      playerStats: [records()[0], ...records()],
    });
    const current = await appMatch();
    const update = buildLineupStatsUpdate(
      lineupFor(keepIds),
      current.playerStats,
    );
    expect(update.removedPlayerIds.filter((id) => id === "A")).toHaveLength(
      source === "embedded-only" ? 2 : 1,
    );
    boundary.calls = [];
    await ServiceLineup.saveLineupToMatch(
      "c1",
      "s1",
      "m1",
      lineupFor(keepIds),
      update.updatedPlayerStats,
      update.removedPlayerIds,
    );
    expect(
      boundary.calls.filter(
        (c) =>
          c.operation === "deleteDoc" &&
          c.phase === "before" &&
          c.path.endsWith("/A"),
      ),
    ).toHaveLength(1);
    expectSources(
      await state(),
      keepIds,
      keepIds,
      keepIds,
    );
    await retryAndRepeat();
  },
);

it("[B16] titular/contraparte: falha transitória é atômica e retry explícito grava ambas", async () => {
  await seed("embedded-only");
  const parent = (await read(matchPath()))!;
  // Only C/D have existing stats; A/B will be saved as a substitution pair.
  await put(matchPath(), {
    ...parent,
    playerStats: records().filter((s) => keepIds.includes(s.playerId)),
  });
  for (const s of records().filter((s) => keepIds.includes(s.playerId)))
    await put(`${matchPath()}/playerStats/${s.playerId}`, s);
  const args = {
    career: career(),
    season: season({
      players: ["A", "B", "C", "D"].map((id) => player({ id, name: id })),
    }),
    match: await appMatch(),
    player: player({ id: "A", name: "A" }),
    formValues: { minutesPlayed: "60", substituteIn: "B", matchGoals: "2" },
    booleanValues: {},
  };
  failOnce("setDoc", "/playerStats/B", "before", "unavailable");
  await expect(savePlayerMatchStats(args)).rejects.toThrow("Injected");
  expectSources(await state(), keepIds, keepIds, keepIds);
  boundary.hook = undefined;
  await savePlayerMatchStats(args);

  expect(await read(`${matchPath()}/playerStats/A`)).toMatchObject({
    goals: 2,
    minutesPlayed: 60,
    substituteIn: "B",
  });
  expect(await read(`${matchPath()}/playerStats/B`)).toMatchObject({
    minutesPlayed: 30,
    substituteIn: "A",
  });
  expect(idsOf((await read(matchPath()))!.playerStats)).toEqual(allIds);
  expect(idsOf((await appMatch()).playerStats)).toEqual(allIds);
  const saved = await list(`${matchPath()}/playerStats`);
  await savePlayerMatchStats({ ...args, match: await appMatch() });
  expect(await list(`${matchPath()}/playerStats`)).toEqual(saved);
  expect(await read(`${matchPath()}/playerStats/B`)).toMatchObject({
    minutesPlayed: 30,
    substituteIn: "A",
  });
  await retryAndRepeat();
});

it("[B16] titular/contraparte (falha terminal): falha permanente rejeita e garante zero estado parcial", async () => {
  await seed("embedded-only");
  const parentBefore = (await read(matchPath()))!;
  const initialEmbedded = records().filter((s) => keepIds.includes(s.playerId));
  await put(matchPath(), {
    ...parentBefore,
    playerStats: initialEmbedded,
  });
  for (const s of initialEmbedded)
    await put(`${matchPath()}/playerStats/${s.playerId}`, s);

  const beforeParent = await read(matchPath());
  const beforeStats = await list(`${matchPath()}/playerStats`);
  expect(beforeStats.map((s) => s._documentId).sort()).toEqual(keepIds.sort());

  const args = {
    career: career(),
    season: season({
      players: ["A", "B", "C", "D"].map((id) => player({ id, name: id })),
    }),
    match: await appMatch(),
    player: player({ id: "A", name: "A" }),
    formValues: { minutesPlayed: "60", substituteIn: "B", matchGoals: "2" },
    booleanValues: {},
  };

  // Injeção de falha terminal: rejeita em todas as tentativas da transação
  boundary.hook = (call) => {
    if (
      call.operation === "setDoc" &&
      call.path.endsWith("/playerStats/B") &&
      call.phase === "before"
    ) {
      throw new FirebaseError(
        "permission-denied",
        "Injected permanent permission-denied",
      );
    }
  };

  await expect(savePlayerMatchStats(args)).rejects.toThrow(
    "Injected permanent permission-denied",
  );
  boundary.hook = undefined;

  // Provas após falha terminal:
  // 1. parent match unchanged
  const afterParent = await read(matchPath());
  expect(afterParent).toEqual(beforeParent);

  // 2. embedded unchanged
  expect(idsOf(afterParent!.playerStats)).toEqual(keepIds.sort());

  // 3. playerStats subcollection unchanged
  const afterStats = await list(`${matchPath()}/playerStats`);
  expect(afterStats.map((s) => s._documentId).sort()).toEqual(keepIds.sort());
  expect(await read(`${matchPath()}/playerStats/A`)).toBeUndefined();
  expect(await read(`${matchPath()}/playerStats/B`)).toBeUndefined();

  // 4. nenhuma metade da operação persistiu
  for (const s of initialEmbedded) {
    expect(
      await read(`${matchPath()}/playerStats/${s.playerId}`),
    ).toMatchObject({
      playerId: s.playerId,
      goals: s.goals,
    });
  }
});
