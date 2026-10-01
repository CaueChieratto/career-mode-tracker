import { build } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const out = resolve(".test-tools/performance");
mkdirSync(out, { recursive: true });
const hashes = Object.fromEntries(
  readdirSync("src", { recursive: true, withFileTypes: true })
    .filter((x) => x.isFile())
    .map((x) => {
      const name = resolve(x.parentPath, x.name);
      return [
        name,
        createHash("sha256").update(readFileSync(name)).digest("hex"),
      ];
    }),
);
writeFileSync(`${out}/source-before.json`, JSON.stringify(hashes, null, 2));
const targets = {
  "/layout/SectionView/index.tsx": ["SectionView", "default"],
  "/pages/Match/index.tsx": ["Match", "named"],
  "/pages/ComparePlayers/index.tsx": ["ComparePlayers", "named"],
  "/pages/Academy/layouts/contexts/AcademyProvider/index.tsx": [
    "AcademyProvider",
    "named",
  ],
  "/pages/CareersPage/components/CareerCard/index.tsx": [
    "CareerCard",
    "default",
  ],
  "/pages/CareersPage/index.tsx": ["CareersPage", "default"],
  "/pages/Players/index.tsx": ["Player", "default"],
  "/layout/SectionView/features/ClubTabs/AllMatchesTab/index.tsx": [
    "AllMatchesTab",
    "named",
  ],
  "/layout/SectionView/features/ClubTabs/StatsTab_Club/components/PlayerStatsList/index.tsx":
    ["PlayerStatsList", "default"],
  "/layout/SectionView/features/ClubTabs/StatsTab_Club/components/PlayerStatsList/components/PlayerStats/index.tsx":
    ["PlayerStats", "default"],
  "/layout/SectionView/features/ClubTabs/GeneralTab/components/CompetitionsCard/index.tsx":
    ["CompetitionsCard", "default"],
};
for (const name of [
  "SquadTab",
  "TableTab",
  "StatsTab_Club",
  "BestPlayersTab",
  "GeneralTab",
  "CuriositiesTab",
]) {
  const file = `/layout/SectionView/features/ClubTabs/${name}/index.tsx`;
  if (readFileSync(`src${file}`, "utf8").includes(`export default ${name}`))
    targets[file] = [name, "default"];
  else targets[file] = [name, "named"];
}
for (const name of ["LineupTab", "MatchDetailsTab", "MatchStatsTab"]) {
  const file = `/pages/Match/components/${name}/index.tsx`;
  targets[file] = [
    name,
    readFileSync(`src${file}`, "utf8").includes(`export default ${name}`)
      ? "default"
      : "named",
  ];
}
for (const name of [
  "InfoPlayerTab",
  "SeasonsPlayerTab",
  "PlayerDetailedStatsTab",
  "TotalPlayerTab",
  "AcademyPlayerTab",
]) {
  const file = `/layout/SectionView/features/PlayerTabs/${name}/index.tsx`;
  targets[file] = [
    name,
    readFileSync(`src${file}`, "utf8").includes(`export default ${name}`)
      ? "default"
      : "named",
  ];
}
function instrumentation(profile) {
  return {
    name: "isolated-performance-instrumentation",
    enforce: "pre",
    resolveId(id) {
      if (id.startsWith("perf-firestore:") || id.startsWith("perf-auth:"))
        return "\0" + id;
    },
    load(id) {
      if (id.startsWith("\0perf-firestore:"))
        return `export * from 'firebase/firestore'; import * as sdk from 'firebase/firestore'; import { read, listen } from ${JSON.stringify(resolve("tests/performance/sdk-adapter.js").replaceAll("\\", "/"))}; const source=${JSON.stringify(id.slice(16))}; export const getDoc=(...a)=>read(sdk.getDoc,a,source); export const getDocs=(...a)=>read(sdk.getDocs,a,source); export const onSnapshot=(...a)=>listen(sdk.onSnapshot,a,source);`;
      if (id.startsWith("\0perf-auth:"))
        return `export * from 'firebase/auth'; import {onAuthStateChanged as original} from 'firebase/auth'; import {authListen} from ${JSON.stringify(resolve("tests/performance/sdk-adapter.js").replaceAll("\\", "/"))}; export const onAuthStateChanged=(...a)=>authListen(original,a,${JSON.stringify(id.slice(11))});`;
    },
    transform(code, id) {
      const file = id.replaceAll("\\", "/");
      if (!file.includes("/src/") || file.includes("/src/test/")) return;
      if (file.endsWith("/common/services/Firebase/index.ts"))
        return readFileSync("tests/performance/firebase-client.js", "utf8");
      code = code
        .replace(
          /from\s+["']firebase\/firestore["']/g,
          `from ${JSON.stringify("perf-firestore:" + file.split("/src/")[1])}`,
        )
        .replace(
          /from\s+["']firebase\/auth["']/g,
          `from ${JSON.stringify("perf-auth:" + file.split("/src/")[1])}`,
        );
      if (file.endsWith("/useComparePlayers/index.ts"))
        code = code.replaceAll("setTimeout(", "globalThis.__perfTimer(");
      if (file.endsWith("/useMatchActions/index.ts"))
        code = code.replaceAll(
          "setIsSaving(true);",
          'globalThis.__perfEmit({kind:"saving-start"}); setIsSaving(true);',
        );
      const target = Object.entries(targets).find(([suffix]) =>
        file.endsWith(suffix),
      );
      if (target) {
        const [name, mode] = target[1];
        if (mode === "default")
          code = code
            .replace(`export default ${name};`, "")
            .replace(
              new RegExp(`const\\s+${name}(?:\\s*:[^=]+)?\\s*=`),
              `const __Original${name} =`,
            );
        else
          code = code.replace(
            new RegExp(`export\\s+const\\s+${name}(?:\\s*:[^=]+)?\\s*=`),
            `const __Original${name} =`,
          );
        code += `\nimport {createElement as __ce, useEffect as __ue, Profiler as __Profiler} from 'react';\nconst ${name} = (props) => { __ue(()=> {globalThis.__perfEmit({kind:'mount',component:'${name}'});return ()=>globalThis.__perfEmit({kind:'unmount',component:'${name}'});},[]); return ${profile ? `__ce(__Profiler,{id:'${name}',onRender:globalThis.__perfReact},__ce(__Original${name},props))` : `__ce(__Original${name},props)`}; };\n${mode === "default" ? `export default ${name};` : `export {${name}};`}`;
      }
      return { code, map: null };
    },
  };
}
for (const mode of ["bundle", "navigation", "profile"]) {
  const modules = [];
  await build({
    configFile: false,
    envDir: mode === "bundle" ? process.cwd() : resolve("tests/performance"),
    define:
      mode === "bundle"
        ? {}
        : {
            "import.meta.env.VITE_FOOTBALL_DATA_API_TOKEN": JSON.stringify(
              "synthetic-offline-token",
            ),
          },
    plugins: [
      ...(mode !== "bundle" ? [instrumentation(mode === "profile")] : []),
      react(),
      {
        name: "bundle-accounting",
        generateBundle(_, bundle) {
          for (const item of Object.values(bundle))
            if (item.type === "chunk")
              modules.push({
                file: item.fileName,
                bytes: Buffer.byteLength(item.code),
                gzip: gzipSync(item.code).length,
                isEntry: item.isEntry,
                dynamicImports: item.dynamicImports,
                modules: Object.entries(item.modules)
                  .map(([id, m]) => ({
                    id: id
                      .replaceAll("\\", "/")
                      .split("/carrer-mode-tracker/")
                      .pop(),
                    renderedLength: m.renderedLength,
                  }))
                  .sort((a, b) => b.renderedLength - a.renderedLength),
              });
        },
      },
    ],
    resolve:
      mode === "profile"
        ? {
            alias: [
              {
                find: /^react-dom\/client$/,
                replacement: resolve("node_modules/react-dom/profiling.js"),
              },
            ],
          }
        : {},
    build: { outDir: `${out}/${mode}`, emptyOutDir: true, sourcemap: false },
  });
  writeFileSync(`${out}/${mode}-bundle.json`, JSON.stringify(modules, null, 2));
}
