import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, dealCards } from './deck.js'

describe('createDeck', () => {
  it('creates 52 cards', () => {
    expect(createDeck()).toHaveLength(52)
  })

  it('all cards are unique', () => {
    const deck = createDeck()
    const unique = new Set(deck.map(c => `${c.rank}${c.suit}`))
    expect(unique.size).toBe(52)
  })
})

describe('shuffleDeck', () => {
  it('returns 52 cards', () => {
    expect(shuffleDeck(createDeck())).toHaveLength(52)
  })

  it('does not mutate the original deck', () => {
    const deck = createDeck()
    const copy = [...deck]
    shuffleDeck(deck)
    expect(deck).toEqual(copy)
  })

  it('produces a different order (probabilistic)', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    const isSameOrder = deck.every((c, i) => c.rank === shuffled[i].rank && c.suit === shuffled[i].suit)
    expect(isSameOrder).toBe(false)
  })
})

describe('dealCards', () => {
  it('splits the deck correctly', () => {
    const [dealt, remaining] = dealCards(createDeck(), 2)
    expect(dealt).toHaveLength(2)
    expect(remaining).toHaveLength(50)
  })

  it('total cards are preserved', () => {
    const deck = createDeck()
    const [dealt, remaining] = dealCards(deck, 5)
    expect(dealt.length + remaining.length).toBe(deck.length)
  })
})
