import { Dispatch, ReactNode, SetStateAction } from "react";
import Styles from "./Card.module.css";
import ContainerIcon from "../../components/ContainerIcon";
import { FaRegEdit } from "react-icons/fa";
import { ModalType } from "../../common/types/enums/ModalType";
import { Career } from "../../common/interfaces/Career";

type CardProps = {
  children: ReactNode;
  selectedCareer?: Career;
  setSelectedCareer?: Dispatch<SetStateAction<Career>>;
  onOpenModal?: (type: ModalType, selectedCareer: Career) => void;
  className?: string;
  onClick?: () => void;
  id?: string;
};

const Card = ({
  children,
  selectedCareer,
  setSelectedCareer,
  onOpenModal,
  className,
  onClick,
  id,
}: CardProps) => {
  return (
    <div id={id} className={className ?? Styles.card} onClick={onClick}>
      {!className ? (
        <ContainerIcon
          className={Styles.icon_container}
          onClick={() => {
            if (selectedCareer && setSelectedCareer && onOpenModal) {
              setSelectedCareer(selectedCareer);
              onOpenModal(ModalType.EDIT_CLUB, selectedCareer);
            }
          }}
        >
          <div className={Styles.icon}>
            <FaRegEdit size={20} />
          </div>
        </ContainerIcon>
      ) : null}
      {children}
    </div>
  );
};

export default Card;
