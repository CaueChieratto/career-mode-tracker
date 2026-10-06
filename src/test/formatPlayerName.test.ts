import { describe, expect, it } from "vitest";
import { formatPlayerName } from "../common/utils/formatPlayerName";

describe("formatPlayerName - Visual Abbreviation Utility", () => {
  it("abrevia primeiro nome em nomes compostos padrão", () => {
    expect(formatPlayerName("Lionel Messi")).toBe("L. Messi");
    expect(formatPlayerName("Cristiano Ronaldo")).toBe("C. Ronaldo");
    expect(formatPlayerName("Kevin De Bruyne")).toBe("K. De Bruyne");
    expect(formatPlayerName("Trent Alexander-Arnold")).toBe("T. Alexander-Arnold");
    expect(formatPlayerName("Erling Braut Haaland")).toBe("E. Braut Haaland");
  });

  it("trata casos especiais de sufixos/agnomes familiares de 2 palavras (Junior, Júnior, Jr, Jr.)", () => {
    expect(formatPlayerName("Vinicius Junior")).toBe("Vinicius Jr.");
    expect(formatPlayerName("Vinicius Júnior")).toBe("Vinicius Jr.");
    expect(formatPlayerName("Vini Junior")).toBe("Vini Jr.");
    expect(formatPlayerName("Vini Júnior")).toBe("Vini Jr.");
    expect(formatPlayerName("Neymar Junior")).toBe("Neymar Jr.");
    expect(formatPlayerName("Neymar Jr")).toBe("Neymar Jr.");
    expect(formatPlayerName("Neymar Jr.")).toBe("Neymar Jr.");
  });

  it("abrevia o primeiro nome e padroniza o sufixo final quando há 3 ou mais palavras", () => {
    expect(formatPlayerName("Lucas Silva Junior")).toBe("L. Silva Jr.");
    expect(formatPlayerName("João Pedro Júnior")).toBe("J. Pedro Jr.");
    expect(formatPlayerName("José Santos Jr")).toBe("J. Santos Jr.");
  });

  it("mantém monônimos e nomes únicos sem abreviação", () => {
    expect(formatPlayerName("Neymar")).toBe("Neymar");
    expect(formatPlayerName("Pelé")).toBe("Pelé");
    expect(formatPlayerName("Casemiro")).toBe("Casemiro");
    expect(formatPlayerName("Pedri")).toBe("Pedri");
    expect(formatPlayerName("Gavi")).toBe("Gavi");
    expect(formatPlayerName("Ronaldo")).toBe("Ronaldo");
  });

  it("é idempotente se o nome já estiver abreviado", () => {
    expect(formatPlayerName("L. Messi")).toBe("L. Messi");
    expect(formatPlayerName("l. messi")).toBe("L. messi");
    expect(formatPlayerName("J. Jogador")).toBe("J. Jogador");
    expect(formatPlayerName("J.Jogador")).toBe("J. Jogador");
    expect(formatPlayerName("V. Jr")).toBe("V. Jr");
    expect(formatPlayerName("V. Jr.")).toBe("V. Jr.");
  });

  it("trata nomes com múltiplos espaços em branco e espaços nas pontas", () => {
    expect(formatPlayerName("  Gabriel   Silva  ")).toBe("G. Silva");
    expect(formatPlayerName("   Vinicius    Junior   ")).toBe("Vinicius Jr.");
  });

  it("retorna string vazia com segurança para entradas vazias ou nulas", () => {
    expect(formatPlayerName("")).toBe("");
    expect(formatPlayerName("   ")).toBe("");
    expect(formatPlayerName(null)).toBe("");
    expect(formatPlayerName(undefined)).toBe("");
  });
});
