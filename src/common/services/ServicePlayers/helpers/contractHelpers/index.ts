import { Players } from "../../../../interfaces/playersInfo/players";
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

  lastContract.buyOptionValue = parseValue(buyOption);
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
