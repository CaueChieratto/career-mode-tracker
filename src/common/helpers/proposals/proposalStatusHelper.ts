import {
  ClubNegotiationStage,
  OverallProposalStatus,
  PlayerNegotiationStage,
  TransferProposal,
} from "../../interfaces/proposals/transferProposal";

export const ALLOWED_TRANSFER_TIMINGS = [
  "Imediata",
  "Proxima janela",
  "Proxima temporada",
] as const;

export const ALL_TRANSFER_TIMING_VARIANTS = [
  "Imediata",
  "Imediato",
  "Proxima janela",
  "Proxima Janela",
  "Próxima Janela",
  "Proxima temporada",
  "Proxima Temporada",
  "Próxima Temporada",
] as const;

/**
 * Gera ID no formato determinístico seguro prop_${Date.now()}_${random}
 */
export function generateProposalId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calcula o overallStatus da proposta a partir do status de suas etapas obrigatórias.
 */
export function calculateOverallProposalStatus(
  proposal: Pick<TransferProposal, "type"> & {
    clubNegotiation?: ClubNegotiationStage;
    playerNegotiation?: PlayerNegotiationStage;
    overallStatus?: OverallProposalStatus;
  },
): OverallProposalStatus {
  if (proposal.overallStatus === "concluida") {
    return "concluida";
  }

  const { type, clubNegotiation, playerNegotiation } = proposal;

  switch (type) {
    case "compra":
    case "emprestimo_entrada": {
      const clubStatus = clubNegotiation?.status;
      const playerStatus = playerNegotiation?.status;

      if (clubStatus === "rejeitada" || playerStatus === "rejeitada") {
        return "rejeitada";
      }
      if (clubStatus === "cancelada" || playerStatus === "cancelada") {
        return "cancelada";
      }
      if (clubStatus === "aceita" && playerStatus === "aceita") {
        return "aguardando_confirmacao";
      }
      return "em_andamento";
    }

    case "venda":
    case "emprestimo_saida": {
      const clubStatus = clubNegotiation?.status;
      const hasIncomingSwap =
        type === "venda" && Boolean(clubNegotiation?.swapPlayer?.playerName);

      if (
        clubStatus === "rejeitada" ||
        (hasIncomingSwap && playerNegotiation?.status === "rejeitada")
      ) {
        return "rejeitada";
      }
      if (
        clubStatus === "cancelada" ||
        (hasIncomingSwap && playerNegotiation?.status === "cancelada")
      ) {
        return "cancelada";
      }
      if (hasIncomingSwap && playerNegotiation) {
        if (clubStatus === "aceita" && playerNegotiation.status === "aceita") {
          return "aguardando_confirmacao";
        }
        return "em_andamento";
      }
      if (clubStatus === "aceita") {
        return "aguardando_confirmacao";
      }
      return "em_andamento";
    }

    case "renovacao": {
      const playerStatus = playerNegotiation?.status;

      if (playerStatus === "rejeitada") {
        return "rejeitada";
      }
      if (playerStatus === "cancelada") {
        return "cancelada";
      }
      if (playerStatus === "aceita") {
        return "aguardando_confirmacao";
      }
      return "em_andamento";
    }

    default:
      return "em_andamento";
  }
}

/**
 * Validação de integridade e regras de negócio para as etapas de proposta:
 * - Em renovações: agentFee é expressamente proibido (> 0) e clubNegotiation não deve existir.
 * - Em vendas/empréstimos de saída: playerNegotiation não deve existir.
 */
export function validateProposalStageRules(
  proposal: Partial<TransferProposal>,
): void {
  const { type, playerNegotiation, clubNegotiation } = proposal;

  if (type === "renovacao") {
    if (
      playerNegotiation?.agentFee !== undefined &&
      playerNegotiation.agentFee > 0
    ) {
      throw new Error("Taxa de agência é proibida em propostas de renovação");
    }
    if (clubNegotiation !== undefined) {
      throw new Error(
        "Negociação com o clube não é aplicável a propostas de renovação",
      );
    }
  }

  if (type === "venda" || type === "emprestimo_saida") {
    const hasIncomingSwap =
      type === "venda" && Boolean(clubNegotiation?.swapPlayer?.playerName);
    if (playerNegotiation !== undefined && !hasIncomingSwap) {
      throw new Error(
        "Negociação com o atleta não é aplicável a propostas de venda ou empréstimo de saída",
      );
    }
  }
}

/**
 * Valida se um valor de timing corresponde a uma das opções autorizadas.
 */
export function isValidTransferTiming(timing: unknown): boolean {
  if (typeof timing !== "string") return false;
  return ALL_TRANSFER_TIMING_VARIANTS.includes(
    timing as (typeof ALL_TRANSFER_TIMING_VARIANTS)[number],
  );
}

/**
 * Valida o timing de transferência, lançando erro se inválido.
 */
export function validateProposalTiming(timing: unknown): void {
  if (!isValidTransferTiming(timing)) {
    throw new Error(
      `Timing de transferência inválido: ${String(timing)}. Permitidos: ${ALLOWED_TRANSFER_TIMINGS.join(", ")}`,
    );
  }
}

/**
 * Validação rigorosa de timing e datas de acordo fechado (dataArrival, dataExit, agreementDate).
 * Garante que timing nunca seja preenchido com datas e vice-versa.
 */
export function validateProposalDates(params: {
  timing?: unknown;
  dataArrival?: unknown;
  dataExit?: unknown;
  agreementDate?: unknown;
}): void {
  const { timing, dataArrival, dataExit, agreementDate } = params;
  const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

  if (timing !== undefined) {
    if (typeof timing === "string" && DATE_REGEX.test(timing.trim())) {
      throw new Error(
        "Timing não pode ser uma data de calendário (dataArrival ou dataExit). Use um dos valores permitidos como 'Imediata', 'Proxima janela' ou 'Proxima temporada'.",
      );
    }
    if (!isValidTransferTiming(timing)) {
      throw new Error(
        `Timing de transferência inválido: ${String(timing)}. Permitidos: ${ALLOWED_TRANSFER_TIMINGS.join(", ")}`,
      );
    }
  }

  if (dataArrival !== undefined) {
    if (typeof dataArrival !== "string" || !DATE_REGEX.test(dataArrival.trim())) {
      throw new Error(
        "dataArrival deve ser uma data válida no formato DD/MM/AAAA",
      );
    }
    if (isValidTransferTiming(dataArrival)) {
      throw new Error(
        "dataArrival representa a data do acordo de chegada e não pode receber valores de timing.",
      );
    }
  }

  if (dataExit !== undefined) {
    if (typeof dataExit !== "string" || !DATE_REGEX.test(dataExit.trim())) {
      throw new Error(
        "dataExit deve ser uma data válida no formato DD/MM/AAAA",
      );
    }
    if (isValidTransferTiming(dataExit)) {
      throw new Error(
        "dataExit representa a data do acordo de saída e não pode receber valores de timing.",
      );
    }
  }

  if (agreementDate !== undefined) {
    if (
      typeof agreementDate !== "string" ||
      !DATE_REGEX.test(agreementDate.trim())
    ) {
      throw new Error(
        "agreementDate deve ser uma data válida no formato DD/MM/AAAA",
      );
    }
    if (isValidTransferTiming(agreementDate)) {
      throw new Error(
        "agreementDate representa a data do acordo fechado e não pode receber valores de timing.",
      );
    }
  }
}

/**
 * Aplica uma contraproposta sobrescrevendo os valores da etapa in-place
 * sem duplicar histórico e retrocedendo o status da etapa para 'em_negociacao'.
 */
export function applyCounterOffer<T extends TransferProposal>(
  proposal: T,
  stage: "club" | "player",
  updatedTerms: Partial<ClubNegotiationStage> | Partial<PlayerNegotiationStage>,
): T {
  const updated = { ...proposal };

  if (stage === "club") {
    if (proposal.type === "renovacao") {
      throw new Error("Negociação com o clube não é permitida em renovações.");
    }
    updated.clubNegotiation = {
      ...(proposal.clubNegotiation || { partnerClub: "" }),
      ...(updatedTerms as Partial<ClubNegotiationStage>),
      status: "em_negociacao",
    };
  } else if (stage === "player") {
    const hasIncomingSwap =
      proposal.type === "venda" &&
      Boolean(proposal.clubNegotiation?.swapPlayer?.playerName);
    if (
      (proposal.type === "venda" || proposal.type === "emprestimo_saida") &&
      !hasIncomingSwap
    ) {
      throw new Error(
        "Negociação com o atleta não é permitida em vendas ou saídas.",
      );
    }
    updated.playerNegotiation = {
      ...(proposal.playerNegotiation || {
        weeklyWage: 0,
        durationYears: 1,
        squadRole: "Rodízio" as const,
      }),
      ...(updatedTerms as Partial<PlayerNegotiationStage>),
      status: "em_negociacao",
    };
  }

  validateProposalStageRules(updated);
  updated.overallStatus = calculateOverallProposalStatus(updated);
  updated.updatedAt = Date.now();

  return updated;
}
