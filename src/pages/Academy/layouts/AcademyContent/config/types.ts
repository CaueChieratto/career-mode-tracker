import { IconType } from "react-icons";
import React from "react";

export type DashboardCardConfig = {
  id?: string;
  Icon: IconType;
  title: React.ReactNode;
  actionText?: string;
  skeletonContent: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  sortOptions?: { value: string; label: string }[];
  currentSort?: string;
  onSortChange?: (value: string) => void;
  itemCount?: number;
};
