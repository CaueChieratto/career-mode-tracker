import { useParams } from "react-router-dom";
import {
  IoPersonOutline,
  IoCreateOutline,
  IoDocumentTextOutline,
} from "react-icons/io5";
import { FaMoneyBillTransfer } from "react-icons/fa6";

import { useClubColors } from "../../../../../../../../../../common/hooks/Colors/UseClubColors";
import { ColorsService } from "../../../../../../../../../../common/services/ColorsService";
import { Contract } from "../../../../../../../../../../common/interfaces/playersInfo/contract";
import { Players } from "../../../../../../../../../../common/interfaces/playersInfo/players";
import { SectionScreen } from "../../../../../../../../config/screens";
import {
  ActionChoiceModal,
  ActionChoiceOption,
} from "../ActionChoiceModal";

type PlayerModalProps = {
  id?: string;
  playerName?: string;
  incomingLoan?: boolean;
  loan?: boolean;
  sell?: boolean;
  contract?: Contract[];
  player?: Players;
  onClose: () => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  onRenewPlayer?: () => void;
};

export const PlayerModal = ({
  id: propId,
  playerName: propPlayerName,
  incomingLoan: propIncomingLoan,
  loan: propLoan,
  sell: propSell,
  contract: propContract,
  player,
  onClose,
  onOpenScreen,
  onRenewPlayer,
}: PlayerModalProps) => {
  const id = propId ?? player?.id ?? "";
  const playerName = propPlayerName ?? player?.name ?? "";
  const incomingLoan = propIncomingLoan ?? player?.incomingLoan;
  const loan = propLoan ?? player?.loan;
  const sell = propSell ?? player?.sell;
  const contract = propContract ?? player?.contract;

  const { careerId, seasonId } = useParams();
  const { clubColor, darkClubColor } = useClubColors(
    ColorsService.getColorSaved(careerId || "") || "#ffffff",
  );

  const isTransferred =
    Boolean(sell) ||
    Boolean(
      contract?.some(
        (c) =>
          Boolean(c.leftClub && c.leftClub.trim() !== "") &&
          !c.isLoan,
      ),
    );

  const canTransferOrRenew = !incomingLoan && !loan && !isTransferred;

  const options: ActionChoiceOption[] = [
    {
      key: "view",
      text: "Visualizar",
      title: playerName,
      icon: IoPersonOutline,
      actionLabel: "Entrar na Visualização",
    },
    {
      key: "edit",
      text: "Editar",
      title: playerName,
      icon: IoCreateOutline,
      actionLabel: "Entrar na Edição",
    },
    ...(canTransferOrRenew
      ? [
          {
            key: "transfer",
            text: "Transferir",
            title: playerName,
            icon: FaMoneyBillTransfer,
            actionLabel: "Entrar na Transferência",
          },
          {
            key: "renew",
            text: "Renovar",
            title: playerName,
            icon: IoDocumentTextOutline,
            actionLabel: "Entrar na Renovação",
          },
        ]
      : []),
  ];

  const handleConfirm = (selectedAction: string) => {
    if (selectedAction === "view") {
      if (onOpenScreen && careerId) {
        onOpenScreen({
          key: "player",
          playerId: id,
          careerId,
          seasonId,
          isNotSeason: false,
        });
      }
      onClose();
      return;
    }

    if (onOpenScreen) {
      if (selectedAction === "edit") {
        onOpenScreen({ key: "addSquadPlayer", playerId: id } as SectionScreen);
      } else if (selectedAction === "transfer") {
        onOpenScreen({
          key: "transferPlayer",
          playerId: id,
          mode: "transfer",
        } as SectionScreen);
      } else if (selectedAction === "renew") {
        if (onRenewPlayer) {
          onRenewPlayer();
        } else {
          onOpenScreen({
            key: "renewPlayer",
            playerId: id,
          } as SectionScreen);
        }
      }
    } else if (selectedAction === "renew" && onRenewPlayer) {
      onRenewPlayer();
    }

    onClose();
  };

  return (
    <ActionChoiceModal
      title={playerName}
      options={options}
      onClose={onClose}
      onConfirm={handleConfirm}
      clubColor={clubColor}
      darkClubColor={darkClubColor}
    />
  );
};
