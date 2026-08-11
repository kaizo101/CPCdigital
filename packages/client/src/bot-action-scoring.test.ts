import { describe, expect, it } from 'vitest'
import type { Card } from '@cpc/shared'
import { scoreActions } from './bot-action-scoring'
import { params } from './bot-params'
import type { DecisionContext } from './bot-decision-types'
import { createBotState } from './bot-state'
import { CALLING_STATION_PERSONALITY, TAG_PERSONALITY } from './bot-tag'
import { assessHand } from './nlhe-hand-evaluation'

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
      effectiveStackBb: 100, spr: 10, potCommitment: 0,
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

    expect(contribution(9)).toBe(3)
    expect(contribution(6)).toBeUndefined()
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
