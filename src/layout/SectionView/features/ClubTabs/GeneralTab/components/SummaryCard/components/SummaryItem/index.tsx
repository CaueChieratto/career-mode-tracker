import React from "react";
import { SectionSummaryItem } from "../../../../../../../ui/SectionSummaryCard";

type SummaryItemProps = {
  info: string;
  number: string | number;
  icon: React.ReactNode;
};

const SummaryItem = ({ info, number, icon }: SummaryItemProps) => (
  <SectionSummaryItem label={info} value={number} icon={icon} boldLabel />
);

export default SummaryItem;
