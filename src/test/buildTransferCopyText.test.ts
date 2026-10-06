import { describe, expect, it } from "vitest";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import {
  buildTransferCopyText,
  formatNationCode,
  formatSalaryAmount,
  formatWrittenAmount,
  getCurrencyWords,
} from "../components/TransfersModal/components/TransfersPanel/utils/buildTransferCopyText";

describe("buildTransferCopyText helpers", () => {
  it("converte países para sigla FIFA de 3 letras", () => {
    expect(formatNationCode("ARG")).toBe("ARG");
    expect(formatNationCode("Argentina")).toBe("ARG");
    expect(formatNationCode("Brasil")).toBe("BRA");
    expect(formatNationCode("Brazil")).toBe("BRA");
    expect(formatNationCode("Alemanha")).toBe("GER");
    expect(formatNationCode("França")).toBe("FRA");
    expect(formatNationCode("Inglaterra")).toBe("ENG");
    expect(formatNationCode("Espanha")).toBe("ESP");
    expect(formatNationCode("Portugal")).toBe("POR");
    expect(formatNationCode("Itália")).toBe("ITA");
    expect(formatNationCode("Uruguai")).toBe("URU");
  });

  it("formata valores por extenso com a moeda correta", () => {
    const euro = getCurrencyWords("EUR");
    const libra = getCurrencyWords("GBP");
    const dolar = getCurrencyWords("USD");
    const real = getCurrencyWords("BRL");

    expect(formatWrittenAmount(7000000, euro)).toBe("7 milhões de euros");
    expect(formatWrittenAmount(1000000, euro)).toBe("1 milhão de euros");
    expect(formatWrittenAmount(500000, euro)).toBe("500 mil euros");
    expect(formatWrittenAmount(7000000, libra)).toBe("7 milhões de libras");
    expect(formatWrittenAmount(7000000, dolar)).toBe("7 milhões de dólares");
    expect(formatWrittenAmount(7000000, real)).toBe("7 milhões de reais");
    expect(formatWrittenAmount(0, euro)).toBe("custo zero");
  });

  it("formata salário por extenso sem repetir moeda", () => {
    expect(formatSalaryAmount(45000)).toBe("45 mil");
    expect(formatSalaryAmount(120000)).toBe("120 mil");
    expect(formatSalaryAmount(1000000)).toBe("1 milhão");
    expect(formatSalaryAmount(2000000)).toBe("2 milhões");
    expect(formatSalaryAmount(500)).toBe("500");
  });
});

describe("buildTransferCopyText - Formato exato solicitado pelo usuário", () => {
  it("gera texto idêntico ao solicitado para Contratação definitiva (Compra)", () => {
    const player: Players = {
      id: "p1",
      name: "Augustín Palavecino",
      position: "MC",
      age: 29,
      nation: "ARG",
      contractTime: 4,
      salary: 45000,
      sector: "Meio-Campo",
      shirtNumber: "8",
      overall: 78,
      playerValue: 7000000,
      buy: true,
      captain: false,
      sell: false,
      ballonDor: 0,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "Cruz Azul",
      leftClub: "",
      buyValue: 7000000,
      sellValue: 0,
      dataArrival: new Date("2024-07-01"),
      dataExit: null,
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "arrivals",
      currency: "EUR",
    });

    expect(text).toBe(
      "Augustín Palavecino, MC, 29 anos, ARG, 4 anos de contrato com um salario semanal de 45 mil, foi contratado do Cruz Azul por 7 milhões de euros.",
    );
  });

  it("gera texto idêntico ao solicitado para Venda definitiva", () => {
    const player: Players = {
      id: "p1",
      name: "Augustín Palavecino",
      position: "MC",
      age: 29,
      nation: "ARG",
      contractTime: 4,
      salary: 45000,
      sector: "Meio-Campo",
      shirtNumber: "8",
      overall: 78,
      playerValue: 7000000,
      buy: false,
      captain: false,
      sell: true,
      ballonDor: 0,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "",
      leftClub: "Cruz Azul",
      buyValue: 0,
      sellValue: 7000000,
      dataArrival: null,
      dataExit: new Date("2024-07-01"),
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "exit",
      currency: "EUR",
    });

    expect(text).toBe(
      "Augustín Palavecino, MC, 29 anos, ARG, foi vendido ao Cruz Azul por 7 milhões de euros.",
    );
  });

  it("gera texto para venda com moeda em Reais (BRL)", () => {
    const player: Players = {
      id: "p1",
      name: "Gabriel Barbosa",
      position: "ATA",
      age: 27,
      nation: "BRA",
      contractTime: 2,
      salary: 1500000,
      sector: "Ataque",
      shirtNumber: "9",
      overall: 80,
      playerValue: 15000000,
      buy: false,
      captain: false,
      sell: true,
      ballonDor: 0,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "",
      leftClub: "Flamengo",
      buyValue: 0,
      sellValue: 15000000,
      dataArrival: null,
      dataExit: new Date("2024-07-01"),
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "exit",
      currency: "BRL",
    });

    expect(text).toBe(
      "Gabriel Barbosa, ATA, 27 anos, BRA, foi vendido ao Flamengo por 15 milhões de reais.",
    );
  });

  it("gera texto para contratação promovida da base", () => {
    const player: Players = {
      id: "p-base",
      name: "Lucas Silva",
      position: "ZAG",
      age: 18,
      nation: "BRA",
      contractTime: 3,
      salary: 5000,
      sector: "Defesa",
      shirtNumber: "33",
      overall: 65,
      playerValue: 1000000,
      buy: false,
      captain: false,
      sell: false,
      ballonDor: 0,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "Base",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2024-08-01"),
      dataExit: null,
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "arrivals",
      currency: "EUR",
    });

    expect(text).toBe(
      "Lucas Silva, ZAG, 18 anos, BRA, 3 anos de contrato com um salario semanal de 5 mil, foi promovido da base.",
    );
  });

  it("gera texto para contratação a custo zero (Passes Livres)", () => {
    const player: Players = {
      id: "p-free",
      name: "Lionel Messi",
      position: "MD",
      age: 36,
      nation: "ARG",
      contractTime: 2,
      salary: 200000,
      sector: "Ataque",
      shirtNumber: "10",
      overall: 90,
      playerValue: 30000000,
      buy: false,
      captain: false,
      sell: false,
      ballonDor: 8,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "Passes Livres",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2024-07-01"),
      dataExit: null,
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "arrivals",
      currency: "EUR",
    });

    expect(text).toBe(
      "Lionel Messi, MD, 36 anos, ARG, 2 anos de contrato com um salario semanal de 200 mil, foi contratado a custo zero.",
    );
  });

  it("gera texto para contratação por empréstimo (Chegada)", () => {
    const player: Players = {
      id: "p-loan-in",
      name: "João Félix",
      position: "SA",
      age: 24,
      nation: "POR",
      contractTime: 1,
      salary: 80000,
      sector: "Ataque",
      shirtNumber: "14",
      overall: 82,
      playerValue: 25000000,
      buy: false,
      captain: false,
      sell: false,
      incomingLoan: true,
      ballonDor: 0,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "Atlético Madrid",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      isLoan: true,
      loanDuration: 1,
      dataArrival: new Date("2024-07-01"),
      dataExit: null,
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "arrivals",
      currency: "EUR",
    });

    expect(text).toBe(
      "João Félix, SA, 24 anos, POR, 1 ano de empréstimo com um salario semanal de 80 mil, foi contratado por empréstimo do Atlético Madrid.",
    );
  });

  it("gera texto para empréstimo concedido (Saída)", () => {
    const player: Players = {
      id: "p-loan-out",
      name: "Endrick",
      position: "ATA",
      age: 18,
      nation: "BRA",
      contractTime: 5,
      salary: 60000,
      sector: "Ataque",
      shirtNumber: "16",
      overall: 77,
      playerValue: 35000000,
      buy: false,
      captain: false,
      sell: false,
      loan: true,
      ballonDor: 0,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "",
      leftClub: "Real Valladolid",
      buyValue: 0,
      sellValue: 0,
      isLoan: true,
      loanDuration: 1,
      dataArrival: null,
      dataExit: new Date("2024-07-01"),
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "exit",
      currency: "EUR",
    });

    expect(text).toBe(
      "Endrick, ATA, 18 anos, BRA, foi emprestado ao Real Valladolid por 1 ano.",
    );
  });

  it("gera texto para aposentadoria (Saída)", () => {
    const player: Players = {
      id: "p-ret",
      name: "Toni Kroos",
      position: "MC",
      age: 34,
      nation: "Alemanha",
      contractTime: 1,
      salary: 150000,
      sector: "Meio-Campo",
      shirtNumber: "8",
      overall: 88,
      playerValue: 10000000,
      buy: false,
      captain: false,
      sell: false,
      ballonDor: 0,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "",
      leftClub: "Aposentadoria",
      buyValue: 0,
      sellValue: 0,
      dataArrival: null,
      dataExit: new Date("2024-07-01"),
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "exit",
      currency: "EUR",
    });

    expect(text).toBe("Toni Kroos, MC, 34 anos, GER, se aposentou do futebol.");
  });

  it("gera texto para saída em fim de contrato", () => {
    const player: Players = {
      id: "p-end",
      name: "Kylian Mbappé",
      position: "ATA",
      age: 25,
      nation: "França",
      contractTime: 1,
      salary: 300000,
      sector: "Ataque",
      shirtNumber: "7",
      overall: 91,
      playerValue: 180000000,
      buy: false,
      captain: false,
      sell: false,
      ballonDor: 0,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "",
      leftClub: "Fim de Contrato",
      buyValue: 0,
      sellValue: 0,
      dataArrival: null,
      dataExit: new Date("2024-07-01"),
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "exit",
      currency: "EUR",
    });

    expect(text).toBe(
      "Kylian Mbappé, ATA, 25 anos, FRA, deixou o clube em fim de contrato.",
    );
  });

  it("gera texto correto para jogador da base promovido e depois emprestado (Chegada: promovido da base, Saída: emprestado)", () => {
    const player: Players = {
      id: "academy-e4136303-7b35-4458-a8f7-dce010dde1c2",
      name: "Base 2",
      position: "ATA",
      age: 17,
      nation: "GHA",
      contractTime: 5,
      salary: 35000,
      sector: "Atacantes",
      shirtNumber: "",
      overall: 65,
      playerValue: 1500000,
      buy: true,
      captain: false,
      sell: false,
      loan: true,
      incomingLoan: false,
      ballonDor: 0,
      contract: [],
      statsLeagues: [],
    };

    const contract: Contract = {
      fromClub: "Base",
      leftClub: "AJ Auxerre",
      buyValue: 0,
      sellValue: 0,
      isLoan: true,
      loanDuration: 1,
      wagePercentage: 50,
      dataArrival: new Date("2030-03-01T03:00:00.000Z"),
      dataExit: new Date("2030-01-10T03:00:00.000Z"),
    };

    // Chegadas deve ser promovido da base
    const arrivalText = buildTransferCopyText({
      player,
      contract,
      direction: "arrivals",
      currency: "EUR",
    });
    expect(arrivalText).toBe(
      "Base 2, ATA, 17 anos, GHA, 5 anos de contrato com um salario semanal de 35 mil, foi promovido da base.",
    );

    // Saídas deve ser empréstimo ao AJ Auxerre por 1 ano
    const exitText = buildTransferCopyText({
      player,
      contract,
      direction: "exit",
      currency: "EUR",
    });
    expect(exitText).toBe(
      "Base 2, ATA, 17 anos, GHA, foi emprestado ao AJ Auxerre por 1 ano.",
    );
  });
});
