import type { PlayerAction } from '@cpc/shared'
import {
  calculateContextualRaiseTo,
  getBettingContextFactors,
  type DecisionActionKind,
} from './bot-decision-metrics'
import type {
  ActionIntent,
  DecisionContext,
  ScoredAction,
  ScoreContribution,
} from './bot-decision-types'
import { roundToCents } from './utils/format'

export function scoreActions(context: DecisionContext): ScoredAction[] {
  const actions: ScoredAction[] = []
  const legal = context.legalActions

  if (legal.check) actions.push(scoreCheck(context))
  if (legal.fold) actions.push(scoreFold(context))
  if (legal.callAmount != null) actions.push(scoreCall(context))
  if (legal.raise) actions.push(scoreRaise(context))
  if (legal.allInAmount != null) actions.push(scoreAllIn(context))

  return actions
}

function scoreFold(context: DecisionContext): ScoredAction {
  const { gameView, handAssessment: hand, metrics, opponentStats, playerCount } = context
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Fold with ${hand.category}`, {
      air: 10,
      weak: -10,
      medium: -30,
      strong: -50,
      nuts: -50,
    }[hand.category]),
    ...bettingFactors('fold', context),
  ]

  if (gameView.phase === 'preflop' && context.botState.memory.hand.raisedPreflop && metrics.potOdds <= 0.15) {
    contributions.push(factor('betting-context', 'Overwhelming preflop price after raising', -30))
  }
  if (playerCount > 3 && hand.category === 'weak') {
    contributions.push(factor('hand-strength', 'Weak hand in multiway pot', 15))
  }
  if (opponentStats && opponentStats.confidence > 0.5) {
    if (opponentStats.aggression > 60 && hand.category === 'weak') {
      contributions.push(factor('opponent-read', 'Aggressive opponent', 10))
    }
    if (opponentStats.aggression < 40 && hand.category === 'medium') {
      contributions.push(factor('opponent-read', 'Passive opponent', -10))
    }
  }

  return buildAction({ type: 'fold' }, 'fold', contributions)
}

function scoreCheck(context: DecisionContext): ScoredAction {
  const { handAssessment: hand, position } = context
  const intent: ActionIntent = hand.category === 'strong' || hand.category === 'nuts'
    ? 'trap'
    : 'pot-control'
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Check with ${hand.category}`, {
      air: 20,
      weak: 20,
      medium: 10,
      strong: -30,
      nuts: -30,
    }[hand.category]),
  ]

  if (hand.drawTypes.length > 0) contributions.push(factor('hand-strength', 'Free card for draw', 10))
  if (position === 'late') contributions.push(factor('position', 'Late position information', 10))
  return buildAction({ type: 'check' }, intent, contributions)
}

function scoreCall(context: DecisionContext): ScoredAction {
  const { gameView, handAssessment: hand, metrics, opponentStats, playerCount } = context
  const intent: ActionIntent = hand.drawTypes.length > 0
    ? 'draw'
    : hand.category === 'medium'
      ? 'bluff-catch'
      : hand.category === 'strong' || hand.category === 'nuts'
        ? 'trap'
        : 'pot-control'
  const handValue = hand.category === 'strong' || hand.category === 'nuts'
    ? -10
    : hand.category === 'medium'
      ? 20
      : hand.category === 'weak'
        ? 10
        : hand.drawTypes.length > 0
          ? 15
          : -40
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Call with ${hand.category}`, handValue),
    ...bettingFactors('call', context),
  ]

  if (gameView.phase === 'preflop' && context.botState.memory.hand.raisedPreflop && metrics.potOdds <= 0.15) {
    contributions.push(factor('betting-context', 'Overwhelming preflop price after raising', 30))
  }
  if (playerCount > 3 && hand.category === 'weak') {
    contributions.push(factor('hand-strength', 'Weak hand in multiway pot', -20))
  }
  if (opponentStats && opponentStats.confidence > 0.5) {
    if (opponentStats.aggression < 40) contributions.push(factor('opponent-read', 'Passive opponent', 10))
    if (opponentStats.aggression > 60 && hand.category === 'medium') {
      contributions.push(factor('opponent-read', 'Aggressive opponent', -5))
    }
    if (opponentStats.vpip > 40 && hand.category === 'strong') {
      contributions.push(factor('opponent-read', 'Loose opponent', 10))
    }
  }

  return buildAction({ type: 'call' }, intent, contributions)
}

function scoreRaise(context: DecisionContext): ScoredAction {
  const { handAssessment: hand, position, boardTexture } = context
  const intent = aggressiveIntent(context)
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Raise with ${hand.category}`, {
      air: -25,
      weak: hand.drawTypes.length > 0 ? 15 : -25,
      medium: 5,
      strong: 30,
      nuts: 40,
    }[hand.category]),
    ...bettingFactors('raise', context),
  ]

  if (hand.relativeStrength > 70) contributions.push(factor('hand-strength', 'High relative strength', 10))
  else if (hand.relativeStrength < 30) contributions.push(factor('hand-strength', 'Low relative strength', -10))

  if (hand.nutPotential === 'nuts') contributions.push(factor('hand-strength', 'Nut potential', 15))
  else if (hand.nutPotential === 'near-nuts') contributions.push(factor('hand-strength', 'Near-nut potential', 8))
  if (hand.vulnerability > 60) contributions.push(factor('hand-strength', 'Protection against draws', 5))
  if (position === 'late') contributions.push(factor('position', 'Late-position leverage', 15))
  if (boardTexture === 'dry' && hand.category === 'air') {
    contributions.push(factor('board-texture', 'Dry board supports bluff', 10))
  }

  return buildAction(
    { type: 'raise', amount: calculateRaiseTo(context) },
    intent,
    contributions,
  )
}

function scoreAllIn(context: DecisionContext): ScoredAction {
  const { gameView, handAssessment: hand, legalActions, metrics } = context
  const allInAmount = legalActions.allInAmount ?? 0
  const passiveAllIn = allInAmount <= gameView.currentBet
  if (passiveAllIn) {
    const call = scoreCall(context)
    return { ...call, action: { type: 'all-in' } }
  }

  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `All-in with ${hand.category}`, {
      air: -42,
      weak: hand.drawTypes.length > 0 ? -18 : -42,
      medium: -15,
      strong: 28,
      nuts: 42,
    }[hand.category]),
    ...bettingFactors('raise', context),
  ]

  if (metrics.spr <= 2) contributions.push(factor('betting-context', `Low SPR ${metrics.spr.toFixed(2)}`, 12))
  if (metrics.spr >= 6) contributions.push(factor('betting-context', `High SPR ${metrics.spr.toFixed(2)}`, -42))
  if (metrics.effectiveStackBb >= 100) {
    contributions.push(factor('betting-context', `Deep stack ${metrics.effectiveStackBb.toFixed(0)} BB`, -10))
  }
  if (metrics.effectiveStack > 0 && metrics.playerStack > metrics.effectiveStack * 2) {
    contributions.push(factor('betting-context', 'Stack greatly exceeds effective stack', -35))
  }
  if (hand.blockerValue >= 30 && hand.category === 'air') {
    contributions.push(factor('hand-strength', 'Relevant blocker', 5))
  }

  return buildAction({ type: 'all-in' }, aggressiveIntent(context), contributions)
}

function aggressiveIntent(context: DecisionContext): ActionIntent {
  const hand = context.handAssessment
  if (hand.category === 'strong' || hand.category === 'nuts') return 'value'
  if (hand.drawTypes.length > 0) return 'semi-bluff'
  if (hand.category === 'medium') return 'protection'
  return 'bluff'
}

function bettingFactors(
  action: DecisionActionKind,
  context: DecisionContext,
): ScoreContribution[] {
  return getBettingContextFactors(action, context.metrics, {
    category: context.handAssessment.category,
    hasDraw: context.handAssessment.drawTypes.length > 0,
  }).map(({ label, value }) => factor('betting-context', label, value))
}

function calculateRaiseTo(context: DecisionContext): number {
  if (context.preferredRaiseTo != null) return roundToCents(context.preferredRaiseTo)
  return roundToCents(calculateContextualRaiseTo(
    context.metrics,
    {
      category: context.handAssessment.category,
      hasDraw: context.handAssessment.drawTypes.length > 0,
    },
    context.boardTexture,
    context.position,
  ))
}

function buildAction(
  action: PlayerAction,
  intent: ActionIntent,
  contributions: ScoreContribution[],
): ScoredAction {
  const rawUtility = 50 + contributions.reduce((sum, contribution) => sum + contribution.value, 0)
  const utility = Math.max(0, Math.min(100, rawUtility))
  if (utility !== rawUtility) {
    contributions.push(factor('base', 'Utility cap', utility - rawUtility))
  }
  return { action, intent, utility, contributions }
}

function baseContribution(): ScoreContribution {
  return factor('base', 'Neutral action baseline', 0)
}

function factor(
  category: ScoreContribution['category'],
  label: string,
  value: number,
): ScoreContribution {
  return { category, label, value }
}
