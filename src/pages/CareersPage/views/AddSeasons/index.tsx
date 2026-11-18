import { useEffect, useRef } from "react";
import PrimaryHeader from "../../../../ui/PrimaryHeader";
import Styles from "./AddSeasons.module.css";
import Load from "../../../../components/Load";
import EmptySeason from "../../../../ui/EmptySeason";
import NotFoundDisplay from "../../../../components/NotFoundDisplay";
import { Buttons } from "../../../../common/elements/Buttons";
import { useAddSeasons } from "./hooks/useAddSeasons";
import SeasonList from "./components/SeasonList";
import { ModalType } from "../../../../common/types/enums/ModalType";
import BottomMenu from "../../../../ui/BottomMenu";
import { useModalManager } from "../../../../common/hooks/Modal/UseModalManager";
import { Career } from "../../../../common/interfaces/Career";
import { toast } from "../../../../common/services/ToastService";

export type AddSeasonsProps = {
  careerId?: string;
  careers?: Career[];
  loadingCareers?: boolean;
  onClose?: () => void;
};

const AddSeasons = ({
  careerId,
  careers,
  loadingCareers,
  onClose,
}: AddSeasonsProps = {}) => {
  const { loading, career, clubColor, darkClubColor, handleAddSeason, goBack } =
    useAddSeasons({ careerId, careers, loadingCareers, onClose });

  const { activeModal } = useModalManager();
  const hasNotifiedMissingCareerRef = useRef(false);

  useEffect(() => {
    if (!loading && !career && !hasNotifiedMissingCareerRef.current) {
      hasNotifiedMissingCareerRef.current = true;
      toast.error("Carreira não encontrada!");
      onClose?.();
    } else if (career) {
      hasNotifiedMissingCareerRef.current = false;
    }
  }, [loading, career, onClose]);

  if (loading) return <Load />;

  if (!career) {
    return <NotFoundDisplay />;
  }

  const clubData = career.clubData || [];

  return (
    <>
      <div className={Styles.container}>
        <PrimaryHeader text="Selecionar temporadas">
          <Buttons.BackCareerPage
            goBack={goBack}
            darkClubColor={darkClubColor}
            clubColor={clubColor}
          />
        </PrimaryHeader>
        {clubData && clubData.length > 0 ? (
          <SeasonList
            clubData={clubData}
            careerId={career.id}
            career={career}
          />
        ) : (
          <EmptySeason />
        )}
        <Buttons.AddSeasonButton
          clubColor={clubColor}
          darkClubColor={darkClubColor}
          career={career}
          onAddSeason={handleAddSeason}
        />
      </div>
      {activeModal === ModalType.NONE && <BottomMenu noHavePlayers />}
    </>
  );
};

export default AddSeasons;
