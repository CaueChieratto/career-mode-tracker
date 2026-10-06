export interface OpponentPlayer {
  id: string;
  name: string;
  team?: string;
  careerId?: string;
  groupId?: string | null;
  createdAt?: number;
}

