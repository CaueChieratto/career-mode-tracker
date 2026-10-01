process.env.PERF_TIMEOUT_MS = process.env.PERF_TIMEOUT_MS || "120000";

import { launch, session, login } from "./browser.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);

function cat(path) {
  const parts = path?.split("/") || [];
  const c = parts.length % 2 === 0 ? parts.at(-2) : parts.at(-1);
  return (
    {
      careers: "careers",
      seasons: "seasons",
      players: "players",
      matches: "matches",
      playerStats: "playerStats",
      academyPlayers: "academyPlayers",
      academyTournaments: "academyTournaments",
      table: "table",
      careerGroups: "groups",
    }[c] ||
    c ||
    "other"
  );
}

async function measureHydration(name, expectedCount) {
  const browser = await launch();
  const results = {};
  try {
    for (const fixture of fixtures) {
      console.log(
        `\n[${name}] Medindo perfil: ${fixture.name.toUpperCase()} (${fixture.totals.matches} partidas na fixture)...`,
      );
      const s = await session(browser, false);
      try {
        try {
          await login(s, fixture);
        } catch (err) {
          console.warn(`  [${name}] Observação sobre login: ${err.message}`);
        }
        await s.flush();

        const operations = s.events.filter(
          (e) =>
            (e.kind === "read-start" || e.kind === "listen-start") &&
            cat(e.path) === "playerStats",
        );
        const subcollectionQueries = operations.length;

        results[fixture.name] = subcollectionQueries;
        console.log(
          `[${name}] ${fixture.name}: esperado ~${expectedCount[fixture.name]}, obtido = ${subcollectionQueries} playerStats queries`,
        );

        if (subcollectionQueries > 0) {
          console.log(`  Exemplo de path interceptado: ${operations[0]?.path}`);
        }
      } finally {
        await s.context.close();
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function measureMatchDetail() {
  console.log(`\n[MATCH DETAIL] Medindo abertura de partida individual...`);
  const browser = await launch();
  try {
    const fixture = fixtures.find((f) => f.name === "small");
    const s = await session(browser, false);
    try {
      await login(s, fixture);
      await s.flush();
      s.events.length = 0;
      s.requests.length = 0;

      // Navegar para MatchDetail da partida s1m1 de c1
      console.log(
        `  Navegando diretamente para MatchDetail: /Career/c1/Season/s1/Match/s1m1`,
      );
      await s.page.goto(`${s.origin}/Career/c1/Season/s1/Match/s1m1`);
      await s.quiet();
      await s.flush();

      const operations = s.events.filter(
        (e) =>
          (e.kind === "read-start" || e.kind === "listen-start") &&
          cat(e.path) === "playerStats",
      );

      const targetMatchOps = operations.filter((e) =>
        e.path.includes("/matches/s1m1/playerStats"),
      );
      const otherMatchesOps = operations.filter(
        (e) => !e.path.includes("/matches/s1m1/playerStats"),
      );

      console.log(
        `[MATCH DETAIL] Total playerStats queries: ${operations.length} (alvo s1m1: ${targetMatchOps.length}, outras partidas: ${otherMatchesOps.length})`,
      );
      return {
        total: operations.length,
        targetMatch: targetMatchOps.length,
        otherMatches: otherMatchesOps.length,
      };
    } finally {
      await s.context.close();
    }
  } finally {
    await browser.close();
  }
}

async function run() {
  console.log("==============================================================");
  console.log("ETAPA 7B — MEDIÇÃO DE PERFORMANCE RIGOROSA E COMPARÁVEL");
  console.log("Metodologia: SDK events read-start/listen-start via cat(path)");
  console.log("==============================================================");

  console.log(
    "\n1. Medindo BEFORE migration (fixtures legadas sem _playerStatsVersion)...",
  );
  const beforeResults = await measureHydration("BEFORE", {
    small: 60,
    medium: 300,
    large: 900,
  });

  console.log("\n2. Executando Migration 7B no Emulator...");
  const guardPath = resolve("tests/performance/network-guard.cjs").replaceAll(
    "\\",
    "/",
  );
  execSync("node tests/performance/migrate-7b.mjs", {
    stdio: "inherit",
    env: {
      ...process.env,
      TEST_EMULATOR_ENABLED: "1",
      NODE_OPTIONS: `--require "${guardPath}"`,
    },
  });

  console.log(
    "\n3. Medindo AFTER migration (fixtures migradas com _playerStatsVersion: 1)...",
  );
  const afterResults = await measureHydration("AFTER", {
    small: 0,
    medium: 0,
    large: 0,
  });

  console.log("\n4. Medindo Match Detail após migração...");
  const matchDetailResults = await measureMatchDetail();

  console.log(
    "\n==============================================================",
  );
  console.log("RESUMO CONSOLIDADO DOS RESULTADOS");
  console.log("==============================================================");
  console.log(
    `BEFORE migration: small=${beforeResults.small}, medium=${beforeResults.medium}, large=${beforeResults.large}`,
  );
  console.log(
    `AFTER migration:  small=${afterResults.small}, medium=${afterResults.medium}, large=${afterResults.large}`,
  );
  console.log(
    `MATCH DETAIL:     alvo=${matchDetailResults.targetMatch}, outras=${matchDetailResults.otherMatches}, total=${matchDetailResults.total}`,
  );
  console.log("==============================================================");
}

await run();
