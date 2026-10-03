import { Match } from "../../../../common/interfaces/Match";
import {
  OpponentCard,
  OpponentEvents,
} from "../../../../common/interfaces/OpponentEventsMatches";

export interface CardCountResult {
  yellowCards: number;
  redCards: number;
}

/**
 * Pure counting function for opponent card events.
 *
 * Rules:
 * - Single yellow (yellow = true, secondYellow = false, red = false): 1 yellow, 0 red.
 * - Direct red (yellow = false, secondYellow = false, red = true): 0 yellow, 1 red.
 * - First yellow + second yellow (secondYellow = true, red = false): 2 yellows, 1 red.
 * - Yellow + direct red (yellow = true, secondYellow = false, red = true): 1 yellow, 1 red.
 * - Contradictory flags (secondYellow = true AND red = true):
 *   counted as 2 yellows and 1 red (does NOT generate two dismissals/reds for the same player).
 * - Minute is never required for counting.
 * - Does not mutate input array or objects.
 */
export function countOpponentCards(
  cards?: readonly OpponentCard[] | null,
): CardCountResult {
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return { yellowCards: 0, redCards: 0 };
  }

  let yellowCards = 0;
  let redCards = 0;

  for (const card of cards) {
    if (!card) continue;

    const isSecondYellow = Boolean(card.secondYellow);
    const isYellow = Boolean(card.yellow);
    const isRed = Boolean(card.red);

    if (isSecondYellow) {
      yellowCards += 2;
    } else if (isYellow) {
      yellowCards += 1;
    }

    if (isSecondYellow || isRed) {
      redCards += 1;
    }
  }

  return { yellowCards, redCards };
}

/**
 * Normalizes legacy array format or canonical object format into OpponentEvents object.
 */
export function normalizeOpponentEvents(
  opponentEvents?: OpponentEvents | OpponentEvents[] | null,
): OpponentEvents | undefined {
  if (!opponentEvents) return undefined;
  if (Array.isArray(opponentEvents)) {
    return opponentEvents.length > 0 ? opponentEvents[0] : undefined;
  }
  return opponentEvents;
}

/**
 * Checks whether opponent cards in opponentEvents are authoritative.
 *
 * Details are authoritative if:
 * 1. The opponentEvents explicitly has `cardsAuthoritative === true` (even when cards: [] due to all cards being removed); OR
 * 2. `cards` array is present and contains at least one item.
 *
 * Legacy matches with manual totals and no card details return false to preserve legacy data.
 */
export function hasAuthoritativeOpponentCards(
  opponentEvents?: OpponentEvents | OpponentEvents[] | null,
): boolean {
  const canonical = normalizeOpponentEvents(opponentEvents);
  if (!canonical) return false;

  if (canonical.cardsAuthoritative === true) {
    return true;
  }

  if (Array.isArray(canonical.cards) && canonical.cards.length > 0) {
    return true;
  }

  return false;
}

/**
 * Returns derived opponent card totals if details are authoritative, or null otherwise.
 */
export function getDerivedOpponentCards(
  opponentEvents?: OpponentEvents | OpponentEvents[] | null,
): CardCountResult | null {
  if (!hasAuthoritativeOpponentCards(opponentEvents)) {
    return null;
  }
  const canonical = normalizeOpponentEvents(opponentEvents);
  return countOpponentCards(canonical?.cards);
}

/**
 * Checks if the user's club is the home team for the match.
 */
export function isUserHomeTeam(
  match: Pick<Match, "homeTeam">,
  careerClubName?: string | null,
): boolean {
  if (!careerClubName) return true;
  return (
    match.homeTeam?.trim().toLowerCase() === careerClubName.trim().toLowerCase()
  );
}

/**
 * Derives the home/away card totals projection for a match.
 *
 * If opponent cards are authoritative:
 * - If user is home: opponent is away (awayYellowCards, awayRedCards derived from details, home cards preserved).
 * - If user is away: opponent is home (homeYellowCards, homeRedCards derived from details, away cards preserved).
 *
 * If not authoritative: preserves existing scalar card totals on match.
 */
export function getOpponentCardsProjection(
  match: Match,
  careerClubName?: string | null,
): {
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
} {
  const derived = getDerivedOpponentCards(match.opponentEvents);
  if (!derived) {
    return {
      homeYellowCards: match.homeYellowCards,
      awayYellowCards: match.awayYellowCards,
      homeRedCards: match.homeRedCards,
      awayRedCards: match.awayRedCards,
    };
  }

  const userHome = isUserHomeTeam(match, careerClubName);

  if (userHome) {
    return {
      homeYellowCards: match.homeYellowCards,
      awayYellowCards: derived.yellowCards,
      homeRedCards: match.homeRedCards,
      awayRedCards: derived.redCards,
    };
  } else {
    return {
      homeYellowCards: derived.yellowCards,
      awayYellowCards: match.awayYellowCards,
      homeRedCards: derived.redCards,
      awayRedCards: match.awayRedCards,
    };
  }
}
