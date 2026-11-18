import { Career } from "../../../../../../../common/interfaces/Career";
import { TableColumn } from "../../helpers/buildTableColumns";
import { getPositionClass } from "../../helpers/getPositionClass";
import { handleBadgeError } from "../../helpers/handleBadgeError";
import Styles from "../../TableTab.module.css";
import { TableRowData } from "../../../../../../../common/interfaces/Table";

type TableRowProps = {
  row: TableRowData;
  columns: TableColumn[];
  career: Career;
  activeMode: string;
  onClick?: () => void;
};

export const TableRow = ({
  row,
  columns,
  career,
  activeMode,
  onClick,
}: TableRowProps) => {
  const isCareerTeam = row.name === career.clubName;
  const displayBadge =
    isCareerTeam && career.teamBadge ? career.teamBadge : row.badge;

  return (
    <tr
      id={row.id ? `table-row-${row.id}` : undefined}
      data-team-id={row.id || undefined}
      className={isCareerTeam ? Styles.highlight_row : Styles.row}
      onClick={onClick}
    >
      <td className={Styles.align_left}>
        <div
          className={`${Styles.position_badge} ${getPositionClass(row.zone)}`}
        >
          {row.position}
        </div>
      </td>
      <td className={Styles.align_left}>
        <div className={Styles.team_cell}>
          {activeMode === "Resumido" && displayBadge && (
            <div className={Styles.wrapper_img}>
              <img
                src={displayBadge}
                alt={row.name}
                className={Styles.team_logo}
                onError={handleBadgeError}
              />
            </div>
          )}
          <span>{row.name}</span>
        </div>
      </td>
      {columns.map(
        (column) =>
          column.show && <td key={column.key}>{column.render(row)}</td>,
      )}
    </tr>
  );
};
