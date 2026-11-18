import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { TableRowData } from "../../../../../../../common/interfaces/Table";
import { AddTeamsToTableProvider } from "./contexts/AddTeamsToTableContext";
import { AddTeamsToTableScreen } from "./screens/AddTeamsToTableScreen";
import { OptimisticTableData } from "./types";

export type { OptimisticTableData };

type AddTeamsToTableProps = {
  career: Career;
  season: ClubData;
  teamId?: string;
  teamToEdit?: TableRowData;
  onClose: (data?: OptimisticTableData) => void;
};

export default function AddTeamsToTable(props: AddTeamsToTableProps) {
  return (
    <AddTeamsToTableProvider {...props}>
      <AddTeamsToTableScreen />
    </AddTeamsToTableProvider>
  );
}
