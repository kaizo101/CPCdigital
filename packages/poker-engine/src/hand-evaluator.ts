/// <reference path="./pokersolver.d.ts" />
import { Hand } from 'pokersolver'
import type { Card } from '@cpc/shared'

const SUIT_MAP: Record<string, string> = {
  clubs: 'c',
  diamonds: 'd',
  hearts: 'h',
  spades: 's',
}

function toPokersolverCard(card: Card): string {
  return `${card.rank}${SUIT_MAP[card.suit]}`
}

export interface HandResult {
  rank: number   // higher = better (1=high card … 9=straight flush)
  name: string   // e.g. 'Full House'
}

export function evaluateHand(holeCards: [Card, Card], communityCards: Card[]): HandResult {
  const cards = [...holeCards, ...communityCards].map(toPokersolverCard)
  const hand = Hand.solve(cards)
  return { rank: hand.rank, name: hand.descr }
}

/**
 * Given multiple hands (hole cards + shared community cards),
 * returns the indices of the winner(s). Handles ties correctly.
 */
export function findWinnerIndices(
  hands: { holeCards: [Card, Card]; communityCards: Card[] }[]
): number[] {
  const solved = hands.map(h =>
    Hand.solve([...h.holeCards, ...h.communityCards].map(toPokersolverCard))
  )
  const winners = Hand.winners(solved)
  return solved
    .map((h, i) => (winners.includes(h) ? i : -1))
    .filter(i => i !== -1)
}
