import { launch, session, login } from "./browser.mjs";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);
const nav = (page, text) =>
  page.locator("nav").getByText(text, { exact: true });

// Identificar dinamicamente os nomes dos chunks gerados no build de navegação
function identifyChunks() {
  const dir = resolve(".test-tools/performance/navigation/assets");
  const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
  const mapping = {};

  for (const file of files) {
    const content = readFileSync(resolve(dir, file), "utf8");
    if (file.startsWith("react-world-flags")) {
      mapping.flags = file;
    } else if (content.includes("Acesso Restrito")) {
      mapping.entry = file;
    } else if (content.includes("matchesId")) {
      mapping.match = file;
    } else if (content.includes("AcademyContent")) {
      mapping.academy = file;
    } else if (content.includes("Tutorial")) {
      mapping.tutorial = file;
    } else if (content.includes("compareMode")) {
      mapping.compare = file;
    } else if (
      content.includes("GroupCareer") ||
      content.includes("groupCareer")
    ) {
      mapping.group = file;
    }
  }

  return mapping;
}

async function validate7E2() {
  console.log(
    "=================================================================",
  );
  console.log(
    "[7E2] VALIDAÇÃO EM RUNTIME — CODE SPLITTING DE ROTAS SECUNDÁRIAS",
  );
  console.log(
    "=================================================================\n",
  );

  const chunkMap = identifyChunks();
  console.log("Mapeamento de Chunks Identificados:");
  console.log("  - Entry:", chunkMap.entry);
  console.log("  - Match:", chunkMap.match);
  console.log("  - Academy:", chunkMap.academy);
  console.log("  - Tutorial:", chunkMap.tutorial);
  console.log("  - ComparePlayers:", chunkMap.compare);
  console.log("  - GroupCareerPage:", chunkMap.group);
  console.log("  - Flags (7E1):", chunkMap.flags);
  console.log("");

  const fixture = fixtures.find((f) => f.name === "small");
  if (!fixture) throw new Error("Fixture small not found");

  const browser = await launch();
  const s = await session(browser, false);
  const p = s.page;

  const requestedChunks = [];
  const consoleErrors = [];

  p.on("request", (req) => {
    const url = req.url();
    if (url.includes(".js")) {
      const filename = url.split("/").pop().split("?")[0];
      requestedChunks.push({ url, filename, time: Date.now() });
    }
  });

  p.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignorar bloqueio de stylesheet externo pelo CSP do servidor offline de teste
      if (
        !text.includes(
          "violates the following Content Security Policy directive",
        )
      ) {
        consoleErrors.push(text);
      }
    }
  });

  try {
    // -----------------------------------------------------------------
    // A) Welcome: chunks de Match/Academy/Tutorial/Compare/Group NÃO carregam
    // -----------------------------------------------------------------
    console.log("A) Carregando tela inicial (Welcome)...");
    await p.goto(s.origin);
    await p.locator(".swiper-slide").first().waitFor({ state: "visible" });

    const chunksWelcome = [...new Set(requestedChunks.map((c) => c.filename))];
    console.log("   -> Chunks requisitados no Welcome:", chunksWelcome);

    const secondaryLoadedAtWelcome = [
      chunkMap.match,
      chunkMap.academy,
      chunkMap.tutorial,
      chunkMap.compare,
      chunkMap.group,
    ].filter((chunk) => chunksWelcome.includes(chunk));

    const checkWelcome = secondaryLoadedAtWelcome.length === 0;
    console.log(
      `   -> Chunks secundários ausentes no Welcome? ${checkWelcome ? "SIM (PASSOU)" : "NÃO (FALHA: " + secondaryLoadedAtWelcome.join(", ") + ")"}`,
    );

    // -----------------------------------------------------------------
    // B) CareersPage: continuam não carregados
    // -----------------------------------------------------------------
    console.log("\nB) Efetuando login e navegando para CareersPage...");
    await login(s, fixture);
    await p.locator('[data-drop-id="c1"]').waitFor({ state: "visible" });
    await s.quiet();

    const chunksCareersPage = [
      ...new Set(requestedChunks.map((c) => c.filename)),
    ];
    console.log(
      "   -> Chunks requisitados após CareersPage:",
      chunksCareersPage,
    );

    const secondaryLoadedAtCareers = [
      chunkMap.match,
      chunkMap.academy,
      chunkMap.tutorial,
      chunkMap.compare,
      chunkMap.group,
    ].filter((chunk) => chunksCareersPage.includes(chunk));

    const checkCareers = secondaryLoadedAtCareers.length === 0;
    console.log(
      `   -> Chunks secundários ausentes na CareersPage? ${checkCareers ? "SIM (PASSOU)" : "NÃO (FALHA: " + secondaryLoadedAtCareers.join(", ") + ")"}`,
    );

    // -----------------------------------------------------------------
    // Navegar até a Season 1
    // -----------------------------------------------------------------
    console.log("\nNavegando para Career 1 -> Temporada 1...");
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

    // -----------------------------------------------------------------
    // C.1) Match: carregar sob demanda
    // -----------------------------------------------------------------
    console.log("\nC.1) Navegando para a aba 'Partidas' da temporada...");
    await nav(p, "Partidas").click();
    await s.quiet();

    // Clicar em "Resultados" para ver partidas finalizadas
    await p.getByRole("button", { name: "Resultados" }).click();
    await p.getByText("Rival").first().waitFor({ state: "visible" });
    await s.quiet();

    const chunksBeforeMatch = requestedChunks.filter(
      (c) => c.filename === chunkMap.match,
    ).length;
    console.log(
      `   -> Requisitou chunk Match antes de clicar no jogo? ${chunksBeforeMatch > 0 ? "SIM (FALHA)" : "NÃO (CONFIRMADO)"}`,
    );

    console.log("   -> Clicando na primeira partida para abrir /Match/s1m1...");
    await p.getByText("Rival").first().click();
    await s.quiet();

    const matchRequests = requestedChunks.filter(
      (c) => c.filename === chunkMap.match,
    );
    console.log(
      `   -> Requisições do chunk Match ao abrir partida: ${matchRequests.length}x`,
    );
    const checkMatchLoaded = matchRequests.length === 1;

    // -----------------------------------------------------------------
    // D.1) Voltar e entrar novamente em Match: reuso sem nova transferência
    // -----------------------------------------------------------------
    console.log(
      "\nD.1) Voltando para Season e reentrando na Partida (teste de cache)...",
    );
    await p.goBack();
    await p
      .getByRole("button", { name: "Resultados" })
      .waitFor({ state: "visible" });
    await p.getByRole("button", { name: "Resultados" }).click();
    await p.getByText("Rival").first().waitFor({ state: "visible" });
    await s.quiet();

    await p.getByText("Rival").first().click();
    await s.quiet();

    const matchRequestsAfterReentry = requestedChunks.filter(
      (c) => c.filename === chunkMap.match,
    ).length;
    console.log(
      `   -> Total de requisições de rede para chunk Match após reentrada: ${matchRequestsAfterReentry}x`,
    );
    const checkMatchCached = matchRequestsAfterReentry === 1;

    // -----------------------------------------------------------------
    // C.2) Academy: carregar sob demanda
    // -----------------------------------------------------------------
    console.log(
      "\nC.2) Voltando para Season e navegando para a aba 'Geral'...",
    );
    await p.goBack();
    await nav(p, "Geral").waitFor({ state: "visible" });
    await nav(p, "Geral").click();
    await p
      .getByRole("button", { name: /Acessar Base/i })
      .waitFor({ state: "visible" });
    await s.quiet();

    const chunksBeforeAcademy = requestedChunks.filter(
      (c) => c.filename === chunkMap.academy,
    ).length;
    console.log(
      `   -> Requisitou chunk Academy antes de clicar no botão? ${chunksBeforeAcademy > 0 ? "SIM (FALHA)" : "NÃO (CONFIRMADO)"}`,
    );

    console.log(
      "   -> Clicando em 'Acessar Base' para abrir /Career/c1/Academy...",
    );
    await p.getByRole("button", { name: /Acessar Base/i }).click();
    await p.getByText("Base 01").first().waitFor({ state: "visible" });
    await s.quiet();

    const academyRequests = requestedChunks.filter(
      (c) => c.filename === chunkMap.academy,
    );
    console.log(
      `   -> Requisições do chunk Academy ao abrir: ${academyRequests.length}x`,
    );
    const checkAcademyLoaded = academyRequests.length === 1;

    // -----------------------------------------------------------------
    // D.2) Voltar e entrar novamente em Academy: reuso sem nova transferência
    // -----------------------------------------------------------------
    console.log(
      "\nD.2) Voltando para Season e reentrando na Academy (teste de cache)...",
    );
    await p.goBack();
    await p
      .getByRole("button", { name: /Acessar Base/i })
      .waitFor({ state: "visible" });
    await s.quiet();

    await p.getByRole("button", { name: /Acessar Base/i }).click();
    await p.getByText("Base 01").first().waitFor({ state: "visible" });
    await s.quiet();

    const academyRequestsAfterReentry = requestedChunks.filter(
      (c) => c.filename === chunkMap.academy,
    ).length;
    console.log(
      `   -> Total de requisições de rede para chunk Academy após reentrada: ${academyRequestsAfterReentry}x`,
    );
    const checkAcademyCached = academyRequestsAfterReentry === 1;

    // -----------------------------------------------------------------
    // Resumo e Verificação de Erros
    // -----------------------------------------------------------------
    console.log("\n=======================================================");
    console.log("RESULTADOS DA VALIDAÇÃO EM RUNTIME STAGE 7E2");
    console.log("=======================================================");
    console.log(
      `1. Chunks secundários no Welcome: ${checkWelcome ? "ZERO (PASSOU)" : "FALHA"}`,
    );
    console.log(
      `2. Chunks secundários na CareersPage: ${checkCareers ? "ZERO (PASSOU)" : "FALHA"}`,
    );
    console.log(
      `3. Chunk Match carregado sob demanda: ${checkMatchLoaded ? "SIM (1x - PASSOU)" : "FALHA"}`,
    );
    console.log(
      `4. Reentrada em Match (cache): ${checkMatchCached ? "REUTILIZADO (1 transferência total - PASSOU)" : "FALHA"}`,
    );
    console.log(
      `5. Chunk Academy carregado sob demanda: ${checkAcademyLoaded ? "SIM (1x - PASSOU)" : "FALHA"}`,
    );
    console.log(
      `6. Reentrada em Academy (cache): ${checkAcademyCached ? "REUTILIZADO (1 transferência total - PASSOU)" : "FALHA"}`,
    );
    console.log(
      `7. Erros de console / Suspense: ${consoleErrors.length === 0 ? "ZERO (0 - PASSOU)" : JSON.stringify(consoleErrors)}`,
    );

    const passedAll =
      checkWelcome &&
      checkCareers &&
      checkMatchLoaded &&
      checkMatchCached &&
      checkAcademyLoaded &&
      checkAcademyCached &&
      consoleErrors.length === 0;

    const report = {
      timestamp: new Date().toISOString(),
      chunkMap,
      welcome: {
        requestedChunks: chunksWelcome,
        secondaryLoaded: secondaryLoadedAtWelcome,
        passed: checkWelcome,
      },
      careersPage: {
        requestedChunks: chunksCareersPage,
        secondaryLoaded: secondaryLoadedAtCareers,
        passed: checkCareers,
      },
      match: {
        chunkName: chunkMap.match,
        loadedBefore: chunksBeforeMatch > 0,
        requestsCountInitial: matchRequests.length,
        requestsCountAfterReentry: matchRequestsAfterReentry,
        passed: checkMatchLoaded && checkMatchCached,
      },
      academy: {
        chunkName: chunkMap.academy,
        loadedBefore: chunksBeforeAcademy > 0,
        requestsCountInitial: academyRequests.length,
        requestsCountAfterReentry: academyRequestsAfterReentry,
        passed: checkAcademyLoaded && checkAcademyCached,
      },
      consoleErrors,
      passedAll,
    };

    mkdirSync(".test-tools/performance/stage-7e2", { recursive: true });
    writeFileSync(
      ".test-tools/performance/stage-7e2/runtime-validation.json",
      JSON.stringify(report, null, 2),
    );

    if (!passedAll) {
      throw new Error(
        "Validação de runtime 7E2 falhou em um ou mais critérios",
      );
    }

    console.log("\n[7E2] TODAS AS ETAPAS DE RUNTIME APROVADAS!");
  } finally {
    await browser.close();
  }
}

await validate7E2();
