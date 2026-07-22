import { describe, expect, it } from 'vitest'
import type { LegalActions } from '@cpc/shared'
import { applyPersonalityModifiers } from './bot-action-modifiers'
import { createBotState } from './bot-state'
import {
  CALLING_STATION_PERSONALITY,
  LAG_PERSONALITY,
  NIT_PERSONALITY,
  TAG_PERSONALITY,
} from './bot-tag'
import type { DecisionContext, ScoredAction } from './bot-decision-types'

function makeContext(
  botState: ReturnType<typeof createBotState>,
  overrides: Partial<DecisionContext> = {},
): DecisionContext {
  return {
    gameView: {
      myCards: [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'spades' }],
      board: [],
      pot: 100,
      currentBet: 50,
      minRaiseTo: 100,
      maxRaiseTo: 1000,
      canRaise: true,
      bigBlind: 10,
      smallBlind: 5,
      phase: 'flop',
      players: [{ id: 'hero', chips: 500, roundBet: 0, status: 'active', isDealer: false }],
      dealerIndex: 0,
    },
    botId: 'bot-1',
    botState,
    position: 'middle',
    playerCount: 6,
    boardTexture: 'dry',
    handAssessment: {
      category: 'strong' as const,
      rank: 1,
      made: true,
      relativeStrength: 80,
      showdownValue: 80,
      nutPotential: 'medium' as const,
      vulnerability: 20,
      drawQuality: 0,
      cleanOuts: 0,
      blockerValue: 0,
      drawTypes: [],
      boardGotWorse: false,
      strength: 50,
    },
    metrics: {
      potOdds: 0.25,
      spr: 5,
      effectiveStack: 500,
      stackDepth: 'medium' as const,
      callCommitment: 0.1,
      minRaiseTo: 100,
      maxRaiseTo: 1000,
      preferredRaiseTo: 150,
    } as any,
    legalActions: {
      fold: true,
      check: false,
      callAmount: 50,
      raise: { minAmount: 100, maxAmount: 1000 },
      allInAmount: null,
    },
    ...overrides,
  }
}

function makeActions(legalActions: LegalActions): ScoredAction[] {
  const actions: ScoredAction[] = []
  if (legalActions.fold) actions.push({ action: { type: 'fold' }, intent: 'fold', utility: 50, contributions: [] })
  if (legalActions.callAmount != null) actions.push({ action: { type: 'call' }, intent: 'bluff-catch', utility: 50, contributions: [] })
  if (legalActions.raise) actions.push({ action: { type: 'raise', amount: legalActions.raise.minAmount }, intent: 'value', utility: 50, contributions: [] })
  return actions
}

function findUtility(actions: ScoredAction[], type: string): number {
  return actions.find(a => a.action.type === type)?.utility ?? 0
}

describe('archetype-specific mental state modifiers', () => {
  const rng = () => 0.5

  it('makes tilted Nit prefer folding over raising', () => {
    const nit = createBotState(NIT_PERSONALITY, 100, rng)
    nit.mentalState.tilt = 80
    nit.mentalState.confidence = 50
    nit.mentalState.patience = 50
    const ctx = makeContext(nit)
    const actions = makeActions(ctx.legalActions)
    const results = applyPersonalityModifiers(actions, ctx)

    expect(findUtility(results, 'fold')).toBeGreaterThan(findUtility(results, 'raise'))
  })

  it('makes tilted LAG strongly prefer aggression', () => {
    const lag = createBotState(LAG_PERSONALITY, 100, rng)
    lag.mentalState.tilt = 80
    lag.mentalState.confidence = 50
    lag.mentalState.patience = 50
    const ctx = makeContext(lag)
    const actions = makeActions(ctx.legalActions)
    const results = applyPersonalityModifiers(actions, ctx)

    expect(findUtility(results, 'raise')).toBeGreaterThan(findUtility(results, 'fold') + 10)
  })

  it('makes tilted Calling Station prefer calling', () => {
    const cs = createBotState(CALLING_STATION_PERSONALITY, 100, rng)
    cs.mentalState.tilt = 80
    cs.mentalState.confidence = 50
    cs.mentalState.patience = 50
    const ctx = makeContext(cs)
    const actions = makeActions(ctx.legalActions)
    const results = applyPersonalityModifiers(actions, ctx)

    expect(findUtility(results, 'call')).toBeGreaterThan(findUtility(results, 'raise'))
    expect(findUtility(results, 'call')).toBeGreaterThan(findUtility(results, 'fold'))
  })

  it('has no mental state effects when tilt is below threshold', () => {
    const lag = createBotState(LAG_PERSONALITY, 100, rng)
    lag.mentalState.tilt = 0
    lag.mentalState.confidence = 50
    lag.mentalState.patience = 50
    const ctx = makeContext(lag)
    const actions = makeActions(ctx.legalActions)
    const results = applyPersonalityModifiers(actions, ctx)

    for (const result of results) {
      const mentalContribs = result.contributions.filter(c => c.category === 'mental-state')
      expect(mentalContribs.length).toBe(0)
    }
  })

  it('applies confidence-based caution differently per archetype', () => {
    const lag = createBotState(LAG_PERSONALITY, 100, rng)
    lag.mentalState.tilt = 0
    lag.mentalState.confidence = 20
    lag.mentalState.patience = 50
    const nit = createBotState(NIT_PERSONALITY, 100, rng)
    nit.mentalState.tilt = 0
    nit.mentalState.confidence = 20
    nit.mentalState.patience = 50

    const lagResult = applyPersonalityModifiers(makeActions(makeContext(lag).legalActions), makeContext(lag))
    const nitResult = applyPersonalityModifiers(makeActions(makeContext(nit).legalActions), makeContext(nit))

    const lagRaiseMod = lagResult.find(a => a.action.type === 'raise')!
      .contributions.filter(c => c.category === 'mental-state' && c.label === 'Low confidence reduces aggression')
    const nitRaiseMod = nitResult.find(a => a.action.type === 'raise')!
      .contributions.filter(c => c.category === 'mental-state' && c.label === 'Low confidence reduces aggression')

    expect(lagRaiseMod.length).toBe(1)
    expect(nitRaiseMod.length).toBe(1)
    expect(lagRaiseMod[0].value).not.toBe(nitRaiseMod[0].value)
  })

  it('makes impatient Calling Station call more but discourages raising', () => {
    const cs = createBotState(CALLING_STATION_PERSONALITY, 100, rng)
    cs.mentalState.tilt = 0
    cs.mentalState.confidence = 50
    cs.mentalState.patience = 20
    const ctx = makeContext(cs)
    const actions = makeActions(ctx.legalActions)
    const results = applyPersonalityModifiers(actions, ctx)

    const callContrib = results.find(a => a.action.type === 'call')!
      .contributions.filter(c => c.category === 'mental-state' && c.label === 'Low patience calls')
    const raiseContrib = results.find(a => a.action.type === 'raise')!
      .contributions.filter(c => c.category === 'mental-state' && c.label === 'Low patience aggression')

    expect(callContrib.length).toBe(1)
    expect(callContrib[0].value).toBeGreaterThan(0)
    if (raiseContrib.length > 0) {
      expect(raiseContrib[0].value).toBeLessThan(0)
    }
  })
})
