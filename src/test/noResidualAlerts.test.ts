import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Guarda de Regressão — Alertas e Confirmações Nativas", () => {
  it("nenhum arquivo de produção em src/ deve invocar window.alert, window.confirm ou alert() nativo", () => {
    const srcDir = path.resolve(__dirname, "..");
    const forbiddenPatterns = [
      /\bwindow\.alert\s*\(/,
      /\bwindow\.confirm\s*\(/,
      /(?<!\.)\balert\s*\(/,
    ];

    const violations: string[] = [];

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "test" || entry.name === "node_modules" || entry.name === "dist") {
            continue;
          }
          scanDir(fullPath);
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf8");
          for (const pattern of forbiddenPatterns) {
            if (pattern.test(content)) {
              violations.push(
                `${path.relative(srcDir, fullPath)} contém padrão proibido: ${pattern}`,
              );
            }
          }
        }
      }
    }

    scanDir(srcDir);
    expect(violations).toEqual([]);
  });
});
