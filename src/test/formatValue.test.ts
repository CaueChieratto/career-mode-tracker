import { describe, it, expect } from "vitest";
import {
  parseValue,
  formatCompactNumber,
  formatDisplayValue,
} from "../common/utils/FormatValue";

describe("FormatValue Utility - Precisão e Formatação Sem Arredondamento Indesejado", () => {
  describe("parseValue", () => {
    it("deve converter 3.45m para 3450000 exato", () => {
      expect(parseValue("3.45m")).toBe(3450000);
      expect(parseValue("3.45M")).toBe(3450000);
      expect(parseValue("3,45m")).toBe(3450000);
    });

    it("deve converter 150k para 150000", () => {
      expect(parseValue("150k")).toBe(150000);
      expect(parseValue("150K")).toBe(150000);
    });

    it("deve converter 1.25b para 1250000000", () => {
      expect(parseValue("1.25b")).toBe(1250000000);
      expect(parseValue("1.25B")).toBe(1250000000);
    });

    it("deve converter números brutos", () => {
      expect(parseValue("5000")).toBe(5000);
      expect(parseValue("3450000")).toBe(3450000);
      expect(parseValue("")).toBe(0);
    });
  });

  describe("formatCompactNumber", () => {
    it("deve formatar 3450000 como 3.45M sem truncar ou arredondar para 3.4 ou 3.5", () => {
      expect(formatCompactNumber(3450000)).toBe("3.45M");
    });

    it("deve formatar valores redondos sem zeros supérfluos", () => {
      expect(formatCompactNumber(3000000)).toBe("3M");
      expect(formatCompactNumber(3500000)).toBe("3.5M");
      expect(formatCompactNumber(150000)).toBe("150k");
      expect(formatCompactNumber(1000000000)).toBe("1B");
    });

    it("deve lidar com zero e valores menores que 1000", () => {
      expect(formatCompactNumber(0)).toBe("0");
      expect(formatCompactNumber(500)).toBe("500");
    });
  });

  describe("formatDisplayValue", () => {
    it("deve exibir símbolo monetário e valor com precisão de 2 casas decimais", () => {
      expect(formatDisplayValue(3450000, "EUR")).toBe("€3.45M");
      expect(formatDisplayValue(3450000, "BRL")).toBe("R$3.45M");
      expect(formatDisplayValue(3450000, "USD")).toBe("$3.45M");
      expect(formatDisplayValue(3450000, "GBP")).toBe("£3.45M");
    });

    it("deve manter números redondos limpos", () => {
      expect(formatDisplayValue(70000000, "EUR")).toBe("€70M");
      expect(formatDisplayValue(150000, "EUR")).toBe("€150k");
      expect(formatDisplayValue(1000000000, "EUR")).toBe("€1B");
    });
  });
});

