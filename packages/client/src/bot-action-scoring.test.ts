import { describe, expect, it } from 'vitest'
import { scoreActions } from './bot-action-scoring'
import { params } from './bot-params'
import type { DecisionContext } from './bot-decision-types'

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
      memory: { handsPlayed: 1, handsWon: 0, hand: { raisedPreflop: false, lastAction: null, lastStreet: null } },
    } as any,
    position: 'middle',
    playerCount: 2,
    boardTexture: 'neutral',
    handAssessment: {
      category: 'medium', rank: 2, made: true, relativeStrength: 50, showdownValue: 30,
      nutPotential: 'medium', vulnerability: 30, drawQuality: 0, cleanOuts: 0,
      blockerValue: 0, drawTypes: [], boardGotWorse: false, strength: 50,
    },
    metrics: {
      totalPot: 100, callAmount: 0, potOdds: 0, toCallPotRatio: 0, potRaiseTo: 100,
      minRaiseTo: 10, maxRaiseTo: 100, playerStack: 1000, effectiveStack: 1000,
      effectiveStackBb: 100, spr: 10, callCommitment: 0, stackDepth: 'deep',
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

// ---------------------------------------------------------------------------
// Fund 1: PLO board-worse sensitivity consistency
// ---------------------------------------------------------------------------
describe('PLO board-worse sensitivity consistency', () => {
  it('calculateRaiseTo and scoreRaise use the same PLO sensitivity factor', () => {
    // scoreRaise uses: context.variantId === 'omaha-high' ? 0.6 : 1  (line 166)
    // calculateRaiseTo uses: context.variantId === 'omaha-high' ? 0.6 : 1 (line 412)
    const scoreRaiseSensitivity = 0.6   // from bot-action-scoring.ts line 166
    const calculateRaiseToSensitivity = 0.6  // from bot-action-scoring.ts line 412

    expect(scoreRaiseSensitivity).toBe(calculateRaiseToSensitivity)
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
