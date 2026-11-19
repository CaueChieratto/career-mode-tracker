import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../Firebase";
import { TransferProposal } from "../../interfaces/proposals/transferProposal";
import { Players } from "../../interfaces/playersInfo/players";
import { Contract } from "../../interfaces/playersInfo/contract";
import { ContractDetails } from "../../interfaces/playersInfo/contractClauses";
import { SellPlayerOptions } from "../ServicePlayers/contractServices/types";
import { PlayersContractService } from "../ServicePlayers/PlayersContractService";
import { isNextSeasonTiming } from "../ServicePlayers/helpers/transferTimingHelpers";
import {
  checkIsIncomingLoanExit,
  hasDefinedLoanBuyOption,
} from "../ServicePlayers/helpers/contractHelpers";
import { parseBrasilDate, parseFullBrasilDate } from "../../utils/Date";
import { mergeClubAndPlayerBonuses } from "../../helpers/contractPlayerClauses";
import { toast } from "../ToastService";
import { ServiceProposals } from "./index";

export interface FinalizeProposalParams {
  careerId: string;
  seasonId: string;
  proposalId: string;
  agreementDate?: string;
}

export class ProposalAlreadyFinalizedError extends Error {
  code = "PROPOSAL_ALREADY_FINALIZED";
  constructor(message = "Esta proposta já foi finalizada anteriormente.") {
    super(message);
    this.name = "ProposalAlreadyFinalizedError";
  }
}

export class PlayerIneligibleError extends Error {
  code = "PLAYER_INELIGIBLE";
  constructor(message: string) {
    super(message);
    this.name = "PlayerIneligibleError";
  }
}

const getProposalDocPath = (
  uid: string,
  careerId: string,
  seasonId: string,
  proposalId: string,
) => `users/${uid}/careers/${careerId}/seasons/${seasonId}/proposals/${proposalId}`;

const getTodayFormatted = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

export const ProposalFinalizationService = {
  /**
   * Executa a homologação atômica da proposta com checagem de concorrência,
   * validação de elegibilidade e cancelamento automático de propostas concorrentes.
   */
  finalizeProposal: async ({
    careerId,
    seasonId,
    proposalId,
    agreementDate,
  }: FinalizeProposalParams): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const proposalPath = getProposalDocPath(
      user.uid,
      careerId,
      seasonId,
      proposalId,
    );
    const proposalRef = doc(db, proposalPath);

    // Leitura inicial prévia da proposta para identificar atleta e buscar concorrentes
    const initialSnap = await getDoc(proposalRef);
    if (!initialSnap.exists()) {
      throw new Error("Proposta não encontrada.");
    }

    const initialProposal = initialSnap.data() as TransferProposal;
    if (initialProposal.overallStatus === "concluida") {
      throw new ProposalAlreadyFinalizedError(
        "Esta proposta já foi finalizada anteriormente.",
      );
    }
    if (
      initialProposal.overallStatus === "rejeitada" ||
      initialProposal.overallStatus === "cancelada"
    ) {
      throw new Error(
        `Não é possível finalizar uma proposta com status '${initialProposal.overallStatus}'.`,
      );
    }

    // Buscar propostas concorrentes para o mesmo atleta na temporada ativa
    let competingProposals: TransferProposal[] = [];
    if (initialProposal.playerId) {
      try {
        const allSeasonProposals = await ServiceProposals.getProposalsBySeason(
          careerId,
          seasonId,
        );
        competingProposals = allSeasonProposals.filter(
          (p) =>
            p.id !== proposalId &&
            p.playerId === initialProposal.playerId &&
            p.overallStatus !== "concluida" &&
            p.overallStatus !== "cancelada" &&
            p.overallStatus !== "rejeitada",
        );
      } catch (err) {
        console.warn("Aviso ao buscar propostas concorrentes:", err);
      }
    }

    const effectiveAgreementDate =
      agreementDate || initialProposal.agreementDate || getTodayFormatted();

    // 1. Validar elegibilidade do atleta
    if (initialProposal.playerId) {
      const playerRef = doc(
        db,
        `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players/${initialProposal.playerId}`,
      );
      const playerSnap = await getDoc(playerRef);

      let activePlayer: Players | undefined = playerSnap.exists()
        ? (playerSnap.data() as Players)
        : undefined;

      // Somente busca carreira legada se o jogador não existir na subcoleção moderna E for operação de saída/renovação/opção de compra
      if (
        !activePlayer &&
        (initialProposal.originLoanBuyOption ||
          ["venda", "emprestimo_saida", "renovacao"].includes(initialProposal.type))
      ) {
        const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
        const careerSnap = await getDoc(careerRef);
        const careerData = careerSnap.exists()
          ? (careerSnap.data() as {
              clubData?: Array<{ id: string; players?: Players[] }>;
            })
          : null;
        const legacySeason = careerData?.clubData?.find((s) => s.id === seasonId);
        activePlayer = legacySeason?.players?.find(
          (p) => p.id === initialProposal.playerId,
        );
      }

      if (initialProposal.originLoanBuyOption) {
        const isEndedIncomingLoan = Boolean(
          activePlayer?.sell &&
            !activePlayer?.incomingLoan &&
            activePlayer?.contract?.some(
              (c) =>
                hasDefinedLoanBuyOption(c) &&
                checkIsIncomingLoanExit(activePlayer, c, "exit"),
            ),
        );
        if (
          !activePlayer ||
          (activePlayer.sell &&
            !activePlayer.incomingLoan &&
            !isEndedIncomingLoan)
        ) {
          throw new PlayerIneligibleError(
            "Operação cancelada: o atleta não faz mais parte do elenco.",
          );
        }
        const isAlreadyFinalized = Boolean(
          activePlayer.contract?.some(
            (c) => c.fromLoanBuyOption && !c.isLoan,
          ),
        );
        if (isAlreadyFinalized) {
          throw new PlayerIneligibleError(
            "Operação cancelada: a opção de compra deste atleta já foi finalizada.",
          );
        }
        const hasEligibleLoanBuyOption = Boolean(
          activePlayer.contract?.some((c) => hasDefinedLoanBuyOption(c)),
        );
        if (!hasEligibleLoanBuyOption) {
          throw new PlayerIneligibleError(
            "Operação cancelada: este atleta não possui opção de compra definida no contrato de empréstimo.",
          );
        }
      } else if (["venda", "emprestimo_saida", "renovacao"].includes(initialProposal.type)) {
        if (!activePlayer || activePlayer.sell) {
          throw new PlayerIneligibleError(
            "Operação cancelada: o atleta não faz mais parte do elenco.",
          );
        }
        if (initialProposal.type === "emprestimo_saida" && activePlayer.loan) {
          throw new PlayerIneligibleError(
            "Operação cancelada: o atleta já está emprestado.",
          );
        }
      } else if (["compra", "emprestimo_entrada"].includes(initialProposal.type)) {
        const isLoanee = Boolean(
          activePlayer &&
            (activePlayer.incomingLoan ||
              activePlayer.contract?.some(
                (c) =>
                  c.isLoan &&
                  !c.leftClub &&
                  c.leftClub !== "Fim de Empréstimo",
              )),
        );

        if (activePlayer && !activePlayer.sell) {
          if (initialProposal.type === "emprestimo_entrada" || !isLoanee) {
            throw new PlayerIneligibleError(
              "Operação cancelada: o atleta já pertence ao elenco nesta temporada.",
            );
          }
        }
      }
    }

    // 2. Validar atleta envolvido na troca (se houver)
    if (initialProposal.clubNegotiation?.swapPlayer) {
      const swap = initialProposal.clubNegotiation.swapPlayer;
      if (swap.playerId) {
        const swapRef = doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players/${swap.playerId}`,
        );
        const swapSnap = await getDoc(swapRef);
        if (swapSnap.exists() && (swapSnap.data() as Players).sell) {
          throw new PlayerIneligibleError(
            "Operação cancelada: o atleta envolvido na troca não está mais disponível no elenco.",
          );
        }
      }
    }

    // 3. Atualizar proposta alvo para "concluida"
    const now = Date.now();
    await updateDoc(proposalRef, {
      overallStatus: "concluida",
      agreementDate: effectiveAgreementDate,
      finalizedAt: now,
      updatedAt: now,
    });

    // 4. Cancelar propostas concorrentes para o mesmo atleta
    for (const comp of competingProposals) {
      try {
        const compRef = doc(
          db,
          getProposalDocPath(user.uid, careerId, seasonId, comp.id),
        );
        await updateDoc(compRef, {
          overallStatus: "cancelada",
          cancelReason: "Atleta negociado em outra proposta",
          updatedAt: now,
        });
      } catch {
        // ignora falhas pontuais em propostas concorrentes
      }
    }

    // 2. Delegar operação definitiva ao serviço canônico correspondente
    const proposal = initialProposal;
    try {
      if (proposal.type === "compra" || proposal.type === "emprestimo_entrada") {
        const isLoan = proposal.type === "emprestimo_entrada";
        const wagePctNum = isLoan
          ? proposal.clubNegotiation?.loanTerms?.ourWagePercentage
          : undefined;
        const rawSalary = proposal.playerNegotiation?.weeklyWage ?? 0;
        const duration =
          proposal.playerNegotiation?.durationYears ??
          (isLoan
            ? proposal.clubNegotiation?.loanTerms?.durationYears ?? 1
            : 1);

        const rawWageAdjustment = proposal.playerNegotiation?.wageAdjustment;
        const wageAdjustment =
          rawWageAdjustment &&
          (rawWageAdjustment.direction === "Aumentar" || rawWageAdjustment.direction === "Diminuir")
            ? {
                ...rawWageAdjustment,
                baseSalary: rawWageAdjustment.baseSalary ?? rawSalary,
              }
            : undefined;

        const contractDetails: ContractDetails = {
          durationYears: duration,
          squadRole: proposal.playerNegotiation?.squadRole || "Rodízio",
          weeklyWage: rawSalary,
          signingBonus: proposal.playerNegotiation?.signingBonus,
          agentFee: proposal.playerNegotiation?.agentFee,
          releaseClause: proposal.playerNegotiation?.releaseClause,
          wageAdjustment,
          performanceBonuses: proposal.playerNegotiation?.performanceBonuses,
        };

        const parsedDate =
          parseFullBrasilDate(effectiveAgreementDate) ||
          parseBrasilDate(effectiveAgreementDate, new Date().getFullYear());
        const arrivalDate =
          parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

        const mergedBonuses = mergeClubAndPlayerBonuses(
          proposal.clubNegotiation?.bonuses,
          proposal.playerNegotiation?.performanceBonuses,
        );

        const contractItem: Contract = {
          buyValue: isLoan ? 0 : proposal.clubNegotiation?.transferFee ?? 0,
          sellValue: 0,
          fromClub: proposal.clubNegotiation?.partnerClub || "",
          leftClub: "",
          dataArrival: arrivalDate,
          timing: proposal.timing || "Imediata",
          isLoan,
          loanDuration: duration,
          wagePercentage: wagePctNum,
          contractDetails,
          contractClauses: {
            ...(proposal.playerNegotiation?.releaseClause
              ? { releaseClause: proposal.playerNegotiation.releaseClause }
              : {}),
            ...(wageAdjustment
              ? { wageAdjustment }
              : {}),
          },
          ...(proposal.playerNegotiation?.releaseClause
            ? { releaseClause: String(proposal.playerNegotiation.releaseClause) }
            : {}),
          salary: isLoan
            ? wagePctNum !== undefined
              ? rawSalary * (wagePctNum / 100)
              : rawSalary
            : rawSalary,
          contractTime: duration,
          ...(proposal.originLoanBuyOption
            ? { fromLoanBuyOption: true, buyOptionFinalized: true }
            : {}),
          ...(proposal.clubNegotiation?.installments
            ? { installments: proposal.clubNegotiation.installments }
            : {}),
          ...(!isLoan &&
          (proposal.clubNegotiation?.sellOnPercentage ||
            proposal.clubNegotiation?.buybackValue ||
            proposal.clubNegotiation?.firstRefusal ||
            proposal.clubNegotiation?.loanBackDuration)
            ? {
                transferClauses: {
                  sellOnPercentage: proposal.clubNegotiation.sellOnPercentage,
                  buybackValue: proposal.clubNegotiation.buybackValue,
                  firstRefusal: proposal.clubNegotiation.firstRefusal,
                  loanBackDuration: proposal.clubNegotiation.loanBackDuration,
                },
              }
            : isLoan &&
                (proposal.clubNegotiation?.buybackValue ||
                  proposal.clubNegotiation?.firstRefusal)
              ? {
                  transferClauses: {
                    buybackValue: proposal.clubNegotiation.buybackValue,
                    firstRefusal: proposal.clubNegotiation.firstRefusal,
                  },
                }
              : {}),
          ...(mergedBonuses.length > 0 ? { bonuses: mergedBonuses } : {}),
          ...(proposal.clubNegotiation?.swapPlayer
            ? { swapPlayer: proposal.clubNegotiation.swapPlayer }
            : {}),
          ...(isLoan && proposal.clubNegotiation?.loanTerms
            ? { loanTerms: proposal.clubNegotiation.loanTerms }
            : {}),
        };

        const playerData: Partial<Players> = {
          ...(proposal.playerId ? { id: proposal.playerId } : {}),
          name: proposal.playerName,
          overall: proposal.playerOverall || undefined,
          potential: proposal.playerOverall || undefined,
          sector: proposal.playerSector || "Ataque",
          position: proposal.playerPosition || "ATA",
          age: proposal.playerAge || undefined,
          birthDate: proposal.playerBirthDate,
          nation: proposal.playerNation || "BRA",
          shirtNumber: proposal.shirtNumber || "",
          height: proposal.height,
          weight: proposal.weight,
          playerValue:
            proposal.playerValue || proposal.clubNegotiation?.transferFee || 0,
          salary: isLoan
            ? wagePctNum !== undefined
              ? rawSalary * (wagePctNum / 100)
              : rawSalary
            : rawSalary,
          contractTime: duration,
          contractUntil: isLoan
            ? undefined
            : proposal.playerNegotiation?.contractUntil,
          captain: false,
          buy: !isLoan && !isNextSeasonTiming(proposal.timing),
          incomingLoan: isLoan,
          squadRole: proposal.playerNegotiation?.squadRole || "Rodízio",
          contractDetails,
          playedWithUs: proposal.playedWithUs,
          isAcademy: proposal.isAcademy,
        };

        await PlayersContractService.signPlayerWithTerms({
          careerId,
          seasonId,
          player: playerData,
          contract: contractItem,
          swapPlayer: proposal.clubNegotiation?.swapPlayer,
        });
      } else if (proposal.type === "venda") {
        const sellValueStr = String(proposal.clubNegotiation?.transferFee ?? 0);
        const toClub = proposal.clubNegotiation?.partnerClub || "";
        const options: SellPlayerOptions = {
          timing: proposal.timing,
          installments: proposal.clubNegotiation?.installments,
          transferClauses: {
            sellOnPercentage: proposal.clubNegotiation?.sellOnPercentage,
            buybackValue: proposal.clubNegotiation?.buybackValue,
            firstRefusal: proposal.clubNegotiation?.firstRefusal,
            loanBackDuration: proposal.clubNegotiation?.loanBackDuration,
          },
          bonuses: proposal.clubNegotiation?.bonuses,
          swapPlayer: proposal.clubNegotiation?.swapPlayer,
          swapPlayerNegotiation: proposal.playerNegotiation,
        };

        await PlayersContractService.sellPlayerFromSeason(
          careerId,
          seasonId,
          proposal.playerId,
          sellValueStr,
          toClub,
          effectiveAgreementDate,
          options,
        );
      } else if (proposal.type === "emprestimo_saida") {
        const buyOptionStr =
          proposal.clubNegotiation?.loanTerms?.hasBuyOption &&
          proposal.clubNegotiation?.loanTerms?.buyOptionFee
            ? String(proposal.clubNegotiation.loanTerms.buyOptionFee)
            : "";
        const toClub = proposal.clubNegotiation?.partnerClub || "";
        const durationStr = String(
          proposal.clubNegotiation?.loanTerms?.durationYears ?? 1,
        );
        const wagePctStr = String(
          proposal.clubNegotiation?.loanTerms?.theirWagePercentage ?? 100,
        );

        await PlayersContractService.loanPlayerFromSeason(
          careerId,
          seasonId,
          proposal.playerId,
          buyOptionStr,
          toClub,
          effectiveAgreementDate,
          durationStr,
          wagePctStr,
          proposal.clubNegotiation?.loanTerms,
        );
      } else if (proposal.type === "renovacao") {
        await PlayersContractService.createPlayerRenewal({
          careerId,
          seasonId,
          playerId: proposal.playerId,
          salary: String(proposal.playerNegotiation?.weeklyWage ?? 0),
          contractUntil: proposal.playerNegotiation?.contractUntil,
          contractTime: proposal.playerNegotiation?.durationYears,
          signingBonus: proposal.playerNegotiation?.signingBonus
            ? String(proposal.playerNegotiation.signingBonus)
            : undefined,
          releaseClause: proposal.playerNegotiation?.releaseClause
            ? String(proposal.playerNegotiation.releaseClause)
            : undefined,
          wageAdjustment: proposal.playerNegotiation?.wageAdjustment,
          bonuses: proposal.playerNegotiation?.performanceBonuses,
        });
      }

      const isLoan =
        proposal.type === "emprestimo_entrada" ||
        proposal.type === "emprestimo_saida";
      const isRenewal = proposal.type === "renovacao";

      toast.success(
        isRenewal
          ? "Renovação contratual finalizada e efetivada com sucesso!"
          : isLoan
            ? "Empréstimo finalizado e efetivado com sucesso!"
            : "Transferência finalizada e efetivada com sucesso!",
      );
    } catch (contractError) {
      console.error(
        "Erro ao executar operação definitiva de contrato:",
        contractError,
      );
      toast.error(
        contractError instanceof Error
          ? contractError.message
          : "Erro ao efetivar contrato definitivo.",
      );
      throw contractError;
    }
  },
};
