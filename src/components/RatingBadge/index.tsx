import React from "react";
import { UseRatingColor } from "../../common/hooks/Colors/GetOverallColor";
import Styles from "./RatingBadge.module.css";

export type RatingBadgeVariant = "default" | "compact" | "table";

export type RatingBadgeProps = {
  rating: number | string;
  displayValue?: number | string;
  variant?: RatingBadgeVariant;
  customColor?: string;
  className?: string;
  style?: React.CSSProperties;
};

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  rating,
  displayValue,
  variant = "default",
  customColor,
  className,
  style,
}) => {
  const numericRating = Number(rating);
  const bgColor =
    customColor ?? UseRatingColor(Number.isNaN(numericRating) ? 0 : numericRating);

  const formattedText =
    displayValue !== undefined
      ? displayValue
      : !Number.isNaN(numericRating) && numericRating % 1 === 0
        ? numericRating.toString()
        : rating;

  const variantClass =
    variant === "compact"
      ? Styles.compact
      : variant === "table"
        ? Styles.table
        : Styles.default;

  return (
    <span
      className={`${Styles.badge} ${variantClass} ${className ?? ""}`.trim()}
      style={{ backgroundColor: bgColor, ...style }}
      data-testid="rating-badge"
    >
      {formattedText}
    </span>
  );
};

export default RatingBadge;
