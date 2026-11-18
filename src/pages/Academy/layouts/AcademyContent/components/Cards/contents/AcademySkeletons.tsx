import React from "react";
import { SkeletonButton, SkeletonItem } from "../../../ui/SkeletonCard";

export const AcademyPlayersSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonItem key={i} index={i} />
    ))}
  </>
);

export const AcademyTournamentsSkeleton: React.FC = () => (
  <>
    <SkeletonItem index={0} />
    <SkeletonItem index={1} />
    <SkeletonItem index={2} />
  </>
);

export const AcademyFeedSkeleton: React.FC = () => (
  <>
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonItem key={i} index={i} />
    ))}
  </>
);

export const AcademyActionsSkeleton: React.FC = () => (
  <>
    <SkeletonButton />
    <SkeletonButton />
    <SkeletonButton />
  </>
);
