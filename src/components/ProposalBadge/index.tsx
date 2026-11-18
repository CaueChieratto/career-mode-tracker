import React from "react";
import {
  NegotiationStageStatus,
  OverallProposalStatus,
} from "../../common/interfaces/proposals/transferProposal";
import Styles from "./ProposalBadge.module.css";

export interface ProposalBadgeProps {
  status: NegotiationStageStatus | OverallProposalStatus;
  label?: string;
  variant?: "stage" | "overall";
  className?: string;
}

const getStatusLabel = (
  status: NegotiationStageStatus | OverallProposalStatus,
  variant: "stage" | "overall" = "overall",
): string => {
  switch (status) {
    case "em_andamento":
      return "Em Andamento";
    case "em_negociacao":
      return variant === "stage" ? "Em Negociação" : "Em Andamento";
    case "aguardando_confirmacao":
      return "Aguardando Confirmação";
    case "aceita":
      return "Aceita";
    case "concluida":
      return "Concluída";
    case "rejeitada":
      return "Rejeitada";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
};

const getStatusStyleClass = (
  status: NegotiationStageStatus | OverallProposalStatus,
): string => {
  switch (status) {
    case "aceita":
    case "concluida":
      return Styles.success;
    case "aguardando_confirmacao":
      return Styles.info;
    case "em_negociacao":
    case "em_andamento":
      return Styles.warning;
    case "rejeitada":
    case "cancelada":
      return Styles.danger;
    default:
      return Styles.neutral;
  }
};

export const ProposalBadge: React.FC<ProposalBadgeProps> = ({
  status,
  label,
  variant = "overall",
  className = "",
}) => {
  const displayLabel = label || getStatusLabel(status, variant);
  const colorClass = getStatusStyleClass(status);

  return (
    <span
      className={`${Styles.badge} ${colorClass} ${className}`.trim()}
      role="status"
      data-testid="proposal-badge"
    >
      {displayLabel}
    </span>
  );
};

export default ProposalBadge;

