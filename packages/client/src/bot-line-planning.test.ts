import { describe, expect, it } from 'vitest'
import { determineLineCommitment, lineCommitmentModifiers } from './bot-line-planning'
import type { StreetAnalysis } from './bot-street-analysis'
import type { ScoredAction } from './bot-decision-types'

function analysis(overrides: Partial<StreetAnalysis> = {}): StreetAnalysis {
  return {
    preflopAggressor: null,
    preflopRaiseCount: 0,
    streetAggressor: { preflop: null, flop: null, turn: null, river: null },
    iAmPreflopAggressor: false,
    opponentLines: new Map(),
    activeOpponents: 1,
    opponentShowedWeakness: false,
    opponentCheckRaised: false,
    street: 'flop',
    actionCountThisStreet: 1,
    ...overrides,
  }
}

function scoredAction(type: string): ScoredAction {
  return { candidateId: type, action: { type: type as any }, intent: 'fold', utility: 50, contributions: [] }
}

describe('line commitment', () => {
  it('gives up with air when not the preflop aggressor', () => {
    const plan = determineLineCommitment(analysis({ iAmPreflopAggressor: false }), 'air', 'dry', false)
    expect(plan.plan).toBe('give-up')
  })

  it('plans 3-street aggression with nuts as PFA', () => {
    const plan = determineLineCommitment(analysis({ iAmPreflopAggressor: true }), 'premium', 'dry', true)
    expect(plan.plan).toBe('aggressive')
    expect(plan.plannedStreets).toBe(3)
  })

  it('plans 1-street aggression with air as PFA on dry board', () => {
    const plan = determineLineCommitment(analysis({ iAmPreflopAggressor: true }), 'air', 'dry', true)
    expect(plan.plan).toBe('aggressive')
    expect(plan.plannedStreets).toBe(1)
  })

  it('gives up with air as PFA on wet board', () => {
    const plan = determineLineCommitment(analysis({ iAmPreflopAggressor: true }), 'air', 'wet', true)
    expect(plan.plan).toBe('give-up')
  })

  it('goes passive with medium in multiway pot', () => {
    const plan = determineLineCommitment(analysis({ iAmPreflopAggressor: true, activeOpponents: 3 }), 'medium', 'dry', true)
    expect(plan.plan).toBe('passive-call')
  })

  it('aggressive plan boosts raise on flop', () => {
    const commit = { plan: 'aggressive' as const, plannedStreets: 2 }
    const mods = lineCommitmentModifiers(commit, 'flop', scoredAction('raise'))
    expect(mods.length).toBeGreaterThan(0)
    expect(mods[0].value).toBeGreaterThan(0)
  })

  it('aggressive plan penalizes abandoning the plan', () => {
    const commit = { plan: 'aggressive' as const, plannedStreets: 2 }
    const mods = lineCommitmentModifiers(commit, 'flop', scoredAction('check'))
    expect(mods.some(m => m.value < 0)).toBe(true)
  })

  it('passive plan boosts calling', () => {
    const commit = { plan: 'passive-call' as const, plannedStreets: 2 }
    const mods = lineCommitmentModifiers(commit, 'flop', scoredAction('call'))
    expect(mods.some(m => m.value > 0)).toBe(true)
  })

  it('give-up plan boosts folding', () => {
    const commit = { plan: 'give-up' as const, plannedStreets: 0 }
    const mods = lineCommitmentModifiers(commit, 'flop', scoredAction('fold'))
    expect(mods.some(m => m.value > 0)).toBe(true)
  })
})
