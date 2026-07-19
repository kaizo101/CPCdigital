import { describe, expect, it } from 'vitest'
import { getAggressiveActionLabel, getPlayerActionLabel } from './action-display'

describe('getPlayerActionLabel', () => {
  it('distinguishes a first postflop bet from a raise', () => {
    expect(getAggressiveActionLabel(0)).toBe('Bet')
    expect(getAggressiveActionLabel(40)).toBe('Raise')
    expect(getPlayerActionLabel({ type: 'raise', amount: 40 }, 0)).toBe('Bet')
    expect(getPlayerActionLabel({ type: 'raise', amount: 80 }, 40)).toBe('Raise')
  })

  it('labels passive and all-in actions', () => {
    expect(getPlayerActionLabel({ type: 'check' }, 0)).toBe('Check')
    expect(getPlayerActionLabel({ type: 'call' }, 40)).toBe('Call')
    expect(getPlayerActionLabel({ type: 'all-in' }, 40)).toBe('All-in')
  })

  it('leaves folded display to the player status', () => {
    expect(getPlayerActionLabel({ type: 'fold' }, 40)).toBeNull()
  })
})
