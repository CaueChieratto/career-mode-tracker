import { Career } from "../../../interfaces/Career";
import { ClubData } from "../../../interfaces/club/clubData";
import {
  findAchievedObjectiveBonusesToSettle,
  findAchievedWageAdjustmentsToApply,
} from "../../ServiceFinance/clauseAutoEvaluator";
import { clauseSettlementService } from "./clauseSettlementService";
import { playerRenewalService } from "./playerRenewalService";

export interface AutoSettledBonusRecord {
  playerId: string;
  playerName: string;
  bonusId: string;
  bonusName: string;
  targetLeague?: string;
  value: number;
}

export interface AutoSettleObjectiveBonusesResult {
  settledCount: number;
  settledBonuses: AutoSettledBonusRecord[];
}

const inFlightSettlementKeys = new Set<string>();

export const objectiveBonusAutoSettlementService = {
  autoSettleAchievedObjectiveBonuses: async (
    careerId: string,
    seasonId: string,
    career: Career,
    season: ClubData,
  ): Promise<AutoSettleObjectiveBonusesResult> => {
    if (!careerId || !seasonId || seasonId === "geral") {
      return { settledCount: 0, settledBonuses: [] };
    }

    const candidates = findAchievedObjectiveBonusesToSettle(career, season);
    const wageCandidates = findAchievedWageAdjustmentsToApply(career, season);
    if (candidates.length === 0 && wageCandidates.length === 0) {
      return { settledCount: 0, settledBonuses: [] };
    }

    const settledBonuses: AutoSettledBonusRecord[] = [];

    for (const candidate of candidates) {
      const flightKey = `${careerId}:${seasonId}:${candidate.playerId}:${candidate.bonus.id}`;
      if (inFlightSettlementKeys.has(flightKey)) continue;

      inFlightSettlementKeys.add(flightKey);
      try {
        await clauseSettlementService.settleBonus(
          careerId,
          seasonId,
          candidate.playerId,
          candidate.bonus.id,
          candidate.contractIndex,
          candidate.isContractDetailsBonus,
          true,
        );

        // Sincroniza o bônus no objeto da temporada em memória
        const targetPlayer = (season.players || []).find(
          (p) => p.id === candidate.playerId,
        );
        if (targetPlayer) {
          const applyPaid = (b: typeof candidate.bonus) => {
            b.status = "paid";
            b.paid = true;
            b.autoEvaluated = true;
            b.paidSeasonId = seasonId;
            b.paidSeasonNumber = season.seasonNumber;
            delete b.autoSettlementDisabled;
          };

          if (candidate.isContractDetailsBonus) {
            const found = targetPlayer.contractDetails?.performanceBonuses?.find(
              (b) => b.id === candidate.bonus.id,
            );
            if (found) applyPaid(found);
          } else if (
            candidate.contractIndex !== undefined &&
            targetPlayer.contract?.[candidate.contractIndex]
          ) {
            const targetContract = targetPlayer.contract[candidate.contractIndex];
            const foundInContract = targetContract.bonuses?.find(
              (b) => b.id === candidate.bonus.id,
            );
            if (foundInContract) applyPaid(foundInContract);
            const foundInDetails =
              targetContract.contractDetails?.performanceBonuses?.find(
                (b) => b.id === candidate.bonus.id,
              );
            if (foundInDetails) applyPaid(foundInDetails);
          }
        }

        settledBonuses.push({
          playerId: candidate.playerId,
          playerName: candidate.playerName,
          bonusId: candidate.bonus.id,
          bonusName:
            candidate.bonus.bonusTarget ||
            candidate.bonus.targetObjective ||
            candidate.bonus.name,
          targetLeague: candidate.bonus.targetLeague,
          value: candidate.bonus.value,
        });
      } catch (err) {
        console.warn(
          `Falha ao liquidar automaticamente bônus "${candidate.bonus.name}" de ${candidate.playerName}:`,
          err,
        );
      } finally {
        inFlightSettlementKeys.delete(flightKey);
      }
    }

    // Auto-aplica cláusulas de reajuste salarial de metas cumpridas na competição informada
    try {
      const wageCandidates = findAchievedWageAdjustmentsToApply(career, season);
      for (const wc of wageCandidates) {
        const flightKey = `${careerId}:${seasonId}:${wc.playerId}:wageAdj:${wc.contractIndex}`;
        if (inFlightSettlementKeys.has(flightKey)) continue;

        inFlightSettlementKeys.add(flightKey);
        try {
          await playerRenewalService.applyRenewalWageAdjustment(
            careerId,
            seasonId,
            wc.playerId,
            wc.contractIndex,
          );
        } catch (err) {
          console.warn(
            `Falha ao auto-aplicar ajuste salarial para ${wc.playerName}:`,
            err,
          );
        } finally {
          inFlightSettlementKeys.delete(flightKey);
        }
      }
    } catch (err) {
      console.warn("Falha ao avaliar reajustes salariais automáticos:", err);
    }

    return {
      settledCount: settledBonuses.length,
      settledBonuses,
    };
  },
};
