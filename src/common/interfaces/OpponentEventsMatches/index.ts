import { Match } from "../Match";

export type OpponentGoal = {
  player: string;
  minute: string;
};

export type OpponentAssist = {
  player: string;
  goalReference: string;
};

type OpponentCard = {
  player: string;
  yellow: boolean;
  yellowMinute: string;
  secondYellow: boolean;
  secondYellowMinute: string;
  red: boolean;
  redMinute: string;
};

type OpponentOwnGoal = {
  player: string;
  minute: string;
};

export type OpponentEvents = {
  goals?: OpponentGoal[];
  assists?: OpponentAssist[];
  cards?: OpponentCard[];
  ownGoals?: OpponentOwnGoal[];
};

export type MatchWithOpponentEvents = Omit<Match, "opponentEvents"> & {
  opponentEvents?: OpponentEvents;
};
