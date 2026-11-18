import Button from "../../../../../../../components/Button";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { TransferProposal } from "../../../../../../../common/interfaces/proposals/transferProposal";
import { SectionScreen } from "../../../../../config/screens";
import { OptimisticUpdateData } from "../../../../../helpers/updateSectionCareer";
import { TransferPlayerProvider } from "./contexts/TransferPlayerProvider";
import { TransferPlayerScreen } from "./screens/TransferPlayerScreen";

type TransferPlayerProps = {
  career: Career;
  season: ClubData;
  seasonId?: string;
  playerId: string;
  mode?: "transfer" | "loan";
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
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

export default function TransferPlayer(props: TransferPlayerProps) {
  const player =
    props.season.players.find((p) => p.id === props.playerId) ||
    props.editTransfer?.player;

  if (!player) {
    return <Button onClick={() => props.onClose()}>Dados não encontrados.</Button>;
  }

  return (
    <TransferPlayerProvider
      {...props}
      player={player}
      prefill={props.prefill}
      editTransfer={props.editTransfer}
    >
      <TransferPlayerScreen />
    </TransferPlayerProvider>
  );
}
