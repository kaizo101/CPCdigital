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
      candidateId: 'call',
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

  it('derives a turn-double-barrel habit from an existing three-barrel identity', () => {
    const habits = habitIdsToActiveHabits('barrel-identity', ['three-barrel-bluff'])
    expect(habits.map(habit => habit.definition.id)).toEqual([
      'three-barrel-bluff',
      'turn-double-barrel',
    ])
    expect(habitIdsToActiveHabits('barrel-identity', [
      'three-barrel-bluff',
      'turn-double-barrel',
    ])).toHaveLength(2)
  })

  it('double-barrels suitable NLHE blank turns and prefers betting over checking', () => {
    const habit = habitIdsToActiveHabits('barrel-test', ['turn-double-barrel'])[0]
    const decisionContext = {
      ...context('turn', 'texas-holdem'),
      botId: 'bot',
      boardTexture: 'dry',
      botState: { skill: { level: 90 } },
      metrics: { callAmount: 0 },
      streetAnalysis: {
        streetAggressor: { preflop: 'bot', flop: 'bot', turn: null, river: null },
        activeOpponents: 1,
      },
      handAssessment: {
        category: 'air',
        made: false,
        drawTypes: [],
        cleanOuts: 0,
        boardGotWorse: false,
        equityCollapse: 0,
      },
    } as unknown as DecisionContext
    const action = (type: 'check' | 'raise'): ScoredAction => ({
      candidateId: type === 'raise' ? 'raise:100' : 'check',
      action: type === 'raise' ? { type, amount: 100 } : { type },
      intent: type === 'raise' ? 'bluff' : 'pot-control',
      utility: 50,
      contributions: [],
    })

    expect(habit.modifier(action('raise'), decisionContext)[0]).toEqual(expect.objectContaining({
      label: 'Habit: double-barrels blank turn as bluff',
      value: expect.any(Number),
    }))
    expect(habit.modifier(action('raise'), decisionContext)[0].value).toBeGreaterThan(0)
    expect(habit.modifier(action('check'), decisionContext)[0].value).toBeLessThan(0)
  })

  it('does not barrel PLO, scary turns, multiway pots, or low-skill spots', () => {
    const habit = habitIdsToActiveHabits('barrel-isolation', ['turn-double-barrel'])[0]
    const raise: ScoredAction = {
      candidateId: 'raise:100',
      action: { type: 'raise', amount: 100 },
      intent: 'semi-bluff',
      utility: 50,
      contributions: [],
    }
    const base = {
      ...context('turn', 'texas-holdem'),
      botId: 'bot',
      boardTexture: 'dry',
      botState: { skill: { level: 90 } },
      metrics: { callAmount: 0 },
      streetAnalysis: {
        streetAggressor: { preflop: 'bot', flop: 'bot', turn: null, river: null },
        activeOpponents: 1,
      },
      handAssessment: {
        category: 'weak', made: false, drawTypes: ['flush-draw'], cleanOuts: 9,
        boardGotWorse: false, equityCollapse: 0,
      },
    } as unknown as DecisionContext

    expect(habit.modifier(raise, { ...base, variantId: 'omaha-high' })).toEqual([])
    expect(habit.modifier(raise, {
      ...base,
      handAssessment: { ...base.handAssessment, boardGotWorse: true },
    })).toEqual([])
    expect(habit.modifier(raise, {
      ...base,
      streetAnalysis: { ...base.streetAnalysis!, activeOpponents: 2 },
    })).toEqual([])
    expect(habit.modifier(raise, {
      ...base,
      botState: { ...base.botState, skill: { ...base.botState.skill, level: 49 } },
    })).toEqual([])
  })
})
