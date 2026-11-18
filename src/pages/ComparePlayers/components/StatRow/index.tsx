import Styles from "./StatRow.module.css";
import { RatingBadge } from "../../../../components/RatingBadge";

interface StatRowProps {
  label: string;
  val1: React.ReactNode;
  val2: React.ReactNode;
  isRating?: boolean;
}

const renderRatingOrValue = (value: React.ReactNode, isRating: boolean) => {
  if (
    isRating &&
    value !== "-" &&
    (typeof value === "number" || typeof value === "string")
  ) {
    return (
      <RatingBadge rating={value} displayValue={value} variant="compact" />
    );
  }
  return value || "-";
};

export const StatRow = ({
  label,
  val1,
  val2,
  isRating = false,
}: StatRowProps) => (
  <div className={Styles.statRow}>
    <div className={Styles.statValue}>
      {renderRatingOrValue(val1, isRating)}
    </div>
    <div className={Styles.statLabel}>{label}</div>
    <div className={Styles.statValue}>
      {renderRatingOrValue(val2, isRating)}
    </div>
  </div>
);
