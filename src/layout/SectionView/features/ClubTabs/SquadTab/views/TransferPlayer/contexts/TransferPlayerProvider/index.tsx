import { ReactNode } from "react";
import { TransferPlayerContext } from "../context";
import { useTransferForm } from "../../hooks/useTransferForm";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { TransferProposal } from "../../../../../../../../../common/interfaces/proposals/transferProposal";
import { SectionScreen } from "../../../../../../../config/screens";
import { OptimisticUpdateData } from "../../../../../../../helpers/updateSectionCareer";

type ProviderProps = {
  career: Career;
  season: ClubData;
  seasonId?: string;
  player: Players;
  mode?: "transfer" | "loan";
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  children: ReactNode;
  prefill?: {
    sellValue?: string;
    lockSellValue?: boolean;
    toClub?: string;
    lockToClub?: boolean;
    lockTransferType?: boolean;
    sourceSeasonId?: string;
    sourcePlayerId?: string;
    sourceContractIndex?: number;
    mode?: "buyback" | "release_clause" | "transfer" | "loan";
  };
  proposalId?: string;
  initialProposal?: TransferProposal;
  editTransfer?: {
    player: Players;
    contract: NonNullable<Players["contract"]>[number];
    contractIndex: number;
    direction?: "arrivals" | "exit";
  };
};

export const TransferPlayerProvider = ({
  career,
  season,
  seasonId,
  player,
  mode,
  onClose,
  onOpenScreen,
  prefill,
  proposalId,
  initialProposal,
  editTransfer,
  children,
}: ProviderProps) => {
  const transferForm = useTransferForm({
    careerId: career.id,
    season,
    seasonId,
    career,
    player,
    currentPlayers: season.players,
    handleGoBack: onClose,
    onOpenScreen,
    initialMode: mode,
    prefill,
    proposalId,
    initialProposal,
    editTransfer,
  });

  return (
    <TransferPlayerContext.Provider
      value={{
        career,
        season,
        player,
        onClose,
        ...transferForm,
      }}
    >
      {children}
    </TransferPlayerContext.Provider>
  );
};
