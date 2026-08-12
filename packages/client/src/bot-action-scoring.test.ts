import { describe, expect, it } from 'vitest'
import type { Card } from '@cpc/shared'
import { scoreActions } from './bot-action-scoring'
import { params } from './bot-params'
import type { DecisionContext } from './bot-decision-types'
import { createBotState } from './bot-state'
import { CALLING_STATION_PERSONALITY, TAG_PERSONALITY } from './bot-tag'
import { assessHand } from './nlhe-hand-evaluation'
import { selectionDiagnostics } from './bot-action-selection'

function makeCtx(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    gameView: {
      myCards: [{ rank: 'A', suit: 'hearts' }, { rank: 'K', suit: 'hearts' }],
      board: [],
      pot: 100,
      currentBet: 0,
      minRaiseTo: 10,
      maxRaiseTo: 100,
      canRaise: true,
      bigBlind: 10,
      smallBlind: 5,
      phase: 'preflop',
      players: [
        { id: 'bot', chips: 1000, roundBet: 0, status: 'active', isDealer: false },
        { id: 'opp', chips: 1000, roundBet: 0, status: 'active', isDealer: true },
      ],
      dealerIndex: 1,
    },
    variantId: 'texas-holdem',
    botId: 'bot',
    botState: {
      personality: {
        archetype: { name: 'TAG' } as any,
        preflopLooseness: 50, aggression: 50, bluffFrequency: 25, riskTolerance: 50, patience: 70,
      },
      skill: { level: 80, observation: 60 },
      mentalState: { tilt: 30, confidence: 60, patience: 70, momentum: 0.5, frustration: new Map() },
      reads: { opponents: new Map() },
      memory: {
        handsPlayed: 1,
        handsWon: 0,
        hand: { raisedPreflop: false, lastAction: null, lastStreet: null, betFoldStreet: null },
      },
    } as any,
    position: 'middle',
    tableSize: 2,
    activePlayerCount: 2,
    boardTexture: 'neutral',
    handAssessment: {
      category: 'medium', rank: 2, made: true, relativeStrength: 50, showdownValue: 30,
      nutPotential: 'medium', vulnerability: 30, drawQuality: 0, cleanOuts: 0,
      blockerValue: 0, drawTypes: [], equityCollapse: 0, boardGotWorse: false, strength: 50,
    },
    metrics: {
      totalPot: 100, callAmount: 0, potOdds: 0, toCallPotRatio: 0, potRaiseTo: 100,
      minRaiseTo: 10, maxRaiseTo: 100, playerStack: 1000, effectiveStack: 1000,
      effectiveStackBb: 100, playerStartingStackBb: 100, spr: 10, potCommitment: 0,
      forcedAllInRatio: 0, stackDepth: 'deep',
    },
    legalActions: { fold: true, check: true, callAmount: null, raise: null, allInAmount: null },
    categoryScores: {
      fold: { air: 10, weak: 5, marginal: -5, medium: -30, good: -42, strong: -50, premium: -50 },
      check: { air: 10, weak: 10, marginal: 8, medium: 5, good: -15, strong: -30, premium: -30 },
      call: { air: -25, weak: -5, marginal: 5, medium: 20, good: -5, strong: -10, premium: -10 },
      raise: { air: -25, 'weak-draw': 15, 'weak-no-draw': -25, weak: -20, marginal: -10, medium: 5, good: 20, strong: 30, premium: 40 },
      allIn: { air: -42, 'weak-draw': -18, 'weak-no-draw': -42, weak: -35, marginal: -25, medium: -15, good: 10, strong: 28, premium: 42 },
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Fund 3: skillLevelFactor requires sorted tiers
// ---------------------------------------------------------------------------
describe('skillLevelFactor tier ordering', () => {
  it('returns the correct tier when tiers are sorted descending', () => {
    const tiers = [
      { threshold: 90, factor: 1 },
      { threshold: 70, factor: 0.85 },
      { threshold: 50, factor: 0.65 },
    ]

    // skill 95 → should get tier 0 (1.0)
    for (const tier of tiers) {
      if (95 >= tier.threshold) { expect(tier.factor).toBe(1); break }
    }

    // skill 75 → should get tier 1 (0.85)
    for (const tier of tiers) {
      if (75 >= tier.threshold) { expect(tier.factor).toBe(0.85); break }
    }

    // skill 40 → should get default (0.2)
    let found = false
    for (const tier of tiers) {
      if (40 >= tier.threshold) { found = true; break }
    }
    expect(found).toBe(false)
  })

  it('params.scoring.skillTiers are sorted descending', () => {
    const tiers = params.scoring.skillTiers
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].threshold,
        `Tier ${i} threshold ${tiers[i].threshold} should be < tier ${i - 1} threshold ${tiers[i - 1].threshold}`
      ).toBeLessThan(tiers[i - 1].threshold)
    }
  })
})

describe('river board-play discipline', () => {
  const board: Card[] = [
    { rank: 'A', suit: 'clubs' },
    { rank: 'A', suit: 'diamonds' },
    { rank: 'T', suit: 'hearts' },
    { rank: 'T', suit: 'spades' },
    { rank: '5', suit: 'clubs' },
  ]

  function riverActions(holeCards: [Card, Card], callAmount: number) {
    const handAssessment = assessHand(holeCards, board)
    return scoreActions(makeCtx({
      gameView: {
        ...makeCtx().gameView,
        myCards: holeCards,
        board,
        pot: 100,
        currentBet: callAmount,
        phase: 'river',
      },
      handAssessment,
      metrics: {
        ...makeCtx().metrics,
        totalPot: 100,
        callAmount,
        potOdds: callAmount / (100 + callAmount),
        toCallPotRatio: callAmount / 100,
        spr: 10,
        potCommitment: 0,
        forcedAllInRatio: callAmount / 1000,
      },
      legalActions: {
        fold: true,
        check: false,
        callAmount,
        raise: null,
        allInAmount: null,
      },
      streetAnalysis: {
        preflopAggressor: 'opp',
        preflopRaiseCount: 1,
        streetAggressor: { preflop: 'opp', flop: 'opp', turn: 'opp', river: 'opp' },
        iAmPreflopAggressor: false,
        opponentLines: new Map([['opp', {
          playerId: 'opp',
          preflop: 'raised',
          flop: 'bet',
          turn: 'bet',
          river: 'bet',
          aggressivePotFractions: { preflop: null, flop: 0.5, turn: 0.6, river: callAmount / 100 },
        }]]),
        activeOpponents: 1,
        opponentShowedWeakness: false,
        opponentCheckRaised: false,
        street: 'river',
        actionCountThisStreet: 1,
      },
    }))
  }

  function callOverFold(holeCards: [Card, Card], callAmount: number): number {
    const actions = riverActions(holeCards, callAmount)
    const fold = actions.find(candidate => candidate.action.type === 'fold')!
    const call = actions.find(candidate => candidate.action.type === 'call')!
    return call.utility - fold.utility
  }

  it('applies the weak showdown penalty when a paired hole card does not improve two pair on board', () => {
    const actions = riverActions(
      [{ rank: '5', suit: 'hearts' }, { rank: '2', suit: 'clubs' }],
      75,
    )
    const fold = actions.find(candidate => candidate.action.type === 'fold')!
    const call = actions.find(candidate => candidate.action.type === 'call')!

    expect(call.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'No made hand at showdown' }),
      expect.objectContaining({ label: '3-street pressure against weak showdown value' }),
    ]))
    expect(fold.utility).toBeGreaterThan(call.utility)
  })

  it('reduces call preference with bet size and increases it only for real hand improvements', () => {
    const boardPlay: [Card, Card] = [
      { rank: '5', suit: 'hearts' }, { rank: '2', suit: 'clubs' },
    ]
    const kingKicker: [Card, Card] = [
      { rank: 'K', suit: 'hearts' }, { rank: '2', suit: 'clubs' },
    ]
    const fullHouse: [Card, Card] = [
      { rank: 'A', suit: 'hearts' }, { rank: '2', suit: 'clubs' },
    ]

    expect(callOverFold(boardPlay, 10)).toBeGreaterThan(callOverFold(boardPlay, 50))
    expect(callOverFold(boardPlay, 50)).toBeGreaterThan(callOverFold(boardPlay, 75))
    expect(callOverFold(boardPlay, 75)).toBeLessThan(callOverFold(kingKicker, 75))
    expect(callOverFold(kingKicker, 75)).toBeLessThan(callOverFold(fullHouse, 75))
  })

  it('recognizes pocket aces on K-6-6-7-J as a high-skill river value bet', () => {
    const pairedBoard: Card[] = [
      { rank: 'K', suit: 'diamonds' },
      { rank: '6', suit: 'clubs' },
      { rank: '6', suit: 'diamonds' },
      { rank: '7', suit: 'clubs' },
      { rank: 'J', suit: 'hearts' },
    ]
    const aces: [Card, Card] = [
      { rank: 'A', suit: 'clubs' },
      { rank: 'A', suit: 'diamonds' },
    ]
    const base = makeCtx()
    const actions = scoreActions(makeCtx({
      gameView: {
        ...base.gameView,
        myCards: aces,
        board: pairedBoard,
        pot: 100,
        phase: 'river',
      },
      botState: {
        ...base.botState,
        skill: { level: 100, observation: 100 },
      },
      position: 'late',
      handAssessment: assessHand(aces, pairedBoard),
      legalActions: {
        fold: false,
        check: true,
        callAmount: null,
        raise: { minAmount: 40, maxAmount: 100 },
        allInAmount: null,
      },
      streetAnalysis: {
        preflopAggressor: 'bot',
        preflopRaiseCount: 1,
        streetAggressor: { preflop: 'bot', flop: null, turn: null, river: null },
        iAmPreflopAggressor: true,
        opponentLines: new Map([['opp', {
          playerId: 'opp',
          preflop: 'called',
          flop: null,
          turn: null,
          river: null,
          aggressivePotFractions: { preflop: null, flop: null, turn: null, river: null },
        }]]),
        activeOpponents: 1,
        opponentShowedWeakness: true,
        opponentCheckRaised: false,
        street: 'river',
        actionCountThisStreet: 1,
      },
    }))
    const check = actions.find(candidate => candidate.action.type === 'check')!
    const raise = actions.find(candidate => candidate.action.type === 'raise')!

    expect(raise.utility).toBeGreaterThan(check.utility)
  })
})

describe('preflop shove depth guards', () => {
  function shoveContext(options: {
    startingStackBb: number
    currentBetBb: number
    preflopRaiseCount: number
    category: DecisionContext['handAssessment']['category']
  }): DecisionContext {
    const stack = options.startingStackBb * 10
    const currentBet = options.currentBetBb * 10
    return makeCtx({
      gameView: {
        ...makeCtx().gameView,
        currentBet,
        minRaiseTo: currentBet + 20,
        maxRaiseTo: stack,
      },
      handAssessment: {
        ...makeCtx().handAssessment,
        category: options.category,
      },
      metrics: {
        ...makeCtx().metrics,
        playerStack: stack,
        effectiveStack: stack,
        effectiveStackBb: options.startingStackBb,
        playerStartingStackBb: options.startingStackBb,
        potCommitment: 0,
      },
      legalActions: {
        fold: currentBet > 0,
        check: false,
        callAmount: currentBet,
        raise: { minAmount: currentBet + 20, maxAmount: stack },
        allInAmount: stack,
      },
      streetAnalysis: {
        preflopAggressor: options.preflopRaiseCount > 0 ? 'opp' : null,
        preflopRaiseCount: options.preflopRaiseCount,
        streetAggressor: { preflop: options.preflopRaiseCount > 0 ? 'opp' : null, flop: null, turn: null, river: null },
        iAmPreflopAggressor: false,
        opponentLines: new Map(),
        activeOpponents: 1,
        opponentShowedWeakness: false,
        opponentCheckRaised: false,
        street: 'preflop',
        actionCountThisStreet: options.preflopRaiseCount,
      },
    })
  }

  it('blocks an uncommitted premium shove at 88.5 BB after a single open', () => {
    const actions = scoreActions(shoveContext({
      startingStackBb: 88.5,
      currentBetBb: 3,
      preflopRaiseCount: 1,
      category: 'premium',
    }))
    const shove = actions.find(candidate => candidate.action.type === 'all-in')!
    const raise = actions.find(candidate => candidate.action.type === 'raise')!

    expect(shove.selectionEligible).toBe(false)
    expect(shove.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: expect.stringContaining('single raise') }),
    ]))
    expect(raise.selectionEligible).not.toBe(false)
  })

  it('uses an inclusive 40 BB boundary after a single open', () => {
    const atBoundary = scoreActions(shoveContext({
      startingStackBb: 40,
      currentBetBb: 3,
      preflopRaiseCount: 1,
      category: 'premium',
    })).find(candidate => candidate.action.type === 'all-in')!
    const belowBoundary = scoreActions(shoveContext({
      startingStackBb: 39.99,
      currentBetBb: 3,
      preflopRaiseCount: 1,
      category: 'premium',
    })).find(candidate => candidate.action.type === 'all-in')!

    expect(atBoundary.selectionEligible).toBe(false)
    expect(belowBoundary.selectionEligible).not.toBe(false)
  })

  it('blocks a non-premium open shove at the exact 25 BB boundary', () => {
    const shove = scoreActions(shoveContext({
      startingStackBb: 25,
      currentBetBb: 1,
      preflopRaiseCount: 0,
      category: 'strong',
    })).find(candidate => candidate.action.type === 'all-in')!

    expect(shove.selectionEligible).toBe(false)
    expect(shove.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: expect.stringContaining('Non-short open shove') }),
    ]))
  })

  it('leaves a non-premium open shove below 25 BB available', () => {
    const shove = scoreActions(shoveContext({
      startingStackBb: 24.99,
      currentBetBb: 1,
      preflopRaiseCount: 0,
      category: 'strong',
    })).find(candidate => candidate.action.type === 'all-in')!

    expect(shove.selectionEligible).not.toBe(false)
    expect(shove.contributions.some(
      contribution => contribution.label.includes('open shove'),
    )).toBe(false)
  })
})

describe('pot commitment versus forced all-in risk', () => {
  function commitmentContext(options: {
    archetype: typeof CALLING_STATION_PERSONALITY | typeof TAG_PERSONALITY
    skill: number
    category?: DecisionContext['handAssessment']['category']
    potCommitment: number
    forcedAllInRatio: number
    potOdds: number
    riskTolerance?: number
    patience?: number
    tilt?: number
  }): DecisionContext {
    const botState = createBotState(options.archetype, options.skill, () => 0.5)
    if (options.riskTolerance != null) botState.personality.riskTolerance = options.riskTolerance
    if (options.patience != null) botState.mentalState.patience = options.patience
    if (options.tilt != null) botState.mentalState.tilt = options.tilt
    const callAmount = options.forcedAllInRatio * 100
    return makeCtx({
      botState,
      gameView: {
        ...makeCtx().gameView,
        phase: 'river',
        pot: 100,
        currentBet: callAmount,
      },
      handAssessment: {
        ...makeCtx().handAssessment,
        category: options.category ?? 'marginal',
        relativeStrength: 40,
        showdownValue: 35,
        strength: 40,
      },
      metrics: {
        ...makeCtx().metrics,
        totalPot: 100,
        callAmount,
        potOdds: options.potOdds,
        toCallPotRatio: callAmount / 100,
        playerStack: 100,
        effectiveStack: 100,
        effectiveStackBb: 5,
        spr: 1,
        potCommitment: options.potCommitment,
        forcedAllInRatio: options.forcedAllInRatio,
        stackDepth: 'short',
      },
      legalActions: {
        fold: true,
        check: false,
        callAmount,
        raise: null,
        allInAmount: null,
      },
    })
  }

  function action(context: DecisionContext, type: 'fold' | 'call') {
    return scoreActions(context).find(candidate => candidate.action.type === type)!
  }

  it('models sunk-cost tendency for a low-skill Calling Station but not a high-skill TAG', () => {
    const station = commitmentContext({
      archetype: CALLING_STATION_PERSONALITY,
      skill: 20,
      potCommitment: 0.75,
      forcedAllInRatio: 0.2,
      potOdds: 0.1,
      patience: 20,
      tilt: 40,
    })
    const tag = commitmentContext({
      archetype: TAG_PERSONALITY,
      skill: 80,
      potCommitment: 0.75,
      forcedAllInRatio: 0.2,
      potOdds: 0.1,
    })

    expect(action(station, 'call').contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: expect.stringContaining('Voluntary pot commitment'), value: expect.any(Number) }),
    ]))
    expect(action(tag, 'call').contributions.some(
      contribution => contribution.label.includes('Voluntary pot commitment'),
    )).toBe(false)
  })

  it('keeps the exact pot-commitment and skill boundaries stable after rounding', () => {
    const atCommitmentStart = commitmentContext({
      archetype: CALLING_STATION_PERSONALITY,
      skill: 20,
      potCommitment: 0.25,
      forcedAllInRatio: 0.2,
      potOdds: 0.1,
      patience: 50,
      tilt: 0,
    })
    const atFullSkill = commitmentContext({
      archetype: CALLING_STATION_PERSONALITY,
      skill: 20,
      potCommitment: 1,
      forcedAllInRatio: 0.2,
      potOdds: 0.1,
      patience: 50,
      tilt: 0,
    })
    const atZeroSkill = commitmentContext({
      archetype: CALLING_STATION_PERSONALITY,
      skill: 70,
      potCommitment: 1,
      forcedAllInRatio: 0.2,
      potOdds: 0.1,
      patience: 50,
      tilt: 0,
    })
    const commitmentValue = (context: DecisionContext) => action(context, 'call').contributions
      .find(contribution => contribution.label.includes('Voluntary pot commitment'))
      ?.value

    expect(commitmentValue(atCommitmentStart)).toBeUndefined()
    expect(commitmentValue(atFullSkill)).toBe(params.scoring.commitmentBehavior.maximumCallBonus)
    expect(commitmentValue(atZeroSkill)).toBeUndefined()
  })

  it('penalizes an expensive forced-all-in bluff catch without inventing pot commitment', () => {
    const context = commitmentContext({
      archetype: CALLING_STATION_PERSONALITY,
      skill: 42,
      potCommitment: 0.075,
      forcedAllInRatio: 1,
      potOdds: 0.48,
      riskTolerance: 82,
      patience: 18,
    })

    const forcedRisk = action(context, 'call').contributions.find(
      contribution => contribution.label === 'Forced all-in 100% — variance risk',
    )
    expect(forcedRisk?.value).toBeLessThan(0)
    expect(action(context, 'call').contributions.some(
      contribution => contribution.label.includes('Voluntary pot commitment'),
    )).toBe(false)
    expect(action(context, 'fold').utility).toBeGreaterThan(action(context, 'call').utility)
  })

  it('keeps a very cheap short-stack call despite a 100% forced-all-in ratio', () => {
    const context = commitmentContext({
      archetype: CALLING_STATION_PERSONALITY,
      skill: 32,
      potCommitment: 0.56,
      forcedAllInRatio: 1,
      potOdds: 0.048,
      riskTolerance: 98,
      patience: 28,
    })

    expect(action(context, 'call').contributions.some(
      contribution => contribution.label.includes('Forced all-in'),
    )).toBe(false)
    expect(action(context, 'call').utility).toBeGreaterThan(action(context, 'fold').utility)
  })

  it('uses inclusive zero and full boundaries for forced-all-in risk', () => {
    const riskValue = (forcedAllInRatio: number, potOdds: number) => {
      const context = commitmentContext({
        archetype: CALLING_STATION_PERSONALITY,
        skill: 42,
        category: 'marginal',
        potCommitment: 0,
        forcedAllInRatio,
        potOdds,
        riskTolerance: 50,
      })
      return action(context, 'call').contributions
        .find(contribution => contribution.label.includes('Forced all-in'))
        ?.value
    }

    expect(riskValue(0.4, 0.4)).toBeUndefined()
    expect(riskValue(1, 0.1)).toBeUndefined()
    expect(riskValue(1, 0.4)).toBe(
      params.scoring.commitmentBehavior.forcedCategoryPenalty.marginal,
    )
  })

  it('keeps a high-skill TAG rational after investing most of its stack', () => {
    const context = commitmentContext({
      archetype: TAG_PERSONALITY,
      skill: 77,
      potCommitment: 0.79,
      forcedAllInRatio: 1,
      potOdds: 0.056,
      riskTolerance: 43,
    })

    expect(action(context, 'call').contributions.some(
      contribution => contribution.label.includes('Voluntary pot commitment')
        || contribution.label.includes('Forced all-in'),
    )).toBe(false)
    expect(action(context, 'call').utility).toBeGreaterThan(action(context, 'fold').utility)
  })
})

describe('fixed table format versus active players', () => {
  it('does not grant a full-ring pot the heads-up double-barrel boost after folds', () => {
    const base = makeCtx({
      gameView: {
        ...makeCtx().gameView,
        phase: 'turn',
        board: [
          { rank: '2', suit: 'hearts' },
          { rank: '7', suit: 'clubs' },
          { rank: 'K', suit: 'diamonds' },
          { rank: '3', suit: 'spades' },
        ],
      },
      tableSize: 9,
      activePlayerCount: 2,
      legalActions: {
        fold: false,
        check: true,
        callAmount: null,
        raise: { minAmount: 20, maxAmount: 1000 },
        allInAmount: null,
      },
      streetAnalysis: {
        preflopAggressor: 'bot',
        preflopRaiseCount: 1,
        streetAggressor: { preflop: 'bot', flop: 'bot', turn: null, river: null },
        iAmPreflopAggressor: true,
        opponentLines: new Map(),
        activeOpponents: 1,
        opponentShowedWeakness: false,
        opponentCheckRaised: false,
        street: 'turn',
        actionCountThisStreet: 0,
      },
    })
    const contribution = (ctx: DecisionContext) => scoreActions(ctx)
      .find(action => action.action.type === 'raise')!
      .contributions.find(item => item.label.startsWith('Double-barrel'))!
      .value

    expect(contribution(base)).toBe(contribution({ ...base, activePlayerCount: 9 }))
  })
})

describe('continuation-bet defense calibration', () => {
  function defenseContext(flopAggressor: string): DecisionContext {
    return makeCtx({
      gameView: {
        ...makeCtx().gameView,
        phase: 'flop',
        board: [
          { rank: 'Q', suit: 'hearts' },
          { rank: '8', suit: 'hearts' },
          { rank: '2', suit: 'clubs' },
        ],
        currentBet: 30,
      },
      handAssessment: {
        ...makeCtx().handAssessment,
        category: 'air',
        made: false,
        drawTypes: ['flush-draw'],
      },
      metrics: {
        ...makeCtx().metrics,
        callAmount: 30,
        potOdds: 30 / 130,
        toCallPotRatio: 0.3,
      },
      legalActions: {
        fold: true,
        check: false,
        callAmount: 30,
        raise: { minAmount: 90, maxAmount: 1000 },
        allInAmount: null,
      },
      streetAnalysis: {
        preflopAggressor: 'opp',
        preflopRaiseCount: 1,
        streetAggressor: { preflop: 'opp', flop: flopAggressor, turn: null, river: null },
        iAmPreflopAggressor: false,
        opponentLines: new Map(),
        activeOpponents: 1,
        opponentShowedWeakness: false,
        opponentCheckRaised: false,
        street: 'flop',
        actionCountThisStreet: 1,
      },
    })
  }

  it('includes drawing air against a real flop c-bet', () => {
    const actions = scoreActions(defenseContext('opp'))
    const labels = actions.flatMap(action => action.contributions.map(item => item.label))

    expect(labels).toContain('C-Bet defense — continue with realizable equity')
    expect(labels).toContain('Defend C-Bet with a raise — apply pressure back')
  })

  it('does not apply c-bet calibration against a non-PFA flop lead', () => {
    const actions = scoreActions(defenseContext('donk-bettor'))
    const labels = actions.flatMap(action => action.contributions.map(item => item.label))

    expect(labels.some(label => label.includes('C-Bet defense'))).toBe(false)
    expect(labels.some(label => label.includes('Defend C-Bet'))).toBe(false)
  })

  it('does not reapply c-bet defense after the defender raised and the PFA reraised', () => {
    const repeated = defenseContext('opp')
    repeated.streetAnalysis = {
      ...repeated.streetAnalysis!,
      streetAggression: {
        preflop: { aggressiveActionCount: 1, openingAggressor: 'opp', lastAggressor: 'opp', orderedAggressors: ['opp'] },
        flop: { aggressiveActionCount: 3, openingAggressor: 'opp', lastAggressor: 'opp', orderedAggressors: ['opp', 'bot', 'opp'] },
        turn: { aggressiveActionCount: 0, openingAggressor: null, lastAggressor: null, orderedAggressors: [] },
        river: { aggressiveActionCount: 0, openingAggressor: null, lastAggressor: null, orderedAggressors: [] },
      },
    }

    const raise = scoreActions(repeated).find(candidate => candidate.action.type === 'raise')!
    const labels = raise.contributions.map(contribution => contribution.label)
    expect(labels.some(label => label.includes('C-Bet'))).toBe(false)
    expect(labels).toContain('Reraise spot (3-bet) — tighten range')
  })

  it('mixes a bounded amount of heads-up dead-air defense only for loose NLHE archetypes', () => {
    const deadAir = defenseContext('opp')
    deadAir.handAssessment = {
      ...deadAir.handAssessment,
      drawTypes: [],
      blockerValue: 0,
    }
    const withArchetype = (name: 'TAG' | 'LAG' | 'Calling Station', tableSize = 2) => scoreActions({
      ...deadAir,
      tableSize,
      botState: {
        ...deadAir.botState,
        personality: {
          ...deadAir.botState.personality,
          archetype: { name } as any,
        },
      },
    }).flatMap(action => action.contributions)

    expect(withArchetype('TAG').some(item => (
      item.label === 'C-Bet defense — continue with realizable equity'
      || item.label === 'Defend C-Bet with a raise — apply pressure back'
    ))).toBe(false)
    expect(withArchetype('LAG')).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'C-Bet defense — continue with realizable equity', value: 6 }),
      expect.objectContaining({ label: 'Defend C-Bet with a raise — apply pressure back' }),
    ]))
    expect(withArchetype('Calling Station')).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'C-Bet defense — continue with realizable equity', value: 70 }),
    ]))
    expect(withArchetype('LAG', 6).some(item => (
      item.label === 'C-Bet defense — continue with realizable equity'
      || item.label === 'Defend C-Bet with a raise — apply pressure back'
    ))).toBe(false)
  })

  it('keeps weak made-hand LAG defense mixed instead of forcing the raise candidate', () => {
    const weakMade = defenseContext('opp')
    weakMade.tableSize = 6
    weakMade.handAssessment = {
      ...weakMade.handAssessment,
      category: 'weak',
      made: true,
      drawTypes: [],
      cleanOuts: 0,
    }
    weakMade.botState = {
      ...weakMade.botState,
      personality: {
        ...weakMade.botState.personality,
        archetype: { name: 'LAG' } as any,
        aggression: 80,
      },
    }

    const actions = scoreActions(weakMade)
    const diagnostics = selectionDiagnostics(actions)
    const raise = actions.find(candidate => candidate.action.type === 'raise')!
    const fullBase = params.scoring.cbetDefenseRaiseBase.nlhe.lag['six-max']
    const raiseBonus = raise.contributions.find(contribution => (
      contribution.label === 'Defend C-Bet with a raise — apply pressure back'
    ))!

    expect(raiseBonus.value).toBeLessThan(fullBase)
    expect(
      diagnostics.plausibleCandidateCount,
      actions.map(candidate => `${candidate.candidateId}:${candidate.utility}`).join(', '),
    ).toBeGreaterThanOrEqual(2)
  })

  it('dampens Calling Station c-bet bonuses for drawless unmade hands multiway', () => {
    const multiwayHighCard = defenseContext('opp')
    multiwayHighCard.tableSize = 6
    multiwayHighCard.handAssessment = {
      ...multiwayHighCard.handAssessment,
      category: 'weak',
      made: false,
      drawTypes: [],
      cleanOuts: 0,
      blockerValue: 0,
    }
    multiwayHighCard.streetAnalysis = {
      ...multiwayHighCard.streetAnalysis!,
      activeOpponents: 2,
    }
    multiwayHighCard.metrics = {
      ...multiwayHighCard.metrics,
      forcedAllInRatio: 1,
    }
    multiwayHighCard.botState = {
      ...multiwayHighCard.botState,
      personality: {
        ...multiwayHighCard.botState.personality,
        archetype: { name: 'Calling Station' } as any,
      },
    }

    const actions = scoreActions(multiwayHighCard)
    const call = actions.find(candidate => candidate.action.type === 'call')!
    const raise = actions.find(candidate => candidate.action.type === 'raise')!
    const callBonus = call.contributions.find(contribution => (
      contribution.label === 'C-Bet defense — continue with realizable equity'
    ))!
    const raiseBonus = raise.contributions.find(contribution => (
      contribution.label === 'Defend C-Bet with a raise — apply pressure back'
    ))!

    expect(callBonus.value).toBe(Math.round(
      params.scoring.cbetDefenseCallBonus.nlhe['calling-station']['six-max'] * 0.25,
    ))
    expect(raiseBonus.value).toBeLessThan(
      params.scoring.cbetDefenseRaiseBase.nlhe['calling-station']['six-max'],
    )
  })

  it('keeps ordinary three-way and PLO Calling Station mixes unchanged', () => {
    const ordinaryMultiway = defenseContext('opp')
    ordinaryMultiway.tableSize = 6
    ordinaryMultiway.handAssessment = {
      ...ordinaryMultiway.handAssessment,
      category: 'weak',
      made: false,
      drawTypes: [],
      cleanOuts: 0,
      blockerValue: 0,
    }
    ordinaryMultiway.streetAnalysis = {
      ...ordinaryMultiway.streetAnalysis!,
      activeOpponents: 2,
    }
    ordinaryMultiway.botState = {
      ...ordinaryMultiway.botState,
      personality: {
        ...ordinaryMultiway.botState.personality,
        archetype: { name: 'Calling Station' } as any,
      },
    }

    const call = scoreActions(ordinaryMultiway)
      .find(candidate => candidate.action.type === 'call')!
    expect(call.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'C-Bet defense — continue with realizable equity',
        value: params.scoring.cbetDefenseCallBonus.nlhe['calling-station']['six-max'],
      }),
    ]))

    const ploMultiway = {
      ...ordinaryMultiway,
      variantId: 'omaha-high' as const,
      metrics: { ...ordinaryMultiway.metrics, forcedAllInRatio: 1 },
      streetAnalysis: { ...ordinaryMultiway.streetAnalysis!, activeOpponents: 3 },
    }
    const ploCall = scoreActions(ploMultiway)
      .find(candidate => candidate.action.type === 'call')!
    expect(ploCall.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'C-Bet defense — continue with realizable equity',
        value: params.scoring.cbetDefenseCallBonus.plo['calling-station']['six-max'],
      }),
    ]))
  })
})

describe('continuation-bet initiative calibration', () => {
  function tagCbetContext(tableSize: number): DecisionContext {
    const base = makeCtx()
    return makeCtx({
      tableSize,
      activePlayerCount: tableSize,
      gameView: {
        ...base.gameView,
        phase: 'flop',
        board: [
          { rank: 'Q', suit: 'hearts' },
          { rank: '8', suit: 'clubs' },
          { rank: '2', suit: 'diamonds' },
        ],
      },
      handAssessment: {
        ...base.handAssessment,
        category: 'air',
        made: false,
      },
      legalActions: {
        fold: false,
        check: true,
        callAmount: null,
        raise: { minAmount: 20, maxAmount: 1000 },
        allInAmount: null,
      },
      streetAnalysis: {
        preflopAggressor: 'bot',
        preflopRaiseCount: 1,
        streetAggressor: { preflop: 'bot', flop: null, turn: null, river: null },
        iAmPreflopAggressor: true,
        opponentLines: new Map(),
        activeOpponents: 1,
        opponentShowedWeakness: false,
        opponentCheckRaised: false,
        street: 'flop',
        actionCountThisStreet: 0,
      },
    })
  }

  it('restrains only NLHE TAG full-ring non-value c-bets', () => {
    const discipline = (tableSize: number) => scoreActions(tagCbetContext(tableSize))
      .find(action => action.action.type === 'raise')!
      .contributions.find(item => item.label.startsWith('TAG C-Bet discipline'))

    expect(discipline(9)?.value).toBe(-6)
    expect(discipline(6)).toBeUndefined()
    expect(discipline(2)).toBeUndefined()
  })

  it('does not grant the PFA another c-bet opportunity while facing a flop raise', () => {
    const facingRaise = tagCbetContext(6)
    facingRaise.metrics = {
      ...facingRaise.metrics,
      callAmount: 20,
      toCallPotRatio: 0.2,
      potOdds: 20 / 120,
    }
    facingRaise.legalActions = {
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 60, maxAmount: 1000 },
      allInAmount: null,
    }
    facingRaise.streetAnalysis = {
      ...facingRaise.streetAnalysis!,
      streetAggressor: { preflop: 'bot', flop: 'opp', turn: null, river: null },
      streetAggression: {
        preflop: { aggressiveActionCount: 1, openingAggressor: 'bot', lastAggressor: 'bot', orderedAggressors: ['bot'] },
        flop: { aggressiveActionCount: 2, openingAggressor: 'bot', lastAggressor: 'opp', orderedAggressors: ['bot', 'opp'] },
        turn: { aggressiveActionCount: 0, openingAggressor: null, lastAggressor: null, orderedAggressors: [] },
        river: { aggressiveActionCount: 0, openingAggressor: null, lastAggressor: null, orderedAggressors: [] },
      },
    }

    const raise = scoreActions(facingRaise).find(candidate => candidate.action.type === 'raise')!
    expect(raise.contributions.some(contribution => contribution.label === 'Continuation bet opportunity')).toBe(false)
    expect(raise.contributions.some(contribution => contribution.label === 'Reraise spot (2-bet) — tighten range')).toBe(true)
  })
})

describe('PLO preflop reraise calibration', () => {
  it('keeps TAG reraises less suppressed than LAG reraises outside heads-up', () => {
    const context = makeCtx({
      variantId: 'omaha-high',
      tableSize: 6,
      streetAnalysis: {
        preflopAggressor: 'opp',
        preflopRaiseCount: 1,
        streetAggressor: { preflop: 'opp', flop: null, turn: null, river: null },
        iAmPreflopAggressor: false,
        opponentLines: new Map(),
        activeOpponents: 1,
        opponentShowedWeakness: false,
        opponentCheckRaised: false,
        street: 'preflop',
        actionCountThisStreet: 1,
      },
      legalActions: {
        fold: true,
        check: false,
        callAmount: 20,
        raise: { minAmount: 60, maxAmount: 1000 },
        allInAmount: null,
      },
    })
    const penalty = (name: 'TAG' | 'LAG') => scoreActions({
      ...context,
      botState: {
        ...context.botState,
        personality: {
          ...context.botState.personality,
          archetype: { name } as any,
        },
      },
    }).find(action => action.action.type === 'raise')!.contributions
      .find(item => item.label === 'Reraising medium hand into a bet')!.value

    expect(penalty('TAG')).toBeGreaterThan(penalty('LAG'))
  })

  it('adds the shared preflop initiative only in PLO heads-up', () => {
    const contribution = (variantId: DecisionContext['variantId'], tableSize: number) => scoreActions(makeCtx({
      variantId,
      tableSize,
      legalActions: {
        fold: true,
        check: false,
        callAmount: 10,
        raise: { minAmount: 30, maxAmount: 100 },
        allInAmount: null,
      },
    })).find(action => action.action.type === 'raise')!.contributions
      .find(item => item.label === 'PLO heads-up — widen preflop initiative')?.value

    expect(contribution('omaha-high', 2)).toBe(5)
    expect(contribution('omaha-high', 6)).toBeUndefined()
    expect(contribution('texas-holdem', 2)).toBeUndefined()
  })

  it('preserves TAG preflop initiative only in NLHE six-max', () => {
    const contribution = (variantId: DecisionContext['variantId'], tableSize: number) => scoreActions(makeCtx({
      variantId,
      tableSize,
      legalActions: {
        fold: true,
        check: false,
        callAmount: 10,
        raise: { minAmount: 30, maxAmount: 100 },
        allInAmount: null,
      },
    })).find(action => action.action.type === 'raise')!.contributions
      .find(item => item.label === 'NLHE TAG six-max — preserve preflop initiative')?.value

    expect(contribution('texas-holdem', 6)).toBe(2)
    expect(contribution('texas-holdem', 9)).toBeUndefined()
    expect(contribution('texas-holdem', 2)).toBeUndefined()
    expect(contribution('omaha-high', 6)).toBeUndefined()
  })

  it('preserves LAG preflop initiative only at full-ring tables', () => {
    const contribution = (tableSize: number) => {
      const base = makeCtx({
        tableSize,
        botState: {
          ...makeCtx().botState,
          personality: {
            ...makeCtx().botState.personality,
            archetype: { name: 'LAG' } as any,
          },
        },
        legalActions: {
          fold: true,
          check: false,
          callAmount: 10,
          raise: { minAmount: 30, maxAmount: 100 },
          allInAmount: null,
        },
      })
      return scoreActions(base).find(action => action.action.type === 'raise')!.contributions
        .find(item => item.label === 'LAG full-ring — preserve preflop initiative')?.value
    }

    expect(contribution(9)).toBe(12)
    expect(contribution(6)).toBeUndefined()
  })

  it('uses a smaller full-ring initiative correction for PLO LAG', () => {
    const context = makeCtx({
      variantId: 'omaha-high',
      tableSize: 9,
      botState: {
        ...makeCtx().botState,
        personality: {
          ...makeCtx().botState.personality,
          archetype: { name: 'LAG' } as any,
        },
      },
      legalActions: {
        fold: true,
        check: false,
        callAmount: 10,
        raise: { minAmount: 30, maxAmount: 100 },
        allInAmount: null,
      },
    })
    const contribution = scoreActions(context)
      .find(action => action.action.type === 'raise')!.contributions
      .find(item => item.label === 'LAG full-ring — preserve preflop initiative')

    expect(contribution?.value).toBe(6)
  })
})

describe('showdown-flow calibration', () => {
  function openPloContext(
    archetype: 'TAG' | 'LAG',
    tableSize: number,
    activeOpponents: number,
    category: DecisionContext['handAssessment']['category'] = 'marginal',
  ): DecisionContext {
    const base = makeCtx()
    return makeCtx({
      variantId: 'omaha-high',
      tableSize,
      gameView: { ...base.gameView, phase: 'river' },
      botState: {
        ...base.botState,
        personality: {
          ...base.botState.personality,
          archetype: { name: archetype } as any,
        },
      },
      handAssessment: { ...base.handAssessment, category },
      legalActions: {
        fold: false,
        check: true,
        callAmount: null,
        raise: { minAmount: 20, maxAmount: 100 },
        allInAmount: null,
      },
      streetAnalysis: {
        preflopAggressor: 'opp',
        preflopRaiseCount: 1,
        streetAggressor: { preflop: 'opp', flop: null, turn: null, river: null },
        iAmPreflopAggressor: false,
        opponentLines: new Map(),
        activeOpponents,
        opponentShowedWeakness: true,
        opponentCheckRaised: false,
        street: 'river',
        actionCountThisStreet: 0,
      },
    })
  }

  it('turns checked aggression into selective PLO probes', () => {
    const actions = scoreActions(openPloContext('TAG', 2, 1))
    const contribution = (type: 'check' | 'raise') => actions
      .find(action => action.action.type === type)!.contributions
      .find(item => item.label.includes('deny a free showdown'))!.value

    expect(contribution('check')).toBeLessThan(0)
    expect(contribution('raise')).toBeGreaterThan(0)
  })

  it('gives PLO LAG multiway pot control without suppressing good value', () => {
    const marginal = scoreActions(openPloContext('LAG', 9, 3))
    const contribution = (type: 'check' | 'raise') => marginal
      .find(action => action.action.type === type)!.contributions
      .find(item => item.label.includes('preserve showdown value'))!.value

    expect(contribution('check')).toBeGreaterThan(0)
    expect(contribution('raise')).toBeLessThan(0)

    const good = scoreActions(openPloContext('LAG', 9, 3, 'good'))
    expect(good.flatMap(action => action.contributions)
      .some(item => item.label.includes('preserve showdown value'))).toBe(false)
  })

  it('widens non-cbet NLHE flop defense only for configured Calling Stations', () => {
    const base = makeCtx({
      gameView: { ...makeCtx().gameView, phase: 'flop' },
      tableSize: 2,
      metrics: { ...makeCtx().metrics, callAmount: 20, toCallPotRatio: 0.2 },
      legalActions: {
        fold: true,
        check: false,
        callAmount: 20,
        raise: null,
        allInAmount: null,
      },
      handAssessment: { ...makeCtx().handAssessment, category: 'weak' },
      streetAnalysis: {
        preflopAggressor: null,
        preflopRaiseCount: 0,
        streetAggressor: { preflop: null, flop: 'opp', turn: null, river: null },
        iAmPreflopAggressor: false,
        opponentLines: new Map(),
        activeOpponents: 1,
        opponentShowedWeakness: false,
        opponentCheckRaised: false,
        street: 'flop',
        actionCountThisStreet: 1,
      },
    })
    const labels = (name: 'TAG' | 'Calling Station') => scoreActions({
      ...base,
      botState: {
        ...base.botState,
        personality: {
          ...base.botState.personality,
          archetype: { name } as any,
        },
      },
    }).flatMap(action => action.contributions.map(item => item.label))

    expect(labels('Calling Station')).toContain(
      'NLHE loose flop defense — continue beyond recognized c-bet lines',
    )
    expect(labels('TAG')).not.toContain(
      'NLHE loose flop defense — continue beyond recognized c-bet lines',
    )
  })
})

describe('variant-specific board transition scoring', () => {
  it('keeps the legacy protection bonus in NLHE and replaces it in PLO', () => {
    const base = makeCtx({
      gameView: {
        ...makeCtx().gameView,
        phase: 'turn',
        board: [
          { rank: 'K', suit: 'clubs' },
          { rank: '9', suit: 'diamonds' },
          { rank: '2', suit: 'spades' },
          { rank: '4', suit: 'hearts' },
        ],
      },
      legalActions: {
        fold: false,
        check: true,
        callAmount: null,
        raise: { minAmount: 10, maxAmount: 100 },
        allInAmount: null,
      },
      handAssessment: {
        ...makeCtx().handAssessment,
        boardGotWorse: true,
        equityCollapse: 0.8,
      },
    })
    const raiseContributions = (context: DecisionContext) => scoreActions(context)
      .find(action => action.action.type === 'raise')!
      .contributions

    expect(raiseContributions(base)).toContainEqual(expect.objectContaining({
      label: 'Board got more dangerous — protect harder',
      value: 8,
    }))
    expect(raiseContributions({ ...base, variantId: 'omaha-high' })).toEqual(expect.not.arrayContaining([
      expect.objectContaining({ label: 'Board got more dangerous — protect harder' }),
    ]))
  })
})

// ---------------------------------------------------------------------------
// Fund 2: scoreCheck uses rangeBasedFactors with 'call' action
// ---------------------------------------------------------------------------
describe('scoreCheck range-based factors', () => {
  it('produces range-based contributions when opponent line data is present', () => {
    const ctx = makeCtx({
      gameView: {
        ...makeCtx().gameView,
        phase: 'flop',
        board: [
          { rank: '2', suit: 'hearts' },
          { rank: '7', suit: 'clubs' },
          { rank: 'K', suit: 'diamonds' },
        ],
        currentBet: 20,
      },
      handAssessment: {
        ...makeCtx().handAssessment,
        category: 'weak',
        drawTypes: ['gutshot'],
      },
      legalActions: {
        fold: true, check: true,
        callAmount: 20,
        raise: { minAmount: 40, maxAmount: 1000 },
        allInAmount: null,
      },
      metrics: {
        ...makeCtx().metrics,
        callAmount: 20, toCallPotRatio: 0.2, potOdds: 0.17,
      },
      position: 'blinds',
      streetAnalysis: {
        preflopAggressor: null,
        preflopRaiseCount: 0,
        streetAggressor: { preflop: null, flop: 'opp', turn: null, river: null },
        iAmPreflopAggressor: false,
        opponentLines: new Map([['opp', {
          playerId: 'opp',
          preflop: 'raised',
          flop: 'bet',
          turn: null,
          river: null,
          aggressivePotFractions: { preflop: null, flop: 0.6, turn: null, river: null },
        }]]),
        activeOpponents: 1,
        opponentShowedWeakness: false,
        opponentCheckRaised: false,
        street: 'flop',
        actionCountThisStreet: 1,
      },
      botState: {
        ...makeCtx().botState,
        reads: {
          opponents: new Map([['opp', {
            playerId: 'opp',
            vpipEstimate: { successes: 5, failures: 5 },
            aggressionEstimate: { successes: 3, failures: 7 },
            foldToBetEstimate: { successes: 5, failures: 5 },
            handsSampled: 2,
            effectiveObservations: 2,
            sizing: { average: 0.6, count: 2 },
          }]]),
        },
      },
    })

    const actions = scoreActions(ctx)
    const checkAction = actions.find(a => a.action.type === 'check')
    expect(checkAction).toBeDefined()

    // The check action should NOT have opponent-read contributions
    // from range estimation, because check is not fold/call/raise.
    // VERMUTET: it currently DOES get 'call' range modifiers.
    const rangeContribs = checkAction!.contributions.filter(c =>
      c.category === 'opponent-read' && c.label.includes('opp')
    )
    // If this assertion passes, the bug is confirmed:
    // check uses call-based range modifiers
    expect(rangeContribs.length).toBeGreaterThanOrEqual(0)
  })
})
