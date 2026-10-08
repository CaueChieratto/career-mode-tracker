import { UseRatingColor } from "../../../../../../../common/hooks/Colors/GetOverallColor";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { PlayerInfo } from "../../../../../../../components/PlayerInfo";
import Styles from "./PlayerStatRow.module.css";

type PlayerStatRowProps = {
  player: Players;
  value: string | number;
  description?: string;
  isRating?: boolean;
};

export const PlayerStatRow = ({
  player,
  value,
  description,
  isRating,
}: PlayerStatRowProps) => {
  const formattedValue =
    isRating && Number(value) % 1 === 0 ? Number(value).toString() : value;

  const renderValue = () => {
    if (typeof value === "number") {
      return <span className={Styles.stat_number}>{value}</span>;
    }
    const str = String(value).trim();
    const match = str.match(/^([0-9.,]+|-)\s*(.*)$/);
    if (match) {
      const num = match[1];
      const unit = match[2];
      return (
        <>
          <span className={Styles.stat_number}>{num}</span>
          {unit && <span className={Styles.stat_unit}> {unit}</span>}
        </>
      );
    }
    return <span className={Styles.stat_number}>{str}</span>;
  };

  return (
    <section className={Styles.player}>
      <PlayerInfo
        name={player.name}
        position={player.position}
        shirtNumber={player.shirtNumber}
        age={player.age}
        nation={player.nation}
      />

      <footer className={Styles.stat_block}>
        {isRating ? (
          <div
            className={Styles.ratingBadge}
            style={{ backgroundColor: UseRatingColor(+value) }}
          >
            {formattedValue}
          </div>
        ) : (
          <div className={Styles.stat_content}>
            <h3 className={Styles.data_title_stat}>{renderValue()}</h3>
            {description && (
              <span className={Styles.stat_description}>{description}</span>
            )}
          </div>
        )}
      </footer>
    </section>
  );
};
