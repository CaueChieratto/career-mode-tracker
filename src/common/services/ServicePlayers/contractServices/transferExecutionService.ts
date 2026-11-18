import { doc, getDoc, setDoc } from "firebase/firestore";
import { getCareerById } from "../../../helpers/Getters";
import { updateCareerFirestore } from "../../../helpers/Setters";
import { getSeasonDateRange } from "../../../utils/GetSeasonDateRange";
import { sanitizeFirestoreData } from "../../../utils/sanitizeFirestore";
import { db } from "../../Firebase";
import { requireAuth } from "../helpers/authHelpers";
import {
  buildSellContractHistory,
  buildLoanContractHistory,
  buildReturnContractHistory,
  getContractBuyOptionFee,
  hasDefinedLoanBuyOption,
} from "../helpers/contractHelpers";
import {
  validateLoanTerms,
  validateSellOnPercentage,
} from "../../../interfaces/playersInfo/transferTerms";
import {
  shouldPlayerLeaveOnNextWindow,
  isNextSeasonTiming,
  isNextWindowTiming,
  getLoanBackEndSeasonNumber,
} from "../helpers/transferTimingHelpers";
import { parseBrasilDate } from "../../../utils/Date";
import { parseValue } from "../../../utils/FormatValue";
import { Players } from "../../../interfaces/playersInfo/players";
import { Contract } from "../../../interfaces/playersInfo/contract";
import {
  LoanTerms,
  TransferBonus,
} from "../../../interfaces/playersInfo/transferTerms";
import {
  ContractDetails,
  validateContractDetails,
} from "../../../interfaces/playersInfo/contractClauses";
import { ServiceFinance } from "../../ServiceFinance";
import { formatDisplayDate } from "../../ServiceFinance/reconciliation";
import { clauseSettlementService } from "./clauseSettlementService";
import {
  READ_ONLY_GERAL_ERROR,
  SellPlayerOptions,
  SignPlayerWithTermsParams,
} from "./types";

export const transferExecutionService = {
  sellPlayerFromSeason: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    sellValue: string,
    toClub: string,
    dateExit: string,
    options?: SellPlayerOptions,
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    // Verificar se o atleta possuía cláusula de revenda futura ativa de contratações/renovações anteriores
    const previousContracts = player.contract ? [...player.contract] : [];
    const pendingArrivalSellOnClauses: Array<{
      contractIndex: number;
      percentage: number;
      fromClub?: string;
    }> = [];

    previousContracts.forEach((c, idx) => {
      const pct =
        c.transferClauses?.sellOnPercentage || c.loanTerms?.sellOnPercentage;
      const isExit = Boolean(
        c.leftClub &&
        c.leftClub !== "Aposentou" &&
        c.leftClub !== "Aposentadoria" &&
        c.leftClub !== "Fim de Contrato",
      );
      if (pct && pct > 0 && !isExit) {
        pendingArrivalSellOnClauses.push({
          contractIndex: idx,
          percentage: pct,
          fromClub: c.fromClub,
        });
      }
    });

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const updatedContracts = buildSellContractHistory(
      player,
      sellValue,
      toClub,
      dateExit,
      startDate,
      endDate,
    );

    const lastIdx = updatedContracts.length - 1;
    if (lastIdx >= 0 && options) {
      if (options.timing) {
        updatedContracts[lastIdx].timing = options.timing;
      }
      if (options.installments) {
        updatedContracts[lastIdx].installments = options.installments;
      }
      if (options.transferClauses) {
        if (options.transferClauses.sellOnPercentage) {
          validateSellOnPercentage(options.transferClauses.sellOnPercentage);
        }
        if (options.transferClauses.loanBackDuration) {
          options.transferClauses.loanEndSeasonNumber =
            getLoanBackEndSeasonNumber(
              {
                ...updatedContracts[lastIdx],
                transferClauses: options.transferClauses,
              },
              career.createdAt,
              career.nation,
              seasonToUpdate.seasonNumber,
            );
        }
        updatedContracts[lastIdx].transferClauses = options.transferClauses;
      }
      if (options.bonuses) {
        updatedContracts[lastIdx].bonuses = options.bonuses;
      }
      if (options.swapPlayer) {
        updatedContracts[lastIdx].swapPlayer = options.swapPlayer;
      }
    }

    // Limpar cláusulas de revenda anteriores que foram liquidadas por esta venda
    for (const item of pendingArrivalSellOnClauses) {
      if (item.contractIndex === lastIdx) {
        if (!options?.transferClauses) {
          if (updatedContracts[lastIdx]?.transferClauses?.sellOnPercentage) {
            const updated = { ...updatedContracts[lastIdx].transferClauses };
            delete updated.sellOnPercentage;
            updatedContracts[lastIdx].transferClauses =
              Object.keys(updated).length > 0 ? updated : undefined;
          }
        }
      } else if (updatedContracts[item.contractIndex]) {
        if (
          updatedContracts[item.contractIndex].transferClauses?.sellOnPercentage
        ) {
          const updated = {
            ...updatedContracts[item.contractIndex].transferClauses,
          };
          delete updated.sellOnPercentage;
          updatedContracts[item.contractIndex].transferClauses =
            Object.keys(updated).length > 0 ? updated : undefined;
        }
        const targetLoanTerms = updatedContracts[item.contractIndex]?.loanTerms;
        if (targetLoanTerms?.sellOnPercentage) {
          delete targetLoanTerms.sellOnPercentage;
        }
      }
    }

    // Se esta venda liquidou uma cláusula de recompra de chegada, limpar a cláusula do contrato correspondente
    if (options?.settledBuybackContractIndex !== undefined) {
      const buybackIdx = options.settledBuybackContractIndex;
      if (updatedContracts[buybackIdx]?.transferClauses) {
        const updatedTc = { ...updatedContracts[buybackIdx].transferClauses };
        delete updatedTc.buybackValue;
        delete updatedTc.firstRefusal;
        updatedContracts[buybackIdx].transferClauses =
          Object.keys(updatedTc).length > 0 ? updatedTc : undefined;
      }
    }

    const isLoanBack = Boolean(options?.transferClauses?.loanBackDuration);

    let isSoldNow = !isLoanBack;
    let isIncomingLoanNow = isLoanBack;
    if (isNextSeasonTiming(options?.timing)) {
      isSoldNow = false;
      isIncomingLoanNow = false;
    } else if (isNextWindowTiming(options?.timing)) {
      const shouldLeave = shouldPlayerLeaveOnNextWindow(
        seasonToUpdate.matches || [],
        dateExit,
      );
      isSoldNow = shouldLeave ? !isLoanBack : false;
      isIncomingLoanNow = shouldLeave ? isLoanBack : false;
    }

    const finalPlayer = {
      ...player,
      sell: isSoldNow,
      incomingLoan: isIncomingLoanNow,
      loan: false,
      contract: updatedContracts,
      ...(isLoanBack && isIncomingLoanNow
        ? { contractTime: options!.transferClauses!.loanBackDuration }
        : {}),
    };
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, sanitizeFirestoreData(finalPlayer));

    // Se houver jogador recebido em troca atômica, cadastrá-lo no elenco
    if (
      options?.swapPlayer &&
      (options.swapPlayer.incomingSwap || options.swapPlayer.playerName)
    ) {
      const incomingId =
        options.swapPlayer.playerId ||
        `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const swapTerms = options.swapPlayerNegotiation;
      const rawSalary = swapTerms?.weeklyWage || 0;
      const duration = swapTerms?.durationYears || 0;
      const signingBonus = swapTerms?.signingBonus || 0;
      const releaseClauseNum = swapTerms?.releaseClause;

      const playerBonuses: TransferBonus[] = (
        swapTerms?.performanceBonuses || []
      ).map((b) => ({
        ...b,
        id:
          b.id ||
          `bonus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        direction: "payable",
        status: "pending",
        bonusOrigin: "player",
      }));

      const contractClauses = {
        ...(releaseClauseNum ? { releaseClause: releaseClauseNum } : {}),
        ...(swapTerms?.wageAdjustment
          ? { wageAdjustment: swapTerms.wageAdjustment }
          : {}),
      };
      const hasAnySpecial = Boolean(
        releaseClauseNum || swapTerms?.wageAdjustment,
      );

      const contractDetails: ContractDetails | undefined = swapTerms
        ? {
            weeklyWage: rawSalary,
            durationYears: duration,
            squadRole: swapTerms.squadRole || "Rodízio",
            signingBonus: signingBonus || undefined,
            agentFee: swapTerms.agentFee || undefined,
            releaseClause: releaseClauseNum || undefined,
            wageAdjustment: swapTerms.wageAdjustment || undefined,
            performanceBonuses:
              playerBonuses.length > 0 ? playerBonuses : undefined,
          }
        : undefined;

      const incomingPlayer: Players = {
        id: incomingId,
        name: options.swapPlayer.playerName,
        overall: options.swapPlayer.overall || 0,
        sector: options.swapPlayer.sector || "Meia",
        position: options.swapPlayer.position || "MC",
        age: options.swapPlayer.age || 0,
        salary: rawSalary,
        nation: "",
        shirtNumber: "",
        playerValue:
          options.swapPlayer.estimatedValue ||
          options.swapPlayer.playerValue ||
          0,
        buy: true,
        captain: false,
        sell: false,
        contractTime: duration,
        contractUntil: swapTerms?.contractUntil || undefined,
        squadRole: swapTerms?.squadRole || "Rodízio",
        contractDetails,
        ballonDor: 0,
        statsLeagues: [],
        contract: [
          {
            buyValue: 0,
            fromClub: toClub,
            sellValue: 0,
            leftClub: "",
            dataArrival: updatedContracts[lastIdx].dataExit || startDate,
            dataExit: null,
            salary: rawSalary,
            contractTime: duration,
            contractUntil: swapTerms?.contractUntil || undefined,
            signingBonus: signingBonus ? String(signingBonus) : undefined,
            bonuses: playerBonuses.length > 0 ? playerBonuses : undefined,
            contractClauses: hasAnySpecial ? contractClauses : undefined,
            ...(releaseClauseNum
              ? { releaseClause: String(releaseClauseNum) }
              : {}),
            contractDetails,
            swapPlayer: {
              playerId: player.id,
              playerName: player.name,
              isCounterpart: true,
            },
          },
        ],
      };

      if (!seasonToUpdate.players) seasonToUpdate.players = [];
      seasonToUpdate.players.push(incomingPlayer);

      const incomingRef = doc(
        db,
        `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
        incomingId,
      );
      await setDoc(incomingRef, sanitizeFirestoreData(incomingPlayer));

      if (signingBonus > 0) {
        try {
          await clauseSettlementService.syncSigningBonusTransaction(
            careerId,
            seasonId,
            incomingId,
            0,
            incomingPlayer.name,
            signingBonus,
            incomingPlayer.contract[0].dataArrival
              ? formatDisplayDate(incomingPlayer.contract[0].dataArrival)
              : undefined,
          );
        } catch (err) {
          console.warn("Erro ao sincronizar luvas da troca:", err);
        }
      }

      if (swapTerms?.agentFee && swapTerms.agentFee > 0) {
        try {
          await clauseSettlementService.syncAgentFeeTransaction(
            careerId,
            seasonId,
            incomingId,
            0,
            incomingPlayer.name,
            swapTerms.agentFee,
            incomingPlayer.contract[0].dataArrival
              ? formatDisplayDate(incomingPlayer.contract[0].dataArrival)
              : undefined,
          );
        } catch (err) {
          console.warn("Erro ao sincronizar taxa de agência da troca:", err);
        }
      }
    }

    const sellVal =
      typeof sellValue === "number" ? sellValue : Number(sellValue) || 0;
    const upfront = options?.installments
      ? options.installments.upfrontValue
      : sellVal;
    const isNextWin = isNextWindowTiming(options?.timing);
    const hasLeftOrOpen = !isNextWin || isSoldNow;
    if (
      upfront > 0 &&
      !isLoanBack &&
      !isNextSeasonTiming(options?.timing) &&
      hasLeftOrOpen
    ) {
      try {
        const contractIdx = updatedContracts.length - 1;
        const entryId = `transfer_sell_${player.id}_${contractIdx}`;
        await ServiceFinance.addEntry(careerId, seasonId, {
          id: entryId,
          type: "revenue",
          category: "Transferências (vendas de atletas)",
          amount: Math.round(upfront),
          date: dateExit,
          description: `Venda de ${player.name} (${toClub})`,
          isAutomatic: true,
          source: "transfer",
          sourceId: player.id,
          contractIndex: contractIdx,
          transferDirection: "exit",
        });
      } catch (err) {
        console.warn("Erro ao lançar receita de transferência:", err);
      }
    }

    const numericSellValue =
      typeof sellValue === "number"
        ? sellValue
        : parseValue(String(sellValue)) || Number(sellValue) || 0;

    if (
      numericSellValue > 0 &&
      !isLoanBack &&
      !isNextSeasonTiming(options?.timing) &&
      hasLeftOrOpen
    ) {
      for (const clause of pendingArrivalSellOnClauses) {
        const resaleAmount = Math.round(
          numericSellValue * (clause.percentage / 100),
        );
        if (resaleAmount > 0) {
          try {
            const originClub = clause.fromClub || "Clube de Origem";
            await ServiceFinance.addEntry(careerId, seasonId, {
              id: `sellon_${player.id}_${clause.contractIndex}_${seasonId}`,
              type: "expense",
              category: "Transferências (compras de atletas)",
              amount: resaleAmount,
              date: dateExit,
              description: `Repasse de mais-valia (${clause.percentage}%) referente à venda de ${player.name} para ${toClub} (${originClub})`,
              isAutomatic: true,
              source: "clause",
              sourceId: player.id,
              contractIndex: clause.contractIndex,
              clauseType: "sellOn",
              transferDirection: "arrivals",
            });
          } catch (err) {
            console.warn(
              "Erro ao lançar despesa de revenda futura automática:",
              err,
            );
          }
        }
      }
    }

    Object.assign(player, finalPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  signPlayerWithTerms: async (
    params: SignPlayerWithTermsParams,
  ): Promise<Players> => {
    const { careerId, seasonId, player, contract, swapPlayer } = params;
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }

    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);

    if (!seasonToUpdate) throw new Error("Temporada não encontrada");

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );

    if (contract.contractDetails) {
      validateContractDetails(contract.contractDetails);
    }
    if (contract.loanTerms) {
      validateLoanTerms(contract.loanTerms);
    }
    if (contract.transferClauses?.sellOnPercentage) {
      validateSellOnPercentage(contract.transferClauses.sellOnPercentage);
    }

    // Processamento de troca de atleta saindo do nosso elenco
    if (swapPlayer?.playerId || swapPlayer?.playerName) {
      let swappedPlayer = seasonToUpdate.players?.find(
        (p) =>
          (swapPlayer.playerId && p.id === swapPlayer.playerId) ||
          (swapPlayer.playerName &&
            p.name.trim().toLowerCase() ===
              swapPlayer.playerName.trim().toLowerCase()),
      );

      if (!swappedPlayer && swapPlayer.playerId) {
        const swappedSnap = await getDoc(
          doc(
            db,
            `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players/${swapPlayer.playerId}`,
          ),
        );
        if (swappedSnap.exists()) {
          swappedPlayer = swappedSnap.data() as Players;
        }
      }

      if (swappedPlayer) {
        const arrivalDate = contract.dataArrival
          ? new Date(contract.dataArrival)
          : startDate;
        const exitDateStr = `${String(arrivalDate.getDate()).padStart(
          2,
          "0",
        )}/${String(arrivalDate.getMonth() + 1).padStart(2, "0")}`;

        const toClub = contract.fromClub || "Troca de Atletas";

        const updatedSwappedContracts = buildSellContractHistory(
          swappedPlayer,
          "0",
          toClub,
          exitDateStr,
          startDate,
          endDate,
        );

        const lastSwappedIdx = updatedSwappedContracts.length - 1;
        if (lastSwappedIdx >= 0) {
          updatedSwappedContracts[lastSwappedIdx].swapPlayer = {
            playerName: player.name || "",
            playerId: player.id,
            isCounterpart: true,
          };
        }

        const finalSwapped: Players = {
          ...swappedPlayer,
          sell: true,
          contract: updatedSwappedContracts,
        };

        const swappedRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
          swappedPlayer.id,
        );
        await setDoc(swappedRef, sanitizeFirestoreData(finalSwapped));
        Object.assign(swappedPlayer, finalSwapped);

        const swappedIdx =
          seasonToUpdate.players?.findIndex((p) => p.id === finalSwapped.id) ??
          -1;
        if (swappedIdx >= 0 && seasonToUpdate.players) {
          seasonToUpdate.players[swappedIdx] = finalSwapped;
        } else if (seasonToUpdate.players) {
          seasonToUpdate.players.push(finalSwapped);
        }
      }
    }

    const newPlayerId =
      player.id ||
      `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const fullContract: Contract = {
      buyValue: contract.buyValue ?? 0,
      sellValue: 0,
      fromClub: contract.fromClub || "",
      leftClub: "",
      dataArrival: contract.dataArrival || startDate,
      dataExit: null,
      isLoan: contract.isLoan,
      loanDuration: contract.loanDuration,
      wagePercentage: contract.wagePercentage,
      timing: contract.timing,
      installments: contract.installments,
      swapPlayer,
      bonuses: contract.bonuses,
      transferClauses: contract.transferClauses,
      loanTerms: contract.loanTerms,
      contractDetails: contract.contractDetails,
      contractClauses:
        contract.contractClauses ||
        (contract.contractDetails
          ? {
              ...(contract.contractDetails.releaseClause
                ? { releaseClause: contract.contractDetails.releaseClause }
                : {}),
              ...(contract.contractDetails.wageAdjustment
                ? { wageAdjustment: contract.contractDetails.wageAdjustment }
                : {}),
            }
          : undefined),
      ...(contract.releaseClause || contract.contractDetails?.releaseClause
        ? {
            releaseClause:
              contract.releaseClause ||
              String(contract.contractDetails?.releaseClause),
          }
        : {}),
      salary: contract.salary,
      contractTime: contract.contractTime,
      contractUntil: contract.contractUntil,
      signingBonus: contract.signingBonus,
      fullSalary: contract.fullSalary,
      buyOptionValue: contract.buyOptionValue,
      fromLoanBuyOption: contract.fromLoanBuyOption,
      buyOptionFinalized: contract.buyOptionFinalized,
    };

    const isLoanSigning = Boolean(contract.isLoan || player.incomingLoan);

    const existingPlayerIndex = seasonToUpdate.players
      ? seasonToUpdate.players.findIndex(
          (p) =>
            p.id === player.id ||
            p.id === newPlayerId ||
            (player.playedWithUs &&
              (p.id === player.playedWithUs ||
                p.playedWithUs === player.playedWithUs)),
        )
      : -1;

    let targetPlayer: Players | undefined =
      existingPlayerIndex >= 0 && seasonToUpdate.players
        ? seasonToUpdate.players[existingPlayerIndex]
        : undefined;

    if (!targetPlayer && (player.id || newPlayerId)) {
      const modernId = player.id || newPlayerId;
      try {
        const modernSnap = await getDoc(
          doc(
            db,
            `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players/${modernId}`,
          ),
        );
        if (modernSnap.exists()) {
          targetPlayer = modernSnap.data() as Players;
        }
      } catch {
        // Fallback defensivo
      }
    }

    let finalPlayer: Players;
    if (targetPlayer) {
      const existingPlayer = targetPlayer;
      const cleanedContracts = (existingPlayer.contract || []).map((c) => {
        let updatedContract = c;
        if (c.isLoan && contract.fromLoanBuyOption) {
          updatedContract = {
            ...c,
            buyOptionFinalized: true,
            loanTerms: {
              ...(c.loanTerms || {
                durationYears: c.loanDuration || 1,
                ourWagePercentage: c.wagePercentage || 100,
                theirWagePercentage: Math.max(
                  0,
                  100 - (c.wagePercentage || 100),
                ),
                hasBuyOption: true,
                partnerClub: c.fromClub || "",
              }),
              buyOptionExercised: true,
              buyOptionFinalized: true,
            },
          };
        }
        if (updatedContract.transferClauses) {
          const tc = { ...updatedContract.transferClauses };
          delete tc.buybackValue;
          delete tc.firstRefusal;
          return {
            ...updatedContract,
            transferClauses: Object.keys(tc).length > 0 ? tc : undefined,
          };
        }
        return updatedContract;
      });

      finalPlayer = {
        ...existingPlayer,
        ...player,
        id: existingPlayer.id,
        playedWithUs: existingPlayer.playedWithUs || existingPlayer.id,
        salary:
          player.salary ||
          contract.contractDetails?.weeklyWage ||
          existingPlayer.salary ||
          10000,
        playerValue:
          player.playerValue ||
          (typeof contract.buyValue === "number"
            ? contract.buyValue
            : existingPlayer.playerValue),
        buy: !isLoanSigning && !isNextSeasonTiming(contract.timing),
        captain: false,
        sell: false,
        loan: false,
        incomingLoan: isLoanSigning,
        contractTime:
          player.contractTime ||
          contract.contractDetails?.durationYears ||
          contract.loanDuration ||
          1,
        squadRole:
          player.squadRole ||
          contract.contractDetails?.squadRole ||
          existingPlayer.squadRole,
        contractDetails:
          contract.contractDetails || existingPlayer.contractDetails,
        contract: [...cleanedContracts, fullContract],
      };
      if (existingPlayerIndex >= 0 && seasonToUpdate.players) {
        seasonToUpdate.players[existingPlayerIndex] = finalPlayer;
      } else {
        if (!seasonToUpdate.players) seasonToUpdate.players = [];
        seasonToUpdate.players.push(finalPlayer);
      }
    } else {
      finalPlayer = {
        id: newPlayerId,
        name: player.name || "",
        overall: player.overall || 70,
        sector: player.sector || "Ataque",
        position: player.position || "ATA",
        age: player.age || 20,
        salary: player.salary || contract.contractDetails?.weeklyWage || 10000,
        nation: player.nation || career.nation || "BRA",
        shirtNumber: player.shirtNumber || "",
        playerValue:
          player.playerValue ||
          (typeof contract.buyValue === "number" ? contract.buyValue : 0),
        buy: !isLoanSigning && !isNextSeasonTiming(contract.timing),
        captain: false,
        sell: false,
        loan: false,
        incomingLoan: isLoanSigning,
        contractTime:
          player.contractTime ||
          contract.contractDetails?.durationYears ||
          contract.loanDuration ||
          1,
        ballonDor: 0,
        statsLeagues: [],
        squadRole: player.squadRole || contract.contractDetails?.squadRole,
        contractDetails: contract.contractDetails,
        contract: [fullContract],
        ...player,
      };
      if (!seasonToUpdate.players) seasonToUpdate.players = [];
      seasonToUpdate.players.push(finalPlayer);
    }

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      finalPlayer.id,
    );
    await setDoc(playerRef, sanitizeFirestoreData(finalPlayer));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    const buyVal =
      typeof contract.buyValue === "number"
        ? contract.buyValue
        : Number(contract.buyValue) || 0;
    const upfront = contract.installments
      ? contract.installments.upfrontValue
      : buyVal;

    if (
      !contract.isLoan &&
      !player.incomingLoan &&
      upfront > 0 &&
      !isNextSeasonTiming(contract.timing)
    ) {
      try {
        const contractIdx = (finalPlayer.contract?.length ?? 1) - 1;
        const entryId = `transfer_buy_${finalPlayer.id}_${contractIdx}`;
        await ServiceFinance.addEntry(careerId, seasonId, {
          id: entryId,
          type: "expense",
          category: "Transferências (compras de atletas)",
          amount: Math.round(upfront),
          date: contract.dataArrival
            ? formatDisplayDate(contract.dataArrival)
            : undefined,
          description: `Compra de ${finalPlayer.name} (${contract.fromClub || "Novo Clube"})`,
          isAutomatic: true,
          source: "transfer",
          sourceId: finalPlayer.id,
          contractIndex: contractIdx,
          transferDirection: "arrivals",
        });
      } catch (err) {
        console.warn("Erro ao lançar despesa de contratação:", err);
      }
    }

    const signingBonusVal =
      typeof contract.signingBonus === "number"
        ? contract.signingBonus
        : Number(contract.signingBonus) ||
          (contract.contractDetails?.signingBonus
            ? Number(contract.contractDetails.signingBonus)
            : 0) ||
          0;
    if (signingBonusVal > 0) {
      try {
        await clauseSettlementService.syncSigningBonusTransaction(
          careerId,
          seasonId,
          finalPlayer.id,
          (finalPlayer.contract?.length ?? 1) - 1,
          finalPlayer.name,
          signingBonusVal,
          contract.dataArrival
            ? formatDisplayDate(contract.dataArrival)
            : undefined,
        );
      } catch (err) {
        console.warn("Erro ao sincronizar luvas contratuais:", err);
      }
    }

    const rawAgentFee =
      contract.contractDetails?.agentFee !== undefined
        ? contract.contractDetails.agentFee
        : (contract as { agentFee?: number | string }).agentFee;
    const agentFeeVal =
      typeof rawAgentFee === "number" ? rawAgentFee : Number(rawAgentFee) || 0;
    if (agentFeeVal > 0) {
      try {
        await clauseSettlementService.syncAgentFeeTransaction(
          careerId,
          seasonId,
          finalPlayer.id,
          (finalPlayer.contract?.length ?? 1) - 1,
          finalPlayer.name,
          agentFeeVal,
          contract.dataArrival
            ? formatDisplayDate(contract.dataArrival)
            : undefined,
        );
      } catch (err) {
        console.warn("Erro ao sincronizar taxa de agência:", err);
      }
    }

    return finalPlayer;
  },

  loanPlayerFromSeason: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    buyOption: string,
    toClub: string,
    dateLoan: string,
    loanDuration: string,
    wagePercentage: string,
    loanTerms?: LoanTerms,
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    if (loanTerms) {
      validateLoanTerms(loanTerms);
    }

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const updatedContracts = buildLoanContractHistory(
      player,
      buyOption,
      toClub,
      dateLoan,
      loanDuration,
      wagePercentage,
      startDate,
      endDate,
    );

    const lastIdx = updatedContracts.length - 1;
    if (lastIdx >= 0) {
      if (loanTerms) {
        updatedContracts[lastIdx].loanTerms = loanTerms;
      } else {
        delete updatedContracts[lastIdx].loanTerms;
        delete updatedContracts[lastIdx].buyOptionValue;
      }
    }

    const finalPlayer = {
      ...player,
      loan: true,
      shirtNumber: "",
      contract: updatedContracts,
    };
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, sanitizeFirestoreData(finalPlayer));
    Object.assign(player, finalPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  returnPlayerFromLoan: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    returnDate: string,
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const { contractHistory } = buildReturnContractHistory(
      player,
      returnDate,
      startDate,
      endDate,
    );

    const finalPlayer = player.incomingLoan
      ? {
          ...player,
          sell: true,
          incomingLoan: false,
          contract: contractHistory,
        }
      : { ...player, loan: false, sell: false, contract: contractHistory };

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, sanitizeFirestoreData(finalPlayer));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  exerciseLoanBuyOption: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
    exerciseDate: string,
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const { startDate, endDate } = getSeasonDateRange(
      seasonToUpdate.seasonNumber,
      career.createdAt,
      career.nation,
    );
    const [, month] = exerciseDate.split("/").map(Number);
    const m = (month || 1) - 1;
    const year =
      m < startDate.getMonth()
        ? endDate.getFullYear()
        : startDate.getFullYear();
    const parsedExerciseDate = parseBrasilDate(exerciseDate, year);
    if (!parsedExerciseDate) throw new Error("Data inválida");

    const contracts = [...(player.contract || [])];
    const loanContract = contracts[contractIndex];
    if (!loanContract || !loanContract.isLoan) {
      throw new Error("Contrato de empréstimo não encontrado");
    }

    if (!hasDefinedLoanBuyOption(loanContract)) {
      throw new Error("Este empréstimo não possui opção de compra definida.");
    }
    const buyOptionFee = getContractBuyOptionFee(loanContract);

    const sellOnPct = loanContract.loanTerms?.sellOnPercentage;

    contracts[contractIndex] = {
      ...loanContract,
      buyOptionValue: buyOptionFee,
      loanTerms: {
        durationYears:
          loanContract.loanTerms?.durationYears ||
          loanContract.loanDuration ||
          1,
        ourWagePercentage:
          loanContract.loanTerms?.ourWagePercentage ??
          Math.max(0, 100 - (loanContract.wagePercentage || 0)),
        theirWagePercentage:
          loanContract.loanTerms?.theirWagePercentage ??
          (loanContract.wagePercentage || 0),
        hasBuyOption: true,
        buyOptionFee,
        ...(sellOnPct ? { sellOnPercentage: sellOnPct } : {}),
        partnerClub: loanContract.leftClub,
        buyOptionExercised: true,
        exercisedDate: exerciseDate,
      },
    };

    const existingSaleIdx = contracts.findIndex(
      (c, i) =>
        i !== contractIndex &&
        c.fromLoanBuyOption &&
        (c.sourceLoanContractIndex === contractIndex ||
          c.sourceLoanContractIndex === undefined),
    );

    const saleContract: Contract = {
      buyValue: 0,
      fromClub: "",
      sellValue: buyOptionFee,
      leftClub: loanContract.leftClub,
      dataArrival: null,
      dataExit: parsedExerciseDate,
      isLoan: false,
      fromLoanBuyOption: true,
      sourceLoanContractIndex: contractIndex,
      ...(sellOnPct
        ? {
            transferClauses: {
              sellOnPercentage: sellOnPct,
              partnerClub: loanContract.leftClub,
              status: "pending",
            },
          }
        : {}),
    };

    if (existingSaleIdx >= 0) {
      contracts[existingSaleIdx] = saleContract;
    } else {
      contracts.push(saleContract);
    }

    const finalPlayer: Players = {
      ...player,
      sell: true,
      loan: false,
      incomingLoan: false,
      contract: contracts,
    };

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, sanitizeFirestoreData(finalPlayer));
    Object.assign(player, finalPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  exerciseArrivalLoanBuyOption: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    contractIndex: number,
  ): Promise<void> => {
    if (seasonId === "geral") {
      throw new Error(READ_ONLY_GERAL_ERROR);
    }
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const seasonToUpdate = career.clubData.find((s) => s.id === seasonId);
    const player = seasonToUpdate?.players.find((p) => p.id === playerId);

    if (!seasonToUpdate || !player) throw new Error("Dados não encontrados");

    const contracts = [...(player.contract || [])];
    const loanContract = contracts[contractIndex];
    if (!loanContract || !loanContract.isLoan) {
      throw new Error("Contrato de empréstimo não encontrado");
    }

    if (!hasDefinedLoanBuyOption(loanContract)) {
      throw new Error("Este empréstimo não possui opção de compra definida.");
    }
    const buyOptionFee = getContractBuyOptionFee(loanContract);
    const sellOnPct = loanContract.loanTerms?.sellOnPercentage;

    const todayDate = new Date();
    const todayFormatted = `${String(todayDate.getDate()).padStart(2, "0")}/${String(todayDate.getMonth() + 1).padStart(2, "0")}`;

    contracts[contractIndex] = {
      ...loanContract,
      loanTerms: {
        durationYears:
          loanContract.loanTerms?.durationYears ||
          loanContract.loanDuration ||
          1,
        ourWagePercentage:
          loanContract.loanTerms?.ourWagePercentage ??
          loanContract.wagePercentage ??
          100,
        theirWagePercentage:
          loanContract.loanTerms?.theirWagePercentage ??
          Math.max(0, 100 - (loanContract.wagePercentage || 100)),
        hasBuyOption: true,
        buyOptionFee,
        ...(sellOnPct ? { sellOnPercentage: sellOnPct } : {}),
        partnerClub: loanContract.fromClub || "",
        buyOptionExercised: true,
        exercisedDate: todayFormatted,
      },
    };

    const finalPlayer: Players = {
      ...player,
      contract: contracts,
    };

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, sanitizeFirestoreData(finalPlayer));
    Object.assign(player, finalPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },
};
