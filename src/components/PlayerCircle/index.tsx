import { ReactNode } from "react";
import Styles from "./PlayerCircle.module.css";
import { MdPerson } from "react-icons/md";
import { UseOverallColor } from "../../common/hooks/Colors/GetOverallColor";

export type PlayerCircleProps = {
  shirtNumber?: number | string | undefined;
  children?: ReactNode;
  isSquad?: boolean;
  overall?: number;
  showOverall?: boolean;
};

export const PlayerCircle = ({
  shirtNumber,
  children,
  isSquad,
  overall,
  showOverall,
}: PlayerCircleProps) => {
  const shouldRenderOverall =
    overall !== undefined && overall > 0 && showOverall !== false;

  if (shouldRenderOverall) {
    const overallColor = UseOverallColor(overall);
    return (
      <div
        className={isSquad ? Styles.player_circle_squad : Styles.player_circle}
        style={{
          backgroundColor: overallColor,
          borderColor: overallColor,
        }}
      >
        <span
          className={Styles.shirt_number_center}
          style={{ color: "#ffffff", fontWeight: "bold" }}
        >
          {overall}
        </span>
        {children}
      </div>
    );
  }

  return (
    <div
      className={isSquad ? Styles.player_circle_squad : Styles.player_circle}
    >
      {shirtNumber ? (
        <span className={Styles.shirt_number_center}>{shirtNumber}</span>
      ) : (
        <MdPerson className={Styles.player_icon} />
      )}

      {children}
    </div>
  );
};

export default PlayerCircle;

