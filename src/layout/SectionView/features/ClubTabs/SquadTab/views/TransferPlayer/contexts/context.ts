import { createContext, useContext } from "react";
import { useTransferForm } from "../hooks/useTransferForm";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";

type UseTransferFormReturn = ReturnType<typeof useTransferForm>;

type TransferPlayerContextType = UseTransferFormReturn & {
  career: Career;
  season: ClubData;
  player: Players;
  onClose: () => void;
};

export const TransferPlayerContext = createContext<
  TransferPlayerContextType | undefined
>(undefined);

export const useTransferPlayerContext = () => {
  const context = useContext(TransferPlayerContext);
  if (!context) {
    throw new Error(
      "useTransferPlayerContext deve ser usado dentro de um TransferPlayerProvider",
    );
  }
  return context;
};
