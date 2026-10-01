import { launch, session, login } from "./browser.mjs";
import { capture } from "./journeys.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);

const nav = (page, text) =>
  page.locator("nav").getByText(text, { exact: true });

const round = (x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x);

async function runStage7C() {
  const browser = await launch();
  const results = {};

  try {
    const targetProfiles = fixtures.filter((f) =>
      ["small", "medium"].includes(f.name),
    );

    for (const fixture of targetProfiles) {
      console.log(`\n==================================================`);
      console.log(
        `[7C] Medição AFTER de Navegação: ${fixture.name.toUpperCase()}`,
      );
      console.log(`==================================================\n`);

      const s = await session(browser, false);
      const p = s.page;
      const profileResults = [];

      try {
        await login(s, fixture);
        await p.locator('[data-drop-id="c1"]').waitFor({ state: "visible" });
        await s.quiet();

        for (let trial = 1; trial <= 3; trial++) {
          console.log(`\n--- Trial ${trial} (${fixture.name}) ---`);

          // 1. CareersPage → Career
          const c2cRow = await capture(
            s,
            "CareersPage → Career",
            () =>
              p
                .locator('[data-drop-id="c1"]')
                .getByRole("button", { name: "Entrar", exact: true })
                .click(),
            () =>
              p
                .getByText("Selecionar temporadas", { exact: true })
                .waitFor({ state: "visible" }),
            { profile: fixture.name, trial, mode: "navigation-7c" },
          );

          const c2cEvents = c2cRow.events || [];
          const c2cRequests = c2cRow.requests || [];
          const c2cClick = c2cRow.click ?? c2cRow.begin;
          const c2cDocStart = c2cEvents.find(
            (e) => e.kind === "document-start",
          );
          const c2cUrlEvent = c2cEvents.find((e) => e.kind === "url");
          const c2cTiming = (val) =>
            Number.isFinite(val) && Number.isFinite(c2cClick)
              ? round(val - c2cClick)
              : null;

          const c2cNewDocMs = c2cDocStart ? c2cTiming(c2cDocStart.t) : null;
          const c2cUrlMs = c2cUrlEvent ? c2cTiming(c2cUrlEvent.t) : null;
          const c2cUsableMs = c2cTiming(c2cRow.usable);
          const c2cAuthCallbacks = c2cEvents.filter(
            (e) => e.kind === "auth-callback",
          ).length;
          const c2cAuthRequests = c2cRequests.filter((r) =>
            r.url.startsWith("http://127.0.0.1:9098"),
          ).length;
          const c2cQueries = c2cEvents.filter(
            (e) => e.kind === "read-start" || e.kind === "listen-start",
          ).length;
          const c2cDocs =
            c2cEvents
              .filter((e) => e.kind === "read-end")
              .reduce((acc, e) => acc + (e.documents || 0), 0) +
            c2cEvents
              .filter((e) => e.kind === "listen-callback")
              .reduce((acc, e) => acc + (e.documents || 0), 0);

          const c2cScrollY = await p.evaluate(() => window.scrollY);
          const c2cLocationState = await p.evaluate(
            () => window.history.state?.usr?.career?.id,
          );

          console.log(`[C2C] newDocumentMs: ${c2cNewDocMs}`);
          console.log(`[C2C] urlMs: ${c2cUrlMs} ms`);
          console.log(`[C2C] usableMs: ${c2cUsableMs} ms`);
          console.log(`[C2C] authCallbacks: ${c2cAuthCallbacks}`);
          console.log(`[C2C] authRequests: ${c2cAuthRequests}`);
          console.log(`[C2C] queries: ${c2cQueries}`);
          console.log(`[C2C] documents: ${c2cDocs}`);
          console.log(`[C2C] scrollY: ${c2cScrollY}`);
          console.log(`[C2C] career in history state: ${c2cLocationState}`);

          // Open SeasonConfigs modal
          await p.getByText("Temporada 1", { exact: true }).click();
          await p.getByRole("button", { name: "Entrar na Temporada" }).waitFor({
            state: "visible",
          });

          const modalOpenBeforeNav = await p.evaluate(() =>
            document.body.classList.contains("modal-open"),
          );
          console.log(`[C2S] modal-open before nav: ${modalOpenBeforeNav}`);

          // 2. Career → Season
          const c2sRow = await capture(
            s,
            "Career → Season",
            () =>
              p.getByRole("button", { name: "Entrar na Temporada" }).click(),
            () => nav(p, "Elenco").waitFor({ state: "visible" }),
            { profile: fixture.name, trial, mode: "navigation-7c" },
          );

          const c2sEvents = c2sRow.events || [];
          const c2sRequests = c2sRow.requests || [];
          const c2sClick = c2sRow.click ?? c2sRow.begin;
          const c2sDocStart = c2sEvents.find(
            (e) => e.kind === "document-start",
          );
          const c2sUrlEvent = c2sEvents.find((e) => e.kind === "url");
          const c2sTiming = (val) =>
            Number.isFinite(val) && Number.isFinite(c2sClick)
              ? round(val - c2sClick)
              : null;

          const c2sNewDocMs = c2sDocStart ? c2sTiming(c2sDocStart.t) : null;
          const c2sUrlMs = c2sUrlEvent ? c2sTiming(c2sUrlEvent.t) : null;
          const c2sUsableMs = c2sTiming(c2sRow.usable);
          const c2sAuthCallbacks = c2sEvents.filter(
            (e) => e.kind === "auth-callback",
          ).length;
          const c2sAuthRequests = c2sRequests.filter((r) =>
            r.url.startsWith("http://127.0.0.1:9098"),
          ).length;
          const c2sQueries = c2sEvents.filter(
            (e) => e.kind === "read-start" || e.kind === "listen-start",
          ).length;
          const c2sDocs =
            c2sEvents
              .filter((e) => e.kind === "read-end")
              .reduce((acc, e) => acc + (e.documents || 0), 0) +
            c2sEvents
              .filter((e) => e.kind === "listen-callback")
              .reduce((acc, e) => acc + (e.documents || 0), 0);

          const modalOpenAfterNav = await p.evaluate(() =>
            document.body.classList.contains("modal-open"),
          );
          const c2sScrollY = await p.evaluate(() => window.scrollY);

          console.log(`[C2S] newDocumentMs: ${c2sNewDocMs}`);
          console.log(`[C2S] urlMs: ${c2sUrlMs} ms`);
          console.log(`[C2S] usableMs: ${c2sUsableMs} ms`);
          console.log(`[C2S] authCallbacks: ${c2sAuthCallbacks}`);
          console.log(`[C2S] authRequests: ${c2sAuthRequests}`);
          console.log(`[C2S] queries: ${c2sQueries}`);
          console.log(`[C2S] documents: ${c2sDocs}`);
          console.log(`[C2S] modal-open after nav: ${modalOpenAfterNav}`);
          console.log(`[C2S] scrollY: ${c2sScrollY}`);

          profileResults.push({
            trial,
            c2c: {
              newDocumentMs: c2cNewDocMs,
              urlMs: c2cUrlMs,
              usableMs: c2cUsableMs,
              authCallbacks: c2cAuthCallbacks,
              authRequests: c2cAuthRequests,
              queries: c2cQueries,
              documents: c2cDocs,
              scrollY: c2cScrollY,
              hasCareerState: !!c2cLocationState,
            },
            c2s: {
              newDocumentMs: c2sNewDocMs,
              urlMs: c2sUrlMs,
              usableMs: c2sUsableMs,
              authCallbacks: c2sAuthCallbacks,
              authRequests: c2sAuthRequests,
              queries: c2sQueries,
              documents: c2sDocs,
              modalOpenAfterNav,
              scrollY: c2sScrollY,
            },
          });

          // Return back to CareersPage for next trial
          await p.goto(s.origin + "/CareersPage");
          await p.locator('[data-drop-id="c1"]').waitFor({ state: "visible" });
          await s.quiet();
        }

        results[fixture.name] = profileResults;
      } finally {
        await s.context.close();
      }
    }

    mkdirSync(".test-tools/performance/stage-7c", { recursive: true });
    writeFileSync(
      ".test-tools/performance/stage-7c/results.json",
      JSON.stringify(results, null, 2),
    );
    console.log(
      "\n[7C] Medição concluída com sucesso! Resultados salvos em .test-tools/performance/stage-7c/results.json",
    );
  } finally {
    await browser.close();
  }
}

await runStage7C();
