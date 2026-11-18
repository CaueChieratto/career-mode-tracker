import { Players } from "../../../interfaces/playersInfo/players";
import { Contract } from "../../../interfaces/playersInfo/contract";
import { applyInstallmentSettlement } from "../../../interfaces/playersInfo/transferTerms";
import {
  isNextSeasonTiming,
  isNextWindowTiming,
  resolveNextWindowTimingSchedule,
  getLoanBackEndSeasonNumber,
} from "../../ServicePlayers/helpers/transferTimingHelpers";

export interface BuildNextSeasonOptions {
  seasonNumber: number;
  newSeasonId?: string;
  careerCreatedAt?: Date | string | null;
  careerNation?: string;
  previousSeasonNumber?: number;
}

export function buildNextSeasonPlayers(
  currentSeasonPlayers: Players[],
  nextSeasonStartDate: Date | string,
  options: BuildNextSeasonOptions,
): Players[] {
  const {
    seasonNumber,
    newSeasonId,
    careerCreatedAt,
    careerNation,
    previousSeasonNumber,
  } = options;
  const resolvedNewSeasonId = newSeasonId || `season-${seasonNumber}`;
  const returnDate: Date =
    nextSeasonStartDate instanceof Date
      ? nextSeasonStartDate
      : new Date(nextSeasonStartDate);

  const getContinuingExitLoanBackContract = (
    player: Players,
  ): Contract | undefined =>
    (player.contract || []).find((c) => {
      if (!c.leftClub || c.isLoan || !c.transferClauses?.loanBackDuration) {
        return false;
      }
      const endSeason = getLoanBackEndSeasonNumber(
        c,
        careerCreatedAt,
        careerNation,
        previousSeasonNumber ?? 1,
      );
      return seasonNumber < endSeason;
    });

  const hasContinuingExitLoanBack = (player: Players): boolean =>
    Boolean(getContinuingExitLoanBackContract(player));

  const getEndingExitLoanBackContract = (
    player: Players,
  ): Contract | undefined =>
    (player.contract || []).find((c) => {
      if (!c.leftClub || c.isLoan || !c.transferClauses?.loanBackDuration) {
        return false;
      }
      const endSeason = getLoanBackEndSeasonNumber(
        c,
        careerCreatedAt,
        careerNation,
        previousSeasonNumber ?? 1,
      );
      return seasonNumber === endSeason;
    });

  const hasEndingExitLoanBack = (player: Players): boolean =>
    Boolean(getEndingExitLoanBackContract(player));

  const hasObligationsForNextSeason = (p: Players): boolean => {
    return (p.contract || []).some((c) => {
      const clauses = c.transferClauses;
      const isLbContinuing =
        Boolean(clauses?.loanBackDuration) &&
        seasonNumber <
          getLoanBackEndSeasonNumber(
            c,
            careerCreatedAt,
            careerNation,
            previousSeasonNumber ?? 1,
          );
      const hasOtherSpecialClauses = Boolean(
        clauses?.buybackValue ||
          clauses?.sellOnPercentage ||
          clauses?.firstRefusal ||
          isLbContinuing ||
          c.loanTerms?.sellOnPercentage,
      );
      const hasPendingInstallments = Boolean(
        c.installments &&
          (Array.isArray(c.installments.installmentsList) ||
          Boolean(c.installments.paidSeasonId)
            ? c.installments.remainingInstallments > 0
            : c.installments.status === "paid"
              ? c.installments.remainingInstallments > 1
              : c.installments.remainingInstallments > 0),
      );
      const hasPendingBonuses = Boolean(
        (c.bonuses || []).some(
          (b) => b.status !== "paid" && b.status !== "expired",
        ),
      );
      return (
        hasPendingInstallments || hasPendingBonuses || hasOtherSpecialClauses
      );
    });
  };

  const isAlreadySoldOrDeparted = (player: Players): boolean => {
    if (hasContinuingExitLoanBack(player)) return false;
    if (hasEndingExitLoanBack(player)) return false;
    const exitContracts = (player.contract || []).filter(
      (c) => Boolean(c.leftClub) && !c.isLoan,
    );
    if (exitContracts.length > 0) {
      const last = exitContracts[exitContracts.length - 1];
      if (isNextSeasonTiming(last.timing)) return false;
      if (isNextWindowTiming(last.timing)) {
        const sched = resolveNextWindowTimingSchedule(
          last,
          previousSeasonNumber ?? 1,
          careerCreatedAt,
          careerNation,
        );
        if (sched.belongsToPreviousSeason) return true;
        return false;
      }
      return true;
    }
    return Boolean(player.sell);
  };

  return currentSeasonPlayers
    .filter(
      (player) =>
        !isAlreadySoldOrDeparted(player) || hasObligationsForNextSeason(player),
    )
    .map((player) => {
      const lastContract = player.contract?.[player.contract.length - 1];
      const isIncoming = !!player.incomingLoan;
      const remainingLoan =
        lastContract?.loanDuration ?? (isIncoming ? player.contractTime : 0) ?? 0;
      const isExitLoanBackContinuing = hasContinuingExitLoanBack(player);
      const isExitLoanBackEnding = hasEndingExitLoanBack(player);
      const continuingLbContract = getContinuingExitLoanBackContract(player);
      const endingLbContract = getEndingExitLoanBackContract(player);
      const hasActiveLoanBack = isExitLoanBackContinuing;
      const isRegularOutgoingLoan =
        player.loan &&
        !isIncoming &&
        Boolean(lastContract?.isLoan && lastContract?.leftClub);

      const shouldReturnLoan =
        isRegularOutgoingLoan && !hasActiveLoanBack && remainingLoan <= 1;

      // Ativação de transferências pré-agendadas ("Próxima temporada" e "Próxima Janela" da nova temporada)
      const scheduledExitContract = (player.contract || []).find((c) => {
        if (!c.sellValue && !c.leftClub) return false;
        if (isNextSeasonTiming(c.timing)) return true;
        if (isNextWindowTiming(c.timing)) {
          const sched = resolveNextWindowTimingSchedule(
            c,
            previousSeasonNumber ?? 1,
            careerCreatedAt,
            careerNation,
          );
          return sched.belongsToNewSeason;
        }
        return false;
      });

      const scheduledArrivalContract = (player.contract || []).find((c) => {
        if (!c.buyValue && !c.fromClub) return false;
        if (isNextSeasonTiming(c.timing)) return true;
        if (isNextWindowTiming(c.timing)) {
          const sched = resolveNextWindowTimingSchedule(
            c,
            previousSeasonNumber ?? 1,
            careerCreatedAt,
            careerNation,
          );
          return sched.belongsToNewSeason;
        }
        return false;
      });

      const wasAlreadyDeparted = isAlreadySoldOrDeparted(player);
      const isSold =
        (wasAlreadyDeparted ||
          Boolean(scheduledExitContract) ||
          Boolean(player.sell)) &&
        !isExitLoanBackContinuing;
      const isBuy = !isSold && Boolean(scheduledArrivalContract);

      // Decremento de Loan-Back (Empréstimo de volta)
      let isLoanState = player.loan;
      const updatedContractsBase = (player.contract || []).map((c) => {
        const updatedC = { ...c };
        const isNextSeason = isNextSeasonTiming(updatedC.timing);
        const isNextWindow = isNextWindowTiming(updatedC.timing);

        if (isNextSeason || isNextWindow) {
          let shouldActivateInNewSeason = isNextSeason;
          let effectiveDateForNewSeason = returnDate;

          if (isNextWindow) {
            const sched = resolveNextWindowTimingSchedule(
              updatedC,
              previousSeasonNumber ?? 1,
              careerCreatedAt,
              careerNation,
            );
            shouldActivateInNewSeason = sched.belongsToNewSeason;
            effectiveDateForNewSeason = sched.effectiveDate;
          }

          if (shouldActivateInNewSeason) {
            updatedC.timing = "Imediata";
            updatedC.fromScheduledAgreement = true;
            if (
              scheduledExitContract &&
              (Boolean(updatedC.sellValue) || Boolean(updatedC.leftClub))
            ) {
              updatedC.dataExit = effectiveDateForNewSeason;
            }
            if (
              scheduledArrivalContract &&
              (Boolean(updatedC.buyValue) || Boolean(updatedC.fromClub))
            ) {
              updatedC.dataArrival = effectiveDateForNewSeason;
            }
          } else if (isNextWindow) {
            // Acordo que pertencia ao meio da temporada anterior
            const sched = resolveNextWindowTimingSchedule(
              updatedC,
              previousSeasonNumber ?? 1,
              careerCreatedAt,
              careerNation,
            );
            updatedC.timing = "Imediata";
            if (Boolean(updatedC.sellValue) || Boolean(updatedC.leftClub)) {
              updatedC.dataExit = sched.effectiveDate;
            }
            if (Boolean(updatedC.buyValue) || Boolean(updatedC.fromClub)) {
              updatedC.dataArrival = sched.effectiveDate;
            }
          }
        }
        if (updatedC.transferClauses?.loanBackDuration) {
          const isExitLb = Boolean(updatedC.leftClub) && !updatedC.isLoan;
          if (isExitLb) {
            const endSeason = getLoanBackEndSeasonNumber(
              updatedC,
              careerCreatedAt,
              careerNation,
              previousSeasonNumber ?? 1,
            );
            if (seasonNumber < endSeason) {
              // Empréstimo de volta continua ativo
              updatedC.transferClauses = {
                ...updatedC.transferClauses,
                loanEndSeasonNumber: endSeason,
              };
            } else {
              // Empréstimo de volta concluído
              const restClauses = { ...updatedC.transferClauses };
              delete restClauses.loanBackDuration;
              delete restClauses.loanEndSeasonNumber;
              if (Object.keys(restClauses).length > 0) {
                updatedC.transferClauses = restClauses;
              } else {
                delete updatedC.transferClauses;
              }
            }
          } else {
            // Arrival loan-back (quando compramos um jogador e ele fica emprestado no vendedor)
            const currentLb = updatedC.transferClauses.loanBackDuration;
            if (currentLb > 1) {
              updatedC.transferClauses = {
                ...updatedC.transferClauses,
                loanBackDuration: 1,
              };
            } else {
              isLoanState = false;
              const restClauses = { ...updatedC.transferClauses };
              delete restClauses.loanBackDuration;
              if (Object.keys(restClauses).length > 0) {
                updatedC.transferClauses = restClauses;
              } else {
                delete updatedC.transferClauses;
              }
            }
          }
        }

        // Higiene de Parcelamentos
        if (updatedC.installments) {
          const inst = updatedC.installments;
          if (inst.remainingInstallments <= 0) {
            delete updatedC.installments;
          } else if (
            inst.status === "paid" &&
            !Array.isArray(inst.installmentsList) &&
            !inst.paidSeasonId
          ) {
            if (inst.remainingInstallments > 1) {
              updatedC.installments = {
                ...inst,
                remainingInstallments: inst.remainingInstallments - 1,
                status: "pending",
              };
            } else {
              delete updatedC.installments;
            }
          } else {
            const { updated } = applyInstallmentSettlement(
              inst,
              resolvedNewSeasonId,
              seasonNumber,
            );
            updatedC.installments = updated;
          }
        }

        // Higiene de Bônus: expurgar itens quitados da temporada anterior
        if (updatedC.bonuses) {
          const activeBonuses = updatedC.bonuses.filter(
            (b) =>
              b.status !== "paid" &&
              b.status !== "expired" &&
              (b.status as string) !== "Liquidada" &&
              (b.status as string) !== "Liquidado" &&
              (b.status as string) !== "Expirada",
          );
          if (activeBonuses.length > 0) {
            updatedC.bonuses = activeBonuses;
          } else {
            delete updatedC.bonuses;
          }
        }

        if (updatedC.contractDetails?.wageAdjustment) {
          const wa = updatedC.contractDetails.wageAdjustment;
          if (
            wa.status === "paid" ||
            wa.status === "applied" ||
            wa.applied ||
            (wa.status as string) === "Liquidada" ||
            (wa.status as string) === "Liquidado" ||
            (wa.status as string) === "Expirada"
          ) {
            delete updatedC.contractDetails.wageAdjustment;
          }
        }

        if (updatedC.contractClauses?.wageAdjustment) {
          const wa = updatedC.contractClauses.wageAdjustment;
          if (
            wa.status === "paid" ||
            wa.status === "applied" ||
            wa.applied ||
            (wa.status as string) === "Liquidada" ||
            (wa.status as string) === "Liquidado" ||
            (wa.status as string) === "Expirada"
          ) {
            delete updatedC.contractClauses.wageAdjustment;
          }
        }

        return updatedC;
      });

      // Higiene de Bônus em contractDetails
      const updatedContractDetails = player.contractDetails
        ? { ...player.contractDetails }
        : undefined;
      if (updatedContractDetails?.performanceBonuses) {
        const activePerf = updatedContractDetails.performanceBonuses.filter(
          (b) =>
            b.status !== "paid" &&
            b.status !== "expired" &&
            (b.status as string) !== "Liquidada" &&
            (b.status as string) !== "Liquidado" &&
            (b.status as string) !== "Expirada",
        );
        if (activePerf.length > 0) {
          updatedContractDetails.performanceBonuses = activePerf;
        } else {
          delete updatedContractDetails.performanceBonuses;
        }
      }

      if (updatedContractDetails?.wageAdjustment) {
        const wa = updatedContractDetails.wageAdjustment;
        if (
          wa.status === "paid" ||
          wa.status === "applied" ||
          wa.applied ||
          (wa.status as string) === "Liquidada" ||
          (wa.status as string) === "Liquidado" ||
          (wa.status as string) === "Expirada"
        ) {
          delete updatedContractDetails.wageAdjustment;
        }
      }

      const loanRemainingYears = continuingLbContract
        ? Math.max(
            1,
            getLoanBackEndSeasonNumber(
              continuingLbContract,
              careerCreatedAt,
              careerNation,
              previousSeasonNumber ?? 1,
            ) - seasonNumber,
          )
        : 1;

      const updatedPlayer: Players = {
        ...player,
        sell: isExitLoanBackContinuing
          ? false
          : isExitLoanBackEnding
            ? true
            : isSold,
        buy: isSold ? false : isBuy,
        loan: isLoanState,
        incomingLoan: isExitLoanBackContinuing
          ? true
          : isSold
            ? false
            : player.incomingLoan,
        age:
          isSold && !isExitLoanBackContinuing
            ? player.age
            : (player.age || 0) + 1,
        ...(player.contractTime !== undefined || isExitLoanBackContinuing
          ? {
              contractTime: isExitLoanBackContinuing
                ? loanRemainingYears
                : isExitLoanBackEnding
                  ? 0
                  : isSold
                    ? player.contractTime
                    : Math.max(
                        0,
                        Math.round(((player.contractTime || 0) - 1) * 10) / 10,
                      ),
            }
          : {}),
        statsLeagues: [],
        ballonDor: 0,
        contract: updatedContractsBase,
        ...(updatedContractDetails
          ? { contractDetails: updatedContractDetails }
          : {}),
      };
      if (
        player.contractTime === undefined &&
        !isExitLoanBackContinuing &&
        !isExitLoanBackEnding
      ) {
        delete updatedPlayer.contractTime;
      }

      if (!updatedContractDetails) {
        delete updatedPlayer.contractDetails;
      }

      if (shouldReturnLoan) {
        updatedPlayer.loan = false;
        updatedPlayer.contract = [
          ...updatedContractsBase,
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: lastContract?.leftClub || "Fim de Empréstimo",
            leftClub: "",
            dataArrival: returnDate,
            dataExit: null,
          },
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: "",
            leftClub: "",
            dataArrival: null,
            dataExit: null,
          },
        ];
      } else if (isExitLoanBackEnding) {
        const loanClub = endingLbContract?.leftClub || "Fim de Empréstimo";
        updatedPlayer.sell = true;
        updatedPlayer.incomingLoan = false;
        updatedPlayer.loan = false;
        updatedPlayer.contractTime = 0;
        updatedPlayer.contract = [
          ...updatedContractsBase,
          {
            buyValue: 0,
            sellValue: 0,
            fromClub: loanClub,
            leftClub: loanClub,
            dataArrival: null,
            dataExit: returnDate,
            isLoan: true,
            isLoanBackReturn: true,
            timing: "Imediata",
          },
        ];
      } else if (player.loan && !isIncoming && remainingLoan > 1) {
        updatedPlayer.contract = updatedContractsBase.map((contract, index) =>
          index === updatedContractsBase.length - 1
            ? {
                ...contract,
                loanDuration:
                  Math.round(((contract.loanDuration || 0) - 1) * 10) / 10,
              }
            : contract,
        );
      } else if (isIncoming && remainingLoan > 1 && !isExitLoanBackContinuing) {
        updatedPlayer.contract = updatedContractsBase.map((contract, index) =>
          index === updatedContractsBase.length - 1
            ? {
                ...contract,
                loanDuration: Math.round((remainingLoan - 1) * 10) / 10,
              }
            : contract,
        );
      } else if (isIncoming && lastContract && !isExitLoanBackContinuing) {
        updatedPlayer.sell = true;
        updatedPlayer.incomingLoan = false;
        updatedPlayer.loan = false;
        if (lastContract.isLoan) {
          updatedPlayer.contract = updatedContractsBase.map((contract, index) =>
            index === updatedContractsBase.length - 1
              ? {
                  ...contract,
                  dataExit: returnDate,
                  leftClub: contract.fromClub || "Fim de Empréstimo",
                }
              : contract,
          );
        }
      }

      return updatedPlayer;
    });
}

