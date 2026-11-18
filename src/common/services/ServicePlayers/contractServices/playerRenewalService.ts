import { doc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import { getCareerById } from "../../../helpers/Getters";
import { updateCareerFirestore } from "../../../helpers/Setters";
import { getSeasonDateRange } from "../../../utils/GetSeasonDateRange";
import { sanitizeFirestoreData } from "../../../utils/sanitizeFirestore";
import { db } from "../../Firebase";
import { requireAuth } from "../helpers/authHelpers";
import { parseValue, formatTransferValue } from "../../../utils/FormatValue";
import { calculateContractYears } from "../../../utils/calculateContractYears";
import { brasilDatePlaceholderShort } from "../../../utils/Date";
import { ServiceFinance } from "../../ServiceFinance";
import { ServiceProposals } from "../../ServiceProposals";
import { Players } from "../../../interfaces/playersInfo/players";
import { Contract } from "../../../interfaces/playersInfo/contract";
import { ContractDetails } from "../../../interfaces/playersInfo/contractClauses";
import { clauseSettlementService } from "./clauseSettlementService";
import {
  CreatePlayerRenewalParams,
  DeletePlayerRenewalParams,
  READ_ONLY_GERAL_ERROR,
  UpdateRenewalClausesParams,
} from "./types";

export const playerRenewalService = {
  createPlayerRenewal: async (
    params: CreatePlayerRenewalParams,
  ): Promise<Players> => {
    const {
      careerId,
      seasonId,
      playerId,
      salary,
      contractUntil,
      contractTime,
      signingBonus,
      releaseClause,
      wageAdjustment,
      bonuses,
      newCustomObjectives,
    } = params;

    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) {
      throw new Error("Dados não encontrados");
    }

    const weeklyWage = salary ? parseValue(salary) : player.salary || 0;
    const calculatedYears =
      contractTime ||
      (contractUntil
        ? calculateContractYears(
            contractUntil,
            career.createdAt,
            seasonToUpdate.seasonNumber,
            career.nation,
          )
        : player.contractTime || 1);
    const durationYears = Math.max(1, calculatedYears);

    const signingBonusNum = signingBonus ? parseValue(signingBonus) : 0;
    const releaseClauseNum =
      releaseClause && releaseClause.trim() !== "" && releaseClause !== "0"
        ? parseValue(releaseClause)
        : undefined;

    const previousSalary = player.salary || 0;
    const previousContractTime = player.contractTime || 1;
    const previousContractUntil = player.contractUntil || "";

    if (weeklyWage > 0) {
      player.salary = weeklyWage;
    }
    if (durationYears > 0) {
      player.contractTime = durationYears;
    }
    if (contractUntil) {
      player.contractUntil = contractUntil;
    }

    const cleanBonuses = (bonuses || []).map((b) => ({
      ...b,
      id:
        b.id ||
        `bonus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      direction: "payable" as const,
      status: b.status || "pending",
    }));

    const contractDetails: ContractDetails = {
      weeklyWage: player.salary || weeklyWage,
      durationYears: player.contractTime || durationYears,
      ...(player.squadRole ? { squadRole: player.squadRole } : {}),
      isRenewal: true,
      signingBonus: signingBonusNum > 0 ? signingBonusNum : undefined,
      releaseClause:
        releaseClauseNum && releaseClauseNum > 0 ? releaseClauseNum : undefined,
      wageAdjustment:
        wageAdjustment &&
        (wageAdjustment.direction === "Aumentar" || wageAdjustment.direction === "Diminuir")
          ? {
              ...wageAdjustment,
              enabled: true,
              status: wageAdjustment.status || "pending",
              baseSalary:
                wageAdjustment.baseSalary ??
                player.contractDetails?.wageAdjustment?.baseSalary ??
                (weeklyWage > 0 ? weeklyWage : undefined),
            }
          : undefined,
      performanceBonuses: cleanBonuses.length > 0 ? cleanBonuses : undefined,
    };

    player.contractDetails = contractDetails;

    const { startDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      new Date(career.createdAt),
      career.nation || "",
    );
    const renewalDateShort = brasilDatePlaceholderShort(startDate);

    const wageAdjObj = contractDetails.wageAdjustment
      ? { ...contractDetails.wageAdjustment }
      : undefined;

    const contractClauses = {
      ...(releaseClauseNum ? { releaseClause: releaseClauseNum } : {}),
      ...(wageAdjObj ? { wageAdjustment: wageAdjObj } : {}),
    };

    const contracts = [...(player.contract || [])];
    const contractIndex = contracts.length;

    const newContract: Contract = {
      isRenewal: true,
      seasonId,
      buyValue: 0,
      sellValue: 0,
      fromClub: "",
      leftClub: "",
      dataArrival: startDate,
      contractUntil: player.contractUntil,
      salary: player.salary,
      contractTime: player.contractTime,
      previousSalary,
      previousContractTime,
      previousContractUntil,
      signingBonus:
        signingBonus ||
        (signingBonusNum > 0
          ? formatTransferValue(signingBonusNum)
          : undefined),
      releaseClause:
        releaseClause ||
        (releaseClauseNum ? formatTransferValue(releaseClauseNum) : undefined),
      bonuses: cleanBonuses,
      contractDetails,
      contractClauses,
    };

    contracts.push(newContract);
    player.contract = contracts;

    const renewalEventId = `renewal:${seasonId}:${playerId}:${contractIndex}`;
    const renewalEvolution = {
      id: renewalEventId,
      date: renewalDateShort,
      description: "Contrato renovado com o clube.",
      changedAttribute: "contract",
      oldValue: previousSalary ? String(previousSalary) : "0",
      newValue: player.salary ? String(player.salary) : "0",
    };

    player.academyHistory = [
      ...(player.academyHistory || []),
      renewalEvolution,
    ];
    player.evolutionHistory = [
      ...(player.evolutionHistory || []),
      renewalEvolution,
    ];

    if (newCustomObjectives && newCustomObjectives.length > 0) {
      if (!career.customBonusObjectives) career.customBonusObjectives = {};
      const currentList =
        career.customBonusObjectives["Objetivo atingido"] || [];
      const updatedList = Array.from(
        new Set([...currentList, ...newCustomObjectives]),
      );
      career.customBonusObjectives["Objetivo atingido"] = updatedList;
      await updateCareerFirestore(user.uid, careerId, {
        customBonusObjectives: career.customBonusObjectives,
      });
    }

    await clauseSettlementService.syncSigningBonusTransaction(
      careerId,
      seasonId,
      playerId,
      contractIndex,
      player.name,
      signingBonusNum,
      renewalDateShort,
    );

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    const targetInSeason = seasonToUpdate.players.find(
      (p) => p.id === playerId,
    );
    if (targetInSeason) Object.assign(targetInSeason, player);

    return player;
  },

  deletePlayerRenewal: async (
    params: DeletePlayerRenewalParams,
  ): Promise<Players> => {
    const { careerId, seasonId, playerId, contractIndex } = params;

    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) {
      throw new Error("Dados não encontrados");
    }

    const contracts = [...(player.contract || [])];
    const contractToDelete = contracts[contractIndex];
    if (!contractToDelete) {
      throw new Error("Contrato de renovação não encontrado");
    }

    const isLatest = contractIndex === contracts.length - 1;
    const previousContract =
      contractIndex > 0 ? contracts[contractIndex - 1] : undefined;

    if (isLatest) {
      player.salary = Number(
        contractToDelete.previousSalary !== undefined
          ? contractToDelete.previousSalary
          : (previousContract?.salary ?? player.salary ?? 0),
      );
      player.contractTime = Number(
        contractToDelete.previousContractTime !== undefined
          ? contractToDelete.previousContractTime
          : (previousContract?.contractTime ?? player.contractTime ?? 1),
      );
      if (contractToDelete.previousContractUntil !== undefined) {
        player.contractUntil = contractToDelete.previousContractUntil;
      } else if (previousContract?.contractUntil) {
        player.contractUntil = previousContract.contractUntil;
      }

      if (previousContract?.contractDetails) {
        player.contractDetails = { ...previousContract.contractDetails };
      } else if (previousContract) {
        player.contractDetails = {
          weeklyWage: Number(previousContract.salary || player.salary || 0),
          durationYears: Number(
            previousContract.contractTime || player.contractTime || 1,
          ),
          ...(player.squadRole ? { squadRole: player.squadRole } : {}),
        };
      } else {
        player.contractDetails = undefined;
      }
    }

    // Excluir despesa de signing bonus via ServiceFinance se existente
    const entryId = `signing_bonus_${playerId}_${contractIndex}`;
    try {
      await ServiceFinance.deleteEntry(careerId, seasonId, entryId);
    } catch {
      // Ignorar se não existir
    }

    // Remover o evento de renovação do histórico do jogador
    const targetRenewalEventId = `renewal:${seasonId}:${playerId}:${contractIndex}`;
    if (player.academyHistory) {
      player.academyHistory = player.academyHistory.filter(
        (e) => e.id !== targetRenewalEventId,
      );
    }
    if (player.evolutionHistory) {
      player.evolutionHistory = player.evolutionHistory.filter(
        (e) => e.id !== targetRenewalEventId,
      );
    }

    contracts.splice(contractIndex, 1);
    player.contract = contracts;

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    const targetInSeason = seasonToUpdate.players.find(
      (p) => p.id === playerId,
    );
    if (targetInSeason) Object.assign(targetInSeason, player);

    // Restaurar proposta de renovação existente para 'em_andamento' (igual à reversão de transferências)
    try {
      const proposals =
        (await ServiceProposals.getProposalsBySeason(careerId, seasonId)) || [];
      const normalizedPlayerName = (player.name || "").trim().toLowerCase();
      const relevantRenewals = proposals.filter((p) => {
        const matchesType = p.type === "renovacao";
        const matchesId =
          Boolean(p.playerId) &&
          (p.playerId === playerId || p.playerId === player.id);
        const matchesName = Boolean(
          normalizedPlayerName &&
            p.playerName &&
            p.playerName.trim().toLowerCase() === normalizedPlayerName,
        );
        return matchesType && (matchesId || matchesName);
      });

      for (const prop of relevantRenewals) {
        const propRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/proposals`,
          prop.id,
        );
        await updateDoc(propRef, {
          overallStatus: "em_andamento",
          finalizedAt: deleteField(),
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.warn("Aviso ao restaurar proposta de renovação ao reverter:", err);
    }

    return player;
  },

  updateRenewalClauses: async (
    params: UpdateRenewalClausesParams,
  ): Promise<Players> => {
    const {
      careerId,
      seasonId,
      playerId,
      contractIndex,
      salary,
      contractUntil,
      contractTime,
      signingBonus,
      releaseClause,
      wageAdjustment,
      bonuses,
      newCustomObjectives,
    } = params;

    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) {
      throw new Error("Dados não encontrados");
    }

    const contracts = [...(player.contract || [])];
    const contract = contracts[contractIndex];
    if (!contract) {
      throw new Error("Contrato de renovação não encontrado");
    }

    const isLatest = contractIndex === contracts.length - 1;
    const weeklyWage = salary
      ? parseValue(salary)
      : contract.salary !== undefined
        ? parseValue(String(contract.salary))
        : contract.contractDetails?.weeklyWage ?? (isLatest ? player.salary || 0 : 0);
    const calculatedYears =
      contractTime ||
      (contractUntil
        ? calculateContractYears(
            contractUntil,
            career.createdAt,
            seasonToUpdate.seasonNumber,
            career.nation,
          )
        : contract.contractTime || player.contractTime || 1);
    const durationYears = Math.max(1, calculatedYears);

    const signingBonusNum = signingBonus ? parseValue(signingBonus) : 0;
    const releaseClauseNum =
      releaseClause && releaseClause.trim() !== "" && releaseClause !== "0"
        ? parseValue(releaseClause)
        : undefined;

    const cleanBonuses = (bonuses || []).map((b) => ({
      ...b,
      id:
        b.id ||
        `bonus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      direction: "payable" as const,
      status: b.status || "pending",
    }));

    const existingBase =
      wageAdjustment?.baseSalary ??
      contract.contractDetails?.wageAdjustment?.baseSalary ??
      contract.contractClauses?.wageAdjustment?.baseSalary ??
      contract.contractDetails?.wageAdjustment?.preAdjustmentSalary ??
      contract.contractClauses?.wageAdjustment?.preAdjustmentSalary;

    const isCurrentlyApplied = Boolean(
      wageAdjustment?.applied ||
      wageAdjustment?.status === "applied" ||
      wageAdjustment?.status === "paid" ||
      contract.contractDetails?.wageAdjustment?.applied ||
      contract.contractClauses?.wageAdjustment?.applied,
    );

    const resolvedBaseSalary =
      existingBase !== undefined && Number(existingBase) > 0
        ? Number(existingBase)
        : isCurrentlyApplied && weeklyWage > 0 && wageAdjustment
          ? Math.round(
              weeklyWage /
                (1 +
                  ((wageAdjustment.direction === "Diminuir" ? -1 : 1) *
                    (wageAdjustment.percentage || 10)) /
                    100),
            )
          : weeklyWage > 0
            ? weeklyWage
            : undefined;

    const contractDetails: ContractDetails = {
      weeklyWage,
      durationYears,
      ...(player.squadRole ? { squadRole: player.squadRole } : {}),
      isRenewal: contract.contractDetails?.isRenewal ?? Boolean(!contract.fromLoanBuyOption),
      signingBonus: signingBonusNum > 0 ? signingBonusNum : undefined,
      releaseClause:
        releaseClauseNum && releaseClauseNum > 0 ? releaseClauseNum : undefined,
      wageAdjustment:
        wageAdjustment &&
        (wageAdjustment.direction === "Aumentar" || wageAdjustment.direction === "Diminuir")
          ? {
              ...wageAdjustment,
              enabled: true,
              status: wageAdjustment.status || "pending",
              baseSalary: resolvedBaseSalary,
            }
          : undefined,
      performanceBonuses: cleanBonuses.length > 0 ? cleanBonuses : undefined,
    };

    contract.salary = weeklyWage;
    contract.contractTime = durationYears;
    if (contractUntil) contract.contractUntil = contractUntil;
    contract.signingBonus =
      signingBonus ||
      (signingBonusNum > 0 ? formatTransferValue(signingBonusNum) : undefined);
    contract.releaseClause =
      releaseClause ||
      (releaseClauseNum ? formatTransferValue(releaseClauseNum) : undefined);
    contract.bonuses = cleanBonuses;
    contract.contractDetails = contractDetails;
    contract.contractClauses = {
      ...(releaseClauseNum ? { releaseClause: releaseClauseNum } : {}),
      ...(contractDetails.wageAdjustment
        ? { wageAdjustment: contractDetails.wageAdjustment }
        : {}),
    };

    if (isLatest) {
      if (weeklyWage > 0) player.salary = weeklyWage;
      if (durationYears > 0) player.contractTime = durationYears;
      if (contractUntil) player.contractUntil = contractUntil;
      player.contractDetails = contractDetails;
    }

    contracts[contractIndex] = contract;
    player.contract = contracts;

    if (newCustomObjectives && newCustomObjectives.length > 0) {
      if (!career.customBonusObjectives) career.customBonusObjectives = {};
      const currentList =
        career.customBonusObjectives["Objetivo atingido"] || [];
      const updatedList = Array.from(
        new Set([...currentList, ...newCustomObjectives]),
      );
      career.customBonusObjectives["Objetivo atingido"] = updatedList;
      await updateCareerFirestore(user.uid, careerId, {
        customBonusObjectives: career.customBonusObjectives,
      });
    }

    const { startDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      new Date(career.createdAt),
      career.nation || "",
    );
    const renewalDateShort = brasilDatePlaceholderShort(startDate);

    await clauseSettlementService.syncSigningBonusTransaction(
      careerId,
      seasonId,
      playerId,
      contractIndex,
      player.name,
      signingBonusNum,
      renewalDateShort,
    );

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    const targetInSeason = seasonToUpdate.players.find(
      (p) => p.id === playerId,
    );
    if (targetInSeason) Object.assign(targetInSeason, player);

    return player;
  },

  applyRenewalWageAdjustment: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
  ): Promise<number> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) {
      throw new Error("Dados não encontrados");
    }

    const contracts = [...(player.contract || [])];
    const contract = contracts[contractIndex];
    const rawWageAdj =
      contract?.contractDetails?.wageAdjustment ||
      contract?.contractClauses?.wageAdjustment;
    if (!contract || !rawWageAdj) {
      throw new Error("Cláusula de ajuste salarial não encontrada");
    }

    const isLatest = contractIndex === contracts.length - 1;
    const isAlreadyApplied = Boolean(
      rawWageAdj.applied ||
        rawWageAdj.status === "paid" ||
        rawWageAdj.status === "applied",
    );
    if (isAlreadyApplied) {
      return Number(contract.salary ?? (isLatest ? player.salary : 0));
    }

    const wageAdj = { ...rawWageAdj };
    const pct = wageAdj.percentage || 5;
    const direction = wageAdj.direction === "Diminuir" ? -1 : 1;
    const currentSalary = Number(
      contract.salary ?? contract.contractDetails?.weeklyWage ?? (isLatest ? player.salary ?? 0 : 0),
    );

    const baseSalary =
      wageAdj.baseSalary !== undefined &&
      typeof wageAdj.baseSalary === "number" &&
      !isNaN(wageAdj.baseSalary)
        ? Number(wageAdj.baseSalary)
        : currentSalary;

    const newSalary = Math.max(
      0,
      Math.round(baseSalary * (1 + (direction * pct) / 100)),
    );

    wageAdj.baseSalary = baseSalary;
    wageAdj.preAdjustmentSalary = baseSalary;
    wageAdj.status = "paid";
    wageAdj.applied = true;
    wageAdj.appliedAt = new Date().toISOString();
    delete wageAdj.autoSettlementDisabled;

    contract.salary = newSalary;
    if (contract.contractDetails) {
      contract.contractDetails.wageAdjustment = wageAdj;
      contract.contractDetails.weeklyWage = newSalary;
    }
    if (!contract.contractClauses) {
      contract.contractClauses = {};
    }
    contract.contractClauses.wageAdjustment = wageAdj;
    contracts[contractIndex] = contract;

    if (isLatest) {
      player.salary = newSalary;
      if (player.contractDetails) {
        player.contractDetails = {
          ...player.contractDetails,
          weeklyWage: newSalary,
          wageAdjustment: wageAdj,
        };
      }
    }
    player.contract = contracts;

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    const targetInSeason = seasonToUpdate.players.find(
      (p) => p.id === playerId,
    );
    if (targetInSeason) Object.assign(targetInSeason, player);

    return newSalary;
  },

  revertRenewalWageAdjustment: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
  ): Promise<number> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) {
      throw new Error("Dados não encontrados");
    }

    const contracts = [...(player.contract || [])];
    const contract = contracts[contractIndex];
    const rawWageAdj =
      contract?.contractDetails?.wageAdjustment ||
      contract?.contractClauses?.wageAdjustment;
    if (!contract || !rawWageAdj) {
      throw new Error("Cláusula de ajuste salarial não encontrada");
    }

    const isLatest = contractIndex === contracts.length - 1;
    const isApplied = Boolean(
      rawWageAdj.applied ||
        rawWageAdj.status === "paid" ||
        rawWageAdj.status === "applied",
    );
    if (!isApplied) {
      return Number(contract.salary ?? (isLatest ? player.salary : 0));
    }

    const wageAdj = { ...rawWageAdj };
    const pct = wageAdj.percentage || 5;
    const direction = wageAdj.direction === "Diminuir" ? -1 : 1;
    const currentSalary = Number(
      contract.salary ?? contract.contractDetails?.weeklyWage ?? (isLatest ? player.salary ?? 0 : 0),
    );

    const factor = 1 + (direction * pct) / 100;
    const originalSalary =
      wageAdj.baseSalary !== undefined &&
      typeof wageAdj.baseSalary === "number" &&
      !isNaN(wageAdj.baseSalary)
        ? Number(wageAdj.baseSalary)
        : wageAdj.preAdjustmentSalary !== undefined &&
          typeof wageAdj.preAdjustmentSalary === "number" &&
          !isNaN(wageAdj.preAdjustmentSalary)
          ? Number(wageAdj.preAdjustmentSalary)
          : factor > 0
            ? Math.round(currentSalary / factor)
            : currentSalary;

    wageAdj.baseSalary = originalSalary;
    wageAdj.status = "pending";
    wageAdj.applied = false;
    wageAdj.autoSettlementDisabled = true;
    delete wageAdj.appliedAt;
    delete wageAdj.preAdjustmentSalary;

    contract.salary = originalSalary;
    if (contract.contractDetails) {
      contract.contractDetails.wageAdjustment = wageAdj;
      contract.contractDetails.weeklyWage = originalSalary;
    }
    if (!contract.contractClauses) {
      contract.contractClauses = {};
    }
    contract.contractClauses.wageAdjustment = wageAdj;
    contracts[contractIndex] = contract;

    if (isLatest) {
      player.salary = originalSalary;
      if (player.contractDetails) {
        player.contractDetails = {
          ...player.contractDetails,
          weeklyWage: originalSalary,
          wageAdjustment: wageAdj,
        };
      }
    }
    player.contract = contracts;

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(player));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    const targetInSeason = seasonToUpdate.players.find(
      (p) => p.id === playerId,
    );
    if (targetInSeason) Object.assign(targetInSeason, player);

    return originalSalary;
  },
};

