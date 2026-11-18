import { describe, expect, it } from "vitest";
import { buildNextSeasonPlayers } from "../common/services/ServiceSeasons/helpers/buildNextSeasonPlayers";
import type { Players } from "../common/interfaces/playersInfo/players";
import type { Contract } from "../common/interfaces/playersInfo/contract";

describe("buildNextSeasonPlayers (FC Barcelona)", () => {
  const baseOptions = {
    seasonNumber: 2,
    careerCreatedAt: "2024-07-01",
    careerNation: "Espanha",
    previousSeasonNumber: 1,
  };

  const nextSeasonStartDate = new Date("2025-07-01");

  it("incrementa idade em +1 e decrementa tempo de contrato em 1 ano para atletas mantidos", () => {
    const yamal: Players = {
      id: "yamal_fcb_19",
      name: "Lamine Yamal",
      age: 17,
      contractTime: 4,
      position: "PD",
      sector: "Ataque",
      nation: "Espanha",
      shirtNumber: "19",
      overall: 83,
      ballonDor: 0,
      buy: false,
      captain: false,
      sell: false,
      statsLeagues: [],
      contract: [
        {
          id: "c_yamal_1",
          isLoan: false,
          club: "FC Barcelona",
          wage: 50000,
        } as unknown as Contract,
      ],
    };

    const gavi: Players = {
      id: "gavi_fcb_6",
      name: "Gavi",
      age: 20,
      contractTime: 3,
      position: "MC",
      sector: "Meio-Campo",
      nation: "Espanha",
      shirtNumber: "6",
      overall: 84,
      ballonDor: 0,
      buy: false,
      captain: false,
      sell: false,
      statsLeagues: [],
      contract: [
        {
          id: "c_gavi_1",
          isLoan: false,
          club: "FC Barcelona",
          wage: 80000,
        } as unknown as Contract,
      ],
    };

    const result = buildNextSeasonPlayers(
      [yamal, gavi],
      nextSeasonStartDate,
      baseOptions,
    );

    expect(result).toHaveLength(2);

    const resultYamal = result.find((p) => p.id === yamal.id)!;
    expect(resultYamal.age).toBe(18);
    expect(resultYamal.contractTime).toBe(3);

    const resultGavi = result.find((p) => p.id === gavi.id)!;
    expect(resultGavi.age).toBe(21);
    expect(resultGavi.contractTime).toBe(2);
  });

  it("trata contratos expirados reduzindo contractTime para 0 sem negativar", () => {
    const cubarsi: Players = {
      id: "cubarsi_fcb_2",
      name: "Pau Cubarsí",
      age: 18,
      contractTime: 1,
      position: "ZAG",
      sector: "Defesa",
      nation: "Espanha",
      shirtNumber: "2",
      overall: 80,
      ballonDor: 0,
      buy: false,
      captain: false,
      sell: false,
      statsLeagues: [],
      contract: [
        {
          id: "c_cubarsi_1",
          isLoan: false,
          club: "FC Barcelona",
          wage: 40000,
        } as unknown as Contract,
      ],
    };

    const result = buildNextSeasonPlayers(
      [cubarsi],
      nextSeasonStartDate,
      baseOptions,
    );

    expect(result).toHaveLength(1);
    expect(result[0].age).toBe(19);
    expect(result[0].contractTime).toBe(0);
  });

  it("limpa dados sazonais da temporada anterior zerando ballonDor e esvaziando statsLeagues", () => {
    const pedri: Players = {
      id: "pedri_fcb_8",
      name: "Pedri",
      age: 22,
      contractTime: 3,
      position: "MC",
      sector: "Meio-Campo",
      nation: "Espanha",
      shirtNumber: "8",
      overall: 87,
      ballonDor: 1,
      buy: false,
      captain: false,
      sell: false,
      statsLeagues: [
        {
          leagueName: "La Liga",
          leagueImage: "laliga.png",
          stats: {
            games: 35,
            goals: 8,
            assists: 12,
            rating: 7.9,
            cleanSheets: 0,
            minutesPlayed: 2800,
            defenses: 0,
          },
        },
      ],
      contract: [
        {
          id: "c_pedri_1",
          isLoan: false,
          club: "FC Barcelona",
          wage: 150000,
        } as unknown as Contract,
      ],
    };

    const result = buildNextSeasonPlayers(
      [pedri],
      nextSeasonStartDate,
      baseOptions,
    );

    expect(result[0].ballonDor).toBe(0);
    expect(result[0].statsLeagues).toEqual([]);
  });

  it("amortiza parcelas financeiras pendentes e remove as totalmente quitadas", () => {
    const casado: Players = {
      id: "casado_fcb_17",
      name: "Marc Casadó",
      age: 21,
      contractTime: 3,
      position: "VOL",
      sector: "Meio-Campo",
      nation: "Espanha",
      shirtNumber: "17",
      overall: 78,
      ballonDor: 0,
      buy: false,
      captain: false,
      sell: false,
      statsLeagues: [],
      contract: [
        {
          id: "c_casado_1",
          isLoan: false,
          club: "FC Barcelona",
          installments: {
            id: "inst_casado_1",
            direction: "payable",
            status: "paid",
            percentage: 33,
            totalInstallments: 3,
            remainingInstallments: 3,
            annualInstallmentValue: 5000000,
            upfrontValue: 5000000,
            firstPaymentSeasonNumber: 1,
            partnerClub: "Real Sociedad",
          },
        } as unknown as Contract,
      ],
    };

    const balde: Players = {
      id: "balde_fcb_3",
      name: "Alejandro Balde",
      age: 21,
      contractTime: 4,
      position: "LE",
      sector: "Defesa",
      nation: "Espanha",
      shirtNumber: "3",
      overall: 82,
      ballonDor: 0,
      buy: false,
      captain: false,
      sell: false,
      statsLeagues: [],
      contract: [
        {
          id: "c_balde_1",
          isLoan: false,
          club: "FC Barcelona",
          installments: {
            id: "inst_balde_1",
            direction: "payable",
            status: "paid",
            percentage: 100,
            totalInstallments: 1,
            remainingInstallments: 1,
            annualInstallmentValue: 2000000,
            upfrontValue: 2000000,
            firstPaymentSeasonNumber: 1,
            partnerClub: "Valencia CF",
          },
        } as unknown as Contract,
      ],
    };

    const result = buildNextSeasonPlayers(
      [casado, balde],
      nextSeasonStartDate,
      baseOptions,
    );

    const resultCasado = result.find((p) => p.id === casado.id)!;
    expect(resultCasado.contract[0].installments).toBeDefined();
    expect(resultCasado.contract[0].installments?.remainingInstallments).toBe(2);
    expect(resultCasado.contract[0].installments?.status).toBe("pending");

    const resultBalde = result.find((p) => p.id === balde.id)!;
    expect(resultBalde.contract[0].installments).toBeUndefined();
  });

  it("expurga bonus liquidados ou expirados preservando os pendentes", () => {
    const deJong: Players = {
      id: "dejong_fcb_21",
      name: "Frenkie de Jong",
      age: 28,
      contractTime: 2,
      position: "MC",
      sector: "Meio-Campo",
      nation: "Holanda",
      shirtNumber: "21",
      overall: 87,
      ballonDor: 0,
      buy: false,
      captain: false,
      sell: false,
      statsLeagues: [],
      contract: [
        {
          id: "c_dejong_1",
          isLoan: false,
          club: "FC Barcelona",
          bonuses: [
            {
              id: "b_paid",
              direction: "payable",
              category: "objective",
              name: "Copa da Espanha",
              value: 1000000,
              status: "paid",
            },
            {
              id: "b_pending",
              direction: "payable",
              category: "objective",
              name: "Champions League",
              value: 2000000,
              status: "pending",
            },
          ],
        } as unknown as Contract,
      ],
    };

    const result = buildNextSeasonPlayers(
      [deJong],
      nextSeasonStartDate,
      baseOptions,
    );

    const bonuses = result[0].contract[0].bonuses;
    expect(bonuses).toBeDefined();
    expect(bonuses).toHaveLength(1);
    expect(bonuses![0].id).toBe("b_pending");
  });

  it("gerencia loan-back de saida continuo mantendo o jogador emprestado e com vinculo", () => {
    const fati: Players = {
      id: "fati_fcb_10",
      name: "Ansu Fati",
      age: 22,
      contractTime: 3,
      position: "PE",
      sector: "Ataque",
      nation: "Espanha",
      shirtNumber: "10",
      overall: 80,
      ballonDor: 0,
      buy: false,
      captain: false,
      sell: true,
      statsLeagues: [],
      contract: [
        {
          id: "c_fati_exit_lb",
          isLoan: false,
          club: "FC Barcelona",
          leftClub: true,
          transferClauses: {
            loanBackDuration: 2,
          },
        } as unknown as Contract,
      ],
    };

    const result = buildNextSeasonPlayers(
      [fati],
      nextSeasonStartDate,
      baseOptions,
    );

    expect(result).toHaveLength(1);
    expect(result[0].incomingLoan).toBe(true);
    expect(result[0].sell).toBe(false);
  });
});
