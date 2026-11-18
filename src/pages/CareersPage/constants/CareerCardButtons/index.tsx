import { ComponentProps } from "react";
import Button from "../../../../components/Button";
import { Career } from "../../../../common/interfaces/Career";
import { ModalType } from "../../../../common/types/enums/ModalType";

type ButtonProps = ComponentProps<typeof Button>;

export interface ButtonConfig {
  text: string;
  modal?: ModalType;
  props?: Omit<ButtonProps, "children" | "onClick">;
  onClick?: (career: Career) => void;
}

export const getCareerCardButtons = (
  onOpenAddSeasons: (career: Career) => void,
): ButtonConfig[] => [
  {
    text: "Entrar",
    onClick: (career) => {
      window.scrollTo(0, 0);
      onOpenAddSeasons(career);
    },
    props: { radius: "square", color: "club_secondary", isActive: true },
  },
  {
    text: "Títulos",
    modal: ModalType.SLIDE_UP_PANEL,
    props: { radius: "square" },
  },
  {
    text: "Excluir",
    modal: ModalType.DELETE_CONFIRM,
    props: { radius: "square" },
  },
];
