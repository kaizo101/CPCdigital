import { describe, expect, it } from 'vitest'
import type { Card } from '@cpc/shared'
import { analyzePloPreflopFeatures } from './plo-preflop-features'

function cards(specification: string): Card[] {
  const suits: Record<string, Card['suit']> = {
    s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs',
  }
  return specification.split(' ').map(token => ({
    rank: token[0] as Card['rank'], suit: suits[token[1]],
  }))
}

describe('PLO4 preflop structure', () => {
  it('separates dry aces from a coordinated four-card rundown', () => {
    const aces = analyzePloPreflopFeatures(cards('As Ah 7d 2c'))
    const rundown = analyzePloPreflopFeatures(cards('Ks Qh Jd Tc'))
    expect(aces.highestPairRank).toBe(14)
    expect(aces.coordinatedRundown).toBe(0)
    expect(rundown.highestPairRank).toBe(0)
    expect(rundown.coordinatedRundown).toBe(1)
  })

  it('counts only suits with two hole cards and distinguishes ace-high from lower suits', () => {
    const nut = analyzePloPreflopFeatures(cards('As Ah 7s 2c'))
    const low = analyzePloPreflopFeatures(cards('As Ah 7d 2d'))
    expect(nut.suitShape).toBe('single-suited')
    expect(low.suitShape).toBe('single-suited')
    expect(nut.usableSuitHighRanks).toEqual([14])
    expect(low.usableSuitHighRanks).toEqual([7])
    expect(nut.nutSuitCount).toBe(1)
    expect(low.nutSuitCount).toBe(0)
    expect(analyzePloPreflopFeatures(cards('As Ks Qs Jh')).usableSuitHighRanks).toEqual([14])
    expect(analyzePloPreflopFeatures(cards('As Ks Qh Jh')).usableSuitHighRanks).toEqual([14, 12])
  })

  it('is invariant to suit renaming and includes wheel windows', () => {
    expect(analyzePloPreflopFeatures(cards('As Ks Qh Jh')))
      .toEqual(analyzePloPreflopFeatures(cards('Ah Kh Qs Js')))
    expect(analyzePloPreflopFeatures(cards('As 2h 3d 4c')).coordinatedRundown).toBe(1)
    expect(analyzePloPreflopFeatures(cards('Ks Qh Jd 2c')).coordinatedRundown).toBe(0)
  })

  it('requires exactly four private cards', () => {
    expect(() => analyzePloPreflopFeatures(cards('As Kh Qd'))).toThrow('exactly four')
  })
})
