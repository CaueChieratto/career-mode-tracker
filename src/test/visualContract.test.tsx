// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Match } from "../common/interfaces/Match";
import FooterSection_Player from "../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/components/FooterSection_Player";
import { getVisualContract } from "../layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/components/FooterSection_Player/utils/getVisualContract";

const makeMatch = (date: string, status: "FINISHED" | "SCHEDULED" = "FINISHED"): Match => ({
  matchesId: "m1",
  date,
  league: "Liga",
  homeTeam: "Time A",
  awayTeam: "Time B",
  result: "V",
  status,
});

describe("getVisualContract - Continent Calendar Contract Calculation", () => {
  describe("Calendário Europeu (Europa: Julho -> Junho)", () => {
    it("sem partidas finalizadas retorna o contrato original", () => {
      expect(getVisualContract(3, [], true)).toBe("3 Anos");
      expect(getVisualContract(3, [], "Inglaterra")).toBe("3 Anos");
    });

    it("em Julho (início da temporada) ainda restam 3 anos completos", () => {
      const matches = [makeMatch("15/07/24")];
      expect(getVisualContract(3, matches, true)).toBe("3 Anos");
      expect(getVisualContract(3, matches, "Inglaterra")).toBe("3 Anos");
      expect(getVisualContract(3, matches, "Espanha")).toBe("3 Anos");
    });

    it("em Janeiro (meio da temporada européia, 6 meses passados) contrato de 3 anos = 2 anos e 6 meses (2A. 6M.)", () => {
      const matches = [makeMatch("15/01/25")];
      expect(getVisualContract(3, matches, true)).toBe("2A. 6M.");
      expect(getVisualContract(3, matches, "Inglaterra")).toBe("2A. 6M.");
      expect(getVisualContract(3, matches, "Alemanha")).toBe("2A. 6M.");
    });

    it("em Junho (fim da temporada européia, 11 meses passados) contrato de 3 anos = 2A. 1M.", () => {
      const matches = [makeMatch("10/06/25")];
      expect(getVisualContract(3, matches, true)).toBe("2A. 1M.");
    });

    it("para contrato de 1 ano em Janeiro na Europa restam 6 Meses", () => {
      const matches = [makeMatch("20/01/25")];
      expect(getVisualContract(1, matches, true)).toBe("6 Meses");
    });

    it("para contrato de 1 ano em Junho na Europa resta 1 Mês", () => {
      const matches = [makeMatch("20/06/25")];
      expect(getVisualContract(1, matches, true)).toBe("1 Mês");
    });
  });

  describe("Calendário Não Europeu (ex: Brasil / América do Sul: Janeiro -> Dezembro)", () => {
    it("sem partidas finalizadas retorna o contrato original", () => {
      expect(getVisualContract(3, [], false)).toBe("3 Anos");
      expect(getVisualContract(3, [], "Brasil")).toBe("3 Anos");
    });

    it("em Janeiro (início da temporada não européia, 0 meses passados) contrato de 3 anos = 3 Anos", () => {
      const matches = [makeMatch("15/01/25")];
      expect(getVisualContract(3, matches, false)).toBe("3 Anos");
      expect(getVisualContract(3, matches, "Brasil")).toBe("3 Anos");
      expect(getVisualContract(3, matches, "Argentina")).toBe("3 Anos");
    });

    it("em Fevereiro (1 mês passado) contrato de 3 anos = 2A. 11M.", () => {
      const matches = [makeMatch("15/02/25")];
      expect(getVisualContract(3, matches, "Brasil")).toBe("2A. 11M.");
    });

    it("em Julho (meio da temporada não européia, 6 meses passados) contrato de 3 anos = 2A. 6M.", () => {
      const matches = [makeMatch("15/07/25")];
      expect(getVisualContract(3, matches, false)).toBe("2A. 6M.");
      expect(getVisualContract(3, matches, "Brasil")).toBe("2A. 6M.");
    });

    it("em Dezembro (fim da temporada não européia, 11 meses passados) contrato de 3 anos = 2A. 1M.", () => {
      const matches = [makeMatch("05/12/25")];
      expect(getVisualContract(3, matches, "Brasil")).toBe("2A. 1M.");
    });

    it("para contrato de 1 ano em Janeiro no Brasil resta 1 Ano", () => {
      const matches = [makeMatch("20/01/25")];
      expect(getVisualContract(1, matches, "Brasil")).toBe("1 Ano");
    });

    it("para contrato de 1 ano em Julho no Brasil restam 6 Meses", () => {
      const matches = [makeMatch("20/07/25")];
      expect(getVisualContract(1, matches, "Brasil")).toBe("6 Meses");
    });
  });

  describe("Expiração de Contrato", () => {
    it("retorna 'Expirado' quando o tempo restante é 0 ou menor", () => {
      const matches = [makeMatch("15/01/26")];
      expect(getVisualContract(0, matches, true)).toBe("Expirado");
      expect(getVisualContract(0, matches, false)).toBe("Expirado");
    });
  });

  describe("Contratos Decimais (1.6 e 0.6)", () => {
    it("1.6 sem partidas finalizadas exibe 1A. 6M.", () => {
      expect(getVisualContract(1.6, [], "Argentina")).toBe("1A. 6M.");
    });

    it("1.6 com 1 mês decorrido desconta do número após o ponto (1A. 5M.)", () => {
      const matches = [makeMatch("15/02/25")];
      expect(getVisualContract(1.6, matches, "Argentina")).toBe("1A. 5M.");
    });

    it("1.6 com 2 meses decorridos exibe 1A. 4M.", () => {
      const matches = [makeMatch("15/03/25")];
      expect(getVisualContract(1.6, matches, "Argentina")).toBe("1A. 4M.");
    });

    it("1.6 com 6 meses decorridos desconta todos os meses após o ponto e exibe 1 Ano", () => {
      const matches = [makeMatch("15/07/25")];
      expect(getVisualContract(1.6, matches, "Argentina")).toBe("1 Ano");
    });

    it("1.6 com 7 meses decorridos passa a descontar dos 12 meses restantes e exibe 11 Meses", () => {
      const matches = [makeMatch("15/08/25")];
      expect(getVisualContract(1.6, matches, "Argentina")).toBe("11 Meses");
    });

    it("0.6 sem partidas finalizadas exibe 6 Meses", () => {
      expect(getVisualContract(0.6, [], "Argentina")).toBe("6 Meses");
    });

    it("0.6 com 1 mês decorrido exibe 5 Meses", () => {
      const matches = [makeMatch("15/02/25")];
      expect(getVisualContract(0.6, matches, "Argentina")).toBe("5 Meses");
    });

    it("0.6 com 5 meses decorridos exibe 1 Mês", () => {
      const matches = [makeMatch("15/06/25")];
      expect(getVisualContract(0.6, matches, "Argentina")).toBe("1 Mês");
    });

    it("0.6 com 6 meses decorridos exibe Expirado", () => {
      const matches = [makeMatch("15/07/25")];
      expect(getVisualContract(0.6, matches, "Argentina")).toBe("Expirado");
    });
  });
});

describe("FooterSection_Player Component", () => {
  it("renderiza contrato de 2A. 6M. em Janeiro para carreira Européia (Inglaterra)", () => {
    const matches = [makeMatch("15/01/25")];

    render(
      <FooterSection_Player
        playerValue={1000000}
        salary={50000}
        contractTime={3}
        matches={matches}
        currency="€"
        careerNation="Inglaterra"
      />,
    );

    expect(screen.getByText("2A. 6M.")).toBeTruthy();
  });

  it("renderiza contrato de 3 Anos em Janeiro para carreira Não Européia (Brasil)", () => {
    const matches = [makeMatch("15/01/25")];

    render(
      <FooterSection_Player
        playerValue={1000000}
        salary={50000}
        contractTime={3}
        matches={matches}
        currency="R$"
        careerNation="Brasil"
      />,
    );

    expect(screen.getByText("3 Anos")).toBeTruthy();
  });
});
