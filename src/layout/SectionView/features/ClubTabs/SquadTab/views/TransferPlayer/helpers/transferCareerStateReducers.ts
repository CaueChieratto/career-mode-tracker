import { Career } from "../../../../../../../../common/interfaces/Career";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { Contract } from "../../../../../../../../common/interfaces/playersInfo/contract";
import {
  TransferTiming,
  TransferInstallments,
  PlayerSwapTerm,
  TransferBonus,
  TransferClauses,
  LoanTerms,
} from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { checkIsIncomingLoanExit } from "../constants/buildEditTransferFormSections";
import {
  shouldPlayerLeaveOnNextWindow,
  isNextSeasonTiming,
  isNextWindowTiming,
  getLoanBackEndSeasonNumber,
} from "../../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";
import { parseValue } from "../../../../../../../../common/utils/FormatValue";
import { calculateContractYears } from "../../../../../../../../common/utils/calculateContractYears";
import { parseLoanDuration } from "../../../../../../../../common/utils/parseLoanDuration";
import { ContractDetails } from "../../../../../../../../common/interfaces/playersInfo/contractClauses";

export const applyRevertToCareer = (
  career: Career,
  seasonId: string,
  playerId: string,
  contractIndex: number,
  direction: "arrivals" | "exit",
): Career => {
  const newClubData = (career.clubData || []).map((s) => {
    if (s.id !== seasonId) return s;

    let newPlayers = [...(s.players || [])];
    const targetPlayer = newPlayers.find((p) => p.id === playerId);
    if (!targetPlayer) return s;

    const contracts = targetPlayer.contract ? [...targetPlayer.contract] : [];
    let idx = contractIndex;
    if (idx < 0 || idx >= contracts.length) {
      idx = contracts.findIndex((c) =>
        direction === "exit"
          ? Boolean(c.dataExit || c.leftClub)
          : Boolean(c.dataArrival || c.fromClub),
      );
      if (idx < 0) idx = Math.max(0, contracts.length - 1);
    }

    if (direction === "exit") {
      const currentContract = contracts[idx];
      const finalContracts = [...contracts];

      // Apagar jogador recebido na troca, caso exista
      const swapPlayerName = currentContract?.swapPlayer?.playerName;
      const swapPlayerId = currentContract?.swapPlayer?.playerId;
      newPlayers = newPlayers.filter(
        (p) =>
          (swapPlayerId ? p.id !== swapPlayerId : true) &&
          !p.contract?.some((c) => c.swapPlayer?.playerId === playerId) &&
          !(swapPlayerName && p.name === swapPlayerName && p.buy),
      );

      // Remover contrato de loan-back adicional gerado pela venda, se houver
      if (
        finalContracts[idx + 1]?.isLoan &&
        finalContracts[idx + 1]?.fromClub === currentContract.leftClub
      ) {
        finalContracts.splice(idx + 1, 1);
      }

      // Remover contrato derivado de exercício de opção de compra, caso exista
      const derivedSaleIdx = finalContracts.findIndex(
        (c) =>
          c.fromLoanBuyOption &&
          (c.sourceLoanContractIndex === idx ||
            c.sourceLoanContractIndex === undefined),
      );
      if (derivedSaleIdx !== -1) {
        finalContracts.splice(derivedSaleIdx, 1);
        if (derivedSaleIdx < idx) {
          idx--;
        }
      }

      const isIncomingReturn = checkIsIncomingLoanExit(
        targetPlayer,
        currentContract,
        "exit",
      );

      if (isIncomingReturn) {
        finalContracts[idx] = {
          ...currentContract,
          leftClub: "",
          dataExit: null,
          sellValue: 0,
          isLoan: true,
        };

        const updatedPlayer: Players = {
          ...targetPlayer,
          sell: false,
          loan: false,
          incomingLoan: true,
          contract: finalContracts,
        };

        newPlayers = newPlayers.map((p) =>
          p.id === playerId ? updatedPlayer : p,
        );
      } else {
        const cleanedContract = { ...currentContract };
        delete cleanedContract.installments;
        delete cleanedContract.transferClauses;
        delete cleanedContract.bonuses;
        delete cleanedContract.swapPlayer;
        delete cleanedContract.timing;
        delete cleanedContract.loanTerms;
        delete cleanedContract.contractDetails;

        if (cleanedContract?.dataArrival || cleanedContract?.fromClub) {
          finalContracts[idx] = {
            ...cleanedContract,
            leftClub: "",
            dataExit: null,
            sellValue: 0,
            isLoan: false,
            loanDuration: undefined,
            wagePercentage: undefined,
            buyOptionValue: undefined,
          };
        } else {
          if (finalContracts.length > 1) {
            finalContracts.splice(idx, 1);
          } else if (currentContract) {
            finalContracts[idx] = {
              ...cleanedContract,
              leftClub: "",
              dataExit: null,
              sellValue: 0,
              isLoan: false,
              loanDuration: undefined,
              wagePercentage: undefined,
              buyOptionValue: undefined,
            };
          }
        }

        const updatedPlayer: Players = {
          ...targetPlayer,
          sell: false,
          loan: false,
          incomingLoan: false,
          contract: finalContracts,
        };

        newPlayers = newPlayers.map((p) =>
          p.id === playerId ? updatedPlayer : p,
        );
      }
    } else {
      // Arrivals
      if (contracts.length <= 1) {
        if (contracts[0]?.fromClub === "Fim de Empréstimo") {
          const updatedPlayer: Players = {
            ...targetPlayer,
            loan: true,
            sell: false,
            buy: false,
            contract: [
              {
                ...contracts[0],
                fromClub: "",
                dataArrival: null,
              },
            ],
          };
          newPlayers = newPlayers.map((p) =>
            p.id === playerId ? updatedPlayer : p,
          );
        } else {
          const currentContract = contracts[idx];
          const swapPlayerId = currentContract?.swapPlayer?.playerId;
          const swapPlayerName = currentContract?.swapPlayer?.playerName;
          if (swapPlayerId || swapPlayerName) {
            newPlayers = newPlayers.map((p) => {
              const isMatch =
                (swapPlayerId && p.id === swapPlayerId) ||
                (swapPlayerName &&
                  p.name.trim().toLowerCase() ===
                    swapPlayerName.trim().toLowerCase());
              if (isMatch && p.sell) {
                const restoredContracts = (p.contract || []).filter(
                  (c) => !(c.sellValue === 0 && (c.leftClub || c.swapPlayer)),
                );
                return {
                  ...p,
                  sell: false,
                  contract: restoredContracts,
                };
              }
              return p;
            });
          }
          newPlayers = newPlayers.filter((p) => p.id !== playerId);
        }
      } else {
        const finalContracts = [...contracts];
        const removedContract = finalContracts.splice(idx, 1)[0];

        const isFromLoanBuy = Boolean(
          removedContract?.fromLoanBuyOption ||
            (!removedContract?.isLoan &&
              finalContracts.some(
                (c) =>
                  c.isLoan &&
                  (c.loanTerms?.buyOptionExercised ||
                    c.loanTerms?.hasBuyOption ||
                    Boolean(c.buyOptionValue)),
              )),
        );
        if (isFromLoanBuy) {
          const loanIdx = finalContracts.findIndex(
            (c) => c.isLoan && (c.loanTerms || c.buyOptionValue),
          );
          if (loanIdx !== -1 && finalContracts[loanIdx].loanTerms) {
            finalContracts[loanIdx] = {
              ...finalContracts[loanIdx],
              loanTerms: {
                ...finalContracts[loanIdx].loanTerms!,
                buyOptionExercised: false,
                exercisedDate: undefined,
              },
            };
          }
        }

        const prev = finalContracts[finalContracts.length - 1];
        const isPrevSale = Boolean(prev?.leftClub && !prev?.isLoan);
        const isPrevLoanExit = Boolean(prev?.isLoan && prev?.leftClub);
        const isPrevIncomingLoan = Boolean(prev?.isLoan && !prev?.leftClub);

        const updatedPlayer: Players = {
          ...targetPlayer,
          contract: finalContracts,
          ...(isPrevSale
            ? { sell: true, buy: false, incomingLoan: false, loan: false }
            : isPrevLoanExit
            ? { loan: true, sell: false, buy: false, incomingLoan: false }
            : isPrevIncomingLoan
            ? { incomingLoan: true, buy: false, loan: false, sell: false }
            : {}),
        };

        newPlayers = newPlayers.map((p) =>
          p.id === playerId ? updatedPlayer : p,
        );
      }
    }

    return {
      ...s,
      players: newPlayers,
    };
  });

  return {
    ...career,
    updatedAt: Date.now(),
    clubData: newClubData,
  };
};

export const applyEditToCareer = (
  career: Career,
  seasonId: string,
  playerId: string,
  contractIndex: number,
  direction: "arrivals" | "exit",
  updatedFields: {
    clubName: string;
    transferValue: number;
    transferType: string;
    date: Date;
    loanDuration?: number;
    wagePercentage?: number;
    timing?: TransferTiming;
    installments?: TransferInstallments;
    swapPlayer?: PlayerSwapTerm;
    bonuses?: TransferBonus[];
    transferClauses?: TransferClauses;
    buyOptionValue?: number;
    buyOption?: string;
    salary?: number;
    contractTime?: number;
    contractUntil?: string;
    signingBonus?: string;
    agentFee?: string;
    loanTerms?: LoanTerms;
  },
): Career => {
  const newClubData = (career.clubData || []).map((s) => {
    if (s.id !== seasonId) return s;

    let newPlayers = [...(s.players || [])];
    const targetPlayer = newPlayers.find((p) => p.id === playerId);
    if (!targetPlayer) return s;

    const contracts = targetPlayer.contract ? [...targetPlayer.contract] : [];
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
    const finalPlayer: Players = { ...targetPlayer };

    if (direction === "exit") {
      currentContract.dataExit = updatedFields.date;
      if (updatedFields.clubName)
        currentContract.leftClub = updatedFields.clubName;

      const isIncomingReturn =
        checkIsIncomingLoanExit(
          targetPlayer,
          currentContract as Contract,
          "exit",
        ) || updatedFields.transferType === "Fim de Empréstimo";

      if (isIncomingReturn) {
        currentContract.sellValue = 0;
        currentContract.isLoan = true;
        delete currentContract.loanDuration;
        delete currentContract.wagePercentage;
        delete currentContract.buyOptionValue;
        finalPlayer.sell = true;
        finalPlayer.loan = false;
        finalPlayer.incomingLoan = false;
      } else if (updatedFields.transferType === "Venda") {
        currentContract.sellValue = updatedFields.transferValue;
        currentContract.isLoan = false;
        delete currentContract.loanDuration;
        delete currentContract.wagePercentage;

        if (updatedFields.timing) {
          currentContract.timing = updatedFields.timing;
        } else {
          delete currentContract.timing;
        }

        if (updatedFields.installments) {
          currentContract.installments = updatedFields.installments;
        } else {
          delete currentContract.installments;
        }

        if (updatedFields.bonuses && updatedFields.bonuses.length > 0) {
          currentContract.bonuses = updatedFields.bonuses;
        } else {
          delete currentContract.bonuses;
        }

        if (updatedFields.transferClauses) {
          if (updatedFields.transferClauses.loanBackDuration) {
            updatedFields.transferClauses.loanEndSeasonNumber =
              getLoanBackEndSeasonNumber(
                {
                  ...currentContract,
                  transferClauses: updatedFields.transferClauses,
                  dataExit: updatedFields.date,
                },
                career.createdAt,
                career.nation,
                s.seasonNumber,
              );
          }
          currentContract.transferClauses = updatedFields.transferClauses;
        } else {
          delete currentContract.transferClauses;
        }

        const prevSwapPlayerId = currentContract.swapPlayer?.playerId;
        const prevSwapPlayerName = currentContract.swapPlayer?.playerName;

        if (updatedFields.swapPlayer) {
          const swapVal =
            updatedFields.swapPlayer.estimatedValue ||
            updatedFields.swapPlayer.playerValue ||
            0;

          if (prevSwapPlayerId) {
            const existingSwap = newPlayers.find((p) => p.id === prevSwapPlayerId);
            if (existingSwap) {
              const updatedSwap: Players = {
                ...existingSwap,
                name: updatedFields.swapPlayer.playerName,
                position: updatedFields.swapPlayer.position || "",
                sector: updatedFields.swapPlayer.sector || "",
                contract: (existingSwap.contract || []).map((c, i) =>
                  i === 0
                    ? {
                        ...c,
                        fromClub: updatedFields.clubName,
                        buyValue: swapVal,
                        dataArrival: updatedFields.date,
                      }
                    : c,
                ),
              };
              newPlayers = newPlayers.map((p) =>
                p.id === existingSwap.id ? updatedSwap : p,
              );
              currentContract.swapPlayer = {
                ...updatedFields.swapPlayer,
                playerId: existingSwap.id,
              };
            }
          } else {
            const newSwapId = `swap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const newSwapped: Players = {
              id: newSwapId,
              name: updatedFields.swapPlayer.playerName,
              position: updatedFields.swapPlayer.position || "",
              sector: updatedFields.swapPlayer.sector || "",
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
              contract: [
                {
                  fromClub: updatedFields.clubName,
                  dataArrival: updatedFields.date,
                  buyValue: swapVal,
                  sellValue: 0,
                  leftClub: "",
                  swapPlayer: {
                    playerId: targetPlayer.id,
                    playerName: targetPlayer.name,
                    playerValue: updatedFields.transferValue,
                    position: targetPlayer.position,
                    sector: targetPlayer.sector,
                  },
                },
              ],
            };
            newPlayers.push(newSwapped);
            currentContract.swapPlayer = {
              ...updatedFields.swapPlayer,
              playerId: newSwapId,
            };
          }
        } else if (prevSwapPlayerId || prevSwapPlayerName) {
          newPlayers = newPlayers.filter(
            (p) =>
              (prevSwapPlayerId ? p.id !== prevSwapPlayerId : true) &&
              !p.contract?.some((c) => c.swapPlayer?.playerId === playerId) &&
              !(prevSwapPlayerName && p.name === prevSwapPlayerName && p.buy),
          );
          delete currentContract.swapPlayer;
        }

        const isLoanBack = Boolean(updatedFields.transferClauses?.loanBackDuration);
        if (isNextSeasonTiming(updatedFields.timing)) {
          finalPlayer.sell = false;
          finalPlayer.incomingLoan = false;
        } else if (isNextWindowTiming(updatedFields.timing)) {
          const shouldLeave = shouldPlayerLeaveOnNextWindow(
            s.matches || [],
            updatedFields.date,
          );
          finalPlayer.sell = shouldLeave ? !isLoanBack : false;
          finalPlayer.incomingLoan = isLoanBack;
        } else {
          finalPlayer.sell = !isLoanBack;
          finalPlayer.incomingLoan = isLoanBack;
        }
      } else if (updatedFields.transferType === "Emprestar" || updatedFields.transferType === "Empréstimo") {
        currentContract.sellValue = 0;
        currentContract.isLoan = true;
        currentContract.loanDuration =
          parseLoanDuration(updatedFields.loanDuration) ??
          updatedFields.loanDuration ??
          0;
        currentContract.wagePercentage = updatedFields.wagePercentage || 0;

        const buyOptFee =
          updatedFields.buyOptionValue !== undefined
            ? updatedFields.buyOptionValue
            : updatedFields.buyOption
              ? parseValue(updatedFields.buyOption)
              : updatedFields.loanTerms?.buyOptionFee ||
                currentContract.buyOptionValue ||
                currentContract.loanTerms?.buyOptionFee ||
                0;
        const hasBuyOpt = updatedFields.loanTerms
          ? Boolean(updatedFields.loanTerms.hasBuyOption)
          : Boolean(updatedFields.buyOption) ||
            Boolean(updatedFields.buyOptionValue) ||
            buyOptFee > 0;
        const sellOnPct = hasBuyOpt ? updatedFields.loanTerms?.sellOnPercentage : undefined;

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
        const wasAlreadyExercised =
          Boolean(currentContract.loanTerms?.buyOptionExercised) ||
          existingExercisedSaleIdx !== -1;

        if (hasBuyOpt && buyOptFee > 0) {
          currentContract.buyOptionValue = buyOptFee;
          currentContract.loanTerms = {
            ...(updatedFields.loanTerms || currentContract.loanTerms || {}),
            durationYears:
              updatedFields.loanTerms?.durationYears ??
              currentContract.loanTerms?.durationYears ??
              1,
            ourWagePercentage:
              updatedFields.loanTerms?.ourWagePercentage ??
              currentContract.loanTerms?.ourWagePercentage ??
              0,
            theirWagePercentage:
              updatedFields.loanTerms?.theirWagePercentage ??
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
              nextSaleClauses.partnerClub = updatedFields.clubName || currentContract.leftClub;
              nextSaleClauses.status = nextSaleClauses.status || "pending";
            } else {
              delete nextSaleClauses.sellOnPercentage;
            }

            contracts[existingExercisedSaleIdx] = {
              ...prevSale,
              leftClub: updatedFields.clubName || currentContract.leftClub,
              sellValue: buyOptFee,
              transferClauses:
                Object.keys(nextSaleClauses).length > 0 ? nextSaleClauses : undefined,
            };
          }
        } else {
          delete currentContract.buyOptionValue;
          const wageNum =
            updatedFields.wagePercentage !== undefined
              ? Number(updatedFields.wagePercentage)
              : currentContract.wagePercentage || 0;
          const durationNum =
            parseLoanDuration(updatedFields.loanDuration) ??
            (typeof updatedFields.loanDuration === "number"
              ? updatedFields.loanDuration
              : Number(updatedFields.loanDuration) ||
                currentContract.loanDuration ||
                1);
          currentContract.loanTerms = {
            ...(updatedFields.loanTerms || currentContract.loanTerms || {}),
            durationYears:
              updatedFields.loanTerms?.durationYears ?? durationNum,
            ourWagePercentage:
              updatedFields.loanTerms?.ourWagePercentage ??
              Math.max(0, 100 - wageNum),
            theirWagePercentage:
              updatedFields.loanTerms?.theirWagePercentage ??
              Math.min(100, Math.max(0, wageNum)),
            hasBuyOption: false,
            partnerClub:
              updatedFields.clubName || currentContract.leftClub || "",
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

        const remainsExercised = hasBuyOpt && buyOptFee > 0 && wasAlreadyExercised;
        finalPlayer.sell = remainsExercised;
        finalPlayer.loan = !remainsExercised;
      }
    } else {
      currentContract.dataArrival = updatedFields.date;
      if (updatedFields.clubName)
        currentContract.fromClub = updatedFields.clubName;
      if (updatedFields.timing)
        currentContract.timing = updatedFields.timing;
      if (updatedFields.transferType === "Compra") {
        currentContract.buyValue = updatedFields.transferValue;
        currentContract.isLoan = false;
        delete currentContract.loanDuration;
        delete currentContract.wagePercentage;
        finalPlayer.buy = true;
        finalPlayer.incomingLoan = false;
      } else if (updatedFields.transferType === "Empréstimo") {
        currentContract.buyValue = 0;
        currentContract.isLoan = true;
        currentContract.loanDuration =
          parseLoanDuration(updatedFields.loanDuration) ??
          updatedFields.loanDuration ??
          0;
        currentContract.wagePercentage = updatedFields.wagePercentage ?? 100;

        const buyOptNum =
          updatedFields.buyOptionValue !== undefined
            ? updatedFields.buyOptionValue
            : updatedFields.buyOption
              ? parseValue(updatedFields.buyOption)
              : (currentContract.buyOptionValue || currentContract.loanTerms?.buyOptionFee || 0);
        const hasBuyOpt = updatedFields.loanTerms
          ? Boolean(updatedFields.loanTerms.hasBuyOption)
          : Boolean(updatedFields.buyOption) ||
            Boolean(updatedFields.buyOptionValue) ||
            buyOptNum > 0;
        const existingExercisedPurchaseIdx = contracts.findIndex(
          (c, i) =>
            i !== idx &&
            (c.fromLoanBuyOption ||
              (!c.isLoan &&
                !c.leftClub &&
                (c.fromClub === (updatedFields.clubName || currentContract.fromClub) ||
                  contracts.some((x) => x.isLoan)))),
        );
        const wasAlreadyExercised =
          Boolean(currentContract.loanTerms?.buyOptionExercised) ||
          existingExercisedPurchaseIdx !== -1;
        const remainsExercised = hasBuyOpt && buyOptNum > 0 && wasAlreadyExercised;

        finalPlayer.buy = remainsExercised;
        finalPlayer.incomingLoan = !remainsExercised;
      }
    }

    const isLatestActiveContract = idx === contracts.length - 1;

    if (direction === "arrivals" && updatedFields.transferType === "Compra") {
      let parsedDuration = updatedFields.contractTime;
      if (updatedFields.contractUntil && updatedFields.contractUntil.trim()) {
        const calculated = calculateContractYears(
          updatedFields.contractUntil.trim(),
          career.createdAt,
          s.seasonNumber,
          career.nation,
        );
        if (calculated >= 1 && calculated <= 7) {
          parsedDuration = calculated;
        }
      }

      if (updatedFields.salary !== undefined) {
        currentContract.salary = updatedFields.salary;
        if (isLatestActiveContract) {
          finalPlayer.salary = updatedFields.salary;
        }
      }

      if (parsedDuration !== undefined) {
        currentContract.contractTime = parsedDuration;
        if (isLatestActiveContract) {
          finalPlayer.contractTime = parsedDuration;
        }
      }

      if (updatedFields.contractUntil !== undefined) {
        if (updatedFields.contractUntil.trim()) {
          currentContract.contractUntil = updatedFields.contractUntil.trim();
          if (isLatestActiveContract) {
            finalPlayer.contractUntil = updatedFields.contractUntil.trim();
          }
        } else {
          delete currentContract.contractUntil;
          if (isLatestActiveContract) {
            delete finalPlayer.contractUntil;
          }
        }
      }

      if (updatedFields.signingBonus !== undefined) {
        if (updatedFields.signingBonus.trim()) {
          currentContract.signingBonus = updatedFields.signingBonus.trim();
        } else {
          delete currentContract.signingBonus;
        }
      }

      const prevDetails: Partial<ContractDetails> =
        currentContract.contractDetails || {};
      const newDetails: ContractDetails = {
        ...prevDetails,
        weeklyWage:
          updatedFields.salary ??
          (typeof currentContract.salary === "number"
            ? currentContract.salary
            : parseValue(String(currentContract.salary || "0"))),
        durationYears:
          parsedDuration ??
          (typeof currentContract.contractTime === "number"
            ? currentContract.contractTime
            : Number(currentContract.contractTime) || 1),
        squadRole: prevDetails.squadRole || finalPlayer.squadRole || "Rodízio",
      };
      if (updatedFields.signingBonus !== undefined) {
        if (updatedFields.signingBonus.trim()) {
          newDetails.signingBonus = parseValue(updatedFields.signingBonus);
        } else {
          delete newDetails.signingBonus;
        }
      }
      if (updatedFields.agentFee !== undefined) {
        if (updatedFields.agentFee.trim()) {
          newDetails.agentFee = parseValue(updatedFields.agentFee);
        } else {
          delete newDetails.agentFee;
        }
      }
      currentContract.contractDetails = newDetails;
      if (isLatestActiveContract) {
        finalPlayer.contractDetails = newDetails;
      }
    } else if (direction === "arrivals" && updatedFields.transferType === "Empréstimo") {
      const rawFullSalary =
        updatedFields.salary !== undefined
          ? updatedFields.salary
          : (currentContract.fullSalary ?? finalPlayer.salary ?? 0);
      const wagePct = updatedFields.wagePercentage ?? currentContract.wagePercentage ?? 100;
      const effectiveWeeklyWage = Math.round(rawFullSalary * (wagePct / 100));
      const parsedLoanDuration =
        parseLoanDuration(updatedFields.loanDuration) ??
        currentContract.loanDuration ??
        1;
      const buyOptNum =
        updatedFields.buyOptionValue !== undefined
          ? updatedFields.buyOptionValue
          : updatedFields.buyOption
            ? parseValue(updatedFields.buyOption)
            : (currentContract.buyOptionValue || currentContract.loanTerms?.buyOptionFee || 0);

      currentContract.fullSalary = rawFullSalary;
      currentContract.salary = effectiveWeeklyWage;
      currentContract.contractTime = parsedLoanDuration;
      currentContract.loanDuration = parsedLoanDuration;
      currentContract.wagePercentage = wagePct;
      if (buyOptNum > 0) {
        currentContract.buyOptionValue = buyOptNum;
      } else {
        delete currentContract.buyOptionValue;
      }

      const hasBuyOptFinal = updatedFields.loanTerms
        ? Boolean(updatedFields.loanTerms.hasBuyOption)
        : buyOptNum > 0;
      const prevLoanTerms = updatedFields.loanTerms || currentContract.loanTerms || {
        durationYears: parsedLoanDuration,
        ourWagePercentage: wagePct,
        theirWagePercentage: 100 - wagePct,
        hasBuyOption: hasBuyOptFinal,
        partnerClub: updatedFields.clubName || currentContract.fromClub || "",
      };
      const finalSellOn = hasBuyOptFinal
        ? (updatedFields.loanTerms?.sellOnPercentage ?? prevLoanTerms.sellOnPercentage)
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
      const wasAlreadyExercised =
        Boolean(currentContract.loanTerms?.buyOptionExercised) ||
        existingExercisedPurchaseIdx !== -1;

      currentContract.loanTerms = {
        ...prevLoanTerms,
        durationYears: parsedLoanDuration,
        ourWagePercentage: wagePct,
        theirWagePercentage: 100 - wagePct,
        hasBuyOption: hasBuyOptFinal,
        buyOptionFee: hasBuyOptFinal && buyOptNum > 0 ? buyOptNum : undefined,
        ...(finalSellOn !== undefined ? { sellOnPercentage: finalSellOn } : {}),
        ...(currentContract.loanTerms?.buyOptionExercised || wasAlreadyExercised
          ? {
              buyOptionExercised: true,
              buyOptionFinalized:
                currentContract.loanTerms?.buyOptionFinalized ||
                currentContract.buyOptionFinalized,
              exercisedDate: currentContract.loanTerms?.exercisedDate,
            }
          : {}),
      };
      if (hasBuyOptFinal && buyOptNum > 0) {
        currentContract.buyOptionValue = buyOptNum;
        if (existingExercisedPurchaseIdx !== -1) {
          const prevPurchase = contracts[existingExercisedPurchaseIdx];
          const nextPurchaseClauses = { ...(prevPurchase.transferClauses || {}) };
          if (finalSellOn && finalSellOn > 0) {
            nextPurchaseClauses.sellOnPercentage = finalSellOn;
          } else {
            delete nextPurchaseClauses.sellOnPercentage;
          }
          contracts[existingExercisedPurchaseIdx] = {
            ...prevPurchase,
            fromClub: updatedFields.clubName || currentContract.fromClub,
            buyValue: buyOptNum,
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
            finalPlayer.playerValue = buyOptNum;
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
        squadRole: prevDetails.squadRole || finalPlayer.squadRole || "Rodízio",
      };
      currentContract.contractDetails = newDetails;
      if (isLatestActiveContract) {
        finalPlayer.salary = effectiveWeeklyWage;
        finalPlayer.contractTime = parsedLoanDuration;
        delete finalPlayer.contractUntil;
        finalPlayer.contractDetails = newDetails;
      }
    } else if (direction === "exit" && updatedFields.transferType === "Venda") {
      if (updatedFields.salary !== undefined) {
        currentContract.salary = updatedFields.salary;
      }
      if (updatedFields.contractTime !== undefined) {
        currentContract.contractTime = updatedFields.contractTime;
      }
    }

    contracts[idx] = currentContract as Contract;
    finalPlayer.contract = contracts;

    newPlayers = newPlayers.map((p) => (p.id === playerId ? finalPlayer : p));

    return {
      ...s,
      players: newPlayers,
    };
  });

  return {
    ...career,
    updatedAt: Date.now(),
    clubData: newClubData,
  };
};
