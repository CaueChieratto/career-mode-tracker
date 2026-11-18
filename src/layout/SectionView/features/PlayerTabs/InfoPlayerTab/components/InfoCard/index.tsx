import React from "react";
import { SectionSummaryCard } from "../../../../../ui/SectionSummaryCard";

type InfoCardProps = {
  title: string;
  children: React.ReactNode;
};

const InfoCard: React.FC<InfoCardProps> = ({ title, children }) => (
  <SectionSummaryCard title={title}>{children}</SectionSummaryCard>
);

export default InfoCard;
