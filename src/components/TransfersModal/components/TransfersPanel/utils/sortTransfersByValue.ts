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
    const valueA = isArrival ? a.contract.buyValue : a.contract.sellValue;
    const valueB = isArrival ? b.contract.buyValue : b.contract.sellValue;

    const numValueA = typeof valueA === "number" ? valueA : 0;
    const numValueB = typeof valueB === "number" ? valueB : 0;

    if (numValueB !== numValueA) {
      return numValueB - numValueA;
    }

    const dateA = isArrival ? a.contract.dataArrival : a.contract.dataExit;
    const dateB = isArrival ? b.contract.dataArrival : b.contract.dataExit;

    const timeA = dateA ? new Date(dateA).getTime() : 0;
    const timeB = dateB ? new Date(dateB).getTime() : 0;

    return timeB - timeA;
  });
};
