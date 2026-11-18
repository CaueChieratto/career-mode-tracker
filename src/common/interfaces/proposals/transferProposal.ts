import {
  TransferInstallments,
  TransferTiming,
  PlayerSwapTerm,
  TransferBonus,
  LoanTerms,
} from "../playersInfo/transferTerms";
import {
  SquadRole,
  WageAdjustmentClause,
} from "../playersInfo/contractClauses";

export type ProposalType =
  | "compra"
  | "venda"
  | "emprestimo_entrada"
  | "emprestimo_saida"
  | "renovacao";

export type NegotiationStageStatus =
  | "em_negociacao"
  | "aceita"
  | "rejeitada"
  | "cancelada";

export type OverallProposalStatus =
  | "em_andamento"
  | "aguardando_confirmacao"
  | "concluida"
  | "rejeitada"
  | "cancelada";

/**
 * Etapa 1: Negociação com o Clube Parceiro
 * Aplicável a: compra, emprestimo_entrada, venda, emprestimo_saida
 */
export interface ClubNegotiationStage {
  status: NegotiationStageStatus;
  partnerClub: string;
  transferFee?: number; // Valor de compra ou venda acordado
  installments?: TransferInstallments;
  sellOnPercentage?: number; // 5% a 30% (mais-valia)
  buybackValue?: number; // Cláusula de recompra
  firstRefusal?: boolean; // Preferência de compra
  loanBackDuration?: 1 | 2; // Empréstimo reverso (em temporadas)
  loanTerms?: LoanTerms; // Divisão salarial e opção de compra
  swapPlayer?: PlayerSwapTerm; // Atleta envolvido na troca
  bonuses?: TransferBonus[]; // Bônus acordados com o clube
}

/**
 * Etapa 2: Negociação com o Atleta
 * Aplicável a: compra, emprestimo_entrada, renovacao
 */
export interface PlayerNegotiationStage {
  status: NegotiationStageStatus;
  weeklyWage: number;
  durationYears: number; // 1 a 7 anos
  contractUntil?: string; // Formato DD/MM/AAAA
  squadRole?: SquadRole;
  signingBonus?: number; // Luvas contratuais
  agentFee?: number; // Taxa de agência (PROIBIDO EM RENOVAÇÕES)
  releaseClause?: number; // Multa rescisória
  wageAdjustment?: WageAdjustmentClause;
  performanceBonuses?: TransferBonus[];
}

/**
 * Entidade Canônica de Proposta no Firestore
 * Caminho: users/{uid}/careers/{careerId}/seasons/{seasonId}/proposals/{proposalId}
 */
export interface TransferProposal {
  id: string; // prop_${Date.now()}_${random}
  careerId: string;
  seasonId: string;
  type: ProposalType;
  overallStatus: OverallProposalStatus;

  // Identificação do atleta
  playerId: string;
  playerName: string;
  playerNation: string;
  playerPosition: string;
  playerSector: string;
  playerOverall?: number;
  playerAge?: number;
  playerBirthDate?: string;
  playerValue?: number;
  shirtNumber?: string;
  height?: string;
  weight?: string;
  isKnownPlayer?: boolean;
  playedWithUs?: string;
  isAcademy?: boolean;
  academyData?: unknown;
  originLoanBuyOption?: boolean;

  // Etapas de Negociação
  clubNegotiation?: ClubNegotiationStage;
  playerNegotiation?: PlayerNegotiationStage;

  // Parâmetros de agenda e fechamento
  timing?: TransferTiming; // "Imediata" | "Proxima janela" | "Proxima temporada"
  agreementDate?: string; // Data do acordo fechado (preenchida na finalização definitiva)

  // Snapshot serializado para reabertura fluida do formulário
  formState?: {
    formValues: Record<string, string>;
    booleanValues: Record<string, boolean>;
  };

  // Metadados internos
  createdAt?: number;
  updatedAt?: number;
  finalizedAt?: number;
  cancelReason?: string;
}
