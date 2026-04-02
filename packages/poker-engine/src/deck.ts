import { randomInt } from 'node:crypto'
import type { Card, Rank, Suit } from '@cpc/shared'

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

export function createDeck(): Card[] {
  return SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank })))
}

// Fisher-Yates with node:crypto RNG — server-side only
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(deck: Card[], count: number): [dealt: Card[], remaining: Card[]] {
  return [deck.slice(0, count), deck.slice(count)]
}
