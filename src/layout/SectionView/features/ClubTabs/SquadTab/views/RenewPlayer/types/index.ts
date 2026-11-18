import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { OptimisticUpdateData } from "../../../../../../helpers/updateSectionCareer";
import { SectionScreen } from "../../../../../../config/screens";
import { TransferProposal } from "../../../../../../../../common/interfaces/proposals/transferProposal";

export interface RenewPlayerProps {
  career: Career;
  season: ClubData;
  seasonId?: string;
  playerId: string;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  proposalId?: string;
  initialProposal?: TransferProposal;
}

export interface RenewalFormValues {
  salary?: string;
  contractTime?: string; // Duração em anos (número)
  contractUntil?: string; // Data final calculada
  signingBonus?: string;
  releaseClause?: string;
  wageAdjustmentType?: string; // "N/D" | "Aumentar" | "Diminuir"
  wageAdjustmentObjective?: string;
  wageAdjustmentLeague?: string;
  wageAdjustmentPercentage?: string; // "5%" | "10%" | "15%" | "20%" | "25%"
  wageAdjustmentStatus?: string; // "Pendente" | "Aplicado"
  bonusCategory?: "Objetivo atingido" | "Desempenho";
  bonusObjective?: string;
  bonusLeague?: string;
  bonusValue?: string;
  bonusStatus?: string;
}

export type RenewalDrawerKey = "bonuses" | "special" | null;
