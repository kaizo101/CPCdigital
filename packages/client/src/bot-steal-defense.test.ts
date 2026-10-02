import { describe, expect, it } from 'vitest'
import { createBotState } from './bot-state'
import { CALLING_STATION_PERSONALITY, TAG_PERSONALITY } from './bot-archetypes'
import type { DecisionContext } from './bot-decision-types'
import { stealDefenseFactors } from './bot-steal-defense'

function context(options: {
  skill?: number
  opportunities?: number
  attempts?: number
  position?: 'button' | 'cutoff'
  preferred?: DecisionContext['preflopRangeAction']
  variantId?: string
  archetype?: typeof TAG_PERSONALITY
} = {}): DecisionContext {
  const botState = createBotState(options.archetype ?? TAG_PERSONALITY, options.skill ?? 100, () => 0.5)
  botState.reads.opponents.set('opener', {
    playerId: 'opener',
    vpipEstimate: { successes: 2, failures: 8 },
    aggressionEstimate: { successes: 3, failures: 7 },
    foldToBetEstimate: { successes: 5, failures: 5 },
    handsSampled: 14,
    effectiveObservations: 14,
    sizing: { average: 0.6, count: 0 },
    steals: {
      button: { opportunities: 0, attempts: 0 },
      cutoff: { opportunities: 0, attempts: 0 },
      [options.position ?? 'button']: {
        opportunities: options.opportunities ?? 14,
        attempts: options.attempts ?? 14,
      },
    },
  })
  return {
    variantId: options.variantId ?? 'texas-holdem',
    botState,
    gameView: { phase: 'preflop' },
    metrics: { effectiveStackBb: 100 },
    stealSpot: { openerId: 'opener', position: options.position ?? 'button' },
    preflopRangeAction: options.preferred ?? 'call-or-fold',
    handAssessment: { category: 'medium' },
  } as DecisionContext
}

describe('skill- and sample-gated blind defense', () => {
  it('does nothing below six same-position opportunities or at the exact skill threshold', () => {
    expect(stealDefenseFactors('call', context({ opportunities: 5, attempts: 5 }))).toEqual([])
    expect(stealDefenseFactors('call', context({ skill: 40 }))).toEqual([])
    expect(stealDefenseFactors('call', context({ skill: 39 }))).toEqual([])
    expect(stealDefenseFactors('call', context({ skill: 41 }))[0].value).toBeGreaterThan(0)
  })

  it('grows continuously with evidence and reacts only to above-ordinary stealing', () => {
    const early = stealDefenseFactors('call', context({ opportunities: 6, attempts: 6 }))[0].value
    const mature = stealDefenseFactors('call', context())[0].value
    expect(mature).toBeGreaterThan(early)
    expect(stealDefenseFactors('call', context({ opportunities: 14, attempts: 6 }))).toEqual([])
    expect(stealDefenseFactors('call', context({ position: 'cutoff', opportunities: 14, attempts: 5 }))[0].value).toBeGreaterThan(0)
    expect(stealDefenseFactors('call', context({ opportunities: 20, attempts: 9 }))).toEqual([])
    expect(stealDefenseFactors('call', context({ opportunities: 15, attempts: 15 }))[0].value)
      .toBe(stealDefenseFactors('call', context({ opportunities: 14, attempts: 14 }))[0].value)
  })

  it('keeps reads local to the exact opponent and position and checks the stack boundary', () => {
    const unrelated = context()
    unrelated.stealSpot = { openerId: 'other', position: 'button' }
    expect(stealDefenseFactors('call', unrelated)).toEqual([])
    const wrongPosition = context()
    wrongPosition.stealSpot = { openerId: 'opener', position: 'cutoff' }
    expect(stealDefenseFactors('call', wrongPosition)).toEqual([])
    const shallow = context()
    shallow.metrics.effectiveStackBb = 24.99
    expect(stealDefenseFactors('call', shallow)).toEqual([])
    shallow.metrics.effectiveStackBb = 25
    expect(stealDefenseFactors('call', shallow)[0].value).toBeGreaterThan(0)
  })

  it('keeps fold-range hands out and never rewards a blind all-in', () => {
    expect(stealDefenseFactors('call', context({ preferred: 'fold' }))).toEqual([])
    expect(stealDefenseFactors('raise', context({ preferred: 'call-or-fold' }))).toEqual([])
    expect(stealDefenseFactors('raise', context({ preferred: 'raise-or-call' }))[0].value).toBeGreaterThan(0)
    expect(stealDefenseFactors('call', context({ preferred: 'raise' }))).toEqual([])
  })

  it('keeps Calling Station response call-heavy and PLO influence smaller', () => {
    const station = context({ archetype: CALLING_STATION_PERSONALITY, preferred: 'raise-or-call' })
    expect(stealDefenseFactors('call', station)[0].value).toBeGreaterThan(stealDefenseFactors('raise', station)[0].value)
    expect(stealDefenseFactors('call', context({ variantId: 'omaha-high' }))[0].value)
      .toBeLessThan(stealDefenseFactors('call', context())[0].value)
  })
})
