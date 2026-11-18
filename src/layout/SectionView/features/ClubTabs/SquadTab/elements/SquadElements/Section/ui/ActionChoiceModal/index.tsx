import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import Modal from "../../../../../../../../../../components/Modal";
import Button from "../../../../../../../../../../components/Button";
import { CardsModal } from "../../../../../../../../../../ui/modals/SeasonConfigs/components/CardsModal";
import { SeasonThemeContext } from "../../../../../../../../../../contexts/SeasonThemeContext";
import Styles from "./ActionChoiceModal.module.css";

export type ActionChoiceOption = {
  key: string;
  title: string;
  text: string;
  icon: IconType;
  actionLabel: string;
};

export type ActionChoiceModalProps = {
  title: string;
  options: ActionChoiceOption[];
  onClose: () => void;
  onConfirm: (selectedKey: string) => void;
  clubColor?: string;
  darkClubColor?: string;
};

export const ActionChoiceModal = ({
  title,
  options,
  onClose,
  onConfirm,
  clubColor,
  darkClubColor,
}: ActionChoiceModalProps) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const seasonTheme = useContext(SeasonThemeContext);

  const resolvedClubColor = clubColor ?? seasonTheme?.clubColor ?? "#ffffff";
  const resolvedDarkClubColor =
    darkClubColor ?? seasonTheme?.activeStyle?.darkClubColor ?? "#000000";

  const selectedOption = options.find((opt) => opt.key === selectedKey) ?? null;

  const handleClose = () => {
    document.body.classList.remove("modal-open");
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedKey) return;
    document.body.classList.remove("modal-open");
    onConfirm(selectedKey);
  };

  const modalContent = (
    <Modal
      isOpen={true}
      closeModal={handleClose}
      animationContainer="grow"
      text={title}
    >
      <div className={Styles.container}>
        <div className={Styles.grid}>
          {options.map((option) => {
            const IconComponent = option.icon;
            return (
              <CardsModal
                key={option.key}
                icon={<IconComponent className={Styles.icon} />}
                label={option.text}
                title={option.title}
                onClick={() => setSelectedKey(option.key)}
                clubColor={resolvedClubColor}
                darkClubColor={resolvedDarkClubColor}
                isSelected={selectedKey === option.key}
              />
            );
          })}
        </div>

        {selectedOption && (
          <Button
            className={Styles.button}
            onClick={handleConfirm}
            style={{
              backgroundColor: resolvedClubColor,
              border: `1px solid ${resolvedDarkClubColor}`,
            }}
          >
            {selectedOption.actionLabel}
          </Button>
        )}
      </div>
    </Modal>
  );

  return createPortal(modalContent, document.body);
};

export default ActionChoiceModal;
