import { FaTrash } from "react-icons/fa";
import { PlayerCircle } from "../../../../../../../../components/PlayerCircle";
import { AcademyPlayers } from "../../../../../../../../common/interfaces/AcademyData";
import { InfoItem } from "../../../../ui/InfoItem";
import { AcademyListItem } from "../../../AcademyListItem";

type PlayerItemProps = {
  playersAcademy: AcademyPlayers;
  onClick?: () => void;
  isSelected?: boolean;
  onDelete?: () => void;
};

export const PlayerItem = ({
  playersAcademy,
  isSelected,
  onClick,
  onDelete,
}: PlayerItemProps) => {
  return (
    <AcademyListItem
      isSelected={isSelected}
      onClick={onClick}
      iconNode={<PlayerCircle shirtNumber={playersAcademy.shirtNumber} />}
      title={playersAcademy.name}
      subtitle={`${playersAcademy.position} - ${playersAcademy.age} anos`}
      rightContent={
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              alignItems: "flex-end",
            }}
          >
            <InfoItem isTitle> OVR {playersAcademy.overall}</InfoItem>
            <InfoItem> POT {playersAcademy.potential}</InfoItem>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaTrash size={16} />
            </button>
          )}
        </div>
      }
    />
  );
};
