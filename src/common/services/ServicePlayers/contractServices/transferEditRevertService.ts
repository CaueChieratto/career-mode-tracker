import { doc, getDoc, setDoc, deleteDoc, collection } from "firebase/firestore";
import { getCareerById } from "../../../helpers/Getters";
import { updateCareerFirestore } from "../../../helpers/Setters";
import { getSeasonDateRange } from "../../../utils/GetSeasonDateRange";
import { sanitizeFirestoreData } from "../../../utils/sanitizeFirestore";
import { db } from "../../Firebase";
import { requireAuth } from "../helpers/authHelpers";
import {
  checkIsIncomingLoanExit,
  checkIsLoanReturnArrival,
} from "../helpers/contractHelpers";
import {
  shouldPlayerLeaveOnNextWindow,
  isNextSeasonTiming,
  isNextWindowTiming,
  getLoanBackEndSeasonNumber,
  parseMatchDateToDate,
} from "../helpers/transferTimingHelpers";
import { parseBrasilDate } from "../../../utils/Date";
import { parseValue, formatTransferValue } from "../../../utils/FormatValue";
import { calculateContractYears } from "../../../utils/calculateContractYears";
import { parseLoanDuration } from "../../../utils/parseLoanDuration";
import { ServiceMatches } from "../../ServiceMatches";
import { ServiceFinance } from "../../ServiceFinance";
import { ServiceProposals } from "../../ServiceProposals";
import { clauseSettlementService } from "./clauseSettlementService";
import { Players } from "../../../interfaces/playersInfo/players";
import { Contract } from "../../../interfaces/playersInfo/contract";
import { TransferTiming } from "../../../interfaces/playersInfo/transferTerms";
import {
  ContractDetails,
  SquadRole,
  validateContractDetails,
} from "../../../interfaces/playersInfo/contractClauses";
import {
  EditTransferParams,
  READ_ONLY_GERAL_ERROR,
  RevertTransferParams,
} from "./types";

export const transferEditRevertService = {
  editTransferInSeason: async (params: EditTransferParams): Promise<void> => {
    const {
      careerId,
      seasonId,
      playerId,
      contractIndex,
      direction,
      transferType,
      clubName,
      transferValue,
      date,
      loanDuration,
      wagePercentage,
    } = params;

    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    if (!seasonToUpdate) throw new Error("Dados não encontrados");

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    let player = seasonToUpdate.players?.find((p) => p.id === playerId);
    try {
      const modernSnap = await getDoc(playerRef);
      if (modernSnap.exists()) {
        player = modernSnap.data() as Players;
      }
    } catch {
      // Fallback defensivo
    }

    if (!player) throw new Error("Dados não encontrados");

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );

    const contracts = player.contract ? [...player.contract] : [];
    let idx = contractIndex;
    if (idx < 0 || idx >= contracts.length) {
      idx = contracts.findIndex((c) =>
        direction === "exit"
          ? Boolean(c.dataExit || c.leftClub)
          : Boolean(c.dataArrival || c.fromClub),
      );
      if (idx < 0) idx = Math.max(0, contracts.length - 1);
    }

    const currentContract = { ...(contracts[idx] || {}) };
    const existingTransferDate =
      direction === "exit"
        ? currentContract.dataExit
        : currentContract.dataArrival;
    const existingDateParsed = existingTransferDate
      ? parseMatchDateToDate(existingTransferDate, startDate.getFullYear())
      : null;
    const isExistingDateInCurrentSeason = existingDateParsed
      ? existingDateParsed.getTime() >= startDate.getTime() &&
        existingDateParsed.getTime() <= endDate.getTime()
      : true;
    const isPastSeasonContract = Boolean(
      existingDateParsed && !isExistingDateInCurrentSeason,
    );
    const shouldPreserveOriginalDate = Boolean(
      params.preserveTransferDate && existingTransferDate,
    );

    let parsedDate: Date | null = null;
    if (shouldPreserveOriginalDate && existingDateParsed) {
      parsedDate = existingDateParsed;
    } else {
      const [, month] = date.split("/").map(Number);
      const m = (month || 1) - 1;
      let year: number;
      if (isPastSeasonContract && existingDateParsed) {
        const origStartYear =
          existingDateParsed.getMonth() < startDate.getMonth()
            ? existingDateParsed.getFullYear() - 1
            : existingDateParsed.getFullYear();
        const origEndYear = origStartYear + 1;
        year = m < startDate.getMonth() ? origEndYear : origStartYear;
      } else {
        year =
          m < startDate.getMonth()
            ? endDate.getFullYear()
            : startDate.getFullYear();
      }
      parsedDate = parseBrasilDate(date, year);
      if (!parsedDate) throw new Error("Data inválida");
    }

    let finalPlayer: Players = { ...player };

    let effectiveBuyOpt: number | undefined;
    let effectiveSellOn: number | undefined;
    let effectiveExercisedPurchaseIdx = -1;
    let effectiveExercisedSaleIdx = -1;

    const specialClubs = [
      "Base",
      "Aposentadoria",
      "Aposentou",
      "Fim de Contrato",
      "Passes Livres",
    ];
    const isSpecialExit =
      currentContract.leftClub &&
      specialClubs.includes(currentContract.leftClub);
    const isSpecialArrival =
      currentContract.fromClub &&
      specialClubs.includes(currentContract.fromClub);

    const isIncomingReturn =
      checkIsIncomingLoanExit(player, currentContract, direction) ||
      transferType === "Fim de Empréstimo";

    if (direction === "exit") {
      if (!shouldPreserveOriginalDate) {
        currentContract.dataExit = parsedDate;
      }

      if (isIncomingReturn) {
        if (clubName) currentContract.leftClub = clubName;
        currentContract.sellValue = 0;
        currentContract.isLoan = true;
        delete currentContract.loanDuration;
        delete currentContract.wagePercentage;
        delete currentContract.buyOptionValue;
        finalPlayer = {
          ...finalPlayer,
          sell: true,
          loan: false,
          incomingLoan: false,
        };
      } else if (!isSpecialExit) {
        if (clubName) currentContract.leftClub = clubName;

        if (transferType === "Venda") {
          currentContract.sellValue = parseValue(transferValue || "0");
          currentContract.isLoan = false;
          delete currentContract.loanDuration;
          delete currentContract.wagePercentage;
          finalPlayer = {
            ...finalPlayer,
            sell: true,
            loan: false,
          };
        } else if (
          transferType === "Emprestar" ||
          transferType === "Empréstimo"
        ) {
          currentContract.sellValue = 0;
          currentContract.isLoan = true;
          currentContract.loanDuration =
            parseLoanDuration(loanDuration) ?? (Number(loanDuration) || 0);
          currentContract.wagePercentage = Number(wagePercentage) || 0;

          const buyOptFee =
            params.buyOption !== undefined
              ? params.buyOption.trim()
                ? parseValue(params.buyOption)
                : 0
              : params.buyOptionValue !== undefined
                ? parseValue(params.buyOptionValue || "0")
                : params.loanTerms?.buyOptionFee ||
                  currentContract.buyOptionValue ||
                  currentContract.loanTerms?.buyOptionFee ||
                  0;
          const hasBuyOpt = params.loanTerms
            ? Boolean(params.loanTerms.hasBuyOption)
            : Boolean(params.buyOption) ||
              Boolean(params.buyOptionValue) ||
              buyOptFee > 0;
          const sellOnPct = hasBuyOpt
            ? params.loanTerms?.sellOnPercentage
            : undefined;

          const existingExercisedSaleIdx = contracts.findIndex(
            (c, i) =>
              i !== idx &&
              !c.isLoan &&
              Boolean(
                c.fromLoanBuyOption ||
                c.buyOptionFinalized ||
                c.sourceLoanContractIndex !== undefined,
              ),
          );
          effectiveBuyOpt = buyOptFee;
          effectiveSellOn = sellOnPct;
          effectiveExercisedSaleIdx = existingExercisedSaleIdx;
          const wasAlreadyExercised =
            Boolean(currentContract.loanTerms?.buyOptionExercised) ||
            existingExercisedSaleIdx !== -1;

          if (hasBuyOpt && buyOptFee > 0) {
            currentContract.buyOptionValue = buyOptFee;
            currentContract.loanTerms = {
              ...(params.loanTerms || currentContract.loanTerms || {}),
              durationYears:
                params.loanTerms?.durationYears ??
                currentContract.loanTerms?.durationYears ??
                1,
              ourWagePercentage:
                params.loanTerms?.ourWagePercentage ??
                currentContract.loanTerms?.ourWagePercentage ??
                0,
              theirWagePercentage:
                params.loanTerms?.theirWagePercentage ??
                currentContract.loanTerms?.theirWagePercentage ??
                100,
              hasBuyOption: hasBuyOpt,
              buyOptionFee: buyOptFee,
              ...(sellOnPct !== undefined && sellOnPct > 0
                ? { sellOnPercentage: sellOnPct }
                : {}),
              ...(wasAlreadyExercised
                ? {
                    buyOptionExercised: true,
                    buyOptionFinalized:
                      currentContract.loanTerms?.buyOptionFinalized ||
                      currentContract.buyOptionFinalized,
                    exercisedDate: currentContract.loanTerms?.exercisedDate,
                  }
                : {}),
            };

            if (existingExercisedSaleIdx !== -1) {
              const prevSale = contracts[existingExercisedSaleIdx];
              const nextSaleClauses = { ...(prevSale.transferClauses || {}) };
              if (sellOnPct && sellOnPct > 0) {
                nextSaleClauses.sellOnPercentage = sellOnPct;
                nextSaleClauses.partnerClub =
                  clubName || currentContract.leftClub;
                nextSaleClauses.status = nextSaleClauses.status || "pending";
              } else {
                delete nextSaleClauses.sellOnPercentage;
              }

              contracts[existingExercisedSaleIdx] = {
                ...prevSale,
                leftClub: clubName || currentContract.leftClub,
                sellValue: buyOptFee,
                fromLoanBuyOption: true,
                buyOptionFinalized: true,
                transferClauses:
                  Object.keys(nextSaleClauses).length > 0
                    ? nextSaleClauses
                    : undefined,
              };
            }
          } else {
            delete currentContract.buyOptionValue;
            const wageNum = Number(wagePercentage) || 0;
            const durationNum =
              parseLoanDuration(loanDuration) ?? (Number(loanDuration) || 1);
            currentContract.loanTerms = {
              ...(params.loanTerms || currentContract.loanTerms || {}),
              durationYears: params.loanTerms?.durationYears ?? durationNum,
              ourWagePercentage:
                params.loanTerms?.ourWagePercentage ??
                Math.max(0, 100 - wageNum),
              theirWagePercentage:
                params.loanTerms?.theirWagePercentage ??
                Math.min(100, Math.max(0, wageNum)),
              hasBuyOption: false,
              partnerClub: clubName || currentContract.leftClub || "",
            };
            delete currentContract.loanTerms.buyOptionFee;
            delete currentContract.loanTerms.sellOnPercentage;
            if (existingExercisedSaleIdx !== -1) {
              contracts.splice(existingExercisedSaleIdx, 1);
              if (existingExercisedSaleIdx < idx) {
                idx--;
              }
            }
          }

          const remainsExercised =
            hasBuyOpt && buyOptFee > 0 && wasAlreadyExercised;
          finalPlayer = {
            ...finalPlayer,
            sell: remainsExercised,
            loan: !remainsExercised,
            shirtNumber: "",
          };
        }
      }
    } else {
      // arrivals
      if (!shouldPreserveOriginalDate) {
        currentContract.dataArrival = parsedDate;
      }

      if (!isSpecialArrival) {
        if (clubName) currentContract.fromClub = clubName;

        if (transferType === "Compra") {
          currentContract.buyValue = parseValue(transferValue || "0");
          currentContract.isLoan = false;
          delete currentContract.loanDuration;
          delete currentContract.wagePercentage;
          finalPlayer = {
            ...finalPlayer,
            buy: true,
            incomingLoan: false,
          };
        } else if (transferType === "Empréstimo") {
          currentContract.buyValue = 0;
          currentContract.isLoan = true;
          currentContract.loanDuration =
            (parseLoanDuration(loanDuration) ?? Number(loanDuration)) || 0;
          currentContract.wagePercentage = Number(wagePercentage) || 100;

          const buyOptStr =
            params.buyOption !== undefined
              ? params.buyOption
              : params.buyOptionValue;
          const parsedBuyOpt =
            buyOptStr !== undefined
              ? buyOptStr.trim()
                ? parseValue(buyOptStr)
                : 0
              : currentContract.buyOptionValue ||
                currentContract.loanTerms?.buyOptionFee ||
                0;
          const hasBuyOpt = params.loanTerms
            ? Boolean(params.loanTerms.hasBuyOption)
            : Boolean(params.buyOption) ||
              Boolean(params.buyOptionValue) ||
              parsedBuyOpt > 0;
          const existingExercisedPurchaseIdx = contracts.findIndex(
            (c, i) => i !== idx && Boolean(c.fromLoanBuyOption && !c.isLoan),
          );
          const wasAlreadyExercised =
            Boolean(currentContract.loanTerms?.buyOptionExercised) ||
            existingExercisedPurchaseIdx !== -1;
          const remainsExercised =
            hasBuyOpt && parsedBuyOpt > 0 && wasAlreadyExercised;

          finalPlayer = {
            ...finalPlayer,
            buy: remainsExercised,
            incomingLoan: !remainsExercised,
          };
        }

        if (params.timing) {
          currentContract.timing = params.timing as TransferTiming;
        } else {
          delete currentContract.timing;
        }
      }
    }

    if (direction === "exit" && transferType === "Venda" && !isSpecialExit) {
      if (params.timing) {
        currentContract.timing = params.timing as TransferTiming;
      } else {
        delete currentContract.timing;
      }

      if (params.installments) {
        currentContract.installments = params.installments;
      } else {
        delete currentContract.installments;
      }

      if (params.bonuses && params.bonuses.length > 0) {
        currentContract.bonuses = params.bonuses;
      } else {
        delete currentContract.bonuses;
      }

      if (params.transferClauses) {
        if (params.transferClauses.loanBackDuration) {
          params.transferClauses.loanEndSeasonNumber =
            getLoanBackEndSeasonNumber(
              {
                ...currentContract,
                transferClauses: params.transferClauses,
              },
              career.createdAt,
              career.nation,
              seasonToUpdate.seasonNumber,
            );
        }
        currentContract.transferClauses = params.transferClauses;
      } else {
        delete currentContract.transferClauses;
      }

      const prevSwapPlayerId = currentContract.swapPlayer?.playerId;
      const prevSwapPlayerName = currentContract.swapPlayer?.playerName;

      if (params.swapPlayer) {
        const swapPlayerVal =
          params.swapPlayer.estimatedValue ||
          params.swapPlayer.playerValue ||
          0;

        if (prevSwapPlayerId) {
          const existingSwap = seasonToUpdate.players?.find(
            (p) => p.id === prevSwapPlayerId,
          );
          if (existingSwap) {
            existingSwap.name = params.swapPlayer.playerName;
            existingSwap.position = params.swapPlayer.position || "";
            existingSwap.sector = params.swapPlayer.sector || "";
            if (existingSwap.contract?.[0]) {
              existingSwap.contract[0].buyValue = swapPlayerVal;
              if (clubName) existingSwap.contract[0].fromClub = clubName.trim();
              existingSwap.contract[0].dataArrival = parsedDate;
            }
            const swRef = doc(
              db,
              `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
              existingSwap.id,
            );
            await setDoc(swRef, sanitizeFirestoreData(existingSwap));
            currentContract.swapPlayer = {
              ...params.swapPlayer,
              playerId: existingSwap.id,
              ...(currentContract.swapPlayer?.isCounterpart ||
              params.swapPlayer.isCounterpart
                ? { isCounterpart: true }
                : {}),
            };
          }
        } else {
          const incomingPlayerId = doc(
            collection(
              db,
              `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
            ),
          ).id;
          const incomingContract: Contract = {
            fromClub: clubName ? clubName.trim() : "",
            dataArrival: parsedDate,
            buyValue: swapPlayerVal,
            sellValue: 0,
            leftClub: "",
            swapPlayer: {
              playerId: player.id,
              playerName: player.name,
              playerValue: parseValue(transferValue || "0"),
              position: player.position,
              sector: player.sector,
            },
          };
          const incomingPlayer: Players = {
            id: incomingPlayerId,
            name: params.swapPlayer.playerName,
            position: params.swapPlayer.position || "",
            sector: params.swapPlayer.sector || "",
            overall: 0,
            age: 0,
            salary: 0,
            nation: "",
            contractTime: 0,
            buy: true,
            sell: false,
            loan: false,
            ballonDor: 0,
            shirtNumber: "",
            captain: false,
            statsLeagues: [],
            contract: [incomingContract],
          };
          await setDoc(
            doc(
              db,
              `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
              incomingPlayerId,
            ),
            sanitizeFirestoreData(incomingPlayer),
          );
          if (!seasonToUpdate.players) seasonToUpdate.players = [];
          seasonToUpdate.players.push(incomingPlayer);
          currentContract.swapPlayer = {
            ...params.swapPlayer,
            playerId: incomingPlayerId,
          };
        }
      } else if (prevSwapPlayerId || prevSwapPlayerName) {
        const swappedToRemove = (seasonToUpdate.players || []).filter(
          (p) =>
            (prevSwapPlayerId ? p.id === prevSwapPlayerId : false) ||
            p.contract?.some((c) => c.swapPlayer?.playerId === playerId) ||
            (prevSwapPlayerName && p.name === prevSwapPlayerName && p.buy),
        );
        for (const sw of swappedToRemove) {
          const swRef = doc(
            db,
            `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
            sw.id,
          );
          await deleteDoc(swRef);
        }
        seasonToUpdate.players = (seasonToUpdate.players || []).filter(
          (p) => !swappedToRemove.some((sw) => sw.id === p.id),
        );
        delete currentContract.swapPlayer;
      }

      const isLoanBack = Boolean(params.transferClauses?.loanBackDuration);
      if (isNextSeasonTiming(params.timing)) {
        finalPlayer.sell = false;
        finalPlayer.incomingLoan = false;
      } else if (isNextWindowTiming(params.timing)) {
        const shouldLeave = shouldPlayerLeaveOnNextWindow(
          seasonToUpdate.matches || [],
          parsedDate,
        );
        finalPlayer.sell = shouldLeave ? !isLoanBack : false;
        finalPlayer.incomingLoan = shouldLeave ? isLoanBack : false;
        if (shouldLeave && isLoanBack) {
          finalPlayer.contractTime = Number(
            params.transferClauses!.loanBackDuration,
          );
        }
      } else {
        finalPlayer.sell = !isLoanBack;
        finalPlayer.incomingLoan = isLoanBack;
        if (isLoanBack) {
          finalPlayer.contractTime = Number(
            params.transferClauses!.loanBackDuration,
          );
        }
      }
    } else if (direction === "arrivals") {
      if (params.timing)
        currentContract.timing = params.timing as TransferTiming;
      if ("installments" in params) {
        if (params.installments) {
          currentContract.installments = params.installments;
        } else {
          delete currentContract.installments;
        }
      }
      if ("swapPlayer" in params) {
        if (params.swapPlayer) {
          currentContract.swapPlayer = {
            ...params.swapPlayer,
            ...(currentContract.swapPlayer?.isCounterpart ||
            params.swapPlayer.isCounterpart
              ? { isCounterpart: true }
              : {}),
          };
        } else {
          delete currentContract.swapPlayer;
        }
      }
      if ("bonuses" in params) {
        if (params.bonuses && params.bonuses.length > 0) {
          currentContract.bonuses = params.bonuses;
        } else {
          delete currentContract.bonuses;
        }
      }
      if ("transferClauses" in params) {
        if (
          params.transferClauses &&
          Object.keys(params.transferClauses).length > 0
        ) {
          currentContract.transferClauses = params.transferClauses;
        } else {
          delete currentContract.transferClauses;
        }
      }

      const isLoanBack = Boolean(
        currentContract.transferClauses?.loanBackDuration,
      );
      if (currentContract.isLoan) {
        const buyOptStr =
          params.buyOption !== undefined
            ? params.buyOption
            : params.buyOptionValue;
        const parsedBuyOpt =
          buyOptStr !== undefined
            ? buyOptStr.trim()
              ? parseValue(buyOptStr)
              : 0
            : currentContract.buyOptionValue ||
              currentContract.loanTerms?.buyOptionFee ||
              0;
        const hasBuyOpt = params.loanTerms
          ? Boolean(params.loanTerms.hasBuyOption)
          : Boolean(params.buyOption) ||
            Boolean(params.buyOptionValue) ||
            parsedBuyOpt > 0;
        const existingExercisedPurchaseIdx = contracts.findIndex(
          (c, i) =>
            i !== idx &&
            (c.fromLoanBuyOption ||
              (!c.isLoan &&
                !c.leftClub &&
                (c.fromClub === (clubName || currentContract.fromClub) ||
                  contracts.some((x) => x.isLoan)))),
        );
        const wasAlreadyExercised =
          Boolean(currentContract.loanTerms?.buyOptionExercised) ||
          existingExercisedPurchaseIdx !== -1;
        const remainsExercised =
          hasBuyOpt && parsedBuyOpt > 0 && wasAlreadyExercised;

        finalPlayer.incomingLoan = !remainsExercised;
        finalPlayer.buy = remainsExercised;
        finalPlayer.loan = false;
      } else {
        finalPlayer.incomingLoan = false;
        finalPlayer.loan = isNextSeasonTiming(params.timing)
          ? false
          : isLoanBack;
      }
    }

    const isLatestActiveContract = idx === contracts.length - 1;

    if (direction === "arrivals" && transferType === "Compra") {
      const parsedSalary =
        params.salary !== undefined && String(params.salary).trim() !== ""
          ? parseValue(String(params.salary))
          : undefined;

      let parsedDuration: number | undefined;
      if (params.contractUntil && params.contractUntil.trim()) {
        const calculated = calculateContractYears(
          params.contractUntil.trim(),
          career.createdAt,
          seasonToUpdate.seasonNumber,
          career.nation,
        );
        if (calculated >= 1 && calculated <= 7) {
          parsedDuration = calculated;
        }
      }
      if (
        parsedDuration === undefined &&
        params.contractTime !== undefined &&
        String(params.contractTime).trim() !== ""
      ) {
        parsedDuration = Number(params.contractTime) || undefined;
      }

      const parsedSigningBonus =
        params.signingBonus !== undefined
          ? params.signingBonus.trim()
            ? parseValue(params.signingBonus)
            : undefined
          : currentContract.contractDetails?.signingBonus;

      const parsedAgentFee =
        params.agentFee !== undefined
          ? params.agentFee.trim()
            ? parseValue(params.agentFee)
            : undefined
          : currentContract.contractDetails?.agentFee;

      if (parsedSalary !== undefined) {
        currentContract.salary = parsedSalary;
        if (isLatestActiveContract) {
          finalPlayer.salary = parsedSalary;
        }
      }

      if (parsedDuration !== undefined) {
        currentContract.contractTime = parsedDuration;
        if (isLatestActiveContract) {
          finalPlayer.contractTime = parsedDuration;
        }
      }

      if (params.contractUntil !== undefined) {
        if (params.contractUntil.trim()) {
          currentContract.contractUntil = params.contractUntil.trim();
          if (isLatestActiveContract) {
            finalPlayer.contractUntil = params.contractUntil.trim();
          }
        } else {
          delete currentContract.contractUntil;
          if (isLatestActiveContract) {
            delete finalPlayer.contractUntil;
          }
        }
      }

      if (params.signingBonus !== undefined) {
        if (params.signingBonus.trim()) {
          currentContract.signingBonus = params.signingBonus.trim();
        } else {
          delete currentContract.signingBonus;
        }
      }

      const prevDetails: Partial<ContractDetails> =
        currentContract.contractDetails || {};
      const newDetails: ContractDetails = {
        ...prevDetails,
        weeklyWage:
          parsedSalary ??
          (typeof currentContract.salary === "number"
            ? currentContract.salary
            : parseValue(String(currentContract.salary || "0"))),
        durationYears:
          parsedDuration ??
          (typeof currentContract.contractTime === "number"
            ? currentContract.contractTime
            : Number(currentContract.contractTime) || 1),
        squadRole:
          (params.squadRole as SquadRole) ||
          prevDetails.squadRole ||
          finalPlayer.squadRole ||
          "Rodízio",
      };
      if (parsedSigningBonus !== undefined) {
        newDetails.signingBonus = parsedSigningBonus;
      } else {
        delete newDetails.signingBonus;
      }

      if (parsedAgentFee !== undefined) {
        newDetails.agentFee = parsedAgentFee;
      } else {
        delete newDetails.agentFee;
      }

      if (params.contractDetails?.releaseClause !== undefined) {
        newDetails.releaseClause = params.contractDetails.releaseClause;
      }
      if (params.contractDetails?.wageAdjustment !== undefined) {
        newDetails.wageAdjustment = params.contractDetails.wageAdjustment;
      }
      if (params.contractDetails?.performanceBonuses !== undefined) {
        newDetails.performanceBonuses =
          params.contractDetails.performanceBonuses;
      }
      if (params.releaseClause !== undefined) {
        const parsedRel = parseValue(params.releaseClause);
        if (parsedRel > 0) {
          newDetails.releaseClause = parsedRel;
          currentContract.releaseClause = params.releaseClause;
        } else {
          delete newDetails.releaseClause;
          delete currentContract.releaseClause;
        }
      }
      if ("wageAdjustment" in params) {
        if (params.wageAdjustment) {
          newDetails.wageAdjustment = params.wageAdjustment;
        } else {
          delete newDetails.wageAdjustment;
        }
      }
      if (newDetails.releaseClause || newDetails.wageAdjustment) {
        currentContract.contractClauses = {
          ...(newDetails.releaseClause
            ? { releaseClause: newDetails.releaseClause }
            : {}),
          ...(newDetails.wageAdjustment
            ? { wageAdjustment: newDetails.wageAdjustment }
            : {}),
        };
      } else if ("releaseClause" in params || "wageAdjustment" in params) {
        delete currentContract.contractClauses;
      }

      currentContract.contractDetails = newDetails;
      if (isLatestActiveContract) {
        finalPlayer.contractDetails = newDetails;
      }
    } else if (direction === "arrivals" && transferType === "Empréstimo") {
      const rawFullSalary =
        params.salary !== undefined && String(params.salary).trim() !== ""
          ? parseValue(String(params.salary))
          : (currentContract.fullSalary ?? finalPlayer.salary ?? 0);

      const wagePct = Number(
        params.wagePercentage ?? currentContract.wagePercentage ?? 100,
      );
      const effectiveWeeklyWage = Math.round(rawFullSalary * (wagePct / 100));
      const parsedLoanDuration =
        parseLoanDuration(params.loanDuration ?? loanDuration) ??
        currentContract.loanDuration ??
        1;

      const buyOptStr =
        params.buyOption !== undefined
          ? params.buyOption
          : params.buyOptionValue;
      const parsedBuyOpt =
        buyOptStr !== undefined
          ? buyOptStr.trim()
            ? parseValue(buyOptStr)
            : 0
          : currentContract.buyOptionValue ||
            currentContract.loanTerms?.buyOptionFee ||
            0;

      currentContract.fullSalary = rawFullSalary;
      currentContract.salary = effectiveWeeklyWage;
      currentContract.contractTime = parsedLoanDuration;
      currentContract.loanDuration = parsedLoanDuration;
      currentContract.wagePercentage = wagePct;
      if (parsedBuyOpt > 0) {
        currentContract.buyOptionValue = parsedBuyOpt;
      } else {
        delete currentContract.buyOptionValue;
      }

      const hasBuyOptFinal = params.loanTerms
        ? Boolean(params.loanTerms.hasBuyOption)
        : parsedBuyOpt > 0;
      const prevLoanTerms = params.loanTerms ||
        currentContract.loanTerms || {
          durationYears: parsedLoanDuration,
          ourWagePercentage: wagePct,
          theirWagePercentage: 100 - wagePct,
          hasBuyOption: hasBuyOptFinal,
          partnerClub: clubName || currentContract.fromClub || "",
        };
      const finalSellOn = hasBuyOptFinal
        ? (params.loanTerms?.sellOnPercentage ?? prevLoanTerms.sellOnPercentage)
        : undefined;

      const existingExercisedPurchaseIdx = contracts.findIndex(
        (c, i) =>
          i !== idx &&
          !c.isLoan &&
          Boolean(
            c.fromLoanBuyOption ||
            c.buyOptionFinalized ||
            c.sourceLoanContractIndex !== undefined,
          ),
      );
      effectiveBuyOpt = parsedBuyOpt;
      effectiveSellOn = finalSellOn;
      effectiveExercisedPurchaseIdx = existingExercisedPurchaseIdx;
      const wasAlreadyExercised =
        Boolean(currentContract.loanTerms?.buyOptionExercised) ||
        existingExercisedPurchaseIdx !== -1;

      currentContract.loanTerms = {
        ...prevLoanTerms,
        durationYears: parsedLoanDuration,
        ourWagePercentage: wagePct,
        theirWagePercentage: 100 - wagePct,
        hasBuyOption: hasBuyOptFinal,
        buyOptionFee:
          hasBuyOptFinal && parsedBuyOpt > 0 ? parsedBuyOpt : undefined,
        ...(finalSellOn !== undefined && finalSellOn > 0
          ? { sellOnPercentage: finalSellOn }
          : {}),
        ...(wasAlreadyExercised
          ? {
              buyOptionExercised: true,
              buyOptionFinalized:
                currentContract.loanTerms?.buyOptionFinalized ||
                currentContract.buyOptionFinalized,
              exercisedDate: currentContract.loanTerms?.exercisedDate,
            }
          : {}),
      };

      if (hasBuyOptFinal && parsedBuyOpt > 0) {
        currentContract.buyOptionValue = parsedBuyOpt;
        if (existingExercisedPurchaseIdx !== -1) {
          const prevPurchase = contracts[existingExercisedPurchaseIdx];
          const nextPurchaseClauses = {
            ...(prevPurchase.transferClauses || {}),
          };
          if (finalSellOn && finalSellOn > 0) {
            nextPurchaseClauses.sellOnPercentage = finalSellOn;
          } else {
            delete nextPurchaseClauses.sellOnPercentage;
          }

          contracts[existingExercisedPurchaseIdx] = {
            ...prevPurchase,
            fromClub: clubName || currentContract.fromClub,
            buyValue: parsedBuyOpt,
            fromLoanBuyOption: true,
            dataArrival:
              prevPurchase.dataArrival ||
              currentContract.dataArrival ||
              new Date(),
            transferClauses:
              Object.keys(nextPurchaseClauses).length > 0
                ? nextPurchaseClauses
                : undefined,
          };

          if (finalPlayer.buy) {
            finalPlayer.playerValue = parsedBuyOpt;
          }
        }
      } else {
        delete currentContract.buyOptionValue;
        delete currentContract.loanTerms.buyOptionFee;
        delete currentContract.loanTerms.sellOnPercentage;
        if (existingExercisedPurchaseIdx !== -1) {
          contracts.splice(existingExercisedPurchaseIdx, 1);
          if (existingExercisedPurchaseIdx < idx) {
            idx--;
          }
        }
      }

      const prevDetails: Partial<ContractDetails> =
        currentContract.contractDetails || {};
      const newDetails: ContractDetails = {
        ...prevDetails,
        weeklyWage: effectiveWeeklyWage,
        durationYears: parsedLoanDuration,
        squadRole:
          (params.squadRole as SquadRole) ||
          prevDetails.squadRole ||
          finalPlayer.squadRole ||
          "Rodízio",
      };
      currentContract.contractDetails = newDetails;

      if (isLatestActiveContract) {
        finalPlayer.salary = effectiveWeeklyWage;
        finalPlayer.contractTime = parsedLoanDuration;
        delete finalPlayer.contractUntil;
        finalPlayer.contractDetails = newDetails;
      }
    } else if (direction === "exit" && transferType === "Venda") {
      if (params.salary !== undefined && String(params.salary).trim() !== "") {
        currentContract.salary = parseValue(String(params.salary));
      }
      if (
        params.contractTime !== undefined &&
        String(params.contractTime).trim() !== ""
      ) {
        currentContract.contractTime = Number(params.contractTime);
      }
    }

    if (
      transferType !== "Emprestar" &&
      transferType !== "Empréstimo" &&
      params.loanTerms
    )
      currentContract.loanTerms = params.loanTerms;
    if (params.contractDetails) {
      validateContractDetails(params.contractDetails);
      currentContract.contractDetails = params.contractDetails;
      finalPlayer.contractDetails = params.contractDetails;
    }
    if (params.squadRole) {
      finalPlayer.squadRole = params.squadRole as SquadRole;
    }

    if (isPastSeasonContract) {
      finalPlayer.buy = player.buy;
      finalPlayer.sell = player.sell;
      finalPlayer.loan = player.loan;
      finalPlayer.incomingLoan = player.incomingLoan;
      if (player.shirtNumber !== undefined && finalPlayer.shirtNumber === "") {
        finalPlayer.shirtNumber = player.shirtNumber;
      }
    }

    contracts[idx] = currentContract;
    finalPlayer.contract = contracts;

    if (clubName && !specialClubs.includes(clubName.trim())) {
      const teamExists = seasonToUpdate.teams?.some(
        (t) => t.name.toLowerCase() === clubName.trim().toLowerCase(),
      );
      if (!teamExists) {
        await ServiceMatches.addTeamToSeason(careerId, seasonId, {
          name: clubName.trim(),
          showMatch: false,
        });
        if (!seasonToUpdate.teams) seasonToUpdate.teams = [];
        seasonToUpdate.teams.push({ name: clubName.trim(), showMatch: false });
      }
    }

    await setDoc(playerRef, sanitizeFirestoreData(finalPlayer));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    Object.assign(player, finalPlayer);

    // Sincronizar lançamento financeiro de transferência (apenas para transferências da temporada vigente)
    if (!isPastSeasonContract) {
    try {
      if (direction === "exit") {
        const entryId = `transfer_sell_${playerId}_${idx}`;
        if (transferType === "Venda" && !isSpecialExit) {
          const sellVal = parseValue(transferValue || "0");
          const upfront = currentContract.installments
            ? currentContract.installments.upfrontValue
            : sellVal;
          const isNextWin = isNextWindowTiming(currentContract.timing);
          const isNextSeason = isNextSeasonTiming(currentContract.timing);
          const hasLeftOrOpen =
            !isNextSeason &&
            (!isNextWin ||
              finalPlayer.sell === true ||
              shouldPlayerLeaveOnNextWindow(
                seasonToUpdate.matches || [],
                date,
              ));

          if (upfront > 0 && hasLeftOrOpen) {
            await ServiceFinance.addEntry(careerId, seasonId, {
              id: entryId,
              type: "revenue",
              category: "Transferências (vendas de atletas)",
              amount: Math.round(upfront),
              date,
              description: `Venda de ${finalPlayer.name} (${clubName || currentContract.leftClub || "Clube"})`,
              isAutomatic: true,
              source: "transfer",
              sourceId: playerId,
              contractIndex: idx,
              transferDirection: "exit",
            });
          } else {
            try {
              await ServiceFinance.deleteEntry(careerId, seasonId, entryId);
            } catch {
              // ignora erro ao deletar lançamento inexistente
            }
          }
        } else {
          try {
            await ServiceFinance.deleteEntry(careerId, seasonId, entryId);
          } catch {
            // ignora erro ao deletar lançamento inexistente
          }
        }
      } else if (direction === "arrivals") {
        const entryId = `transfer_buy_${playerId}_${idx}`;
        if (transferType === "Compra" && !isSpecialArrival) {
          const buyVal = parseValue(transferValue || "0");
          const upfront = currentContract.installments
            ? currentContract.installments.upfrontValue
            : buyVal;
          const isNextWin = isNextWindowTiming(currentContract.timing);
          const isNextSeason = isNextSeasonTiming(currentContract.timing);
          const hasArrivedOrOpen =
            !isNextSeason &&
            (!isNextWin ||
              shouldPlayerLeaveOnNextWindow(
                seasonToUpdate.matches || [],
                date,
              ));

          if (upfront > 0 && hasArrivedOrOpen) {
            await ServiceFinance.addEntry(careerId, seasonId, {
              id: entryId,
              type: "expense",
              category: "Transferências (compras de atletas)",
              amount: Math.round(upfront),
              date,
              description: `Compra de ${finalPlayer.name} (${clubName || currentContract.fromClub || "Clube"})`,
              isAutomatic: true,
              source: "transfer",
              sourceId: playerId,
              contractIndex: idx,
              transferDirection: "arrivals",
            });
          } else {
            try {
              await ServiceFinance.deleteEntry(careerId, seasonId, entryId);
            } catch {
              // ignora erro ao deletar lançamento inexistente
            }
          }
        } else {
          try {
            await ServiceFinance.deleteEntry(careerId, seasonId, entryId);
          } catch {
            // ignora erro ao deletar lançamento inexistente
          }
        }
      }

      // Sincronizar lançamento financeiro de compra/venda derivada da opção de compra já exercida
      if (effectiveExercisedPurchaseIdx !== -1 && (effectiveBuyOpt ?? 0) > 0) {
        const purchaseEntryId = `transfer_buy_${playerId}_${effectiveExercisedPurchaseIdx}`;
        try {
          await ServiceFinance.addEntry(careerId, seasonId, {
            id: purchaseEntryId,
            type: "expense",
            category: "Transferências (compras de atletas)",
            amount: Math.round(effectiveBuyOpt!),
            date,
            description: `Compra (Opção de Compra) de ${finalPlayer.name} (${clubName || currentContract.fromClub || "Clube"})`,
            isAutomatic: true,
            source: "transfer",
            sourceId: playerId,
            contractIndex: effectiveExercisedPurchaseIdx,
            transferDirection: "arrivals",
          });
        } catch {
          // Silent catch if financial entry fails or during test environments
        }
      } else if (
        effectiveExercisedSaleIdx !== -1 &&
        (effectiveBuyOpt ?? 0) > 0
      ) {
        const saleEntryId = `transfer_sell_${playerId}_${effectiveExercisedSaleIdx}`;
        try {
          await ServiceFinance.addEntry(careerId, seasonId, {
            id: saleEntryId,
            type: "revenue",
            category: "Transferências (vendas de atletas)",
            amount: Math.round(effectiveBuyOpt!),
            date,
            description: `Venda (Opção de Compra) de ${finalPlayer.name} (${clubName || currentContract.leftClub || "Clube"})`,
            isAutomatic: true,
            source: "transfer",
            sourceId: playerId,
            contractIndex: effectiveExercisedSaleIdx,
            transferDirection: "exit",
          });
        } catch {
          // Silent catch if financial entry fails or during test environments
        }
      }

      if (direction === "arrivals" || isSpecialArrival) {
        const effectiveSigningBonus =
          currentContract.contractDetails?.signingBonus !== undefined
            ? currentContract.contractDetails.signingBonus
            : typeof currentContract.signingBonus === "number"
              ? currentContract.signingBonus
              : Number(currentContract.signingBonus) || 0;
        await clauseSettlementService
          .syncSigningBonusTransaction(
            careerId,
            seasonId,
            playerId,
            idx,
            finalPlayer.name,
            effectiveSigningBonus,
            date,
          )
          .catch(() => {});

        const effectiveAgentFee =
          currentContract.contractDetails?.agentFee !== undefined
            ? currentContract.contractDetails.agentFee
            : (currentContract as { agentFee?: number | string }).agentFee !==
                undefined
              ? Number(
                  (currentContract as { agentFee?: number | string }).agentFee,
                ) || 0
              : 0;
        await clauseSettlementService
          .syncAgentFeeTransaction(
            careerId,
            seasonId,
            playerId,
            idx,
            finalPlayer.name,
            effectiveAgentFee,
            date,
          )
          .catch(() => {});
      }
    } catch (err) {
      console.warn("Erro ao sincronizar lançamento financeiro na edição:", err);
    }
    }

    // Sincronizar proposals no Firestore para o atleta quando opção de compra ou taxa de revenda for editada
    if (
      transferType === "Emprestar" ||
      transferType === "Empréstimo" ||
      (direction === "arrivals" && currentContract.isLoan)
    ) {
      try {
        const allProposals =
          (await ServiceProposals.getProposalsBySeason(careerId, seasonId)) ||
          [];
        const playerProposals = allProposals.filter(
          (p) => p.playerId === playerId,
        );

        for (const prop of playerProposals) {
          if (direction === "arrivals") {
            const isBuyOptionProposal =
              Boolean(prop.originLoanBuyOption) ||
              (prop.type === "compra" &&
                (prop.originLoanBuyOption ||
                  prop.clubNegotiation?.partnerClub ===
                    (clubName || currentContract.fromClub)));

            const isArrivalLoanProposal = prop.type === "emprestimo_entrada";

            if (isBuyOptionProposal) {
              const updatedClubNeg: Record<string, unknown> = {
                ...(prop.clubNegotiation || {}),
                transferFee: effectiveBuyOpt ?? 0,
                partnerClub:
                  clubName ||
                  currentContract.fromClub ||
                  prop.clubNegotiation?.partnerClub ||
                  "",
              };
              if (effectiveSellOn !== undefined && effectiveSellOn > 0) {
                updatedClubNeg.sellOnPercentage = effectiveSellOn;
              } else {
                delete updatedClubNeg.sellOnPercentage;
              }

              await ServiceProposals.updateProposal(
                careerId,
                seasonId,
                prop.id,
                {
                  clubNegotiation:
                    updatedClubNeg as unknown as import("../../../interfaces/proposals/transferProposal").ClubNegotiationStage,
                  playerValue:
                    (effectiveBuyOpt ?? 0) > 0
                      ? effectiveBuyOpt
                      : prop.playerValue,
                  originLoanBuyOption: true,
                },
              );
            }

            if (isArrivalLoanProposal) {
              const updatedLoanTerms: Record<string, unknown> = {
                ...(prop.clubNegotiation?.loanTerms || {}),
                hasBuyOption: Boolean(effectiveBuyOpt && effectiveBuyOpt > 0),
                ...(effectiveBuyOpt && effectiveBuyOpt > 0
                  ? { buyOptionFee: effectiveBuyOpt }
                  : {}),
                ...(effectiveSellOn !== undefined && effectiveSellOn > 0
                  ? { sellOnPercentage: effectiveSellOn }
                  : {}),
              };
              if (!effectiveBuyOpt || effectiveBuyOpt <= 0) {
                delete updatedLoanTerms.buyOptionFee;
              }
              if (!effectiveSellOn || effectiveSellOn <= 0) {
                delete updatedLoanTerms.sellOnPercentage;
              }

              await ServiceProposals.updateProposal(
                careerId,
                seasonId,
                prop.id,
                {
                  clubNegotiation: {
                    ...(prop.clubNegotiation || {}),
                    status: prop.clubNegotiation?.status || "em_negociacao",
                    partnerClub: prop.clubNegotiation?.partnerClub || "",
                    loanTerms:
                      updatedLoanTerms as unknown as import("../../../interfaces/playersInfo/transferTerms").LoanTerms,
                  },
                },
              );
            }
          } else if (direction === "exit") {
            const isSaleOptionProposal =
              Boolean(prop.originLoanBuyOption) ||
              (prop.type === "venda" &&
                (prop.originLoanBuyOption ||
                  prop.clubNegotiation?.partnerClub ===
                    (clubName || currentContract.leftClub)));

            const isExitLoanProposal = prop.type === "emprestimo_saida";

            if (isSaleOptionProposal) {
              const updatedClubNeg: Record<string, unknown> = {
                ...(prop.clubNegotiation || {}),
                transferFee: effectiveBuyOpt ?? 0,
                partnerClub:
                  clubName ||
                  currentContract.leftClub ||
                  prop.clubNegotiation?.partnerClub ||
                  "",
              };
              if (effectiveSellOn !== undefined && effectiveSellOn > 0) {
                updatedClubNeg.sellOnPercentage = effectiveSellOn;
              } else {
                delete updatedClubNeg.sellOnPercentage;
              }

              await ServiceProposals.updateProposal(
                careerId,
                seasonId,
                prop.id,
                {
                  clubNegotiation:
                    updatedClubNeg as unknown as import("../../../interfaces/proposals/transferProposal").ClubNegotiationStage,
                  playerValue:
                    (effectiveBuyOpt ?? 0) > 0
                      ? effectiveBuyOpt
                      : prop.playerValue,
                  originLoanBuyOption: true,
                },
              );
            }

            if (isExitLoanProposal) {
              const updatedLoanTerms: Record<string, unknown> = {
                ...(prop.clubNegotiation?.loanTerms || {}),
                hasBuyOption: Boolean(effectiveBuyOpt && effectiveBuyOpt > 0),
                ...(effectiveBuyOpt && effectiveBuyOpt > 0
                  ? { buyOptionFee: effectiveBuyOpt }
                  : {}),
                ...(effectiveSellOn !== undefined && effectiveSellOn > 0
                  ? { sellOnPercentage: effectiveSellOn }
                  : {}),
              };
              if (!effectiveBuyOpt || effectiveBuyOpt <= 0) {
                delete updatedLoanTerms.buyOptionFee;
              }
              if (!effectiveSellOn || effectiveSellOn <= 0) {
                delete updatedLoanTerms.sellOnPercentage;
              }

              await ServiceProposals.updateProposal(
                careerId,
                seasonId,
                prop.id,
                {
                  clubNegotiation: {
                    ...(prop.clubNegotiation || {}),
                    status: prop.clubNegotiation?.status || "em_negociacao",
                    partnerClub: prop.clubNegotiation?.partnerClub || "",
                    loanTerms:
                      updatedLoanTerms as unknown as import("../../../interfaces/playersInfo/transferTerms").LoanTerms,
                  },
                },
              );
            }
          }
        }
      } catch (propErr) {
        console.warn(
          "Aviso ao sincronizar propostas com a nova opção de compra/revenda:",
          propErr,
        );
      }
    }
  },

  revertTransferInSeason: async (
    params: RevertTransferParams,
  ): Promise<void> => {
    const { careerId, seasonId, playerId, contractIndex, direction } = params;

    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    if (!seasonToUpdate) throw new Error("Dados não encontrados");

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    let player = seasonToUpdate.players?.find((p) => p.id === playerId);
    try {
      const modernSnap = await getDoc(playerRef);
      if (modernSnap.exists()) {
        player = modernSnap.data() as Players;
      }
    } catch {
      // Fallback defensivo
    }

    if (!player) throw new Error("Dados não encontrados");

    const contracts = player.contract ? [...player.contract] : [];
    let idx = contractIndex;
    if (idx < 0 || idx >= contracts.length) {
      idx = contracts.findIndex((c) =>
        direction === "exit"
          ? Boolean(c.dataExit || c.leftClub)
          : Boolean(c.dataArrival || c.fromClub),
      );
      if (idx < 0) idx = Math.max(0, contracts.length - 1);
    }

    const currentContract = contracts[idx];
    if (!currentContract) throw new Error("Contrato não encontrado");

    const wasLoanContract = Boolean(currentContract.isLoan);
    const wasFromLoanBuyOption = Boolean(currentContract.fromLoanBuyOption);
    const savedLeftClub = currentContract.leftClub;
    const savedFromClub = currentContract.fromClub;
    const savedSellValue = currentContract.sellValue;
    const savedBuyValue = currentContract.buyValue;
    const savedTiming = currentContract.timing;
    const savedLoanDuration = currentContract.loanDuration;
    const savedWagePercentage = currentContract.wagePercentage;
    const savedBuyOptionValue = currentContract.buyOptionValue;
    const savedLoanTerms = currentContract.loanTerms
      ? { ...currentContract.loanTerms }
      : undefined;
    const savedInstallments = currentContract.installments
      ? { ...currentContract.installments }
      : undefined;
    const savedTransferClauses = currentContract.transferClauses
      ? { ...currentContract.transferClauses }
      : undefined;
    const savedBonuses = currentContract.bonuses
      ? [...currentContract.bonuses]
      : undefined;
    const savedSwapPlayer = currentContract.swapPlayer
      ? { ...currentContract.swapPlayer }
      : undefined;
    const savedContractDetails = currentContract.contractDetails
      ? { ...currentContract.contractDetails }
      : undefined;

    if (direction === "arrivals" && currentContract.fromClub === "Base") {
      throw new Error(
        "Transferências promovidas da base não podem ser revertidas.",
      );
    }

    if (direction === "exit") {
      const isIncomingReturn = checkIsIncomingLoanExit(
        player,
        currentContract,
        "exit",
      );

      // Apagar jogador recebido na troca, caso exista
      const swapPlayerName = currentContract.swapPlayer?.playerName;
      const swapPlayerId = currentContract.swapPlayer?.playerId;
      const swappedPlayerToDelete = seasonToUpdate.players?.find(
        (p) =>
          (swapPlayerId && p.id === swapPlayerId) ||
          p.contract?.some((c) => c.swapPlayer?.playerId === player.id) ||
          (swapPlayerName && p.name === swapPlayerName && p.buy),
      );

      if (swappedPlayerToDelete) {
        const swapRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
          swappedPlayerToDelete.id,
        );
        await deleteDoc(swapRef);
        seasonToUpdate.players = seasonToUpdate.players.filter(
          (p) => p.id !== swappedPlayerToDelete.id,
        );
      }

      // Remover contrato de loan-back adicional gerado pela venda, se houver
      if (
        contracts[idx + 1]?.isLoan &&
        contracts[idx + 1]?.fromClub === currentContract.leftClub
      ) {
        contracts.splice(idx + 1, 1);
      }

      // Remover contrato derivado de exercício de opção de compra, caso exista
      const derivedSaleIdx = contracts.findIndex(
        (c) =>
          c.fromLoanBuyOption &&
          (c.sourceLoanContractIndex === idx ||
            c.sourceLoanContractIndex === undefined),
      );
      if (derivedSaleIdx !== -1) {
        contracts.splice(derivedSaleIdx, 1);
        if (derivedSaleIdx < idx) {
          idx--;
        }
      }

      if (isIncomingReturn) {
        currentContract.leftClub = "";
        currentContract.dataExit = null;
        currentContract.sellValue = 0;
        currentContract.isLoan = true;
        player.sell = false;
        player.loan = false;
        player.incomingLoan = true;
      } else {
        player.sell = false;
        player.loan = false;
        player.incomingLoan = false;

        delete currentContract.installments;
        delete currentContract.transferClauses;
        delete currentContract.bonuses;
        delete currentContract.swapPlayer;
        delete currentContract.timing;
        delete currentContract.loanTerms;
        delete currentContract.contractDetails;

        if (currentContract.dataArrival || currentContract.fromClub) {
          currentContract.leftClub = "";
          currentContract.dataExit = null;
          currentContract.sellValue = 0;
          currentContract.isLoan = false;
          delete currentContract.loanDuration;
          delete currentContract.wagePercentage;
          delete currentContract.buyOptionValue;
        } else {
          if (contracts.length > 1) {
            contracts.splice(idx, 1);
          } else {
            currentContract.leftClub = "";
            currentContract.dataExit = null;
            currentContract.sellValue = 0;
            currentContract.isLoan = false;
            delete currentContract.loanDuration;
            delete currentContract.wagePercentage;
            delete currentContract.buyOptionValue;
          }
        }
      }

      player.contract = contracts;

      const playerRef = doc(
        db,
        `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
        playerId,
      );
      await setDoc(playerRef, sanitizeFirestoreData(player));
      await updateCareerFirestore(user.uid, careerId, {
        updatedAt: Date.now(),
      });
      const targetInSeason = seasonToUpdate.players.find(
        (p) => p.id === playerId,
      );
      if (targetInSeason) Object.assign(targetInSeason, player);
    } else {
      // Arrivals
      if (contracts.length <= 1) {
        const isLoanReturn = checkIsLoanReturnArrival(
          player,
          currentContract,
          idx,
          career,
          seasonToUpdate.seasonNumber,
        );
        if (isLoanReturn || currentContract.fromClub === "Fim de Empréstimo") {
          currentContract.fromClub = "";
          currentContract.dataArrival = null;
          player.loan = true;
          player.sell = false;
          player.buy = false;
          const playerRef = doc(
            db,
            `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
            playerId,
          );
          await setDoc(playerRef, sanitizeFirestoreData(player));
          await updateCareerFirestore(user.uid, careerId, {
            updatedAt: Date.now(),
          });
          const targetInSeason = seasonToUpdate.players.find(
            (p) => p.id === playerId,
          );
          if (targetInSeason) Object.assign(targetInSeason, player);
        } else {
          const playerRef = doc(
            db,
            `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
            playerId,
          );
          await deleteDoc(playerRef);
          seasonToUpdate.players = seasonToUpdate.players.filter(
            (p) => p.id !== playerId,
          );

          // Se a compra envolveu um atleta do clube na troca, restaurar o atleta no elenco
          const swapPlayerId = currentContract.swapPlayer?.playerId;
          const swapPlayerName = currentContract.swapPlayer?.playerName;
          if (swapPlayerId || swapPlayerName) {
            const swappedInClub = seasonToUpdate.players.find(
              (p) =>
                (swapPlayerId && p.id === swapPlayerId) ||
                (swapPlayerName &&
                  p.name.trim().toLowerCase() ===
                    swapPlayerName.trim().toLowerCase()),
            );
            if (swappedInClub && swappedInClub.sell) {
              swappedInClub.sell = false;
              swappedInClub.contract = (swappedInClub.contract || []).filter(
                (c) => !(c.sellValue === 0 && (c.leftClub || c.swapPlayer)),
              );
              const swappedRef = doc(
                db,
                `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
                swappedInClub.id,
              );
              await setDoc(swappedRef, sanitizeFirestoreData(swappedInClub));
            }
          }

          await updateCareerFirestore(user.uid, careerId, {
            updatedAt: Date.now(),
          });
        }
      } else {
        const removed = contracts.splice(idx, 1)[0];
        const isFromLoanBuy = Boolean(
          removed?.fromLoanBuyOption ||
          (!removed?.isLoan &&
            contracts.some(
              (c) =>
                c.isLoan &&
                (c.loanTerms?.buyOptionExercised ||
                  c.loanTerms?.hasBuyOption ||
                  Boolean(c.buyOptionValue)),
            )),
        );
        if (isFromLoanBuy) {
          const loanContract = contracts.find(
            (c) => c.isLoan && (c.loanTerms || c.buyOptionValue),
          );
          if (loanContract?.loanTerms) {
            loanContract.loanTerms.buyOptionExercised = false;
            delete loanContract.loanTerms.exercisedDate;
          }
        }

        player.contract = contracts;
        const prev = contracts[contracts.length - 1];
        if (prev?.leftClub && !prev?.isLoan) {
          player.sell = true;
          player.buy = false;
          player.incomingLoan = false;
          player.loan = false;
        } else if (prev?.isLoan && prev?.leftClub) {
          player.loan = true;
          player.sell = false;
          player.buy = false;
          player.incomingLoan = false;
        } else if (prev?.isLoan && (prev?.fromClub || !prev?.leftClub)) {
          player.incomingLoan = true;
          player.buy = false;
          player.loan = false;
          player.sell = false;
        }
        const playerRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
          playerId,
        );
        await setDoc(playerRef, sanitizeFirestoreData(player));
        await updateCareerFirestore(user.uid, careerId, {
          updatedAt: Date.now(),
        });
        const targetInSeason = seasonToUpdate.players.find(
          (p) => p.id === playerId,
        );
        if (targetInSeason) Object.assign(targetInSeason, player);
      }
    }

    try {
      const proposals =
        (await ServiceProposals.getProposalsBySeason(careerId, seasonId)) || [];
      const normalizedPlayerName = (player.name || "").trim().toLowerCase();
      const relevant = proposals.filter((p) => {
        const matchesId =
          Boolean(p.playerId) &&
          (p.playerId === playerId || p.playerId === player.id);
        const matchesName = Boolean(
          normalizedPlayerName &&
          p.playerName &&
          p.playerName.trim().toLowerCase() === normalizedPlayerName,
        );
        return matchesId || matchesName;
      });

      let updatedAnyProposal = false;
      for (const prop of relevant) {
        let matchesType = false;
        if (direction === "arrivals") {
          if (wasLoanContract && !wasFromLoanBuyOption) {
            matchesType = prop.type === "emprestimo_entrada";
          } else if (
            wasFromLoanBuyOption ||
            (!wasLoanContract &&
              contracts.some(
                (c) =>
                  c.isLoan &&
                  (c.loanTerms?.buyOptionExercised ||
                    c.loanTerms?.hasBuyOption ||
                    Boolean(c.buyOptionValue)),
              ))
          ) {
            matchesType = prop.type === "compra";
          } else {
            matchesType =
              prop.type === "compra" || prop.type === "emprestimo_entrada";
          }
        } else {
          if (wasLoanContract) {
            matchesType = prop.type === "emprestimo_saida";
          } else {
            matchesType = prop.type === "venda";
          }
        }

        if (matchesType) {
          const playerBonusIds = new Set(
            (savedContractDetails?.performanceBonuses || [])
              .map((b) => b.id)
              .filter(Boolean),
          );

          const filteredContractClubBonuses = (savedBonuses || []).filter(
            (b) =>
              b.bonusOrigin !== "player" &&
              (!b.id || !playerBonusIds.has(b.id)),
          );

          const resolvedClubBonuses =
            filteredContractClubBonuses.length > 0
              ? filteredContractClubBonuses
              : (prop.clubNegotiation?.bonuses || []).filter(
                  (b) =>
                    b.bonusOrigin !== "player" &&
                    (!b.id || !playerBonusIds.has(b.id)),
                );

          const filteredContractPlayerBonuses = (savedBonuses || []).filter(
            (b) =>
              b.bonusOrigin === "player" || (b.id && playerBonusIds.has(b.id)),
          );

          const resolvedPlayerBonuses = savedContractDetails?.performanceBonuses
            ?.length
            ? savedContractDetails.performanceBonuses
            : filteredContractPlayerBonuses.length > 0
              ? filteredContractPlayerBonuses
              : prop.playerNegotiation?.performanceBonuses;

          const rawBuyVal = savedBuyValue;
          const resolvedBuyFee =
            typeof rawBuyVal === "number"
              ? rawBuyVal
              : typeof rawBuyVal === "string"
                ? parseValue(rawBuyVal) || Number(rawBuyVal) || 0
                : 0;

          const rawSellVal = savedSellValue;
          const resolvedSellFee =
            typeof rawSellVal === "number"
              ? rawSellVal
              : typeof rawSellVal === "string"
                ? parseValue(rawSellVal) || Number(rawSellVal) || 0
                : 0;

          const resolvedTransferFee =
            direction === "arrivals" ? resolvedBuyFee : resolvedSellFee;

          const feeStr =
            resolvedTransferFee > 0
              ? formatTransferValue(resolvedTransferFee)
              : typeof savedBuyValue === "string" && savedBuyValue
                ? savedBuyValue
                : typeof savedSellValue === "string" && savedSellValue
                  ? savedSellValue
                  : "";

          const latestClubNegotiation = {
            ...(prop.clubNegotiation || {}),
            status: "em_negociacao" as const,
            partnerClub:
              (direction === "arrivals" ? savedFromClub : savedLeftClub) ||
              prop.clubNegotiation?.partnerClub ||
              "",
            transferFee: resolvedTransferFee,
            installments:
              savedInstallments ?? prop.clubNegotiation?.installments,
            bonuses: resolvedClubBonuses,
            sellOnPercentage:
              savedTransferClauses?.sellOnPercentage ??
              prop.clubNegotiation?.sellOnPercentage,
            buybackValue:
              savedTransferClauses?.buybackValue ??
              prop.clubNegotiation?.buybackValue,
            firstRefusal:
              savedTransferClauses?.firstRefusal ??
              prop.clubNegotiation?.firstRefusal,
            loanBackDuration:
              savedTransferClauses?.loanBackDuration ??
              prop.clubNegotiation?.loanBackDuration,
            loanTerms: savedLoanTerms ?? prop.clubNegotiation?.loanTerms,
            swapPlayer: savedSwapPlayer ?? prop.clubNegotiation?.swapPlayer,
          };

          const latestPlayerNegotiation =
            direction === "arrivals"
              ? {
                  ...(prop.playerNegotiation || {}),
                  status: "em_negociacao" as const,
                  weeklyWage:
                    savedContractDetails?.weeklyWage ||
                    player.salary ||
                    prop.playerNegotiation?.weeklyWage ||
                    0,
                  durationYears:
                    savedContractDetails?.durationYears ||
                    player.contractTime ||
                    prop.playerNegotiation?.durationYears ||
                    1,
                  squadRole:
                    savedContractDetails?.squadRole ||
                    player.squadRole ||
                    prop.playerNegotiation?.squadRole ||
                    "Importante",
                  signingBonus:
                    savedContractDetails?.signingBonus ??
                    prop.playerNegotiation?.signingBonus,
                  releaseClause:
                    savedContractDetails?.releaseClause ??
                    prop.playerNegotiation?.releaseClause,
                  wageAdjustment:
                    savedContractDetails?.wageAdjustment ??
                    prop.playerNegotiation?.wageAdjustment,
                  performanceBonuses: resolvedPlayerBonuses,
                }
              : undefined;

          const resolvedOverall = player.overall || prop.playerOverall;
          const resolvedBirthDate = player.birthDate || prop.playerBirthDate;
          const resolvedShirtNumber = player.shirtNumber || prop.shirtNumber;
          const resolvedHeight = player.height || prop.height;
          const resolvedWeight = player.weight || prop.weight;
          const resolvedAge = player.age || prop.playerAge;
          const resolvedValue = player.playerValue || prop.playerValue;
          const resolvedNation = player.nation || prop.playerNation;
          const resolvedPosition = player.position || prop.playerPosition;
          const resolvedSector = player.sector || prop.playerSector;

          const partialUpdate: Partial<
            import("../../../interfaces/proposals/transferProposal").TransferProposal
          > = {
            overallStatus: "em_andamento",
            finalizedAt: undefined,
            playerOverall: resolvedOverall,
            playerBirthDate: resolvedBirthDate,
            shirtNumber: resolvedShirtNumber,
            height: resolvedHeight,
            weight: resolvedWeight,
            playerAge: resolvedAge,
            playerValue: resolvedValue,
            playerNation: resolvedNation,
            playerPosition: resolvedPosition,
            playerSector: resolvedSector,
            clubNegotiation: latestClubNegotiation,
            playerNegotiation: latestPlayerNegotiation,
            timing:
              (savedTiming as TransferTiming) || prop.timing || "Imediata",
            formState: {
              formValues: {
                ...(prop.formState?.formValues || {}),
                playerName: player.name || prop.playerName || "",
                nation: resolvedNation || "",
                position: resolvedPosition || "",
                sector: resolvedSector || "",
                overall: resolvedOverall ? String(resolvedOverall) : "",
                age: resolvedAge ? String(resolvedAge) : "",
                birthDate: resolvedBirthDate || "",
                shirtNumber: resolvedShirtNumber || "",
                height: resolvedHeight || "",
                weight: resolvedWeight || "",
                playerValue: resolvedValue
                  ? formatTransferValue(resolvedValue)
                  : "",
                buyValue: feeStr || prop.formState?.formValues?.buyValue || "",
                transferFee:
                  feeStr || prop.formState?.formValues?.transferFee || "",
                sellValue:
                  feeStr || prop.formState?.formValues?.sellValue || "",
                fromClub:
                  (direction === "arrivals" ? savedFromClub : "") ||
                  prop.clubNegotiation?.partnerClub ||
                  "",
                toClub:
                  (direction === "exit" ? savedLeftClub : "") ||
                  prop.clubNegotiation?.partnerClub ||
                  "",
                timing: (savedTiming as string) || prop.timing || "Imediata",
                loanDuration:
                  (savedLoanDuration ? String(savedLoanDuration) : "") ||
                  prop.formState?.formValues?.loanDuration ||
                  "",
                wagePercentage:
                  (savedWagePercentage ? String(savedWagePercentage) : "") ||
                  prop.formState?.formValues?.wagePercentage ||
                  "",
              },
              booleanValues: {
                ...(prop.formState?.booleanValues || {}),
                isCaptain: Boolean(player.captain),
                hasBuyOption: Boolean(
                  savedLoanTerms?.hasBuyOption || savedBuyOptionValue,
                ),
              },
            },
          };

          await ServiceProposals.updateProposal(
            careerId,
            seasonId,
            prop.id,
            partialUpdate,
          );
          updatedAnyProposal = true;
          break;
        }
      }

      if (!updatedAnyProposal) {
        const propType: import("../../../interfaces/proposals/transferProposal").ProposalType =
          direction === "arrivals"
            ? wasLoanContract
              ? "emprestimo_entrada"
              : "compra"
            : wasLoanContract
              ? "emprestimo_saida"
              : "venda";

        const rawBuyVal = savedBuyValue;
        const resolvedBuyFee =
          typeof rawBuyVal === "number"
            ? rawBuyVal
            : typeof rawBuyVal === "string"
              ? parseValue(rawBuyVal) || Number(rawBuyVal) || 0
              : 0;

        const rawSellVal = savedSellValue;
        const resolvedSellFee =
          typeof rawSellVal === "number"
            ? rawSellVal
            : typeof rawSellVal === "string"
              ? parseValue(rawSellVal) || Number(rawSellVal) || 0
              : 0;

        const resolvedTransferFee =
          direction === "arrivals" ? resolvedBuyFee : resolvedSellFee;

        const feeStr =
          resolvedTransferFee > 0
            ? formatTransferValue(resolvedTransferFee)
            : typeof savedBuyValue === "string" && savedBuyValue
              ? savedBuyValue
              : typeof savedSellValue === "string" && savedSellValue
                ? savedSellValue
                : "";

        await ServiceProposals.createProposal(careerId, seasonId, {
          careerId,
          seasonId,
          type: propType,
          overallStatus: "em_andamento",
          playerId: player.id || playerId,
          playerName: player.name || "Jogador",
          playerNation: player.nation || "",
          playerPosition: player.position || "",
          playerSector: player.sector || "",
          playerOverall: player.overall || 0,
          playerAge: player.age || 0,
          playerBirthDate: player.birthDate || "",
          shirtNumber: player.shirtNumber || "",
          height: player.height || "",
          weight: player.weight || "",
          playerValue: player.playerValue || 0,
          originLoanBuyOption: Boolean(
            wasFromLoanBuyOption ||
            (!wasLoanContract &&
              direction === "arrivals" &&
              contracts.some((c) => c.isLoan)),
          ),
          clubNegotiation: {
            status: "em_negociacao",
            partnerClub:
              direction === "arrivals"
                ? savedFromClub || ""
                : savedLeftClub || "",
            transferFee: resolvedTransferFee,
            installments: savedInstallments,
            bonuses: (savedBonuses || []).filter(
              (b) =>
                b.bonusOrigin !== "player" &&
                !savedContractDetails?.performanceBonuses?.some(
                  (pb) => pb.id && pb.id === b.id,
                ),
            ),
            sellOnPercentage: savedTransferClauses?.sellOnPercentage,
            buybackValue: savedTransferClauses?.buybackValue,
            firstRefusal: savedTransferClauses?.firstRefusal,
            loanBackDuration: savedTransferClauses?.loanBackDuration,
            loanTerms: savedLoanTerms,
            swapPlayer: savedSwapPlayer,
          },
          playerNegotiation:
            direction === "arrivals"
              ? {
                  status: "em_negociacao",
                  weeklyWage:
                    savedContractDetails?.weeklyWage || player.salary || 0,
                  durationYears:
                    savedContractDetails?.durationYears ||
                    player.contractTime ||
                    1,
                  squadRole:
                    savedContractDetails?.squadRole ||
                    player.squadRole ||
                    "Importante",
                  signingBonus: savedContractDetails?.signingBonus,
                  releaseClause: savedContractDetails?.releaseClause,
                  wageAdjustment: savedContractDetails?.wageAdjustment,
                  performanceBonuses:
                    savedContractDetails?.performanceBonuses ||
                    (savedBonuses || []).filter(
                      (b) => b.bonusOrigin === "player",
                    ),
                }
              : undefined,
          timing: (savedTiming as TransferTiming) || "Imediata",
          formState: {
            formValues: {
              playerName: player.name || "",
              nation: player.nation || "",
              position: player.position || "",
              sector: player.sector || "",
              overall: player.overall ? String(player.overall) : "",
              age: player.age ? String(player.age) : "",
              birthDate: player.birthDate || "",
              shirtNumber: player.shirtNumber || "",
              height: player.height || "",
              weight: player.weight || "",
              playerValue: player.playerValue
                ? formatTransferValue(player.playerValue)
                : "",
              buyValue: feeStr,
              transferFee: feeStr,
              sellValue: feeStr,
              fromClub: (direction === "arrivals" ? savedFromClub : "") || "",
              toClub: (direction === "exit" ? savedLeftClub : "") || "",
              timing: (savedTiming as string) || "Imediata",
            },
            booleanValues: {
              isCaptain: Boolean(player.captain),
              hasBuyOption: Boolean(
                savedLoanTerms?.hasBuyOption || savedBuyOptionValue,
              ),
            },
          },
        });
      }
    } catch (err) {
      console.warn("Erro ao sincronizar proposta na reversão:", err);
    }

    try {
      const report = await ServiceFinance.getReportBySeason(careerId, seasonId);
      const targetIds = new Set([
        direction === "exit"
          ? `transfer_sell_${playerId}_${idx}`
          : `transfer_buy_${playerId}_${idx}`,
        `signing_bonus_${playerId}_${idx}`,
        `agent_fee_${playerId}_${idx}`,
        `inst_${playerId}_${idx}_${seasonId}`,
        `sellon_${playerId}_${idx}_${seasonId}`,
      ]);
      const instPrefix = `inst_${playerId}_${idx}_${seasonId}_`;
      const toDelete = (report?.entries || []).filter(
        (e) => targetIds.has(e.id) || e.id.startsWith(instPrefix),
      );
      for (const entry of toDelete) {
        await ServiceFinance.deleteEntry(careerId, seasonId, entry.id).catch(
          () => {},
        );
      }
    } catch (err) {
      console.warn("Erro ao limpar lançamentos financeiros na reversão:", err);
    }
  },
};
