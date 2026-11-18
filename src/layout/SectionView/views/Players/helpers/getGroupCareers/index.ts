import type { Career } from "../../../../../../common/interfaces/Career";
import type { GetGroupCareersParams } from "../../types";

export const getGroupCareers = ({
  career,
  allCareers,
  isFromGroup,
  urlGroupId,
}: GetGroupCareersParams): Career[] => {
  if (!career) {
    return [];
  }

  const activeGroupId = career.groupId || urlGroupId;

  if (!activeGroupId || !isFromGroup) {
    return [career];
  }

  const siblings = allCareers.filter((item) => item.groupId === activeGroupId);

  return siblings.length > 0 ? siblings : [career];
};

