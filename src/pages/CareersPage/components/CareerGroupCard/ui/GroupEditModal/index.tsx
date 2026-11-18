import { useState } from "react";
import { Career } from "../../../../../../common/interfaces/Career";
import { ColorsService } from "../../../../../../common/services/ColorsService";
import Styles from "./GroupEditModal.module.css";
import { FaImage } from "react-icons/fa";
import Modal from "../../../../../../components/Modal";
import Button from "../../../../../../components/Button";
import { CardsModal } from "../../../../../../ui/modals/SeasonConfigs/components/CardsModal";

type GroupEditModalProps = {
  careers: Career[];
  onClose: () => void;
  onSelectCareer: (career: Career) => void;
};

export const GroupEditModal = ({
  careers,
  onClose,
  onSelectCareer,
}: GroupEditModalProps) => {
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);

  const selectedColor = selectedCareer
    ? ColorsService.getColorSaved(selectedCareer.id) ||
      selectedCareer.colorsTeams[0] ||
      "#333"
    : "#333";

  return (
    <Modal
      isOpen
      closeModal={onClose}
      animationContainer="grow"
      text="Escolha para editar"
    >
      <div className={Styles.container}>
        <div className={Styles.grid}>
          {careers.map((career) => {
            const clubColor =
              ColorsService.getColorSaved(career.id) ||
              career.colorsTeams[0] ||
              "#333";
            const darkClubColor = career.colorsTeams[1] || clubColor;
            const isSelected = selectedCareer?.id === career.id;

            return (
              <CardsModal
                key={career.id}
                icon={
                  career.teamBadge ? (
                    <img
                      src={career.teamBadge}
                      alt={`Escudo do ${career.clubName}`}
                      className={Styles.badge}
                    />
                  ) : (
                    <FaImage size={18} color={clubColor} />
                  )
                }
                label={career.managerName}
                title={career.clubName}
                clubColor={clubColor}
                darkClubColor={darkClubColor}
                isSelected={isSelected}
                onClick={() => setSelectedCareer(career)}
              />
            );
          })}
        </div>

        {selectedCareer && (
          <Button
            className={Styles.button}
            onClick={() => onSelectCareer(selectedCareer)}
            style={{
              backgroundColor: selectedColor,
            }}
          >
            Editar {selectedCareer.clubName}
          </Button>
        )}
      </div>
    </Modal>
  );
};
