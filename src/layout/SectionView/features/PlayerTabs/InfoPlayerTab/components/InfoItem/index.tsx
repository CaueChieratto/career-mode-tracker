import React from "react";
import { SectionSummaryItem } from "../../../../../ui/SectionSummaryCard";

type InfoItemProps = {
  label: string | number;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
};

const InfoItem: React.FC<InfoItemProps> = ({ label, value, icon, color }) => (
  <SectionSummaryItem label={label} value={value} icon={icon} color={color} />
);

export default InfoItem;
