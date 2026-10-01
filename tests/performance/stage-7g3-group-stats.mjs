import { launch, session, login } from "./browser.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);
const nav = (page, text) =>
  page.locator("nav").getByText(text, { exact: true });

async function diagnoseGroupStatsRuntime() {
  console.log(
    "=================================================================",
  );
  console.log("[7G3] DIAGNÓSTICO EM RUNTIME — DUPLICAÇÃO DE GROUP STATS");
  console.log(
    "=================================================================\n",
  );

  const fixture = fixtures.find((f) => f.name === "small");
  if (!fixture) throw new Error("Fixture small not found");

  const browser = await launch();
  const s = await session(browser, false);
  const p = s.page;

  // Track all network requests to Firestore emulator
  const firestoreRequests = [];
  p.on("request", (req) => {
    const url = req.url();
    if (url.includes(":8089") || url.includes("firestore.googleapis.com")) {
      const postData = req.postData() || "";
      firestoreRequests.push({
        url,
        method: req.method(),
        postDataSnippet: postData.slice(0, 150),
        time: Date.now(),
      });
    }
  });

  const groupStatsCalls = [];
  p.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[PERF_GROUP_STATS] getAggregatedGroupStats called")) {
      groupStatsCalls.push({ time: Date.now(), text });
      console.log(`>>> [CALL DETECTED] ${text}`);
    }
  });

  try {
    // 1. Login
    console.log("1) Realizando login...");
    await login(s, fixture);
    await p.locator('[data-drop-id="c1"]').waitFor({ state: "visible" });
    await s.quiet();

    const targetUrl = `${s.origin}/Career/c2/Geral/Player/p1?fromGroup=true&groupId=g1`;
    console.log(`\n2) [ABERTURA INICIAL] Abrindo ${targetUrl}...`);

    const eventsIndexBeforeOpen = s.events.length;
    const callsBeforeOpen = groupStatsCalls.length;

    await p.goto(targetUrl);
    await nav(p, "Jogador").waitFor({ state: "visible" });
    await s.quiet();

    const openCalls = groupStatsCalls.length - callsBeforeOpen;
    const openReads = s.events
      .slice(eventsIndexBeforeOpen)
      .filter((e) => e.kind === "read-start");

    console.log(
      `   -> getAggregatedGroupStats chamadas na abertura: ${openCalls}`,
    );
    console.log(
      `   -> Firestore reads totais na abertura inicial: ${openReads.length}`,
    );

    // 3. Primeira tab consumidora: "Temporadas"
    console.log(
      "\n3) [PRIMEIRA TAB] Navegando para 'Temporadas' (SeasonsPlayerTab)...",
    );
    const eventsIndexBeforeTab1 = s.events.length;
    const callsBeforeTab1 = groupStatsCalls.length;

    await nav(p, "Temporadas").click();
    await p.waitForTimeout(600);
    await s.quiet();

    const tab1Calls = groupStatsCalls.length - callsBeforeTab1;
    const tab1Reads = s.events
      .slice(eventsIndexBeforeTab1)
      .filter((e) => e.kind === "read-start");

    console.log(
      `   -> getAggregatedGroupStats chamadas ao visitar 'Temporadas': ${tab1Calls}`,
    );
    console.log(
      `   -> Firestore reads adicionais ao visitar 'Temporadas': ${tab1Reads.length}`,
    );

    // 4. Segunda tab consumidora: "Estatísticas"
    console.log(
      "\n4) [SEGUNDA TAB] Navegando para 'Estatísticas' (PlayerDetailedStatsTab)...",
    );
    const eventsIndexBeforeTab2 = s.events.length;
    const callsBeforeTab2 = groupStatsCalls.length;

    await nav(p, "Estatísticas").click();
    await p.waitForTimeout(600);
    await s.quiet();

    const tab2Calls = groupStatsCalls.length - callsBeforeTab2;
    const tab2Reads = s.events
      .slice(eventsIndexBeforeTab2)
      .filter((e) => e.kind === "read-start");

    console.log(
      `   -> getAggregatedGroupStats chamadas adicionais ao visitar 'Estatísticas': ${tab2Calls}`,
    );
    console.log(
      `   -> Firestore reads adicionais ao visitar 'Estatísticas': ${tab2Reads.length}`,
    );

    // 5. Terceira tab consumidora: "Total"
    console.log(
      "\n5) [TERCEIRA TAB] Navegando para 'Total' (TotalPlayerTab)...",
    );
    const eventsIndexBeforeTab3 = s.events.length;
    const callsBeforeTab3 = groupStatsCalls.length;

    await nav(p, "Total").click();
    await p.waitForTimeout(600);
    await s.quiet();

    const tab3Calls = groupStatsCalls.length - callsBeforeTab3;
    const tab3Reads = s.events
      .slice(eventsIndexBeforeTab3)
      .filter((e) => e.kind === "read-start");

    console.log(
      `   -> getAggregatedGroupStats chamadas adicionais ao visitar 'Total': ${tab3Calls}`,
    );
    console.log(
      `   -> Firestore reads adicionais ao visitar 'Total': ${tab3Reads.length}`,
    );

    // 6. Revisitas: Temporadas -> Estatísticas -> Total
    console.log(
      "\n6) [REVISITAS] Revisitando 'Temporadas', 'Estatísticas' e 'Total'...",
    );
    const eventsIndexBeforeRevisits = s.events.length;
    const callsBeforeRevisits = groupStatsCalls.length;

    await nav(p, "Temporadas").click();
    await p.waitForTimeout(400);
    await s.quiet();

    await nav(p, "Estatísticas").click();
    await p.waitForTimeout(400);
    await s.quiet();

    await nav(p, "Total").click();
    await p.waitForTimeout(400);
    await s.quiet();

    const revisitCalls = groupStatsCalls.length - callsBeforeRevisits;
    const revisitReads = s.events
      .slice(eventsIndexBeforeRevisits)
      .filter((e) => e.kind === "read-start");

    console.log(
      `   -> getAggregatedGroupStats chamadas adicionais nas revisitas: ${revisitCalls}`,
    );
    console.log(
      `   -> Firestore reads adicionais nas revisitas: ${revisitReads.length}`,
    );

    // Salvar resultados
    const results = {
      timestamp: new Date().toISOString(),
      open: { calls: openCalls, reads: openReads.length },
      tab1Temporadas: { calls: tab1Calls, reads: tab1Reads.length },
      tab2Estatisticas: { calls: tab2Calls, reads: tab2Reads.length },
      tab3Total: { calls: tab3Calls, reads: tab3Reads.length },
      revisits: { calls: revisitCalls, reads: revisitReads.length },
      totalGroupStatsCalls: groupStatsCalls.length,
    };

    mkdirSync(".test-tools/performance/stage-7g", { recursive: true });
    writeFileSync(
      ".test-tools/performance/stage-7g/runtime-stage-7g3-group-stats.json",
      JSON.stringify(results, null, 2),
    );

    console.log("\n=======================================================");
    console.log("[7G3] RESULTADO RUNTIME COMPLETO:");
    console.log(
      `  ABERTURA:       ${openCalls} chamadas, ${openReads.length} reads`,
    );
    console.log(
      `  1ª (Temporadas): ${tab1Calls} chamadas, ${tab1Reads.length} reads`,
    );
    console.log(
      `  2ª (Estatíst.):  ${tab2Calls} chamadas, ${tab2Reads.length} reads`,
    );
    console.log(
      `  3ª (Total):      ${tab3Calls} chamadas, ${tab3Reads.length} reads`,
    );
    console.log(
      `  REVISITAS:      ${revisitCalls} chamadas, ${revisitReads.length} reads`,
    );
    console.log(`  TOTAL CHAMADAS: ${groupStatsCalls.length}`);
    console.log("=======================================================");
    console.log("[7G3] DIAGNÓSTICO EM RUNTIME CONCLUÍDO!");
    console.log("=======================================================");
  } finally {
    await browser.close();
  }
}

await diagnoseGroupStatsRuntime();
