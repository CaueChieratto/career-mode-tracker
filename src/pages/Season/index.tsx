import Load from "../../components/Load";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import TransfersModal from "../../components/TransfersModal";
import { useSeasonView } from "../../common/hooks/Seasons/UseSeasonView";
import { ModalType } from "../../common/types/enums/ModalType";
import BottomMenu from "../../ui/BottomMenu";
import { useModalManager } from "../../common/hooks/Modal/UseModalManager";
import SectionView from "../../layout/SectionView";
import { useState } from "react";
import { Players } from "../../common/interfaces/playersInfo/players";
import { TransferEvent } from "../../components/TransfersModal/components/TransfersPanel/utils/sortTransfersByValue";
import EditTransferScreen from "../../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/screens/EditTransferScreen";
import { SeasonThemeProvider } from "../../contexts/SeasonThemeContext";

const Season = () => {
  const [hasOpenScreen, setHasOpenScreen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<{
    player: Players;
    contract: NonNullable<Players["contract"]>[number];
    contractIndex: number;
    direction: "arrivals" | "exit";
  } | null>(null);

  const {
    loading,
    career,
    season,
    tabsConfig,
    isModalOpen,
    transferType,
    playersToShow,
    handleOpenTransfers,
    handleCloseModal,
  } = useSeasonView(false);

  const { activeModal } = useModalManager();

  if (loading) return <Load />;
  if (!career || !season) return <NotFoundDisplay />;

  const handleTransferClick = (
    event: TransferEvent,
    direction: "arrivals" | "exit",
  ) => {
    handleCloseModal();
    setEditingTransfer({
      player: event.player,
      contract: event.contract,
      contractIndex: event.contractIndex ?? 0,
      direction,
    });
  };

  if (editingTransfer) {
    return (
      <SeasonThemeProvider careerId={career.id} career={career}>
        <EditTransferScreen
          career={career}
          season={season}
          player={editingTransfer.player}
          contract={editingTransfer.contract}
          contractIndex={editingTransfer.contractIndex}
          direction={editingTransfer.direction}
          onClose={() => setEditingTransfer(null)}
        />
      </SeasonThemeProvider>
    );
  }

  return (
    <>
      <SectionView
        career={career}
        season={season}
        tabsConfig={tabsConfig}
        onOpenTransfers={handleOpenTransfers}
        onScreenChange={setHasOpenScreen}
      />
      <TransfersModal
        isOpen={isModalOpen}
        closeModal={handleCloseModal}
        transferType={transferType}
        playersToShow={playersToShow}
        currency={career.currency}
        onTransferClick={handleTransferClick}
      />
      {activeModal === ModalType.NONE && !hasOpenScreen && <BottomMenu />}
    </>
  );
};

export default Season;

