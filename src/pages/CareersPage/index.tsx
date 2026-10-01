import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import classNames from "classnames";
import Styles from "./CareersPage.module.css";
import Button from "../../components/Button";
import PrimaryHeader from "../../ui/PrimaryHeader";
import EmptyCareers from "../../ui/EmptyCareers";
import ModalManager from "../../common/constants/ModalManager";
import { ModalType } from "../../common/types/enums/ModalType";
import { Career } from "../../common/interfaces/Career";
import { useModalManager } from "../../common/hooks/Modal/UseModalManager";
import { useSaveClick } from "../../common/hooks/UseSaveClick";
import Load from "../../components/Load";
import CareerCard from "./components/CareerCard";
import { useCareers } from "../../common/hooks/Career/UseCareer";
import { getCareerCardButtons } from "./constants/CareerCardButtons";
import BottomMenu from "../../ui/BottomMenu";
import { useDragAndDrop } from "./hooks/DragAndDrop/useDragAndDrop";
import { DragGhost } from "./ui/DragGhost";
import { useCareerBoard } from "./hooks/CareerBoard/useCareerBoard";
import { CareerGroupCard } from "./components/CareerGroupCard";
import { ConfirmModal } from "./ui/ConfirmModal";
import { CareerPageContext } from "./contexts/CareerPageContext";
import { auth } from "../../common/services/Firebase";

const CareersPage = () => {
  const navigate = useNavigate();
  const buttons = useMemo(() => getCareerCardButtons(navigate), [navigate]);
  const { careers, loading } = useCareers();

  const currentUserId = auth.currentUser?.uid;
  const isSpecialUser = currentUserId === import.meta.env.VITE_SPECIAL_USER_ID;

  const {
    activeModal,
    closeModal,
    openModal,
    selectedCareer,
    setSelectedCareer,
  } = useModalManager();

  const { saveClick, setSaveClick } = useSaveClick();

  const {
    boardItems,
    requestMerge,
    pendingMerge,
    confirmMerge,
    cancelMerge,
    requestRemoval,
    pendingRemoval,
    confirmRemoval,
    cancelRemoval,
    toastError,
    isProcessing,
  } = useCareerBoard(careers);

  const { dragId, dragSource, dragPos, overId, dragInfoRef, handleDragStart } =
    useDragAndDrop((sourceId, targetId) => {
      requestMerge(sourceId, targetId);
    });

  const onOpenModal = (modalType: ModalType, career?: Career) => {
    setSaveClick(window.scrollY);
    if (career) setSelectedCareer(career);
    openModal(modalType);
  };

  const hidden =
    activeModal !== ModalType.NONE &&
    activeModal !== ModalType.SLIDE_UP_PANEL &&
    Styles.hidden;

  if (loading || isProcessing) return <Load />;

  const contextValue = {
    onOpenModal,
    setSelectedCareer,
    onDragStart: handleDragStart,
    buttons,
    requestRemoval,
  };

  return (
    <CareerPageContext.Provider value={contextValue}>
      {careers.length > 0 ? (
        <div className={classNames(Styles.container, hidden)}>
          <PrimaryHeader text="Minhas Carreiras">
            <div className={Styles.wrapperBtns}>
              <Button
                isActive
                fontSize="large"
                fontWeight="bold"
                onClick={() => onOpenModal(ModalType.NEW_CAREER)}
              >
                Nova Carreira
              </Button>
              {isSpecialUser && (
                <Button
                  isActive
                  fontSize="large"
                  fontWeight="bold"
                  onClick={() => onOpenModal(ModalType.EDIT_TEAMS)}
                  style={{ width: "100%" }}
                >
                  Editar Times
                </Button>
              )}
            </div>
          </PrimaryHeader>

          <main className={Styles.main}>
            {boardItems.map((item) => (
              <div
                key={item.id}
                data-drop-id={item.id}
                className={classNames(
                  Styles.cardWrapper,
                  dragId === item.id && Styles.isDragging,
                  overId === item.id && Styles.isOver,
                )}
              >
                {item.type === "single" ? (
                  <CareerCard career={item.data} />
                ) : (
                  <CareerGroupCard save={item.data} />
                )}
              </div>
            ))}
          </main>
        </div>
      ) : (
        <EmptyCareers onOpenModal={onOpenModal} />
      )}

      {dragSource && dragPos && (
        <DragGhost
          dragSource={dragSource}
          dragPos={dragPos}
          offsetX={dragInfoRef.current?.offsetX ?? 20}
          offsetY={dragInfoRef.current?.offsetY ?? 20}
        />
      )}

      {toastError && <div className={Styles.toastError}>{toastError}</div>}

      {pendingMerge && (
        <ConfirmModal
          title="Agrupar carreiras?"
          description={`"${pendingMerge.sourceLabel}" será movido para "${pendingMerge.targetLabel}".`}
          confirmText="Agrupar"
          onCancel={cancelMerge}
          onConfirm={confirmMerge}
        />
      )}

      {pendingRemoval && (
        <ConfirmModal
          title="Remover da save?"
          description={`"${pendingRemoval.clubName}" voltará a ser uma carreira separada, fora da save de ${pendingRemoval.managerName}.`}
          confirmText="Remover"
          onCancel={cancelRemoval}
          onConfirm={confirmRemoval}
        />
      )}

      {activeModal === ModalType.NONE && <BottomMenu noHavePlayers />}

      <ModalManager
        saveClick={saveClick}
        setSelectedCareer={setSelectedCareer}
        selectedCareer={selectedCareer}
        activeModal={activeModal}
        onClose={closeModal}
      />
    </CareerPageContext.Provider>
  );
};

export default CareersPage;
