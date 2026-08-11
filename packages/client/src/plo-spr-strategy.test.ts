import { describe, expect, it } from 'vitest'
import type { DecisionContext } from './bot-decision-types'
import { getPloSprAdjustments, getPloSprZoneWeights, type PloSprAction } from './plo-spr-strategy'

function context(overrides: Partial<DecisionContext['handAssessment']> = {}, spr = 1): DecisionContext {
  return {
    variantId: 'omaha-high',
    botState: { personality: { riskTolerance: 0, aggression: 0 }, skill: { level: 90 } },
    gameView: { phase: 'flop' },
    metrics: { spr },
    handAssessment: {
      category: 'medium',
      rank: 3,
      made: true,
      relativeStrength: 50,
      showdownValue: 40,
      nutPotential: 'medium',
      vulnerability: 30,
      drawQuality: 0,
      cleanOuts: 0,
      blockerValue: 0,
      drawTypes: [],
      equityCollapse: 0,
      boardGotWorse: false,
      strength: 50,
      ...overrides,
    },
  } as DecisionContext
}

function value(action: PloSprAction, decisionContext: DecisionContext): number {
  return getPloSprAdjustments(action, decisionContext)
    .reduce((sum, adjustment) => sum + adjustment.value, 0)
}

describe('getPloSprZoneWeights', () => {
  it('blends commitment, protection and draw zones continuously', () => {
    expect(getPloSprZoneWeights(1)).toEqual({ commitment: 1, protection: 0, draw: 0 })
    expect(getPloSprZoneWeights(3)).toEqual({
      commitment: expect.closeTo(1 / 3),
      protection: 0,
      draw: 0,
    })
    expect(getPloSprZoneWeights(4)).toEqual({
      commitment: 0,
      protection: expect.closeTo(0.4),
      draw: expect.closeTo(0.2),
    })
    expect(getPloSprZoneWeights(5.5)).toEqual({
      commitment: 0,
      protection: 1,
      draw: expect.closeTo(0.5),
    })
    expect(getPloSprZoneWeights(8)).toEqual({
      commitment: 0,
      protection: expect.closeTo(2 / 4.5),
      draw: 1,
    })
    expect(getPloSprZoneWeights(15)).toEqual({ commitment: 0, protection: 0, draw: 1 })
    expect(getPloSprZoneWeights(18)).toEqual({ commitment: 0, protection: 0, draw: 0 })
  })

  it('has no cliff around the former SPR 3 boundary', () => {
    const below = getPloSprZoneWeights(2.99)
    const above = getPloSprZoneWeights(3.01)

    expect(Math.abs(below.commitment - above.commitment)).toBeLessThan(0.01)
    expect(Math.abs(below.protection - above.protection)).toBeLessThan(0.01)
    expect(Math.abs(below.draw - above.draw)).toBeLessThan(0.01)
  })
})

describe('getPloSprAdjustments', () => {
  it('uses nut-or-fold pressure for non-strong equity at low SPR', () => {
    const decisionContext = context()

    expect(value('fold', decisionContext)).toBe(6)
    expect(value('call', decisionContext)).toBe(-8)
    expect(value('raise', decisionContext)).toBe(-8)
    expect(value('all-in', decisionContext)).toBe(-8)
  })

  it('softens only non-strong commitment discipline for risk-tolerant archetypes', () => {
    const cautious = context()
    const riskTolerant = context()
    riskTolerant.botState.personality.riskTolerance = 100
    riskTolerant.botState.personality.aggression = 100

    expect(value('fold', riskTolerant)).toBeLessThan(value('fold', cautious))
    expect(Math.abs(value('call', riskTolerant))).toBeLessThan(Math.abs(value('call', cautious)))
    expect(value('raise', riskTolerant)).toBeGreaterThan(value('fold', riskTolerant))

    cautious.handAssessment.category = 'strong'
    riskTolerant.handAssessment.category = 'strong'
    expect(value('raise', riskTolerant)).toBe(value('raise', cautious))
  })

  it('commits strong made hands and premium draws at low SPR', () => {
    const strongMade = context({ category: 'strong', rank: 6, made: true })
    const premiumDraw = context({
      category: 'medium',
      rank: 1,
      made: false,
      drawQuality: 7,
      cleanOuts: 11,
      drawTypes: ['nut-flush-draw'],
    })
    const topSet = context({
      category: 'good',
      rank: 4,
      made: true,
      nutPotential: 'strong',
      vulnerability: 75,
    })

    for (const candidate of [strongMade, premiumDraw, topSet]) {
      expect(value('fold', candidate)).toBe(-12)
      expect(value('call', candidate)).toBe(6)
      expect(value('raise', candidate)).toBe(10)
      expect(value('all-in', candidate)).toBe(12)
    }
  })

  it('does not treat raw bottom-wrap outs as premium low-SPR equity', () => {
    const nutWrap = context({
      category: 'medium',
      rank: 1,
      made: false,
      drawQuality: 11,
      cleanOuts: 13,
      drawTypes: ['wrap-13+', 'nut-wrap'],
    })
    const bottomWrap = context({
      category: 'medium',
      rank: 1,
      made: false,
      drawQuality: 4,
      cleanOuts: 0,
      drawTypes: ['wrap-13+', 'bottom-wrap'],
    })

    expect(value('fold', nutWrap)).toBe(-12)
    expect(value('all-in', nutWrap)).toBe(12)
    expect(value('fold', bottomWrap)).toBe(6)
    expect(value('all-in', bottomWrap)).toBe(-8)

    bottomWrap.botState.skill.level = 20
    expect(value('fold', bottomWrap)).toBe(-12)
    expect(value('all-in', bottomWrap)).toBe(12)
  })

  it('prefers protection raises with vulnerable made hands in the middle zone', () => {
    const vulnerable = context({
      category: 'good',
      rank: 4,
      made: true,
      vulnerability: 75,
    }, 5.5)

    expect(value('fold', vulnerable)).toBe(-6)
    expect(value('check', vulnerable)).toBe(-6)
    expect(value('call', vulnerable)).toBe(-6)
    expect(value('raise', vulnerable)).toBe(12)
    expect(value('all-in', vulnerable)).toBe(4)
  })

  it('keeps realizable non-vulnerable equity fold-resistant in the protection zone', () => {
    const equity = context({
      category: 'medium',
      rank: 2,
      made: true,
      vulnerability: 30,
    }, 5.5)

    expect(value('fold', equity)).toBe(-10)
    expect(value('call', equity)).toBe(0)
    expect(value('raise', equity)).toBe(0)
  })

  it('realizes strong clean draws through calls and selective raises at high SPR', () => {
    const draw = context({
      category: 'good',
      rank: 1,
      made: false,
      drawQuality: 8,
      cleanOuts: 13,
      drawTypes: ['wrap-13+', 'nut-wrap'],
    }, 15)

    expect(value('fold', draw)).toBe(-10)
    expect(value('check', draw)).toBe(4)
    expect(value('call', draw)).toBe(10)
    expect(value('raise', draw)).toBe(6)
    expect(value('all-in', draw)).toBe(0)
  })

  it('does not affect NLHE or preflop decisions', () => {
    const nlhe = context()
    nlhe.variantId = 'texas-holdem'
    const preflop = context()
    preflop.gameView.phase = 'preflop'

    expect(getPloSprAdjustments('raise', nlhe)).toEqual([])
    expect(getPloSprAdjustments('raise', preflop)).toEqual([])
  })
})
