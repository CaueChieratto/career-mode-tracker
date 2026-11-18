import { useState } from "react";
import Load from "../../components/Load";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import TransfersModal from "../../components/TransfersModal";
import { useSeasonView } from "../../common/hooks/Seasons/UseSeasonView";
import { useModalManager } from "../../common/hooks/Modal/UseModalManager";
import { ModalType } from "../../common/types/enums/ModalType";
import BottomMenu from "../../ui/BottomMenu";
import SectionView from "../../layout/SectionView";

const Geral = () => {
  const [hasOpenScreen, setHasOpenScreen] = useState(false);

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
  } = useSeasonView(true);

  const { activeModal } = useModalManager();

  if (loading) return <Load />;
  if (!career || !season) return <NotFoundDisplay />;

  return (
    <>
      <SectionView
        notSeason
        title="Geral"
        career={career}
        allCareers={careers}
        season={season}
        tabsConfig={tabsConfig}
        onOpenTransfers={handleOpenTransfers}
        onScreenChange={setHasOpenScreen}
      />
      {!hasOpenScreen && (
        <TransfersModal
          isOpen={isModalOpen}
          closeModal={handleCloseModal}
          transferType={transferType}
          playersToShow={playersToShow}
          currency={career.currency}
          career={career}
          season={season}
        />
      )}
      {activeModal === ModalType.NONE && !isModalOpen && !hasOpenScreen && (
        <BottomMenu />
      )}
    </>
  );
};

export default Geral;
