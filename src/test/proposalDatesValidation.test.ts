import { describe, expect, it } from "vitest";
import {
  isValidTransferTiming,
  validateProposalDates,
  validateProposalTiming,
} from "../common/helpers/proposals/proposalStatusHelper";

describe("Validação de Datas e Timing de Propostas (Padrão FC Barcelona)", () => {
  describe("Validação de Timing de Transferência", () => {
    it("aceita os valores canônicos de timing", () => {
      expect(isValidTransferTiming("Imediata")).toBe(true);
      expect(isValidTransferTiming("Proxima janela")).toBe(true);
      expect(isValidTransferTiming("Proxima temporada")).toBe(true);
    });

    it("rejeita strings arbitrárias ou datas inseridas no campo timing", () => {
      expect(isValidTransferTiming("30/06/2026")).toBe(false);
      expect(isValidTransferTiming("Amanhã")).toBe(false);
      expect(isValidTransferTiming("")).toBe(false);
      expect(isValidTransferTiming(null)).toBe(false);
      expect(isValidTransferTiming(undefined)).toBe(false);
    });

    it("validateProposalTiming não lança erro para timings válidos", () => {
      expect(() => validateProposalTiming("Imediata")).not.toThrow();
      expect(() => validateProposalTiming("Proxima janela")).not.toThrow();
      expect(() => validateProposalTiming("Proxima temporada")).not.toThrow();
    });

    it("validateProposalTiming lança erro para timings inválidos", () => {
      expect(() => validateProposalTiming("DataInvalida")).toThrow(
        "Timing de transferência inválido",
      );
    });
  });

  describe("Segregação Estrita entre Timing e Datas de Calendário (dataArrival e dataExit)", () => {
    it("não permite data de calendário no lugar de timing", () => {
      expect(() =>
        validateProposalDates({
          timing: "15/07/2026",
        }),
      ).toThrow("Timing não pode ser uma data de calendário");
    });

    it("não permite valor de timing no campo dataArrival", () => {
      expect(() =>
        validateProposalDates({
          dataArrival: "Imediata",
        }),
      ).toThrow("dataArrival deve ser uma data válida");
    });

    it("não permite valor de timing no campo dataExit", () => {
      expect(() =>
        validateProposalDates({
          dataExit: "Proxima janela",
        }),
      ).toThrow("dataExit deve ser uma data válida");
    });

    it("não permite valor de timing no campo agreementDate", () => {
      expect(() =>
        validateProposalDates({
          agreementDate: "Proxima temporada",
        }),
      ).toThrow("agreementDate deve ser uma data válida");
    });

    it("valida com sucesso quando timing é válido e datas estão no formato DD/MM/AAAA", () => {
      expect(() =>
        validateProposalDates({
          timing: "Imediata",
          agreementDate: "01/07/2026",
          dataArrival: "01/07/2026",
        }),
      ).not.toThrow();

      expect(() =>
        validateProposalDates({
          timing: "Proxima janela",
          agreementDate: "15/01/2027",
          dataExit: "15/01/2027",
        }),
      ).not.toThrow();
    });
  });
});

