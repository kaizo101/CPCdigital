import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, dealCards } from './deck'
import { createSeededRandom } from './random'

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

  it('produces the same order from independent sources with the same seed', () => {
    const first = shuffleDeck(createDeck(), createSeededRandom('same-session'))
    const second = shuffleDeck(createDeck(), createSeededRandom('same-session'))

    expect(first).toEqual(second)
  })

  it('isolates seeded streams and advances each stream independently', () => {
    const firstStream = createSeededRandom('multi-hand')
    const secondStream = createSeededRandom('multi-hand')

    const firstHand = shuffleDeck(createDeck(), firstStream)
    const secondHand = shuffleDeck(createDeck(), firstStream)
    expect(firstHand).not.toEqual(secondHand)
    expect(shuffleDeck(createDeck(), secondStream)).toEqual(firstHand)
    expect(shuffleDeck(createDeck(), secondStream)).toEqual(secondHand)
  })

  it('rejects random sources outside the unit interval', () => {
    expect(() => shuffleDeck(createDeck(), () => 1)).toThrow(/\[0, 1\)/)
    expect(() => shuffleDeck(createDeck(), () => Number.NaN)).toThrow(/\[0, 1\)/)
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
