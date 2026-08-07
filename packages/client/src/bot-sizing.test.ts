import { describe, expect, it } from 'vitest'
import type { DecisionActionHistoryEvent } from '@cpc/shared'
import { aggressiveActionPotFraction, isAggressiveHistoryEvent } from './bot-sizing'

function event(overrides: Partial<Extract<DecisionActionHistoryEvent, { type: 'PlayerActed' }>> = {}) {
  return {
    type: 'PlayerActed' as const,
    phase: 'flop',
    playerId: 'villain',
    action: { type: 'raise' as const, amount: 75 },
    amount: 75,
    totalBet: 75,
    toCall: 0,
    currentBetBefore: 0,
    potAfter: 175,
    source: 'player' as const,
    ...overrides,
  }
}

describe('bot sizing observations', () => {
  it('uses the same pre-action-pot fraction for an observed raise', () => {
    expect(aggressiveActionPotFraction(event())).toBe(0.75)
  })

  it('recognizes an aggressive all-in', () => {
    const allIn = event({
      action: { type: 'all-in' },
      totalBet: 120,
      currentBetBefore: 80,
    })

    expect(isAggressiveHistoryEvent(allIn)).toBe(true)
    expect(aggressiveActionPotFraction(allIn)).toBe(0.75)
  })

  it('rejects a passive all-in call', () => {
    const allInCall = event({
      action: { type: 'all-in' },
      totalBet: 60,
      currentBetBefore: 80,
    })

    expect(isAggressiveHistoryEvent(allInCall)).toBe(false)
    expect(aggressiveActionPotFraction(allInCall)).toBeNull()
  })
})
