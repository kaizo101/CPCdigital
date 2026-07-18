/// <reference path="./pokersolver.d.ts" />
import pokersolver from 'pokersolver'
const { Hand } = pokersolver
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
  name: string   // e.g. 'Full House' or 'A High'
}

export function evaluateHand(holeCards: [Card, Card], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards].map(toPokersolverCard)
  const hand = Hand.solve(allCards)
  return { rank: hand.rank, name: hand.descr }
}

export function describeWinningHand(
  holeCards: [Card, Card],
  communityCards: Card[],
  losingHoleCards: [Card, Card][],
): string {
  const winner = Hand.solve([...holeCards, ...communityCards].map(toPokersolverCard))
  const kickerIndices = kickerCardIndices(winner.rank)
  if (kickerIndices.length === 0) return winner.descr

  let decisiveIndex: number | null = null
  for (const opponentCards of losingHoleCards) {
    const opponent = Hand.solve([...opponentCards, ...communityCards].map(toPokersolverCard))
    if (opponent.rank !== winner.rank || opponent.descr !== winner.descr) continue

    const differingIndex = kickerIndices.find(index =>
      winner.cards[index]?.value !== opponent.cards[index]?.value
    )
    if (differingIndex !== undefined && (decisiveIndex === null || differingIndex < decisiveIndex)) {
      decisiveIndex = differingIndex
    }
  }

  if (decisiveIndex === null) return winner.descr
  return `${winner.descr}, ${winner.cards[decisiveIndex].value} kicker`
}

function kickerCardIndices(rank: number): number[] {
  switch (rank) {
    case 1: return [1, 2, 3, 4] // High card: lower cards can break a tie
    case 2: return [2, 3, 4]    // One pair
    case 3: return [4]          // Two pair
    case 4: return [3, 4]       // Three of a kind
    case 8: return [4]          // Four of a kind
    default: return []
  }
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
