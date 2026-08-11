import { describe, expect, it } from 'vitest'
import type { BettingContext, Card, LegalActions } from '@cpc/shared'
import { getNlheScores, getPloScores } from './bot-category-scores'
import { deriveDecisionMetrics } from './bot-decision-metrics'
import type { DecisionContext, ScoredAction } from './bot-decision-types'
import { decideAction } from './bot-pipeline'
import { createBotState } from './bot-state'
import { TAG_PERSONALITY } from './bot-tag'

const BLIND_LEVELS = [0.02, 1, 20] as const

function stakeContext(
  bigBlind: number,
  variantId: 'texas-holdem' | 'omaha-high',
): DecisionContext {
  const smallBlind = bigBlind / 2
  const amount = (bigBlinds: number) => bigBlinds * bigBlind
  const legalActions: LegalActions = {
    fold: true,
    check: false,
    callAmount: amount(2),
    raise: { minAmount: amount(6), maxAmount: amount(100) },
    allInAmount: amount(100),
  }
  const bettingContext: BettingContext = {
    playerId: 'bot',
    totalPot: amount(10),
    toCall: amount(2),
    callAmount: amount(2),
    potOdds: amount(2) / amount(12),
    toCallPotRatio: amount(2) / amount(10),
    potRaiseTo: amount(16),
    minRaiseTo: amount(6),
    maxRaiseTo: amount(100),
    playerStack: amount(100),
    playerStartingStack: amount(100),
    voluntaryHandContribution: amount(4),
    effectiveStack: amount(100),
    spr: 10,
    legalActions,
  }
  const myCards: Card[] = variantId === 'omaha-high'
    ? [
        { rank: 'A', suit: 'spades' },
        { rank: 'K', suit: 'spades' },
        { rank: 'Q', suit: 'hearts' },
        { rank: 'J', suit: 'hearts' },
      ]
    : [
        { rank: 'A', suit: 'spades' },
        { rank: 'K', suit: 'spades' },
      ]

  return {
    gameView: {
      myCards,
      board: [
        { rank: 'K', suit: 'diamonds' },
        { rank: '7', suit: 'clubs' },
        { rank: '2', suit: 'hearts' },
      ],
      pot: amount(10),
      currentBet: amount(2),
      minRaiseTo: amount(6),
      maxRaiseTo: amount(100),
      canRaise: true,
      bigBlind,
      smallBlind,
      phase: 'flop',
      players: [],
      dealerIndex: 0,
    },
    variantId,
    botId: 'bot',
    botState: createBotState(TAG_PERSONALITY, 100, () => 0.5),
    position: 'late',
    tableSize: 6,
    activePlayerCount: 2,
    boardTexture: 'neutral',
    handAssessment: {
      category: 'medium',
      rank: 2,
      made: true,
      relativeStrength: 62,
      showdownValue: 58,
      nutPotential: 'medium',
      vulnerability: 45,
      drawQuality: 0,
      cleanOuts: 0,
      blockerValue: 0,
      drawTypes: [],
      equityCollapse: 0,
      boardGotWorse: false,
      strength: 60,
    },
    metrics: deriveDecisionMetrics(bettingContext, bigBlind),
    legalActions,
    categoryScores: variantId === 'omaha-high'
      ? getPloScores('tag', 'flop', 6)
      : getNlheScores('tag'),
  }
}

function actionKey(candidate: ScoredAction): string {
  return candidate.action.type
}

describe('bot stake invariance', () => {
  for (const variantId of ['texas-holdem', 'omaha-high'] as const) {
    it(`keeps ${variantId} decisions identical across proportionally scaled blinds`, () => {
      const results = BLIND_LEVELS.map(bigBlind => ({
        bigBlind,
        result: decideAction(stakeContext(bigBlind, variantId), { random: () => 0.73 }),
      }))
      const baseline = results[0]

      for (const comparison of results.slice(1)) {
        expect(comparison.result.action.type).toBe(baseline.result.action.type)
        expect(comparison.result.selectionDiagnostics.plausibleCandidateCount)
          .toBe(baseline.result.selectionDiagnostics.plausibleCandidateCount)
        expect(comparison.result.selectionDiagnostics.bestUtility)
          .toBeCloseTo(baseline.result.selectionDiagnostics.bestUtility, 10)

        const baselineActions = new Map(baseline.result.allActions.map(candidate => [actionKey(candidate), candidate]))
        expect(comparison.result.allActions.map(actionKey)).toEqual(baseline.result.allActions.map(actionKey))

        for (const candidate of comparison.result.allActions) {
          const expected = baselineActions.get(actionKey(candidate))!
          expect(candidate.intent).toBe(expected.intent)
          expect(candidate.selectionEligible).toBe(expected.selectionEligible)
          expect(candidate.utility).toBeCloseTo(expected.utility, 10)
          expect(candidate.contributions.map(contribution => contribution.label))
            .toEqual(expected.contributions.map(contribution => contribution.label))
          candidate.contributions.forEach((contribution, index) => {
            expect(contribution.value).toBeCloseTo(expected.contributions[index].value, 10)
          })

          if (candidate.action.type === 'raise' && expected.action.type === 'raise') {
            expect(candidate.action.amount / comparison.bigBlind)
              .toBeCloseTo(expected.action.amount / baseline.bigBlind, 10)
          }
        }
      }
    })
  }
})
