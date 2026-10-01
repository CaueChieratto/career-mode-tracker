import { launch, session, login } from "./browser.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);
const nav = (page, text) =>
  page.locator("nav").getByText(text, { exact: true });

async function measureAssetsRuntime() {
  console.log("=================================================================");
  console.log("[7F] DIAGNÓSTICO EM RUNTIME — ASSETS ESTÁTICOS E TRANSFERÊNCIA");
  console.log("=================================================================\n");

  const fixture = fixtures.find((f) => f.name === "small");
  if (!fixture) throw new Error("Fixture small not found");

  const browser = await launch();
  const s = await session(browser, false);
  const p = s.page;

  const imageRequests = [];

  p.on("request", (req) => {
    const url = req.url();
    const type = req.resourceType();

    if (
      type === "image" ||
      /\.(png|jpg|jpeg|svg|webp|gif|ico)(\?.*)?$/i.test(url)
    ) {
      imageRequests.push({
        url,
        resourceType: type,
        filename: url.split("/").pop().split("?")[0],
        time: Date.now(),
      });
    }
  });

  const responseData = new Map();
  p.on("response", async (res) => {
    const url = res.url();
    try {
      const headers = res.headers();
      const contentLength = headers["content-length"]
        ? parseInt(headers["content-length"], 10)
        : null;
      const status = res.status();
      const fromServiceWorker = res.fromServiceWorker();
      responseData.set(url, {
        status,
        contentLength,
        fromServiceWorker,
      });
    } catch {}
  });

  try {
    // -----------------------------------------------------------------
    // A.1) Welcome screen
    // -----------------------------------------------------------------
    console.log("A.1) Acessando rota inicial (Welcome)...");
    await p.goto(s.origin);
    await p.locator(".swiper-slide").first().waitFor({ state: "visible" });
    await s.quiet();

    const welcomeImages = [...imageRequests];
    console.log(
      `   -> Total de requisições de imagem no Welcome: ${welcomeImages.length}`,
    );
    welcomeImages.forEach((img) => {
      const resp = responseData.get(img.url);
      console.log(
        `      - ${img.filename}: ${resp?.contentLength ? (resp.contentLength / 1024).toFixed(1) + " kB" : "desconhecido"} [status: ${resp?.status}]`,
      );
    });

    // -----------------------------------------------------------------
    // A.2) CareersPage (após login)
    // -----------------------------------------------------------------
    console.log("\nA.2) Efetuando login e acessando CareersPage...");
    const beforeLoginImgCount = imageRequests.length;
    await login(s, fixture);
    await p.locator('[data-drop-id="c1"]').waitFor({ state: "visible" });
    await s.quiet();

    const careersImages = imageRequests.slice(beforeLoginImgCount);
    console.log(
      `   -> Novas requisições de imagem na CareersPage: ${careersImages.length}`,
    );
    careersImages.forEach((img) => {
      const resp = responseData.get(img.url);
      console.log(
        `      - ${img.filename}: ${resp?.contentLength ? (resp.contentLength / 1024).toFixed(1) + " kB" : "desconhecido"} [status: ${resp?.status}]`,
      );
    });

    // -----------------------------------------------------------------
    // B.1) Tela/Modal com Troféus (Clicando no botão "Títulos" do CareerCard)
    // -----------------------------------------------------------------
    console.log("\nB.1) Abrindo modal de Títulos da Carreira 1 (TrophiesPanel)...");
    const beforeTrophiesCount = imageRequests.length;
    await p
      .locator('[data-drop-id="c1"]')
      .getByRole("button", { name: "Títulos", exact: true })
      .click();
    await p.getByText("Campeão da").first().waitFor({ state: "visible" });
    await s.quiet();

    const trophiesImages = imageRequests.slice(beforeTrophiesCount);
    console.log(
      `   -> Requisições de imagem disparadas pelo modal de Títulos: ${trophiesImages.length}`,
    );
    let totalTrophyBytes = 0;
    trophiesImages.forEach((img) => {
      const resp = responseData.get(img.url);
      const bytes = resp?.contentLength || 0;
      totalTrophyBytes += bytes;
      console.log(
        `      - ${img.filename}: ${(bytes / 1024).toFixed(1)} kB [status: ${resp?.status}]`,
      );
    });
    console.log(
      `   -> Total transferido para renderizar os troféus da Carreira 1: ${(totalTrophyBytes / 1024).toFixed(1)} kB (${(totalTrophyBytes / 1024 / 1024).toFixed(2)} MB)`,
    );

    // -----------------------------------------------------------------
    // B.2) Fechar modal e reabrir (verificar cache)
    // -----------------------------------------------------------------
    console.log("\nB.2) Fechando e reabrindo o modal de Títulos para checar cache...");
    // Clica no topo da tela (y: 50) fora do card modal (altura 575px em viewport de 844px)
    await p.mouse.click(200, 50);
    await p.locator('[class*="slide_up_overlay"]').waitFor({ state: "hidden" });
    await p.waitForTimeout(300);

    const beforeReopenCount = imageRequests.length;
    await p
      .locator('[data-drop-id="c1"]')
      .getByRole("button", { name: "Títulos", exact: true })
      .click();
    await p.getByText("Campeão da").first().waitFor({ state: "visible" });
    await s.quiet();

    const reopenImages = imageRequests.slice(beforeReopenCount);
    console.log(
      `   -> Novas requisições de rede ao reabrir modal: ${reopenImages.length}x (cache preveniu novo download: ${reopenImages.length === 0 ? "SIM" : "NÃO"})`,
    );

    // Fechar modal novamente
    await p.mouse.click(200, 50);
    await p.locator('[class*="slide_up_overlay"]').waitFor({ state: "hidden" });
    await p.waitForTimeout(300);

    // -----------------------------------------------------------------
    // C) Navegar até a Season 1
    // -----------------------------------------------------------------
    console.log("\nC) Entrando na Season 1...");
    const beforeSeasonCount = imageRequests.length;
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

    const seasonImages = imageRequests.slice(beforeSeasonCount);
    console.log(
      `   -> Novas requisições de imagem ao abrir Season 1: ${seasonImages.length}`,
    );
    seasonImages.forEach((img) => {
      const resp = responseData.get(img.url);
      console.log(
        `      - ${img.filename}: ${resp?.contentLength ? (resp.contentLength / 1024).toFixed(1) + " kB" : "desconhecido"}`,
      );
    });

    // -----------------------------------------------------------------
    // D) Navegar até a aba 'Partidas'
    // -----------------------------------------------------------------
    console.log("\nD) Navegando para a aba 'Partidas' da temporada...");
    const beforeMatchesCount = imageRequests.length;
    await nav(p, "Partidas").click();
    await s.quiet();

    const matchesImages = imageRequests.slice(beforeMatchesCount);
    console.log(
      `   -> Novas requisições de imagem na aba Partidas: ${matchesImages.length}`,
    );
    matchesImages.forEach((img) => {
      const resp = responseData.get(img.url);
      console.log(
        `      - ${img.filename}: ${resp?.contentLength ? (resp.contentLength / 1024).toFixed(1) + " kB" : "desconhecido"}`,
      );
    });

    console.log("\n=======================================================");
    console.log("RESUMO GERAL DE IMAGENS EM RUNTIME");
    console.log("=======================================================");
    const allUniqueImages = [...new Set(imageRequests.map((i) => i.url))];
    console.log(`Total de URLs de imagem distintas requisitadas: ${allUniqueImages.length}`);
    let grandTotalBytes = 0;
    allUniqueImages.forEach((url) => {
      const resp = responseData.get(url);
      const bytes = resp?.contentLength || 0;
      grandTotalBytes += bytes;
      const fn = url.split("/").pop().split("?")[0];
      console.log(`- ${fn}: ${(bytes / 1024).toFixed(1)} kB (${url})`);
    });
    console.log(
      `Total de bytes de imagens transferidos no fluxo: ${(grandTotalBytes / 1024).toFixed(1)} kB (${(grandTotalBytes / 1024 / 1024).toFixed(2)} MB)`,
    );

    const report = {
      timestamp: new Date().toISOString(),
      welcome: {
        count: welcomeImages.length,
        images: welcomeImages.map((i) => ({
          filename: i.filename,
          url: i.url,
          bytes: responseData.get(i.url)?.contentLength || 0,
        })),
      },
      careersPage: {
        count: careersImages.length,
        images: careersImages.map((i) => ({
          filename: i.filename,
          url: i.url,
          bytes: responseData.get(i.url)?.contentLength || 0,
        })),
      },
      trophiesModal: {
        count: trophiesImages.length,
        images: trophiesImages.map((i) => ({
          filename: i.filename,
          url: i.url,
          bytes: responseData.get(i.url)?.contentLength || 0,
        })),
        totalBytes: totalTrophyBytes,
        reopenNewRequestsCount: reopenImages.length,
      },
      season: {
        count: seasonImages.length,
        images: seasonImages.map((i) => ({
          filename: i.filename,
          url: i.url,
          bytes: responseData.get(i.url)?.contentLength || 0,
        })),
      },
      matchesTab: {
        count: matchesImages.length,
        images: matchesImages.map((i) => ({
          filename: i.filename,
          url: i.url,
          bytes: responseData.get(i.url)?.contentLength || 0,
        })),
      },
      grandTotal: {
        uniqueUrlsCount: allUniqueImages.length,
        totalBytes: grandTotalBytes,
      },
    };

    mkdirSync(".test-tools/performance/stage-7f", { recursive: true });
    writeFileSync(
      ".test-tools/performance/stage-7f/runtime-assets.json",
      JSON.stringify(report, null, 2),
    );

    console.log(
      "\n[7F] Diagnóstico em runtime concluído! Relatório salvo em .test-tools/performance/stage-7f/runtime-assets.json",
    );
  } finally {
    await browser.close();
  }
}

await measureAssetsRuntime();
