import type { GetPlayerChainInfoParams, PlayerChainInfo } from "../../types";
import { resolvePlayerChainSubstitution } from "../../../../../../helpers/substitutionChain";

export const getPlayerChainInfo = (
  params: GetPlayerChainInfoParams,
): PlayerChainInfo => {
  const result = resolvePlayerChainSubstitution(params);
  return {
    subMinute: result.subMinute,
    subOutName: result.subOutName,
  };
};
