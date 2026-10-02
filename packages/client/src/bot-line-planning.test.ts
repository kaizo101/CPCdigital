import { describe, expect, it } from 'vitest'
import {
  chosenFlopLine,
  determineLineCommitment,
  flopTurnLineModifiers,
  lineCommitmentModifiers,
  reviewFlopTurnLine,
} from './bot-line-planning'
import type { StreetAnalysis } from './bot-street-analysis'
import type { DecisionContext, ScoredAction } from './bot-decision-types'
import { createBotState } from './bot-state'
import { TAG_PERSONALITY } from './bot-archetypes'

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

function lineContext(): DecisionContext {
  const botState = createBotState(TAG_PERSONALITY, 100, () => 0.5)
  botState.memory.hand.flopLine = { intent: 'bluff', opponentsAtBet: 1 }
  return {
    botId: 'bot',
    variantId: 'texas-holdem',
    gameView: { phase: 'turn' },
    botState,
    streetAnalysis: analysis({
      street: 'turn',
      streetAggressor: { preflop: 'bot', flop: 'bot', turn: null, river: null },
      iAmPreflopAggressor: true,
    }),
    activePlayerCount: 2,
    boardTexture: 'dry',
    metrics: { callAmount: 0 },
    handAssessment: {
      category: 'air', made: false, boardGotWorse: false, equityCollapse: 0,
      blockerValue: 0, drawTypes: [], cleanOuts: 0, drawQuality: 0, nutPotential: 'medium',
    },
  } as unknown as DecisionContext
}

describe('chosen flop line and turn review', () => {
  it('remembers only a selected opening flop bluff, not a facing-bet raise or check', () => {
    const context = lineContext()
    context.gameView.phase = 'flop'
    const bluff = { ...scoredAction('raise'), intent: 'bluff' as const }
    expect(chosenFlopLine(context, bluff)).toEqual({ intent: 'bluff', opponentsAtBet: 1 })
    expect(chosenFlopLine(context, { ...bluff, intent: 'semi-bluff' })).toEqual({ intent: 'semi-bluff', opponentsAtBet: 1 })
    expect(chosenFlopLine(context, scoredAction('check'))).toBeNull()
    context.metrics.callAmount = 20
    expect(chosenFlopLine(context, bluff)).toBeNull()
  })

  it('continues a dry NLHE bluff selectively, without rewarding an all-in', () => {
    const context = lineContext()
    expect(reviewFlopTurnLine(context)?.status).toBe('continue')
    expect(flopTurnLineModifiers(context, scoredAction('raise'))[0].value).toBeGreaterThan(0)
    expect(flopTurnLineModifiers(context, scoredAction('check'))[0].value).toBeLessThan(0)
    expect(flopTurnLineModifiers(context, scoredAction('all-in'))).toEqual([])
  })

  it('abandons on a dangerous card, a flop raise, a turn bet or a multiway flop', () => {
    const context = lineContext()
    context.handAssessment.boardGotWorse = true
    expect(reviewFlopTurnLine(context)?.status).toBe('abort')
    context.handAssessment.boardGotWorse = false
    context.handAssessment.equityCollapse = 0.199
    expect(reviewFlopTurnLine(context)?.status).toBe('continue')
    context.handAssessment.equityCollapse = 0.2
    expect(reviewFlopTurnLine(context)?.status).toBe('abort')
    context.handAssessment.equityCollapse = 0
    context.streetAnalysis!.streetAggressor.flop = 'villain'
    expect(reviewFlopTurnLine(context)?.reason).toContain('raised')
    context.streetAnalysis!.streetAggressor.flop = 'bot'
    context.metrics.callAmount = 25
    expect(reviewFlopTurnLine(context)?.reason).toContain('turn initiative')
    expect(flopTurnLineModifiers(context, scoredAction('raise'))[0].value).toBeLessThan(0)
    expect(flopTurnLineModifiers(context, scoredAction('call'))).toEqual([])
    context.metrics.callAmount = 0
    context.botState.memory.hand.flopLine!.opponentsAtBet = 2
    expect(reviewFlopTurnLine(context)?.reason).toContain('Multiway')
  })

  it('replans improved value and keeps skill onset continuous at 30', () => {
    const context = lineContext()
    context.handAssessment.made = true
    context.handAssessment.category = 'good'
    expect(reviewFlopTurnLine(context)?.status).toBe('replan')
    context.handAssessment.made = false
    context.handAssessment.category = 'air'
    context.botState.skill.level = 30
    expect(reviewFlopTurnLine(context)?.status).toBe('unrecognized')
    expect(flopTurnLineModifiers(context, scoredAction('raise'))).toEqual([])
    context.botState.skill.level = 31
    expect(reviewFlopTurnLine(context)?.status).toBe('continue')
    expect(flopTurnLineModifiers(context, scoredAction('raise'))[0].value).toBeGreaterThan(0)
  })

  it('requires a nut-relevant PLO semi-bluff and aborts a pure PLO bluff', () => {
    const context = lineContext()
    context.variantId = 'omaha-high'
    expect(reviewFlopTurnLine(context)?.status).toBe('abort')
    context.botState.memory.hand.flopLine!.intent = 'semi-bluff'
    context.handAssessment.drawTypes = ['flush-draw']
    context.handAssessment.cleanOuts = 8
    context.handAssessment.drawQuality = 80
    expect(reviewFlopTurnLine(context)?.status).toBe('abort')
    context.handAssessment.drawTypes = ['nut-flush-draw']
    expect(reviewFlopTurnLine(context)?.status).toBe('continue')
    context.handAssessment.equityCollapse = 0.119
    expect(reviewFlopTurnLine(context)?.status).toBe('continue')
    context.handAssessment.equityCollapse = 0.12
    expect(reviewFlopTurnLine(context)?.status).toBe('abort')
  })
})

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
