import { Players } from "../../interfaces/playersInfo/players";
import { Contract } from "../../interfaces/playersInfo/contract";
import { Career } from "../../interfaces/Career";
import { ClubData } from "../../interfaces/club/clubData";
import { TransferProposal } from "../../interfaces/proposals/transferProposal";
import { checkIsIncomingLoanExit } from "../../services/ServicePlayers/helpers/contractHelpers";

export interface CanEditTransferContractParams {
  player: Players;
  contract: Contract;
  contractIndex?: number;
  direction: "arrivals" | "exit" | "renewals";
  career?: Career;
  season?: ClubData;
  readOnly?: boolean;
  hasOpenScreen?: boolean;
}

export const canEditTransferContract = ({
  player,
  contract,
  direction,
  season,
  readOnly = false,
  hasOpenScreen = true,
}: CanEditTransferContractParams): boolean => {
  if (readOnly || !hasOpenScreen || season?.id === "geral") return false;
  if (direction === "renewals") return false;

  // 1. Promoção da Base não é editável
  if (direction === "arrivals" && contract.fromClub === "Base") return false;

  // 2. Chegada sintética gerada por empréstimo de volta (loan-back)
  const isLoanBackArrival = Boolean(
    direction === "arrivals" &&
      contract.leftClub &&
      !contract.isLoan &&
      contract.transferClauses?.loanBackDuration,
  );
  if (isLoanBackArrival) return false;

  // 3. Saída automática de fim de empréstimo de volta (loan-back return)
  const hasLoanBackHistory = Boolean(
    player.contract?.some((c) => Boolean(c.transferClauses?.loanBackDuration)),
  );
  const isIncomingReturn = checkIsIncomingLoanExit(player, contract, "exit");
  const isLoanBackReturnExit =
    direction === "exit" &&
    (Boolean(contract.isLoanBackReturn) ||
      (isIncomingReturn && hasLoanBackHistory));
  if (isLoanBackReturnExit) return false;

  // 4. Compra derivada de opção de compra de empréstimo (editável apenas pelo empréstimo original)
  const isFromLoanBuyOption = Boolean(
    contract.fromLoanBuyOption ||
      (!contract.isLoan &&
        direction === "arrivals" &&
        player.contract?.some(
          (c) =>
            c.isLoan &&
            (c.loanTerms?.buyOptionExercised ||
              c.loanTerms?.hasBuyOption ||
              Boolean(c.buyOptionValue)),
        )),
  );
  if (isFromLoanBuyOption) return false;

  // 5. Atleta envolvido como moeda de troca (contrapartida de uma contratação ou venda)
  const isSwapCounterpart =
    Boolean(contract.swapPlayer?.isCounterpart) ||
    (direction === "exit" &&
      Boolean(contract.swapPlayer) &&
      !contract.swapPlayer?.incomingSwap &&
      Boolean(
        season?.players?.some(
          (p) =>
            p.id !== player.id &&
            p.contract?.some(
              (c) =>
                Boolean(c.dataArrival || c.fromClub) &&
                (c.swapPlayer?.playerId === player.id ||
                  (c.swapPlayer?.playerName &&
                    player.name &&
                    c.swapPlayer.playerName.trim().toLowerCase() ===
                      player.name.trim().toLowerCase())),
            ),
        ),
      )) ||
    (direction === "arrivals" &&
      Boolean(contract.swapPlayer) &&
      Boolean(
        season?.players?.some(
          (p) =>
            p.id !== player.id &&
            p.contract?.some(
              (c) =>
                Boolean(c.dataExit || c.leftClub) &&
                Boolean(c.swapPlayer?.incomingSwap) &&
                (c.swapPlayer?.playerId === player.id ||
                  (c.swapPlayer?.playerName &&
                    player.name &&
                    c.swapPlayer.playerName.trim().toLowerCase() ===
                      player.name.trim().toLowerCase())),
            ),
        ),
      ));
  if (isSwapCounterpart) return false;

  return true;
};

export interface CanEditTransferProposalParams {
  proposal: TransferProposal;
  season?: ClubData;
  readOnly?: boolean;
  hasOpenScreen?: boolean;
}

export const canEditTransferProposal = ({
  proposal,
  season,
  readOnly = false,
  hasOpenScreen = true,
}: CanEditTransferProposalParams): boolean => {
  if (readOnly || !hasOpenScreen || season?.id === "geral") return false;
  if (proposal.overallStatus === "concluida") return false;

  const matchingPlayer = season?.players?.find(
    (p) =>
      (proposal.playerId && p.id === proposal.playerId) ||
      (proposal.playerName &&
        p.name?.trim().toLowerCase() ===
          proposal.playerName.trim().toLowerCase()),
  );

  const isOriginLoanProposal = Boolean(
    proposal.originLoanBuyOption ||
      (proposal.type === "compra" &&
        matchingPlayer?.contract?.some(
          (c) =>
            c.isLoan &&
            (c.loanTerms?.buyOptionExercised ||
              c.loanTerms?.hasBuyOption ||
              Boolean(c.buyOptionValue)),
        )),
  );

  return !isOriginLoanProposal;
};
