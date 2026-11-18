// @vitest-environment jsdom
// Investigacao (somente leitura de producao): verifica no EMULADOR se leituras/estados
// desatualizados regridem estatisticas de jogadores. Nenhum codigo de producao e alterado.
// Cada teste expressa o INVARIANTE desejado (nenhuma regressao); falha = comportamento reproduzido.
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PlayerMatchStat } from "../../src/common/interfaces/PlayerMatchStat";
import type { SavedLineup } from "../../src/common/interfaces/Lineup";
import type { Match } from "../../src/common/interfaces/Match";
import { ServiceLineup } from "../../src/pages/Match/services/ServiceLineup";
import { ServiceMatches } from "../../src/common/services/ServiceMatches";
import { buildLineupStatsUpdate } from "../../src/pages/Match/components/LineupTab/helpers/buildLineupStatsUpdate";
import { savePlayerMatchStats } from "../../src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats";
import { augmentSeasonWithMatchStats } from "../../src/common/stats/helpers/mergeMatchStats";
import { useMatchData } from "../../src/pages/Match/hooks/useMatchData";
import {
  career,
  match,
  player,
  season,
  stat,
} from "../../src/test/factories/domain";
import { boundary } from "./firestoreBoundary";
import { deferred, list, matchPath, put, read, seedCareer } from "./helpers";

const mocks = vi.hoisted(() => ({
  seasonData: { current: undefined as unknown },
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ careerId: "c1", seasonId: "s1", matchesId: "m1" }),
  useNavigate: () => () => {},
  useLocation: () => ({ search: "" }),
}));
vi.mock("../../src/common/hooks/Seasons/UseSeasonData", () => ({
  useSeasonData: () => mocks.seasonData.current,
}));

afterEach(cleanup);

const players = ["A", "B", "C"].map((id) => player({ id, name: id }));
const lineupFor = (ids: string[]): SavedLineup => ({
  formation: "4-4-2",
  goalkeeper: { slotId: "gk", playerId: null, playerName: null },
  lines: ids.map((id) => ({
    slotId: `slot-${id}`,
    playerId: id,
    playerName: id,
  })),
  bench: [],
});
const freshStats = (): PlayerMatchStat[] => [
  stat({ playerId: "A", goals: 1, assists: 0, rating: 7 }),
  stat({ playerId: "B", goals: 2, assists: 1, rating: 8 }),
  stat({ playerId: "C", goals: 3, assists: 2, rating: 9 }),
];
const byId = (stats: PlayerMatchStat[] = [], id: string) =>
  stats.find((s) => s.playerId === id);
const FIELDS = ["goals", "assists", "rating", "minutesPlayed"] as const;

async function seedFresh() {
  const stats = freshStats();
  await seedCareer(career({ updatedAt: 1, clubData: [season({ players })] }));
  await put(matchPath(), {
    ...match({
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
      lineup: lineupFor(["A", "B", "C"]),
    }),
    playerStats: stats,
    _playerStatsVersion: 1,
  });
  for (const s of stats) await put(`${matchPath()}/playerStats/${s.playerId}`, s);
  return stats;
}
/** Compara documento pai x subcoleção; retorna lista legivel de divergencias. */
async function divergences() {
  const parent = (await read(matchPath())) as Match;
  const sub = await list<PlayerMatchStat>(`${matchPath()}/playerStats`);
  const out: string[] = [];
  const ids = new Set([
    ...(parent.playerStats ?? []).map((s) => s.playerId),
    ...sub.map((s) => s._documentId),
  ]);
  for (const id of [...ids].sort()) {
    const p = byId(parent.playerStats, id);
    const s = sub.find((x) => x._documentId === id);
    if (!p || !s) {
      out.push(`${id}: presente apenas em ${p ? "pai" : "subcolecao"}`);
      continue;
    }
    for (const f of FIELDS)
      if (p[f] !== s[f]) out.push(`${id}.${f}: pai=${p[f]} sub=${s[f]}`);
  }
  return { parent, sub, out };
}
const aggregatedGames = async (id: string) => {
  const matches = await ServiceMatches.getMatchesBySeason("c1", "s1");
  const aug = augmentSeasonWithMatchStats(
    season({ players, matches, leagues: [] }),
    "Clube",
  );
  return aug.players
    .find((p) => p.id === id)
    ?.statsLeagues?.find((l) => l.leagueName === "Liga")?.stats;
};
const formFor = (over: Record<string, string>) => ({
  minutesPlayed: "90",
  ...over,
});
const saveFor = (id: string, current: Match, form: Record<string, string>) =>
  savePlayerMatchStats({
    career: career(),
    season: season({ players }),
    match: current,
    player: players.find((p) => p.id === id)!,
    formValues: formFor(form),
    booleanValues: {},
  });

it("[CONTROLE] salvar formacao com estado fresco nao diverge pai x subcolecao", async () => {
  await seedFresh();
  const current = (await ServiceMatches.getMatchesBySeason("c1", "s1"))[0];
  const lineup = lineupFor(["A", "B", "C"]);
  const upd = buildLineupStatsUpdate(lineup, current.playerStats);
  await ServiceLineup.saveLineupToMatch(
    "c1",
    "s1",
    "m1",
    lineup,
    upd.updatedPlayerStats,
    upd.removedPlayerIds,
  );
  expect((await divergences()).out).toEqual([]);
  expect(await aggregatedGames("C")).toMatchObject({ games: 1, goals: 3 });
});

it("[T1] leitura assincrona antiga nao deve sobrescrever estado local mais recente (useMatchData)", async () => {
  await seedFresh();
  const initialParent = (await read(matchPath())) as Match;
  mocks.seasonData.current = {
    career: career(),
    season: season({ players, matches: [initialParent] }),
    loading: false,
  };

  const reached = deferred();
  const gate = deferred();
  let first = true;
  boundary.hook = async (call) => {
    if (
      first &&
      call.operation === "getDocs" &&
      call.phase === "after" &&
      call.path.endsWith("/matches/m1/playerStats")
    ) {
      first = false;
      reached.resolve();
      await gate.promise; // leitura ja executada (dados antigos); entrega retida
    }
  };
  const { result } = renderHook(() => useMatchData());
  await reached.promise;

  // Enquanto a leitura antiga esta em voo, o usuario salva assistencia de A (0 -> 1).
  const current = (await ServiceMatches.getMatchesBySeason("c1", "s1"))[0];
  const { updatedPlayerStats } = await saveFor(
    "A",
    current,
    { matchGoals: "1", assists: "1", rating: "7" },
  );
  act(() => result.current.updateLocalMatch({ playerStats: updatedPlayerStats }));
  expect(byId(result.current.match?.playerStats, "A")?.assists).toBe(1);
  expect(byId((await read(matchPath()))?.playerStats, "A")?.assists).toBe(1);

  await act(async () => {
    gate.resolve();
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  // INVARIANTE: o estado local continua com assists=1
  expect(byId(result.current.match?.playerStats, "A")?.assists).toBe(1);
});

it("[T2] salvar estatisticas de um jogador com snapshot antigo nao deve regredir outro jogador", async () => {
  await seedFresh();
  // snapshot antigo: B ainda com valores anteriores
  const stale = match({
    status: "FINISHED",
    playerStats: [
      stat({ playerId: "A", goals: 1, assists: 0, rating: 7 }),
      stat({ playerId: "B", goals: 0, assists: 0, rating: 6 }),
      stat({ playerId: "C", goals: 3, assists: 2, rating: 9 }),
    ],
  });
  await saveFor("A", stale, { matchGoals: "1", assists: "1", rating: "7" });
  const d = await divergences();
  const bSub = byId(d.sub as PlayerMatchStat[], "B") ?? d.sub.find((s) => s._documentId === "B");
  expect({
    sub: { goals: bSub?.goals, assists: bSub?.assists, rating: bSub?.rating },
    parent: {
      goals: byId(d.parent.playerStats, "B")?.goals,
      assists: byId(d.parent.playerStats, "B")?.assists,
      rating: byId(d.parent.playerStats, "B")?.rating,
    },
  }).toEqual({
    sub: { goals: 2, assists: 1, rating: 8 },
    parent: { goals: 2, assists: 1, rating: 8 },
  });
});

it("[T3] salvar formacao com array incompleto nao deve esconder jogador (versao 1 + pai x subcolecao)", async () => {
  await seedFresh();
  const staleMissingC = [
    stat({ playerId: "A", goals: 1, assists: 0, rating: 7 }),
    stat({ playerId: "B", goals: 2, assists: 1, rating: 8 }),
  ];
  const lineup = lineupFor(["A", "B", "C"]);
  const upd = buildLineupStatsUpdate(lineup, staleMissingC);
  await ServiceLineup.saveLineupToMatch(
    "c1",
    "s1",
    "m1",
    lineup,
    upd.updatedPlayerStats,
    upd.removedPlayerIds,
  );
  const d = await divergences();
  expect.soft(d.parent._playerStatsVersion).toBe(1);
  expect.soft(d.out).toEqual([]);
  expect.soft(await aggregatedGames("C")).toMatchObject({ games: 1, goals: 3 });
});

it("[C1-COMPLEMENTAR] leitura retida e aplicada se nao houver atualizacao local no intervalo", async () => {
  await seedFresh();
  const initialParent = (await read(matchPath())) as Match;
  mocks.seasonData.current = {
    career: career(),
    season: season({ players, matches: [initialParent] }),
    loading: false,
  };

  const reached = deferred();
  const gate = deferred();
  let first = true;
  boundary.hook = async (call) => {
    if (
      first &&
      call.operation === "getDocs" &&
      call.phase === "after" &&
      call.path.endsWith("/matches/m1/playerStats")
    ) {
      first = false;
      reached.resolve();
      await gate.promise;
    }
  };
  const { result } = renderHook(() => useMatchData());
  await reached.promise;

  await act(async () => {
    gate.resolve();
  });
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.match?.playerStats).toHaveLength(3);
  expect(byId(result.current.match?.playerStats, "A")?.goals).toBe(1);
  expect(byId(result.current.match?.playerStats, "B")?.goals).toBe(2);
  expect(byId(result.current.match?.playerStats, "C")?.goals).toBe(3);
});

it("[C2-COMPLEMENTAR] dois saves consecutivos com snapshots antigos preservam ambos os atletas", async () => {
  await seedFresh();
  const stale1 = match({
    status: "FINISHED",
    playerStats: [
      stat({ playerId: "A", goals: 0, assists: 0, rating: 6 }),
      stat({ playerId: "B", goals: 2, assists: 1, rating: 8 }),
      stat({ playerId: "C", goals: 3, assists: 2, rating: 9 }),
    ],
  });
  const stale2 = match({
    status: "FINISHED",
    playerStats: [
      stat({ playerId: "A", goals: 1, assists: 0, rating: 7 }),
      stat({ playerId: "B", goals: 0, assists: 0, rating: 6 }),
      stat({ playerId: "C", goals: 3, assists: 2, rating: 9 }),
    ],
  });

  await saveFor("A", stale1, { matchGoals: "5", assists: "0", rating: "8" });
  await saveFor("B", stale2, { matchGoals: "4", assists: "1", rating: "8" });

  const d = await divergences();
  expect(d.out).toEqual([]);
  expect(byId(d.parent.playerStats, "A")?.goals).toBe(5);
  expect(byId(d.parent.playerStats, "B")?.goals).toBe(4);
  expect(byId(d.parent.playerStats, "C")?.goals).toBe(3);
});

it("[C2-COMPLEMENTAR] reserva sintetico nao zera metricas existentes fora do snapshot local (H6)", async () => {
  await seedFresh();
  const localMissingB = match({
    status: "FINISHED",
    playerStats: [
      stat({ playerId: "A", goals: 1, assists: 0, rating: 7, minutesPlayed: 90 }),
      stat({ playerId: "C", goals: 3, assists: 2, rating: 9, minutesPlayed: 90 }),
    ],
  });

  await savePlayerMatchStats({
    career: career(),
    season: season({ players }),
    match: localMissingB,
    player: players.find((p) => p.id === "A")!,
    formValues: formFor({ minutesPlayed: "60", substituteIn: "B", matchGoals: "1" }),
    booleanValues: {},
  });

  const d = await divergences();
  expect(d.out).toEqual([]);
  const bStat = byId(d.parent.playerStats, "B");
  expect(bStat?.goals).toBe(2);
  expect(bStat?.assists).toBe(1);
  expect(bStat?.minutesPlayed).toBe(30);
  expect(bStat?.substituteIn).toBe("A");
});

it("[C3-COMPLEMENTAR] salvar formacao consecutivamente e idempotente e nao altera estado", async () => {
  await seedFresh();
  const current = (await ServiceMatches.getMatchesBySeason("c1", "s1"))[0];
  const lineup = lineupFor(["A", "B", "C"]);
  const upd = buildLineupStatsUpdate(lineup, current.playerStats);

  await ServiceLineup.saveLineupToMatch("c1", "s1", "m1", lineup, upd.updatedPlayerStats, upd.removedPlayerIds);
  const state1 = await read(matchPath());

  await ServiceLineup.saveLineupToMatch("c1", "s1", "m1", lineup, upd.updatedPlayerStats, upd.removedPlayerIds);
  const state2 = await read(matchPath());

  expect(state2).toEqual(state1);
  expect((await divergences()).out).toEqual([]);
});
