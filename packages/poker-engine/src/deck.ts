import type { Card, Rank, Suit } from '@cpc/shared'
import { secureRandom, type RandomSource } from './random'

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

export function createDeck(): Card[] {
  return SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank })))
}

export function shuffleDeck(deck: Card[], random: RandomSource = secureRandom): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const roll = random()
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
      throw new Error('Random source must return a finite number in [0, 1)')
    }
    const j = Math.floor(roll * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(deck: Card[], count: number): [dealt: Card[], remaining: Card[]] {
  return [deck.slice(0, count), deck.slice(count)]
}
