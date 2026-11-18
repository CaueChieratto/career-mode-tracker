import { Players } from "../../../../../common/interfaces/playersInfo/players";

export type TransferEvent = {
  player: Players;
  contract: NonNullable<Players["contract"]>[number];
  contractIndex?: number;
};

export const sortTransfersByValue = (
  events: TransferEvent[],
  type: "arrivals" | "exit",
) => {
  const isArrival = type === "arrivals";

  return [...events].sort((a, b) => {
    const isLoanBackA =
      isArrival &&
      Boolean(
        a.contract.leftClub &&
          !a.contract.isLoan &&
          a.contract.transferClauses?.loanBackDuration,
      );
    const isLoanBackB =
      isArrival &&
      Boolean(
        b.contract.leftClub &&
          !b.contract.isLoan &&
          b.contract.transferClauses?.loanBackDuration,
      );

    const valueA = isArrival
      ? isLoanBackA
        ? 0
        : a.contract.buyValue
      : a.contract.sellValue;
    const valueB = isArrival
      ? isLoanBackB
        ? 0
        : b.contract.buyValue
      : b.contract.sellValue;

    const numValueA = typeof valueA === "number" ? valueA : 0;
    const numValueB = typeof valueB === "number" ? valueB : 0;

    if (numValueB !== numValueA) {
      return numValueB - numValueA;
    }

    const dateA = isArrival
      ? a.contract.dataArrival || (isLoanBackA ? a.contract.dataExit : null)
      : a.contract.dataExit;
    const dateB = isArrival
      ? b.contract.dataArrival || (isLoanBackB ? b.contract.dataExit : null)
      : b.contract.dataExit;

    const timeA = dateA ? new Date(dateA).getTime() : 0;
    const timeB = dateB ? new Date(dateB).getTime() : 0;

    return timeB - timeA;
  });
};
