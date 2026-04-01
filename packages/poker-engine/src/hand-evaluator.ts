import type { Card } from '@poker/shared'

export interface HandResult {
  rank: number   // higher = better hand
  name: string   // e.g. 'Full House'
  cards: Card[]  // best 5 cards used
}

/**
 * Evaluates the best 5-card hand from hole cards + community cards.
 *
 * TODO 0.3.0-alpha.1: integrate pokersolver or implement evaluation.
 * Needs to handle: kicker rules, split pots on equal hands, all hand rankings.
 */
export function evaluateHand(_holeCards: [Card, Card], _communityCards: Card[]): HandResult {
  throw new Error('Not implemented — planned for 0.3.0-alpha.1')
}

export function compareHands(a: HandResult, b: HandResult): number {
  return a.rank - b.rank
}
