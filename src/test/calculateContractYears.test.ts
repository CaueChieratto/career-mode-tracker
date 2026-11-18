import { describe, expect, it } from "vitest";
import {
  calculateContractYears,
  getPlayerOriginalContractYears,
} from "../common/utils/calculateContractYears";

describe("calculateContractYears", () => {
  it("calcula 5 anos para 31/07/2031 em temporada europeia com createdAt 01/07/2026", () => {
    const years = calculateContractYears(
      "31/07/2031",
      new Date(2026, 6, 1),
      1,
      "Inglaterra",
    );
    expect(years).toBe(5);
  });

  it("calcula 5 anos para 30/06/2031 em temporada europeia com createdAt 01/07/2026", () => {
    const years = calculateContractYears(
      "30/06/2031",
      new Date(2026, 6, 1),
      1,
      "Inglaterra",
    );
    expect(years).toBe(5);
  });

  it("calcula 1 ano para 31/07/2027", () => {
    const years = calculateContractYears(
      "31/07/2027",
      new Date(2026, 6, 1),
      1,
      "Inglaterra",
    );
    expect(years).toBe(1);
  });

  it("calcula 4 anos restantes na temporada 2 para contrato até 31/07/2031", () => {
    const years = calculateContractYears(
      "31/07/2031",
      new Date(2026, 6, 1),
      2,
      "Inglaterra",
    );
    expect(years).toBe(4);
  });

  it("suporta ano com 2 dígitos '31/07/31'", () => {
    const years = calculateContractYears(
      "31/07/31",
      new Date(2026, 6, 1),
      1,
      "Inglaterra",
    );
    expect(years).toBe(5);
  });

  it("calcula 5 anos para temporada não-europeia com createdAt 01/01/2026 e contrato até 31/12/2031", () => {
    const years = calculateContractYears(
      "31/12/2031",
      new Date(2026, 0, 1),
      1,
      "Brasil",
    );
    expect(years).toBe(5);
  });

  it("retorna 0 para datas incompletas ou inválidas", () => {
    expect(calculateContractYears("")).toBe(0);
    expect(calculateContractYears(null)).toBe(0);
    expect(calculateContractYears("31/07")).toBe(0);
    expect(calculateContractYears("invalid")).toBe(0);
    expect(calculateContractYears("32/01/2030")).toBe(0);
    expect(calculateContractYears("01/13/2030")).toBe(0);
  });
});

describe("getPlayerOriginalContractYears", () => {
  it("retorna contractTime direto do jogador quando presente", () => {
    const player = { contractTime: 2 };
    expect(getPlayerOriginalContractYears(player)).toBe(2);
  });

  it("calcula a partir de contractUntil quando contractTime não estiver presente", () => {
    const player = { contractUntil: "31/07/2028" };
    const years = getPlayerOriginalContractYears(
      player,
      new Date(2026, 6, 1),
      1,
      "Inglaterra",
    );
    expect(years).toBe(2);
  });

  it("recupera previousContractTime do contrato de renovação", () => {
    const player = {
      contractTime: 3,
      contract: [
        {
          previousContractTime: 2,
          contractTime: 3,
        },
      ],
    };
    expect(getPlayerOriginalContractYears(player, null, 1, "", 0)).toBe(2);
  });

  it("retorna 0 para jogador nulo ou indefinido", () => {
    expect(getPlayerOriginalContractYears(null)).toBe(0);
    expect(getPlayerOriginalContractYears(undefined)).toBe(0);
  });
});


