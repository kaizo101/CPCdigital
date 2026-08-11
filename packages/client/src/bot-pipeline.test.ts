import { describe, expect, it } from 'vitest'
import type { BettingContext, Card, LegalActions, PlayerAction } from '@cpc/shared'
import { createBotState } from './bot-state'
import { deriveDecisionMetrics } from './bot-decision-metrics'
import { decideAction, scoreActions, type DecisionContext } from './bot-pipeline'
import { applySkillPerception } from './bot-skill-perception'
import { CALLING_STATION_PERSONALITY, LAG_PERSONALITY, TAG_PERSONALITY } from './bot-tag'
import { getNlheScores, NLHE_CATEGORY_SCORES } from './bot-category-scores'
import type { OpponentLine, StreetAnalysis } from './bot-street-analysis'
import { params } from './bot-params'

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
    tableSize: 2,
    activePlayerCount: 2,
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
      equityCollapse: 0,
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

function postflopAnalysis(overrides: Partial<StreetAnalysis> = {}): StreetAnalysis {
  return {
    preflopAggressor: 'villain',
    preflopRaiseCount: 1,
    streetAggressor: { preflop: 'villain', flop: 'villain', turn: null, river: null },
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

function preflopEscalationContext(options: {
  raiseCount: number
  holeCards: Card[]
  category: DecisionContext['handAssessment']['category']
  skill?: number
  lag?: boolean
  potCommitment?: number
  effectiveStackBb?: number
  variantId?: DecisionContext['variantId']
}): DecisionContext {
  const playerStack = (options.effectiveStackBb ?? 100) * 20
  const callAmount = playerStack * 0.3
  const potCommitment = options.potCommitment ?? 0.3
  const voluntaryHandContribution = potCommitment >= 1
    ? playerStack
    : (potCommitment * playerStack) / (1 - potCommitment)
  const legalActions: LegalActions = {
    fold: true,
    check: false,
    callAmount,
    raise: { minAmount: callAmount * 2, maxAmount: playerStack },
    allInAmount: playerStack,
  }
  const result = context(legalActions, {
    effectiveStack: playerStack,
    playerStack,
    playerStartingStack: playerStack + voluntaryHandContribution,
    voluntaryHandContribution,
    spr: 2,
  })
  result.gameView.phase = 'preflop'
  result.gameView.myCards = options.holeCards
  result.gameView.currentBet = callAmount
  result.variantId = options.variantId ?? 'texas-holdem'
  result.handAssessment.category = options.category
  result.preflopRangeAction = options.category === 'premium' ? 'raise' : 'call-or-fold'
  result.streetAnalysis = postflopAnalysis({
    street: 'preflop',
    preflopRaiseCount: options.raiseCount,
  })
  result.botState = createBotState(
    options.lag ? LAG_PERSONALITY : TAG_PERSONALITY,
    options.skill ?? 90,
    () => 0.5,
  )
  if (options.lag) result.botState.personality.aggression = 80
  return result
}

function escalationValue(context: DecisionContext, type: PlayerAction['type']): number | undefined {
  return scoreActions(context)
    .find(candidate => candidate.action.type === type)
    ?.contributions.find(contribution => contribution.label.includes('-bet model'))
    ?.value
}

function riverBetFoldContext(response: boolean = false): DecisionContext {
  const callAmount = response ? 80 : null
  const legalActions: LegalActions = response
    ? {
        fold: true,
        check: false,
        callAmount,
        raise: { minAmount: 240, maxAmount: 1000 },
        allInAmount: 1000,
      }
    : {
        fold: false,
        check: true,
        callAmount,
        raise: { minAmount: 60, maxAmount: 1000 },
        allInAmount: 1000,
      }
  const result = context(legalActions, {
    totalPot: 200,
    toCall: callAmount ?? 0,
    callAmount: callAmount ?? 0,
    potOdds: callAmount ? callAmount / (200 + callAmount) : 0,
    toCallPotRatio: callAmount ? callAmount / 200 : 0,
    effectiveStack: 1000,
    playerStack: 1000,
    spr: 5,
  })
  result.gameView.phase = 'river'
  result.gameView.board = [
    { rank: 'K', suit: 'clubs' },
    { rank: 'T', suit: 'diamonds' },
    { rank: '7', suit: 'hearts' },
    { rank: '3', suit: 'spades' },
    { rank: '2', suit: 'clubs' },
  ]
  result.gameView.currentBet = callAmount ?? 0
  result.activePlayerCount = 2
  result.botState.skill.level = 90
  result.handAssessment = {
    ...result.handAssessment,
    category: 'medium',
    rank: 3,
    made: true,
    relativeStrength: 65,
    showdownValue: 55,
    nutPotential: 'medium',
    drawTypes: [],
    strength: 62,
  }
  result.streetAnalysis = postflopAnalysis({
    street: 'river',
    streetAggressor: {
      preflop: 'bot',
      flop: 'bot',
      turn: null,
      river: response ? 'villain' : null,
    },
    iBetCurrentStreet: response,
    opponentRaisedMyBetCurrentStreet: response,
    actionCountThisStreet: response ? 2 : 0,
  })
  if (response) result.botState.memory.hand.betFoldStreet = 'river'
  return result
}

describe('bot utility candidates', () => {
  it('records an explicit thin-value river bet-fold plan when the bet is chosen', () => {
    const opening = riverBetFoldContext()
    const decision = decideAction(opening, { random: () => 0.5 })
    const check = decision.allActions.find(candidate => candidate.action.type === 'check')!
    const bet = decision.allActions.find(candidate => candidate.action.type === 'raise')!
    const shove = decision.allActions.find(candidate => candidate.action.type === 'all-in')!
    const planValue = (candidate: typeof bet) => candidate.contributions
      .find(contribution => contribution.label.includes('river bet-fold plan'))?.value

    expect(planValue(check)).toBeLessThan(0)
    expect(planValue(bet)).toBeGreaterThan(0)
    expect(planValue(shove)).toBeLessThan(0)
    expect(decision.action.type).toBe('raise')
    expect(decision.stateUpdates.betFoldStreet).toBe('river')
  })

  it('executes the remembered fold after an opponent raises the thin river value-bet', () => {
    const response = riverBetFoldContext(true)
    const decision = decideAction(response, { random: () => 0.5 })
    const action = (type: PlayerAction['type']) => decision.allActions
      .find(candidate => candidate.action.type === type)!
    const planValue = (type: PlayerAction['type']) => action(type).contributions
      .find(contribution => contribution.label.includes('opponent raised thin value'))?.value

    expect(planValue('fold')).toBeGreaterThan(0)
    expect(planValue('call')).toBeLessThan(0)
    expect(planValue('raise')).toBeLessThan(0)
    expect(planValue('all-in')).toBeLessThan(0)
    expect(action('raise').selectionEligible).toBe(false)
    expect(action('all-in').selectionEligible).toBe(false)
    expect(action('fold').utility).toBeGreaterThan(action('call').utility)
    expect(decision.action.type).toBe('fold')
    expect(decision.stateUpdates.betFoldStreet).toBeNull()
  })

  it('does not apply bet-fold discipline to protected value, PLO, low skill, or an unproven sequence', () => {
    const contribution = (decisionContext: DecisionContext) => decideAction(
      decisionContext,
      { random: () => 0.5 },
    ).allActions.flatMap(candidate => candidate.contributions)
      .find(item => item.label.includes('river bet-fold plan'))

    const protectedValue = riverBetFoldContext(true)
    protectedValue.handAssessment.category = 'strong'
    protectedValue.handAssessment.nutPotential = 'near-nuts'
    expect(contribution(protectedValue)).toBeUndefined()

    const plo = riverBetFoldContext(true)
    plo.variantId = 'omaha-high'
    expect(contribution(plo)).toBeUndefined()

    const lowSkill = riverBetFoldContext(true)
    lowSkill.botState.skill.level = 20
    expect(contribution(lowSkill)).toBeUndefined()

    const noRaiseSequence = riverBetFoldContext(true)
    noRaiseSequence.streetAnalysis!.opponentRaisedMyBetCurrentStreet = false
    expect(contribution(noRaiseSequence)).toBeUndefined()
  })

  it('polarizes NLHE 4-bets into value and skilled ace-blocker bluffs', () => {
    const aces = preflopEscalationContext({
      raiseCount: 2,
      holeCards: [{ rank: 'A', suit: 'spades' }, { rank: 'A', suit: 'hearts' }],
      category: 'premium',
    })
    expect(escalationValue(aces, 'fold')).toBeLessThan(0)
    expect(escalationValue(aces, 'raise')).toBeGreaterThan(0)

    const blockerBluff = preflopEscalationContext({
      raiseCount: 2,
      holeCards: [{ rank: 'A', suit: 'spades' }, { rank: '5', suit: 'spades' }],
      category: 'weak',
      lag: true,
      skill: 90,
    })
    expect(escalationValue(blockerBluff, 'raise')).toBeGreaterThan(0)

    blockerBluff.botState.skill.level = 20
    expect(escalationValue(blockerBluff, 'raise')).toBeLessThan(0)
  })

  it('uses commitment-aware 5-bet and fold-to-5-bet boundaries', () => {
    const aces = preflopEscalationContext({
      raiseCount: 3,
      holeCards: [{ rank: 'A', suit: 'spades' }, { rank: 'A', suit: 'hearts' }],
      category: 'premium',
    })
    const aceActions = scoreActions(aces)
    expect(escalationValue(aces, 'fold')).toBeLessThan(0)
    expect(escalationValue(aces, 'all-in')).toBeGreaterThan(0)
    expect(aceActions.find(candidate => candidate.action.type === 'all-in')?.selectionEligible).not.toBe(false)

    const nonCore = preflopEscalationContext({
      raiseCount: 3,
      holeCards: [{ rank: 'Q', suit: 'spades' }, { rank: 'J', suit: 'hearts' }],
      category: 'strong',
    })
    const nonCoreActions = scoreActions(nonCore)
    expect(escalationValue(nonCore, 'fold')).toBeGreaterThan(0)
    expect(escalationValue(nonCore, 'call')).toBeLessThan(0)
    expect(escalationValue(nonCore, 'raise')).toBeLessThan(0)
    expect(nonCoreActions.find(candidate => candidate.action.type === 'raise')?.selectionEligible).toBe(false)
    expect(nonCoreActions.find(candidate => candidate.action.type === 'all-in')?.selectionEligible).toBe(false)

    const committedBlocker = preflopEscalationContext({
      raiseCount: 3,
      holeCards: [{ rank: 'A', suit: 'diamonds' }, { rank: '5', suit: 'diamonds' }],
      category: 'weak',
      lag: true,
      skill: 90,
      potCommitment: 0.3,
    })
    const blockerActions = scoreActions(committedBlocker)
    expect(escalationValue(committedBlocker, 'raise')).toBeGreaterThan(0)
    expect(blockerActions.find(candidate => candidate.action.type === 'raise')?.selectionEligible).not.toBe(false)
    expect(blockerActions.find(candidate => candidate.action.type === 'all-in')?.selectionEligible).not.toBe(false)
  })

  it('removes ace-blocker bluffs after a 5-bet and preserves only the value core', () => {
    const blocker = preflopEscalationContext({
      raiseCount: 4,
      holeCards: [{ rank: 'A', suit: 'clubs' }, { rank: '4', suit: 'clubs' }],
      category: 'weak',
      lag: true,
      skill: 100,
    })
    const blockerActions = scoreActions(blocker)
    expect(escalationValue(blocker, 'fold')).toBeGreaterThan(0)
    expect(escalationValue(blocker, 'raise')).toBeLessThan(0)
    expect(blockerActions.find(candidate => candidate.action.type === 'raise')?.selectionEligible).toBe(false)

    const kings = preflopEscalationContext({
      raiseCount: 4,
      holeCards: [{ rank: 'K', suit: 'clubs' }, { rank: 'K', suit: 'diamonds' }],
      category: 'premium',
    })
    expect(escalationValue(kings, 'fold')).toBeLessThan(0)
    expect(escalationValue(kings, 'call')).toBeGreaterThan(0)
  })

  it('keeps deep uncommitted escalation shoves ineligible even with pocket aces', () => {
    const deepAces = preflopEscalationContext({
      raiseCount: 3,
      holeCards: [{ rank: 'A', suit: 'spades' }, { rank: 'A', suit: 'hearts' }],
      category: 'premium',
      effectiveStackBb: 150,
      potCommitment: 0.1,
    })
    const shove = scoreActions(deepAces)
      .find(candidate => candidate.action.type === 'all-in')!

    expect(shove.selectionEligible).toBe(false)
    expect(shove.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: expect.stringContaining('Deep stack not committed') }),
    ]))
  })

  it('keeps PLO escalation linear rather than inventing NLHE ace-blocker bluffs', () => {
    const ploCards: Card[] = [
      { rank: 'A', suit: 'spades' },
      { rank: '5', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
      { rank: 'Q', suit: 'clubs' },
    ]
    const premium = preflopEscalationContext({
      raiseCount: 3,
      holeCards: ploCards,
      category: 'premium',
      variantId: 'omaha-high',
    })
    expect(escalationValue(premium, 'raise')).toBeGreaterThan(0)

    const nonPremium = preflopEscalationContext({
      raiseCount: 3,
      holeCards: ploCards,
      category: 'strong',
      variantId: 'omaha-high',
      lag: true,
      skill: 100,
    })
    expect(escalationValue(nonPremium, 'fold')).toBeGreaterThan(0)
    expect(escalationValue(nonPremium, 'raise')).toBeLessThan(0)
    expect(scoreActions(nonPremium).find(candidate => candidate.action.type === 'raise')?.selectionEligible).toBe(false)
  })

  it('does not add escalation factors before a player faces a 3-bet', () => {
    const facingOpen = preflopEscalationContext({
      raiseCount: 1,
      holeCards: [{ rank: 'A', suit: 'spades' }, { rank: '5', suit: 'spades' }],
      category: 'weak',
      lag: true,
      skill: 100,
    })
    expect(escalationValue(facingOpen, 'raise')).toBeUndefined()
  })

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

  it('uses PLO nut-or-fold evidence instead of the generic low-SPR defense rule', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const decisionContext = context(legalActions, { spr: 1 })
    decisionContext.variantId = 'omaha-high'
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      rank: 3,
      made: true,
      vulnerability: 30,
    }

    const actions = scoreActions(decisionContext)
    const fold = actions.find(candidate => candidate.action.type === 'fold')!
    const call = actions.find(candidate => candidate.action.type === 'call')!
    const disciplineWeight = 1 - (
      decisionContext.botState.personality.riskTolerance / 100
      * params.scoring.ploSprZones.commitmentRiskReduction
    )

    expect(fold.contributions).toContainEqual(expect.objectContaining({
      label: expect.stringContaining('PLO commitment zone'),
      value: Math.round(6 * disciplineWeight),
    }))
    expect(call.contributions).toContainEqual(expect.objectContaining({
      label: expect.stringContaining('PLO commitment zone'),
      value: Math.round(-8 * disciplineWeight),
    }))
    expect(fold.contributions.some(contribution => contribution.label.includes('pot committed, defend'))).toBe(false)
  })

  it('adds protection-zone pressure only to PLO vulnerable made hands', () => {
    const legalActions: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    const plo = context(legalActions, { spr: 5.5 })
    plo.variantId = 'omaha-high'
    plo.handAssessment = {
      ...plo.handAssessment,
      category: 'good',
      rank: 4,
      made: true,
      vulnerability: 75,
    }
    const nlhe = structuredClone(plo)
    nlhe.variantId = 'texas-holdem'

    const ploRaise = scoreActions(plo).find(candidate => candidate.action.type === 'raise')!
    const nlheRaise = scoreActions(nlhe).find(candidate => candidate.action.type === 'raise')!
    expect(ploRaise.contributions).toContainEqual(expect.objectContaining({
      label: expect.stringContaining('PLO protection zone'),
      value: 12,
    }))
    expect(nlheRaise.contributions.some(contribution => contribution.label.includes('PLO protection zone'))).toBe(false)
  })

  it('turns PLO equity collapse into graded pot-control and continuation penalties', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const plo = context(legalActions, { spr: 8 })
    plo.variantId = 'omaha-high'
    plo.gameView.phase = 'turn'
    plo.handAssessment = {
      ...plo.handAssessment,
      category: 'good',
      rank: 5,
      made: true,
      equityCollapse: 0.8,
      boardGotWorse: true,
    }

    const actions = scoreActions(plo)
    const collapseValue = (type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('PLO equity collapse'))?.value
    const archetypeScale = Math.max(
      params.scoring.equityCollapseMods.minimumArchetypeScale,
      1 - plo.botState.personality.riskTolerance / 100,
    )

    expect(collapseValue('fold')).toBe(Math.round(14 * 0.8 * archetypeScale))
    expect(collapseValue('call')).toBe(Math.round(-14 * 0.8 * archetypeScale))
    expect(collapseValue('raise')).toBe(Math.round(-18 * 0.8 * archetypeScale))
    expect(collapseValue('all-in')).toBe(Math.round(-24 * 0.8 * archetypeScale))

    plo.variantId = 'texas-holdem'
    expect(scoreActions(plo).every(candidate => (
      candidate.contributions.every(contribution => !contribution.label.includes('PLO equity collapse'))
    ))).toBe(true)
  })

  it('keeps the equity-collapse signal small when the bot can check behind', () => {
    const legalActions: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: { minAmount: 50, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const plo = context(legalActions, { callAmount: 0, spr: 8 })
    plo.variantId = 'omaha-high'
    plo.gameView.phase = 'turn'
    plo.handAssessment = {
      ...plo.handAssessment,
      category: 'good',
      rank: 5,
      made: true,
      equityCollapse: 0.8,
      boardGotWorse: true,
    }

    const actions = scoreActions(plo)
    const collapseValue = (type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('PLO equity collapse'))?.value
    const scale = Math.max(
      params.scoring.equityCollapseMods.minimumArchetypeScale,
      1 - plo.botState.personality.riskTolerance / 100,
    ) * params.scoring.equityCollapseMods.openActionScale

    expect(collapseValue('check')).toBe(Math.round(8 * 0.8 * scale))
    expect(collapseValue('raise')).toBe(Math.round(-18 * 0.8 * scale))
    expect(collapseValue('all-in')).toBe(Math.round(-24 * 0.8 * scale))
  })

  it('preserves archetype stickiness through risk-tolerance scaling', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const decisionContext = (riskTolerance: number) => {
      const result = context(legalActions, { spr: 8 })
      result.variantId = 'omaha-high'
      result.gameView.phase = 'turn'
      result.botState.personality.riskTolerance = riskTolerance
      result.handAssessment = {
        ...result.handAssessment,
        equityCollapse: 0.8,
        boardGotWorse: true,
      }
      return result
    }
    const foldCollapse = (riskTolerance: number) => scoreActions(decisionContext(riskTolerance))
      .find(candidate => candidate.action.type === 'fold')!
      .contributions.find(contribution => contribution.label.includes('PLO equity collapse'))!
      .value

    expect(foldCollapse(20)).toBeGreaterThan(foldCollapse(90))
  })

  it('uses actual postflop action order for PLO redraw realization', () => {
    const legalActions: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: { minAmount: 50, maxAmount: 1000 },
      allInAmount: null,
    }
    const decisionContext = (botIsDealer: boolean) => {
      const result = context(legalActions)
      result.variantId = 'omaha-high'
      result.gameView.phase = 'turn'
      result.gameView.players = [
        { id: 'bot', chips: 1000, roundBet: 0, status: 'active', isDealer: botIsDealer },
        { id: 'villain', chips: 1000, roundBet: 0, status: 'active', isDealer: !botIsDealer },
      ]
      result.gameView.dealerIndex = botIsDealer ? 0 : 1
      result.handAssessment = {
        ...result.handAssessment,
        category: 'medium',
        drawTypes: ['flush-draw'],
        cleanOuts: 3,
        nutPotential: 'medium',
      }
      return result
    }
    const hasIpRealization = (botIsDealer: boolean) => scoreActions(decisionContext(botIsDealer))
      .find(candidate => candidate.action.type === 'check')!
      .contributions.some(contribution => contribution.label.includes('realize thin redraw'))

    expect(hasIpRealization(true)).toBe(true)
    expect(hasIpRealization(false)).toBe(false)
    const nlhe = decisionContext(true)
    nlhe.variantId = 'texas-holdem'
    expect(scoreActions(nlhe).every(candidate => (
      candidate.contributions.every(contribution => !contribution.label.includes('PLO in position'))
    ))).toBe(true)
  })

  it('makes realizable PLO equity less fold-prone out of position', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: null,
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.variantId = 'omaha-high'
    decisionContext.gameView.phase = 'turn'
    decisionContext.botState.skill.level = 90
    decisionContext.gameView.players = [
      { id: 'bot', chips: 1000, roundBet: 0, status: 'active', isDealer: false },
      { id: 'villain', chips: 1000, roundBet: 25, status: 'active', isDealer: true },
    ]
    decisionContext.gameView.dealerIndex = 1
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      drawTypes: ['wrap-8+'],
      cleanOuts: 3,
      nutPotential: 'medium',
    }

    const fold = scoreActions(decisionContext).find(candidate => candidate.action.type === 'fold')!
    const oopFold = fold.contributions.find(contribution => contribution.label.includes('avoid exploitable fold'))
    expect(oopFold).toEqual(expect.objectContaining({ value: expect.any(Number) }))
    expect(oopFold!.value).toBeLessThan(0)

    decisionContext.gameView.players[0].isDealer = true
    decisionContext.gameView.players[1].isDealer = false
    decisionContext.gameView.dealerIndex = 0
    expect(scoreActions(decisionContext).find(candidate => candidate.action.type === 'fold')!
      .contributions.some(contribution => contribution.label.includes('avoid exploitable fold'))).toBe(false)
  })

  it('presses made PLO nut equity with a clean redraw as a freeroll', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const decisionContext = context(legalActions)
    decisionContext.variantId = 'omaha-high'
    decisionContext.gameView.phase = 'turn'
    decisionContext.botState.skill.level = 90
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'good',
      rank: 5,
      made: true,
      drawTypes: ['nut-flush-draw'],
      cleanOuts: 8,
      nutPotential: 'near-nuts',
    }
    const actions = scoreActions(decisionContext)
    const freerollValue = (type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('PLO freeroll'))!
      .value

    expect(freerollValue('fold')).toBeLessThan(0)
    expect(freerollValue('call')).toBeGreaterThan(0)
    expect(freerollValue('raise')).toBeGreaterThan(0)
    expect(freerollValue('all-in')).toBeGreaterThan(0)

    decisionContext.gameView.phase = 'river'
    expect(scoreActions(decisionContext).every(candidate => (
      candidate.contributions.every(contribution => !contribution.label.includes('PLO freeroll'))
    ))).toBe(true)
  })

  it('scores nut and bottom wraps in opposite directions without erasing skill or archetype', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const wrapContext = (
      quality: 'nut' | 'bottom',
      skill: number,
      riskTolerance: number,
    ) => {
      const result = context(legalActions)
      result.variantId = 'omaha-high'
      result.gameView.phase = 'flop'
      result.botState.skill.level = skill
      result.botState.personality.riskTolerance = riskTolerance
      result.handAssessment = {
        ...result.handAssessment,
        category: 'medium',
        rank: 1,
        made: false,
        drawTypes: ['wrap-13+', `${quality}-wrap`],
        cleanOuts: quality === 'nut' ? 13 : 0,
      }
      return result
    }
    const wrapValue = (decisionContext: DecisionContext, type: PlayerAction['type']) => scoreActions(decisionContext)
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('domination-aware straight outs'))
      ?.value

    const nut = wrapContext('nut', 90, 50)
    expect(wrapValue(nut, 'fold')).toBeLessThan(0)
    expect(wrapValue(nut, 'call')).toBeGreaterThan(0)
    expect(wrapValue(nut, 'raise')).toBeGreaterThan(0)

    const disciplinedBottom = wrapContext('bottom', 90, 20)
    const stickyBottom = wrapContext('bottom', 90, 90)
    expect(wrapValue(disciplinedBottom, 'fold')).toBeGreaterThan(0)
    expect(wrapValue(disciplinedBottom, 'call')).toBeLessThan(0)
    expect(wrapValue(disciplinedBottom, 'raise')).toBeLessThan(0)
    expect(Math.abs(wrapValue(stickyBottom, 'call')!)).toBeLessThan(
      Math.abs(wrapValue(disciplinedBottom, 'call')!),
    )

    const lowSkill = wrapContext('bottom', 20, 20)
    expect(wrapValue(lowSkill, 'call')).toBeUndefined()
    lowSkill.variantId = 'texas-holdem'
    lowSkill.botState.skill.level = 90
    expect(wrapValue(lowSkill, 'call')).toBeUndefined()
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
      categoryScores: getNlheScores('lag'),
    }
    const tag = decideAction(tagContext, { random: () => 0.5 }).allActions
    const lag = decideAction(lagContext, { random: () => 0.5 }).allActions
    const utility = (actions: typeof tag, action: PlayerAction['type']) =>
      actions.find(candidate => candidate.action.type === action)!.utility

    expect(utility(lag, 'call')).toBeGreaterThan(utility(tag, 'call'))
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
      categoryScores: getNlheScores('calling-station'),
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
    const ploDiscipline = ploCall.contributions.find(contribution => (
      contribution.label.includes('PLO river discipline')
    ))
    expect(ploDiscipline).toEqual(expect.objectContaining({
      label: expect.stringContaining('3-street pressure'),
      value: expect.any(Number),
    }))
    expect(ploDiscipline!.value).toBeLessThan(0)

    decisionContext.handAssessment.blockerValue = params.scoring.ploRiverDisciplineMods.blockerThreshold
    expect(scoreActions(decisionContext).find(candidate => candidate.action.type === 'call')!
      .contributions.some(contribution => contribution.label.includes('PLO river discipline'))).toBe(false)

    decisionContext.handAssessment.blockerValue = 0
    decisionContext.handAssessment.nutPotential = 'near-nuts'
    expect(scoreActions(decisionContext).find(candidate => candidate.action.type === 'call')!
      .contributions.some(contribution => contribution.label.includes('PLO river discipline'))).toBe(false)
  })

  it('does not double-count the full river penalty after an equity collapse', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: null,
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.variantId = 'omaha-high'
    decisionContext.gameView.phase = 'river'
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      nutPotential: 'weak',
      blockerValue: 0,
      equityCollapse: 0,
    }
    const disciplineValue = () => scoreActions(decisionContext)
      .find(candidate => candidate.action.type === 'call')!
      .contributions.find(contribution => contribution.label.includes('PLO river discipline'))!
      .value

    const withoutCollapse = Math.abs(disciplineValue())
    decisionContext.handAssessment.equityCollapse = 0.8
    const withCollapse = Math.abs(disciplineValue())

    expect(withCollapse).toBeLessThan(withoutCollapse)
  })

  it('uses PLO blockers selectively for bluff-catching, bluffs, and value pressure', () => {
    const facingBet: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const defender = context(facingBet)
    defender.variantId = 'omaha-high'
    defender.gameView.phase = 'turn'
    defender.botState.skill.level = 90
    defender.handAssessment = {
      ...defender.handAssessment,
      category: 'medium',
      made: true,
      blockerValue: 30,
    }
    const defense = scoreActions(defender)
    const defenseValue = (type: PlayerAction['type']) => defense
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('PLO blocker'))!
      .value

    expect(defenseValue('fold')).toBeLessThan(0)
    expect(defenseValue('call')).toBeGreaterThan(0)

    const openAction: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: { minAmount: 40, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const aggressor = context(openAction)
    aggressor.variantId = 'omaha-high'
    aggressor.gameView.phase = 'river'
    aggressor.botState.skill.level = 90
    aggressor.handAssessment = {
      ...aggressor.handAssessment,
      category: 'air',
      made: false,
      blockerValue: 30,
    }
    const bluff = scoreActions(aggressor)
    const blockerValue = (actions: ReturnType<typeof scoreActions>, type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('PLO blocker'))!
      .value

    expect(blockerValue(bluff, 'check')).toBeLessThan(0)
    expect(blockerValue(bluff, 'raise')).toBeGreaterThan(0)
    expect(blockerValue(bluff, 'all-in')).toBeGreaterThan(0)
    expect(bluff.flatMap(candidate => candidate.contributions)
      .some(contribution => contribution.label === 'Relevant blocker')).toBe(false)

    aggressor.handAssessment = {
      ...aggressor.handAssessment,
      category: 'good',
      made: true,
    }
    const value = scoreActions(aggressor)
    expect(blockerValue(value, 'check')).toBeLessThan(0)
    expect(blockerValue(value, 'raise')).toBeGreaterThan(0)
    expect(blockerValue(value, 'all-in')).toBeGreaterThan(0)
  })

  it('scales PLO blocker actions by blocker quality and gates them by skill and variant', () => {
    const legalActions: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: { minAmount: 40, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const blockerSpot = (blockerValue: number, skill: number, variantId: 'omaha-high' | 'texas-holdem') => {
      const result = context(legalActions)
      result.variantId = variantId
      result.gameView.phase = 'river'
      result.botState.skill.level = skill
      result.handAssessment = {
        ...result.handAssessment,
        category: 'air',
        made: false,
        blockerValue,
      }
      return result
    }
    const contribution = (decisionContext: DecisionContext) => scoreActions(decisionContext)
      .find(candidate => candidate.action.type === 'raise')!
      .contributions.find(item => item.label.includes('PLO blocker'))

    const partial = contribution(blockerSpot(12, 90, 'omaha-high'))!
    const nut = contribution(blockerSpot(30, 90, 'omaha-high'))!
    expect(partial.value).toBeGreaterThan(0)
    expect(partial.value).toBeLessThan(nut.value)
    expect(contribution(blockerSpot(30, 20, 'omaha-high'))).toBeUndefined()
    expect(contribution(blockerSpot(30, 90, 'texas-holdem'))).toBeUndefined()
  })

  it('respects an opponent check-raise without overfolding protected value', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const decisionContext = context(legalActions)
    decisionContext.gameView.phase = 'flop'
    decisionContext.botState.skill.level = 90
    decisionContext.streetAnalysis = postflopAnalysis({ opponentCheckRaised: true })
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      made: true,
      nutPotential: 'medium',
    }
    const respect = scoreActions(decisionContext)
    const respectValue = (type: PlayerAction['type']) => respect
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('Opponent check-raised'))!
      .value

    expect(respectValue('fold')).toBeGreaterThan(0)
    expect(respectValue('call')).toBeLessThan(0)
    expect(respectValue('raise')).toBeLessThan(0)
    expect(respectValue('all-in')).toBeLessThan(0)

    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'strong',
      nutPotential: 'strong',
    }
    const protectedActions = scoreActions(decisionContext)
    const protectedValue = (type: PlayerAction['type']) => protectedActions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('protected continuation'))?.value

    expect(protectedValue('fold')).toBeLessThan(0)
    expect(protectedValue('call')).toBeGreaterThan(0)
    expect(protectedValue('raise')).toBeUndefined()
  })

  it('scales check-raise respect by variant and hides it below the skill gate', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 50,
      raise: null,
      allInAmount: null,
    }
    const spot = (variantId: 'texas-holdem' | 'omaha-high', skill: number) => {
      const result = context(legalActions)
      result.variantId = variantId
      result.gameView.phase = 'turn'
      result.botState.skill.level = skill
      result.streetAnalysis = postflopAnalysis({
        opponentCheckRaised: true,
        street: 'turn',
        streetAggressor: { preflop: 'villain', flop: null, turn: 'villain', river: null },
      })
      result.handAssessment = {
        ...result.handAssessment,
        category: 'medium',
        nutPotential: 'weak',
      }
      return result
    }
    const foldRespect = (decisionContext: DecisionContext) => scoreActions(decisionContext)
      .find(candidate => candidate.action.type === 'fold')!
      .contributions.find(contribution => contribution.label.includes('Opponent check-raised'))?.value

    expect(foldRespect(spot('omaha-high', 90))).toBeGreaterThan(foldRespect(spot('texas-holdem', 90))!)
    expect(foldRespect(spot('omaha-high', 20))).toBeUndefined()
  })

  it('plans and executes heads-up OOP check-raises for value and nut draws', () => {
    const openActions: LegalActions = {
      fold: false,
      check: true,
      callAmount: null,
      raise: { minAmount: 40, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const planSpot = (variantId: 'texas-holdem' | 'omaha-high', value: boolean) => {
      const result = context(openActions)
      result.variantId = variantId
      result.gameView.phase = 'flop'
      result.botState.skill.level = 90
      result.streetAnalysis = postflopAnalysis({
        streetAggressor: { preflop: 'villain', flop: null, turn: null, river: null },
        actionCountThisStreet: 0,
      })
      result.handAssessment = {
        ...result.handAssessment,
        category: value ? 'strong' : 'weak',
        made: value,
        nutPotential: value ? 'near-nuts' : 'strong',
        drawTypes: value ? [] : ['nut-flush-draw'],
        cleanOuts: value ? 0 : 9,
      }
      return result
    }
    const planContribution = (decisionContext: DecisionContext, type: PlayerAction['type']) => scoreActions(decisionContext)
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('Check-raise plan'))?.value

    for (const variantId of ['texas-holdem', 'omaha-high'] as const) {
      for (const value of [true, false]) {
        const planned = planSpot(variantId, value)
        expect(planContribution(planned, 'check')).toBeGreaterThan(0)

        planned.legalActions = {
          fold: true,
          check: false,
          callAmount: 25,
          raise: { minAmount: 75, maxAmount: 1000 },
          allInAmount: 1000,
        }
        planned.metrics = deriveDecisionMetrics({
          playerId: 'bot', totalPot: 100, toCall: 25, callAmount: 25,
          potOdds: 0.2, toCallPotRatio: 0.25, potRaiseTo: 300,
          minRaiseTo: 75, maxRaiseTo: 1000, playerStack: 1000,
          effectiveStack: 1000, spr: 10, legalActions: planned.legalActions,
        }, 20)
        planned.gameView.currentBet = 25
        planned.streetAnalysis = postflopAnalysis({ iCheckedCurrentStreet: true })

        expect(planContribution(planned, 'call')).toBeLessThan(0)
        expect(planContribution(planned, 'raise')).toBeGreaterThan(0)
        expect(planContribution(planned, 'all-in')).toBeGreaterThan(0)

        planned.streetAnalysis.iCheckRaisedCurrentStreet = true
        expect(planContribution(planned, 'raise')).toBeUndefined()
      }
    }
  })

  it('defends controlled NLHE ranges against a detected turn float', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const decisionContext = context(legalActions)
    decisionContext.gameView.phase = 'turn'
    decisionContext.botState.skill.level = 90
    decisionContext.streetAnalysis = postflopAnalysis({
      street: 'turn',
      streetAggressor: { preflop: 'bot', flop: 'bot', turn: 'villain', river: null },
      iAmPreflopAggressor: true,
      iCheckedCurrentStreet: true,
      turnFloatPlayerIds: ['villain'],
    })
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      made: true,
      boardGotWorse: false,
    }
    const actions = scoreActions(decisionContext)
    const floatValue = (type: PlayerAction['type']) => actions
      .find(candidate => candidate.action.type === type)!
      .contributions.find(contribution => contribution.label.includes('Turn float detected'))?.value

    expect(floatValue('fold')).toBeLessThan(0)
    expect(floatValue('call')).toBeGreaterThan(0)
    expect(floatValue('raise')).toBeGreaterThan(0)
    expect(floatValue('all-in')).toBeUndefined()
  })

  it('dampens float defense on worse boards and at worse prices', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: null,
      allInAmount: null,
    }
    const decisionContext = context(legalActions)
    decisionContext.gameView.phase = 'turn'
    decisionContext.botState.skill.level = 90
    decisionContext.streetAnalysis = postflopAnalysis({
      street: 'turn',
      streetAggressor: { preflop: 'bot', flop: 'bot', turn: 'villain', river: null },
      turnFloatPlayerIds: ['villain'],
    })
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      made: true,
      boardGotWorse: false,
    }
    const callDefense = () => scoreActions(decisionContext)
      .find(candidate => candidate.action.type === 'call')!
      .contributions.find(contribution => contribution.label.includes('Turn float detected'))!.value

    const stableSmallBet = callDefense()
    decisionContext.handAssessment.boardGotWorse = true
    const worseBoard = callDefense()
    decisionContext.handAssessment.boardGotWorse = false
    decisionContext.metrics.toCallPotRatio = 1
    const largeBet = callDefense()

    expect(worseBoard).toBeGreaterThan(0)
    expect(worseBoard).toBeLessThan(stableSmallBet)
    expect(largeBet).toBeGreaterThan(0)
    expect(largeBet).toBeLessThan(stableSmallBet)
  })

  it('isolates float defense by pattern, skill, variant, and real blocker rebluffs', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: null,
    }
    const floatSpot = () => {
      const result = context(legalActions)
      result.gameView.phase = 'turn'
      result.botState.skill.level = 90
      result.streetAnalysis = postflopAnalysis({
        street: 'turn',
        streetAggressor: { preflop: 'bot', flop: 'bot', turn: 'villain', river: null },
        turnFloatPlayerIds: ['villain'],
      })
      result.handAssessment = {
        ...result.handAssessment,
        category: 'medium',
        made: true,
      }
      return result
    }
    const contribution = (decisionContext: DecisionContext) => scoreActions(decisionContext)
      .find(candidate => candidate.action.type === 'raise')!
      .contributions.find(item => item.label.includes('Turn float detected'))

    const noPattern = floatSpot()
    noPattern.streetAnalysis!.turnFloatPlayerIds = []
    expect(contribution(noPattern)).toBeUndefined()

    const lowSkill = floatSpot()
    lowSkill.botState.skill.level = 20
    expect(contribution(lowSkill)).toBeUndefined()

    const plo = floatSpot()
    plo.variantId = 'omaha-high'
    expect(contribution(plo)).toBeUndefined()

    const blockerBluff = floatSpot()
    blockerBluff.botState.personality.aggression = 80
    blockerBluff.handAssessment = {
      ...blockerBluff.handAssessment,
      category: 'air',
      made: false,
      drawTypes: [],
      blockerValue: 30,
    }
    expect(contribution(blockerBluff)).toEqual(expect.objectContaining({
      label: expect.stringContaining('blocker rebluff'),
      value: expect.any(Number),
    }))
    expect(contribution(blockerBluff)!.value).toBeGreaterThan(0)
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

  it('gates advanced PLO analysis while preserving the raw out-count signal', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: null,
    }
    const actual = context(legalActions)
    actual.variantId = 'omaha-high'
    actual.gameView.phase = 'turn'
    actual.botState.skill.level = 20
    actual.handAssessment = {
      ...actual.handAssessment,
      category: 'medium',
      rank: 1,
      made: false,
      nutPotential: 'near-nuts',
      blockerValue: 30,
      drawTypes: ['wrap-13+', 'bottom-wrap'],
      cleanOuts: 0,
      equityCollapse: 0.8,
      boardGotWorse: true,
    }
    const original = structuredClone(actual.handAssessment)

    const low = applySkillPerception(actual, { random: () => 0.5 })
    expect(low.context.handAssessment).toEqual(expect.objectContaining({
      nutPotential: 'medium',
      blockerValue: 0,
      equityCollapse: 0,
      boardGotWorse: false,
    }))
    expect(low.context.handAssessment.drawTypes).toContain('wrap-13+')
    expect(low.context.handAssessment.drawTypes).not.toContain('bottom-wrap')
    expect(low.context.handAssessment.cleanOuts).toBeGreaterThan(0)
    expect(low.errors.map(error => error.field)).toEqual(expect.arrayContaining([
      'board-dynamics',
      'nut-potential',
      'blocker-value',
      'wrap-quality',
    ]))
    expect(actual.handAssessment).toEqual(original)

    actual.botState.skill.level = 90
    const high = applySkillPerception(actual, { random: () => 0.5 }).context.handAssessment
    expect(high.drawTypes).toContain('bottom-wrap')
    expect(high.nutPotential).toBe('near-nuts')
    expect(high.blockerValue).toBeGreaterThan(0)
    expect(high.equityCollapse).toBe(0.8)
  })

  it('keeps gated PLO scoring absent below its configured analysis depth', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: 1000,
    }
    const decisionContext = context(legalActions)
    decisionContext.variantId = 'omaha-high'
    decisionContext.gameView.phase = 'river'
    decisionContext.botState.skill.level = 20
    decisionContext.handAssessment = {
      ...decisionContext.handAssessment,
      category: 'medium',
      nutPotential: 'weak',
      blockerValue: 0,
      equityCollapse: 0.8,
      boardGotWorse: true,
    }

    const labels = scoreActions(decisionContext)
      .flatMap(candidate => candidate.contributions.map(contribution => contribution.label))
    expect(labels.some(label => label.includes('PLO equity collapse'))).toBe(false)
    expect(labels.some(label => label.includes('PLO river discipline'))).toBe(false)
  })

  it('produces a measurable low-vs-high skill difference in the same bottom-wrap spot', () => {
    const legalActions: LegalActions = {
      fold: true,
      check: false,
      callAmount: 25,
      raise: { minAmount: 75, maxAmount: 1000 },
      allInAmount: null,
    }
    const bottomWrapSpot = (skill: number) => {
      const result = context(legalActions, { spr: 1 })
      result.variantId = 'omaha-high'
      result.gameView.phase = 'flop'
      result.botState.skill.level = skill
      result.handAssessment = {
        ...result.handAssessment,
        category: 'medium',
        rank: 1,
        made: false,
        nutPotential: 'weak',
        drawQuality: 4,
        cleanOuts: 0,
        drawTypes: ['wrap-13+', 'bottom-wrap'],
      }
      return result
    }
    const result = (skill: number) => decideAction(bottomWrapSpot(skill), { random: () => 0.5 })
    const preference = (decision: ReturnType<typeof result>) => {
      const fold = decision.allActions.find(candidate => candidate.action.type === 'fold')!
      const call = decision.allActions.find(candidate => candidate.action.type === 'call')!
      return call.utility - fold.utility
    }

    const low = result(20)
    const high = result(90)
    expect(preference(low)).toBeGreaterThan(preference(high))
    expect(low.perceptionErrors.some(error => error.field === 'wrap-quality')).toBe(true)
    expect(high.allActions.some(candidate => candidate.contributions.some(contribution => (
      contribution.label.includes('PLO bottom wrap')
    )))).toBe(true)
  })
})
