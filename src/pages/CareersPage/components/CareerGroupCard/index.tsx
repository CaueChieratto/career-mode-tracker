import { useState } from "react";
import Styles from "./CareerGroupCard.module.css";
import { CareerGroup } from "../../../../common/interfaces/CareerGroup";
import { useCareerGroupData } from "./hooks/useCareerGroupData";
import { GroupHeader } from "./ui/GroupHeader";
import { GroupTimeline } from "./ui/GroupTimeline";
import {
  CareerGroupContext,
  useCareerPage,
} from "../../contexts/CareerPageContext";
import { Career } from "../../../../common/interfaces/Career";
import { ModalType } from "../../../../common/types/enums/ModalType";
import { GroupEditModal } from "./ui/GroupEditModal";
import { useNavigate } from "react-router-dom";

type CareerGroupCardProps = {
  save: CareerGroup;
};

export const CareerGroupCard = ({ save }: CareerGroupCardProps) => {
  const navigate = useNavigate();

  const { sortedCareers, currentId, totalTrophies, startYear, endYear } =
    useCareerGroupData(save);

  const [expandedId, setExpandedId] = useState<string | null>(
    currentId ?? null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { onOpenModal, setSelectedCareer } = useCareerPage();

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleEditCareer = (career: Career) => {
    setSelectedCareer(career);
    onOpenModal(ModalType.EDIT_CLUB, career);
    setIsEditModalOpen(false);
  };

  const handleOpenGroupTrophies = () => {
    if (save.careers.length === 0) return;
    const latestCareer = save.careers[save.careers.length - 1];
    const groupCareer = {
      ...latestCareer,
      id: save.id,
      groupedCareers: save.careers,
    } as Career & { groupedCareers?: Career[] };

    setSelectedCareer(groupCareer);
    onOpenModal(ModalType.SLIDE_UP_PANEL, groupCareer);
  };

  return (
    <CareerGroupContext.Provider value={save.id}>
      <div className={Styles.groupContainer}>
        <GroupHeader
          managerName={save.managerName}
          careersCount={save.careers.length}
          careers={save.careers}
          startYear={startYear}
          endYear={endYear}
          totalTrophies={totalTrophies}
          onOpenEdit={() => setIsEditModalOpen(true)}
          onOpenTrophies={handleOpenGroupTrophies}
          onNavigate={() =>
            navigate(`/CareerGroup/${save.id}/Geral`, { state: { save } })
          }
        />
        <GroupTimeline
          sortedCareers={sortedCareers}
          currentId={currentId}
          expandedId={expandedId}
          onToggleExpand={handleToggleExpand}
        />
      </div>

      {isEditModalOpen && (
        <GroupEditModal
          careers={save.careers}
          onClose={() => setIsEditModalOpen(false)}
          onSelectCareer={handleEditCareer}
        />
      )}
    </CareerGroupContext.Provider>
  );
};
