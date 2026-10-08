import Load from "../../components/Load";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import TransfersModal from "../../components/TransfersModal";
import { useSeasonView } from "../../common/hooks/Seasons/UseSeasonView";
import { useModalManager } from "../../common/hooks/Modal/UseModalManager";
import { ModalType } from "../../common/types/enums/ModalType";
import BottomMenu from "../../ui/BottomMenu";
import SectionView from "../../layout/SectionView";

const Geral = () => {
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

  if (loading) return <Load />;
  if (!career || !season) return <NotFoundDisplay />;

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
        career={career}
        season={season}
      />
      {activeModal === ModalType.NONE && !isModalOpen && <BottomMenu />}
    </>
  );
};

export default Geral;
