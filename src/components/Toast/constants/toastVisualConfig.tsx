import React from "react";
import { FaCheckCircle } from "react-icons/fa";
import { IoMdCloseCircle, IoMdInformationCircleOutline } from "react-icons/io";
import { MdOutlineWarning } from "react-icons/md";
import { BsQuestionCircle } from "react-icons/bs";
import Styles from "../Toast.module.css";
import { StandardToastType } from "../../../common/services/ToastService";

export interface ToastVisualItemConfig {
  defaultTitle: string;
  icon: React.ReactElement;
  className: string;
  role: "alert" | "status";
  ariaLive: "assertive" | "polite";
}

export const TOAST_VISUAL_CONFIG: Record<
  StandardToastType,
  ToastVisualItemConfig
> = {
  success: {
    defaultTitle: "Sucesso",
    icon: <FaCheckCircle aria-hidden="true" />,
    className: Styles.success,
    role: "status",
    ariaLive: "polite",
  },
  error: {
    defaultTitle: "Erro",
    icon: <IoMdCloseCircle aria-hidden="true" />,
    className: Styles.error,
    role: "alert",
    ariaLive: "assertive",
  },
  warning: {
    defaultTitle: "Atenção",
    icon: <MdOutlineWarning aria-hidden="true" />,
    className: Styles.warning,
    role: "alert",
    ariaLive: "assertive",
  },
  info: {
    defaultTitle: "Informação",
    icon: <IoMdInformationCircleOutline aria-hidden="true" />,
    className: Styles.info,
    role: "status",
    ariaLive: "polite",
  },
};

export const CONFIRM_VISUAL_CONFIG = {
  icon: <BsQuestionCircle aria-hidden="true" />,
  warningClass: Styles.confirmWarning,
  dangerClass: Styles.confirmDanger,
};

