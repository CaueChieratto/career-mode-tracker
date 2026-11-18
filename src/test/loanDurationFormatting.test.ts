import { describe, it, expect } from "vitest";
import { parseLoanDuration } from "../common/utils/parseLoanDuration";
import {
  getContractInMonths,
  formatContractDisplay,
} from "../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/components/FooterSection_Player/utils/FormatContract";
import { getVisualContract } from "../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/components/FooterSection_Player/utils/getVisualContract";
import { Match } from "../common/interfaces/Match";

const createMockMatch = (date: string): Match => ({
  matchesId: "m-test",
  date,
  league: "La Liga",
  homeTeam: "FC Barcelona",
  awayTeam: "RCD Espanyol",
  result: "V",
  status: "FINISHED",
});

describe("loanDurationFormatting & parseLoanDuration", () => {
  describe("parseLoanDuration", () => {
    it("parseia durações válidas com vírgula ou ponto", () => {
      expect(parseLoanDuration("1,6")).toBe(1.6);
      expect(parseLoanDuration("1.6")).toBe(1.6);
      expect(parseLoanDuration("0,6")).toBe(0.6);
      expect(parseLoanDuration("0.6")).toBe(0.6);
      expect(parseLoanDuration("1")).toBe(1);
      expect(parseLoanDuration("2")).toBe(2);
      expect(parseLoanDuration(1.6)).toBe(1.6);
      expect(parseLoanDuration(0.6)).toBe(0.6);
      expect(parseLoanDuration(1)).toBe(1);
      expect(parseLoanDuration(2)).toBe(2);
    });

    it("suporta equivalentes de 1.5 e 0.5 convertendo para 18 e 6 meses", () => {
      expect(parseLoanDuration("1,5")).toBe(1.6);
      expect(parseLoanDuration("1.5")).toBe(1.6);
      expect(parseLoanDuration("0,5")).toBe(0.6);
      expect(parseLoanDuration("0.5")).toBe(0.6);
    });

    it("rejeita entradas inválidas retornando null", () => {
      expect(parseLoanDuration(null)).toBeNull();
      expect(parseLoanDuration(undefined)).toBeNull();
      expect(parseLoanDuration("")).toBeNull();
      expect(parseLoanDuration("   ")).toBeNull();
      expect(parseLoanDuration("abc")).toBeNull();
      expect(parseLoanDuration("3")).toBeNull();
      expect(parseLoanDuration(0)).toBeNull();
      expect(parseLoanDuration(-1)).toBeNull();
    });
  });

  describe("FormatContract display", () => {
    it("converte 1.6 para 18 meses e exibe 1A. 6M.", () => {
      expect(getContractInMonths(1.6)).toBe(18);
      expect(formatContractDisplay(1.6)).toBe("1A. 6M.");
    });

    it("converte 0.6 para 6 meses e exibe 6 Meses", () => {
      expect(getContractInMonths(0.6)).toBe(6);
      expect(formatContractDisplay(0.6)).toBe("6 Meses");
    });
  });

  describe("getVisualContract com chegada no meio da temporada", () => {
    it("não antecipa término para empréstimo de 6 meses (0.6) chegado em Janeiro na Europa", () => {
      const matchInJan = [createMockMatch("15/01/25")];
      // Sem data de chegada, Janeiro seria 6 meses após Julho -> consumiria 6 meses e daria Expirado
      expect(getVisualContract(0.6, matchInJan, true)).toBe("Expirado");

      // Com data de chegada em Janeiro/25, o atleta acabou de chegar -> exibe 6 Meses!
      expect(getVisualContract(0.6, matchInJan, true, "10/01/25")).toBe("6 Meses");
    });

    it("desconta meses adequadamente a partir da chegada do atleta", () => {
      const matchInFeb = [createMockMatch("15/02/25")];
      // Chegou em Janeiro/25, partida em Fevereiro/25 -> resta 5 Meses
      expect(getVisualContract(0.6, matchInFeb, true, "10/01/25")).toBe("5 Meses");

      const matchInMay = [createMockMatch("20/05/25")];
      // 4 meses decorridos -> resta 2 Meses
      expect(getVisualContract(0.6, matchInMay, true, "10/01/25")).toBe("2 Meses");

      const matchInJun = [createMockMatch("20/06/25")];
      // 5 meses decorridos -> resta 1 Mês
      expect(getVisualContract(0.6, matchInJun, true, "10/01/25")).toBe("1 Mês");

      const matchInJul = [createMockMatch("15/07/25")];
      // 6 meses decorridos -> Expirado
      expect(getVisualContract(0.6, matchInJul, true, "10/01/25")).toBe("Expirado");
    });

    it("suporta chegada com 1.6 (18 meses) em Janeiro na Europa", () => {
      const matchInJan = [createMockMatch("15/01/25")];
      expect(getVisualContract(1.6, matchInJan, true, "10/01/25")).toBe("1A. 6M.");

      const matchInFeb = [createMockMatch("15/02/25")];
      expect(getVisualContract(1.6, matchInFeb, true, "10/01/25")).toBe("1A. 5M.");
    });
  });
});
