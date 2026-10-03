import type { PlayerIdentity } from "../../types";

const normalize = (value?: string): string =>
  (value || "").trim().toLowerCase();

export const matchesPlayerIdentity = (
  player: PlayerIdentity,
  referencePlayer: PlayerIdentity,
): boolean => {
  const nameA = normalize(player.name);
  const nameB = normalize(referencePlayer.name);
  if (!nameA || !nameB || nameA !== nameB) return false;

  const nationA = normalize(player.nation || player.nationality);
  const nationB = normalize(
    referencePlayer.nation || referencePlayer.nationality,
  );
  return !nationA || !nationB || nationA === nationB;
};
