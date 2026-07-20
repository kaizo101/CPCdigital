import { describe, expect, it } from 'vitest'
import type { Card } from '@cpc/shared'
import { preflopRaiseRangeFactor, preflopRangeFactor } from './bot-tag'
import { getPreflopAction, getTableAdjustedCoverage } from './preflop-ranges'
import type { Position } from './bot-types'
import type { PreflopSituation } from './preflop-ranges'

const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const suits: Card['suit'][] = ['clubs', 'diamonds', 'hearts', 'spades']
const deck: Card[] = ranks.flatMap(rank => suits.map(suit => ({ rank, suit })))

function actionFrequency(
  tableSize: number,
  position: Position,
  situation: PreflopSituation,
  rangeFactor: number = 1,
  raiseRangeFactor: number = rangeFactor,
): { vpip: number; raise: number } {
  let total = 0
  let vpip = 0
  let raise = 0
  for (let first = 0; first < deck.length; first++) {
    for (let second = first + 1; second < deck.length; second++) {
      const action = getPreflopAction(
        [deck[first], deck[second]],
        position,
        situation,
        tableSize,
        rangeFactor,
        raiseRangeFactor,
      )
      total++
      if (action !== 'fold') vpip++
      if (action === 'raise') raise++
    }
  }
  return { vpip: (vpip / total) * 100, raise: (raise / total) * 100 }
}

describe('table-size-aware TAG preflop ranges', () => {
  it('widens unopened late-position ranges continuously as the table gets shorter', () => {
    const frequencies = [9, 8, 7, 6, 5, 4, 3, 2]
      .map(tableSize => actionFrequency(tableSize, 'late', 'unopened'))

    for (let index = 1; index < frequencies.length; index++) {
      expect(frequencies[index].vpip).toBeGreaterThanOrEqual(frequencies[index - 1].vpip)
      expect(frequencies[index].raise).toBeGreaterThanOrEqual(frequencies[index - 1].raise)
    }
    expect(frequencies.at(-1)!.vpip).toBeGreaterThan(frequencies[0].vpip + 35)
  })

  it('defends heads-up blinds materially wider than six-max or full ring', () => {
    const fullRing = actionFrequency(9, 'blinds', 'facing-open')
    const sixMax = actionFrequency(6, 'blinds', 'facing-open')
    const headsUp = actionFrequency(2, 'blinds', 'facing-open')

    expect(sixMax.vpip).toBeGreaterThan(fullRing.vpip)
    expect(headsUp.vpip).toBeGreaterThan(sixMax.vpip + 20)
    expect(headsUp.raise).toBeGreaterThan(sixMax.raise)
  })

  it('interpolates every table size between explicit calibration anchors', () => {
    const coverage = [2, 3, 4, 5, 6, 7, 8, 9]
      .map(tableSize => getTableAdjustedCoverage('late', 'unopened', tableSize))

    expect(new Set(coverage.map(value => `${value.raise}:${value.vpip}`)).size).toBe(8)
    expect(coverage[3].vpip).toBeGreaterThan(coverage[4].vpip)
    expect(coverage[5].vpip).toBeLessThan(coverage[4].vpip)
  })

  it('keeps premium hands aggressive at every table size', () => {
    const aces: [Card, Card] = [
      { rank: 'A', suit: 'spades' },
      { rank: 'A', suit: 'hearts' },
    ]

    for (let tableSize = 2; tableSize <= 9; tableSize++) {
      expect(getPreflopAction(aces, 'early', 'facing-3bet', tableSize)).toBe('raise')
    }
  })

  it('lets a tighter archetype narrow the same positional range', () => {
    const tag = actionFrequency(6, 'late', 'unopened', 1)
    const nit = actionFrequency(6, 'late', 'unopened', 0.75)

    expect(nit.vpip).toBeLessThan(tag.vpip - 7)
    expect(nit.raise).toBeLessThan(tag.raise - 5)
  })

  it('lets a looser archetype widen the same positional range', () => {
    const tag = actionFrequency(6, 'late', 'unopened', 1)
    const lag = actionFrequency(6, 'late', 'unopened', preflopRangeFactor(76, 6))

    expect(lag.vpip).toBeGreaterThan(tag.vpip + 10)
    expect(lag.raise).toBeGreaterThan(tag.raise + 8)
  })

  it('expands only the very loose end of the personality scale more strongly', () => {
    expect(preflopRangeFactor(12)).toBeCloseTo(0.658)
    expect(preflopRangeFactor(50)).toBe(1)
    expect(preflopRangeFactor(90, 2)).toBeCloseTo(1.36)
    expect(preflopRangeFactor(90, 6)).toBeCloseTo(1.86)
    expect(preflopRangeFactor(90, 9)).toBeCloseTo(1.96)
  })

  it('lets a very passive loose player call widely without inheriting a wide raising range', () => {
    const looseFactor = preflopRangeFactor(82, 6, 88)
    const looseAggressive = actionFrequency(6, 'late', 'unopened', looseFactor)
    const callingStation = actionFrequency(
      6,
      'late',
      'unopened',
      looseFactor,
      preflopRaiseRangeFactor(82, 22, 6),
    )

    expect(Math.abs(callingStation.vpip - looseAggressive.vpip)).toBeLessThan(1)
    expect(callingStation.raise).toBeLessThan(looseAggressive.raise - 25)
  })

  it('widens short-handed defense for an exceptionally risk-tolerant caller', () => {
    expect(preflopRangeFactor(82, 9, 88)).toBe(preflopRangeFactor(82, 9, 50))
    expect(preflopRangeFactor(82, 2, 88))
      .toBeGreaterThan(preflopRangeFactor(82, 2, 50) + 0.15)
  })
})
