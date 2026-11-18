import { TableRowData } from "../../../common/interfaces/Table";
import { Players } from "../../../common/interfaces/playersInfo/players";
import { TransferProposal } from "../../../common/interfaces/proposals/transferProposal";

export interface TransferClausePrefill {
  mode: "buyback" | "firstRefusal" | "loanBuyOption";
  player: Players;
  fromClub: string;
  buyValue?: string | number;
  sourceSeasonId?: string;
  sourcePlayerId?: string;
  sourceContractIndex?: number;
}

export type SectionScreen =
  | {
      key: "addMatches";
      matchesId?: string;
      seasonId?: string;
    }
  | {
      key: "addTeamsToTable";
      teamId?: string;
      seasonId?: string;
      teamToEdit?: TableRowData;
    }
  | {
      key: "addSquadPlayer";
      playerId?: string;
      seasonId?: string;
    }
  | {
      key: "addTransferPlayer";
      seasonId?: string;
      proposalId?: string;
      initialProposal?: TransferProposal;
      prefill?: TransferClausePrefill;
      restoreDraft?: boolean;
      returnToScreen?: SectionScreen;
      editTransfer?: {
        player: Players;
        contract: NonNullable<Players["contract"]>[number];
        contractIndex: number;
      };
    }
  | {
      key: "transferPlayer";
      playerId: string;
      proposalId?: string;
      initialProposal?: TransferProposal;
      mode?: "transfer" | "loan";
      seasonId?: string;
      returnToScreen?: SectionScreen;
      prefill?: {
        sellValue?: string;
        lockSellValue?: boolean;
        toClub?: string;
        lockToClub?: boolean;
        lockTransferType?: boolean;
        sourceSeasonId?: string;
        sourcePlayerId?: string;
        sourceContractIndex?: number;
        mode?: "buyback" | "release_clause" | "transfer" | "loan";
      };
      editTransfer?: {
        player: Players;
        contract: NonNullable<Players["contract"]>[number];
        contractIndex: number;
        direction?: "arrivals" | "exit";
      };
    }
  | {
      key: "addSeasonPlayer";
      playerId?: string;
      seasonId?: string;
    }
  | {
      key: "addFinancialEntry";
      seasonId?: string;
    }
  | {
      key: "manageClauses";
      seasonId?: string;
      readOnly?: boolean;
      initialTab?: "renewals" | "arrivals" | "exit";
      selectedPlayerName?: string;
      selectedProposalId?: string;
    }
  | {
      key: "proposalPlayerTerms";
      proposalId: string;
      seasonId?: string;
    }
  | {
      key: "proposalClubClauses";
      proposalId: string;
      seasonId?: string;
    }
  | {
      key: "renewPlayer";
      playerId: string;
      proposalId?: string;
      initialProposal?: TransferProposal;
      seasonId?: string;
      returnToScreen?: SectionScreen;
    }
  | {
      key: "player";
      playerId: string;
      careerId: string;
      seasonId?: string;
      isNotSeason?: boolean;
      isFromGroup?: boolean;
      groupId?: string;
    };
