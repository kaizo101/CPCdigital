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
  cards: string[]  // pokersolver card strings for the best 5-card hand
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards].map(toPokersolverCard)
  const hand = Hand.solve(allCards)
  return { rank: hand.rank, name: hand.descr, cards: hand.cards.map((c: { value: string; suit: string }) => c.value + c.suit) }
}

/** Omaha evaluation: must use exactly 2 hole + 3 community cards. */
export function evaluateOmahaHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const boardCards = communityCards.map(toPokersolverCard)
  const hole = holeCards.map(toPokersolverCard)

  let best: { rank: number; name: string; cards: string[] } | null = null

  // Try all combinations: 2 of 4 hole cards + 3 of 5 community cards
  for (let h1 = 0; h1 < hole.length - 1; h1++) {
    for (let h2 = h1 + 1; h2 < hole.length; h2++) {
      for (let c1 = 0; c1 < boardCards.length - 2; c1++) {
        for (let c2 = c1 + 1; c2 < boardCards.length - 1; c2++) {
          for (let c3 = c2 + 1; c3 < boardCards.length; c3++) {
            const cards = [hole[h1], hole[h2], boardCards[c1], boardCards[c2], boardCards[c3]]
            const hand = Hand.solve(cards)
            if (!best || hand.rank > best.rank) {
              best = { rank: hand.rank, name: hand.descr, cards }
            }
          }
        }
      }
    }
  }

  return best ?? { rank: 1, name: 'High Card', cards: [] }
}

export function describeWinningHand(
  holeCards: Card[],
  communityCards: Card[],
  losingHoleCards: Card[][],
): string {
  if (holeCards.length === 4) {
    const result = evaluateOmahaHand(holeCards, communityCards)
    return result.name
  }
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
  hands: { holeCards: Card[]; communityCards: Card[] }[]
): number[] {
  const isOmaha = hands.length > 0 && hands[0].holeCards.length >= 4

  if (isOmaha) {
    const results = hands.map(h => evaluateOmahaHand(h.holeCards, h.communityCards))
    const solved = results.map(r => Hand.solve(r.cards))
    const winners = Hand.winners(solved)
    return solved
      .map((h, i) => winners.includes(h) ? i : -1)
      .filter(i => i !== -1)
  }

  const solved = hands.map(h =>
    Hand.solve([...h.holeCards, ...h.communityCards].map(toPokersolverCard))
  )
  const winners = Hand.winners(solved)
  return solved
    .map((h, i) => (winners.includes(h) ? i : -1))
    .filter(i => i !== -1)
}
