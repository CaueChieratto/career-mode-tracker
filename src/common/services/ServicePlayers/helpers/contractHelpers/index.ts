import { Players } from "../../../../interfaces/playersInfo/players";
import { Contract } from "../../../../interfaces/playersInfo/contract";
import { Career } from "../../../../interfaces/Career";
import { getSeasonDateRange } from "../../../../utils/GetSeasonDateRange";
import { parseBrasilDate } from "../../../../utils/Date";
import { parseValue } from "../../../../utils/FormatValue";

export const mergeUpdatedContracts = (
  player: Partial<Players>,
  updatedPlayer: Partial<Players>,
): Players["contract"] => {
  const newContractData = updatedPlayer.contract
    ? updatedPlayer.contract[0]
    : null;
  let mergedContract = player.contract || [];

  if (newContractData) {
    if (player.loan) {
      const lastIndex = mergedContract.length - 1;
      if (lastIndex >= 0) {
        mergedContract = mergedContract.map((contractItem, idx) =>
          idx === lastIndex
            ? {
                ...contractItem,
                ...newContractData,
                isLoan: contractItem.isLoan,
                loanDuration: contractItem.loanDuration,
                wagePercentage: contractItem.wagePercentage,
                leftClub: contractItem.leftClub,
                buyOptionValue: contractItem.buyOptionValue,
                dataExit: contractItem.dataExit,
              }
            : contractItem,
        );
      }
    } else {
      const existingContract =
        player.contract && player.contract.length > 0 ? player.contract[0] : {};
      mergedContract = [
        { ...existingContract, ...newContractData },
        ...(player.contract?.slice(1) || []),
      ];
    }
  }
  return mergedContract;
};

export const buildSellContractHistory = (
  player: Players,
  sellValue: string,
  toClub: string,
  dateExit: string,
  seasonStartDate: Date,
  seasonEndDate: Date,
): Players["contract"] => {
  const contractHistory = player.contract ? [...player.contract] : [];
  let lastContract =
    contractHistory.length > 0
      ? { ...contractHistory[contractHistory.length - 1] }
      : null;

  if (!lastContract) {
    lastContract = {
      buyValue: 0,
      fromClub: "",
      sellValue: 0,
      leftClub: "",
      dataArrival: null,
    };
  }

  const [, month] = dateExit.split("/").map(Number);
  const saleMonth = month - 1;
  const sellYear =
    saleMonth < seasonStartDate.getMonth()
      ? seasonEndDate.getFullYear()
      : seasonStartDate.getFullYear();
  const parsedExit = parseBrasilDate(dateExit, sellYear);

  if (!parsedExit) throw new Error("Data de saída inválida");

  lastContract.sellValue = parseValue(sellValue);
  lastContract.leftClub = toClub;
  lastContract.dataExit = parsedExit;
  lastContract.isLoan = false;

  if (contractHistory.length > 0) {
    contractHistory[contractHistory.length - 1] = lastContract;
  } else {
    contractHistory.push(lastContract);
  }

  return contractHistory;
};

export const buildLoanContractHistory = (
  player: Players,
  buyOption: string,
  toClub: string,
  dateLoan: string,
  loanDuration: string,
  wagePercentage: string,
  seasonStartDate: Date,
  seasonEndDate: Date,
): Players["contract"] => {
  const contractHistory = player.contract ? [...player.contract] : [];
  let lastContract =
    contractHistory.length > 0
      ? { ...contractHistory[contractHistory.length - 1] }
      : null;

  if (!lastContract) {
    lastContract = {
      buyValue: 0,
      fromClub: "",
      sellValue: 0,
      leftClub: "",
      dataArrival: null,
    };
  }

  const [, month] = dateLoan.split("/").map(Number);
  const loanMonth = month - 1;
  const loanYear =
    loanMonth < seasonStartDate.getMonth()
      ? seasonEndDate.getFullYear()
      : seasonStartDate.getFullYear();
  const parsedLoanDate = parseBrasilDate(dateLoan, loanYear);

  if (!parsedLoanDate) throw new Error("Data de empréstimo inválida");

  const parsedBuyOption = buyOption ? parseValue(buyOption) : 0;
  if (parsedBuyOption > 0) {
    lastContract.buyOptionValue = parsedBuyOption;
  } else {
    delete lastContract.buyOptionValue;
  }
  lastContract.leftClub = toClub;
  lastContract.dataExit = parsedLoanDate;
  lastContract.isLoan = true;
  lastContract.loanDuration = Number(loanDuration);
  lastContract.wagePercentage = Number(wagePercentage);

  if (contractHistory.length > 0) {
    contractHistory[contractHistory.length - 1] = lastContract;
  } else {
    contractHistory.push(lastContract);
  }

  return contractHistory;
};

export const buildReturnContractHistory = (
  player: Players,
  returnDate: string,
  seasonStartDate: Date,
  seasonEndDate: Date,
): { contractHistory: Players["contract"]; parsedDate: Date } => {
  let parsedDate: Date = seasonEndDate;

  if (returnDate && returnDate.includes("/")) {
    const parts = returnDate.split("/");
    const month = Number(parts[1]);
    if (!isNaN(month)) {
      const returnMonth = month - 1;
      const returnYear =
        returnMonth < seasonStartDate.getMonth()
          ? seasonEndDate.getFullYear()
          : seasonStartDate.getFullYear();
      const tempDate = parseBrasilDate(returnDate, returnYear);
      if (tempDate) parsedDate = tempDate;
    }
  }

  const contractHistory = player.contract ? [...player.contract] : [];
  const lastContract =
    contractHistory.length > 0
      ? contractHistory[contractHistory.length - 1]
      : null;

  if (player.incomingLoan && lastContract) {
    contractHistory[contractHistory.length - 1] = {
      ...lastContract,
      dataExit: parsedDate,
      leftClub: lastContract.fromClub || "Fim de Empréstimo",
    };
  } else if (!player.incomingLoan && lastContract) {
    contractHistory.push({
      buyValue: 0,
      fromClub: lastContract.leftClub || "Fim de Empréstimo",
      sellValue: 0,
      leftClub: "",
      dataArrival: parsedDate,
      dataExit: null,
    });
  }

  return { contractHistory, parsedDate };
};

export const checkIsIncomingLoanExit = (
  player?: Partial<Players> | null,
  contract?: NonNullable<Players["contract"]>[number] | null,
  direction: "arrivals" | "exit" = "exit",
): boolean => {
  if (direction !== "exit" || !contract) return false;
  if (contract.isLoanBackReturn) return true;

  // Se o contrato possui loanBackDuration ou é uma venda com valor e isLoan === false,
  // trata-se de uma venda (eventualmente com empréstimo de volta), NUNCA de um retorno de empréstimo.
  if (contract.transferClauses?.loanBackDuration) return false;
  if (contract.isLoan === false) return false;
  if ((Number(contract.sellValue) || 0) > 0) return false;

  // Compra definitiva (com valor de compra > 0) que depois foi emprestada não é empréstimo de chegada
  const rawBuy =
    typeof contract.buyValue === "string"
      ? parseValue(contract.buyValue)
      : typeof contract.buyValue === "number"
        ? contract.buyValue
        : 0;
  if (rawBuy > 0) return false;

  // Se a opção de compra já foi exercida/finalizada ou este é o contrato resultante da compra,
  // não é saída por fim de empréstimo.
  if (
    contract.fromLoanBuyOption ||
    contract.buyOptionFinalized ||
    contract.loanTerms?.buyOptionExercised ||
    contract.loanTerms?.buyOptionFinalized
  ) {
    return false;
  }

  // Se o atleta está atualmente em empréstimo de saída ativo (e não chegada), não é fim de empréstimo de chegada
  if (player?.loan && !player?.incomingLoan) {
    return false;
  }

  const fromClubNorm = (contract.fromClub || "").trim().toLowerCase();
  const leftClubNorm = (contract.leftClub || "").trim().toLowerCase();

  return Boolean(
    leftClubNorm === "fim de empréstimo" ||
    (player?.incomingLoan &&
      contract.isLoan === true &&
      Boolean(leftClubNorm)) ||
    (contract.isLoan &&
      fromClubNorm !== "" &&
      fromClubNorm !== "base" &&
      fromClubNorm === leftClubNorm) ||
    (player?.incomingLoan &&
      !contract.isLoan &&
      Boolean(leftClubNorm) &&
      (Number(contract.sellValue) || 0) === 0),
  );
};

export const checkIsLoanReturnArrival = (
  player?: Partial<Players> | null,
  contract?: NonNullable<Players["contract"]>[number] | null,
  contractIndex?: number,
  career?: Career | null,
  currentSeasonNumber?: number,
): boolean => {
  if (!contract) return false;
  const fromClubNorm = (contract.fromClub || "").trim().toLowerCase();
  if (fromClubNorm === "base" || fromClubNorm === "passes livres") return false;
  if (contract.fromLoanBuyOption) return false;

  const rawBuy =
    typeof contract.buyValue === "string"
      ? parseValue(contract.buyValue)
      : typeof contract.buyValue === "number"
        ? contract.buyValue
        : 0;
  if (rawBuy > 0) return false;

  // Se isLoan é true e não possui leftClub, é um empréstimo de chegada puro, não retorno de empréstimo de saída
  if (contract.isLoan && !contract.leftClub) return false;

  if (fromClubNorm === "fim de empréstimo") return true;
  if (!contract.fromClub) return false;

  const targetClub = fromClubNorm;

  // 1. Verificar contratos ANTERIORES a este contrato na mesma lista do atleta
  const contractsList = player?.fullContractHistory || player?.contract || [];
  if (contractsList.length > 0) {
    const idx = contractIndex ?? contractsList.indexOf(contract as Contract);
    const priorContracts =
      idx >= 0
        ? contractsList.slice(0, idx)
        : contractsList.filter((c) => c !== contract);

    const loanedToClubBefore = priorContracts.some(
      (c) =>
        c.isLoan &&
        Boolean(c.leftClub) &&
        !checkIsIncomingLoanExit(player, c, "exit") &&
        (c.leftClub || "").trim().toLowerCase() === targetClub,
    );
    if (loanedToClubBefore) return true;

    // Se o próprio contrato tem isLoan === true (empréstimo de chegada encerrado sem empréstimo de saída prévio),
    // não pode fazer auto-match com temporadas futuras/anteriores como retorno de empréstimo de saída.
    if (contract.isLoan && checkIsIncomingLoanExit(player, contract, "exit")) {
      return false;
    }
  } else if (
    contract.isLoan &&
    checkIsIncomingLoanExit(player, contract, "exit")
  ) {
    return false;
  }

  // 2. Check career.clubData to see what happened in previous seasons
  if (career?.clubData && player?.id) {
    let seasonNum = currentSeasonNumber;
    if (seasonNum === undefined && contract.dataArrival && career.createdAt) {
      const arrDate = new Date(contract.dataArrival).getTime();
      const matchedSeason = career.clubData.find((s) => {
        const { startDate, endDate } = getSeasonDateRange(
          s.seasonNumber,
          career.createdAt,
          career.nation,
        );
        return arrDate >= startDate.getTime() && arrDate <= endDate.getTime();
      });
      if (matchedSeason) seasonNum = matchedSeason.seasonNumber;
    }

    // Look at previous seasons in career (seasons prior to seasonNum)
    const previousSeasons = career.clubData
      .filter((s) => seasonNum === undefined || s.seasonNumber < seasonNum)
      .sort((a, b) => b.seasonNumber - a.seasonNumber);

    for (const prevSeason of previousSeasons) {
      const prevPlayer = prevSeason.players?.find(
        (p) =>
          p.id === player.id ||
          (p.name &&
            player.name &&
            p.name.trim().toLowerCase() === player.name.trim().toLowerCase()),
      );
      if (prevPlayer) {
        if (prevPlayer.loan) {
          return true;
        }

        const hadLoanContract = prevPlayer.contract?.some(
          (c) =>
            c.isLoan &&
            Boolean(c.leftClub) &&
            !checkIsIncomingLoanExit(prevPlayer, c, "exit") &&
            c.leftClub.trim().toLowerCase() === targetClub,
        );
        if (hadLoanContract) return true;

        break;
      }
    }
  }

  // 3. In the current season: if player.loan is currently true (apenas para contratos não-loan de retorno)
  if (player?.loan && !contract.isLoan && contract.fromClub) {
    return true;
  }

  return false;
};

export const getContractBuyOptionFee = (
  contract?: Partial<Contract> | null,
): number => {
  if (!contract || !contract.isLoan) return 0;
  if (contract.loanTerms && contract.loanTerms.hasBuyOption === false) {
    return 0;
  }

  const candidates: Array<number | string | undefined> = [
    contract.loanTerms?.buyOptionFee,
    contract.buyOptionValue,
  ];

  for (const rawFee of candidates) {
    if (typeof rawFee === "number") {
      if (Number.isFinite(rawFee) && rawFee > 0) return rawFee;
    } else if (typeof rawFee === "string" && rawFee.trim() !== "") {
      const parsed = parseValue(rawFee);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }

  return 0;
};

export const hasDefinedLoanBuyOption = (
  contract?: Partial<Contract> | null,
): boolean => {
  if (!contract || !contract.isLoan) return false;
  if (contract.loanTerms && contract.loanTerms.hasBuyOption === false) {
    return false;
  }
  return getContractBuyOptionFee(contract) > 0;
};
