import { launch, session, login } from "./browser.mjs";
import { capture, save } from "./journeys.mjs";
import { base, request, fields } from "./seed.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(".test-tools/performance/fixtures.json"),
);
const browser = await launch();

const active = (events) => {
  const origin = events.findLast((e) => e.kind === "document-start")?.origin;
  const relevant = events.filter((e) => e.origin === origin);
  const listenStarts = relevant.filter((e) => e.kind === "listen-start").length;
  const listenStops = relevant.filter((e) => e.kind === "listen-stop").length;
  return {
    firestore: listenStarts - listenStops,
    listenStarts,
    listenStops,
    authModular:
      relevant.filter((e) => e.kind === "auth-start").length -
      relevant.filter((e) => e.kind === "auth-stop").length,
    callbacks: relevant.filter((e) => e.kind === "listen-callback").length,
  };
};

const nav = (p, text) => p.locator("nav").getByText(text, { exact: true });
const patch = (f, n) =>
  request(`${base}/users/${f.uid}/careers/c1?updateMask.fieldPaths=updatedAt`, {
    method: "PATCH",
    body: JSON.stringify({ fields: fields({ updatedAt: n }) }),
  });

const summary = {};

try {
  // Run small and medium profiles
  const targetProfiles = fixtures.filter((x) =>
    ["small", "medium"].includes(x.name),
  );
  for (const f of targetProfiles) {
    console.log(`\n========================================`);
    console.log(`[7A] Executando medição dirigida: ${f.name.toUpperCase()}`);
    console.log(`========================================\n`);

    const s = await session(browser, true);
    const p = s.page;
    const rows = [];
    const reportData = [];

    try {
      await login(s, f);
      await p.locator('[data-drop-id="c1"]').waitFor();
      await s.quiet();

      const initial = active(s.events);
      console.log(
        `[7A] ${f.name} inicial: listeners ativos=${initial.firestore}, starts=${initial.listenStarts}, stops=${initial.listenStops}`,
      );

      // 1. updatedAt antes dos ciclos
      const beforeCycleRow = await capture(
        s,
        "updatedAt: antes dos ciclos",
        () => patch(f, 1700000000001),
        () => p.waitForTimeout(100),
        { profile: f.name, mode: "diagnostic-7a" },
      );
      const readsBeforeCycle = beforeCycleRow.events.filter(
        (e) => e.kind === "read-start",
      ).length;
      const callbacksBeforeCycle = beforeCycleRow.events.filter(
        (e) => e.kind === "listen-callback",
      ).length;
      const docsBeforeCycle = beforeCycleRow.events
        .filter((e) => e.kind === "read-end")
        .reduce((acc, e) => acc + (e.documents || 0), 0);
      rows.push({ ...beforeCycleRow, listenersBefore: initial });
      reportData.push({
        event: "updatedAt: antes dos ciclos",
        cycle: "—",
        listenersBefore: initial.firestore,
        listenersAfter: "—",
        delta: "—",
        callbacks: callbacksBeforeCycle,
        operations: readsBeforeCycle,
        docs: docsBeforeCycle,
      });

      // 2. Três ciclos Careers -> Group -> Careers
      for (let cycle = 1; cycle <= 3; cycle++) {
        // Careers -> Group
        const enterBefore = active(s.events);
        const enter = await capture(
          s,
          "Listener: Careers → Group",
          () => p.locator('[data-drop-id="g1"] h2').first().click(),
          () => nav(p, "Elenco").waitFor(),
          { profile: f.name, cycle, mode: "diagnostic-7a" },
        );
        const enterAfter = active(s.events);
        const enterReads = enter.events.filter(
          (e) => e.kind === "read-start",
        ).length;
        const enterCallbacks = enter.events.filter(
          (e) => e.kind === "listen-callback",
        ).length;
        const enterDocs = enter.events
          .filter((e) => e.kind === "read-end")
          .reduce((acc, e) => acc + (e.documents || 0), 0);
        rows.push({
          ...enter,
          listenersBefore: enterBefore,
          listenersAfter: enterAfter,
        });
        reportData.push({
          event: "Listener: Careers → Group",
          cycle,
          listenersBefore: enterBefore.firestore,
          listenersAfter: enterAfter.firestore,
          delta: enterAfter.firestore - enterBefore.firestore,
          callbacks: enterCallbacks,
          operations: enterReads,
          docs: enterDocs,
        });

        // Group -> Careers
        const leaveBefore = active(s.events);
        const leave = await capture(
          s,
          "Listener: Group → Careers",
          () => p.getByRole("button", { name: "Voltar", exact: true }).click(),
          () => p.locator('[data-drop-id="c1"]').waitFor(),
          { profile: f.name, cycle, mode: "diagnostic-7a" },
        );
        const leaveAfter = active(s.events);
        const leaveReads = leave.events.filter(
          (e) => e.kind === "read-start",
        ).length;
        const leaveCallbacks = leave.events.filter(
          (e) => e.kind === "listen-callback",
        ).length;
        const leaveDocs = leave.events
          .filter((e) => e.kind === "read-end")
          .reduce((acc, e) => acc + (e.documents || 0), 0);
        rows.push({
          ...leave,
          listenersBefore: leaveBefore,
          listenersAfter: leaveAfter,
        });
        reportData.push({
          event: "Listener: Group → Careers",
          cycle,
          listenersBefore: leaveBefore.firestore,
          listenersAfter: leaveAfter.firestore,
          delta: leaveAfter.firestore - leaveBefore.firestore,
          callbacks: leaveCallbacks,
          operations: leaveReads,
          docs: leaveDocs,
        });
      }

      // 3. updatedAt depois dos ciclos
      const finalListeners = active(s.events);
      const afterCycleRow = await capture(
        s,
        "updatedAt: depois dos ciclos",
        () => patch(f, 1700000000002),
        () => p.waitForTimeout(100),
        { profile: f.name, mode: "diagnostic-7a" },
      );
      const readsAfterCycle = afterCycleRow.events.filter(
        (e) => e.kind === "read-start",
      ).length;
      const callbacksAfterCycle = afterCycleRow.events.filter(
        (e) => e.kind === "listen-callback",
      ).length;
      const docsAfterCycle = afterCycleRow.events
        .filter((e) => e.kind === "read-end")
        .reduce((acc, e) => acc + (e.documents || 0), 0);
      rows.push({ ...afterCycleRow, listenersAfter: finalListeners });
      reportData.push({
        event: "updatedAt: depois dos ciclos",
        cycle: "—",
        listenersBefore: "—",
        listenersAfter: finalListeners.firestore,
        delta: "—",
        callbacks: callbacksAfterCycle,
        operations: readsAfterCycle,
        docs: docsAfterCycle,
      });

      summary[f.name] = reportData;
      await patch(f, 1700000000000);
      mkdirSync(".test-tools/performance/stage-7a", { recursive: true });
      writeFileSync(
        `.test-tools/performance/stage-7a/stage-7a-listeners-${f.name}.json`,
        JSON.stringify(rows, null, 2),
      );
      console.log(`[7A] ${f.name} medição concluída com sucesso!`);
    } catch (error) {
      console.error(`[7A] ERRO em ${f.name}:`, error);
      throw error;
    } finally {
      await s.context.close();
      await patch(f, 1700000000000);
    }
  }

  // Print final summary
  console.log(`\n======================================================`);
  console.log(`RESULTADO FINAL DA MEDIÇÃO DIRIGIDA DA ETAPA 7A`);
  console.log(`======================================================\n`);
  console.log(JSON.stringify(summary, null, 2));
  writeFileSync(
    `.test-tools/performance/stage-7a/summary.json`,
    JSON.stringify(summary, null, 2),
  );
} finally {
  await browser.close();
}
