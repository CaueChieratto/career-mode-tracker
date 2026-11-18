import { Career } from "../../interfaces/Career";
import {
  FinancialEntry,
  FinancialTotals,
  SeasonFinancialReport,
} from "../../interfaces/finance";
import { Players } from "../../interfaces/playersInfo/players";
import { Contract } from "../../interfaces/playersInfo/contract";
import { ServiceFinance } from "./index";

/**
 * Agrega relatórios financeiros de todas as temporadas da carreira em memória.
 */
export function aggregateFinancialReports(
  career?: Career | null,
): SeasonFinancialReport {
  if (!career || !career.clubData || career.clubData.length === 0) {
    return {
      seasonId: "geral",
      seasonNumber: 0,
      entries: [],
    };
  }

  const allEntries: FinancialEntry[] = [];
  for (const season of career.clubData) {
    if (season.financialReport?.entries) {
      allEntries.push(...season.financialReport.entries);
    }
  }

  return {
    seasonId: "geral",
    seasonNumber: 0,
    entries: allEntries,
  };
}

/**
 * Calcula totais consolidados de receitas, despesas e saldo líquido acumulado de toda a carreira.
 */
export function aggregateCareerFinancialTotals(
  career?: Career | null,
): FinancialTotals {
  const report = aggregateFinancialReports(career);
  return ServiceFinance.calculateTotals(report.entries);
}

export interface CareerTransferTimelineItem {
  player: Players;
  contract: Contract;
  seasonId: string;
  seasonNumber: number;
  direction: "arrivals" | "exit";
  date: Date | null;
  transferType:
    | "Compra"
    | "Venda"
    | "Empréstimo"
    | "Emprestar"
    | "Base"
    | "Passes Livres"
    | "Aposentadoria"
    | "Fim de Contrato";
  value: number;
  partnerClub: string;
}

/**
 * Agrega e unifica transferências (chegadas e saídas) de todas as temporadas da carreira.
 */
export function aggregateCareerTransfers(career?: Career | null): {
  arrivals: Players[];
  departures: Players[];
  timeline: CareerTransferTimelineItem[];
} {
  if (!career || !career.clubData) {
    return { arrivals: [], departures: [], timeline: [] };
  }

  const allPlayers = career.clubData.flatMap((s) => s.players || []);
  const uniquePlayersMap = new Map<string, Players>();
  for (const p of allPlayers) {
    if (!uniquePlayersMap.has(p.id)) {
      uniquePlayersMap.set(p.id, p);
    }
  }
  const uniquePlayers = Array.from(uniquePlayersMap.values());

  const arrivals = uniquePlayers.filter((p) =>
    p.contract?.some((c) => Boolean(c.fromClub)),
  );
  const departures = uniquePlayers.filter((p) =>
    p.contract?.some((c) => Boolean(c.leftClub)),
  );

  const timeline: CareerTransferTimelineItem[] = [];

  for (const season of career.clubData) {
    for (const player of season.players || []) {
      for (const contract of player.contract || []) {
        if (contract.fromClub) {
          const isLoan = Boolean(
            contract.isLoan ||
              (player.incomingLoan &&
                !contract.fromLoanBuyOption &&
                contract.isLoan !== false &&
                !(Number(contract.buyValue) > 0)),
          );
          let tType: CareerTransferTimelineItem["transferType"] = "Compra";
          if (contract.fromClub === "Base") tType = "Base";
          else if (contract.fromClub === "Passes Livres") tType = "Passes Livres";
          else if (isLoan) tType = "Empréstimo";

          timeline.push({
            player,
            contract,
            seasonId: season.id,
            seasonNumber: season.seasonNumber,
            direction: "arrivals",
            date: contract.dataArrival ? new Date(contract.dataArrival) : null,
            transferType: tType,
            value:
              typeof contract.buyValue === "number"
                ? contract.buyValue
                : Number(contract.buyValue) || 0,
            partnerClub: contract.fromClub,
          });
        }

        if (contract.leftClub) {
          const isLoan = Boolean(
            contract.isLoan ||
              (player.loan &&
                !contract.fromLoanBuyOption &&
                contract.isLoan !== false &&
                !(Number(contract.sellValue) > 0)),
          );
          let tType: CareerTransferTimelineItem["transferType"] = "Venda";
          if (
            contract.leftClub === "Aposentou" ||
            contract.leftClub === "Aposentadoria"
          ) {
            tType = "Aposentadoria";
          } else if (contract.leftClub === "Fim de Contrato") {
            tType = "Fim de Contrato";
          } else if (isLoan) {
            tType = "Emprestar";
          }

          timeline.push({
            player,
            contract,
            seasonId: season.id,
            seasonNumber: season.seasonNumber,
            direction: "exit",
            date: contract.dataExit ? new Date(contract.dataExit) : null,
            transferType: tType,
            value:
              typeof contract.sellValue === "number"
                ? contract.sellValue
                : Number(contract.sellValue) || 0,
            partnerClub: contract.leftClub,
          });
        }
      }
    }
  }

  timeline.sort((a, b) => {
    if (a.date && b.date) return b.date.getTime() - a.date.getTime();
    return b.seasonNumber - a.seasonNumber;
  });

  return { arrivals, departures, timeline };
}

export interface AggregatedClauseItem {
  id: string;
  player: Players;
  contractIndex: number;
  seasonId: string;
  seasonNumber: number;
  category:
    | "installment"
    | "performanceBonus"
    | "achievementBonus"
    | "otherClause";
  title: string;
  description: string;
  value: number;
  partnerClub?: string;
  status: "pending" | "paid" | "expired" | "active";
  details?: Record<string, unknown>;
}

/**
 * Agrega todas as cláusulas (parcelas, bônus e cláusulas especiais) de todas as temporadas da carreira.
 */
export function aggregateCareerClauses(career?: Career | null): {
  installments: AggregatedClauseItem[];
  performanceBonuses: AggregatedClauseItem[];
  achievementBonuses: AggregatedClauseItem[];
  otherClauses: AggregatedClauseItem[];
  totalActiveCount: number;
  totalPendingValue: number;
} {
  const result = {
    installments: [] as AggregatedClauseItem[],
    performanceBonuses: [] as AggregatedClauseItem[],
    achievementBonuses: [] as AggregatedClauseItem[],
    otherClauses: [] as AggregatedClauseItem[],
    totalActiveCount: 0,
    totalPendingValue: 0,
  };

  if (!career || !career.clubData) return result;

  for (const season of career.clubData) {
    for (const player of season.players || []) {
      const contracts = player.contract || [];
      contracts.forEach((c, cIdx) => {
        // Parcelas
        if (c.installments) {
          const inst = c.installments;
          const isPending = inst.status === "pending";
          const item: AggregatedClauseItem = {
            id: `inst-${season.id}-${player.id}-${cIdx}`,
            player,
            contractIndex: cIdx,
            seasonId: season.id,
            seasonNumber: season.seasonNumber,
            category: "installment",
            title: `Parcela (${
              inst.direction === "payable" ? "A Pagar" : "A Receber"
            })`,
            description: `${inst.percentage}% em ${inst.totalInstallments} parcelas (Restam ${inst.remainingInstallments})`,
            value: inst.annualInstallmentValue || 0,
            partnerClub: inst.partnerClub,
            status: inst.status,
            details: { ...inst },
          };
          result.installments.push(item);
          if (isPending) {
            result.totalActiveCount++;
            result.totalPendingValue += item.value;
          }
        }

        // Bônus em contrato
        if (c.bonuses && c.bonuses.length > 0) {
          for (const b of c.bonuses) {
            const isPerf = b.category === "performance" || Boolean(b.metric);
            const isPending = b.status === "pending";
            const item: AggregatedClauseItem = {
              id: b.id || `bonus-${season.id}-${player.id}-${cIdx}`,
              player,
              contractIndex: cIdx,
              seasonId: season.id,
              seasonNumber: season.seasonNumber,
              category: isPerf ? "performanceBonus" : "achievementBonus",
              title: b.name,
              description:
                b.targetObjective ||
                `${b.metricTarget ?? ""} ${b.metric ?? ""}`,
              value: b.value || 0,
              partnerClub: b.partnerClub,
              status: b.status,
              details: { ...b },
            };
            if (isPerf) {
              result.performanceBonuses.push(item);
            } else {
              result.achievementBonuses.push(item);
            }
            if (isPending) {
              result.totalActiveCount++;
              result.totalPendingValue += item.value;
            }
          }
        }

        // Outras Cláusulas
        if (c.transferClauses) {
          const tc = c.transferClauses;
          if (tc.loanBackDuration) {
            result.otherClauses.push({
              id: `lb-${season.id}-${player.id}-${cIdx}`,
              player,
              contractIndex: cIdx,
              seasonId: season.id,
              seasonNumber: season.seasonNumber,
              category: "otherClause",
              title: "Empréstimo de Volta (Loan-Back)",
              description: `Duração restante: ${tc.loanBackDuration} temporada(s)`,
              value: 0,
              partnerClub: tc.partnerClub || c.fromClub,
              status: "active",
            });
            result.totalActiveCount++;
          }
          if (tc.buybackValue) {
            result.otherClauses.push({
              id: `bb-${season.id}-${player.id}-${cIdx}`,
              player,
              contractIndex: cIdx,
              seasonId: season.id,
              seasonNumber: season.seasonNumber,
              category: "otherClause",
              title: "Cláusula de Recompra Fixada",
              description: "Direito de recompra prioritário acordado",
              value: tc.buybackValue,
              partnerClub: tc.partnerClub || c.leftClub,
              status: "active",
            });
            result.totalActiveCount++;
          }
          if (tc.firstRefusal) {
            result.otherClauses.push({
              id: `fr-${season.id}-${player.id}-${cIdx}`,
              player,
              contractIndex: cIdx,
              seasonId: season.id,
              seasonNumber: season.seasonNumber,
              category: "otherClause",
              title: "Direito de Preferência",
              description: "Direito de cobrir propostas de terceiros",
              value: 0,
              partnerClub: tc.partnerClub || c.leftClub,
              status: "active",
            });
            result.totalActiveCount++;
          }
          if (tc.sellOnPercentage) {
            result.otherClauses.push({
              id: `so-${season.id}-${player.id}-${cIdx}`,
              player,
              contractIndex: cIdx,
              seasonId: season.id,
              seasonNumber: season.seasonNumber,
              category: "otherClause",
              title: "Taxa de Futura Venda (Sell-On)",
              description: `Percentual acordado: ${tc.sellOnPercentage}%`,
              value: 0,
              partnerClub: tc.partnerClub || c.leftClub,
              status: "active",
              details: { percentage: tc.sellOnPercentage },
            });
            result.totalActiveCount++;
          }
        }

        if (c.loanTerms?.sellOnPercentage) {
          result.otherClauses.push({
            id: `so-loan-${season.id}-${player.id}-${cIdx}`,
            player,
            contractIndex: cIdx,
            seasonId: season.id,
            seasonNumber: season.seasonNumber,
            category: "otherClause",
            title: "Taxa de Futura Venda (Empréstimo)",
            description: `Percentual: ${c.loanTerms.sellOnPercentage}%`,
            value: 0,
            partnerClub: c.loanTerms.partnerClub || c.leftClub,
            status: "active",
            details: { percentage: c.loanTerms.sellOnPercentage },
          });
          result.totalActiveCount++;
        }
      });

      // contractDetails no jogador
      if (player.contractDetails) {
        const cd = player.contractDetails;
        if (cd.performanceBonuses) {
          for (const b of cd.performanceBonuses) {
            const isPending = b.status === "pending";
            result.performanceBonuses.push({
              id: b.id || `cd-perf-${season.id}-${player.id}`,
              player,
              contractIndex: 0,
              seasonId: season.id,
              seasonNumber: season.seasonNumber,
              category: "performanceBonus",
              title: b.name,
              description:
                b.targetObjective ||
                `${b.metricTarget ?? ""} ${b.metric ?? ""}`,
              value: b.value || 0,
              partnerClub: b.partnerClub,
              status: b.status,
              details: { ...b, isContractDetailsBonus: true },
            });
            if (isPending) {
              result.totalActiveCount++;
              result.totalPendingValue += b.value || 0;
            }
          }
        }
        if (cd.releaseClause) {
          result.otherClauses.push({
            id: `rc-${season.id}-${player.id}`,
            player,
            contractIndex: 0,
            seasonId: season.id,
            seasonNumber: season.seasonNumber,
            category: "otherClause",
            title: "Multa Rescisória Unilateral",
            description: "Valor fixado para quebra de vínculo",
            value: cd.releaseClause,
            status: "active",
          });
          result.totalActiveCount++;
        }
        if (cd.wageAdjustment?.enabled) {
          result.otherClauses.push({
            id: `wa-${season.id}-${player.id}`,
            player,
            contractIndex: 0,
            seasonId: season.id,
            seasonNumber: season.seasonNumber,
            category: "otherClause",
            title: "Ajuste Salarial por Meta",
            description: `±${cd.wageAdjustment.percentage}% condicionado a ${cd.wageAdjustment.targetObjective}`,
            value: 0,
            status: "active",
            details: { ...cd.wageAdjustment },
          });
          result.totalActiveCount++;
        }
      }
    }
  }

  return result;
}
