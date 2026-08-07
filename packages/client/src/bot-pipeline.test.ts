import { describe, expect, it } from 'vitest'
import type { BettingContext, Card, LegalActions, PlayerAction } from '@cpc/shared'
import { createBotState } from './bot-state'
import { deriveDecisionMetrics } from './bot-decision-metrics'
import { decideAction, scoreActions, type DecisionContext } from './bot-pipeline'
import { applySkillPerception } from './bot-skill-perception'
import { CALLING_STATION_PERSONALITY, LAG_PERSONALITY, TAG_PERSONALITY } from './bot-tag'
import { NLHE_CATEGORY_SCORES } from './bot-category-scores'
import type { OpponentLine, StreetAnalysis } from './bot-street-analysis'

const cards: [Card, Card] = [
  { rank: 'A', suit: 'spades' },
  { rank: 'K', suit: 'spades' },
]

function context(
  legalActions: LegalActions,
  overrides: Partial<BettingContext> = {},
): DecisionContext {
  const bettingContext: BettingContext = {
    playerId: 'bot',
    totalPot: 100,
    toCall: legalActions.callAmount ?? 0,
    callAmount: legalActions.callAmount ?? 0,
    potOdds: legalActions.callAmount ? legalActions.callAmount / (100 + legalActions.callAmount) : 0,
    toCallPotRatio: legalActions.callAmount ? legalActions.callAmount / 100 : 0,
    potRaiseTo: 300,
    minRaiseTo: legalActions.raise?.minAmount ?? 0,
    maxRaiseTo: legalActions.raise?.maxAmount ?? 1000,
    playerStack: 1000,
    effectiveStack: 1000,
    spr: 10,
    legalActions,
    ...overrides,
  }

  return {
    gameView: {
      myCards: cards,
      board: [],
      pot: bettingContext.totalPot,
      currentBet: bettingContext.toCall,
      minRaiseTo: bettingContext.minRaiseTo,
      maxRaiseTo: bettingContext.maxRaiseTo,
      canRaise: legalActions.raise != null,
      bigBlind: 20,
      smallBlind: 10,
      phase: 'flop',
      players: [],
      dealerIndex: 0,
    },
    botId: 'bot',
    botState: createBotState(TAG_PERSONALITY, 50, () => 0.5),
    variantId: 'texas-holdem',
    position: 'late',
    playerCount: 2,
    boardTexture: 'neutral',
    handAssessment: {
      category: 'strong',
      rank: 4,
      made: true,
      relativeStrength: 80,
      showdownValue: 75,
      nutPotential: 'strong',
      vulnerability: 30,
      drawQuality: 0,
      cleanOuts: 0,
      blockerValue: 0,
      drawTypes: [],
      boardGotWorse: false,
      strength: 82,
    },
    metrics: deriveDecisionMetrics(bettingContext, 20),
    legalActions,
    categoryScores: NLHE_CATEGORY_SCORES,
  }
}

function withSizingRead(decisionContext: DecisionContext, potFraction: number): DecisionContext {
  const opponentLine: OpponentLine = {
    playerId: 'villain',
    preflop: 'called',
    flop: 'bet',
    turn: null,
    river: null,
    aggressivePotFractions: { preflop: null, flop: potFraction, turn: null, river: null },
  }
  const streetAnalysis: StreetAnalysis = {
    preflopAggressor: 'villain',
    preflopRaiseCount: 1,
    streetAggressor: { preflop: 'villain', flop: 'villain', turn: null, river: null },
    iAmPreflopAggressor: false,
    opponentLines: new Map([['villain', opponentLine]]),
    activeOpponents: 1,
    opponentShowedWeakness: false,
    opponentCheckRaised: false,
    street: 'flop',
    actionCountThisStreet: 1,
  }
  decisionContext.streetAnalysis = streetAnalysis
  decisionContext.botState.skill.level = 100
  decisionContext.botState.reads.opponents.set('villain', {
    playerId: 'villain',
    vpipEstimate: { successes: 3, failures: 7 },
    aggressionEstimate: { successes: 3, failures: 7 },
    foldToBetEstimate: { successes: 5, failures: 5 },
    handsSampled: 5,
    effectiveObservations: 5,
    sizing: { average: 0.5, count: 4 },
  })
  return decisionContext
}

describe('bot utility candidates', () => {
  it('scores exactly every action exposed by the engine', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: 1000,
    }

    expect(scoreActions(context(legalActions)).map(candidate => candidate.action.type))
      .toEqual(['fold', 'call', 'raise', 'all-in'])
  })

  it('scores the PLO raise-or-call preflop mix as a weighted choice', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.variantId = 'omaha-high'
    decisionContext.gameView.phase = 'preflop'
    decisionContext.preflopRangeAction = 'raise-or-call'

    const actions = scoreActions(decisionContext)
    const strategyValue = (type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.category === 'strategy')!.value

    expect(strategyValue('call')).toBe(3)
    expect(strategyValue('raise')).toBe(17)
  })

  it('scores the PLO call-or-fold preflop mix without adding raises', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.variantId = 'omaha-high'
    decisionContext.gameView.phase = 'preflop'
    decisionContext.preflopRangeAction = 'call-or-fold'

    const actions = scoreActions(decisionContext)
    const strategyValue = (type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.category === 'strategy')!.value

    expect(strategyValue('fold')).toBe(2)
    expect(strategyValue('call')).toBe(8)
    expect(strategyValue('raise')).toBe(-12)
  })

  it('adds targeted PLO protection for vulnerable made hands before the river', () => {
    const legalActions: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: { minAmount: 40, maxAmount: 300 },
      allInAmount: 1000,
    }
    const decisionContext = context(legalActions)
    decisionContext.variantId = 'omaha-high'
    decisionContext.gameView.board = [
      { rank: 'A', suit: 'spades' },
      { rank: 'Q', suit: 'hearts' },
      { rank: 'J', suit: 'diamonds' },
    ]
    decisionContext.boardTexture = 'wet'
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'good',
      rank: 4,
      made: true,
      vulnerability: 75,
    }

    const raise = scoreActions(decisionContext)
      .find(candidate => candidate.action.type === 'raise')!

    expect(raise.contributions).toContainEqual(expect.objectContaining({
      label: 'PLO vulnerable made hand — deny equity',
      value: 8,
    }))
  })

  it('does not invent actions absent from the engine context', () => {
    const legalActions: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: null,
      allInAmount: null,
    }

    expect(scoreActions(context(legalActions)).map(candidate => candidate.action.type))
      .toEqual(['check'])
  })

  it('values a strong-hand shove more at low SPR than deep stacked', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const lowSpr = context(legalActions, { effectiveStack: 150, spr: 1.5 })
    const deep = context(legalActions, { effectiveStack: 2400, playerStack: 2400, spr: 10 })
    const utility = (candidateContext: DecisionContext) => scoreActions(candidateContext)
      .find(candidate => candidate.action.type === 'all-in')!.utility

    expect(utility(lowSpr)).toBeGreaterThan(utility(deep))
  })

  it('makes a deep-stack open shove ineligible without hiding the legal action', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 2000 },
      allInAmount: 2000,
    }
    const decisionContext = context(legalActions, {
      effectiveStack: 2000,
      playerStack: 2000,
      spr: 50,
    })
    decisionContext.gameView.phase = 'preflop'
    decisionContext.handAssessment.category = 'premium'
    decisionContext.preflopRangeAction = 'raise'

    const shove = scoreActions(decisionContext)
      .find(candidate => candidate.action.type === 'all-in')!

    expect(shove.utility).toBe(0)
    expect(shove.selectionEligible).toBe(false)
    expect(shove.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: expect.stringContaining('Deep-stack open shove') }),
    ]))
  })

  it('still permits a premium preflop shove once the stack is meaningfully committed', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 400,
      raise: { minAmount: 800, maxAmount: 2000 },
      allInAmount: 2000,
    }
    const decisionContext = context(legalActions, {
      effectiveStack: 2000,
      playerStack: 2000,
      spr: 4,
    })
    decisionContext.gameView.phase = 'preflop'
    decisionContext.handAssessment.category = 'premium'
    decisionContext.preflopRangeAction = 'raise'

    const shove = scoreActions(decisionContext)
      .find(candidate => candidate.action.type === 'all-in')!

    expect(shove.utility).toBeGreaterThan(0)
    expect(shove.selectionEligible).not.toBe(false)
    expect(shove.contributions.some(contribution => contribution.label.includes('not committed'))).toBe(false)
  })

  it('does not let LAG personality revive an uncommitted 60 BB shove', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 40,
      raise: { minAmount: 120, maxAmount: 1200 },
      allInAmount: 1200,
    }
    const decisionContext = context(legalActions, {
      effectiveStack: 1200,
      playerStack: 1200,
      spr: 12,
    })
    decisionContext.gameView.phase = 'preflop'
    decisionContext.botState = createBotState(LAG_PERSONALITY, 100, () => 0.25)
    decisionContext.handAssessment.category = 'strong'
    decisionContext.preflopRangeAction = 'raise'

    const result = decideAction(decisionContext, { random: () => 0.99 })
    const shove = result.allActions.find(candidate => candidate.action.type === 'all-in')!

    expect(shove.selectionEligible).toBe(false)
    expect(shove.utility).toBe(0)
    expect(result.action.type).not.toBe('all-in')
  })

  it('records an aggressive all-in as a bet and a short all-in as a call', () => {
    const aggressiveActions: LegalActions = {
      fold: false,
      check: false,
      callAmount: null,
      raise: null,
      allInAmount: 500,
    }
    const shortCallActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 30,
      raise: null,
      allInAmount: 30,
    }

    expect(decideAction(context(aggressiveActions), { random: () => 0 }).stateUpdates.lastAction).toBe('bet')
    expect(decideAction(context(shortCallActions), { random: () => 0 }).stateUpdates.lastAction).toBe('call')
  })

  it('records an explicit intent and additive reasons for every base score', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'air',
      relativeStrength: 10,
      nutPotential: 'weak',
      strength: 8,
    }
    decisionContext.boardTexture = 'dry'

    const actions = scoreActions(decisionContext)
    const raise = actions.find(candidate => candidate.action.type === 'raise')!
    const call = actions.find(candidate => candidate.action.type === 'call')!

    expect(raise.intent).toBe('bluff')
    expect(raise.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'hand-strength', label: expect.stringMatching(/raise with air/i) }),
      expect.objectContaining({ category: 'position' }),
      expect.objectContaining({ category: 'board-texture', label: expect.stringMatching(/bluff/i) }),
    ]))
    expect(call.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'betting-context', label: expect.stringMatching(/pot odds/i) }),
      expect.objectContaining({ category: 'betting-context', label: expect.stringMatching(/bet\/pot ratio/i) }),
    ]))

    for (const candidate of actions) {
      const explainedUtility = Math.max(0, Math.min(100,
        50 + candidate.contributions.reduce((sum, contribution) => sum + contribution.value, 0)
      ))
      expect(candidate.utility).toBeCloseTo(explainedUtility)
    }
  })

  it('applies a large sizing tell consistently to fold, call and raise', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const actions = scoreActions(withSizingRead(context(legalActions), 1.5))
    const sizingValue = (type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('Massive overbet'))!.value

    expect(sizingValue('fold')).toBeGreaterThan(0)
    expect(sizingValue('call')).toBeLessThan(0)
    expect(sizingValue('raise')).toBeLessThan(0)
  })

  it('treats an unusually small sizing as attackable instead of strong', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const actions = scoreActions(withSizingRead(context(legalActions), 0.1))
    const sizingValue = (type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('Unusually small'))!.value

    expect(sizingValue('fold')).toBeLessThan(0)
    expect(sizingValue('call')).toBeGreaterThan(0)
    expect(sizingValue('raise')).toBeGreaterThan(0)
  })

  it('lets naturally aggressive bots attack small bets more strongly', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const passive = withSizingRead(context(legalActions), 0.1)
    passive.botState.personality.aggression = 20
    const aggressive = withSizingRead(context(legalActions), 0.1)
    aggressive.botState.personality.aggression = 80
    const raiseTell = (candidateContext: DecisionContext) => scoreActions(candidateContext)
      .find(candidate => candidate.action.type === 'raise')!
      .contributions.find(contribution => contribution.label.includes('Unusually small'))!.value

    expect(raiseTell(passive)).toBeLessThan(raiseTell(aggressive))
  })

  it('respects aggression from an otherwise passive opponent', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      strength: 50,
    }
    decisionContext.opponentStats = {
      vpip: 25,
      aggression: 25,
      foldToBet: 50,
      confidence: 0.8,
    }
    const actions = scoreActions(decisionContext)
    const readValue = (type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('passive opponent'))!.value

    expect(readValue('fold')).toBeGreaterThan(0)
    expect(readValue('call')).toBeLessThan(0)
  })

  it('keeps personality and skill perception as separate score reasons', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const result = decideAction(context(legalActions), { random: () => 0.5 })
    const raise = result.allActions.find(candidate => candidate.action.type === 'raise')!

    expect(result.perceptionErrors.length).toBeGreaterThan(0)
    expect(raise.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'personality', label: 'Aggression' }),
      expect.objectContaining({ category: 'skill-perception', label: expect.stringMatching(/→/) }),
    ]))
    for (const candidate of result.allActions) {
      const explainedUtility = 50 + candidate.contributions
        .reduce((sum, contribution) => sum + contribution.value, 0)
      expect(candidate.utility).toBeCloseTo(explainedUtility)
    }
  })

  it('makes a LAG prefer explainable pressure over a TAG in the same marginal spot', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const tagContext = context(legalActions)
    tagContext.botState = createBotState(TAG_PERSONALITY, 100, () => 0.25)
    tagContext.handAssessment = {
      ...tagContext.handAssessment,
      category: 'air',
      relativeStrength: 15,
      showdownValue: 10,
      nutPotential: 'weak',
    }
    tagContext.boardTexture = 'dry'

    const lagContext: DecisionContext = {
      ...tagContext,
      botState: createBotState(LAG_PERSONALITY, 100, () => 0.25),
    }
    const tag = decideAction(tagContext, { random: () => 0.5 }).allActions
    const lag = decideAction(lagContext, { random: () => 0.5 }).allActions
    const utility = (actions: typeof tag, action: PlayerAction['type']) =>
      actions.find(candidate => candidate.action.type === action)!.utility

    expect(utility(lag, 'raise')).toBeGreaterThan(utility(tag, 'raise'))
    expect(utility(lag, 'fold')).toBeLessThan(utility(tag, 'fold'))
    expect(lag.find(candidate => candidate.action.type === 'raise')!.contributions)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ category: 'personality', label: 'Aggression' }),
        expect.objectContaining({ category: 'personality', label: 'Bluff frequency' }),
        expect.objectContaining({ category: 'personality', label: 'Risk tolerance affects aggression' }),
      ]))
  })

  it('makes a Calling Station prefer bluff-catching calls over folding or initiative', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const tagContext = context(legalActions)
    tagContext.botState = createBotState(TAG_PERSONALITY, 100, () => 0.25)
    tagContext.handAssessment = {
      ...tagContext.handAssessment,
      category: 'weak',
      relativeStrength: 30,
      showdownValue: 30,
      nutPotential: 'weak',
    }
    const stationContext: DecisionContext = {
      ...tagContext,
      botState: createBotState(CALLING_STATION_PERSONALITY, 100, () => 0.25),
    }
    const tag = decideAction(tagContext, { random: () => 0.5 }).allActions
    const station = decideAction(stationContext, { random: () => 0.5 }).allActions
    const utility = (actions: typeof tag, action: PlayerAction['type']) =>
      actions.find(candidate => candidate.action.type === action)!.utility

    expect(utility(station, 'call')).toBeGreaterThan(utility(tag, 'call'))
    expect(utility(station, 'fold')).toBeLessThan(utility(tag, 'fold'))
    expect(utility(station, 'raise')).toBeLessThan(utility(tag, 'raise'))
    expect(station.find(candidate => candidate.action.type === 'raise')!.contributions)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          category: 'personality',
          label: 'Passive style avoids initiative',
          value: expect.any(Number),
        }),
      ]))
  })

  it('does not double-penalize Calling Station value bets with made hands', () => {
    const legalActions: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.botState = createBotState(CALLING_STATION_PERSONALITY, 100, () => 0.25)
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      made: true,
      drawTypes: [],
    }

    const raise = decideAction(decisionContext, { random: () => 0.5 }).allActions
      .find(candidate => candidate.action.type === 'raise')!

    expect(raise.intent).toBe('value')
    expect(raise.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'personality', label: 'Aggression' }),
    ]))
    expect(raise.contributions.some(contribution => contribution.label === 'Passive style avoids initiative')).toBe(false)
  })

  it('keeps the separate PLO Calling Station initiative model unchanged', () => {
    const legalActions: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.variantId = 'omaha-high'
    decisionContext.botState = createBotState(CALLING_STATION_PERSONALITY, 100, () => 0.25)
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      made: true,
      drawTypes: [],
    }

    const raise = decideAction(decisionContext, { random: () => 0.5 }).allActions
      .find(candidate => candidate.action.type === 'raise')!

    expect(raise.contributions.some(contribution => contribution.label === 'Passive style avoids initiative')).toBe(true)
  })

  it('penalizes weak drawless calls under repeated turn and river pressure', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: null,
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.gameView.phase = 'river'
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'weak',
      made: false,
      drawTypes: [],
    }
    decisionContext.streetAnalysis = {
      preflopAggressor: 'villain',
      preflopRaiseCount: 1,
      streetAggressor: { preflop: 'villain', flop: 'villain', turn: 'villain', river: 'villain' },
      iAmPreflopAggressor: false,
      opponentLines: new Map([['villain', {
        playerId: 'villain',
        preflop: 'raised',
        flop: 'bet',
        turn: 'bet',
        river: 'bet',
        aggressivePotFractions: { preflop: 3, flop: 0.6, turn: 0.6, river: 0.25 },
      }]]),
      activeOpponents: 1,
      opponentShowedWeakness: false,
      opponentCheckRaised: false,
      street: 'river',
      actionCountThisStreet: 1,
    }

    const call = scoreActions(decisionContext).find(candidate => candidate.action.type === 'call')!
    expect(call.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '3-street pressure against weak showdown value', value: -18 }),
      expect.objectContaining({ label: 'No made hand at showdown', value: -8 }),
    ]))

    decisionContext.variantId = 'omaha-high'
    const ploCall = scoreActions(decisionContext).find(candidate => candidate.action.type === 'call')!
    expect(ploCall.contributions.some(contribution => contribution.label.includes('street pressure'))).toBe(false)
  })

  it('gives a perfect-skill bot exact perception without consuming fair data', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: null,
      allInAmount: null,
    }
    const actual = context(legalActions)
    actual.botState.skill.level = 100
    const perception = applySkillPerception(actual, { random: () => 0.2 })

    expect(perception.errors).toEqual([])
    expect(perception.context).toBe(actual)
  })

  it('models concrete low-skill errors without mutating engine-derived context', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const actual = context(legalActions)
    actual.botState.skill.level = 0
    actual.handAssessment = {
      ...actual.handAssessment,
      relativeStrength: 70,
      drawQuality: 60,
      cleanOuts: 9,
      drawTypes: ['flush-draw'],
    }
    const originalHand = { ...actual.handAssessment, drawTypes: [...actual.handAssessment.drawTypes] }
    const originalMetrics = { ...actual.metrics }

    const perception = applySkillPerception(actual, { random: () => 0.2 })

    expect(perception.errors.map(error => error.field)).toEqual(expect.arrayContaining([
      'relative-strength',
      'draws',
      'clean-outs',
      'pot-odds',
      'bet-size',
      'spr',
    ]))
    expect(perception.context.handAssessment).not.toEqual(originalHand)
    expect(perception.context.metrics).not.toEqual(originalMetrics)
    expect(actual.handAssessment).toEqual(originalHand)
    expect(actual.metrics).toEqual(originalMetrics)
    expect(perception.context.legalActions).toBe(actual.legalActions)
    expect(perception.context.gameView).toBe(actual.gameView)
  })

  it('makes perception errors smaller as skill rises', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: null,
      allInAmount: null,
    }
    const lowSkill = context(legalActions)
    const highSkill = context(legalActions)
    lowSkill.botState.skill.level = 20
    highSkill.botState.skill.level = 80

    const low = applySkillPerception(lowSkill, { random: () => 0.2 }).context.handAssessment.relativeStrength
    const high = applySkillPerception(highSkill, { random: () => 0.2 }).context.handAssessment.relativeStrength
    const actual = lowSkill.handAssessment.relativeStrength

    expect(Math.abs(high - actual)).toBeLessThan(Math.abs(low - actual))
  })
})
