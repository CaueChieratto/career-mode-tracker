import { ComponentProps } from "react";
import { NavigateFunction } from "react-router-dom";
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
  navigate: NavigateFunction,
): ButtonConfig[] => [
  {
    text: "Entrar",
    onClick: (career) => {
      window.scrollTo(0, 0);
      navigate(`/Career/${career.id}`, { state: { career } });
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

export const CareerCardButtons: ButtonConfig[] = [
  {
    text: "Entrar",
    onClick: (career) => (window.location.href = `/Career/${career.id}`),
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
