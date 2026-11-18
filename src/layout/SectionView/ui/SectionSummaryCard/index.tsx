import React from "react";
import Card from "../../../../ui/Card";
import Styles from "./SectionSummaryCard.module.css";

export type SectionSummaryCardProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export const SectionSummaryCard: React.FC<SectionSummaryCardProps> = ({
  title,
  children,
  className,
}) => (
  <Card className={className ?? Styles.card}>
    <div className={Styles.container}>
      {title && <h1 className={Styles.title}>{title}</h1>}
      {children}
    </div>
  </Card>
);

export type SectionSummaryGridProps = {
  children: React.ReactNode;
  className?: string;
};

export const SectionSummaryGrid: React.FC<SectionSummaryGridProps> = ({
  children,
  className,
}) => (
  <div className={`${Styles.grid} ${className ?? ""}`.trim()}>{children}</div>
);

export type SectionSummaryItemProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  icon: React.ReactNode;
  color?: string;
  boldLabel?: boolean;
};

export const SectionSummaryItem: React.FC<SectionSummaryItemProps> = ({
  label,
  value,
  icon,
  color,
  boldLabel,
}) => (
  <div className={Styles.item} style={color ? { color } : undefined}>
    <h1 className={boldLabel ? Styles.labelBold : Styles.label}>{label}</h1>
    <h2 className={Styles.value}>{value}</h2>
    <div className={Styles.icon}>{icon}</div>
  </div>
);

export default SectionSummaryCard;
