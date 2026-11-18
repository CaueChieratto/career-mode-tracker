import { Career } from "../../interfaces/Career";

export const buildCareerUpdates = (updates: {
  colorsTeams?: string[];
  fileDataUrl?: string;
  clubName?: string;
  managerName?: string;
  createdAt?: Date;
  updatedAt?: number;
}): Partial<Career> => {
  const updateObj: Partial<Career> = {
    updatedAt: updates.updatedAt ?? Date.now(),
  };
  if (updates.colorsTeams) updateObj.colorsTeams = updates.colorsTeams;
  if (updates.fileDataUrl) updateObj.teamBadge = updates.fileDataUrl;
  if (updates.clubName) updateObj.clubName = updates.clubName;
  if (updates.managerName) updateObj.managerName = updates.managerName;
  if (updates.createdAt) updateObj.createdAt = updates.createdAt;
  return updateObj;
};
