import type { Career } from "../../../../common/interfaces/Career";
import type { ClubData } from "../../../../common/interfaces/club/clubData";
import { SeasonThemeProvider } from "../../../../contexts/SeasonThemeContext";
import type { SectionScreen } from "../../config/screens";
import AddMatchesScreen from "../../features/ClubTabs/AllMatchesTab/views/AddMatches";
import type { OptimisticUpdateData } from "../../helpers/updateSectionCareer";
import AddSquad_Player from "../../features/ClubTabs/SquadTab/views/AddSquad_Player";
import TransferPlayer from "../../features/ClubTabs/SquadTab/views/TransferPlayer";
import AddSeason_Player from "../../features/ClubTabs/StatsTab_Club/views/AddSeason_Player";
import AddTeamsToTable from "../../features/ClubTabs/TableTab/views/AddTeamsToTable";

import AddFinancialEntry from "../../features/ClubTabs/FinanceTab/views/AddFinancialEntry";
import ManageClauses from "../../features/ClubTabs/FinanceTab/views/ManageClauses";
import ProposalPlayerTerms from "../../features/ClubTabs/FinanceTab/views/ProposalPlayerTerms";
import ProposalClubClauses from "../../features/ClubTabs/FinanceTab/views/ProposalClubClauses";
import AddTransferPlayer from "../../features/ClubTabs/SquadTab/views/AddTransferPlayer";
import RenewPlayer from "../../features/ClubTabs/SquadTab/views/RenewPlayer";
import Players from "../../views/Players";

interface ActiveSectionScreenProps {
  career: Career;
  season: ClubData;
  screen: SectionScreen;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  onOpenTransfers?: (type: "arrivals" | "exit") => void;
  allCareers?: Career[];
}

export function ActiveSectionScreen({
  career,
  season,
  screen,
  onClose,
  onOpenScreen,
  onOpenTransfers,
  allCareers,
}: ActiveSectionScreenProps) {
  if (screen.key === "player") {
    return (
      <Players
        playerId={screen.playerId}
        careerId={screen.careerId}
        seasonId={screen.seasonId}
        isNotSeason={screen.isNotSeason}
        isFromGroup={screen.isFromGroup}
        groupId={screen.groupId}
        allCareers={allCareers}
        onClose={() => onClose()}
      />
    );
  }
  const renderScreen = () => {
    switch (screen.key) {
      case "addMatches":
        return (
          <AddMatchesScreen
            career={career}
            season={season}
            matchesId={screen.matchesId}
            onClose={onClose}
          />
        );

      case "addTeamsToTable":
        return (
          <AddTeamsToTable
            career={career}
            season={season}
            teamId={screen.teamId}
            teamToEdit={screen.teamToEdit}
            onClose={onClose}
          />
        );

      case "addSquadPlayer":
        return (
          <AddSquad_Player
            career={career}
            season={season}
            playerId={screen.playerId}
            onClose={onClose}
          />
        );

      case "addTransferPlayer": {
        const handleCloseAddTransfer = (
          optimisticData?: OptimisticUpdateData,
        ) => {
          onClose(optimisticData);
        };

        return (
          <AddTransferPlayer
            career={career}
            season={season}
            seasonId={screen.seasonId}
            onClose={handleCloseAddTransfer}
            onOpenScreen={onOpenScreen}
            proposalId={screen.proposalId}
            initialProposal={screen.initialProposal}
            prefill={screen.prefill}
            restoreDraft={screen.restoreDraft}
            editTransfer={screen.editTransfer}
          />
        );
      }

      case "transferPlayer": {
        const handleCloseTransferPlayer = (
          optimisticData?: OptimisticUpdateData,
        ) => {
          onClose(optimisticData);
        };

        if (screen.editTransfer?.direction === "arrivals") {
          return (
            <AddTransferPlayer
              career={career}
              season={season}
              seasonId={screen.seasonId}
              onClose={handleCloseTransferPlayer}
              onOpenScreen={onOpenScreen}
              editTransfer={screen.editTransfer}
            />
          );
        }

        return (
          <TransferPlayer
            career={career}
            season={season}
            seasonId={screen.seasonId}
            playerId={screen.playerId || screen.editTransfer?.player?.id || ""}
            proposalId={screen.proposalId}
            initialProposal={screen.initialProposal}
            mode={screen.mode}
            onClose={handleCloseTransferPlayer}
            onOpenScreen={onOpenScreen}
            prefill={screen.prefill}
            editTransfer={screen.editTransfer}
          />
        );
      }

      case "addSeasonPlayer":
        return (
          <AddSeason_Player
            career={career}
            season={season}
            playerId={screen.playerId}
            onClose={onClose}
          />
        );

      case "addFinancialEntry":
        return (
          <AddFinancialEntry
            career={career}
            season={season}
            onClose={onClose}
            onOpenScreen={onOpenScreen}
            onOpenTransfers={onOpenTransfers}
          />
        );

      case "manageClauses":
        return (
          <ManageClauses
            career={career}
            season={season}
            readOnly={screen.readOnly}
            initialTab={screen.initialTab}
            selectedPlayerName={screen.selectedPlayerName}
            selectedProposalId={screen.selectedProposalId}
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        );

      case "proposalPlayerTerms":
        return (
          <ProposalPlayerTerms
            career={career}
            season={season}
            proposalId={screen.proposalId}
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        );

      case "proposalClubClauses":
        return (
          <ProposalClubClauses
            career={career}
            season={season}
            proposalId={screen.proposalId}
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        );

      case "renewPlayer":
        return (
          <RenewPlayer
            career={career}
            season={season}
            seasonId={screen.seasonId}
            playerId={screen.playerId}
            proposalId={screen.proposalId}
            initialProposal={screen.initialProposal}
            onClose={onClose}
            onOpenScreen={onOpenScreen}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SeasonThemeProvider careerId={career.id} career={career}>
      {renderScreen()}
    </SeasonThemeProvider>
  );
}
