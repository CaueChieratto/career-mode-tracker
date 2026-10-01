import { launch, session, login } from "./browser.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);
const nav = (page, text) =>
  page.locator("nav").getByText(text, { exact: true });

mkdirSync(".test-tools/performance/stage-7h", { recursive: true });

async function runProfiler() {
  console.log(
    "=================================================================",
  );
  console.log("[STAGE 7H] REACT PROFILER HARNESS — MICRO-OTIMIZAÇÕES");
  console.log(
    "=================================================================\n",
  );

  const browser = await launch();
  const allResults = [];

  try {
    const targetFixtures = fixtures.filter(
      (f) => f.name === "small" || f.name === "medium",
    );

    for (const fixture of targetFixtures) {
      console.log(
        `\n#################################################################`,
      );
      console.log(
        `INICIANDO PROFILING COM FIXTURE: ${fixture.name.toUpperCase()}`,
      );
      console.log(
        `#################################################################\n`,
      );

      const TRIALS = fixture.name === "small" ? 3 : 1;

      for (let trial = 1; trial <= TRIALS; trial++) {
        console.log(
          `\n--- [Trial ${trial}/${TRIALS}] Fixture: ${fixture.name} ---`,
        );
        const s = await session(browser, true); // true = profiler server on port 4180
        const p = s.page;

        const recordAction = async (flowName, stepName, action, readyWait) => {
          await s.flush();
          const eventsStartIdx = s.events.length;
          const t0 = Date.now();

          await action();
          if (readyWait) await readyWait();
          await p.evaluate(
            () =>
              new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              ),
          );
          await s.quiet();
          await s.flush();

          const t1 = Date.now();
          const sliceEvents = s.events.slice(eventsStartIdx);
          const reactEvents = sliceEvents.filter((e) => e.kind === "react");

          // Group by commitTime (rounded to 0.1ms for minor floating-point jitter)
          const commitGroups = new Map();
          for (const ev of reactEvents) {
            const cKey = Math.round(ev.commitTime * 10) / 10;
            if (!commitGroups.has(cKey)) commitGroups.set(cKey, []);
            commitGroups.get(cKey).push(ev);
          }

          const commits = Array.from(commitGroups.entries()).map(
            ([commitKey, evts]) => {
              const commitStartTime = Math.min(...evts.map((e) => e.startTime));
              const commitEndTime = Math.max(...evts.map((e) => e.commitTime));
              const commitDuration = Math.max(
                0,
                commitEndTime - commitStartTime,
              );
              return {
                commitKey,
                commitStartTime,
                commitEndTime,
                commitDuration,
                components: evts.map((e) => ({
                  component: e.component,
                  phase: e.phase,
                  actualDuration: e.actualDuration,
                  baseDuration: e.baseDuration,
                })),
              };
            },
          );

          // Component summary
          const compSummary = {};
          for (const ev of reactEvents) {
            if (!compSummary[ev.component]) {
              compSummary[ev.component] = {
                renders: 0,
                mounts: 0,
                updates: 0,
                totalActualDuration: 0,
                maxActualDuration: 0,
                baseDuration: 0,
              };
            }
            const cs = compSummary[ev.component];
            cs.renders++;
            if (ev.phase === "mount") cs.mounts++;
            else cs.updates++;
            cs.totalActualDuration += ev.actualDuration;
            cs.maxActualDuration = Math.max(
              cs.maxActualDuration,
              ev.actualDuration,
            );
            cs.baseDuration = Math.max(cs.baseDuration, ev.baseDuration);
          }

          const resultItem = {
            fixture: fixture.name,
            trial,
            flowName,
            stepName,
            wallDurationMs: t1 - t0,
            commitsCount: commits.length,
            commits,
            reactEventsCount: reactEvents.length,
            compSummary,
          };

          allResults.push(resultItem);

          console.log(`  [${flowName} > ${stepName}]`);
          console.log(
            `    Wall: ${t1 - t0}ms | Commits: ${commits.length} | React Profiler Events: ${reactEvents.length}`,
          );
          const topByCost = Object.entries(compSummary).sort(
            (a, b) => b[1].totalActualDuration - a[1].totalActualDuration,
          );
          if (topByCost.length > 0) {
            console.log(`    Top por custo:`);
            for (const [cName, cData] of topByCost.slice(0, 4)) {
              console.log(
                `      * ${cName}: total=${cData.totalActualDuration.toFixed(2)}ms (max=${cData.maxActualDuration.toFixed(2)}ms, base=${cData.baseDuration.toFixed(2)}ms, renders=${cData.renders} [${cData.mounts}m/${cData.updates}u])`,
              );
            }
          }

          return resultItem;
        };

        try {
          // Flow F: CareersPage — render inicial
          await recordAction(
            "F_CareersPage",
            "render_inicial",
            async () => {
              await login(s, fixture);
            },
            async () => {
              await p
                .locator('[data-drop-id="c1"]')
                .waitFor({ state: "visible" });
            },
          );

          // Flow A: Season — abertura inicial em Elenco
          await recordAction(
            "A_Season",
            "abertura_inicial_elenco",
            async () => {
              await p.goto(`${s.origin}/Career/c1/Season/s1`);
            },
            async () => {
              await nav(p, "Elenco").waitFor({ state: "visible" });
            },
          );

          // Flow B: Season — primeira visita a abas
          // B1: Partidas
          await recordAction(
            "B_Season_Tabs",
            "visita_partidas",
            async () => {
              await nav(p, "Partidas").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // B2: Classificação
          await recordAction(
            "B_Season_Tabs",
            "visita_classificacao",
            async () => {
              await nav(p, "Classificação").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // B3: Estatísticas
          await recordAction(
            "B_Season_Tabs",
            "visita_estatisticas",
            async () => {
              await nav(p, "Estatísticas").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // B4: Geral
          await recordAction(
            "B_Season_Tabs",
            "visita_geral",
            async () => {
              await nav(p, "Geral").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // B5: Revisitas (Elenco e Estatísticas)
          await recordAction(
            "B_Season_Tabs",
            "revisita_elenco",
            async () => {
              await nav(p, "Elenco").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          await recordAction(
            "B_Season_Tabs",
            "revisita_estatisticas",
            async () => {
              await nav(p, "Estatísticas").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // Flow C: Player — abertura inicial (Jogador / InfoPlayerTab)
          await recordAction(
            "C_Player",
            "abertura_inicial",
            async () => {
              await p.goto(`${s.origin}/Career/c1/Season/s1/Player/p1`);
            },
            async () => {
              await nav(p, "Jogador").waitFor({ state: "visible" });
            },
          );

          // Flow D: Player — primeira visita a tabs pesadas
          // D1: Temporadas
          await recordAction(
            "D_Player_Tabs",
            "visita_temporadas",
            async () => {
              await nav(p, "Temporadas").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // D2: Estatísticas
          await recordAction(
            "D_Player_Tabs",
            "visita_estatisticas",
            async () => {
              await nav(p, "Estatísticas").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // D3: Total
          await recordAction(
            "D_Player_Tabs",
            "visita_total",
            async () => {
              await nav(p, "Total").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // D4: Revisita Jogador e Temporadas
          await recordAction(
            "D_Player_Tabs",
            "revisita_jogador",
            async () => {
              await nav(p, "Jogador").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          await recordAction(
            "D_Player_Tabs",
            "revisita_temporadas",
            async () => {
              await nav(p, "Temporadas").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // Flow E: Match — abertura e abas
          // Primeiro navegar para a temporada e abrir a primeira partida de resultados
          await p.goto(`${s.origin}/Career/c1/Season/s1`);
          await nav(p, "Partidas").waitFor({ state: "visible" });
          await nav(p, "Partidas").click();
          await p.waitForFunction(
            () => !document.querySelector(".swiper")?.swiper?.animating,
          );
          await p.getByText("Resultados", { exact: true }).click();
          await p
            .locator('.swiper-slide-active main[class*="match_row"]')
            .first()
            .waitFor({ state: "visible" });
          await s.quiet();

          // E1: Match — abertura inicial (Resultado / MatchDetailsTab)
          await recordAction(
            "E_Match",
            "abertura_inicial_resultado",
            async () => {
              await p
                .locator('.swiper-slide-active main[class*="match_row"]')
                .first()
                .click();
            },
            async () => {
              await nav(p, "Resultado").waitFor({ state: "visible" });
            },
          );

          // E2: Match — Formações (LineupTab)
          await recordAction(
            "E_Match_Tabs",
            "visita_formacoes",
            async () => {
              await nav(p, "Formações").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // E3: Match — Estatísticas (MatchStatsTab)
          await recordAction(
            "E_Match_Tabs",
            "visita_estatisticas",
            async () => {
              await nav(p, "Estatísticas").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );

          // E4: Match — Revisita Resultado
          await recordAction(
            "E_Match_Tabs",
            "revisita_resultado",
            async () => {
              await nav(p, "Resultado").click();
            },
            async () => {
              await p.waitForFunction(
                () => !document.querySelector(".swiper")?.swiper?.animating,
              );
            },
          );
        } finally {
          await s.context.close();
        }
      }
    }

    writeFileSync(
      ".test-tools/performance/stage-7h/profiling-results.json",
      JSON.stringify(allResults, null, 2),
    );
    console.log(
      "\n=================================================================",
    );
    console.log(
      "PROFILING COMPLETO SALVO EM: .test-tools/performance/stage-7h/profiling-results.json",
    );
    console.log(
      "=================================================================",
    );
  } finally {
    await browser.close();
  }
}

await runProfiler();
