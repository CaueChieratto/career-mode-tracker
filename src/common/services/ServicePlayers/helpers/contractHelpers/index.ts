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

export const checkIsIncomingLoanExit = (
  player?: Partial<Players> | null,
  contract?: NonNullable<Players["contract"]>[number] | null,
  direction: "arrivals" | "exit" = "exit",
): boolean => {
  if (direction !== "exit" || !contract) return false;

  if (contract.leftClub === "Fim de Empréstimo") return true;

  if (player?.incomingLoan && Boolean(contract.leftClub)) return true;

  if (
    contract.fromClub &&
    contract.leftClub &&
    contract.fromClub !== "Base" &&
    contract.fromClub === contract.leftClub &&
    contract.isLoan
  ) {
    return true;
  }

  if (
    contract.isLoan &&
    contract.fromClub &&
    contract.fromClub !== "Base" &&
    Boolean(contract.leftClub) &&
    !player?.loan
  ) {
    return true;
  }

  return false;
};

export const checkIsLoanReturnArrival = (
  player?: Partial<Players> | null,
  contract?: NonNullable<Players["contract"]>[number] | null,
  contractIndex?: number,
  career?: Career | null,
  currentSeasonNumber?: number,
): boolean => {
  if (!contract) return false;
  if (contract.fromClub === "Base" || contract.fromClub === "Passes Livres") return false;
  if (contract.isLoan) return false;

  const rawBuy =
    typeof contract.buyValue === "string"
      ? parseValue(contract.buyValue)
      : typeof contract.buyValue === "number"
      ? contract.buyValue
      : 0;
  if (rawBuy > 0) return false;

  if (contract.fromClub === "Fim de Empréstimo") return true;

  // 1. Check contracts history on player (both fullContractHistory and contract)
  const contractsList = player?.fullContractHistory || player?.contract || [];
  if (contractsList.length > 0) {
    const idx = contractIndex ?? contractsList.indexOf(contract as Contract);

    // If there is an immediately preceding contract that was a loan
    if (idx > 0) {
      const prev = contractsList[idx - 1];
      if (prev?.isLoan && prev?.leftClub) {
        return true;
      }
    }

    // Check if any contract in history had a loan out to this club
    const hadLoanOutToSameClub = contractsList.some(
      (c) =>
        c.isLoan &&
        c.leftClub &&
        contract.fromClub &&
        c.leftClub.trim().toLowerCase() === contract.fromClub.trim().toLowerCase(),
    );
    if (hadLoanOutToSameClub) return true;

    // Check if any contract had isLoan: true and leftClub
    const hadAnyLoanOut = contractsList.some(
      (c) => c.isLoan && Boolean(c.leftClub) && c.leftClub !== "Fim de Empréstimo",
    );
    if (hadAnyLoanOut && contract.fromClub) {
      const matchedClub = contractsList.some(
        (c) =>
          c.isLoan &&
          c.leftClub &&
          (c.leftClub.trim().toLowerCase() === contract.fromClub!.trim().toLowerCase() ||
            contract.fromClub === "Fim de Empréstimo"),
      );
      if (matchedClub) return true;
    }
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
      const prevPlayer = prevSeason.players?.find((p) => p.id === player.id);
      if (prevPlayer) {
        // If the player was marked as loaned in that season
        if (prevPlayer.loan) {
          return true;
        }

        // Did prevPlayer have any loan contract in that season?
        const hadLoanContract = prevPlayer.contract?.some(
          (c) =>
            c.isLoan &&
            c.leftClub &&
            (!contract.fromClub ||
              c.leftClub.trim().toLowerCase() === contract.fromClub.trim().toLowerCase() ||
              contract.fromClub === "Fim de Empréstimo"),
        );
        if (hadLoanContract) return true;

        // Found player in most recent previous season and was not on loan
        break;
      }
    }
  }

  // 3. In the current season: if player.loan is currently true
  if (player?.loan && contract.fromClub) {
    return true;
  }

  return false;
};
