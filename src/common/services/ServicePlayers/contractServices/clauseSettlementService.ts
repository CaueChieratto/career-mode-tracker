import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getCareerById } from "../../../helpers/Getters";
import { updateCareerFirestore } from "../../../helpers/Setters";
import { sanitizeFirestoreData } from "../../../utils/sanitizeFirestore";
import { db } from "../../Firebase";
import { requireAuth } from "../helpers/authHelpers";
import { ServiceFinance } from "../../ServiceFinance";
import { Career } from "../../../interfaces/Career";
import {
  TransferBonus,
  TransferInstallments,
  ClauseStatus,
  DEFAULT_AWARD_BONUSES,
  DEFAULT_PERFORMANCE_BONUSES,
  DEFAULT_OBJECTIVE_BONUSES,
  applyInstallmentSettlement,
  revertInstallmentSettlement,
} from "../../../interfaces/playersInfo/transferTerms";
import { READ_ONLY_GERAL_ERROR } from "./types";

export const clauseSettlementService = {
  unsettleBonus: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    bonusId: string,
    contractIndex?: number,
    isContractDetailsBonus?: boolean,
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    let targetBonus: TransferBonus | undefined;

    if (isContractDetailsBonus && player.contractDetails?.performanceBonuses) {
      const bonuses = [...player.contractDetails.performanceBonuses];
      const bIdx = bonuses.findIndex((b) => b.id === bonusId);
      if (bIdx >= 0) {
        const updated = {
          ...bonuses[bIdx],
          status: "pending" as ClauseStatus,
          paid: false,
          autoSettlementDisabled: true,
        };
        delete updated.paidSeasonId;
        delete updated.paidSeasonNumber;
        bonuses[bIdx] = updated;
        targetBonus = bonuses[bIdx];
        player.contractDetails = {
          ...player.contractDetails,
          performanceBonuses: bonuses,
        };
      }
    } else {
      const contracts = [...(player.contract || [])];
      for (let cIdx = 0; cIdx < contracts.length; cIdx++) {
        if (contractIndex !== undefined && cIdx !== contractIndex) continue;
        const bonuses = [...(contracts[cIdx].bonuses || [])];
        const bIdx = bonuses.findIndex((b) => b.id === bonusId);
        if (bIdx >= 0) {
          const updated = {
            ...bonuses[bIdx],
            status: "pending" as ClauseStatus,
            paid: false,
            autoSettlementDisabled: true,
          };
          delete updated.paidSeasonId;
          delete updated.paidSeasonNumber;
          bonuses[bIdx] = updated;
          targetBonus = bonuses[bIdx];
          if (contracts[cIdx].contractDetails?.performanceBonuses) {
            const pIdx = contracts[cIdx].contractDetails!.performanceBonuses!.findIndex((b) => b.id === bonusId);
            if (pIdx >= 0) {
              const pbList = [...contracts[cIdx].contractDetails!.performanceBonuses!];
              pbList[pIdx] = updated;
              contracts[cIdx].contractDetails = {
                ...contracts[cIdx].contractDetails!,
                performanceBonuses: pbList,
              };
            }
          }
          contracts[cIdx] = {
            ...contracts[cIdx],
            bonuses,
          };
          player.contract = contracts;
          break;
        }
      }
    }

    if (!targetBonus) throw new Error("Bônus não encontrado");

    try {
      const report = await ServiceFinance.getReportBySeason(careerId, seasonId);
      const match = report.entries.find(
        (e) =>
          e.id === `bonus_${bonusId}` ||
          (e.isAutomatic &&
            (e.description?.includes(targetBonus?.name || "") ||
              e.description?.includes(targetBonus?.bonusTarget || "")) &&
            e.description?.includes(player.name)),
      );
      if (match) {
        await ServiceFinance.deleteEntry(careerId, seasonId, match.id);
      }
    } catch (err) {
      console.warn("Não foi possível excluir lançamento financeiro do bônus:", err);
    }

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
    const targetInSeason = seasonToUpdate.players.find((p) => p.id === playerId);
    if (targetInSeason) Object.assign(targetInSeason, player);
  },

  unsettleInstallment: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
  ): Promise<TransferInstallments | void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const contracts = [...player.contract];
    const contract = contracts[contractIndex];
    if (!contract || !contract.installments)
      throw new Error("Parcela não encontrada");

    const { updated, undoneItem } = revertInstallmentSettlement(
      contract.installments,
    );

    contracts[contractIndex] = {
      ...contract,
      installments: updated,
    };

    const targetSeasonId = undoneItem?.paidSeasonId || seasonId;

    try {
      const report = await ServiceFinance.getReportBySeason(
        careerId,
        targetSeasonId,
      );
      const specificId = undoneItem
        ? `inst_${playerId}_${contractIndex}_${targetSeasonId}_${undoneItem.number}`
        : undefined;
      const baseId = `inst_${playerId}_${contractIndex}_${targetSeasonId}`;
      const match =
        (specificId
          ? report.entries.find((e) => e.id === specificId)
          : undefined) ||
        report.entries.find((e) => e.id === baseId) ||
        report.entries
          .slice()
          .reverse()
          .find(
            (e) =>
              e.isAutomatic &&
              e.description?.includes(player.name) &&
              (e.description?.includes("parcela") ||
                e.description?.includes("Parcela")),
          );
      if (match) {
        await ServiceFinance.deleteEntry(careerId, targetSeasonId, match.id);
      }
    } catch (err) {
      console.warn("Não foi possível excluir lançamento financeiro da parcela:", err);
    }

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(
      playerRef,
      sanitizeFirestoreData({ ...player, contract: contracts }),
    );
    Object.assign(player, { contract: contracts });
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
    const targetInSeason = seasonToUpdate.players.find((p) => p.id === playerId);
    if (targetInSeason) Object.assign(targetInSeason, player);
    return updated;
  },

  saveCustomBonusObjective: async (
    careerId: string,
    category: string,
    objective: string,
    groupId?: string | null,
  ): Promise<void> => {
    const trimmedObjective = objective.trim();
    if (!trimmedObjective) return;

    const defaultList: readonly string[] =
      category === "Prêmio"
        ? DEFAULT_AWARD_BONUSES
        : category === "Desempenho"
          ? DEFAULT_PERFORMANCE_BONUSES
          : DEFAULT_OBJECTIVE_BONUSES;

    if ((defaultList as readonly string[]).includes(trimmedObjective)) return;

    const user = requireAuth();
    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const careerSnap = await getDoc(careerRef);
    if (careerSnap.exists()) {
      const careerData = careerSnap.data() as Career;
      const currentMap = careerData.customBonusObjectives || {};
      const currentList = currentMap[category] || [];
      if (!currentList.includes(trimmedObjective)) {
        const updatedMap = {
          ...currentMap,
          [category]: [...currentList, trimmedObjective],
        };
        await updateDoc(careerRef, {
          customBonusObjectives: updatedMap,
          updatedAt: Date.now(),
        });
      }
    }

    if (groupId) {
      const groupRef = doc(db, `users/${user.uid}/careerGroups/${groupId}`);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const groupData = groupSnap.data() as {
          customBonusObjectives?: Record<string, string[]>;
        };
        const currentGroupMap = groupData.customBonusObjectives || {};
        const currentGroupList = currentGroupMap[category] || [];
        if (!currentGroupList.includes(trimmedObjective)) {
          const updatedGroupMap = {
            ...currentGroupMap,
            [category]: [...currentGroupList, trimmedObjective],
          };
          await updateDoc(groupRef, {
            customBonusObjectives: updatedGroupMap,
            updatedAt: Date.now(),
          });
        }
      }
    }
  },

  settleInstallment: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
  ): Promise<TransferInstallments | void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const contracts = [...player.contract];
    const contract = contracts[contractIndex];
    if (!contract || !contract.installments)
      throw new Error("Parcela não encontrada");

    const { updated, settledItem, paidInSeasonCount } =
      applyInstallmentSettlement(
        contract.installments,
        seasonId,
        seasonToUpdate.seasonNumber,
      );

    if (!settledItem) return updated;

    contracts[contractIndex] = {
      ...contract,
      installments: updated,
    };

    const installmentValue =
      settledItem.value || updated.annualInstallmentValue || 0;
    const direction = updated.direction;
    const partner = updated.partnerClub || "Clube Parceiro";
    const entryId =
      paidInSeasonCount > 1
        ? `inst_${playerId}_${contractIndex}_${seasonId}_${settledItem.number}`
        : `inst_${playerId}_${contractIndex}_${seasonId}`;

    if (installmentValue > 0) {
      await ServiceFinance.addEntry(careerId, seasonId, {
        id: entryId,
        type: direction === "payable" ? "expense" : "revenue",
        category:
          direction === "payable"
            ? "Transferências (compras de atletas)"
            : "Transferências (vendas de atletas)",
        amount: installmentValue,
        description:
          direction === "payable"
            ? `Pagamento de parcela referente a ${player.name} (${partner})`
            : `Recebimento de parcela referente a ${player.name} (${partner})`,
        isAutomatic: true,
        source: "clause",
        sourceId: playerId,
        contractIndex,
        clauseType: "installment",
        transferDirection: direction === "payable" ? "arrivals" : "exit",
      });
    }

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(
      playerRef,
      sanitizeFirestoreData({ ...player, contract: contracts }),
    );
    Object.assign(player, { contract: contracts });
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
    const targetInSeason = seasonToUpdate.players.find((p) => p.id === playerId);
    if (targetInSeason) Object.assign(targetInSeason, player);
    return updated;
  },

  settleBonus: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    bonusId: string,
    contractIndex?: number,
    isContractDetailsBonus?: boolean,
    autoEvaluated?: boolean,
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    let settledBonus: TransferBonus | undefined;

    if (isContractDetailsBonus && player.contractDetails?.performanceBonuses) {
      const bonuses = [...player.contractDetails.performanceBonuses];
      const bIdx = bonuses.findIndex((b) => b.id === bonusId);
      if (bIdx >= 0) {
        const nextBonus: TransferBonus = {
          ...bonuses[bIdx],
          status: "paid",
          paid: true,
          paidSeasonId: seasonId,
          paidSeasonNumber: seasonToUpdate.seasonNumber,
          ...(autoEvaluated ? { autoEvaluated: true } : {}),
        };
        delete nextBonus.autoSettlementDisabled;
        bonuses[bIdx] = nextBonus;
        settledBonus = bonuses[bIdx];
        player.contractDetails = {
          ...player.contractDetails,
          performanceBonuses: bonuses,
        };
      }
    } else {
      const contracts = [...(player.contract || [])];
      for (let cIdx = 0; cIdx < contracts.length; cIdx++) {
        if (contractIndex !== undefined && cIdx !== contractIndex) continue;
        const bonuses = [...(contracts[cIdx].bonuses || [])];
        const bIdx = bonuses.findIndex((b) => b.id === bonusId);
        if (bIdx >= 0) {
          const nextBonus: TransferBonus = {
            ...bonuses[bIdx],
            status: "paid",
            paid: true,
            paidSeasonId: seasonId,
            paidSeasonNumber: seasonToUpdate.seasonNumber,
            ...(autoEvaluated ? { autoEvaluated: true } : {}),
          };
          delete nextBonus.autoSettlementDisabled;
          bonuses[bIdx] = nextBonus;
          settledBonus = bonuses[bIdx];
          if (contracts[cIdx].contractDetails?.performanceBonuses) {
            const pIdx = contracts[cIdx].contractDetails!.performanceBonuses!.findIndex((b) => b.id === bonusId);
            if (pIdx >= 0) {
              const pbList = [...contracts[cIdx].contractDetails!.performanceBonuses!];
              pbList[pIdx] = bonuses[bIdx];
              contracts[cIdx].contractDetails = {
                ...contracts[cIdx].contractDetails!,
                performanceBonuses: pbList,
              };
            }
          }
          contracts[cIdx] = {
            ...contracts[cIdx],
            bonuses,
          };
          player.contract = contracts;
          break;
        }
      }
    }

    if (!settledBonus) throw new Error("Bônus não encontrado");

    if (settledBonus.value > 0) {
      const isReceivable = settledBonus.direction === "receivable";
      await ServiceFinance.addEntry(careerId, seasonId, {
        id: `bonus_${settledBonus.id}`,
        type: isReceivable ? "revenue" : "expense",
        category: isReceivable
          ? "Transferências (vendas de atletas)"
          : "Bônus de conquista",
        amount: settledBonus.value,
        description: isReceivable
          ? `Recebimento de bônus (${settledBonus.name}) referente a ${player.name}`
          : `Pagamento de bônus (${settledBonus.name}) a ${player.name}`,
        isAutomatic: true,
        source: "clause",
        sourceId: settledBonus.id,
        contractIndex,
        clauseType: "bonus",
        transferDirection: isReceivable ? "exit" : "arrivals",
      });
    }

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
    const targetInSeason = seasonToUpdate.players.find((p) => p.id === playerId);
    if (targetInSeason) Object.assign(targetInSeason, player);
  },

  consumeExitSpecialAgreement: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
    mode: "buyback" | "firstRefusal",
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) return;

    const contracts = [...(player.contract || [])];
    const contract = contracts[contractIndex];
    if (!contract || !contract.transferClauses) return;

    const updatedClauses = { ...contract.transferClauses };
    if (mode === "buyback") {
      delete updatedClauses.buybackValue;
    } else if (mode === "firstRefusal") {
      delete updatedClauses.firstRefusal;
    }

    contract.transferClauses =
      Object.keys(updatedClauses).length > 0 ? updatedClauses : undefined;
    contracts[contractIndex] = contract;
    player.contract = contracts;

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    const targetInSeason = seasonToUpdate.players.find(
      (p) => p.id === playerId,
    );
    if (targetInSeason) Object.assign(targetInSeason, player);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  settleSellOnClause: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
    totalSaleValue: number,
    saleDate: string,
  ): Promise<number> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const contracts = [...(player.contract || [])];
    const contract = contracts[contractIndex];
    if (!contract || !contract.transferClauses?.sellOnPercentage) {
      throw new Error("Cláusula de taxa de futura venda não encontrada");
    }

    const percentage = contract.transferClauses.sellOnPercentage;
    const shareAmount = Math.round(totalSaleValue * (percentage / 100));

    const isArrival = Boolean(contract.fromClub) && !contract.leftClub;
    const updatedClauses = { ...contract.transferClauses };
    delete updatedClauses.sellOnPercentage;

    contract.transferClauses =
      Object.keys(updatedClauses).length > 0 ? updatedClauses : undefined;
    contracts[contractIndex] = contract;
    player.contract = contracts;

    if (shareAmount > 0) {
      const clubRef = isArrival ? contract.fromClub : contract.leftClub;
      await ServiceFinance.addEntry(careerId, seasonId, {
        id: `sellon_${playerId}_${contractIndex}_${seasonId}`,
        type: isArrival ? "expense" : "revenue",
        category: isArrival
          ? "Transferências (compras de atletas)"
          : "Transferências (vendas de atletas)",
        amount: shareAmount,
        date: saleDate,
        description: `${isArrival ? "Pagamento" : "Recebimento"} de ${percentage}% de futura venda de ${player.name}${clubRef ? ` (${clubRef})` : ""}`,
        isAutomatic: true,
        source: "clause",
        sourceId: playerId,
        contractIndex,
        clauseType: "sellOn",
        transferDirection: isArrival ? "arrivals" : "exit",
      });
    }

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    const targetInSeason = seasonToUpdate.players.find(
      (p) => p.id === playerId,
    );
    if (targetInSeason) Object.assign(targetInSeason, player);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    return shareAmount;
  },

  deleteClause: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    clauseType:
      | "installment"
      | "bonus"
      | "buyback"
      | "firstRefusal"
      | "sellOn"
      | "wageAdjustment"
      | "releaseClause",
    contractIndex?: number,
    clauseId?: string,
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const contracts = [...player.contract];
    const cIdx = contractIndex ?? contracts.length - 1;
    const contract = contracts[cIdx];

    if (clauseType === "installment" && contract) {
      delete contract.installments;
    } else if (clauseType === "bonus") {
      if (contract?.bonuses && clauseId) {
        contract.bonuses = contract.bonuses.filter((b) => b.id !== clauseId);
      }
      if (player.contractDetails?.performanceBonuses && clauseId) {
        player.contractDetails.performanceBonuses =
          player.contractDetails.performanceBonuses.filter(
            (b) => b.id !== clauseId,
          );
      }
    } else if (clauseType === "buyback" && contract?.transferClauses) {
      delete contract.transferClauses.buybackValue;
    } else if (clauseType === "firstRefusal" && contract?.transferClauses) {
      delete contract.transferClauses.firstRefusal;
    } else if (clauseType === "sellOn") {
      if (contract?.transferClauses)
        delete contract.transferClauses.sellOnPercentage;
      if (contract?.loanTerms) delete contract.loanTerms.sellOnPercentage;
    } else if (clauseType === "releaseClause" && player.contractDetails) {
      delete player.contractDetails.releaseClause;
    } else if (clauseType === "wageAdjustment" && player.contractDetails) {
      delete player.contractDetails.wageAdjustment;
    }

    player.contract = contracts;
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  updateClauseValue: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    clauseType: "installment" | "bonus" | "buyback" | "wageAdjustment",
    contractIndex: number,
    newValue: number,
    clauseId?: string,
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const contracts = [...player.contract];
    const contract = contracts[contractIndex];

    if (clauseType === "installment" && contract?.installments) {
      contract.installments.annualInstallmentValue = newValue;
    } else if (clauseType === "bonus") {
      if (contract?.bonuses && clauseId) {
        const b = contract.bonuses.find((b) => b.id === clauseId);
        if (b) b.value = newValue;
      }
      if (player.contractDetails?.performanceBonuses && clauseId) {
        const b = player.contractDetails.performanceBonuses.find(
          (b) => b.id === clauseId,
        );
        if (b) b.value = newValue;
      }
    } else if (clauseType === "buyback" && contract?.transferClauses) {
      contract.transferClauses.buybackValue = newValue;
    } else if (
      clauseType === "wageAdjustment" &&
      player.contractDetails?.wageAdjustment
    ) {
      contract.contractDetails = player.contractDetails;
      player.contractDetails.wageAdjustment.percentage = newValue;
    }

    player.contract = contracts;
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  syncSigningBonusTransaction: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
    playerName: string,
    signingBonusAmount: number,
    renewalDate?: string,
  ): Promise<void> => {
    const entryId = `signing_bonus_${playerId}_${contractIndex}`;
    const report = await ServiceFinance.getReportBySeason(careerId, seasonId);
    const existingEntry = report.entries.find((e) => e.id === entryId);

    if (signingBonusAmount <= 0) {
      if (existingEntry) {
        await ServiceFinance.deleteEntry(careerId, seasonId, entryId);
      }
      return;
    }

    if (existingEntry) {
      if (existingEntry.amount !== signingBonusAmount) {
        await ServiceFinance.deleteEntry(careerId, seasonId, entryId);
        await ServiceFinance.addEntry(careerId, seasonId, {
          id: entryId,
          type: "expense",
          category: "Luvas / Prêmios de Assinatura",
          amount: signingBonusAmount,
          date: renewalDate || existingEntry.date || "01/07",
          description: `Luvas de renovação contratual referente a ${playerName}`,
          isAutomatic: true,
          source: "clause",
          sourceId: playerId,
          contractIndex,
          clauseType: "signingBonus",
        });
      }
    } else {
      await ServiceFinance.addEntry(careerId, seasonId, {
        id: entryId,
        type: "expense",
        category: "Luvas / Prêmios de Assinatura",
        amount: signingBonusAmount,
        date: renewalDate || "01/07",
        description: `Luvas de renovação contratual referente a ${playerName}`,
        isAutomatic: true,
        source: "clause",
        sourceId: playerId,
        contractIndex,
        clauseType: "signingBonus",
      });
    }
  },

  syncAgentFeeTransaction: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
    playerName: string,
    agentFeeAmount: number,
    arrivalDate?: string,
  ): Promise<void> => {
    const entryId = `agent_fee_${playerId}_${contractIndex}`;
    const report = await ServiceFinance.getReportBySeason(careerId, seasonId);
    const existingEntry = report.entries.find((e) => e.id === entryId);

    if (agentFeeAmount <= 0) {
      if (existingEntry) {
        await ServiceFinance.deleteEntry(careerId, seasonId, entryId);
      }
      return;
    }

    if (existingEntry) {
      if (existingEntry.amount !== agentFeeAmount) {
        await ServiceFinance.deleteEntry(careerId, seasonId, entryId);
        await ServiceFinance.addEntry(careerId, seasonId, {
          id: entryId,
          type: "expense",
          category: "Taxa de agência",
          amount: agentFeeAmount,
          date: arrivalDate || existingEntry.date || "01/07",
          description: `Taxa de agência referente a ${playerName}`,
          isAutomatic: true,
          source: "clause",
          sourceId: playerId,
          contractIndex,
          clauseType: "agentFee",
          transferDirection: "arrivals",
        });
      }
    } else {
      await ServiceFinance.addEntry(careerId, seasonId, {
        id: entryId,
        type: "expense",
        category: "Taxa de agência",
        amount: agentFeeAmount,
        date: arrivalDate || "01/07",
        description: `Taxa de agência referente a ${playerName}`,
        isAutomatic: true,
        source: "clause",
        sourceId: playerId,
        contractIndex,
        clauseType: "agentFee",
        transferDirection: "arrivals",
      });
    }
  },
};

