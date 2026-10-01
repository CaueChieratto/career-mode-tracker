import { launch, session, login } from "./browser.mjs";
import { capture } from "./journeys.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);

const nav = (page, text) =>
  page.locator("nav").getByText(text, { exact: true });

const round = (x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x);

function analyzeEvents(row) {
  const events = row.events || [];
  const requests = row.requests || [];
  const click = row.click ?? row.begin;
  const timing = (val) =>
    Number.isFinite(val) && Number.isFinite(click) ? round(val - click) : null;

  const reads = events.filter((e) => e.kind === "read-start");
  const listens = events.filter((e) => e.kind === "listen-start");
  const done = events.filter((e) => e.kind === "read-end");
  const callbacks = events.filter((e) => e.kind === "listen-callback");

  const pathCounts = {};
  for (const r of reads) {
    pathCounts[r.path] = (pathCounts[r.path] || 0) + 1;
  }
  for (const l of listens) {
    pathCounts[l.path] = (pathCounts[l.path] || 0) + 1;
  }

  const duplicatePaths = Object.entries(pathCounts)
    .filter(([, count]) => count > 1)
    .map(([path, count]) => ({ path, count }));

  const docs =
    done.reduce((acc, e) => acc + (e.documents || 0), 0) +
    callbacks.reduce((acc, e) => acc + (e.documents || 0), 0);

  const authCallbacks = events.filter((e) => e.kind === "auth-callback").length;
  const authRequests = requests.filter((r) =>
    r.url.startsWith("http://127.0.0.1:9098"),
  ).length;

  return {
    name: row.name,
    usableMs: timing(row.usable),
    queries: reads.length + listens.length,
    reads: reads.length,
    listeners: listens.length,
    callbacks: callbacks.length,
    documents: docs,
    authCallbacks,
    authRequests,
    totalPaths: Object.keys(pathCounts).length,
    duplicatePathsCount: duplicatePaths.length,
    duplicatePaths: duplicatePaths.slice(0, 10),
  };
}

async function measureProfile(browser, fixture, modeName) {
  console.log(`\n======================================================`);
  console.log(
    `[7D] Medindo perfil: ${fixture.name.toUpperCase()} (${modeName})`,
  );
  console.log(`======================================================\n`);

  const s = await session(browser, false);
  const p = s.page;

  try {
    await login(s, fixture);
    await p.locator('[data-drop-id="c1"]').waitFor({ state: "visible" });
    await s.quiet();

    // 1. Referência: Navegar CareersPage -> Career -> Season
    await p
      .locator('[data-drop-id="c1"]')
      .getByRole("button", { name: "Entrar", exact: true })
      .click();
    await p
      .getByText("Selecionar temporadas", { exact: true })
      .waitFor({ state: "visible" });
    await p.getByText("Temporada 1", { exact: true }).click();
    await p
      .getByRole("button", { name: "Entrar na Temporada" })
      .waitFor({ state: "visible" });

    // Medir referência: Career -> Season (uma única hidratação)
    const refRow = await capture(
      s,
      "Referência: Career → Season",
      () => p.getByRole("button", { name: "Entrar na Temporada" }).click(),
      () => nav(p, "Elenco").waitFor({ state: "visible" }),
      { profile: fixture.name, mode: "diagnostic-7d-ref" },
    );
    const refAnalysis = analyzeEvents(refRow);
    console.log(
      `[REF] Queries: ${refAnalysis.queries} (reads: ${refAnalysis.reads}, listeners: ${refAnalysis.listeners})`,
    );
    console.log(`[REF] Documentos: ${refAnalysis.documents}`);
    console.log(`[REF] Tempo utilizável: ${refAnalysis.usableMs} ms`);
    console.log(
      `[REF] Caminhos duplicados: ${refAnalysis.duplicatePathsCount}`,
    );

    // Preparar para abrir Player a partir de Season
    await nav(p, "Elenco").click();
    await p
      .locator(".swiper-slide-active")
      .getByText("Jogador 02", { exact: true })
      .click();
    await p.getByText("Visualizar", { exact: true }).click();
    await p
      .getByRole("button", { name: "Entrar na Visualização" })
      .waitFor({ state: "visible" });

    // 2. Alvo: Season -> Player
    const playerRow = await capture(
      s,
      "Alvo: Season → Player",
      () => p.getByRole("button", { name: "Entrar na Visualização" }).click(),
      () => nav(p, "Jogador").waitFor({ state: "visible" }),
      { profile: fixture.name, mode: "diagnostic-7d-player" },
    );
    const playerAnalysis = analyzeEvents(playerRow);
    console.log(
      `\n[PLAYER] Queries: ${playerAnalysis.queries} (reads: ${playerAnalysis.reads}, listeners: ${playerAnalysis.listeners})`,
    );
    console.log(`[PLAYER] Documentos: ${playerAnalysis.documents}`);
    console.log(`[PLAYER] Tempo utilizável: ${playerAnalysis.usableMs} ms`);
    console.log(
      `[PLAYER] Caminhos duplicados: ${playerAnalysis.duplicatePathsCount}`,
    );
    if (playerAnalysis.duplicatePaths.length > 0) {
      console.log(`[PLAYER] Exemplos de caminhos consultados 2x:`);
      for (const d of playerAnalysis.duplicatePaths.slice(0, 5)) {
        console.log(`   - (${d.count}x) ${d.path}`);
      }
    }

    return {
      reference: refAnalysis,
      player: playerAnalysis,
      factor: {
        queriesFactor: round(
          playerAnalysis.queries / (refAnalysis.queries || 1),
        ),
        docsFactor: round(
          playerAnalysis.documents / (refAnalysis.documents || 1),
        ),
      },
    };
  } finally {
    await s.context.close();
  }
}

async function run() {
  const browser = await launch();
  const allResults = {};

  try {
    // 1. Diagnóstico com fixtures atuais (pós-seed do emulator)
    console.log("\n>>> FASE 1: MEDIÇÃO DO ESTADO ATUAL (BASE SEED) <<<");
    const targetProfiles = fixtures.filter((f) =>
      ["small", "medium"].includes(f.name),
    );
    allResults.baseSeed = {};
    for (const f of targetProfiles) {
      allResults.baseSeed[f.name] = await measureProfile(
        browser,
        f,
        "BASE SEED",
      );
    }

    // 2. Executar migração 7B no emulator para caracterizar com _playerStatsVersion: 1
    console.log("\n>>> FASE 2: APLICANDO MIGRAÇÃO 7B NO EMULATOR <<<");
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

    // 3. Medição pós-7B
    console.log(
      "\n>>> FASE 3: MEDIÇÃO COM MIGRAÇÃO 7B ATIVA (_playerStatsVersion: 1) <<<",
    );
    allResults.post7B = {};
    for (const f of targetProfiles) {
      allResults.post7B[f.name] = await measureProfile(
        browser,
        f,
        "COM 7B ATIVO",
      );
    }

    mkdirSync(".test-tools/performance/stage-7d", { recursive: true });
    writeFileSync(
      ".test-tools/performance/stage-7d/results.json",
      JSON.stringify(allResults, null, 2),
    );
    console.log(
      "\n[7D] Diagnóstico concluído com sucesso! Resultados em .test-tools/performance/stage-7d/results.json",
    );
  } finally {
    await browser.close();
  }
}

await run();
