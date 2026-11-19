import { describe, it, expect } from "vitest";
import {
  checkIsIncomingLoanExit,
  checkIsLoanReturnArrival,
  buildSellContractHistory,
} from "../common/services/ServicePlayers/helpers/contractHelpers";
import { resolveTransferDisplayValue } from "../components/TransfersModal/components/TransfersPanel/helpers/resolveTransferDisplayValue";
import { buildTransferCopyText } from "../components/TransfersModal/components/TransfersPanel/utils/buildTransferCopyText";
import { Players } from "../common/interfaces/playersInfo/players";
import { Contract } from "../common/interfaces/playersInfo/contract";
import { player } from "./factories/domain";

describe("checkIsIncomingLoanExit & buildSellContractHistory", () => {
  it("buildSellContractHistory define lastContract.isLoan = false explicitamente", () => {
    const lamineYamal: Players = player({
      id: "lamine-yamal-id",
      name: "Lamine Yamal",
      age: 17,
      overall: 85,
      position: "RW",
      sector: "Ataque",
      nation: "ESP",
      contract: [
        {
          buyValue: 0,
          fromClub: "Base",
          sellValue: 0,
          leftClub: "",
          dataArrival: new Date(2024, 6, 1),
          dataExit: null,
        },
      ],
    });

    const updatedContracts = buildSellContractHistory(
      lamineYamal,
      "150M",
      "Paris Saint-Germain",
      "15/08/2024",
      new Date(2024, 6, 1),
      new Date(2025, 5, 30),
    );

    const lastContract = updatedContracts[updatedContracts.length - 1];
    expect(lastContract.isLoan).toBe(false);
    expect(lastContract.sellValue).toBe(150000000);
    expect(lastContract.leftClub).toBe("Paris Saint-Germain");
  });

  it("retorna false para venda de atleta mesmo quando player.incomingLoan é true (atleta recontratado por empréstimo)", () => {
    // Jogador que foi vendido ao Manchester City e depois recontratado por empréstimo
    const reHiredPlayer: Partial<Players> = {
      id: "gavi-id",
      name: "Gavi",
      incomingLoan: true, // Recontratado por empréstimo
      sell: false,
    };

    // Contrato anterior de venda
    const saleContract: Contract = {
      buyValue: 0,
      fromClub: "FC Barcelona",
      sellValue: 90000000,
      leftClub: "Manchester City",
      isLoan: false,
      dataArrival: new Date(2024, 6, 1),
      dataExit: new Date(2024, 6, 20),
    };

    const isLoanExit = checkIsIncomingLoanExit(reHiredPlayer, saleContract, "exit");
    expect(isLoanExit).toBe(false);
  });

  it("retorna false se sellValue > 0 mesmo se isLoan não estiver definido", () => {
    const p: Partial<Players> = {
      incomingLoan: true,
    };

    const contractWithSellVal: Contract = {
      buyValue: 0,
      fromClub: "FC Barcelona",
      sellValue: 50000000,
      leftClub: "Chelsea",
      dataArrival: new Date(2024, 6, 1),
      dataExit: new Date(2024, 7, 10),
    };

    expect(checkIsIncomingLoanExit(p, contractWithSellVal, "exit")).toBe(false);
  });

  it("retorna true para retorno genuíno de empréstimo (Fim de Empréstimo ou isLoan === true com incomingLoan)", () => {
    const loanPlayer: Partial<Players> = {
      id: "cancelo-id",
      name: "João Cancelo",
      incomingLoan: true,
    };

    const loanReturnContract: Contract = {
      buyValue: 0,
      fromClub: "Manchester City",
      sellValue: 0,
      leftClub: "Manchester City",
      isLoan: true,
      dataArrival: new Date(2024, 6, 1),
      dataExit: new Date(2025, 5, 30),
    };

    expect(checkIsIncomingLoanExit(loanPlayer, loanReturnContract, "exit")).toBe(true);

    const endOfLoanContract: Contract = {
      buyValue: 0,
      fromClub: "Manchester City",
      sellValue: 0,
      leftClub: "Fim de Empréstimo",
      dataArrival: new Date(2024, 6, 1),
      dataExit: new Date(2025, 5, 30),
    };

    expect(checkIsIncomingLoanExit(loanPlayer, endOfLoanContract, "exit")).toBe(true);
  });

  it("retorna false se houver opção de compra exercida ou loanBackDuration", () => {
    const p: Partial<Players> = {
      incomingLoan: true,
    };

    const loanBackContract: Contract = {
      buyValue: 0,
      fromClub: "FC Barcelona",
      sellValue: 40000000,
      leftClub: "Real Betis",
      isLoan: true,
      dataArrival: new Date(2024, 6, 1),
      dataExit: null,
      transferClauses: {
        loanBackDuration: 1,
      },
    };

    expect(checkIsIncomingLoanExit(p, loanBackContract, "exit")).toBe(false);
  });

  it("retorna true e exibe 'Fim do Empréstimo' para empréstimo de chegada ao FC Barcelona com opção de compra não exercida ao encerrar", () => {
    const endedIncomingLoanContract: Contract = {
      buyValue: 0,
      fromClub: "Manchester City",
      sellValue: 0,
      leftClub: "Manchester City",
      isLoan: true,
      buyOptionValue: 25_000_000,
      dataArrival: new Date("2026-07-15"),
      dataExit: new Date("2027-06-30"),
      loanTerms: {
        durationYears: 1,
        ourWagePercentage: 100,
        theirWagePercentage: 0,
        hasBuyOption: true,
        buyOptionFee: 25_000_000,
        buyOptionExercised: false,
        partnerClub: "Manchester City",
      },
    };

    const endedLoanPlayer = player({
      id: "p_cancelo_barca",
      name: "João Cancelo",
      incomingLoan: false,
      sell: true,
      loan: false,
      contract: [endedIncomingLoanContract],
    });

    expect(
      checkIsIncomingLoanExit(endedLoanPlayer, endedIncomingLoanContract, "exit"),
    ).toBe(true);

    const displayValue = resolveTransferDisplayValue({
      player: endedLoanPlayer,
      contract: endedIncomingLoanContract,
      contractIndex: 0,
      direction: "exit",
      currency: "€",
      value: 0,
    });
    expect(displayValue).toBe("Fim do Empréstimo");
  });

  it("retorna true em checkIsLoanReturnArrival e exibe 'Fim do Empréstimo' em Chegadas mesmo após novo empréstimo posterior na mesma temporada", () => {
    const outgoingLoanToBrighton: Contract = {
      buyValue: 0,
      fromClub: "",
      sellValue: 0,
      leftClub: "Brighton",
      isLoan: true,
      dataArrival: new Date("2025-07-10"),
      dataExit: new Date("2025-08-01"),
    };

    const returnAndReLoanedContract: Contract = {
      buyValue: 0,
      fromClub: "Brighton",
      sellValue: 0,
      leftClub: "Real Betis",
      isLoan: true,
      dataArrival: new Date("2026-06-30"),
      dataExit: new Date("2026-07-15"),
    };

    const ansuFati = player({
      id: "p_ansu_fati",
      name: "Ansu Fati",
      loan: true,
      incomingLoan: false,
      contract: [outgoingLoanToBrighton, returnAndReLoanedContract],
    });

    expect(
      checkIsLoanReturnArrival(ansuFati, returnAndReLoanedContract, 1),
    ).toBe(true);

    const displayValue = resolveTransferDisplayValue({
      player: ansuFati,
      contract: returnAndReLoanedContract,
      contractIndex: 1,
      direction: "arrivals",
      currency: "€",
      value: 0,
    });
    expect(displayValue).toBe("Fim do Empréstimo");

    const copyText = buildTransferCopyText({
      player: ansuFati,
      contract: returnAndReLoanedContract,
      direction: "arrivals",
      currency: "€",
    });
    expect(copyText).toContain("retornou de empréstimo do Brighton");
  });
});
