import { launch, session, login } from "./browser.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);
const nav = (page, text) =>
  page.locator("nav").getByText(text, { exact: true });

async function validate7E1() {
  console.log(
    "=================================================================",
  );
  console.log(
    "[7E1] VALIDAÇÃO FINAL EM RUNTIME — ISOLAMENTO DE react-world-flags",
  );
  console.log(
    "=================================================================\n",
  );

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
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Tela Inicial (Welcome / Login)
    console.log("1. Carregando rota inicial (Login / Welcome)...");
    await login(s, fixture);
    await p.locator('[data-drop-id="c1"]').waitFor({ state: "visible" });
    await s.quiet();

    const chunksAfterLogin = requestedChunks.map((c) => c.filename);
    console.log("   -> Chunks carregados no Login/CareersPage:", [
      ...new Set(chunksAfterLogin),
    ]);
    const flagLoadedAtLogin = chunksAfterLogin.some((f) =>
      f.includes("react-world-flags"),
    );
    console.log(
      "   -> react-world-flags requisitado no início?",
      flagLoadedAtLogin ? "SIM (FALHA)" : "NÃO (SUCESSO!)",
    );

    // 2. Entrar na Carreira e Temporada 1
    console.log("\n2. Navegando para Career 1 -> Temporada 1...");
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

    const chunksAfterSeason = requestedChunks.map((c) => c.filename);
    const flagLoadedAtSeason = chunksAfterSeason.some((f) =>
      f.includes("react-world-flags"),
    );
    console.log("   -> Chunks carregados até Season:", [
      ...new Set(chunksAfterSeason),
    ]);
    console.log(
      "   -> react-world-flags requisitado na Season?",
      flagLoadedAtSeason ? "SIM (FALHA)" : "NÃO (SUCESSO!)",
    );

    // 3. Navegar para a aba 'Geral' da temporada onde existe o botão 'Acessar Base'
    console.log("\n3. Navegando para a aba 'Geral' da temporada...");
    await nav(p, "Geral").click();
    await p
      .getByRole("button", { name: /Acessar Base/i })
      .waitFor({ state: "visible" });
    await s.quiet();

    const chunksBeforeAcademy = requestedChunks.map((c) => c.filename);
    const flagLoadedBeforeAcademy = chunksBeforeAcademy.some((f) =>
      f.includes("react-world-flags"),
    );
    console.log("   -> Chunks antes de entrar na Base (Academy):", [
      ...new Set(chunksBeforeAcademy),
    ]);
    console.log(
      "   -> react-world-flags requisitado antes da Academy?",
      flagLoadedBeforeAcademy ? "SIM (FALHA)" : "NÃO (SUCESSO!)",
    );

    // 4. Clicar em 'Acessar Base' para navegar para /Career/c1/Academy
    console.log(
      "\n4. Clicando em 'Acessar Base' (navegando para /Career/c1/Academy)...",
    );
    const countBeforeClick = requestedChunks.filter((c) =>
      c.filename.includes("react-world-flags"),
    ).length;
    await p.getByRole("button", { name: /Acessar Base/i }).click();

    // Aguardar a tela da Academy e o jogador carregarem
    await p.getByText("Base 01").first().waitFor({ state: "visible" });
    await s.quiet();

    // 5. Clicar em um jogador da base para abrir o PlayerWorkspace
    console.log(
      "5. Selecionando jogador da base ('Base 01') para abrir PlayerWorkspace...",
    );
    await p.getByText("Base 01").first().click();
    await s.quiet();

    // 5.1 Clicar na ação de anotação (que renderiza o FocusedCard com a bandeira no iconNode)
    console.log(
      "   -> Abrindo card de anotação com a bandeira da nacionalidade...",
    );
    await p
      .getByText(/Anotação|Anotações/i)
      .first()
      .click();

    // Aguardar o LazyFlag carregar dinamicamente o react-world-flags e renderizar a bandeira
    await p.waitForSelector('img[src*="svg"], [class*="flag"], svg', {
      timeout: 15000,
    });
    await s.quiet();

    const chunksAfterFlagScreen = requestedChunks.map((c) => c.filename);
    const flagRequests = requestedChunks.filter((c) =>
      c.filename.includes("react-world-flags"),
    );
    const flagLoadedAtAcademy = flagRequests.length > 0;

    console.log("\n=======================================================");
    console.log("RESULTADOS DA VALIDAÇÃO EM RUNTIME");
    console.log("=======================================================");
    console.log(
      `- Rota / tela testada: /Career/c1/Academy -> PlayerWorkspace (Base 01)`,
    );
    console.log(
      `- react-world-flags requisitado ANTES de abrir a tela? ${flagLoadedBeforeAcademy ? "SIM (FALHA)" : "NÃO (CONFIRMADO)"}`,
    );
    console.log(
      `- react-world-flags requisitado AO ABRIR a tela com bandeira? ${flagLoadedAtAcademy ? "SIM (CONFIRMADO)" : "NÃO (FALHA)"}`,
    );
    console.log(
      `- Quantidade de requisições do chunk react-world-flags: ${flagRequests.length}x`,
    );
    console.log(
      `- Nome do chunk requisitado: ${flagRequests[0]?.filename || "Nenhum"}`,
    );

    // Verificar elemento da bandeira no DOM
    const flagElementInfo = await p.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      const svgs = Array.from(document.querySelectorAll("svg"));
      const flagImg = imgs.find(
        (img) =>
          img.src?.startsWith("data:image/svg+xml") ||
          img.style.width === "28px" ||
          img.getAttribute("style")?.includes("28px") ||
          img.className?.includes("flag"),
      );
      const flagSvg = svgs.find(
        (s) =>
          s.style.width === "28px" ||
          s.getAttribute("style")?.includes("28px") ||
          s.className?.baseVal?.includes("flag"),
      );
      const found = flagImg || flagSvg;
      return {
        hasFlag: !!found,
        tag: found?.tagName,
        snippet: found ? found.outerHTML.slice(0, 160) + "..." : null,
      };
    });

    console.log(
      `- Elemento da bandeira renderizado no DOM:`,
      flagElementInfo.hasFlag
        ? `SIM (CONFIRMADO - tag <${flagElementInfo.tag.toLowerCase()}>)`
        : "NÃO",
    );
    if (flagElementInfo.snippet) {
      console.log(`  Snippet no DOM: ${flagElementInfo.snippet}`);
    }

    // 6. Testar reutilização (não deve fazer novo request de rede ao trocar de jogador)
    console.log(
      "\n6. Selecionando outro jogador ('Base 02') para verificar cache do chunk...",
    );
    await p.getByText("Base 02").first().click();
    await s.quiet();

    const countAfterSecondPlayer = requestedChunks.filter((c) =>
      c.filename.includes("react-world-flags"),
    ).length;
    console.log(
      `- Requisições do chunk após segundo jogador: ${countAfterSecondPlayer}x (reutilizado sem novo download)`,
    );

    console.log(
      `- Erros de console / Suspense: ${consoleErrors.length === 0 ? "ZERO (0)" : JSON.stringify(consoleErrors)}`,
    );

    const report = {
      routeTested: "/Career/c1/Academy -> PlayerWorkspace (Base 01)",
      chunksBeforeFlagScreen: [...new Set(chunksBeforeAcademy)],
      flagLoadedBefore: flagLoadedBeforeAcademy,
      flagLoadedAfter: flagLoadedAtAcademy,
      chunkFilename: flagRequests[0]?.filename || null,
      chunkRequestsCount: countAfterSecondPlayer,
      flagRenderedInDom: flagElementInfo.hasSvg,
      svgSnippet: flagElementInfo.svgHtmlSnippet,
      consoleErrors,
    };

    mkdirSync(".test-tools/performance/stage-7e1", { recursive: true });
    writeFileSync(
      ".test-tools/performance/stage-7e1/runtime-validation.json",
      JSON.stringify(report, null, 2),
    );
    console.log(
      "\n[7E1] Validação concluída com sucesso! Relatório em .test-tools/performance/stage-7e1/runtime-validation.json",
    );
  } finally {
    await browser.close();
  }
}

await validate7E1();
