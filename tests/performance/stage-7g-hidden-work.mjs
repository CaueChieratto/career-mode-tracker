import { launch, session, login } from "./browser.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);
const nav = (page, text) =>
  page.locator("nav").getByText(text, { exact: true });

async function measureHiddenWorkRuntime() {
  console.log(
    "=================================================================",
  );
  console.log(
    "[7G] DIAGNÓSTICO EM RUNTIME — HIDDEN TABS / TIMERS / BACKGROUND",
  );
  console.log(
    "=================================================================\n",
  );

  const fixture = fixtures.find((f) => f.name === "small");
  if (!fixture) throw new Error("Fixture small not found");

  const browser = await launch();
  const s = await session(browser, false);
  const p = s.page;

  // Track Firestore network requests
  const firestoreRequests = [];
  p.on("request", (req) => {
    const url = req.url();
    if (url.includes(":8089") || url.includes("firestore.googleapis.com")) {
      firestoreRequests.push({
        url,
        method: req.method(),
        postData: req.postData(),
        time: Date.now(),
      });
    }
  });

  // Track timers in window
  await p.addInitScript(() => {
    window.__activeTimers = new Map();
    window.__timerCounter = 0;
    window.__activeIntervals = new Map();

    const origSetTimeout = window.setTimeout;
    const origClearTimeout = window.clearTimeout;
    const origSetInterval = window.setInterval;
    const origClearInterval = window.clearInterval;

    window.setTimeout = function (fn, delay, ...args) {
      const id = origSetTimeout.apply(this, [fn, delay, ...args]);
      const record = { id, delay, stack: new Error().stack };
      window.__activeTimers.set(id, record);
      return id;
    };

    window.clearTimeout = function (id) {
      window.__activeTimers.delete(id);
      return origClearTimeout.apply(this, arguments);
    };

    window.setInterval = function (fn, delay, ...args) {
      const id = origSetInterval.apply(this, [fn, delay, ...args]);
      window.__activeIntervals.set(id, { id, delay, stack: new Error().stack });
      return id;
    };

    window.clearInterval = function (id) {
      window.__activeIntervals.delete(id);
      return origClearInterval.apply(this, arguments);
    };
  });

  try {
    // -------------------------------------------------------------
    // 1. Login e navegação para CareersPage
    // -------------------------------------------------------------
    console.log("1) Realizando login e acessando CareersPage...");
    await login(s, fixture);
    await p.locator('[data-drop-id="c1"]').waitFor({ state: "visible" });
    await s.quiet();

    const careersTimers = await p.evaluate(() => ({
      activeTimeouts: window.__activeTimers?.size || 0,
      activeIntervals: window.__activeIntervals?.size || 0,
    }));
    console.log(
      `   -> Timers ativos na CareersPage: ${careersTimers.activeTimeouts} timeouts, ${careersTimers.activeIntervals} intervals`,
    );

    // -------------------------------------------------------------
    // 2. Entrar na Season 1 (Aba ativa inicial: "Elenco")
    // -------------------------------------------------------------
    console.log("\n2) Entrando na Season 1 (Aba ativa inicial: 'Elenco')...");
    const beforeSeasonRequestsCount = firestoreRequests.length;

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
    await p.getByRole("button", { name: "Entrar na Temporada" }).click();
    await nav(p, "Elenco").waitFor({ state: "visible" });
    await s.quiet();

    // Check which Swiper slides / tabs are mounted in the DOM
    const seasonTabsMounted = await p.evaluate(() => {
      const slides = document.querySelectorAll(".swiper-slide");
      const tabsInfo = [];
      slides.forEach((slide, idx) => {
        const text = slide.innerText.trim().slice(0, 80).replace(/\n/g, " ");
        const hasInputs = slide.querySelectorAll(
          "input, button, select, table",
        ).length;
        const container = slide.querySelector("div");
        const hasMountedComponent = container
          ? container.children.length > 0
          : false;
        tabsInfo.push({
          slideIndex: idx,
          childCount: slide.children.length,
          hasInputs,
          hasMountedComponent,
          sampleText: text,
        });
      });
      return {
        totalSlidesMounted: slides.length,
        tabsInfo,
      };
    });

    console.log(
      `   -> Slides Swiper montados no DOM: ${seasonTabsMounted.totalSlidesMounted}`,
    );
    seasonTabsMounted.tabsInfo.forEach((tab) => {
      console.log(
        `      [Slide ${tab.slideIndex}] montado: ${tab.hasMountedComponent} | elementos: ${tab.hasInputs} | texto: "${tab.sampleText.slice(0, 40)}..."`,
      );
    });

    // Check Firestore requests made while opening Season
    const seasonRequests = firestoreRequests.slice(beforeSeasonRequestsCount);
    console.log(
      `   -> Total de requisições Firestore disparadas ao abrir Season: ${seasonRequests.length}`,
    );
    const tableQueries = seasonRequests.filter(
      (r) =>
        r.url.includes("/table") ||
        (r.postData && r.postData.includes("table")),
    );
    console.log(
      `   -> Destas, requisições para '/table' (aba 'Classificação' oculta): ${tableQueries.length}`,
    );

    const seasonTimers = await p.evaluate(() => ({
      activeTimeouts: window.__activeTimers?.size || 0,
      activeIntervals: window.__activeIntervals?.size || 0,
    }));
    console.log(
      `   -> Timers ativos na Season: ${seasonTimers.activeTimeouts} timeouts, ${seasonTimers.activeIntervals} intervals`,
    );

    // -------------------------------------------------------------
    // 3. Mudar de aba: "Elenco" -> "Partidas"
    // -------------------------------------------------------------
    console.log("\n3) Mudando para a aba 'Partidas'...");
    const beforeMatchesReqCount = firestoreRequests.length;
    await nav(p, "Partidas").click();
    await p.waitForTimeout(300);
    await s.quiet();

    const matchesReqs = firestoreRequests.slice(beforeMatchesReqCount);
    console.log(
      `   -> Novas requisições Firestore ao mudar para 'Partidas': ${matchesReqs.length}`,
    );

    // -------------------------------------------------------------
    // 4. Mudar de aba: "Partidas" -> "Classificação"
    // -------------------------------------------------------------
    console.log("\n4) Mudando para a aba 'Classificação'...");
    const beforeTableReqCount = firestoreRequests.length;
    await nav(p, "Classificação").click();
    await p.waitForTimeout(300);
    await s.quiet();

    const tableTabReqs = firestoreRequests.slice(beforeTableReqCount);
    const tableQueriesOnEnter = tableTabReqs.filter(
      (r) =>
        r.url.includes("/table") ||
        (r.postData && r.postData.includes("table")),
    );
    console.log(
      `   -> Requisições para '/table' ao entrar na 'Classificação': ${tableQueriesOnEnter.length} (total novas requisições: ${tableTabReqs.length})`,
    );

    // -------------------------------------------------------------
    // 5. Mudar de aba: "Classificação" -> "Estatísticas"
    // -------------------------------------------------------------
    console.log("\n5) Mudando para a aba 'Estatísticas'...");
    const beforeStatsReqCount = firestoreRequests.length;
    await nav(p, "Estatísticas").click();
    await p.waitForTimeout(300);
    await s.quiet();

    const statsReqs = firestoreRequests.slice(beforeStatsReqCount);
    console.log(
      `   -> Novas requisições Firestore ao entrar em 'Estatísticas': ${statsReqs.length}`,
    );

    // -------------------------------------------------------------
    // 6. Testar página Player (SectionView com isPlayer)
    // -------------------------------------------------------------
    console.log("\n6) Acessando página de um Jogador...");
    await nav(p, "Elenco").click();
    await p.waitForTimeout(300);

    const beforePlayerReqCount = firestoreRequests.length;
    // Clica no primeiro jogador da lista
    const firstPlayer = p
      .locator("section")
      .filter({ hasText: "Jogador" })
      .first();
    await firstPlayer.waitFor({ state: "visible" });
    await firstPlayer.click();

    // Modal do jogador abre -> clica em Visualizar
    await p.getByText("Visualizar").waitFor({ state: "visible" });
    await p.getByText("Visualizar").click();
    await p.getByRole("button", { name: /Entrar na Visualização/i }).click();

    await nav(p, "Jogador").waitFor({ state: "visible" });
    await s.quiet();

    const playerTabsMounted = await p.evaluate(() => {
      const slides = document.querySelectorAll(".swiper-slide");
      const tabsInfo = [];
      slides.forEach((slide, idx) => {
        const container = slide.querySelector("div");
        const hasMountedComponent = container
          ? container.children.length > 0
          : false;
        tabsInfo.push({
          slideIndex: idx,
          childCount: slide.children.length,
          hasMountedComponent,
          sampleText: slide.innerText.trim().slice(0, 50).replace(/\n/g, " "),
        });
      });
      return {
        totalSlides: slides.length,
        tabsInfo,
      };
    });

    console.log(
      `   -> Total de abas de Jogador montadas no DOM: ${playerTabsMounted.totalSlides}`,
    );
    playerTabsMounted.tabsInfo.forEach((t) => {
      console.log(
        `      [Slide ${t.slideIndex}] montado: ${t.hasMountedComponent} | texto: "${t.sampleText.slice(0, 35)}..."`,
      );
    });

    const playerReqs = firestoreRequests.slice(beforePlayerReqCount);
    console.log(
      `   -> Novas requisições Firestore ao abrir Player: ${playerReqs.length}`,
    );

    // Check timers
    const playerTimers = await p.evaluate(() => ({
      activeTimeouts: window.__activeTimers?.size || 0,
      activeIntervals: window.__activeIntervals?.size || 0,
    }));
    console.log(
      `   -> Timers ativos na tela de Player: ${playerTimers.activeTimeouts} timeouts, ${playerTimers.activeIntervals} intervals`,
    );

    // -------------------------------------------------------------
    // 7. Testar página Match (Lazy Mount das abas de Partida)
    // -------------------------------------------------------------
    console.log("\n7) Acessando página Match a partir de 'Partidas'...");
    // Voltar da visualização do jogador
    await p.getByRole("button", { name: "Voltar" }).click();
    await nav(p, "Elenco").waitFor({ state: "visible" });
    await nav(p, "Partidas").click();
    await p.waitForTimeout(300);

    // Clica no filtro "Resultados" para exibir partidas finalizadas
    await p.getByRole("button", { name: "Resultados" }).click();
    await p.waitForTimeout(300);

    // Clica no card da primeira partida pelo nome do time adversário "Rival"
    const firstMatch = p.getByText("Rival").first();
    await firstMatch.waitFor({ state: "visible" });
    await firstMatch.click();

    await nav(p, "Resultado").waitFor({ state: "visible" });
    await s.quiet();

    const matchInitialTabs = await p.evaluate(() => {
      const slides = document.querySelectorAll(".swiper-slide");
      const tabsInfo = [];
      slides.forEach((slide, idx) => {
        const container = slide.querySelector("div");
        const hasMountedComponent = container
          ? container.children.length > 0
          : false;
        tabsInfo.push({
          slideIndex: idx,
          hasMountedComponent,
          sampleText: slide.innerText.trim().slice(0, 40).replace(/\n/g, " "),
        });
      });
      return {
        totalSlides: slides.length,
        tabsInfo,
      };
    });

    console.log(
      `   -> Abas de Match no primeiro carregamento (Aba ativa: Resultado):`,
    );
    matchInitialTabs.tabsInfo.forEach((t) => {
      console.log(
        `      [Slide ${t.slideIndex}] montado: ${t.hasMountedComponent} | texto: "${t.sampleText}"`,
      );
    });

    // Navegar para "Formações"
    console.log("   -> Navegando para a aba 'Formações'...");
    await nav(p, "Formações").click();
    await p.waitForTimeout(300);

    const matchAfterNavTabs = await p.evaluate(() => {
      const slides = document.querySelectorAll(".swiper-slide");
      const tabsInfo = [];
      slides.forEach((slide, idx) => {
        const container = slide.querySelector("div");
        const hasMountedComponent = container
          ? container.children.length > 0
          : false;
        tabsInfo.push({
          slideIndex: idx,
          hasMountedComponent,
          sampleText: slide.innerText.trim().slice(0, 40).replace(/\n/g, " "),
        });
      });
      return {
        totalSlides: slides.length,
        tabsInfo,
      };
    });

    console.log(`   -> Abas de Match após navegar para 'Formações':`);
    matchAfterNavTabs.tabsInfo.forEach((t) => {
      console.log(
        `      [Slide ${t.slideIndex}] montado: ${t.hasMountedComponent} | texto: "${t.sampleText}"`,
      );
    });

    // Salvar resultados
    const results = {
      timestamp: new Date().toISOString(),
      careersTimers,
      seasonTabsMounted,
      seasonRequestsCount: seasonRequests.length,
      tableQueriesCount: tableQueries.length,
      matchesReqsCount: matchesReqs.length,
      tableTabReqsCount: tableTabReqs.length,
      statsReqsCount: statsReqs.length,
      playerTabsMounted,
      playerReqsCount: playerReqs.length,
      playerTimers,
      matchInitialTabs,
      matchAfterNavTabs,
    };

    mkdirSync(".test-tools/performance/stage-7g", { recursive: true });
    writeFileSync(
      ".test-tools/performance/stage-7g/runtime-hidden-work.json",
      JSON.stringify(results, null, 2),
    );

    console.log("\n=======================================================");
    console.log("[7G] DIAGNÓSTICO EM RUNTIME CONCLUÍDO!");
    console.log(
      "Resultados gravados em .test-tools/performance/stage-7g/runtime-hidden-work.json",
    );
    console.log("=======================================================");
  } finally {
    await browser.close();
  }
}

await measureHiddenWorkRuntime();
