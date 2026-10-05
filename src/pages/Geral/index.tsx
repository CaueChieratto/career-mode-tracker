import Load from "../../components/Load";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import TransfersModal from "../../components/TransfersModal";
import { useSeasonView } from "../../common/hooks/Seasons/UseSeasonView";
import { useModalManager } from "../../common/hooks/Modal/UseModalManager";
import { ModalType } from "../../common/types/enums/ModalType";
import BottomMenu from "../../ui/BottomMenu";
import SectionView from "../../layout/SectionView";
import { useMemo, useState } from "react";
import { Players } from "../../common/interfaces/playersInfo/players";
import { TransferEvent } from "../../components/TransfersModal/components/TransfersPanel/utils/sortTransfersByValue";
import EditTransferScreen from "../../layout/SectionView/features/ClubTabs/SquadTab/views/TransferPlayer/screens/EditTransferScreen";
import { SeasonThemeProvider } from "../../contexts/SeasonThemeContext";

const Geral = () => {
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
  } = useSeasonView(true);

  const { activeModal } = useModalManager();

  const targetSeason = useMemo(() => {
    if (!editingTransfer || !career?.clubData) return season;
    const foundSeason = career.clubData.find((s) =>
      s.players?.some((p) => p.id === editingTransfer.player.id),
    );
    return foundSeason || season;
  }, [editingTransfer, career, season]);

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

  if (editingTransfer && targetSeason) {
    return (
      <SeasonThemeProvider careerId={career.id} career={career}>
        <EditTransferScreen
          career={career}
          season={targetSeason}
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
        notSeason
        title="Geral"
        career={career}
        season={season}
        tabsConfig={tabsConfig}
        onOpenTransfers={handleOpenTransfers}
      />
      <TransfersModal
        isOpen={isModalOpen}
        closeModal={handleCloseModal}
        transferType={transferType}
        playersToShow={playersToShow}
        currency={career.currency}
        onTransferClick={handleTransferClick}
      />
      {activeModal === ModalType.NONE && !isModalOpen && !editingTransfer && (
        <BottomMenu />
      )}
    </>
  );
};

export default Geral;

