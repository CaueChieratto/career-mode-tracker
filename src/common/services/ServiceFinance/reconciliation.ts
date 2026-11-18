import { ClubData } from "../../interfaces/club/clubData";
import { FinancialEntry } from "../../interfaces/finance";
import { Contract } from "../../interfaces/playersInfo/contract";
import { brasilDatePlaceholderShort } from "../../utils/Date";
import { getSeasonDateRange } from "../../utils/GetSeasonDateRange";
import {
  isNextSeasonTiming,
  isNextWindowTiming,
  shouldPlayerLeaveOnNextWindow,
  isContractInSeasonRange,
} from "../ServicePlayers/helpers/transferTimingHelpers";
import { calculateConsolidatedSeasonSalaryExpense } from "./salaryTimelineCalculator";

export function formatDisplayDate(
  rawDate?: Date | string | null,
): string | undefined {
  if (!rawDate) return undefined;
  if (typeof rawDate === "string") {
    if (rawDate.includes("/")) return rawDate;
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) return brasilDatePlaceholderShort(d);
    return rawDate;
  }
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return brasilDatePlaceholderShort(rawDate);
  }
  return undefined;
}

function buildInstallmentFinancialEntry(params: {
  id: string;
  playerId: string;
  playerName: string;
  contractIndex: number;
  isPayable: boolean;
  partner: string;
  amount: number;
}): FinancialEntry {
  const { id, playerId, playerName, contractIndex, isPayable, partner, amount } =
    params;
  return {
    id,
    type: isPayable ? "expense" : "revenue",
    category: isPayable
      ? "Transferências (compras de atletas)"
      : "Transferências (vendas de atletas)",
    amount: Math.round(amount),
    description: isPayable
      ? `Pagamento de parcela referente a ${playerName} (${partner})`
      : `Recebimento de parcela referente a ${playerName} (${partner})`,
    isAutomatic: true,
    source: "clause",
    sourceId: playerId,
    contractIndex,
    clauseType: "installment",
    transferDirection: isPayable ? "arrivals" : "exit",
  };
}

export function reconcileSeasonFinancialEntries(
  season: ClubData,
  existingEntries: FinancialEntry[] = [],
  career?: { createdAt?: Date | string | null; nation?: string | null },
): FinancialEntry[] {
  const entryMap = new Map<string, FinancialEntry>();

  // 1. Identificar e preservar lançamentos manuais
  const manualEntries = existingEntries.filter(
    (e) => !e.isAutomatic && (!e.source || e.source === "manual"),
  );
  for (const entry of manualEntries) {
    entryMap.set(entry.id, {
      ...entry,
      source: "manual",
      isAutomatic: false,
    });
  }

  // 2. Extrair cláusulas já quitadas registradas (preservando lançamentos existentes de cláusulas)
  const existingClauseEntries = existingEntries.filter(
    (e) =>
      e.source === "clause" ||
      (e.isAutomatic &&
        (e.id.startsWith("bonus_") ||
          e.id.startsWith("signing_bonus_") ||
          e.id.startsWith("agent_fee_") ||
          e.id.startsWith("inst_") ||
          e.id.startsWith("sellon_"))),
  );
  for (const entry of existingClauseEntries) {
    const clauseType =
      entry.clauseType ||
      (entry.id.startsWith("signing_bonus_")
        ? "signingBonus"
        : entry.id.startsWith("agent_fee_")
          ? "agentFee"
          : entry.id.startsWith("bonus_")
            ? "bonus"
            : entry.id.startsWith("inst_")
              ? "installment"
              : entry.id.startsWith("sellon_")
                ? "sellOn"
                : undefined);
    const transferDirection =
      entry.transferDirection ||
      (clauseType === "signingBonus"
        ? undefined
        : clauseType === "agentFee"
          ? "arrivals"
          : entry.type === "revenue"
            ? "exit"
            : "arrivals");

    entryMap.set(entry.id, {
      ...entry,
      source: "clause",
      isAutomatic: true,
      clauseType,
      transferDirection,
    });
  }

  // 3. Determinar o intervalo de datas da temporada para isolamento estrito entre temporadas
  const seasonRange =
    career && season?.seasonNumber
      ? getSeasonDateRange(
          season.seasonNumber,
          career.createdAt,
          career.nation || "ESP",
        )
      : null;

  const isArrivalContractThisSeason = (c: Contract): boolean => {
    if (c.seasonId) return c.seasonId === season.id;
    if (c.fromScheduledAgreement) return true;
    if (!seasonRange) return true;
    return isContractInSeasonRange(c, "arrivals", seasonRange);
  };

  const isExitContractThisSeason = (c: Contract): boolean => {
    if (c.seasonId) return c.seasonId === season.id;
    if (c.fromScheduledAgreement) return true;
    if (!seasonRange) return true;
    return isContractInSeasonRange(c, "exit", seasonRange);
  };

  // Gerar entradas determinísticas de transferências da temporada a partir dos atletas
  const players = season.players || [];

  if (players.length === 0) {
    const existingTransferEntries = existingEntries.filter(
      (e) =>
        e.source === "transfer" ||
        (e.isAutomatic && e.id.startsWith("transfer_")),
    );
    for (const entry of existingTransferEntries) {
      entryMap.set(entry.id, entry);
    }
  }

  for (const player of players) {
    const contracts = player.contract || [];
    contracts.forEach((c, cIdx) => {
      // Ignorar transferências com timing futuro (próxima temporada)
      if (isNextSeasonTiming(c.timing)) return;

      // Chegada (Compra de Atleta)
      if (
        c.fromClub &&
        c.fromClub !== "Base" &&
        c.fromClub !== "Passes Livres"
      ) {
        const isLoan = Boolean(
          c.isLoan ||
            (player.incomingLoan &&
              !c.fromLoanBuyOption &&
              c.isLoan !== false &&
              !(Number(c.buyValue) > 0)),
        );
        if (!isLoan) {
          const buyVal =
            typeof c.buyValue === "number"
              ? c.buyValue
              : Number(c.buyValue) || 0;
          const upfront = c.installments ? c.installments.upfrontValue : buyVal;

          const entryId = `transfer_buy_${player.id}_${cIdx}`;

          const isNextWindow = isNextWindowTiming(c.timing);
          const hasArrivedOrWindowOpen =
            !isNextWindow ||
            player.buy === true ||
            shouldPlayerLeaveOnNextWindow(season.matches || [], c.dataArrival);

          if (
            upfront > 0 &&
            hasArrivedOrWindowOpen &&
            isArrivalContractThisSeason(c)
          ) {
            entryMap.set(entryId, {
              id: entryId,
              type: "expense",
              category: "Transferências (compras de atletas)",
              amount: Math.round(upfront),
              date: formatDisplayDate(c.dataArrival),
              description: `Compra de ${player.name} (${c.fromClub})`,
              isAutomatic: true,
              source: "transfer",
              sourceId: player.id,
              contractIndex: cIdx,
              transferDirection: "arrivals",
            });
          } else {
            entryMap.delete(entryId);
          }
        }
      }

      // Saída (Venda de Atleta)
      if (
        c.leftClub &&
        c.leftClub !== "Aposentou" &&
        c.leftClub !== "Aposentadoria" &&
        c.leftClub !== "Fim de Contrato"
      ) {
        const isLoan = Boolean(
          c.isLoan ||
            (player.loan &&
              !c.fromLoanBuyOption &&
              c.isLoan !== false &&
              !(Number(c.sellValue) > 0)),
        );
        if (!isLoan) {
          const sellVal =
            typeof c.sellValue === "number"
              ? c.sellValue
              : Number(c.sellValue) || 0;
          const upfront =
            c.installments ? c.installments.upfrontValue : sellVal;

          const entryId = `transfer_sell_${player.id}_${cIdx}`;

          const isNextWindow = isNextWindowTiming(c.timing);
          const hasLeftOrWindowOpen =
            !isNextWindow ||
            player.sell === true ||
            shouldPlayerLeaveOnNextWindow(season.matches || [], c.dataExit);

          if (
            upfront > 0 &&
            hasLeftOrWindowOpen &&
            isExitContractThisSeason(c)
          ) {
            entryMap.set(entryId, {
              id: entryId,
              type: "revenue",
              category: "Transferências (vendas de atletas)",
              amount: Math.round(upfront),
              date: formatDisplayDate(c.dataExit),
              description: `Venda de ${player.name} (${c.leftClub})`,
              isAutomatic: true,
              source: "transfer",
              sourceId: player.id,
              contractIndex: cIdx,
              transferDirection: "exit",
            });
          } else {
            entryMap.delete(entryId);
          }
        }
      }

      // Luvas de assinatura na contratação/renovação (somente se a contratação pertence a esta temporada)
      const rawSigningBonus =
        c.contractDetails?.signingBonus !== undefined
          ? c.contractDetails.signingBonus
          : c.signingBonus;
      const signingBonusVal =
        typeof rawSigningBonus === "number"
          ? rawSigningBonus
          : Number(rawSigningBonus) || 0;
      const signingId = `signing_bonus_${player.id}_${cIdx}`;
      if (signingBonusVal > 0 && isArrivalContractThisSeason(c)) {
        const existing = entryMap.get(signingId);
        entryMap.set(signingId, {
          ...(existing || {}),
          id: signingId,
          type: "expense",
          category: existing?.category || "Luvas / Prêmios de Assinatura",
          amount: Math.round(signingBonusVal),
          date: existing?.date || formatDisplayDate(c.dataArrival) || "01/07",
          description:
            existing?.description ||
            (c.isRenewal
              ? `Luvas de renovação contratual referente a ${player.name}`
              : `Luvas de assinatura referente a ${player.name}`),
          isAutomatic: true,
          source: "clause",
          sourceId: player.id,
          contractIndex: cIdx,
          clauseType: "signingBonus",
        });
      } else {
        entryMap.delete(signingId);
      }

      // Taxa de agência na contratação de atleta (somente se a contratação pertence a esta temporada)
      const rawAgentFee =
        c.contractDetails?.agentFee !== undefined
          ? c.contractDetails.agentFee
          : (c as { agentFee?: number | string }).agentFee !== undefined
            ? (c as { agentFee?: number | string }).agentFee
            : cIdx === contracts.length - 1 &&
                player.contractDetails?.agentFee !== undefined
              ? player.contractDetails.agentFee
              : undefined;
      const agentFeeVal =
        typeof rawAgentFee === "number"
          ? rawAgentFee
          : Number(rawAgentFee) || 0;
      const agentFeeId = `agent_fee_${player.id}_${cIdx}`;
      if (agentFeeVal > 0 && isArrivalContractThisSeason(c)) {
        const existing = entryMap.get(agentFeeId);
        entryMap.set(agentFeeId, {
          ...(existing || {}),
          id: agentFeeId,
          type: "expense",
          category: existing?.category || "Taxa de agência",
          amount: Math.round(agentFeeVal),
          date: existing?.date || formatDisplayDate(c.dataArrival) || "01/07",
          description:
            existing?.description ||
            `Taxa de agência referente a ${player.name}`,
          isAutomatic: true,
          source: "clause",
          sourceId: player.id,
          contractIndex: cIdx,
          clauseType: "agentFee",
          transferDirection: "arrivals",
        });
      } else {
        entryMap.delete(agentFeeId);
      }

      // Bônus de contrato já quitados na temporada
      if (c.bonuses && Array.isArray(c.bonuses)) {
        for (const b of c.bonuses) {
          const isPaid =
            b.paid ||
            b.status === "paid" ||
            (b.status as string) === "Liquidado" ||
            (b.status as string) === "Liquidada";

          if (isPaid && b.value > 0) {
            const isPaidThisSeason = b.paidSeasonId
              ? b.paidSeasonId === season.id
              : b.paidSeasonNumber !== undefined && season.seasonNumber !== undefined
                ? b.paidSeasonNumber === season.seasonNumber
                : isArrivalContractThisSeason(c);

            const bonusId = `bonus_${b.id}`;
            if (isPaidThisSeason) {
              if (!entryMap.has(bonusId)) {
                const isReceivable = b.direction === "receivable";
                entryMap.set(bonusId, {
                  id: bonusId,
                  type: isReceivable ? "revenue" : "expense",
                  category: isReceivable
                    ? "Transferências (vendas de atletas)"
                    : "Bônus de conquista",
                  amount: Math.round(b.value),
                  description: isReceivable
                    ? `Recebimento de bônus (${b.name}) referente a ${player.name}`
                    : `Pagamento de bônus (${b.name}) a ${player.name}`,
                  isAutomatic: true,
                  source: "clause",
                  sourceId: b.id,
                  contractIndex: cIdx,
                  clauseType: "bonus",
                  transferDirection: isReceivable ? "exit" : "arrivals",
                });
              }
            } else {
              entryMap.delete(bonusId);
            }
          }
        }
      }

      // Parcela já quitada na temporada
      if (c.installments && c.installments.annualInstallmentValue > 0) {
        const inst = c.installments;
        const isPayable = inst.direction === "payable";
        const partner = inst.partnerClub || "Clube Parceiro";
        const instBaseId = `inst_${player.id}_${cIdx}_${season.id}`;
        const belongsToContractSeason = isPayable
          ? isArrivalContractThisSeason(c)
          : isExitContractThisSeason(c);

        if (
          Array.isArray(inst.installmentsList) &&
          inst.installmentsList.length > 0
        ) {
          const paidItemsThisSeason = inst.installmentsList.filter((item) => {
            if (!item.paid) return false;
            if (item.paidSeasonId) return item.paidSeasonId === season.id;
            if (
              item.paidSeasonNumber !== undefined &&
              season.seasonNumber !== undefined
            ) {
              return item.paidSeasonNumber === season.seasonNumber;
            }
            return belongsToContractSeason;
          });

          const expectedIds = new Set<string>();
          paidItemsThisSeason.forEach((item, idx) => {
            const entryId =
              idx === 0 ? instBaseId : `${instBaseId}_${item.number}`;
            expectedIds.add(entryId);
            const itemAmount = Math.round(
              item.value > 0 ? item.value : inst.annualInstallmentValue,
            );
            if (!entryMap.has(entryId) && itemAmount > 0) {
              entryMap.set(
                entryId,
                buildInstallmentFinancialEntry({
                  id: entryId,
                  playerId: player.id,
                  playerName: player.name,
                  contractIndex: cIdx,
                  isPayable,
                  partner,
                  amount: itemAmount,
                }),
              );
            }
          });

          for (const key of Array.from(entryMap.keys())) {
            if (
              (key === instBaseId || key.startsWith(`${instBaseId}_`)) &&
              !expectedIds.has(key)
            ) {
              entryMap.delete(key);
            }
          }
        } else {
          const matchesSeasonExplicitly = inst.paidSeasonId
            ? inst.paidSeasonId === season.id
            : inst.paidSeasonNumber !== undefined &&
                season.seasonNumber !== undefined
              ? inst.paidSeasonNumber === season.seasonNumber
              : undefined;

          const totalCount = inst.totalInstallments || 1;
          const remainingCount = inst.remainingInstallments ?? totalCount;
          const hasAnyPaid =
            inst.status === "paid" || remainingCount < totalCount;

          if (matchesSeasonExplicitly === true) {
            if (hasAnyPaid && !entryMap.has(instBaseId)) {
              entryMap.set(
                instBaseId,
                buildInstallmentFinancialEntry({
                  id: instBaseId,
                  playerId: player.id,
                  playerName: player.name,
                  contractIndex: cIdx,
                  isPayable,
                  partner,
                  amount: inst.annualInstallmentValue,
                }),
              );
            } else if (!hasAnyPaid) {
              entryMap.delete(instBaseId);
            }
          } else if (matchesSeasonExplicitly === false) {
            entryMap.delete(instBaseId);
          } else if (inst.status === "paid") {
            if (belongsToContractSeason && !entryMap.has(instBaseId)) {
              entryMap.set(
                instBaseId,
                buildInstallmentFinancialEntry({
                  id: instBaseId,
                  playerId: player.id,
                  playerName: player.name,
                  contractIndex: cIdx,
                  isPayable,
                  partner,
                  amount: inst.annualInstallmentValue,
                }),
              );
            }
          } else if (!hasAnyPaid) {
            entryMap.delete(instBaseId);
          }
        }
      }
    });

    // Bônus de desempenho em contractDetails
    if (player.contractDetails?.performanceBonuses) {
      for (const b of player.contractDetails.performanceBonuses) {
        const isPaid =
          b.paid ||
          b.status === "paid" ||
          (b.status as string) === "Liquidado" ||
          (b.status as string) === "Liquidada";

        if (isPaid && b.value > 0) {
          const isPaidThisSeason = b.paidSeasonId
            ? b.paidSeasonId === season.id
            : b.paidSeasonNumber !== undefined && season.seasonNumber !== undefined
              ? b.paidSeasonNumber === season.seasonNumber
              : true;

          const bonusId = `bonus_${b.id}`;
          if (isPaidThisSeason) {
            if (!entryMap.has(bonusId)) {
              const isReceivable = b.direction === "receivable";
              entryMap.set(bonusId, {
                id: bonusId,
                type: isReceivable ? "revenue" : "expense",
                category: isReceivable
                  ? "Transferências (vendas de atletas)"
                  : "Bônus de conquista",
                amount: Math.round(b.value),
                description: isReceivable
                  ? `Recebimento de bônus (${b.name}) referente a ${player.name}`
                  : `Pagamento de bônus (${b.name}) a ${player.name}`,
                isAutomatic: true,
                source: "clause",
                sourceId: b.id,
                clauseType: "bonus",
                transferDirection: isReceivable ? "exit" : "arrivals",
              });
            }
          } else {
            entryMap.delete(bonusId);
          }
        }
      }
    }
  }

  // 4. Calcular e reconciliar deterministicamente a despesa automática consolidada de salários semanais
  const consolidatedSalaryId = `salary_season_${season.id}`;
  const existingSalaryEntry = existingEntries.find(
    (e) =>
      e.id === consolidatedSalaryId ||
      e.source === "salary" ||
      (e.isAutomatic && e.id.startsWith("salary_")),
  );

  const preservedManualAdjustment =
    existingSalaryEntry?.manualAdjustment !== undefined
      ? existingSalaryEntry.manualAdjustment
      : existingSalaryEntry?.calculatedAmount !== undefined
        ? existingSalaryEntry.amount - existingSalaryEntry.calculatedAmount
        : 0;

  // Garantir que nenhum lançamento fragmentado antigo permaneça no entryMap
  for (const key of Array.from(entryMap.keys())) {
    if (key.startsWith("salary_") && key !== consolidatedSalaryId) {
      entryMap.delete(key);
    }
  }

  if (season.matches && season.matches.length > 0) {
    const consolidatedSalary = calculateConsolidatedSeasonSalaryExpense({
      career: career || { createdAt: new Date(), nation: "ESP" },
      season,
    });

    if (consolidatedSalary) {
      const calculatedAmount = consolidatedSalary.amount;
      const finalAmount = Math.max(
        0,
        Math.round(calculatedAmount + preservedManualAdjustment),
      );

      entryMap.set(consolidatedSalary.id, {
        id: consolidatedSalary.id,
        type: "expense",
        category: "Salários de atletas",
        amount: finalAmount,
        calculatedAmount,
        ...(preservedManualAdjustment !== 0
          ? { manualAdjustment: preservedManualAdjustment }
          : {}),
        date: consolidatedSalary.date,
        description: consolidatedSalary.description,
        isAutomatic: true,
        source: "salary",
        sourceId: consolidatedSalary.lastMatchId,
        lastProcessedDate: consolidatedSalary.toDayMonth,
      });
    }
  }

  return Array.from(entryMap.values());
}
