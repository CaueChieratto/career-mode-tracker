import { UI_TEXT } from "../../constants/uiText";
import { Row } from "../Row";
import Styles from "./EmptySlotRow.module.css";

type EmptySlotRowProps = {
  slotId: string;
  isActive: boolean;
  onSelect: (slotId: string) => void;
};

export const EmptySlotRow = ({
  slotId,
  isActive,
  onSelect,
}: EmptySlotRowProps) => {
  const handleSelect = () => onSelect(slotId);

  return (
    <Row data-slot-id={slotId}>
      <button
        type="button"
        className={`${Styles.empty_avatar} ${
          isActive ? Styles.empty_avatar_active : ""
        }`}
        onClick={handleSelect}
      >
        <span className={Styles.plus}>+</span>
      </button>

      <span className={Styles.empty_text} onClick={handleSelect}>
        {UI_TEXT.addPlayer}
      </span>
    </Row>
  );
};
