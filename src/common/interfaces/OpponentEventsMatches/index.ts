import type { Match } from "../Match";

export type OpponentGoal = {
  player: string;
  minute: string;
  playerId?: string;
  isFormerPlayer?: boolean;
};

export type OpponentAssist = {
  player: string;
  goalReference: string;
  playerId?: string;
  isFormerPlayer?: boolean;
};

export type OpponentCard = {
  player: string;
  yellow: boolean;
  yellowMinute: string;
  secondYellow: boolean;
  secondYellowMinute: string;
  red: boolean;
  redMinute: string;
  playerId?: string;
  isFormerPlayer?: boolean;
};

export type OpponentOwnGoal = {
  player: string;
  minute: string;
  playerId?: string;
  isFormerPlayer?: boolean;
};

export type OpponentEvents = {
  goals?: OpponentGoal[];
  assists?: OpponentAssist[];
  cards?: OpponentCard[];
  ownGoals?: OpponentOwnGoal[];
  cardsAuthoritative?: boolean;
};

export type MatchWithOpponentEvents = Omit<Match, "opponentEvents"> & {
  opponentEvents?: OpponentEvents;
};
