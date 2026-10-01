type SavedLineupSlot = {
  slotId: string;
  playerId: string | null;
  playerName: string | null;
};

export type SavedLineup = {
  formation: string;
  goalkeeper: SavedLineupSlot;
  lines: SavedLineupSlot[];
  bench?: SavedLineupSlot[];
};
