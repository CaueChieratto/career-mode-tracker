import Load from "../../components/Load";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import TransfersModal from "../../components/TransfersModal";
import { useSeasonView } from "../../common/hooks/Seasons/UseSeasonView";
import { ModalType } from "../../common/types/enums/ModalType";
import BottomMenu from "../../ui/BottomMenu";
import { useModalManager } from "../../common/hooks/Modal/UseModalManager";
import SectionView from "../../layout/SectionView";
import { useState } from "react";
import { TransferEvent } from "../../components/TransfersModal/components/TransfersPanel/utils/sortTransfersByValue";
import { SeasonThemeProvider } from "../../contexts/SeasonThemeContext";
import { ActiveSectionScreen } from "../../layout/SectionView/components/ActiveSectionScreen";
import { SectionScreen } from "../../layout/SectionView/config/screens";
import { canEditTransferContract } from "../../common/helpers/transferEditability";

const Season = () => {
  const [hasOpenScreen, setHasOpenScreen] = useState(false);
  const [activeSectionScreen, setActiveSectionScreen] =
    useState<SectionScreen | null>(null);

  const {
    loading,
    career,
    careers,
    season,
    tabsConfig,
    isModalOpen,
    transferType,
    playersToShow,
    handleOpenTransfers,
    handleCloseModal,
    proposals,
  } = useSeasonView(false);

  const { activeModal } = useModalManager();

  if (loading) return <Load />;
  if (!career || !season) return <NotFoundDisplay />;

  const handleTransferClick = (
    event: TransferEvent,
    direction: "arrivals" | "exit",
  ) => {
    if (
      !canEditTransferContract({
        player: event.player,
        contract: event.contract,
        contractIndex: event.contractIndex,
        direction,
        career,
        season,
      })
    ) {
      return;
    }
    handleCloseModal();
    if (direction === "arrivals") {
      setActiveSectionScreen({
        key: "addTransferPlayer",
        editTransfer: {
          player: event.player,
          contract: event.contract,
          contractIndex: event.contractIndex ?? 0,
        },
      });
      return;
    }
    setActiveSectionScreen({
      key: "transferPlayer",
      playerId: event.player.id,
      editTransfer: {
        player: event.player,
        contract: event.contract,
        contractIndex: event.contractIndex ?? 0,
        direction,
      },
    });
  };

  const handleOpenScreenFromTransfers = (screen: SectionScreen) => {
    handleCloseModal();
    setActiveSectionScreen(screen);
  };

  return (
    <>
      <div
        style={{
          display: activeSectionScreen ? "none" : "contents",
        }}
      >
        <SectionView
          career={career}
          allCareers={careers}
          season={season}
          tabsConfig={tabsConfig}
          onOpenTransfers={handleOpenTransfers}
          onScreenChange={setHasOpenScreen}
        />
      </div>

      {activeSectionScreen && (
        <SeasonThemeProvider careerId={career.id} career={career}>
          <ActiveSectionScreen
            career={career}
            allCareers={careers}
            season={season}
            screen={activeSectionScreen}
            onClose={() => setActiveSectionScreen(null)}
            onOpenScreen={(s) => setActiveSectionScreen(s)}
            onOpenTransfers={handleOpenTransfers}
          />
        </SeasonThemeProvider>
      )}

      {!hasOpenScreen && !activeSectionScreen && (
        <TransfersModal
          isOpen={isModalOpen}
          closeModal={handleCloseModal}
          transferType={transferType}
          playersToShow={playersToShow}
          currency={career.currency}
          career={career}
          season={season}
          onTransferClick={handleTransferClick}
          proposals={proposals}
          onOpenScreen={handleOpenScreenFromTransfers}
        />
      )}
      {activeModal === ModalType.NONE &&
        !hasOpenScreen &&
        !activeSectionScreen && <BottomMenu />}
    </>
  );
};

export default Season;
