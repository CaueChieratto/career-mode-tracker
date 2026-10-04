import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { IoPersonOutline, IoCreateOutline } from "react-icons/io5";

import Modal from "../../../../../../../../../../components/Modal";
import Button from "../../../../../../../../../../components/Button";
import { CardsModal } from "../../../../../../../../../../ui/modals/SeasonConfigs/components/CardsModal";
import { useClubColors } from "../../../../../../../../../../common/hooks/Colors/UseClubColors";
import { ColorsService } from "../../../../../../../../../../common/services/ColorsService";
import Styles from "./PlayerModal.module.css";
import { SectionScreen } from "../../../../../../../../config/screens";

type PlayerModalProps = {
  id: string;
  playerName: string;
  incomingLoan?: boolean;
  onClose: () => void;
  onOpenScreen?: (screen: SectionScreen) => void;
};

type ModalAction = "view" | "edit" | "transfer" | "loan";

export const PlayerModal = ({
  id,
  playerName,
  incomingLoan,
  onClose,
  onOpenScreen,
}: PlayerModalProps) => {
  const [selectedAction, setSelectedAction] = useState<ModalAction | null>(
    null,
  );
  const navigate = useNavigate();
  const { careerId, seasonId } = useParams();
  const { clubColor, darkClubColor } = useClubColors(
    ColorsService.getColorSaved(careerId || "") || "#ffffff",
  );

  const viewPath = `/Career/${careerId}/Season/${seasonId}/Player/${id}`;

  const handleConfirm = () => {
    document.body.classList.remove("modal-open");

    if (selectedAction === "view") {
      navigate(viewPath);
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
      } else if (selectedAction === "loan") {
        onOpenScreen({
          key: "transferPlayer",
          playerId: id,
          mode: "loan",
        } as SectionScreen);
      }
    }

    onClose();
  };

  const getButtonText = () => {
    switch (selectedAction) {
      case "transfer":
        return "em Venda";
      case "loan":
        return "em Empréstimo";
      case "edit":
        return "na Edição";
      case "view":
        return "na Visualização";
      default:
        return "";
    }
  };

  const modalContent = (
    <Modal
      isOpen={true}
      closeModal={onClose}
      animationContainer="grow"
      text={playerName}
    >
      <div className={Styles.container}>
        <div className={Styles.grid}>
          <CardsModal
            icon={<IoPersonOutline className={Styles.icon} />}
            label="Visualizar"
            title={playerName}
            onClick={() => setSelectedAction("view")}
            clubColor={clubColor}
            darkClubColor={darkClubColor}
            className={selectedAction === "view" ? Styles.selected_card : ""}
          />
          <CardsModal
            icon={<IoCreateOutline className={Styles.icon} />}
            label="Editar"
            title={playerName}
            onClick={() => setSelectedAction("edit")}
            clubColor={clubColor}
            darkClubColor={darkClubColor}
            className={selectedAction === "edit" ? Styles.selected_card : ""}
          />
          {!incomingLoan && (
            <>
              <CardsModal
                icon={<IoPersonOutline className={Styles.icon} />}
                label="Vender"
                title={playerName}
                onClick={() => setSelectedAction("transfer")}
                clubColor={clubColor}
                darkClubColor={darkClubColor}
                className={
                  selectedAction === "transfer" ? Styles.selected_card : ""
                }
              />
              <CardsModal
                icon={<IoCreateOutline className={Styles.icon} />}
                label="Emprestar"
                title={playerName}
                onClick={() => setSelectedAction("loan")}
                clubColor={clubColor}
                darkClubColor={darkClubColor}
                className={selectedAction === "loan" ? Styles.selected_card : ""}
              />
            </>
          )}
        </div>
        {selectedAction && (
          <Button
            className={Styles.button}
            onClick={handleConfirm}
            style={{
              backgroundColor: clubColor,
              border: `1px solid ${darkClubColor}`,
            }}
          >
            Entrar {getButtonText()}
          </Button>
        )}
      </div>
    </Modal>
  );

  return createPortal(modalContent, document.body);
};
