import { describe, expect, it } from 'vitest'
import { PokerGame } from '@cpc/poker-engine'
import type { Player, PlayerAction } from '@cpc/shared'
import { createBotContext } from './bot-context'
import { assessDecisionComplexity } from './bot-decision-complexity'
import { selectionDiagnostics, type DecisionResult, type ScoredAction } from './bot-pipeline'

function currentContext() {
  const players: Player[] = ['bot', 'villain'].map((id, seatIndex) => ({
    id,
    name: id,
    role: 'player',
    chips: 1000,
    seatIndex,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
  const game = new PokerGame(players, { smallBlind: 10, bigBlind: 20, seed: 'complexity' })
  game.startHand()
  const playerId = game.getPublicState().currentPlayerId!
  return createBotContext(playerId, game.getPlayerView(playerId), game.getPublicHandHistory())
}

function decision(action: PlayerAction, utilities: Array<[PlayerAction, number]>): DecisionResult {
  const allActions: ScoredAction[] = utilities.map(([candidateAction, utility]) => ({
    candidateId: candidateAction.type === 'raise' ? `raise:${candidateAction.amount}` : candidateAction.type,
    action: candidateAction,
    intent: candidateAction.type === 'fold' ? 'fold' : 'value',
    utility,
    contributions: [],
  }))
  const chosen = allActions.find(candidate => candidate.action.type === action.type)!
  return {
    action,
    chosenCandidateId: chosen.candidateId,
    allActions,
    chosenUtility: chosen.utility,
    selectionDiagnostics: selectionDiagnostics(allActions),
    perceptionErrors: [],
    perceivedHandAssessment: {} as DecisionResult['perceivedHandAssessment'],
    perceivedOpponentRanges: [],
    objectiveHandAssessment: {} as DecisionResult['objectiveHandAssessment'],
    objectiveOpponentRanges: [],
    objectiveStreetAnalysis: undefined,
    stateUpdates: {},
  }
}

describe('bot decision complexity', () => {
  it('keeps a clear two-action decision simple', () => {
    const complexity = assessDecisionComplexity(
      currentContext(),
      decision({ type: 'fold' }, [[{ type: 'fold' }, 90], [{ type: 'call' }, 30]]),
    )

    expect(complexity.utilityGap).toBe(60)
    expect(complexity.difficultAllIn).toBe(false)
    expect(complexity.score).toBeLessThan(20)
  })

  it('recognizes a close, high-commitment decision facing an all-in as difficult', () => {
    const context = currentContext()
    context.bettingContext.playerStack = 1000
    context.bettingContext.callAmount = 600
    context.bettingContext.toCallPotRatio = 1
    context.actionHistory.push({
      type: 'PlayerActed',
      phase: context.publicState.phase,
      playerId: 'villain',
      action: { type: 'all-in' },
      amount: 600,
      totalBet: 600,
      toCall: 0,
      currentBetBefore: 20,
      potAfter: 700,
      source: 'player',
    })

    const complexity = assessDecisionComplexity(
      context,
      decision({ type: 'call' }, [[{ type: 'call' }, 72], [{ type: 'fold' }, 69]]),
    )

    expect(complexity.facingAllIn).toBe(true)
    expect(complexity.difficultAllIn).toBe(true)
    expect(complexity.utilityGap).toBe(3)
    expect(complexity.score).toBeGreaterThanOrEqual(70)
    expect(complexity.factors.map(factor => factor.label)).toEqual(expect.arrayContaining([
      'Very close action utilities',
      'Large bet relative to pot',
      'Facing all-in',
    ]))
  })

  it('takes longer when several actions are close than when one clearly dominates', () => {
    const context = currentContext()
    const close = assessDecisionComplexity(
      context,
      decision({ type: 'raise', amount: 60 }, [
        [{ type: 'raise', amount: 60 }, 75],
        [{ type: 'call' }, 72],
        [{ type: 'fold' }, 65],
      ]),
    )
    const clear = assessDecisionComplexity(
      context,
      decision({ type: 'raise', amount: 60 }, [
        [{ type: 'raise', amount: 60 }, 90],
        [{ type: 'call' }, 40],
        [{ type: 'fold' }, 20],
      ]),
    )

    expect(close.score).toBeGreaterThan(clear.score)
  })
})
