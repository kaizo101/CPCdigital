import { describe, expect, it } from 'vitest'
import type { DecisionContext, ScoredAction } from './bot-decision-types'
import { habitIdsToActiveHabits } from './bot-habits'

function context(
  phase: 'flop' | 'turn' | 'river',
  variantId: 'texas-holdem' | 'omaha-high',
): DecisionContext {
  return {
    variantId,
    gameView: { phase },
    handAssessment: { category: 'weak' },
  } as DecisionContext
}

describe('street-aware bot habits', () => {
  it('lets NLHE sticky-call influence decay while preserving separate PLO tuning', () => {
    const sticky = habitIdsToActiveHabits('sticky-test', ['sticky-postflop'])[0]
    const call: ScoredAction = {
      action: { type: 'call' },
      intent: 'bluff-catch',
      utility: 50,
      contributions: [],
    }
    const value = (phase: 'flop' | 'turn' | 'river', variantId: 'texas-holdem' | 'omaha-high') =>
      sticky.modifier(call, context(phase, variantId))[0].value

    const nlheFlop = value('flop', 'texas-holdem')
    const nlheTurn = value('turn', 'texas-holdem')
    const nlheRiver = value('river', 'texas-holdem')

    expect(nlheFlop).toBeGreaterThan(nlheTurn)
    expect(nlheTurn).toBeGreaterThan(nlheRiver)
    expect(value('river', 'omaha-high')).toBeCloseTo(nlheFlop)
  })
})
