import { describe, it, expect } from 'vitest'
import { describeWinningHand, evaluateHand, findWinnerIndices } from './hand-evaluator'
import type { Card } from '@cpc/shared'

const c = (rank: string, suit: string): Card =>
  ({ rank, suit } as Card)

describe('evaluateHand', () => {
  it('identifies a royal flush', () => {
    const result = evaluateHand(
      [c('A', 'spades'), c('K', 'spades')],
      [c('Q', 'spades'), c('J', 'spades'), c('T', 'spades'), c('2', 'hearts'), c('3', 'clubs')]
    )
    expect(result.name).toMatch(/royal flush/i)
    expect(result.rank).toBe(9)
  })

  it('identifies a full house', () => {
    const result = evaluateHand(
      [c('A', 'hearts'), c('A', 'diamonds')],
      [c('A', 'clubs'), c('K', 'hearts'), c('K', 'diamonds'), c('2', 'spades'), c('3', 'clubs')]
    )
    expect(result.name).toMatch(/full house/i)
  })

  it('high card ranks lowest', () => {
    const high = evaluateHand(
      [c('2', 'hearts'), c('7', 'diamonds')],
      [c('9', 'clubs'), c('J', 'spades'), c('K', 'hearts'), c('3', 'diamonds'), c('5', 'clubs')]
    )
    expect(high.rank).toBe(1)
  })

  it('higher rank wins', () => {
    const pair = evaluateHand(
      [c('A', 'hearts'), c('A', 'diamonds')],
      [c('2', 'clubs'), c('5', 'spades'), c('9', 'hearts'), c('3', 'diamonds'), c('7', 'clubs')]
    )
    const highCard = evaluateHand(
      [c('K', 'hearts'), c('Q', 'diamonds')],
      [c('2', 'clubs'), c('5', 'spades'), c('9', 'hearts'), c('3', 'diamonds'), c('7', 'clubs')]
    )
    expect(pair.rank).toBeGreaterThan(highCard.rank)
  })

  it('mentions a kicker only when it decides between the same made hand', () => {
    const community = [
      c('A', 'clubs'), c('9', 'spades'), c('7', 'hearts'), c('4', 'diamonds'), c('2', 'clubs'),
    ]

    expect(describeWinningHand(
      [c('A', 'hearts'), c('K', 'diamonds')],
      community,
      [[c('A', 'diamonds'), c('Q', 'spades')]],
    )).toMatch(/K kicker/i)

    expect(describeWinningHand(
      [c('A', 'hearts'), c('K', 'diamonds')],
      community,
      [[c('Q', 'diamonds'), c('Q', 'spades')]],
    )).not.toMatch(/kicker/i)
  })
})

describe('findWinnerIndices', () => {
  const community = [
    c('2', 'clubs'), c('5', 'spades'), c('9', 'hearts'), c('3', 'diamonds'), c('7', 'clubs'),
  ]

  it('returns single winner', () => {
    const idxs = findWinnerIndices([
      { holeCards: [c('A', 'hearts'), c('A', 'diamonds')], communityCards: community }, // pair of aces
      { holeCards: [c('K', 'hearts'), c('Q', 'diamonds')], communityCards: community }, // high card
    ])
    expect(idxs).toEqual([0])
  })

  it('returns both on a tie', () => {
    // Both players have same high card (board plays)
    const tiedCommunity = [
      c('A', 'clubs'), c('K', 'spades'), c('Q', 'hearts'), c('J', 'diamonds'), c('T', 'clubs'),
    ]
    const idxs = findWinnerIndices([
      { holeCards: [c('2', 'hearts'), c('3', 'diamonds')], communityCards: tiedCommunity },
      { holeCards: [c('4', 'hearts'), c('5', 'diamonds')], communityCards: tiedCommunity },
    ])
    expect(idxs).toHaveLength(2)
  })
})
