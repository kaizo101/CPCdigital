import { describe, expect, it } from 'vitest'
import type { BettingContext } from '@cpc/shared'
import {
  calculateContextualRaiseTo,
  deriveDecisionMetrics,
  getBettingContextAdjustment,
  getBettingContextFactors,
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
  it('separates voluntary pot commitment from the forced-all-in ratio', () => {
    const metrics = deriveDecisionMetrics(bettingContext({
      callAmount: 300,
      playerStack: 600,
      playerStartingStack: 1000,
      voluntaryHandContribution: 250,
      effectiveStack: 400,
    }), 20)

    expect(metrics.effectiveStackBb).toBe(20)
    expect(metrics.potCommitment).toBe(0.25)
    expect(metrics.forcedAllInRatio).toBe(0.5)
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

  it('scales implied odds with effective stack and nut potential', () => {
    const impliedValue = (
      effectiveStack: number,
      nutPotential: 'nuts' | 'weak',
    ) => getBettingContextFactors(
      'call',
      deriveDecisionMetrics(bettingContext({ effectiveStack }), 20),
      { category: 'weak', hasDraw: true, nutPotential },
      { phase: 'turn', activeOpponents: 1 },
    ).find(factor => factor.label.startsWith('Implied odds'))!.value

    expect(impliedValue(4000, 'nuts')).toBeGreaterThan(impliedValue(2000, 'nuts'))
    expect(impliedValue(2000, 'nuts')).toBeGreaterThan(impliedValue(2000, 'weak'))
  })

  it('rewards multiway nut draws but discounts dominated multiway draws', () => {
    const impliedValue = (
      nutPotential: 'nuts' | 'medium',
      activeOpponents: number,
    ) => getBettingContextFactors(
      'call',
      deriveDecisionMetrics(bettingContext({ effectiveStack: 2000 }), 20),
      { category: 'weak', hasDraw: true, nutPotential },
      { phase: 'flop', activeOpponents },
    ).find(factor => factor.label.startsWith('Implied odds'))!.value

    expect(impliedValue('nuts', 4)).toBeGreaterThan(impliedValue('nuts', 1))
    expect(impliedValue('medium', 4)).toBeLessThan(impliedValue('medium', 1))
  })

  it('does not apply postflop implied odds to a preflop draw profile', () => {
    const factors = getBettingContextFactors(
      'call',
      deriveDecisionMetrics(bettingContext({ effectiveStack: 2400 }), 20),
      { category: 'weak', hasDraw: true, nutPotential: 'nuts' },
      { phase: 'preflop', activeOpponents: 3 },
    )

    expect(factors.some(factor => factor.label.startsWith('Implied odds'))).toBe(false)
  })

  it('keeps PLO-style preflop reraises more disciplined than the NLHE half-scale', () => {
    const metrics = deriveDecisionMetrics(bettingContext({
      potOdds: 0.3,
      toCallPotRatio: 0.5,
    }), 20)
    const hand = { category: 'medium' as const, hasDraw: false }
    const raisePenalty = (preflopReraisePenaltyScale: number) => getBettingContextFactors(
      'raise',
      metrics,
      hand,
      { phase: 'preflop', preflopRaiseCount: 1, preflopReraisePenaltyScale },
    ).reduce((sum, factor) => sum + factor.value, 0)

    expect(raisePenalty(1)).toBeLessThan(raisePenalty(0.5))
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

  it('sizes protection raises larger when the board got worse', () => {
    const metrics = deriveDecisionMetrics(bettingContext(), 20)
    const stableBoard = calculateContextualRaiseTo(
      metrics,
      { category: 'strong', hasDraw: false, boardGotWorse: false },
      'neutral',
      'early',
    )
    const worseBoard = calculateContextualRaiseTo(
      metrics,
      { category: 'strong', hasDraw: false, boardGotWorse: true },
      'neutral',
      'early',
    )

    expect(worseBoard).toBeGreaterThan(stableBoard)
  })

  it('uses smaller sizing after a quantified equity collapse', () => {
    const metrics = deriveDecisionMetrics(bettingContext(), 20)
    const stableBoard = calculateContextualRaiseTo(
      metrics,
      { category: 'good', hasDraw: false, equityCollapse: 0 },
      'neutral',
      'early',
    )
    const collapsedBoard = calculateContextualRaiseTo(
      metrics,
      { category: 'good', hasDraw: false, equityCollapse: 0.8 },
      'neutral',
      'early',
    )

    expect(collapsedBoard).toBeLessThan(stableBoard)
  })
})
