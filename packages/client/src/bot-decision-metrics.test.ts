import { describe, expect, it } from 'vitest'
import type { BettingContext } from '@cpc/shared'
import {
  calculateContextualRaiseTo,
  deriveDecisionMetrics,
  getBettingContextAdjustment,
} from './bot-decision-metrics'

function bettingContext(overrides: Partial<BettingContext> = {}): BettingContext {
  return {
    playerId: 'bot',
    totalPot: 100,
    toCall: 25,
    callAmount: 25,
    potOdds: 0.2,
    toCallPotRatio: 0.25,
    potRaiseTo: 175,
    minRaiseTo: 50,
    maxRaiseTo: 1000,
    playerStack: 1000,
    effectiveStack: 1000,
    spr: 10,
    legalActions: {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 50, maxAmount: 1000 },
      allInAmount: 1000,
    },
    ...overrides,
  }
}

describe('bot decision metrics', () => {
  it('normalizes effective stack and call commitment', () => {
    const metrics = deriveDecisionMetrics(bettingContext({
      callAmount: 300,
      playerStack: 600,
      effectiveStack: 400,
    }), 20)

    expect(metrics.effectiveStackBb).toBe(20)
    expect(metrics.callCommitment).toBe(0.5)
    expect(metrics.stackDepth).toBe('short')
  })

  it('prefers calling a small bet over a pot-sized bet with the same hand', () => {
    const hand = { category: 'medium' as const, hasDraw: false }
    const smallBet = deriveDecisionMetrics(bettingContext({
      potOdds: 0.13,
      toCallPotRatio: 0.15,
    }), 20)
    const potSizedBet = deriveDecisionMetrics(bettingContext({
      potOdds: 0.5,
      toCallPotRatio: 1,
    }), 20)

    expect(getBettingContextAdjustment('call', smallBet, hand))
      .toBeGreaterThan(getBettingContextAdjustment('call', potSizedBet, hand))
    expect(getBettingContextAdjustment('fold', smallBet, hand))
      .toBeLessThan(getBettingContextAdjustment('fold', potSizedBet, hand))
  })

  it('values draw calls more with deep effective stacks than short stacks', () => {
    const hand = { category: 'weak' as const, hasDraw: true }
    const short = deriveDecisionMetrics(bettingContext({ effectiveStack: 300 }), 20)
    const deep = deriveDecisionMetrics(bettingContext({ effectiveStack: 2400 }), 20)

    expect(getBettingContextAdjustment('call', deep, hand))
      .toBeGreaterThan(getBettingContextAdjustment('call', short, hand))
  })

  it('increases value aggression at low SPR', () => {
    const hand = { category: 'strong' as const, hasDraw: false }
    const lowSpr = deriveDecisionMetrics(bettingContext({ spr: 1.5 }), 20)
    const highSpr = deriveDecisionMetrics(bettingContext({ spr: 10 }), 20)

    expect(getBettingContextAdjustment('raise', lowSpr, hand))
      .toBeGreaterThan(getBettingContextAdjustment('raise', highSpr, hand))
  })

  it('sizes wet-board value raises above dry-board bluffs', () => {
    const metrics = deriveDecisionMetrics(bettingContext(), 20)
    const valueRaise = calculateContextualRaiseTo(
      metrics,
      { category: 'strong', hasDraw: false },
      'wet',
      'early',
    )
    const bluffRaise = calculateContextualRaiseTo(
      metrics,
      { category: 'air', hasDraw: false },
      'dry',
      'late',
    )

    expect(valueRaise).toBeGreaterThan(bluffRaise)
    expect(valueRaise).toBeLessThanOrEqual(metrics.maxRaiseTo)
    expect(bluffRaise).toBeGreaterThanOrEqual(metrics.minRaiseTo)
  })
})
