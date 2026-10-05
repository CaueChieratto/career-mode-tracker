import Modal from "../Modal";
import SlideUpModal from "../../ui/modals/SlideUpModal";
import TransfersPanel from "./components/TransfersPanel";
import { Players } from "../../common/interfaces/playersInfo/players";
import { TransferEvent } from "./components/TransfersPanel/utils/sortTransfersByValue";

type TransfersModalProps = {
  isOpen: boolean;
  closeModal: () => void;
  transferType: "arrivals" | "exit";
  playersToShow: Players[];
  currency?: string;
  onTransferClick?: (event: TransferEvent, direction: "arrivals" | "exit") => void;
};

const TransfersModal = ({
  isOpen,
  closeModal,
  transferType,
  playersToShow,
  currency,
  onTransferClick,
}: TransfersModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      closeModal={closeModal}
      slideUp
      text={transferType === "arrivals" ? "Chegadas" : "Saídas"}
    >
      <SlideUpModal>
        <TransfersPanel
          title={transferType === "arrivals" ? "Chegadas" : "Saídas"}
          players={playersToShow}
          currency={currency}
          onTransferClick={onTransferClick}
        />
      </SlideUpModal>
    </Modal>
  );
};

export default TransfersModal;
