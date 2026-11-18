import React from "react";
import { SectionSummaryGrid } from "../../../../../ui/SectionSummaryCard";

type InfoRowProps = {
  children: React.ReactNode;
};

const InfoRow: React.FC<InfoRowProps> = ({ children }) => (
  <SectionSummaryGrid>{children}</SectionSummaryGrid>
);

export default InfoRow;
