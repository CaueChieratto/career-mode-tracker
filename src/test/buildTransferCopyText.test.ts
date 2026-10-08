import { describe, expect, it } from "vitest";
import { Career } from "../common/interfaces/Career";
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

  it("gera texto correto para contratação a custo zero de um clube específico (chegada a custo zero)", () => {
    const player: Players = {
      id: "p-free-club",
      name: "Marcos Leonardo",
      position: "ATA",
      age: 21,
      nation: "BRA",
      contractTime: 3,
      salary: 50000,
      buy: true,
      sell: false,
      loan: false,
      incomingLoan: false,
      contract: [],
    } as unknown as Players;

    const contract: Contract = {
      fromClub: "Santos",
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
      "Marcos Leonardo, ATA, 21 anos, BRA, 3 anos de contrato com um salario semanal de 50 mil, foi contratado do Santos a custo zero.",
    );
  });

  it("gera texto correto para retorno de empréstimo concedido (Loan Out Return)", () => {
    const player: Players = {
      id: "p-loan-out-return",
      name: "Reinier",
      position: "MEI",
      age: 22,
      nation: "BRA",
      contractTime: 2,
      salary: 40000,
      buy: false,
      sell: false,
      loan: false,
      incomingLoan: false,
      contract: [
        {
          fromClub: "Flamengo",
          buyValue: 30000000,
          leftClub: "Girona",
          sellValue: 0,
          isLoan: true,
          dataArrival: new Date("2023-01-01"),
          dataExit: new Date("2024-06-30"),
        },
      ],
    } as unknown as Players;

    const contract: Contract = {
      fromClub: "Girona",
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

    expect(text).toBe("Reinier, MEI, 22 anos, BRA, retornou de empréstimo do Girona.");
  });

  it("gera texto correto de retorno de empréstimo para jogador que tem buy: true", () => {
    const player: Players = {
      id: "p-bought-and-loaned",
      name: "Reinier",
      position: "MEI",
      age: 22,
      nation: "BRA",
      contractTime: 3,
      salary: 30000,
      sector: "Meio-Campo",
      shirtNumber: "19",
      overall: 76,
      playerValue: 12000000,
      buy: true,
      captain: false,
      sell: false,
      loan: false,
      incomingLoan: false,
      contract: [
        {
          fromClub: "Flamengo",
          buyValue: 30000000,
          leftClub: "Girona",
          sellValue: 0,
          isLoan: true,
          dataArrival: new Date("2023-01-01"),
          dataExit: new Date("2024-06-30"),
        },
      ],
    } as unknown as Players;

    const contract: Contract = {
      fromClub: "Girona",
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

    expect(text).toBe("Reinier, MEI, 22 anos, BRA, retornou de empréstimo do Girona.");
  });

  it("gera texto de retorno de empréstimo quando prior loan está em fullContractHistory", () => {
    const loanContract: Contract = {
      fromClub: "Flamengo",
      buyValue: 30000000,
      leftClub: "Girona",
      sellValue: 0,
      isLoan: true,
      dataArrival: new Date("2023-01-01"),
      dataExit: new Date("2024-06-30"),
    };
    const arrivalContract: Contract = {
      fromClub: "Girona",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2024-07-01"),
      dataExit: null,
    };

    const player = {
      id: "p-filtered",
      name: "Reinier",
      position: "MEI",
      age: 22,
      nation: "BRA",
      contractTime: 3,
      salary: 30000,
      sector: "Meio-Campo",
      shirtNumber: "19",
      overall: 76,
      playerValue: 12000000,
      buy: true,
      captain: false,
      sell: false,
      loan: false,
      incomingLoan: false,
      contract: [arrivalContract],
      fullContractHistory: [loanContract, arrivalContract],
    } as unknown as Players;

    const text = buildTransferCopyText({
      player,
      contract: arrivalContract,
      direction: "arrivals",
      currency: "EUR",
    });

    expect(text).toBe("Reinier, MEI, 22 anos, BRA, retornou de empréstimo do Girona.");
  });

  it("gera texto de retorno de empréstimo quando o jogador estava emprestado na temporada anterior no Career", () => {
    const arrivalContract: Contract = {
      fromClub: "Girona",
      leftClub: "",
      buyValue: 0,
      sellValue: 0,
      dataArrival: new Date("2024-07-01"),
      dataExit: null,
    };

    const player = {
      id: "p-interseason",
      name: "Reinier",
      position: "MEI",
      age: 22,
      nation: "BRA",
      contractTime: 3,
      salary: 30000,
      sector: "Meio-Campo",
      shirtNumber: "19",
      overall: 76,
      playerValue: 12000000,
      buy: false,
      contract: [arrivalContract],
    } as unknown as Players;

    const mockCareer = {
      id: "c-1",
      createdAt: new Date("2023-07-01"),
      nation: "Espanha",
      currency: "€",
      clubData: [
        {
          id: "s-1",
          seasonNumber: 1,
          players: [
            {
              id: "p-interseason",
              name: "Reinier",
              loan: true,
              contract: [{ leftClub: "Girona", isLoan: true }],
            },
          ],
        },
        {
          id: "s-2",
          seasonNumber: 2,
          players: [player],
        },
      ],
    } as unknown as Career;

    const text = buildTransferCopyText({
      player,
      contract: arrivalContract,
      direction: "arrivals",
      currency: "EUR",
      career: mockCareer,
      season: mockCareer.clubData[1],
    });

    expect(text).toBe("Reinier, MEI, 22 anos, BRA, retornou de empréstimo do Girona.");
  });

  it("gera texto correto para fim de empréstimo recebido (Incoming Loan Return Exit)", () => {
    const player: Players = {
      id: "p-incoming-loan-return-exit",
      name: "Endrick",
      position: "ATA",
      age: 18,
      nation: "BRA",
      contractTime: 1,
      salary: 100000,
      buy: false,
      sell: true,
      loan: false,
      incomingLoan: false,
      contract: [
        {
          fromClub: "Real Madrid",
          buyValue: 0,
          leftClub: "Real Madrid",
          sellValue: 0,
          isLoan: true,
          dataArrival: new Date("2024-07-01"),
          dataExit: new Date("2025-06-30"),
        },
      ],
    } as unknown as Players;

    const contract = player.contract![0];

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "exit",
      currency: "EUR",
    });

    expect(text).toBe(
      "Endrick, ATA, 18 anos, BRA, retornou ao Real Madrid após o fim do empréstimo.",
    );
  });

  it("gera texto correto para saída a custo zero para um clube específico", () => {
    const player: Players = {
      id: "p-exit-free",
      name: "Veterano",
      position: "VOL",
      age: 33,
      nation: "BRA",
      contractTime: 1,
      salary: 20000,
      buy: false,
      sell: true,
      loan: false,
      incomingLoan: false,
      contract: [],
    } as unknown as Players;

    const contract: Contract = {
      fromClub: "",
      leftClub: "Coritiba",
      buyValue: 0,
      sellValue: 0,
      dataArrival: null,
      dataExit: new Date("2024-08-01"),
    };

    const text = buildTransferCopyText({
      player,
      contract,
      direction: "exit",
      currency: "EUR",
    });

    expect(text).toBe("Veterano, VOL, 33 anos, BRA, foi transferido ao Coritiba a custo zero.");
  });
});
