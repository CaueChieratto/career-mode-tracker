import { Contract } from "../../interfaces/playersInfo/contract";
import {
  TransferBonus,
} from "../../interfaces/playersInfo/transferTerms";
import { WageAdjustmentClause } from "../../interfaces/playersInfo/contractClauses";
import { parseValue } from "../../utils/FormatValue";

export interface UnifiedTransferBonus extends TransferBonus {
  bonusOrigin?: "club" | "player";
  achieved?: boolean;
}

export interface ResolvedContractPlayerClauses {
  releaseClause?: number;
  wageAdjustment?: WageAdjustmentClause;
  signingBonus?: number | string;
  agentFee?: number;
  allBonuses: UnifiedTransferBonus[];
  clubBonuses: UnifiedTransferBonus[];
  playerBonuses: UnifiedTransferBonus[];
  hasAnyPlayerClauses: boolean;
}

/**
 * Resolve e normaliza cláusulas do atleta negociadas em compras ou renovações,
 * unificando contractClauses, contractDetails e legados da raiz do Contract.
 */
export const resolveContractPlayerClauses = (
  contract?: Contract | null,
): ResolvedContractPlayerClauses => {
  if (!contract) {
    return {
      releaseClause: undefined,
      wageAdjustment: undefined,
      signingBonus: undefined,
      allBonuses: [],
      clubBonuses: [],
      playerBonuses: [],
      hasAnyPlayerClauses: false,
    };
  }

  // 1. Multa Rescisória
  let rawRelease =
    contract.contractClauses?.releaseClause ??
    contract.contractDetails?.releaseClause;
  if (rawRelease === undefined && contract.releaseClause) {
    rawRelease =
      typeof contract.releaseClause === "number"
        ? contract.releaseClause
        : parseValue(String(contract.releaseClause));
  }
  const releaseClause =
    rawRelease !== undefined && Number(rawRelease) > 0
      ? Number(rawRelease)
      : undefined;

  // 2. Ajuste Salarial
  const wageAdjustment =
    contract.contractClauses?.wageAdjustment ||
    contract.contractDetails?.wageAdjustment;

  // 3. Luvas / Signing Bonus
  const signingBonus =
    contract.contractDetails?.signingBonus ?? contract.signingBonus;

  // 3.5. Taxa de agência
  let rawAgentFee = contract.contractDetails?.agentFee;
  if (
    rawAgentFee === undefined &&
    (contract as { agentFee?: number | string }).agentFee
  ) {
    const rawVal = (contract as { agentFee?: number | string }).agentFee;
    rawAgentFee =
      typeof rawVal === "number" ? rawVal : parseValue(String(rawVal));
  }
  const agentFee =
    rawAgentFee !== undefined && Number(rawAgentFee) > 0
      ? Number(rawAgentFee)
      : undefined;

  // 4. Bônus (Deduplicação e Classificação)
  const rawClubBonuses = contract.bonuses || [];
  const rawPlayerBonuses = contract.contractDetails?.performanceBonuses || [];

  const seenIds = new Set<string>();
  const allBonuses: UnifiedTransferBonus[] = [];

  const getBonusKey = (b: TransferBonus): string => {
    if (b.id) return b.id;
    return `${b.category}_${b.metric || ""}_${b.targetObjective || ""}_${b.value}_${b.metricTarget || ""}`;
  };

  // Processa bônus do clube
  for (const b of rawClubBonuses) {
    const key = getBonusKey(b);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      const bRecord = b as unknown as Record<string, unknown>;
      const isPlayerBonus =
        bRecord.bonusOrigin === "player" ||
        bRecord.bonusCategory === "player";
      allBonuses.push({
        ...b,
        bonusOrigin: isPlayerBonus ? "player" : "club",
        achieved: (bRecord.achieved as boolean | undefined) ?? b.paid ?? false,
      });
    }
  }

  // Processa bônus do atleta
  for (const b of rawPlayerBonuses) {
    const key = getBonusKey(b);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      const bRecord = b as unknown as Record<string, unknown>;
      allBonuses.push({
        ...b,
        bonusOrigin: "player",
        achieved: (bRecord.achieved as boolean | undefined) ?? b.paid ?? false,
      });
    }
  }

  const clubBonuses = allBonuses.filter((b) => b.bonusOrigin !== "player");
  const playerBonuses = allBonuses.filter((b) => b.bonusOrigin === "player");

  const hasAnyPlayerClauses = Boolean(
    (releaseClause && releaseClause > 0) ||
      (wageAdjustment &&
        (Boolean(wageAdjustment.enabled) ||
          wageAdjustment.percentage > 0 ||
          Boolean(wageAdjustment.targetObjective))) ||
      (agentFee && agentFee > 0) ||
      playerBonuses.length > 0,
  );

  return {
    releaseClause,
    wageAdjustment,
    signingBonus,
    agentFee,
    allBonuses,
    clubBonuses,
    playerBonuses,
    hasAnyPlayerClauses,
  };
};

/**
 * Mescla bônus do clube e bônus de performance do atleta para persistência
 */
export const mergeClubAndPlayerBonuses = (
  clubBonuses: TransferBonus[] = [],
  playerBonuses: TransferBonus[] = [],
): TransferBonus[] => {
  const seenIds = new Set<string>();
  const merged: TransferBonus[] = [];

  for (const b of clubBonuses) {
    const id = b.id || `bonus_club_${Date.now()}_${Math.random()}`;
    if (!seenIds.has(id)) {
      seenIds.add(id);
      merged.push({ ...b, id, bonusOrigin: "club" } as UnifiedTransferBonus);
    }
  }

  for (const b of playerBonuses) {
    const id = b.id || `bonus_player_${Date.now()}_${Math.random()}`;
    if (!seenIds.has(id)) {
      seenIds.add(id);
      merged.push({ ...b, id, bonusOrigin: "player" } as UnifiedTransferBonus);
    }
  }

  return merged;
};

/**
 * Separa array unificado em bônus de clube e de atleta
 */
export const splitClubAndPlayerBonuses = (
  allBonuses: UnifiedTransferBonus[] = [],
): { clubBonuses: TransferBonus[]; playerBonuses: TransferBonus[] } => {
  const clubBonuses: TransferBonus[] = [];
  const playerBonuses: TransferBonus[] = [];

  for (const b of allBonuses) {
    if (b.bonusOrigin === "player") {
      playerBonuses.push(b);
    } else {
      clubBonuses.push(b);
    }
  }

  return { clubBonuses, playerBonuses };
};

